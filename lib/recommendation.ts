import {
  ACTIVITY_CATEGORIES,
  DURATION_BANDS,
  TIME_WINDOWS,
  type ActivityCategory,
  type CandidatePair,
  type ConflictSuggestion,
  type FoodPreference,
  type GroupAgreement,
  type OutingPlan,
  type ParticipantRecord,
  type TimeWindow,
  type Venue,
} from './outly-types';

const specificActivities = ACTIVITY_CATEGORIES.filter((category): category is Exclude<ActivityCategory, 'anything'> => category !== 'anything');

function intersection<T>(lists: T[][]): T[] {
  if (lists.length === 0) return [];
  return [...new Set(lists[0])].filter((value) => lists.every((list) => list.includes(value)));
}

function mostPopular<T extends string>(values: T[]): T | null {
  if (values.length === 0) return null;
  const counts = new Map<T, number>();
  values.forEach((value) => counts.set(value, (counts.get(value) ?? 0) + 1));
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
}

function participantIdsMissing<T>(participants: ParticipantRecord[], key: keyof ParticipantRecord, value: T) {
  return participants.filter((participant) => !(participant[key] as T[]).includes(value)).map((participant) => participant.id);
}

type TimeRange = { start: number; end: number };

function mergeRanges(ranges: TimeRange[]): TimeRange[] {
  const merged: TimeRange[] = [];
  for (const range of [...ranges].sort((a, b) => a.start - b.start)) {
    const last = merged.at(-1);
    if (last && range.start <= last.end) last.end = Math.max(last.end, range.end);
    else merged.push({ ...range });
  }
  return merged;
}

export function sharedTimeRanges(participants: ParticipantRecord[]): TimeRange[] {
  return participants.reduce<TimeRange[]>((shared, person) => {
    const extension = person.timeExtensionMinutes ?? 0;
    const ranges = mergeRanges(person.timeWindows.map((window) => ({ start: Math.max(0, TIME_WINDOWS[window].start - extension), end: Math.min(1440, TIME_WINDOWS[window].end + extension) })));
    return mergeRanges(shared.flatMap((a) => ranges.map((b) => ({ start: Math.max(a.start, b.start), end: Math.min(a.end, b.end) })).filter((range) => range.end > range.start)));
  }, [{ start: 0, end: 1440 }]);
}

