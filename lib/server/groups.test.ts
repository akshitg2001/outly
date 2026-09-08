import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import type { ParticipantPreferenceInput } from '../outly-types';
import * as google from './google';
import { approveRelaxation, createGroup, createRelaxation, deleteGroup, deleteParticipant, generatePlans, getGroupView, getOwnPreferences, lockGroup, planStoragePayload, saveFeedback, selectFinalPlan, submitParticipant, unlockGroup, voteForPlan } from './groups';

let sqlite: DatabaseSync;
const runtime = vi.hoisted(() => ({ database: null as unknown }));
vi.mock('./runtime', () => ({ getDatabase: () => runtime.database, runtimeValue: () => undefined }));

function prepared(sql: string, bindings: unknown[] = []) {
  return {
    bind: (...values: unknown[]) => prepared(sql, values),
    execute: () => {
      const result = sqlite.prepare(sql).run(...bindings as never[]);
      return { success: true, meta: { changes: Number(result.changes) } };
    },
    run: async () => prepared(sql, bindings).execute(),
    first: async () => sqlite.prepare(sql).get(...bindings as never[]) ?? null,
    all: async () => ({ results: sqlite.prepare(sql).all(...bindings as never[]) }),
  };
}

beforeEach(() => {
  sqlite = new DatabaseSync(':memory:');
  sqlite.exec('PRAGMA foreign_keys = ON');
  const migrations = resolve('drizzle');
  for (const file of readdirSync(migrations).filter((name) => name.endsWith('.sql')).sort()) sqlite.exec(readFileSync(resolve(migrations, file), 'utf8'));
  runtime.database = {
    prepare: (sql: string) => prepared(sql),
    batch: async (statements: ReturnType<typeof prepared>[]) => {
      sqlite.exec('BEGIN');
      try {
        const output = [];
        for (const statement of statements) output.push(statement.execute());
        sqlite.exec('COMMIT');
        return output;
      } catch (error) { sqlite.exec('ROLLBACK'); throw error; }
    },
  };
});
afterEach(() => { vi.restoreAllMocks(); sqlite.close(); });

const date = (days: number) => new Date(Date.now() + days * 86400000).toISOString().slice(0, 10);
const token = (index: number) => index.toString().padStart(32, 'x');
async function group() { return createGroup({ name: 'Integration outing', occasion: 'Friends', expectedSize: 4, candidateDates: [date(2), date(3)] }, 'https://outly.test'); }
function answer(index: number, overrides: Partial<ParticipantPreferenceInput> = {}) {
  return { displayName: 'Person ' + index, originLabel: 'Connaught Place', originPlaceId: 'preview:cp',
    travelMode: 'drive' as const, travelMaxMinutes: 90, budgetTarget: 4000, acceptableDates: [date(2), date(3)],
    timeWindows: ['afternoon', 'evening', 'late'] as ParticipantPreferenceInput['timeWindows'], activities: ['anything'] as ParticipantPreferenceInput['activities'],
    foodPreference: 'meal' as const, dietary: [], durationBand: 'flexible' as const, editToken: token(index), ...overrides };
}

