import { describe, expect, it } from 'vitest';
import { aggregatePreferences, buildInventoryConflict, inferMealLabel, planningTimeWindows, rankViablePlans, roundBudgetHardMax, selectPlans, withDiningAlternatives } from './recommendation';
import type { CandidatePair, ParticipantRecord, Venue } from './outly-types';

const dateA = '2026-09-19';
const dateB = '2026-09-20';

function participant(overrides: Partial<ParticipantRecord> = {}): ParticipantRecord {
  return {
    id: overrides.id ?? crypto.randomUUID(), groupId: 'group-1', displayName: overrides.displayName ?? 'Aarav', originLabel: 'Connaught Place', originPlaceId: 'preview:cp', originLat: 28.63, originLng: 77.21,
    travelMode: 'drive', travelMaxMinutes: 35, budgetTarget: 2000, budgetHardMax: 2300, acceptableDates: [dateA, dateB], timeWindows: ['evening'], activities: ['games'],
    foodPreference: 'meal', dietary: [], durationBand: 'standard', submittedAt: 1, updatedAt: 1, ...overrides,
  };
}

function venue(id: string, kind: Venue['kind'], priceMax: number | null, category: Venue['categories'] = []): Venue {
  return { id, placeId: id, kind, name: id, primaryType: null, address: 'Delhi', area: id.includes('south') ? 'South Delhi' : 'Connaught Place', lat: 28.63, lng: 77.21, rating: 4.5, ratingCount: 1000, priceLevel: null,
    priceMin: priceMax === null ? null : Math.max(0, priceMax - 300), priceMax, durationMinutes: kind === 'activity' ? 90 : 75, categories: category, dietary: [], openingPeriods: [], imageUrl: null,
    websiteUrl: null, googleMapsUrl: 'https://www.google.com/maps', bookingUrl: null, source: 'outly_fallback', dietaryVerified: false };
}

function pair(id: string, people: ParticipantRecord[], travelMinutes: number, diningCost: number): CandidatePair {
  return { activity: venue(`activity-${id}`, 'activity', null, ['games']), dining: venue(`dining-${id}`, 'dining', diningCost), betweenMinutes: 8,
    travel: people.map((person) => ({ participantId: person.id, participantName: person.displayName, mode: person.travelMode, minutes: travelMinutes, estimated: true })) };
}

describe('group preference aggregation', () => {
  it('uses the strictest per-person budget and shared availability', () => {
    const people = [participant({ id: 'a', budgetTarget: 2200, budgetHardMax: 2600 }), participant({ id: 'b', budgetTarget: 1500, budgetHardMax: 1800, acceptableDates: [dateA] })];
    const agreement = aggregatePreferences(people, [dateA, dateB]);
    expect(agreement.selectedDate).toBe(dateA);
    expect(agreement.budgetTarget).toBe(1500);
    expect(agreement.budgetHardMax).toBe(1725);
    expect(agreement.conflict).toBeNull();
  });

  it('targets only people who cannot make the most popular date', () => {
    const agreement = aggregatePreferences([participant({ id: 'a', acceptableDates: [dateA] }), participant({ id: 'b', acceptableDates: [dateB] })], [dateA, dateB]);
    expect(agreement.conflict?.kind).toBe('date');
    expect(agreement.conflict?.affectedParticipantIds).toHaveLength(1);
  });

  it('detects incompatible times while treating duration as maximum availability', () => {
    const timeConflict = aggregatePreferences([participant({ timeWindows: ['morning'] }), participant({ timeWindows: ['late'] })], [dateA]);
    expect(timeConflict.conflict?.kind).toBe('time');
    const durationAgreement = aggregatePreferences([participant({ durationBand: 'quick' }), participant({ durationBand: 'extended' })], [dateA]);
    expect(durationAgreement.conflict).toBeNull();
    expect(durationAgreement.durationMin).toBe(90);
    expect(durationAgreement.preferredDurationMin).toBe(300);
    expect(durationAgreement.durationMax).toBe(180);
  });
});

