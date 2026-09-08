import type { ActivityCategory, CandidatePair, GroupAgreement, ParticipantRecord, TravelMode, Venue } from '../outly-types';
import { runtimeValue } from './runtime';

const DELHI_CENTER = { latitude: 28.6139, longitude: 77.209 };

export const DELHI_ORIGINS = [
  { placeId: 'preview:cp', label: 'Connaught Place, New Delhi', lat: 28.6315, lng: 77.2167 },
  { placeId: 'preview:hauz-khas', label: 'Hauz Khas, New Delhi', lat: 28.5494, lng: 77.2001 },
  { placeId: 'preview:saket', label: 'Saket, New Delhi', lat: 28.5245, lng: 77.2066 },
  { placeId: 'preview:rajouri', label: 'Rajouri Garden, New Delhi', lat: 28.6422, lng: 77.1176 },
  { placeId: 'preview:dwarka', label: 'Dwarka Sector 10, New Delhi', lat: 28.5811, lng: 77.0575 },
  { placeId: 'preview:noida-18', label: 'Sector 18, Noida', lat: 28.5706, lng: 77.326 },
  { placeId: 'preview:cyberhub', label: 'Cyber Hub, Gurugram', lat: 28.495, lng: 77.089 },
  { placeId: 'preview:rohini', label: 'Rohini Sector 9, Delhi', lat: 28.7166, lng: 77.1171 },
];

const AREAS = [
  { name: 'Connaught Place', lat: 28.6315, lng: 77.2167 },
  { name: 'Lodhi–India Gate', lat: 28.5933, lng: 77.2197 },
  { name: 'Hauz Khas–Siri Fort', lat: 28.5526, lng: 77.2151 },
  { name: 'Saket', lat: 28.5245, lng: 77.2066 },
  { name: 'Cyber Hub', lat: 28.495, lng: 77.089 },
  { name: 'Noida Sector 18', lat: 28.5706, lng: 77.326 },
];

const NGMA_IMAGE = 'https://s7ap1.scene7.com/is/image/incredibleindia/national-gallery-of-modern-art-delhi-1-blog-art-body?qlt=82&ts=1742170444219';