describe('database-backed group journey', () => {
  it('creates, joins, restores private answers, locks, generates, votes and invalidates old plans on unlock', async () => {
    const outing = await group();
    for (let index = 0; index < 4; index++) await submitParticipant(outing.joinToken, answer(index));
    await Promise.all([submitParticipant(outing.joinToken, answer(0)), submitParticipant(outing.joinToken, answer(0))]);
    expect((await getGroupView(outing.joinToken)).submittedCount).toBe(4);
    const privateAnswer = await getOwnPreferences(outing.joinToken, token(0));
    expect(privateAnswer.budgetTarget).toBe(4000);
    const publicJson = JSON.stringify(await getGroupView(outing.joinToken));
    expect(publicJson).not.toContain('originLat');
    expect(publicJson).not.toContain('edit_token_hash');
    await expect(lockGroup(outing.joinToken)).rejects.toThrow('organizer');
    await lockGroup(outing.organizerToken);
    await expect(submitParticipant(outing.joinToken, answer(0))).rejects.toThrow('locked');
    const generated = await generatePlans(outing.organizerToken);
    expect(generated.plans.length).toBeGreaterThan(0);
    expect(generated.plans.length).toBeLessThanOrEqual(3);
    expect(generated.dataMode).toBe('preview');
    await voteForPlan(outing.joinToken, generated.plans[0].id, token(0));
    await voteForPlan(outing.joinToken, generated.plans[0].id, token(0));
    expect((await getGroupView(outing.joinToken)).votes?.[generated.plans[0].id]).toBe(1);
    await unlockGroup(outing.organizerToken);
    expect((await getGroupView(outing.joinToken)).plans).toEqual([]);
  });

  it('applies approvals once and preserves every affected participant’s original dates', async () => {
    const outing = await group();
    for (let index = 0; index < 4; index++) await submitParticipant(outing.joinToken, answer(index, { acceptableDates: [date(index < 2 ? 2 : 3)] }));
    await createRelaxation(outing.organizerToken);
    await approveRelaxation(outing.joinToken, token(2));
    await expect(lockGroup(outing.organizerToken)).rejects.toThrow();
    await Promise.all([approveRelaxation(outing.joinToken, token(2)), approveRelaxation(outing.joinToken, token(3))]);
    expect((await getOwnPreferences(outing.joinToken, token(2))).acceptableDates).toEqual([date(3), date(2)]);
    expect((await getOwnPreferences(outing.joinToken, token(3))).acceptableDates).toEqual([date(3), date(2)]);
    await expect(approveRelaxation(outing.joinToken, token(3))).rejects.toThrow('pending');
    await lockGroup(outing.organizerToken);
  });

  it('enforces an expired link and erases the stored origin', async () => {
    const outing = await group();
    await submitParticipant(outing.joinToken, answer(0));
    sqlite.prepare('UPDATE groups SET expires_at = ? WHERE id = ?').run(Date.now() - 1, outing.groupId);
    await expect(getGroupView(outing.joinToken)).rejects.toThrow('expired');
    await expect(submitParticipant(outing.joinToken, answer(1))).rejects.toThrow('expired');
    const row = sqlite.prepare('SELECT origin_label, origin_lat, origin_place_id FROM participants').get();
    expect(row).toMatchObject({ origin_label: null, origin_lat: null, origin_place_id: null });
  });

  it('rejects a submission that finishes resolving its origin after the organizer locks', async () => {
    const outing = await group();
    await submitParticipant(outing.joinToken, answer(0)); await submitParticipant(outing.joinToken, answer(1));
    let release!: (value: Awaited<ReturnType<typeof google.resolveOrigin>>) => void;
    let started!: () => void;
    const entered = new Promise<void>((resolve) => { started = resolve; });
    vi.spyOn(google, 'resolveOrigin').mockImplementationOnce(() => { started(); return new Promise((resolve) => { release = resolve; }); });
    const pending = submitParticipant(outing.joinToken, answer(2));
    await entered;
    await lockGroup(outing.organizerToken);
    release({ lat: 28.63, lng: 77.21, label: 'Connaught Place', placeId: 'preview:cp' });
    await expect(pending).rejects.toThrow('locked');
    expect((await getGroupView(outing.joinToken)).submittedCount).toBe(2);
  });

  it('rejects plans generated from an agreement that was unlocked during discovery', async () => {
    const outing = await group();
    await submitParticipant(outing.joinToken, answer(0)); await submitParticipant(outing.joinToken, answer(1));
    await lockGroup(outing.organizerToken);
    const original = google.discoverVenues;
    vi.spyOn(google, 'discoverVenues').mockImplementationOnce(async (...args) => {
      await unlockGroup(outing.organizerToken);
      return original(...args);
    });
    await expect(generatePlans(outing.organizerToken)).rejects.toThrow('changed');
    expect((await getGroupView(outing.joinToken)).plans).toEqual([]);
  });

  it('applies exactly the proposed duration rather than making the participant flexible', async () => {
    const outing = await group();
    await submitParticipant(outing.joinToken, answer(0, { durationBand: 'quick' }));
    await submitParticipant(outing.joinToken, answer(1, { durationBand: 'extended' }));
    await createRelaxation(outing.organizerToken);
    await approveRelaxation(outing.joinToken, token(0));
    const own = await getOwnPreferences(outing.joinToken, token(0));
    expect(own.durationBand).toBe('quick');
    expect(own.durationMaxOverride).toBe(300);
    expect((await getGroupView(outing.joinToken)).agreement?.durationMax).toBe(300);
  });

  it('enforces the ten-person maximum even for submissions made together', async () => {
    const outing = await group();
    const submitted = await Promise.allSettled(Array.from({ length: 11 }, (_, index) => submitParticipant(outing.joinToken, answer(index))));
    expect(submitted.filter((result) => result.status === 'fulfilled')).toHaveLength(10);
    expect((await getGroupView(outing.joinToken)).submittedCount).toBe(10);
  });

  it('requires a verified participant to vote or submit feedback', async () => {
    const outing = await group();
    await submitParticipant(outing.joinToken, answer(0));
    await submitParticipant(outing.joinToken, answer(1));
    await lockGroup(outing.organizerToken);
    const generated = await generatePlans(outing.organizerToken);
    const planId = generated.plans[0].id;

    await expect(voteForPlan(outing.joinToken, planId, 'unverified-browser-key')).rejects.toThrow('device you used');
    await expect(saveFeedback(outing.joinToken, 'unverified-browser-key', 4, true)).rejects.toThrow('device you used');

    await voteForPlan(outing.joinToken, planId, token(0));
    await saveFeedback(outing.joinToken, token(0), 4, true);
    await saveFeedback(outing.joinToken, token(0), 5, false);
    expect(sqlite.prepare('SELECT usefulness, reuse FROM feedback').get()).toMatchObject({ usefulness: 5, reuse: 0 });
  });

  it('allows only the organizer to choose the final plan and shares that choice', async () => {
    const outing = await group();
    await submitParticipant(outing.joinToken, answer(0));
    await submitParticipant(outing.joinToken, answer(1));
    await lockGroup(outing.organizerToken);
    const generated = await generatePlans(outing.organizerToken);
    const planId = generated.plans[0].id;

    await expect(selectFinalPlan(outing.joinToken, planId)).rejects.toThrow('Only the organizer');
    await selectFinalPlan(outing.organizerToken, planId);
    expect((await getGroupView(outing.joinToken)).selectedPlanId).toBe(planId);
    expect((await getGroupView(outing.organizerToken)).selectedPlanId).toBe(planId);
  });

  it('lets a participant erase their response and the organizer erase the outing', async () => {
    const outing = await group();
    await submitParticipant(outing.joinToken, answer(0));
    await submitParticipant(outing.joinToken, answer(1));
    await lockGroup(outing.organizerToken);
    await generatePlans(outing.organizerToken);

    await expect(deleteParticipant(outing.joinToken, 'wrong-device')).rejects.toThrow('verified');
    await deleteParticipant(outing.joinToken, token(0));
    const reset = await getGroupView(outing.organizerToken);
    expect(reset.submittedCount).toBe(1);
    expect(reset.group.status).toBe('collecting');
    expect(reset.plans).toEqual([]);

    await expect(deleteGroup(outing.joinToken)).rejects.toThrow('Only the organizer');
    await deleteGroup(outing.organizerToken);
    await expect(getGroupView(outing.joinToken)).rejects.toThrow('invalid or has expired');
  });

  it('stores live plans as place references without restricted display or route fields', async () => {
    const outing = await group();
    await submitParticipant(outing.joinToken, answer(0)); await submitParticipant(outing.joinToken, answer(1));
    await lockGroup(outing.organizerToken);
    const plan = (await generatePlans(outing.organizerToken)).plans[0];
    const stored = JSON.stringify(planStoragePayload({ ...plan, stops: plan.stops.map((stop) => ({ ...stop, venue: { ...stop.venue, source: 'google_places' as const } })) }, 'live'));
    expect(stored).toContain('placeId');
    expect(stored).not.toContain('National Gallery');
    expect(stored).not.toContain('travel');
    expect(stored).not.toContain('rating');
    expect(stored).not.toContain('openingPeriods');
  });
});