describe('plan safeguards', () => {
  it('never rounds above the 15% hard ceiling', () => { expect(roundBudgetHardMax(3000)).toBe(3450); expect(roundBudgetHardMax(301)).toBe(346); });
  it('infers meal language from the chosen time', () => { expect(inferMealLabel('evening', 'meal')).toBe('Dinner'); expect(inferMealLabel('morning', 'meal')).toBe('Breakfast'); expect(inferMealLabel('late', 'snacks')).toBe('Late bites & drinks'); });

  it('evaluates every shared time window instead of silently choosing the first', () => {
    const people = [
      participant({ timeWindows: ['afternoon', 'evening', 'late'], durationBand: 'quick' }),
      participant({ timeWindows: ['afternoon', 'evening', 'late'], durationBand: 'quick' }),
    ];
    const agreement = aggregatePreferences(people, [dateA]);
    expect(planningTimeWindows(agreement)).toEqual(['afternoon', 'evening', 'late']);
    const [latePlan] = selectPlans([pair('late-start', people, 20, 900)], people, { ...agreement, selectedTimeWindow: 'late' });
    expect(latePlan.startTime).toBe('8:00 PM');
    expect(latePlan.timeWindow).toBe('late');
  });

  it('keeps the full viable pool available for a five-plan diversity pass', () => {
    const people = [participant({ durationBand: 'quick' }), participant({ durationBand: 'quick' })];
    const candidates = Array.from({ length: 6 }, (_, index) => pair(`option-${index}`, people, 20 + index, 700 + index * 50));
    expect(rankViablePlans(candidates, people, aggregatePreferences(people, [dateA]))).toHaveLength(6);
  });

  it('rejects an impractical activity-to-food transfer even when the total duration fits', () => {
    const people = [
      participant({ timeWindows: ['afternoon', 'evening'], durationBand: 'standard' }),
      participant({ timeWindows: ['afternoon', 'evening'], durationBand: 'standard' }),
    ];
    const candidate = pair('long-transfer', people, 20, 900);
    candidate.betweenMinutes = 40;
    expect(selectPlans([candidate], people, aggregatePreferences(people, [dateA]))).toHaveLength(0);
    candidate.betweenMinutes = 20;
    expect(selectPlans([candidate], people, aggregatePreferences(people, [dateA]))).toHaveLength(1);
  });

  it('filters over-budget and over-travel candidates before ranking', () => {
    const people = [participant({ id: 'a', travelMaxMinutes: 35, durationBand: 'quick' }), participant({ id: 'b', travelMaxMinutes: 35, durationBand: 'quick' })];
    const agreement = aggregatePreferences(people, [dateA]);
    const plans = selectPlans([pair('good', people, 32, 1200), pair('far', people, 50, 900), pair('pricey', people, 20, 2600)], people, agreement);
    expect(plans).toHaveLength(1);
    expect(plans[0].title).toContain('good');
    expect(plans[0].hasUnknownActivityCost).toBe(true);
  });

  it('never sends a user to an insecure venue link', () => {
    const people = [participant({ id: 'a', durationBand: 'quick' }), participant({ id: 'b', durationBand: 'quick' })];
    const candidate = pair('secure-link', people, 20, 900);
    candidate.activity.bookingUrl = 'http://tickets.example.com/book';
    candidate.activity.websiteUrl = 'http://activity.example.com';
    const [plan] = selectPlans([candidate], people, aggregatePreferences(people, [dateA]));
    expect(plan.stops[0].actionUrl).toBe('https://www.google.com/maps');
    expect(plan.stops.every((stop) => stop.actionUrl.startsWith('https://'))).toBe(true);
  });

  it('proposes a five-minute travel relaxation when inventory cannot fit', () => {
    const people = [participant({ id: 'a', displayName: 'Mira', travelMaxMinutes: 25, durationBand: 'quick' }), participant({ id: 'b', travelMaxMinutes: 45, durationBand: 'quick' })];
    const conflict = buildInventoryConflict(people, aggregatePreferences(people, [dateA]), [pair('near', people, 28, 900)]);
    expect(conflict.kind).toBe('travel');
    expect(conflict.affectedParticipantIds).toEqual(['a']);
  });

  it('widens only the people needed when venue timing is the blocker', () => {
    const people = [participant({ id: 'a', durationBand: 'standard' }), participant({ id: 'b', durationBand: 'standard' })];
    const candidate = pair('timing', people, 20, 900);
    candidate.activity.durationMinutes = 120;
    candidate.betweenMinutes = 15;
    candidate.date = dateA;
    const conflict = buildInventoryConflict(people, aggregatePreferences(people, [dateA]), [candidate]);
    expect(conflict.kind).toBe('time');
    expect(conflict.affectedParticipantIds).toEqual(['a', 'b']);
    expect(conflict.proposedChanges).toEqual({ timeExtensionMinutes: 30 });
  });

  it('offers a capped 15% budget change only to the blocking participant', () => {
    const people = [participant({ id: 'a', durationBand: 'quick' }), participant({ id: 'b', budgetTarget: 3000, budgetHardMax: 3450, durationBand: 'quick' })];
    const candidate = pair('budget', people, 20, 2500);
    candidate.date = dateA;
    const conflict = buildInventoryConflict(people, aggregatePreferences(people, [dateA]), [candidate]);
    expect(conflict.kind).toBe('budget');
    expect(conflict.affectedParticipantIds).toEqual(['a']);
    expect(conflict.proposedChanges).toEqual({ participantId: 'a', budgetCeiling: 2645 });
  });

  it('does not silently spend the five-minute travel tolerance', () => {
    const people = [participant({ travelMaxMinutes: 30, durationBand: 'quick' }), participant({ durationBand: 'quick' })];
    expect(selectPlans([pair('outside', people, 32, 900)], people, aggregatePreferences(people, [dateA]))).toHaveLength(0);
  });

  it('rejects a missing route for even one group member', () => {
    const people = [participant({ durationBand: 'quick' }), participant({ durationBand: 'quick' })];
    const candidate = pair('missing', people, 20, 900);
    candidate.travel.pop();
    expect(selectPlans([candidate], people, aggregatePreferences(people, [dateA]))).toHaveLength(0);
  });

  it('checks dietary restrictions and treats a duration band lower bound as a soft preference', () => {
    const people = [participant({ durationBand: 'quick', dietary: ['pure_veg'] }), participant({ durationBand: 'quick' })];
    const candidate = pair('veg', people, 20, 900);
    expect(selectPlans([candidate], people, aggregatePreferences(people, [dateA]))).toHaveLength(0);
    candidate.dining.dietary = ['pure_veg']; candidate.dining.dietaryVerified = true;
    expect(selectPlans([candidate], people, aggregatePreferences(people, [dateA]))).toHaveLength(1);
    const extended = people.map((person) => ({ ...person, durationBand: 'extended' as const, timeWindows: ['afternoon', 'evening', 'late'] as const as unknown as ParticipantRecord['timeWindows'] }));
    expect(selectPlans([candidate], extended, aggregatePreferences(extended, [dateA]))).toHaveLength(1);
  });

  it('prefers a longer valid plan when a group can spare extended time', () => {
    const people = [
      participant({ id: 'a', durationBand: 'extended', timeWindows: ['afternoon', 'evening'] }),
      participant({ id: 'b', durationBand: 'extended', timeWindows: ['afternoon', 'evening'] }),
    ];
    const short = pair('short', people, 10, 900);
    const long = pair('long', people, 10, 900);
    long.activity.durationMinutes = 220;
    const plans = rankViablePlans([short, long], people, aggregatePreferences(people, [dateA]));
    expect(plans).toHaveLength(2);
    expect(plans[0].title).toContain('long');
  });

  it('does not run past the shared window or use a venue after closing', () => {
    const people = [participant({ durationBand: 'quick' }), participant({ durationBand: 'quick' })];
    const candidate = pair('hours', people, 20, 900);
    candidate.activity.openingPeriods = [{ open: { day: 6, hour: 9, minute: 0 }, close: { day: 6, hour: 18, minute: 0 } }];
    expect(selectPlans([candidate], people, aggregatePreferences(people, [dateA]))).toHaveLength(0);
    candidate.activity.openingPeriods = [{ open: { day: 6, hour: 18, minute: 0 }, close: { day: 6, hour: 23, minute: 0 } }];
    const plans = selectPlans([candidate], people, aggregatePreferences(people, [dateA]));
    expect(plans[0].startTime).toBe('6:00 PM');
    expect(plans[0].endTime).toBe('8:53 PM');
    candidate.betweenMinutes = 25;
    expect(selectPlans([candidate], people, aggregatePreferences(people, [dateA]))).toHaveLength(0);
  });

  it('adds only independently feasible restaurant alternatives to one activity plan', () => {
    const people = [participant({ id: 'a', durationBand: 'quick' }), participant({ id: 'b', durationBand: 'quick' })];
    const agreement = aggregatePreferences(people, [dateA]);
    const primary = pair('primary', people, 20, 1000);
    primary.dining.primaryType = 'indian_restaurant';
    const cafe = pair('cafe', people, 20, 700);
    cafe.activity = primary.activity;
    cafe.dining.primaryType = 'cafe';
    const pizza = pair('pizza', people, 20, 900);
    pizza.activity = primary.activity;
    pizza.dining.primaryType = 'pizza_restaurant';
    const overBudget = pair('expensive', people, 20, 3000);
    overBudget.activity = primary.activity;

    const base = selectPlans([primary], people, agreement)[0];
    const expanded = withDiningAlternatives(base, [primary, cafe, pizza, overBudget], people, agreement);

    expect(expanded.diningAlternatives).toHaveLength(2);
    expect(expanded.diningAlternatives?.map((option) => option.venue.placeId)).toEqual(expect.arrayContaining(['dining-cafe', 'dining-pizza']));
    expect(expanded.diningAlternatives?.some((option) => option.venue.placeId === 'dining-expensive')).toBe(false);
  });
});
