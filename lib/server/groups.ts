import type {
  ActivityCategory,
  DurationBand,
  FoodPreference,
  GroupAgreement,
  GroupRecord,
  OutingPlan,
  ParticipantPreferenceInput,
  ParticipantRecord,
  PublicGroupView,
  TimeWindow,
  TravelMode,
  Venue,
} from '../outly-types';
import { aggregatePreferences, buildInventoryConflict, roundBudgetHardMax, selectPlans, withDiningAlternatives } from '../recommendation';
import { discoverVenues, hydrateVenueDetails, pairCandidates, resolveOrigin } from './google';
import { polishPlanSummaries } from './openai';
import { getDatabase, runtimeValue } from './runtime';
import { purgeExpiredRateLimits } from './request-limits';
import { hashToken, randomToken } from './security';
import { normalizeDietary } from '../preferences';

type GroupRow = {
  id: string;
  name: string;
  occasion: string;
  expected_size: number;
  candidate_dates: string;
  join_token_hash: string;
  organizer_token_hash: string;
  status: GroupRecord['status'];
  agreement_json: string | null;
  locked_at: number | null;
  expires_at: number;
  created_at: number;
  updated_at: number;
};

type ParticipantRow = {
  id: string;
  group_id: string;
  edit_token_hash: string;
  display_name: string;
  origin_label: string | null;
  origin_place_id: string | null;
  origin_lat: number | null;
  origin_lng: number | null;
  travel_mode: TravelMode;
  travel_max_minutes: number;
  budget_target: number;
  budget_hard_max: number;
  acceptable_dates: string;
  time_windows: string;
  activities: string;
  food_preference: FoodPreference;
  dietary: string;
  duration_band: DurationBand;
  time_extension_minutes: number;
  duration_max_override: number | null;
  submitted_at: number;
  updated_at: number;
};

type RelaxationRow = {
  id: string;
  kind: string;
  description: string;
  affected_participant_ids: string;
  proposed_changes: string;
  approvals: string;
  status: string;
};

type PlanRow = { plan_json: string };
type StoredLivePlan = {
  storage: 'live-place-ids-v1' | 'live-place-ids-v2'; id: string; rank: number; label: OutingPlan['label']; date: string;
  activity: { placeId: string; area: string; categories: ActivityCategory[] };
  dining: { placeId: string; area: string; categories: ActivityCategory[] };
  diningAlternatives?: Array<{ placeId: string; area: string; categories: ActivityCategory[] }>;
};

const json = <T>(value: string | null, fallback: T): T => {
  try { return value ? JSON.parse(value) as T : fallback; } catch { return fallback; }
};

function toGroup(row: GroupRow): GroupRecord {
  return {
    id: row.id,
    name: row.name,
    occasion: row.occasion,
    expectedSize: row.expected_size,
    candidateDates: json<string[]>(row.candidate_dates, []),
    status: row.status,
    agreement: json<GroupAgreement | null>(row.agreement_json, null),
    lockedAt: row.locked_at,
    expiresAt: row.expires_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toParticipant(row: ParticipantRow): ParticipantRecord {
  return {
    id: row.id,
    groupId: row.group_id,
    displayName: row.display_name,
    originLabel: row.origin_label ?? 'Location removed',
    originPlaceId: row.origin_place_id,
    originLat: row.origin_lat,
    originLng: row.origin_lng,
    travelMode: row.travel_mode,
    travelMaxMinutes: row.travel_max_minutes,
    budgetTarget: row.budget_target,
    budgetHardMax: row.budget_hard_max,
    acceptableDates: json<string[]>(row.acceptable_dates, []),
    timeWindows: json<TimeWindow[]>(row.time_windows, []),
    activities: json<ActivityCategory[]>(row.activities, []),
    foodPreference: row.food_preference,
    dietary: json<string[]>(row.dietary, []),
    durationBand: row.duration_band,
    timeExtensionMinutes: row.time_extension_minutes ?? 0,
    durationMaxOverride: row.duration_max_override,
    submittedAt: row.submitted_at,
    updatedAt: row.updated_at,
  };
}

function validateDates(dates: unknown) {
  if (!Array.isArray(dates) || dates.length < 1 || dates.length > 4) throw new Error('Choose between one and four dates.');
  const today = new Date(Date.now() + 330 * 60000).toISOString().slice(0, 10);
  const max = new Date(Date.now() + 330 * 60000 + 30 * 86400000).toISOString().slice(0, 10);
  const normalized = [...new Set(dates.map(String))];
  normalized.forEach((value) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error('Use valid outing dates.');
    const date = new Date(`${value}T12:00:00Z`);
    if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== value || value < today || value > max) throw new Error('Outing dates must be valid and within the next 30 days.');
  });
  return normalized;
}