const fallbackVenues: Venue[] = [
  venue('ngma', 'activity', 'National Gallery of Modern Art', 'Lodhi–India Gate', 28.6101, 77.2347, ['arts'], null, null, 'https://ngmaindia.gov.in/', 'https://www.google.com/maps/search/?api=1&query=National+Gallery+of+Modern+Art+Delhi', NGMA_IMAGE, 120, 4.5, 14500),
  venue('lodhi-garden', 'activity', 'Lodhi Garden walk', 'Lodhi–India Gate', 28.5931, 77.2197, ['sports', 'arts'], 0, 0, null, 'https://www.google.com/maps/search/?api=1&query=Lodhi+Garden+Delhi', null, 90, 4.5, 52000),
  venue('mystery-rooms-cp', 'activity', 'Mystery Rooms', 'Connaught Place', 28.635, 77.2204, ['games'], null, null, 'https://mysteryrooms.in/', 'https://www.google.com/maps/search/?api=1&query=Mystery+Rooms+Connaught+Place', null, 75, 4.4, 2600),
  venue('siri-fort-sports', 'activity', 'Siri Fort Sports Complex', 'Hauz Khas–Siri Fort', 28.5521, 77.2188, ['sports'], null, null, 'https://dda.gov.in/', 'https://www.google.com/maps/search/?api=1&query=Siri+Fort+Sports+Complex', null, 90, 4.4, 7800),
  venue('museo-camera', 'activity', 'Museo Camera', 'Cyber Hub', 28.4687, 77.061, ['arts'], null, null, 'https://www.museocamera.org/', 'https://www.google.com/maps/search/?api=1&query=Museo+Camera+Gurugram', null, 100, 4.6, 2400),
  venue('piano-man', 'activity', 'The Piano Man', 'Hauz Khas–Siri Fort', 28.559, 77.206, ['nightlife'], null, null, 'https://thepianoman.in/', 'https://www.google.com/maps/search/?api=1&query=The+Piano+Man+New+Delhi', null, 120, 4.4, 6300),
  venue('cafe-lota', 'dining', 'Cafe Lota', 'Lodhi–India Gate', 28.613, 77.242, [], 700, 1100, 'https://www.cafelota.com/', 'https://www.google.com/maps/search/?api=1&query=Cafe+Lota+Delhi', null, 75, 4.4, 9300, ['vegetarian']),
  venue('indian-coffee-house', 'dining', 'Indian Coffee House', 'Connaught Place', 28.6322, 77.2161, [], 300, 600, null, 'https://www.google.com/maps/search/?api=1&query=Indian+Coffee+House+Connaught+Place', null, 60, 4.1, 15500, ['vegetarian']),
  venue('burma-burma', 'dining', 'Burma Burma', 'Connaught Place', 28.6312, 77.2207, [], 900, 1500, 'https://burmaburma.in/', 'https://www.google.com/maps/search/?api=1&query=Burma+Burma+Connaught+Place', null, 80, 4.5, 8900, ['vegetarian', 'pure_veg']),
  venue('carnatic-cafe', 'dining', 'Carnatic Cafe', 'Hauz Khas–Siri Fort', 28.5487, 77.1967, [], 450, 750, 'https://carnaticcafe.com/', 'https://www.google.com/maps/search/?api=1&query=Carnatic+Cafe+Greater+Kailash', null, 70, 4.5, 12900, ['vegetarian', 'pure_veg']),
  venue('social-hauz-khas', 'dining', 'Hauz Khas Social', 'Hauz Khas–Siri Fort', 28.5543, 77.1948, [], 900, 1500, 'https://socialoffline.in/', 'https://www.google.com/maps/search/?api=1&query=Hauz+Khas+Social', null, 80, 4.3, 37000),
  venue('olly-cyberhub', 'dining', 'Olly', 'Cyber Hub', 28.4944, 77.0891, [], 800, 1400, 'https://www.olly.co.in/', 'https://www.google.com/maps/search/?api=1&query=Olly+CyberHub+Gurugram', null, 75, 4.3, 4200, ['vegetarian']),
];

function venue(id: string, kind: Venue['kind'], name: string, area: string, lat: number, lng: number, categories: ActivityCategory[], priceMin: number | null, priceMax: number | null, websiteUrl: string | null, googleMapsUrl: string, imageUrl: string | null, durationMinutes: number, rating: number, ratingCount: number, dietary: string[] = []): Venue {
  return {
    id: `preview:${id}`,
    placeId: `preview:${id}`,
    kind,
    name,
    primaryType: null,
    address: `${area}, Delhi NCR`,
    area,
    lat,
    lng,
    rating,
    ratingCount,
    priceLevel: null,
    priceMin,
    priceMax,
    durationMinutes,
    categories,
    dietary,
    openingPeriods: [],
    imageUrl,
    websiteUrl,
    googleMapsUrl,
    bookingUrl: null,
    source: 'outly_fallback',
    dietaryVerified: dietary.length > 0,
  };
}

function haversine(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const radians = (value: number) => value * Math.PI / 180;
  const dLat = radians(b.lat - a.lat);
  const dLng = radians(b.lng - a.lng);
  const first = radians(a.lat);
  const second = radians(b.lat);
  const value = Math.sin(dLat / 2) ** 2 + Math.cos(first) * Math.cos(second) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value));
}

function previewMinutes(origin: { lat: number; lng: number }, destination: { lat: number; lng: number }, mode: TravelMode) {
  const speed = mode === 'drive' ? 24 : 18;
  return Math.max(8, Math.round(haversine(origin, destination) / speed * 60 + (mode === 'drive' ? 6 : 10)));
}

