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

export function aggregatePreferences(participants: ParticipantRecord[], candidateDates: string[]): GroupAgreement {
  const commonDates = intersection(participants.map((participant) => participant.acceptableDates)).filter((date) => candidateDates.includes(date));
  const commonTimeWindows = intersection(participants.map((participant) => participant.timeWindows));
  const budgetTarget = participants.length ? Math.min(...participants.map((participant) => participant.budgetTarget)) : 0;
  const budgetHardMax = participants.length ? Math.min(...participants.map((participant) => participant.budgetHardMax)) : 0;
  const durationMin = participants.length ? Math.max(...participants.map((participant) => DURATION_BANDS[participant.durationBand].min)) : 0;
  const durationMax = participants.length ? Math.min(...participants.map((participant) => DURATION_BANDS[participant.durationBand].max)) : 0;

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
  } else if (commonTimeWindows.length === 0) {
    const windows = Object.keys(TIME_WINDOWS) as TimeWindow[];
    const ranked = windows.map((window) => ({ window, count: participants.filter((participant) => participant.timeWindows.includes(window)).length })).sort((a, b) => b.count - a.count);
    const proposedWindow = ranked[0]?.window ?? 'evening';
    conflict = {
      kind: 'time',
      title: 'A small time shift opens options',
      description: `Ask the highlighted people to also accept the ${proposedWindow} window.`,
      affectedParticipantIds: participantIdsMissing(participants, 'timeWindows', proposedWindow),
      proposedChanges: { timeWindow: proposedWindow, widenMinutes: 60 },
    };
  } else if (durationMin > durationMax) {
    const proposedMax = Math.min(420, durationMin);
    const affected = participants.filter((participant) => DURATION_BANDS[participant.durationBand].max < durationMin).map((participant) => participant.id);
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
    selectedTimeWindow: commonTimeWindows[0] ?? null,
    commonTimeWindows,
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
  return Math.ceil((target * 1.15) / 100) * 100;
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

function buildPlan(pair: CandidatePair, agreement: GroupAgreement, rank: number, label: OutingPlan['label']): OutingPlan {
  const selectedActivity = agreement.rankedActivities[0];
  const activityVotes = agreement.rankedActivities.find((item) => pair.activity.categories.includes(item.category))?.votes ?? 0;
  const preferenceScore = agreement.participantCount ? (activityVotes / agreement.participantCount) * 100 : 0;
  const maxTravel = Math.max(...pair.travel.map((item) => item.minutes), 0);
  const travelAverage = pair.travel.length ? pair.travel.reduce((sum, item) => sum + item.minutes, 0) / pair.travel.length : 0;
  const variance = pair.travel.length ? pair.travel.reduce((sum, item) => sum + Math.abs(item.minutes - travelAverage), 0) / pair.travel.length : 0;
  const travelScore = Math.max(0, 100 - maxTravel * 1.2 - variance * 1.5);
  const knownCost = (pair.activity.priceMax ?? 0) + (pair.dining.priceMax ?? 0);
  const budgetScore = agreement.budgetTarget ? Math.max(0, 100 - Math.abs(agreement.budgetTarget - knownCost) / agreement.budgetTarget * 80) : 60;
  const venueScore = (qualityScore(pair.activity) + qualityScore(pair.dining)) / 2;
  const convenienceScore = Math.max(0, 100 - pair.betweenMinutes * 3);
  const score = Math.round(preferenceScore * 0.3 + travelScore * 0.25 + budgetScore * 0.2 + venueScore * 0.15 + convenienceScore * 0.1);
  const window = agreement.selectedTimeWindow ?? 'evening';
  const startMinute = TIME_WINDOWS[window].start + 30;
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
    fitCount: pair.travel.filter((travel) => travel.minutes <= ((agreement.participantCount ? 999 : 0))).length || agreement.participantCount,
    participantCount: agreement.participantCount,
    area: pair.activity.area,
    date: agreement.selectedDate ?? '',
    startTime: minutesToTime(startMinute),
    endTime: minutesToTime(endMinute),
    knownCost,
    hasUnknownActivityCost: pair.activity.priceMax === null,
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
  const viable = pairs.filter((pair) => {
    const knownCost = (pair.activity.priceMax ?? 0) + (pair.dining.priceMax ?? 0);
    const travelFits = pair.travel.every((travel) => {
      const participant = participants.find((item) => item.id === travel.participantId);
      return participant ? travel.minutes <= participant.travelMaxMinutes + 5 : false;
    });
    const duration = (pair.activity.durationMinutes ?? 90) + pair.betweenMinutes + (agreement.foodPreference === 'meal' ? 75 : 50);
    return knownCost <= agreement.budgetHardMax && travelFits && duration <= agreement.durationMax;
  });

  const base = viable.map((pair) => buildPlan(pair, agreement, 0, 'Best overall fit'));
  const bestOverall = [...base].sort((a, b) => b.score - a.score)[0];
  const easiest = [...base].sort((a, b) => Math.max(...a.travel.map((item) => item.minutes)) - Math.max(...b.travel.map((item) => item.minutes)))[0];
  const bestValue = [...base].sort((a, b) => a.knownCost - b.knownCost)[0];
  const selections: OutingPlan[] = [];

  const add = (plan: OutingPlan | undefined, label: OutingPlan['label']) => {
    if (!plan || selections.some((item) => item.title === plan.title)) return;
    selections.push({ ...plan, id: crypto.randomUUID(), rank: selections.length + 1, label });
  };
  add(bestOverall, 'Best overall fit');
  add(easiest, 'Easiest commute');
  add(bestValue, 'Best value');

  for (const plan of [...base].sort((a, b) => b.score - a.score)) {
    if (selections.length >= 3) break;
    const label: OutingPlan['label'] = selections.length === 1 ? 'Easiest commute' : selections.length === 2 ? 'Best value' : 'Best overall fit';
    add(plan, label);
  }

  return selections;
}

export function buildInventoryConflict(participants: ParticipantRecord[], agreement: GroupAgreement): ConflictSuggestion {
  const tightTravel = [...participants].sort((a, b) => a.travelMaxMinutes - b.travelMaxMinutes)[0];
  if (tightTravel && tightTravel.travelMaxMinutes < 60) {
    return {
      kind: 'travel',
      title: 'Five more travel minutes could unlock plans',
      description: `${tightTravel.displayName} has the tightest journey limit. Increasing it from ${tightTravel.travelMaxMinutes} to ${tightTravel.travelMaxMinutes + 5} minutes may open better shared areas.`,
      affectedParticipantIds: [tightTravel.id],
      proposedChanges: { participantId: tightTravel.id, travelMaxMinutes: tightTravel.travelMaxMinutes + 5 },
    };
  }
  return {
    kind: 'inventory',
    title: 'No honest match yet',
    description: `No available activity-and-food pairing fits the group’s known-cost ceiling of ₹${agreement.budgetHardMax.toLocaleString('en-IN')} and current travel limits.`,
    affectedParticipantIds: participants.map((participant) => participant.id),
    proposedChanges: { regenerate: true },
  };
}