function validateParticipant(input: ParticipantPreferenceInput, candidateDates: string[]) {
  if (!Number.isInteger(input.travelMaxMinutes) || input.travelMaxMinutes < 15 || input.travelMaxMinutes > 90) throw new Error('Choose a travel limit between 15 and 90 minutes.');
  if (!Number.isFinite(input.budgetTarget) || input.budgetTarget < 300 || input.budgetTarget > 20000) throw new Error('Choose a budget between ₹300 and ₹20,000.');
  if (![input.acceptableDates, input.timeWindows, input.activities, input.dietary].every(Array.isArray)) throw new Error('Select your dates, time windows and preferences.');
  const displayName = String(input.displayName ?? '').trim().slice(0, 40);
  const originLabel = String(input.originLabel ?? '').trim().slice(0, 160);
  const travelMode = input.travelMode === 'transit' ? 'transit' : 'drive';
  const travelMaxMinutes = Math.max(15, Math.min(90, Number(input.travelMaxMinutes) || 30));
  const budgetTarget = Math.max(300, Math.min(20000, Number(input.budgetTarget) || 1500));
  const acceptableDates = [...new Set((input.acceptableDates ?? []).filter((date) => candidateDates.includes(date)))];
  const allowedWindows: TimeWindow[] = ['morning', 'lunch', 'afternoon', 'evening', 'late'];
  const timeWindows = [...new Set((input.timeWindows ?? []).filter((window): window is TimeWindow => allowedWindows.includes(window as TimeWindow)))];
  const allowedActivities: ActivityCategory[] = ['games', 'sports', 'arts', 'nightlife', 'anything'];
  const activities = [...new Set((input.activities ?? []).filter((activity): activity is ActivityCategory => allowedActivities.includes(activity as ActivityCategory)))];
  if (activities.length > 1 && activities.includes('anything')) activities.splice(activities.indexOf('anything'), 1);
  const foodPreference: FoodPreference = input.foodPreference === 'snacks' ? 'snacks' : 'meal';
  const allowedDurations: DurationBand[] = ['quick', 'standard', 'extended', 'flexible'];
  const durationBand = allowedDurations.includes(input.durationBand) ? input.durationBand : 'standard';
  const dietary = normalizeDietary((input.dietary ?? []).map(String).map((item) => item.trim().slice(0, 60))).slice(0, 6);

  if (displayName.length < 2) throw new Error('Add a name or nickname.');
  if (originLabel.length < 3) throw new Error('Choose a starting location.');
  if (acceptableDates.length < 1) throw new Error('Choose at least one date.');
  if (timeWindows.length < 1) throw new Error('Choose at least one time window.');
  if (activities.length < 1) throw new Error('Choose at least one activity preference.');

  return { displayName, originLabel, travelMode, travelMaxMinutes, budgetTarget, acceptableDates, timeWindows, activities, foodPreference, dietary, durationBand };
}

async function event(groupId: string | null, eventName: string, actorHash?: string | null, payload?: Record<string, unknown>) {
  try {
    await getDatabase().prepare('INSERT INTO product_events (id, group_id, event_name, actor_hash, payload_json, created_at) VALUES (?, ?, ?, ?, ?, ?)')
      .bind(crypto.randomUUID(), groupId, eventName, actorHash ?? null, payload ? JSON.stringify(payload) : null, Date.now()).run();
  } catch {
    // Product telemetry must never block the planning workflow.
  }
}

export async function purgeExpiredOrigins() {
  const database = getDatabase();
  const result = await database.prepare(`UPDATE participants
    SET origin_label = NULL, origin_place_id = NULL, origin_lat = NULL, origin_lng = NULL, updated_at = ?
    WHERE group_id IN (SELECT id FROM groups WHERE expires_at <= ?)
      AND (origin_label IS NOT NULL OR origin_place_id IS NOT NULL OR origin_lat IS NOT NULL OR origin_lng IS NOT NULL)`)
    .bind(Date.now(), Date.now()).run();
  return Number(result.meta.changes ?? 0);
}

export async function runPrivacyCleanup() {
  const originsRemoved = await purgeExpiredOrigins();
  await purgeExpiredRateLimits();
  return { originsRemoved, completedAt: Date.now() };
}

async function groupLookup(token: string) {
  const tokenHash = await hashToken(token);
  const row = await getDatabase().prepare('SELECT * FROM groups WHERE join_token_hash = ? OR organizer_token_hash = ? LIMIT 1').bind(tokenHash, tokenHash).first<GroupRow>();
  if (!row) throw new Error('This private plan link is invalid or has expired.');
  if (row.expires_at <= Date.now()) {
    await purgeExpiredOrigins();
    throw new Error('This private plan link has expired. Create a new outing.');
  }
  const role = row.organizer_token_hash === tokenHash ? 'organizer' as const : 'participant' as const;
  return { row, group: toGroup(row), role, tokenHash };
}

export async function createGroup(input: { name?: string; occasion?: string; expectedSize?: number; candidateDates?: unknown }, requestOrigin: string) {
  const name = String(input.name ?? '').trim().slice(0, 80);
  const occasion = String(input.occasion ?? '').trim().slice(0, 40);
  const expectedSize = Number(input.expectedSize);
  if (!Number.isInteger(expectedSize) || expectedSize < 2 || expectedSize > 10) throw new Error('Choose a group size from 2 to 10.');
  const candidateDates = validateDates(input.candidateDates);
  if (name.length < 3) throw new Error('Give the outing a short name.');
  if (!occasion) throw new Error('Choose an occasion.');

  const id = crypto.randomUUID();
  const joinToken = randomToken();
  const organizerToken = randomToken();
  const joinHash = await hashToken(joinToken);
  const organizerHash = await hashToken(organizerToken);
  const now = Date.now();
  const lastDate = [...candidateDates].sort().at(-1) ?? candidateDates[0];
  const expiresAt = new Date(`${lastDate}T23:59:59+05:30`).getTime() + 30 * 86400000;
  await getDatabase().prepare(`INSERT INTO groups
    (id, name, occasion, expected_size, candidate_dates, join_token_hash, organizer_token_hash, status, expires_at, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, 'collecting', ?, ?, ?)`)
    .bind(id, name, occasion, expectedSize, JSON.stringify(candidateDates), joinHash, organizerHash, expiresAt, now, now).run();
  await event(id, 'group_created', organizerHash, { expectedSize, candidateDateCount: candidateDates.length });
  const base = requestOrigin.replace(/\/$/, '');
  return {
    groupId: id,
    joinToken,
    organizerToken,
    joinUrl: `${base}/plan/${joinToken}`,
    organizerUrl: `${base}/plan/${organizerToken}/review?join=${encodeURIComponent(joinToken)}`,
  };
}

