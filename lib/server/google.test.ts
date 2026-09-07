import { afterEach, describe, expect, it, vi } from 'vitest';
import { discoverVenues, pairCandidates, resolveOrigin } from './google';
import { aggregatePreferences } from '../recommendation';
import type { ParticipantRecord, Venue } from '../outly-types';

vi.mock('./runtime', () => ({ runtimeValue: () => 'test-key' }));
afterEach(() => { vi.unstubAllGlobals(); });

const person: ParticipantRecord = {
  id: 'a', groupId: 'g', displayName: 'Test', originLabel: 'Delhi', originPlaceId: 'abc', originLat: 28.63, originLng: 77.21,
  travelMode: 'transit', travelMaxMinutes: 35, budgetTarget: 2000, budgetHardMax: 2300, acceptableDates: ['2026-09-20'], timeWindows: ['evening'],
  activities: ['games'], foodPreference: 'meal', dietary: [], durationBand: 'quick', submittedAt: 1, updatedAt: 1,
};
const agreement = aggregatePreferences([person, { ...person, id: 'b' }], person.acceptableDates);
const venue: Venue = { id: 'v', placeId: 'v', kind: 'activity', name: 'Test venue', primaryType: null, address: 'Delhi', area: 'Delhi',
  lat: 28.64, lng: 77.22, rating: null, ratingCount: null, priceLevel: null, priceMin: null, priceMax: null, durationMinutes: 90,
  categories: ['games'], dietary: [], openingPeriods: [], imageUrl: null, websiteUrl: null, googleMapsUrl: 'https://maps.google.com', bookingUrl: null, source: 'google_places', dietaryVerified: false };

describe('live data failures', () => {
  it('does not substitute sample venues on a failed Places request', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('{}', { status: 503 })));
    await expect(discoverVenues([person], agreement)).rejects.toThrow('temporarily unavailable');
  });
  it('keeps a small live result set without filling it with preview venues', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => Response.json({ places: [] })));
    const result = await discoverVenues([person], agreement);
    expect(result).toEqual({ venues: [], mode: 'live' });
  });
  it('does not substitute straight-line travel after a Routes failure', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('{}', { status: 503 })));
    await expect(pairCandidates([venue, { ...venue, id: 'd', placeId: 'd', kind: 'dining' }], [person], agreement)).rejects.toThrow('temporarily unavailable');
  });
  it('keeps a missing route infeasible instead of marking an estimate as live', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => Response.json([{ originIndex: 0, destinationIndex: 0, condition: 'ROUTE_NOT_FOUND' }])));
    const pairs = await pairCandidates([venue, { ...venue, id: 'd', placeId: 'd', kind: 'dining' }], [person], agreement);
    expect(pairs[0].travel[0].minutes).toBe(Infinity);
  });
  it('rejects an unselected location and location results missing coordinates', async () => {
    await expect(resolveOrigin(null, 'Anywhere')).rejects.toThrow('suggestions');
    vi.stubGlobal('fetch', vi.fn(async () => Response.json({ id: 'abc' })));
    await expect(resolveOrigin('abc', 'Delhi')).rejects.toThrow('could not be located');
  });
});
