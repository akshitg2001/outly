import { describe, expect, it } from 'vitest';
import { aggregatePreferences, buildInventoryConflict, inferMealLabel, roundBudgetHardMax, selectPlans } from './recommendation';
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

  it('detects incompatible time and duration ranges', () => {
    const timeConflict = aggregatePreferences([participant({ timeWindows: ['morning'] }), participant({ timeWindows: ['late'] })], [dateA]);
    expect(timeConflict.conflict?.kind).toBe('time');
    const durationConflict = aggregatePreferences([participant({ durationBand: 'quick' }), participant({ durationBand: 'extended' })], [dateA]);
    expect(durationConflict.conflict?.kind).toBe('duration');
  });
});

describe('plan safeguards', () => {
  it('never rounds above the 15% hard ceiling', () => { expect(roundBudgetHardMax(3000)).toBe(3450); expect(roundBudgetHardMax(301)).toBe(346); });
  it('infers meal language from the chosen time', () => { expect(inferMealLabel('evening', 'meal')).toBe('Dinner'); expect(inferMealLabel('morning', 'meal')).toBe('Breakfast'); expect(inferMealLabel('late', 'snacks')).toBe('Late bites & drinks'); });

  it('filters over-budget and over-travel candidates before ranking', () => {
    const people = [participant({ id: 'a', travelMaxMinutes: 35, durationBand: 'quick' }), participant({ id: 'b', travelMaxMinutes: 35, durationBand: 'quick' })];
    const agreement = aggregatePreferences(people, [dateA]);
    const plans = selectPlans([pair('good', people, 32, 1200), pair('far', people, 50, 900), pair('pricey', people, 20, 2600)], people, agreement);
    expect(plans).toHaveLength(1);
    expect(plans[0].title).toContain('good');
    expect(plans[0].hasUnknownActivityCost).toBe(true);
  });

  it('proposes a five-minute travel relaxation when inventory cannot fit', () => {
    const people = [participant({ id: 'a', displayName: 'Mira', travelMaxMinutes: 25, durationBand: 'quick' }), participant({ id: 'b', travelMaxMinutes: 45, durationBand: 'quick' })];
    const conflict = buildInventoryConflict(people, aggregatePreferences(people, [dateA]), [pair('near', people, 28, 900)]);
    expect(conflict.kind).toBe('travel');
    expect(conflict.affectedParticipantIds).toEqual(['a']);
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

  it('checks dietary restrictions and both ends of the duration range', () => {
    const people = [participant({ durationBand: 'quick', dietary: ['pure_veg'] }), participant({ durationBand: 'quick' })];
    const candidate = pair('veg', people, 20, 900);
    expect(selectPlans([candidate], people, aggregatePreferences(people, [dateA]))).toHaveLength(0);
    candidate.dining.dietary = ['pure_veg']; candidate.dining.dietaryVerified = true;
    expect(selectPlans([candidate], people, aggregatePreferences(people, [dateA]))).toHaveLength(1);
    const extended = people.map((person) => ({ ...person, durationBand: 'extended' as const, timeWindows: ['afternoon', 'evening', 'late'] as const as unknown as ParticipantRecord['timeWindows'] }));
    expect(selectPlans([candidate], extended, aggregatePreferences(extended, [dateA]))).toHaveLength(0);
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
});