export async function submitParticipant(groupToken: string, raw: ParticipantPreferenceInput & { editToken?: string | null }) {
  await purgeExpiredOrigins();
  const { row, group, role } = await groupLookup(groupToken);
  if (role !== 'participant') throw new Error('Use the participant link to add preferences.');
  if (group.status !== 'collecting') throw new Error('This group agreement is locked. Ask the organizer to unlock it before editing.');
  const input = validateParticipant(raw, group.candidateDates);
  const origin = await resolveOrigin(raw.originPlaceId, input.originLabel);
  const database = getDatabase();
  const now = Date.now();
  const editToken = raw.editToken?.trim() || randomToken();
  if (!/^[A-Za-z0-9_-]{32,64}$/.test(editToken)) throw new Error('Your private response key is invalid. Reopen the participant link.');
  const editHash = await hashToken(editToken);
  const existing = await database.prepare('SELECT id, group_id FROM participants WHERE edit_token_hash = ?').bind(editHash).first<{ id: string; group_id: string }>();
  if (existing && existing.group_id !== row.id) throw new Error('That response key belongs to another group.');
  const participantId = existing?.id ?? crypto.randomUUID();
  const results = await database.batch([
    database.prepare(`INSERT INTO participants
      (id, group_id, edit_token_hash, display_name, origin_label, origin_place_id, origin_lat, origin_lng, travel_mode, travel_max_minutes,
       budget_target, budget_hard_max, acceptable_dates, time_windows, activities, food_preference, dietary, duration_band, submitted_at, updated_at)
      SELECT ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
      WHERE EXISTS (SELECT 1 FROM groups WHERE id = ? AND status = 'collecting' AND expires_at > ?)
        AND ((SELECT COUNT(*) FROM participants WHERE group_id = ?) < 10 OR EXISTS (SELECT 1 FROM participants WHERE edit_token_hash = ? AND group_id = ?))
      ON CONFLICT(edit_token_hash) DO UPDATE SET display_name = excluded.display_name, origin_label = excluded.origin_label,
        origin_place_id = excluded.origin_place_id, origin_lat = excluded.origin_lat, origin_lng = excluded.origin_lng,
        travel_mode = excluded.travel_mode, travel_max_minutes = excluded.travel_max_minutes, budget_target = excluded.budget_target,
        budget_hard_max = excluded.budget_hard_max, acceptable_dates = excluded.acceptable_dates, time_windows = excluded.time_windows,
        activities = excluded.activities, food_preference = excluded.food_preference, dietary = excluded.dietary,
        duration_band = excluded.duration_band, time_extension_minutes = 0, duration_max_override = NULL, updated_at = excluded.updated_at
      WHERE participants.group_id = excluded.group_id`)
      .bind(participantId, row.id, editHash, input.displayName, origin.label, origin.placeId, origin.lat, origin.lng, input.travelMode,
        input.travelMaxMinutes, input.budgetTarget, roundBudgetHardMax(input.budgetTarget), JSON.stringify(input.acceptableDates),
        JSON.stringify(input.timeWindows), JSON.stringify(input.activities), input.foodPreference, JSON.stringify(input.dietary), input.durationBand,
        now, now, row.id, now, row.id, editHash, row.id),
    database.prepare('UPDATE groups SET updated_at = MAX(updated_at + 1, ?) WHERE id = ? AND changes() > 0').bind(now, row.id),
    database.prepare("UPDATE relaxations SET status = 'superseded', updated_at = ? WHERE group_id = ? AND status IN ('pending', 'unresolved') AND changes() > 0").bind(now, row.id),
  ]);
  if (!results[0].meta.changes) throw new Error('The agreement was locked, the link expired, or the 10-person limit was reached. Refresh the group.');
  const saved = await database.prepare('SELECT id FROM participants WHERE edit_token_hash = ?').bind(editHash).first<{ id: string }>();
  await event(row.id, existing ? 'participant_updated' : 'participant_submitted', editHash);
  return { participantId: saved!.id, editToken };
}

export async function getOwnPreferences(groupToken: string, editToken: string) {
  const { group } = await groupLookup(groupToken);
  const editHash = await hashToken(editToken);
  const row = await getDatabase().prepare('SELECT * FROM participants WHERE group_id = ? AND edit_token_hash = ?').bind(group.id, editHash).first<ParticipantRow>();
  if (!row) throw new Error('No saved response matches your private key.');
  return toParticipant(row);
}

async function participantsFor(groupId: string) {
  const result = await getDatabase().prepare('SELECT * FROM participants WHERE group_id = ? ORDER BY submitted_at ASC').bind(groupId).all<ParticipantRow>();
  return result.results.map(toParticipant);
}

async function latestRelaxation(groupId: string) {
  return await getDatabase().prepare('SELECT * FROM relaxations WHERE group_id = ? ORDER BY created_at DESC LIMIT 1').bind(groupId).first<RelaxationRow>();
}

export function planStoragePayload(plan: OutingPlan, mode: 'live' | 'preview'): OutingPlan | StoredLivePlan {
  if (mode === 'preview') return plan;
  return {
    storage: 'live-place-ids-v2', id: plan.id, rank: plan.rank, label: plan.label, date: plan.date,
    activity: { placeId: plan.stops[0].venue.placeId, area: plan.stops[0].venue.area, categories: plan.stops[0].venue.categories },
    dining: { placeId: plan.stops[1].venue.placeId, area: plan.stops[1].venue.area, categories: plan.stops[1].venue.categories },
    diningAlternatives: (plan.diningAlternatives ?? []).map((option) => ({ placeId: option.venue.placeId, area: option.venue.area, categories: option.venue.categories })),
  };
}