export function aggregatePreferences(participants: ParticipantRecord[], candidateDates: string[]): GroupAgreement {
  const commonDates = intersection(participants.map((participant) => participant.acceptableDates)).filter((date) => candidateDates.includes(date));
  const commonTimeWindows = intersection(participants.map((participant) => participant.timeWindows));
  const commonTimeRanges = participants.length ? sharedTimeRanges(participants) : [];
  const budgetTarget = participants.length ? Math.min(...participants.map((participant) => participant.budgetTarget)) : 0;
  const budgetHardMax = participants.length ? Math.min(...participants.map((participant) => Math.min(participant.budgetHardMax, roundBudgetHardMax(participant.budgetTarget)))) : 0;
  const durationMin = participants.length ? Math.max(...participants.map((participant) => DURATION_BANDS[participant.durationBand].min)) : 0;
  const durationMax = participants.length ? Math.min(...participants.map((participant) => participant.durationMaxOverride ?? DURATION_BANDS[participant.durationBand].max)) : 0;

  const votes = specificActivities.map((category) => ({
    category,
    votes: participants.filter((participant) => participant.activities.includes(category) || participant.activities.includes('anything')).length,
  })).sort((a, b) => b.votes - a.votes || specificActivities.indexOf(a.category) - specificActivities.indexOf(b.category));

  const foodPreference = (mostPopular(participants.map((participant) => participant.foodPreference)) ?? 'meal') as FoodPreference;
  const dietary = [...new Set(participants.flatMap((participant) => participant.dietary).filter(Boolean))];
  let conflict: ConflictSuggestion | null = null;

  if (participants.length < 2) {
    conflict = {
      kind: 'responses',
      title: 'One more response unlocks the group view',
      description: 'Outly needs at least two completed responses before it can find a genuine overlap.',
      affectedParticipantIds: [],
      proposedChanges: {},
    };
  } else if (commonDates.length === 0) {
    const dateVotes = candidateDates.map((date) => ({ date, count: participants.filter((participant) => participant.acceptableDates.includes(date)).length })).sort((a, b) => b.count - a.count);
    const proposedDate = dateVotes[0]?.date ?? candidateDates[0];
    conflict = {
      kind: 'date',
      title: 'One date change unlocks the group',
      description: proposedDate ? `If the highlighted people can make ${formatDate(proposedDate)}, everyone has a shared date.` : 'Add another candidate date to find an overlap.',
      affectedParticipantIds: proposedDate ? participantIdsMissing(participants, 'acceptableDates', proposedDate) : participants.map((participant) => participant.id),
      proposedChanges: { acceptableDate: proposedDate },
    };
  } else if (!commonTimeRanges.some((range) => range.end - range.start >= durationMin) && durationMin <= durationMax) {
    const adjustable = participants.filter((person) => (person.timeExtensionMinutes ?? 0) < 60);
    let adjustment: { ids: string[]; minutes: number } | null = null;
    for (let count = 1; count <= adjustable.length && !adjustment; count++) {
      for (const minutes of [30, 60]) {
        for (let mask = 1; mask < 2 ** adjustable.length; mask++) {
          const ids = adjustable.filter((_, index) => mask & (1 << index)).map((person) => person.id);
          if (ids.length !== count) continue;
          const changed = participants.map((person) => ids.includes(person.id) ? { ...person, timeExtensionMinutes: Math.max(person.timeExtensionMinutes ?? 0, minutes) } : person);
          if (sharedTimeRanges(changed).some((range) => range.end - range.start >= durationMin)) { adjustment = { ids, minutes }; break; }
        }
        if (adjustment) break;
      }
    }
    conflict = {
      kind: 'time',
      title: adjustment ? 'A wider time window opens options' : 'Choose a new shared time',
      description: adjustment ? `Ask the highlighted people to allow their selected windows to start up to ${adjustment.minutes} minutes earlier and end up to ${adjustment.minutes} minutes later.` : 'A 60-minute adjustment is not enough for the requested duration. Edit your time windows or duration to find an overlap.',
      affectedParticipantIds: adjustment?.ids ?? [],
      proposedChanges: adjustment ? { timeExtensionMinutes: adjustment.minutes } : {},
    };
  } else if (durationMin > durationMax) {
    const proposedMax = Math.min(420, durationMin);
    const affected = participants.filter((participant) => (participant.durationMaxOverride ?? DURATION_BANDS[participant.durationBand].max) < durationMin).map((participant) => participant.id);
    conflict = {
      kind: 'duration',
      title: 'The group needs a little more time',
      description: `Extending the highlighted people’s limit to ${formatDuration(proposedMax)} creates a shared duration.`,
      affectedParticipantIds: affected,
      proposedChanges: { durationMax: proposedMax },
    };
  }

  return {
    participantCount: participants.length,
    selectedDate: commonDates[0] ?? null,
    commonDates,
    selectedTimeWindow: commonTimeWindows[0] ?? participants[0]?.timeWindows.find((window) => commonTimeRanges.some((range) => range.start >= TIME_WINDOWS[window].start && range.start < TIME_WINDOWS[window].end)) ?? null,
    commonTimeWindows,
    commonTimeRanges,
    budgetTarget,
    budgetHardMax,
    rankedActivities: votes,
    foodPreference,
    dietary,
    durationMin,
    durationMax,
    conflict,
  };
}

export function roundBudgetHardMax(target: number) {
  return Math.floor(target * 115 / 100);
}

export function formatDate(value: string) {
  const date = new Date(`${value}T12:00:00+05:30`);
  return new Intl.DateTimeFormat('en-IN', { weekday: 'short', day: 'numeric', month: 'short' }).format(date);
}

export function formatDuration(minutes: number) {
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return `${hours ? `${hours}h` : ''}${hours && remainder ? ' ' : ''}${remainder ? `${remainder}m` : ''}`;
}