function moneyValue(value: unknown): number | null {
  if (!value || typeof value !== 'object') return null;
  const money = value as { units?: string | number; nanos?: number };
  const units = Number(money.units ?? 0);
  const nanos = Number(money.nanos ?? 0) / 1_000_000_000;
  return Number.isFinite(units + nanos) ? Math.round(units + nanos) : null;
}

function categoryQuery(category: Exclude<ActivityCategory, 'anything'>) {
  if (category === 'games') return 'bowling escape room arcade gaming';
  if (category === 'sports') return 'sports activity pickleball skating adventure';
  if (category === 'arts') return 'art museum pottery workshop cultural experience';
  return 'live music club nightlife';
}

function placeToVenue(place: Record<string, any>, kind: Venue['kind'], area: string, categories: ActivityCategory[]): Venue | null {
  const location = place.location as { latitude?: number; longitude?: number } | undefined;
  if (!place.id || !location?.latitude || !location?.longitude) return null;
  const startPrice = moneyValue(place.priceRange?.startPrice);
  const endPrice = moneyValue(place.priceRange?.endPrice);
  const mapsUrl = place.googleMapsLinks?.placeUri ?? place.googleMapsUri ?? `https://www.google.com/maps/search/?api=1&query_place_id=${encodeURIComponent(place.id)}`;
  return {
    id: `google:${place.id}`,
    placeId: place.id,
    kind,
    name: place.displayName?.text ?? 'Unnamed venue',
    primaryType: place.primaryType ?? null,
    address: place.formattedAddress ?? area,
    area,
    lat: location.latitude,
    lng: location.longitude,
    rating: typeof place.rating === 'number' ? place.rating : null,
    ratingCount: typeof place.userRatingCount === 'number' ? place.userRatingCount : null,
    priceLevel: place.priceLevel ?? null,
    priceMin: kind === 'dining' ? startPrice : null,
    priceMax: kind === 'dining' ? endPrice ?? startPrice : null,
    durationMinutes: kind === 'activity' ? 90 : 75,
    categories,
    dietary: place.servesVegetarianFood ? ['vegetarian'] : [],
    openingPeriods: place.regularOpeningHours?.periods ?? [],
    imageUrl: place.photos?.[0]?.name ? `/api/places/photo?name=${encodeURIComponent(place.photos[0].name)}` : null,
    websiteUrl: place.websiteUri ?? null,
    googleMapsUrl: mapsUrl,
    bookingUrl: null,
    source: 'google_places',
    dietaryVerified: Boolean(place.servesVegetarianFood),
    photoAttributions: (place.photos?.[0]?.authorAttributions ?? []).map((item: Record<string, unknown>) => ({ displayName: String(item.displayName ?? 'Photo contributor'), uri: typeof item.uri === 'string' ? item.uri : null })),
  };
}

export async function hydrateVenueDetails(items: Array<{ placeId: string; kind: Venue['kind']; area: string; categories: ActivityCategory[] }>) {
  const key = runtimeValue('GOOGLE_MAPS_API_KEY');
  if (!key) throw new Error('Live venue details are not configured.');
  const venues = await Promise.all(items.map(async (item) => {
    const response = await fetch(`https://places.googleapis.com/v1/places/${encodeURIComponent(item.placeId)}`, {
      headers: {
        'X-Goog-Api-Key': key,
        'X-Goog-FieldMask': 'id,displayName,formattedAddress,location,rating,userRatingCount,priceLevel,priceRange,regularOpeningHours,photos,websiteUri,googleMapsUri,googleMapsLinks,primaryType,servesVegetarianFood',
      },
    });
    if (!response.ok) throw new Error(`Place details failed (${response.status})`);
    return placeToVenue(await response.json() as Record<string, unknown>, item.kind, item.area, item.categories);
  }));
  return venues.filter((venue): venue is Venue => Boolean(venue));
}