async function rehydrateLivePlans(rows: PlanRow[], participants: ParticipantRecord[], agreement: GroupAgreement) {
  const output: OutingPlan[] = [];
  for (const row of rows) {
    const stored = json<StoredLivePlan | null>(row.plan_json, null);
    if (!stored || !['live-place-ids-v1', 'live-place-ids-v2'].includes(stored.storage)) continue;
    const details = await hydrateVenueDetails([
      { ...stored.activity, kind: 'activity' },
      { ...stored.dining, kind: 'dining' },
      ...(stored.diningAlternatives ?? []).map((item) => ({ ...item, kind: 'dining' as const })),
    ]);
    const venues = await venueOverrides(details);
    const datedAgreement = { ...agreement, selectedDate: stored.date };
    const pairs = await pairCandidates(venues, participants, datedAgreement);
    const primary = pairs.find((pair) => pair.activity.placeId === stored.activity.placeId && pair.dining.placeId === stored.dining.placeId);
    const refreshed = primary ? selectPlans([primary], participants, datedAgreement)[0] : undefined;
    if (refreshed) output.push(withDiningAlternatives({ ...refreshed, id: stored.id, rank: stored.rank, label: stored.label }, pairs, participants, datedAgreement));
  }
  return output.sort((a, b) => a.rank - b.rank);
}

export async function getGroupView(token: string): Promise<PublicGroupView> {
  await purgeExpiredOrigins();
  const { group, role } = await groupLookup(token);
  const participants = await participantsFor(group.id);
  let computed = group.status === 'collecting' ? aggregatePreferences(participants, group.candidateDates) : group.agreement;
  const relaxation = await latestRelaxation(group.id);
  if (computed && !computed.conflict && group.status === 'collecting' && relaxation && ['pending', 'unresolved'].includes(relaxation.status)) {
    computed = { ...computed, conflict: { kind: relaxation.kind as NonNullable<GroupAgreement['conflict']>['kind'], title: 'The group needs an adjustment', description: relaxation.description,
      affectedParticipantIds: json<string[]>(relaxation.affected_participant_ids, []), proposedChanges: json<Record<string, unknown>>(relaxation.proposed_changes, {}) } };
  }
  const planRows = await getDatabase().prepare('SELECT plan_json FROM plans WHERE group_id = ? ORDER BY created_at DESC, rank ASC LIMIT 3').bind(group.id).all<PlanRow>();
  const voteRows = await getDatabase().prepare('SELECT plan_id, COUNT(*) AS count FROM votes WHERE group_id = ? GROUP BY plan_id').bind(group.id).all<{ plan_id: string; count: number }>();
  const votes = Object.fromEntries(voteRows.results.map((row) => [row.plan_id, Number(row.count)]));
  const latestRun = await getDatabase().prepare('SELECT source_mode FROM plan_runs WHERE group_id = ? ORDER BY created_at DESC LIMIT 1').bind(group.id).first<{ source_mode: 'live' | 'preview' }>();
  let planHydrationError: string | null = null;
  let plans: OutingPlan[] = [];
  if (group.status === 'planned') {
    if (latestRun?.source_mode === 'live' && computed) {
      try { plans = await rehydrateLivePlans(planRows.results, participants, computed); }
      catch { planHydrationError = 'Live venue or travel details could not be refreshed. No stored sample data was substituted; retry shortly.'; }
    } else plans = planRows.results.map((row) => json<OutingPlan>(row.plan_json, {} as OutingPlan)).filter((plan) => plan.id);
  }
  const selected = await getDatabase().prepare('SELECT plan_id FROM selections WHERE group_id = ?').bind(group.id).first<{ plan_id: string }>();

  return {
    role,
    selectedPlanId: group.status === 'planned' ? selected?.plan_id ?? null : null,
    planHydrationError,
    planShortfallMessage: group.status === 'planned' && !planHydrationError && plans.length < 3 ? `Only ${plans.length} distinct ${plans.length === 1 ? 'plan' : 'plans'} met every accepted travel, time, duration, dietary and known-cost constraint. Outly did not add weaker filler.` : null,
    group: { ...group, agreement: computed },
    participantNames: participants.map((participant) => participant.displayName),
    participantSummaries: participants.map((participant) => ({ id: participant.id, displayName: participant.displayName })),
    submittedCount: participants.length,
    expectedSize: group.expectedSize,
    agreement: computed,
    pendingRelaxation: relaxation ? {
      id: relaxation.id,
      kind: relaxation.kind as PublicGroupView['pendingRelaxation'] extends { kind: infer T } ? T : never,
      description: relaxation.description,
      affectedParticipantIds: json<string[]>(relaxation.affected_participant_ids, []),
      approvals: json<string[]>(relaxation.approvals, []),
      status: relaxation.status,
    } : null,
    plans,
    votes,
    dataMode: latestRun?.source_mode,
  };
}

export async function createRelaxation(token: string) {
  const { group, role } = await groupLookup(token);
  if (role !== 'organizer') throw new Error('Only the organizer can propose a change.');
  if (group.status !== 'collecting') throw new Error('Unlock the agreement before proposing a change.');
  const participants = await participantsFor(group.id);
  const agreement = aggregatePreferences(participants, group.candidateDates);
  if (!agreement.conflict) throw new Error('The group already has a workable agreement.');
  if (!agreement.conflict.affectedParticipantIds.length || !Object.keys(agreement.conflict.proposedChanges).length) throw new Error(agreement.conflict.description);
  const id = crypto.randomUUID();
  const now = Date.now();
  await getDatabase().prepare(`INSERT INTO relaxations
    (id, group_id, kind, description, affected_participant_ids, proposed_changes, approvals, status, created_at, updated_at)
    SELECT ?, ?, ?, ?, ?, ?, '[]', 'pending', ?, ?
    WHERE NOT EXISTS (SELECT 1 FROM relaxations WHERE group_id = ? AND status = 'pending')
      AND EXISTS (SELECT 1 FROM groups WHERE id = ? AND status = 'collecting' AND updated_at = ?)`)
    .bind(id, group.id, agreement.conflict.kind, agreement.conflict.description, JSON.stringify(agreement.conflict.affectedParticipantIds), JSON.stringify(agreement.conflict.proposedChanges), now, now, group.id, group.id, group.updatedAt).run();
  await event(group.id, 'relaxation_proposed', null, { kind: agreement.conflict.kind, affectedCount: agreement.conflict.affectedParticipantIds.length });
  return { id };
}