export function inferMealLabel(timeWindow: TimeWindow, food: FoodPreference) {
  if (food === 'snacks') return timeWindow === 'late' ? 'Late bites & drinks' : 'Snacks & drinks';
  if (timeWindow === 'morning') return 'Breakfast';
  if (timeWindow === 'lunch' || timeWindow === 'afternoon') return 'Lunch';
  return 'Dinner';
}

function minutesToTime(minutes: number) {
  const normalized = ((minutes % 1440) + 1440) % 1440;
  const hours = Math.floor(normalized / 60);
  const mins = normalized % 60;
  const suffix = hours >= 12 ? 'PM' : 'AM';
  const displayHour = hours % 12 || 12;
  return `${displayHour}:${String(mins).padStart(2, '0')} ${suffix}`;
}

function actionFor(venue: Venue) {
  if (venue.bookingUrl) return { url: venue.bookingUrl, label: 'Book with venue' };
  if (venue.websiteUrl) return { url: venue.websiteUrl, label: 'Open venue site' };
  return { url: venue.googleMapsUrl, label: 'Open in Google Maps' };
}

function qualityScore(venue: Venue) {
  if (!venue.rating) return 50;
  const confidence = Math.min(1, Math.log10(Math.max(10, venue.ratingCount ?? 10)) / 4);
  return Math.max(0, Math.min(100, ((venue.rating - 3) / 2) * 70 + confidence * 30));
}

export function venueOpenFor(venue: Venue, date: string, start: number, end: number): boolean {
  // Reference catalogue entries are only allowed in explicitly marked preview mode.
  if (!venue.openingPeriods.length) return venue.source === 'outly_fallback';
  const day = new Date(`${date}T12:00:00Z`).getUTCDay();
  const from = day * 1440 + start;
  const to = day * 1440 + end;
  return venue.openingPeriods.some((period) => {
    if (!period.close) return period.open.day === 0 && period.open.hour === 0 && period.open.minute === 0;
    const open = period.open.day * 1440 + period.open.hour * 60 + period.open.minute;
    let close = period.close.day * 1440 + period.close.hour * 60 + period.close.minute;
    if (close <= open) close += 7 * 1440;
    return [-7 * 1440, 0, 7 * 1440].some((offset) => from >= open + offset && to <= close + offset);
  });
}

function schedulePair(pair: CandidatePair, agreement: GroupAgreement): number | null {
  if (!agreement.selectedDate || !agreement.selectedTimeWindow || agreement.conflict) return null;
  const activityDuration = pair.activity.durationMinutes ?? 90;
  const diningDuration = agreement.foodPreference === 'meal' ? 75 : 50;
  const duration = activityDuration + pair.betweenMinutes + diningDuration;
  if (duration < agreement.durationMin || duration > agreement.durationMax) return null;
  const ranges = agreement.commonTimeRanges ?? [TIME_WINDOWS[agreement.selectedTimeWindow]];
  for (const range of ranges) {
    for (let start = range.start; start + duration <= range.end; start += 15) {
      const diningStart = start + activityDuration + pair.betweenMinutes;
      if (venueOpenFor(pair.activity, agreement.selectedDate, start, start + activityDuration) && venueOpenFor(pair.dining, agreement.selectedDate, diningStart, start + duration)) return start;
    }
  }
  return null;
}