async function textSearch(query: string, kind: Venue['kind'], area: string, categories: ActivityCategory[]) {
  const key = runtimeValue('GOOGLE_MAPS_API_KEY');
  if (!key) return [];
  const response = await fetch('https://places.googleapis.com/v1/places:searchText', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': key,
      'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.location,places.rating,places.userRatingCount,places.priceLevel,places.priceRange,places.regularOpeningHours,places.photos,places.websiteUri,places.googleMapsUri,places.googleMapsLinks,places.primaryType,places.servesVegetarianFood',
    },
    body: JSON.stringify({ textQuery: query, maxResultCount: 5, languageCode: 'en', regionCode: 'IN' }),
  });
  if (!response.ok) throw new Error(`Places search failed (${response.status})`);
  const payload = await response.json() as { places?: Record<string, any>[] };
  return (payload.places ?? []).map((place) => placeToVenue(place, kind, area, categories)).filter((place): place is Venue => Boolean(place));
}

export async function autocompleteOrigins(query: string) {
  const normalized = query.trim();
  if (normalized.length < 2) return [];
  const key = runtimeValue('GOOGLE_MAPS_API_KEY');
  if (!key) return DELHI_ORIGINS.filter((origin) => origin.label.toLowerCase().includes(normalized.toLowerCase())).slice(0, 6);
  const response = await fetch('https://places.googleapis.com/v1/places:autocomplete', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Goog-Api-Key': key },
    body: JSON.stringify({
      input: normalized,
      includedRegionCodes: ['in'],
      locationBias: { circle: { center: DELHI_CENTER, radius: 90000 } },
      languageCode: 'en',
      regionCode: 'IN',
    }),
  });
  if (!response.ok) throw new Error(`Places autocomplete failed (${response.status})`);
  const payload = await response.json() as { suggestions?: Array<{ placePrediction?: { placeId?: string; text?: { text?: string } } }> };
  return (payload.suggestions ?? []).map((suggestion) => ({
    placeId: suggestion.placePrediction?.placeId ?? '',
    label: suggestion.placePrediction?.text?.text ?? '',
    lat: null,
    lng: null,
  })).filter((suggestion) => suggestion.placeId && suggestion.label).slice(0, 6);
}

export async function resolveOrigin(placeId: string | null | undefined, label: string) {
  const key = runtimeValue('GOOGLE_MAPS_API_KEY');
  if (!key) {
    const preview = DELHI_ORIGINS.find((origin) => origin.placeId === placeId);
    if (!preview) throw new Error('Choose a starting location from the suggestions.');
    return { lat: preview.lat, lng: preview.lng, label: preview.label, placeId: preview.placeId };
  }
  if (!placeId || placeId.startsWith('preview:')) throw new Error('Choose your starting location again from the live suggestions.');
  const response = await fetch(`https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}`, {
    headers: { 'X-Goog-Api-Key': key, 'X-Goog-FieldMask': 'id,displayName,formattedAddress,location' },
  });
  if (!response.ok) throw new Error(`Place details failed (${response.status})`);
  const place = await response.json() as { id?: string; formattedAddress?: string; location?: { latitude?: number; longitude?: number } };
  if (!Number.isFinite(place.location?.latitude) || !Number.isFinite(place.location?.longitude)) throw new Error('That location could not be located. Choose another suggestion.');
  if (haversine({ lat: place.location!.latitude!, lng: place.location!.longitude! }, { lat: DELHI_CENTER.latitude, lng: DELHI_CENTER.longitude }) > 100) throw new Error('The pilot currently supports starting locations within Delhi NCR.');
  return {
    lat: place.location!.latitude!,
    lng: place.location!.longitude!,
    label: place.formattedAddress ?? label,
    placeId: place.id ?? placeId,
  };
}

function rankedAreas(participants: ParticipantRecord[]) {
  const located = participants.filter((participant) => participant.originLat !== null && participant.originLng !== null);
  const center = located.length ? {
    lat: located.reduce((sum, participant) => sum + (participant.originLat ?? 0), 0) / located.length,
    lng: located.reduce((sum, participant) => sum + (participant.originLng ?? 0), 0) / located.length,
  } : { lat: DELHI_CENTER.latitude, lng: DELHI_CENTER.longitude };
  return [...AREAS].sort((a, b) => haversine(center, a) - haversine(center, b)).slice(0, 3);
}