export async function approveRelaxation(groupToken: string, editToken: string) {
  const { group } = await groupLookup(groupToken);
  if (group.status !== 'collecting') throw new Error('Unlock the agreement before changing preferences.');
  const database = getDatabase();
  const editHash = await hashToken(editToken);
  const participant = await database.prepare('SELECT id FROM participants WHERE group_id = ? AND edit_token_hash = ?').bind(group.id, editHash).first<{ id: string }>();
  if (!participant) throw new Error('Your private edit link is not available on this device.');
  const relaxation = await latestRelaxation(group.id);
  if (!relaxation || relaxation.status !== 'pending') throw new Error('There is no pending change to approve.');
  const affected = json<string[]>(relaxation.affected_participant_ids, []);
  if (!affected.includes(participant.id)) throw new Error('This change does not require your approval.');
  const proposed = json<Record<string, unknown>>(relaxation.proposed_changes, {});
  let changeSql: string;
  let changeValue: string | number;
  if (relaxation.kind === 'date' && group.candidateDates.includes(String(proposed.acceptableDate))) {
    changeSql = "acceptable_dates = CASE WHEN EXISTS (SELECT 1 FROM json_each(acceptable_dates) WHERE value = ?) THEN acceptable_dates ELSE json_insert(acceptable_dates, '$[#]', ?) END";
    changeValue = String(proposed.acceptableDate);
  } else if (relaxation.kind === 'time' && [30, 60].includes(Number(proposed.timeExtensionMinutes))) {
    changeSql = 'time_extension_minutes = MAX(time_extension_minutes, ?)'; changeValue = Number(proposed.timeExtensionMinutes);
  } else if (relaxation.kind === 'duration' && Number(proposed.durationMax) >= 90 && Number(proposed.durationMax) <= 420) {
    changeSql = 'duration_max_override = ?'; changeValue = Number(proposed.durationMax);
  } else if (relaxation.kind === 'travel' && Number(proposed.travelMaxMinutes) <= 95 && Number(proposed.travelMaxMinutes) >= 20) {
    changeSql = 'travel_max_minutes = ?'; changeValue = Number(proposed.travelMaxMinutes);
  } else {
    throw new Error('This suggestion needs updated answers rather than a one-click approval.');
  }
  const now = Date.now();
  const changeBindings = relaxation.kind === 'date' ? [changeValue, changeValue] : [changeValue];
  // D1 batches are transactions. Append approval and apply the complete proposal
  // together, so concurrent approvals cannot overwrite each other or apply twice.
  await database.batch([
    database.prepare(`UPDATE relaxations SET approvals = json_insert(approvals, '$[#]', ?), updated_at = ?
      WHERE id = ? AND status = 'pending'
        AND NOT EXISTS (SELECT 1 FROM json_each(approvals) WHERE value = ?)
        AND EXISTS (SELECT 1 FROM groups WHERE id = ? AND status = 'collecting' AND expires_at > ?)`)
      .bind(participant.id, now, relaxation.id, participant.id, group.id, now),
    database.prepare(`UPDATE participants SET ${changeSql}, updated_at = ?
      WHERE group_id = ? AND id IN (SELECT value FROM json_each(?))
        AND EXISTS (SELECT 1 FROM relaxations WHERE id = ? AND status = 'pending' AND json_array_length(approvals) = json_array_length(affected_participant_ids))
        AND EXISTS (SELECT 1 FROM groups WHERE id = ? AND status = 'collecting' AND expires_at > ?)`)
      .bind(...changeBindings, now, group.id, JSON.stringify(affected), relaxation.id, group.id, now),
    database.prepare(`UPDATE groups SET updated_at = MAX(updated_at + 1, ?)
      WHERE id = ? AND status = 'collecting' AND changes() > 0`).bind(now, group.id),
    database.prepare(`UPDATE relaxations SET status = 'accepted', updated_at = ? WHERE id = ? AND status = 'pending'
      AND json_array_length(approvals) = json_array_length(affected_participant_ids) AND changes() > 0`).bind(now, relaxation.id),
  ]);
  const result = await database.prepare('SELECT status FROM relaxations WHERE id = ?').bind(relaxation.id).first<{ status: string }>();
  const complete = result?.status === 'accepted';
  await event(group.id, 'relaxation_approved', editHash, { complete });
  return { complete };
}

export async function lockGroup(token: string) {
  const { group, role } = await groupLookup(token);
  if (role !== 'organizer') throw new Error('Only the organizer can lock the agreement.');
  if (group.status !== 'collecting') throw new Error('This agreement is already locked.');
  const participants = await participantsFor(group.id);
  const agreement = aggregatePreferences(participants, group.candidateDates);
  if (participants.length < 2) throw new Error('At least two people must respond before locking.');
  if (agreement.conflict) throw new Error(agreement.conflict.description);
  const result = await getDatabase().prepare(`UPDATE groups SET status = 'locked', agreement_json = ?, locked_at = ?, updated_at = MAX(updated_at + 1, ?)
    WHERE id = ? AND status = 'collecting' AND updated_at = ? AND expires_at > ?
      AND NOT EXISTS (SELECT 1 FROM relaxations WHERE group_id = ? AND status = 'pending')`)
    .bind(JSON.stringify(agreement), Date.now(), Date.now(), group.id, group.updatedAt, Date.now(), group.id).run();
  if (!result.meta.changes) throw new Error('Answers changed or a proposal is still awaiting approval. Refresh the brief before locking.');
  await event(group.id, 'agreement_locked');
  return agreement;
}