function buildPlan(pair: CandidatePair, agreement: GroupAgreement, rank: number, label: OutingPlan['label'], startMinute: number): OutingPlan {
  const selectedActivity = agreement.rankedActivities[0];
  const activityVotes = agreement.rankedActivities.find((item) => pair.activity.categories.includes(item.category))?.votes ?? 0;
  const preferenceScore = agreement.participantCount ? (activityVotes / agreement.participantCount) * 100 : 0;
  const maxTravel = Math.max(...pair.travel.map((item) => item.minutes), 0);
  const travelAverage = pair.travel.length ? pair.travel.reduce((sum, item) => sum + item.minutes, 0) / pair.travel.length : 0;
  const variance = pair.travel.length ? pair.travel.reduce((sum, item) => sum + Math.abs(item.minutes - travelAverage), 0) / pair.travel.length : 0;
  const travelScore = Math.max(0, 100 - maxTravel * 1.2 - variance * 1.5);
  const knownCost = (pair.activity.priceMax ?? 0) + (pair.dining.priceMax ?? 0);
  const budgetScore = agreement.budgetTarget ? Math.max(0, 100 - knownCost / agreement.budgetHardMax * 50) : 60;
  const venueScore = (qualityScore(pair.activity) + qualityScore(pair.dining)) / 2;
  const convenienceScore = Math.max(0, 100 - pair.betweenMinutes * 3);
  const score = Math.round(preferenceScore * 0.3 + travelScore * 0.25 + budgetScore * 0.2 + venueScore * 0.15 + convenienceScore * 0.1);
  const window = agreement.selectedTimeWindow ?? 'evening';
  const activityDuration = pair.activity.durationMinutes ?? 90;
  const diningDuration = agreement.foodPreference === 'meal' ? 75 : 50;
  const diningStart = startMinute + activityDuration + pair.betweenMinutes;
  const endMinute = diningStart + diningDuration;
  const activityAction = actionFor(pair.activity);
  const diningAction = actionFor(pair.dining);
  const activityCategory = pair.activity.categories[0] ?? selectedActivity?.category ?? 'games';
  const reasons = [
    `${activityVotes}/${agreement.participantCount} people selected this kind of activity`,
    `No one travels more than ${maxTravel} minutes`,
    pair.betweenMinutes <= 10 ? 'The two stops are within 10 minutes of each other' : `${pair.betweenMinutes} minutes between stops`,
  ];

  return {
    id: crypto.randomUUID(),
    rank,
    label,
    title: `${pair.activity.name} + ${pair.dining.name}`,
    summary: `${label === 'Easiest commute' ? 'The most travel-friendly option' : label === 'Best value' ? 'The strongest known-cost option' : 'The best balance of preferences and travel'}, built around ${pair.activity.area}.`,
    score,
    fitCount: agreement.participantCount,
    participantCount: agreement.participantCount,
    area: pair.activity.area,
    date: agreement.selectedDate ?? '',
    startTime: minutesToTime(startMinute),
    endTime: minutesToTime(endMinute),
    knownCost,
    hasUnknownActivityCost: pair.activity.priceMax === null,
    hasUnknownDiningCost: pair.dining.priceMax === null,
    hoursVerificationRequired: !pair.activity.openingPeriods.length || !pair.dining.openingPeriods.length,
    dietaryVerificationRequired: agreement.dietary.length > 0 && !pair.dining.dietaryVerified,
    travel: pair.travel,
    stops: [
      {
        kind: 'activity',
        time: minutesToTime(startMinute),
        durationMinutes: activityDuration,
        venue: pair.activity,
        priceLabel: pair.activity.priceMax === null ? 'Price to verify' : `Up to ₹${pair.activity.priceMax.toLocaleString('en-IN')}`,
        actionUrl: activityAction.url,
        actionLabel: activityAction.label,
      },
      {
        kind: 'dining',
        time: minutesToTime(diningStart),
        durationMinutes: diningDuration,
        venue: pair.dining,
        priceLabel: pair.dining.priceMax === null ? 'Price to verify' : `Up to ₹${pair.dining.priceMax.toLocaleString('en-IN')}`,
        actionUrl: diningAction.url,
        actionLabel: diningAction.label,
      },
    ],
    reasons: [...reasons, `${inferMealLabel(window, agreement.foodPreference)} follows the ${activityCategory} stop`],
  };
}

