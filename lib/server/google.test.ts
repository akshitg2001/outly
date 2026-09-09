import { afterEach, describe, expect, it, vi } from 'vitest';
import { autocompleteOrigins, discoverVenues, hydrateVenueDetails, pairCandidates, PILOT_AREAS, resolveOrigin } from './google';
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
  it('includes the expanded Delhi NCR planning areas', () => {
    expect(PILOT_AREAS.map((area) => area.name)).toEqual(expect.arrayContaining([
      'Khan Market', 'Aerocity', 'Greater Kailash', 'Vasant Kunj', 'Defence Colony', 'Nehru Place',
      'Gurugram Sector 29', 'Golf Course Road, Gurugram', 'Noida Sector 62', 'Noida Sector 104',
    ]));
  });

  it('uses every participant origin to rank areas and searches every category when all are open', async () => {
    const requests: Array<{ url: string; body: Record<string, any> }> = [];
    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input); const body = JSON.parse(String(init?.body ?? '{}'));
      requests.push({ url, body });
      return Response.json(url.includes('routes.googleapis.com') ? [] : { places: [] });
    }));
    const people = [{ ...person, activities: ['anything'] as ParticipantRecord['activities'] }, { ...person, id: 'b', activities: ['anything'] as ParticipantRecord['activities'] }];
    await discoverVenues(people, aggregatePreferences(people, person.acceptableDates));
    const areaRequest = requests.find((request) => request.url.includes('routes.googleapis.com'));
    expect(areaRequest?.body.origins).toHaveLength(2);
    expect(areaRequest?.body.destinations).toHaveLength(PILOT_AREAS.length);
    const queries = requests.filter((request) => request.body.textQuery).map((request) => request.body.textQuery).join(' | ');
    expect(queries).toContain('bowling escape room');
    expect(queries).toContain('sports activity');
    expect(queries).toContain('art museum');
    expect(queries).toContain('live music club');
    expect(requests.filter((request) => request.body.maxResultCount === 10)).toHaveLength(10);
  });

  it('removes weakly reviewed restaurants from the expanded discovery pool', async () => {
    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input); const body = JSON.parse(String(init?.body ?? '{}'));
      if (url.includes('routes.googleapis.com')) return Response.json([]);
      if (!String(body.textQuery ?? '').match(/restaurant|cafe|snacks|rooftop/)) return Response.json({ places: [] });
      const base = { formattedAddress: 'Delhi', location: { latitude: 28.6, longitude: 77.2 }, regularOpeningHours: { periods: [] } };
      return Response.json({ places: [
        { ...base, id: 'strong', displayName: { text: 'Strong choice' }, rating: 4.5, userRatingCount: 1200 },
        { ...base, id: 'weak', displayName: { text: 'Weak choice' }, rating: 3.5, userRatingCount: 20 },
      ] });
    }));
    const result = await discoverVenues([person, { ...person, id: 'b' }], agreement);
    expect(result.venues.map((item) => item.placeId)).toContain('strong');
    expect(result.venues.map((item) => item.placeId)).not.toContain('weak');
  });

  it('keeps the live autocomplete bias within Google’s 50 km limit', async () => {
    let requestBody = '';
    const fetchMock = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      requestBody = String(init?.body ?? '');
      return Response.json({ suggestions: [] });
    });
    vi.stubGlobal('fetch', fetchMock);
    await autocompleteOrigins('Saket Delhi');
    const request = JSON.parse(requestBody);
    expect(request.locationBias.circle.radius).toBe(50000);
  });

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
  it('returns required photo author attribution with refreshed place details', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => Response.json({ id: 'abc', displayName: { text: 'Venue' }, formattedAddress: 'Delhi', location: { latitude: 28.6, longitude: 77.2 }, photos: [{ name: 'places/abc/photos/one', authorAttributions: [{ displayName: 'Contributor', uri: 'https://example.com/profile' }] }] })));
    const result = await hydrateVenueDetails([{ placeId: 'abc', kind: 'activity', area: 'Delhi', categories: ['arts'] }]);
    expect(result[0].photoAttributions).toEqual([{ displayName: 'Contributor', uri: 'https://example.com/profile' }]);
  });
});