export async function unlockGroup(token: string) {
  const { group, role } = await groupLookup(token);
  if (role !== 'organizer') throw new Error('Only the organizer can unlock the agreement.');
  await getDatabase().batch([
    getDatabase().prepare("UPDATE groups SET status = 'collecting', agreement_json = NULL, locked_at = NULL, updated_at = MAX(updated_at + 1, ?) WHERE id = ?").bind(Date.now(), group.id),
    getDatabase().prepare('DELETE FROM plans WHERE group_id = ?').bind(group.id),
    getDatabase().prepare("UPDATE relaxations SET status = 'superseded' WHERE group_id = ? AND status = 'pending'").bind(group.id),
  ]);
  await event(group.id, 'agreement_unlocked');
}

async function venueOverrides(venues: Venue[]) {
  if (!venues.length) return venues;
  const placeholders = venues.map(() => '?').join(',');
  const rows = await getDatabase().prepare(`SELECT * FROM venues WHERE place_id IN (${placeholders})`).bind(...venues.map((venue) => venue.placeId)).all<Record<string, any>>();
  const byPlace = new Map(rows.results.map((row) => [String(row.place_id), row]));
  return venues.filter((venue) => byPlace.get(venue.placeId)?.enabled !== 0).map((venue) => {
    const row = byPlace.get(venue.placeId);
    if (!row) return venue;
    if (row.source !== 'admin') return venue;
    return {
      ...venue,
      bookingUrl: row.booking_url ?? venue.bookingUrl,
      websiteUrl: row.website_url ?? venue.websiteUrl,
      priceMin: row.price_min ?? venue.priceMin,
      priceMax: row.price_max ?? venue.priceMax,
      durationMinutes: row.duration_minutes ?? venue.durationMinutes,
      dietary: json<string[]>(row.dietary, venue.dietary),
      dietaryVerified: row.source === 'admin' || venue.dietaryVerified,
    };
  });
}

export async function generatePlans(token: string) {
  const { group, role } = await groupLookup(token);
  if (role !== 'organizer') throw new Error('Only the organizer can generate plans.');
  if (group.status === 'collecting' || !group.agreement) throw new Error('Lock the group agreement before generating plans.');
  const participants = await participantsFor(group.id);
  const discovery = await discoverVenues(participants, group.agreement);
  const venues = await venueOverrides(discovery.venues);
  const sharedDates = group.agreement.commonDates.length ? group.agreement.commonDates : group.agreement.selectedDate ? [group.agreement.selectedDate] : [];
  const checkedPairs: Awaited<ReturnType<typeof pairCandidates>> = [];
  const pairsByDate = new Map<string, Awaited<ReturnType<typeof pairCandidates>>>();
  const candidates: OutingPlan[] = [];
  for (const date of sharedDates) {
    const datedAgreement = { ...group.agreement, selectedDate: date };
    const datedPairs = await pairCandidates(venues, participants, datedAgreement);
    pairsByDate.set(date, datedPairs);
    checkedPairs.push(...datedPairs);
    candidates.push(...selectPlans(datedPairs, participants, datedAgreement));
  }
  let plans = chooseDiversePlans(candidates).map((plan) => withDiningAlternatives(
    plan,
    pairsByDate.get(plan.date) ?? [],
    participants,
    { ...group.agreement!, selectedDate: plan.date },
  ));

  if (!plans.length) {
    const conflict = buildInventoryConflict(participants, group.agreement, checkedPairs);
    const now = Date.now();
    const database = getDatabase();
    await database.batch([
      database.prepare("UPDATE groups SET status = 'collecting', agreement_json = NULL, locked_at = NULL, updated_at = MAX(updated_at + 1, ?) WHERE id = ? AND updated_at = ?").bind(now, group.id, group.updatedAt),
      database.prepare(`INSERT INTO relaxations
        (id, group_id, kind, description, affected_participant_ids, proposed_changes, approvals, status, created_at, updated_at)
        SELECT ?, ?, ?, ?, ?, ?, '[]', ?, ?, ? WHERE changes() > 0`)
        .bind(crypto.randomUUID(), group.id, conflict.kind, conflict.description, JSON.stringify(conflict.affectedParticipantIds), JSON.stringify(conflict.proposedChanges), conflict.affectedParticipantIds.length ? 'pending' : 'unresolved', now, now),
    ]);
    await event(group.id, 'plan_generation_failed', null, { reason: 'no_viable_inventory' });
    throw new Error(conflict.description);
  }
  plans = await polishPlanSummaries(plans);
  const runId = crypto.randomUUID();
  const now = Date.now();
  const database = getDatabase();
  const statements: D1PreparedStatement[] = [
    database.prepare(`INSERT INTO plan_runs (id, group_id, constraints_json, source_mode, created_at)
      SELECT ?, ?, ?, ?, ? WHERE EXISTS (SELECT 1 FROM groups WHERE id = ? AND status IN ('locked', 'planned') AND updated_at = ? AND expires_at > ?)`)
      .bind(runId, group.id, JSON.stringify(group.agreement), discovery.mode, now, group.id, group.updatedAt, now),
    database.prepare('DELETE FROM plans WHERE group_id = ? AND EXISTS (SELECT 1 FROM plan_runs WHERE id = ?)').bind(group.id, runId),
    ...plans.map((plan) => database.prepare(`INSERT INTO plans
      (id, run_id, group_id, rank, label, title, summary, score, known_cost, has_unknown_activity_cost, plan_json, created_at)
      SELECT ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ? WHERE EXISTS (SELECT 1 FROM plan_runs WHERE id = ?)`)
      .bind(plan.id, runId, group.id, plan.rank, plan.label, discovery.mode === 'live' ? `Plan ${plan.rank}` : plan.title, discovery.mode === 'live' ? 'Live details are refreshed when opened.' : plan.summary,
        discovery.mode === 'live' ? 0 : plan.score, discovery.mode === 'live' ? 0 : plan.knownCost, plan.hasUnknownActivityCost ? 1 : 0, JSON.stringify(planStoragePayload(plan, discovery.mode)), now, runId)),
    database.prepare("UPDATE groups SET status = 'planned', updated_at = MAX(updated_at + 1, ?) WHERE id = ? AND EXISTS (SELECT 1 FROM plan_runs WHERE id = ?)").bind(now, group.id, runId),
  ];
  const saved = await database.batch(statements);
  if (!saved[0].meta.changes) throw new Error('The group changed while plans were being checked. Refresh and generate again from the current agreement.');
  await event(group.id, 'plans_generated', null, { count: plans.length, sourceMode: discovery.mode });
  return { plans, dataMode: discovery.mode };
}