export function selectPlans(pairs: CandidatePair[], participants: ParticipantRecord[], agreement: GroupAgreement) {
  if (participants.length < 2 || agreement.conflict) return [];
  const viable = pairs.filter((pair) => {
    const knownCost = (pair.activity.priceMax ?? 0) + (pair.dining.priceMax ?? 0);
    const travelFits = participants.every((participant) => {
      const travel = pair.travel.find((item) => item.participantId === participant.id);
      return travel && travel.mode === participant.travelMode && Number.isFinite(travel.minutes) && travel.minutes >= 0 && travel.minutes <= participant.travelMaxMinutes;
    });
    const dietaryFits = agreement.dietary.every((requirement) => pair.dining.dietaryVerified && pair.dining.dietary.includes(requirement));
    const linksFit = [pair.activity, pair.dining].every((venue) => /^https?:\/\//.test(actionFor(venue).url));
    const liveTravelFits = pair.activity.source === 'outly_fallback' || pair.travel.every((travel) => !travel.estimated);
    return knownCost <= agreement.budgetHardMax && knownCost >= 0 && travelFits && liveTravelFits && dietaryFits && linksFit && schedulePair(pair, agreement) !== null;
  });

  const base = viable.map((pair) => buildPlan(pair, agreement, 0, 'Best overall fit', schedulePair(pair, agreement)!));
  const bestOverall = [...base].sort((a, b) => b.score - a.score)[0];
  const selections: OutingPlan[] = [];

  const add = (plan: OutingPlan | undefined, label: OutingPlan['label']) => {
    if (!plan || selections.some((item) => item.stops[0].venue.placeId === plan.stops[0].venue.placeId)) return;
    selections.push({ ...plan, id: crypto.randomUUID(), rank: selections.length + 1, label });
  };
  add(bestOverall, 'Best overall fit');
  const easiest = [...base]
    .filter((plan) => !selections.some((item) => item.stops[0].venue.placeId === plan.stops[0].venue.placeId))
    .sort((a, b) => Math.max(...a.travel.map((item) => item.minutes)) - Math.max(...b.travel.map((item) => item.minutes)))[0];
  add(easiest, 'Easiest commute');
  const bestValue = [...base]
    .filter((plan) => !selections.some((item) => item.stops[0].venue.placeId === plan.stops[0].venue.placeId))
    .sort((a, b) => Number(a.hasUnknownActivityCost || a.hasUnknownDiningCost) - Number(b.hasUnknownActivityCost || b.hasUnknownDiningCost) || a.knownCost - b.knownCost)[0];
  add(bestValue, 'Best value');

  for (const plan of [...base].sort((a, b) => b.score - a.score)) {
    if (selections.length >= 3) break;
    const label: OutingPlan['label'] = selections.length === 1 ? 'Easiest commute' : selections.length === 2 ? 'Best value' : 'Best overall fit';
    add(plan, label);
  }

  return selections;
}

export function buildInventoryConflict(participants: ParticipantRecord[], agreement: GroupAgreement, pairs: CandidatePair[] = []): ConflictSuggestion {
  const tightTravel = [...participants].sort((a, b) => a.travelMaxMinutes - b.travelMaxMinutes).find((person) =>
    person.travelMaxMinutes <= 90 && selectPlans(pairs, participants.map((item) => item.id === person.id ? { ...item, travelMaxMinutes: item.travelMaxMinutes + 5 } : item), agreement).length > 0);
  if (tightTravel) {
    return {
      kind: 'travel',
      title: 'Five more travel minutes could unlock plans',
      description: `Increasing the highlighted participant’s travel limit from ${tightTravel.travelMaxMinutes} to ${tightTravel.travelMaxMinutes + 5} minutes unlocks a pairing from the options just checked.`,
      affectedParticipantIds: [tightTravel.id],
      proposedChanges: { participantId: tightTravel.id, travelMaxMinutes: tightTravel.travelMaxMinutes + 5 },
    };
  }
  return {
    kind: 'inventory',
    title: 'No honest match yet',
    description: agreement.dietary.length ? 'No pairing satisfies the group’s dietary requirements with verified venue information, timing, travel and known costs. Keep those requirements and try other times or areas.' : 'No pairing fits the shared time, duration, travel, opening hours and known-cost limits. Edit the group’s answers or retry when more venue information is available.',
    affectedParticipantIds: [],
    proposedChanges: {},
  };
}