export async function discoverVenues(participants: ParticipantRecord[], agreement: GroupAgreement) {
  const key = runtimeValue('GOOGLE_MAPS_API_KEY');
  if (!key) return { venues: fallbackVenues, mode: 'preview' as const };
  const categories = agreement.rankedActivities.slice(0, 2).map((item) => item.category);
  const requestedCategories = categories.length ? categories : ['games' as const];
  const areas = rankedAreas(participants);
  const dietaryPhrase = agreement.dietary.includes('pure_veg') ? 'pure vegetarian' : agreement.dietary.includes('vegetarian') ? 'vegetarian friendly' : '';
  try {
    const searches = areas.flatMap((area) => [
      ...requestedCategories.map((category) => textSearch(`${categoryQuery(category)} in ${area.name}, Delhi NCR`, 'activity', area.name, [category])),
      textSearch(`${agreement.foodPreference === 'meal' ? 'restaurant' : 'cafe juice desserts'} ${dietaryPhrase} in ${area.name}, Delhi NCR`, 'dining', area.name, []),
    ]);
    const results = (await Promise.all(searches)).flat();
    const unique = [...new Map(results.map((venue) => [venue.placeId, venue])).values()];
    return { venues: unique, mode: 'live' as const };
  } catch {
    throw new Error('Venue search is temporarily unavailable. Your agreement is saved; try generating plans again shortly.');
  }
}

async function routeMatrix(participants: ParticipantRecord[], destinations: Venue[], mode: TravelMode, departureTime: string) {
  const key = runtimeValue('GOOGLE_MAPS_API_KEY');
  if (!key) return null;
  if (!participants.length || !destinations.length) return [];
  // Keep transit requests below 100 elements; preserve indexes across chunks.
  const chunkSize = Math.max(1, Math.floor(100 / participants.length));
  if (destinations.length > chunkSize) {
    const output: Array<{ originIndex?: number; destinationIndex?: number; duration?: string; condition?: string }> = [];
    for (let offset = 0; offset < destinations.length; offset += chunkSize) {
      const chunk = await routeMatrix(participants, destinations.slice(offset, offset + chunkSize), mode, departureTime);
      output.push(...(chunk ?? []).map((element) => ({ ...element, destinationIndex: element.destinationIndex === undefined ? undefined : element.destinationIndex + offset })));
    }
    return output;
  }
  const origins = participants.map((participant) => ({ waypoint: { location: { latLng: { latitude: participant.originLat, longitude: participant.originLng } } } }));
  const destinationPayload = destinations.map((destination) => ({ waypoint: { location: { latLng: { latitude: destination.lat, longitude: destination.lng } } } }));
  const body: Record<string, unknown> = {
    origins,
    destinations: destinationPayload,
    travelMode: mode === 'drive' ? 'DRIVE' : 'TRANSIT',
    departureTime,
    languageCode: 'en-IN',
    regionCode: 'IN',
    units: 'METRIC',
  };
  if (mode === 'drive') body.routingPreference = 'TRAFFIC_AWARE';
  const response = await fetch('https://routes.googleapis.com/distanceMatrix/v2:computeRouteMatrix', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': key,
      'X-Goog-FieldMask': 'originIndex,destinationIndex,duration,status,condition',
    },
    body: JSON.stringify(body),
  });
  if (!response.ok) throw new Error(`Routes matrix failed (${response.status})`);
  return await response.json() as Array<{ originIndex?: number; destinationIndex?: number; duration?: string; condition?: string }>;
}

function departureIso(date: string, agreement: GroupAgreement) {
  const hour = agreement.selectedTimeWindow === 'morning' ? 8 : agreement.selectedTimeWindow === 'lunch' ? 11 : agreement.selectedTimeWindow === 'afternoon' ? 15 : agreement.selectedTimeWindow === 'late' ? 20 : 18;
  return new Date(`${date}T${String(hour).padStart(2, '0')}:30:00+05:30`).toISOString();
}