function chooseDiversePlans(candidates: OutingPlan[]) {
  const chosen: OutingPlan[] = [];
  const activityKey = (plan: OutingPlan) => plan.stops[0].venue.placeId;
  const categoryKey = (plan: OutingPlan) => plan.stops[0].venue.categories[0] ?? 'anything';
  const eligible = (plan: OutingPlan) => !chosen.some((item) => activityKey(item) === activityKey(plan)) && (!chosen.length || chosen.every((item) => item.area !== plan.area || categoryKey(item) !== categoryKey(plan)));
  const add = (ordered: OutingPlan[], label: OutingPlan['label']) => {
    const plan = ordered.find(eligible);
    if (plan) chosen.push({ ...plan, rank: chosen.length + 1, label });
  };
  add([...candidates].sort((a, b) => b.score - a.score), 'Best overall fit');
  add([...candidates].sort((a, b) => Math.max(...a.travel.map((item) => item.minutes)) - Math.max(...b.travel.map((item) => item.minutes))), 'Easiest commute');
  add([...candidates].sort((a, b) => Number(a.hasUnknownActivityCost || a.hasUnknownDiningCost) - Number(b.hasUnknownActivityCost || b.hasUnknownDiningCost) || a.knownCost - b.knownCost), 'Best value');
  return chosen;
}

async function verifiedActor(groupToken: string, privateKey: string) {
  const lookup = await groupLookup(groupToken);
  if (privateKey) {
    const actorHash = await hashToken(privateKey);
    const person = await getDatabase().prepare('SELECT id FROM participants WHERE group_id = ? AND edit_token_hash = ?').bind(lookup.group.id, actorHash).first();
    if (person) return { ...lookup, actorHash };
  }
  if (lookup.role === 'organizer') return { ...lookup, actorHash: lookup.tokenHash };
  throw new Error('Open this plan on the device you used to submit your preferences before voting or rating it.');
}

export async function selectFinalPlan(groupToken: string, planId: string) {
  const { group, role } = await groupLookup(groupToken);
  if (role !== 'organizer') throw new Error('Only the organizer can choose the final plan.');
  const saved = await getDatabase().prepare(`INSERT INTO selections (group_id, plan_id, selected_at)
    SELECT ?, ?, ? WHERE EXISTS (SELECT 1 FROM plans JOIN groups ON groups.id = plans.group_id WHERE plans.id = ? AND groups.id = ? AND groups.status = 'planned')
    ON CONFLICT(group_id) DO UPDATE SET plan_id = excluded.plan_id, selected_at = excluded.selected_at`)
    .bind(group.id, planId, Date.now(), planId, group.id).run();
  if (!saved.meta.changes) throw new Error('This plan is no longer available. Refresh the board.');
  await event(group.id, 'plan_selected', null, { planId });
}

export async function saveFeedback(groupToken: string, privateKey: string, usefulness: number, reuse: boolean) {
  const { group, actorHash } = await verifiedActor(groupToken, privateKey);
  if (!Number.isInteger(usefulness) || usefulness < 1 || usefulness > 5 || typeof reuse !== 'boolean') throw new Error('Choose a score from 1 to 5 and whether you would use Outly again.');
  if (group.status !== 'planned') throw new Error('Generate the plans before rating them.');
  await getDatabase().prepare(`INSERT INTO feedback (group_id, actor_hash, usefulness, reuse, updated_at) VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(group_id, actor_hash) DO UPDATE SET usefulness = excluded.usefulness, reuse = excluded.reuse, updated_at = excluded.updated_at`)
    .bind(group.id, actorHash, usefulness, reuse ? 1 : 0, Date.now()).run();
}

export async function deleteParticipant(groupToken: string, privateKey: string) {
  const { group, role } = await groupLookup(groupToken);
  if (role !== 'participant' || !privateKey) throw new Error('Open this plan on the device you used to submit your preferences.');
  const actorHash = await hashToken(privateKey);
  const participant = await getDatabase().prepare('SELECT id FROM participants WHERE group_id = ? AND edit_token_hash = ?').bind(group.id, actorHash).first<{ id: string }>();
  if (!participant) throw new Error('Your saved response could not be verified on this device.');
  const database = getDatabase();
  await database.batch([
    database.prepare('DELETE FROM votes WHERE group_id = ? AND voter_key_hash = ?').bind(group.id, actorHash),
    database.prepare('DELETE FROM feedback WHERE group_id = ? AND actor_hash = ?').bind(group.id, actorHash),
    database.prepare('DELETE FROM product_events WHERE group_id = ? AND actor_hash = ?').bind(group.id, actorHash),
    database.prepare('DELETE FROM participants WHERE id = ? AND group_id = ?').bind(participant.id, group.id),
    database.prepare('DELETE FROM relaxations WHERE group_id = ?').bind(group.id),
    database.prepare('DELETE FROM plans WHERE group_id = ?').bind(group.id),
    database.prepare('DELETE FROM plan_runs WHERE group_id = ?').bind(group.id),
    database.prepare("UPDATE groups SET status = 'collecting', agreement_json = NULL, locked_at = NULL, updated_at = ? WHERE id = ?").bind(Date.now(), group.id),
  ]);
}

export async function deleteGroup(groupToken: string) {
  const { group, role } = await groupLookup(groupToken);
  if (role !== 'organizer') throw new Error('Only the organizer can delete the entire outing.');
  const database = getDatabase();
  await database.batch([
    database.prepare('DELETE FROM product_events WHERE group_id = ?').bind(group.id),
    database.prepare('DELETE FROM groups WHERE id = ?').bind(group.id),
  ]);
}

export async function voteForPlan(groupToken: string, planId: string, voterKey: string) {
  const { group, actorHash: voterKeyHash } = await verifiedActor(groupToken, voterKey);
  const plan = await getDatabase().prepare('SELECT id FROM plans WHERE id = ? AND group_id = ? LIMIT 1').bind(planId, group.id).first<{ id: string }>();
  if (!plan) throw new Error('That plan is no longer available.');
  const database = getDatabase();
  await database.batch([
    database.prepare('DELETE FROM votes WHERE group_id = ? AND voter_key_hash = ?').bind(group.id, voterKeyHash),
    database.prepare('INSERT INTO votes (id, group_id, plan_id, voter_key_hash, created_at) VALUES (?, ?, ?, ?, ?)')
      .bind(crypto.randomUUID(), group.id, plan.id, voterKeyHash, Date.now()),
  ]);
  await event(group.id, 'plan_voted', voterKeyHash, { planId });
}

export async function adminVenueList() {
  const rows = await getDatabase().prepare(`SELECT place_id, name, kind, area, booking_url, website_url, google_maps_url, price_min, price_max,
    duration_minutes, dietary, enabled, source, refreshed_at FROM venues ORDER BY refreshed_at DESC LIMIT 100`).all<Record<string, unknown>>();
  return rows.results;
}

export async function updateVenueOverride(input: Record<string, unknown>) {
  const placeId = String(input.placeId ?? '').trim();
  if (!placeId) throw new Error('Choose a venue.');
  const bookingUrl = safeUrl(input.bookingUrl);
  const websiteUrl = safeUrl(input.websiteUrl);
  const priceMin = optionalNumber(input.priceMin);
  const priceMax = optionalNumber(input.priceMax);
  const durationMinutes = optionalNumber(input.durationMinutes);
  const dietary = Array.isArray(input.dietary) ? input.dietary.map(String).slice(0, 10) : [];
  await getDatabase().prepare(`UPDATE venues SET booking_url = ?, website_url = COALESCE(?, website_url), price_min = ?, price_max = ?,
    duration_minutes = ?, dietary = ?, source = 'admin', enabled = ?, refreshed_at = ? WHERE place_id = ?`)
    .bind(bookingUrl, websiteUrl, priceMin, priceMax, durationMinutes, JSON.stringify(dietary), input.enabled === false ? 0 : 1, Date.now(), placeId).run();
  await event(null, 'venue_override_updated', null, { placeId });
}

function safeUrl(value: unknown) {
  const string = String(value ?? '').trim();
  if (!string) return null;
  try {
    const url = new URL(string);
    return url.protocol === 'https:' ? url.toString() : null;
  } catch { return null; }
}

function optionalNumber(value: unknown) {
  if (value === '' || value === null || value === undefined) return null;
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? Math.round(number) : null;
}

export async function pilotMetrics() {
  const database = getDatabase();
  const configuredStart = runtimeValue('PILOT_START_AT');
  const parsedStart = configuredStart ? Date.parse(configuredStart) : 0;
  const start = Number.isFinite(parsedStart) ? parsedStart : 0;
  const totals = await database.prepare(`SELECT
    (SELECT COUNT(*) FROM groups WHERE created_at >= ?) AS groups_created,
    (SELECT COALESCE(SUM(expected_size), 0) FROM groups WHERE created_at >= ?) AS expected_responses,
    (SELECT COUNT(*) FROM participants WHERE submitted_at >= ?) AS participant_responses,
    (SELECT COUNT(*) FROM groups WHERE status = 'planned' AND created_at >= ?) AS groups_planned,
    (SELECT COUNT(*) FROM groups WHERE locked_at IS NOT NULL AND created_at >= ?) AS groups_locked,
    (SELECT COUNT(*) FROM votes WHERE created_at >= ?) AS votes,
    (SELECT COUNT(*) FROM relaxations WHERE created_at >= ?) AS conflicts,
    (SELECT COUNT(*) FROM relaxations WHERE status = 'accepted' AND updated_at >= ?) AS conflicts_accepted,
    (SELECT COUNT(*) FROM selections WHERE selected_at >= ?) AS final_selections,
    (SELECT COUNT(*) FROM feedback WHERE updated_at >= ?) AS feedback_count,
    (SELECT ROUND(AVG(usefulness), 1) FROM feedback WHERE updated_at >= ?) AS average_usefulness,
    (SELECT ROUND(AVG(reuse) * 100, 1) FROM feedback WHERE updated_at >= ?) AS reuse_percent,
    (SELECT ROUND(AVG(locked_at - created_at) / 60000.0, 1) FROM groups WHERE locked_at IS NOT NULL AND created_at >= ?) AS average_minutes_to_lock`)
    .bind(start, start, start, start, start, start, start, start, start, start, start, start, start).first<Record<string, number | null>>();
  const values = totals ?? {};
  const expected = Number(values.expected_responses ?? 0);
  const locked = Number(values.groups_locked ?? 0);
  const conflicts = Number(values.conflicts ?? 0);
  const rates = {
    inviteCompletionPercent: expected ? Math.round(Number(values.participant_responses ?? 0) / expected * 1000) / 10 : 0,
    generationSuccessPercent: locked ? Math.round(Number(values.groups_planned ?? 0) / locked * 1000) / 10 : 0,
    conflictAcceptancePercent: conflicts ? Math.round(Number(values.conflicts_accepted ?? 0) / conflicts * 1000) / 10 : 0,
  };
  const events = await database.prepare('SELECT event_name, COUNT(*) AS count FROM product_events WHERE created_at >= ? GROUP BY event_name ORDER BY count DESC').bind(start).all<{ event_name: string; count: number }>();
  return { pilotStartAt: configuredStart ?? null, totals: values, rates, events: events.results };
}