export async function pairCandidates(venues: Venue[], participants: ParticipantRecord[], agreement: GroupAgreement): Promise<CandidatePair[]> {
  const activities = venues.filter((venue) => venue.kind === 'activity');
  const dining = venues.filter((venue) => venue.kind === 'dining');
  const pairs = activities.flatMap((activity) => [...dining].sort((a, b) => haversine(activity, a) - haversine(activity, b)).slice(0, 2).map((restaurant) => ({ activity, dining: restaurant })));
  const uniqueActivities = [...new Map(pairs.map((pair) => [pair.activity.placeId, pair.activity])).values()];
  const date = agreement.selectedDate ?? new Date(Date.now() + 86400000).toISOString().slice(0, 10);
  const departure = departureIso(date, agreement);
  const travelLookup = new Map<string, number>();
  const liveRoutes = Boolean(runtimeValue('GOOGLE_MAPS_API_KEY'));
  const betweenLookup = new Map<string, number[]>();

  try {
    for (const mode of ['drive', 'transit'] as const) {
      const group = participants.filter((participant) => participant.travelMode === mode && participant.originLat !== null && participant.originLng !== null);
      if (!group.length) continue;
      const matrix = await routeMatrix(group, uniqueActivities, mode, departure);
      if (!matrix) continue;
      matrix.forEach((element) => {
        if (element.condition !== 'ROUTE_EXISTS' || element.originIndex === undefined || element.destinationIndex === undefined) return;
        const seconds = Number(element.duration?.replace('s', '') ?? NaN);
        if (!Number.isFinite(seconds) || seconds < 0 || !group[element.originIndex] || !uniqueActivities[element.destinationIndex]) return;
        travelLookup.set(`${group[element.originIndex].id}:${uniqueActivities[element.destinationIndex].placeId}`, Math.max(1, Math.ceil(seconds / 60)));
      });
      if (liveRoutes) {
        for (const activity of uniqueActivities) {
          const stops = pairs.filter((pair) => pair.activity.placeId === activity.placeId).map((pair) => pair.dining);
          const from = { ...group[0], originLat: activity.lat, originLng: activity.lng };
          const transferTime = new Date(new Date(departure).getTime() + (activity.durationMinutes ?? 90) * 60000).toISOString();
          const transfers = await routeMatrix([from], stops, mode, transferTime);
          stops.forEach((stop, index) => {
            const element = transfers?.find((item) => item.destinationIndex === index && item.condition === 'ROUTE_EXISTS');
            const seconds = Number(element?.duration?.replace('s', '') ?? NaN);
            const key = `${activity.placeId}:${stop.placeId}`;
            betweenLookup.set(key, [...(betweenLookup.get(key) ?? []), Number.isFinite(seconds) ? Math.ceil(seconds / 60) : Infinity]);
          });
        }
      }
    }
  } catch {
    throw new Error('Travel estimates are temporarily unavailable. Your agreement is saved; retry before choosing a plan.');
  }

  return pairs.map((pair) => ({
    ...pair,
    betweenMinutes: liveRoutes ? Math.max(...(betweenLookup.get(`${pair.activity.placeId}:${pair.dining.placeId}`) ?? [Infinity])) : Math.max(5, ...participants.map((person) => previewMinutes(pair.activity, pair.dining, person.travelMode))),
    travel: participants.map((participant) => ({
      participantId: participant.id,
      participantName: participant.displayName,
      mode: participant.travelMode,
      minutes: travelLookup.get(`${participant.id}:${pair.activity.placeId}`) ?? (liveRoutes ? Infinity : previewMinutes({ lat: participant.originLat ?? DELHI_CENTER.latitude, lng: participant.originLng ?? DELHI_CENTER.longitude }, pair.activity, participant.travelMode)),
      estimated: !liveRoutes,
    })),
  }));
}

export function googleApiAvailable() {
  return Boolean(runtimeValue('GOOGLE_MAPS_API_KEY'));
}
