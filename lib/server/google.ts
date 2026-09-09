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

export const PILOT_AREAS = [
  { name: 'Connaught Place', lat: 28.6315, lng: 77.2167 },
  { name: 'Lodhi–India Gate', lat: 28.5933, lng: 77.2197 },
  { name: 'Khan Market', lat: 28.6004, lng: 77.2270 },
  { name: 'Hauz Khas–Siri Fort', lat: 28.5526, lng: 77.2151 },
  { name: 'Saket', lat: 28.5245, lng: 77.2066 },
  { name: 'Greater Kailash', lat: 28.5493, lng: 77.2352 },
  { name: 'Defence Colony', lat: 28.5735, lng: 77.2302 },
  { name: 'Nehru Place', lat: 28.5491, lng: 77.2536 },
  { name: 'Vasant Kunj', lat: 28.5208, lng: 77.1584 },
  { name: 'Aerocity', lat: 28.5494, lng: 77.1210 },
  { name: 'Cyber Hub', lat: 28.495, lng: 77.089 },
  { name: 'Gurugram Sector 29', lat: 28.4680, lng: 77.0632 },
  { name: 'Golf Course Road, Gurugram', lat: 28.4541, lng: 77.0965 },
  { name: 'Noida Sector 18', lat: 28.5706, lng: 77.326 },
  { name: 'Noida Sector 62', lat: 28.6280, lng: 77.3649 },
  { name: 'Noida Sector 104', lat: 28.5397, lng: 77.3651 },
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

async function textSearch(query: string, kind: Venue['kind'], area: string, categories: ActivityCategory[], maxResultCount = 5) {
  const key = runtimeValue('GOOGLE_MAPS_API_KEY');
  if (!key) return [];
  const response = await fetch('https://places.googleapis.com/v1/places:searchText', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': key,
      'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.location,places.rating,places.userRatingCount,places.priceLevel,places.priceRange,places.regularOpeningHours,places.photos,places.websiteUri,places.googleMapsUri,places.googleMapsLinks,places.primaryType,places.servesVegetarianFood',
    },
    body: JSON.stringify({ textQuery: query, maxResultCount, languageCode: 'en', regionCode: 'IN' }),
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
      // Places Autocomplete (New) accepts a maximum circle radius of 50 km.
      // This is only a ranking bias; resolveOrigin still enforces Outly's
      // separate 100 km Delhi NCR pilot boundary after a place is selected.
      locationBias: { circle: { center: DELHI_CENTER, radius: 50000 } },
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

async function rankedAreas(participants: ParticipantRecord[], agreement: GroupAgreement) {
  const travelLookup = new Map<string, number>();
  const date = agreement.selectedDate ?? new Date(Date.now() + 86400000).toISOString().slice(0, 10);
  const windows = agreement.commonTimeWindows.length ? agreement.commonTimeWindows : agreement.selectedTimeWindow ? [agreement.selectedTimeWindow] : ['evening' as const];
  for (const timeWindow of windows) {
    const departure = departureIso(date, { ...agreement, selectedTimeWindow: timeWindow });
    for (const mode of ['drive', 'transit'] as const) {
      const group = participants.filter((participant) => participant.travelMode === mode && participant.originLat !== null && participant.originLng !== null);
      if (!group.length) continue;
      const matrix = await routeMatrix(group, PILOT_AREAS, mode, departure);
      if (!Array.isArray(matrix)) continue;
      matrix.forEach((element) => {
        if (element.condition !== 'ROUTE_EXISTS' || element.originIndex === undefined || element.destinationIndex === undefined) return;
        const participant = group[element.originIndex];
        const area = PILOT_AREAS[element.destinationIndex];
        const seconds = Number(element.duration?.replace('s', '') ?? NaN);
        if (!participant || !area || !Number.isFinite(seconds) || seconds < 0) return;
        const lookupKey = `${participant.id}:${area.name}`;
        const minutes = Math.max(1, Math.ceil(seconds / 60));
        travelLookup.set(lookupKey, Math.min(minutes, travelLookup.get(lookupKey) ?? Infinity));
      });
    }
  }
  return [...PILOT_AREAS].sort((a, b) => {
    const score = (area: (typeof PILOT_AREAS)[number]) => {
      const journeys = participants.map((participant) => {
        const routed = travelLookup.get(`${participant.id}:${area.name}`);
        const estimate = previewMinutes({ lat: participant.originLat ?? DELHI_CENTER.latitude, lng: participant.originLng ?? DELHI_CENTER.longitude }, area, participant.travelMode);
        const minutes = routed ?? estimate;
        return { minutes, limit: participant.travelMaxMinutes };
      });
      const violations = journeys.filter((journey) => journey.minutes > journey.limit).length;
      const excess = journeys.reduce((sum, journey) => sum + Math.max(0, journey.minutes - journey.limit), 0);
      const worstRatio = Math.max(...journeys.map((journey) => journey.minutes / Math.max(1, journey.limit)), 0);
      const average = journeys.length ? journeys.reduce((sum, journey) => sum + journey.minutes, 0) / journeys.length : 0;
      return [violations, excess, worstRatio, average];
    };
    const left = score(a); const right = score(b);
    for (let index = 0; index < left.length; index++) if (left[index] !== right[index]) return left[index] - right[index];
    return a.name.localeCompare(b.name);
  }).slice(0, 5);
}

function requestedActivityCategories(participants: ParticipantRecord[], agreement: GroupAgreement) {
  if (participants.length && participants.every((participant) => participant.activities.includes('anything'))) {
    return agreement.rankedActivities.map((item) => item.category);
  }
  const bestVotes = agreement.rankedActivities[0]?.votes ?? 0;
  return agreement.rankedActivities.filter((item) => item.votes > 0 && item.votes === bestVotes).map((item) => item.category);
}

function reviewQuality(venue: Venue) {
  if (venue.rating === null) return 0;
  const confidence = Math.min(1, Math.log10(Math.max(10, venue.ratingCount ?? 10)) / 4);
  return ((venue.rating - 3) / 2) * 70 + confidence * 30;
}

function mergeDiscovered(venues: Venue[]) {
  const merged = new Map<string, Venue>();
  for (const venue of venues) {
    const existing = merged.get(venue.placeId);
    merged.set(venue.placeId, existing ? { ...existing, categories: [...new Set([...existing.categories, ...venue.categories])] } : venue);
  }
  return [...merged.values()];
}

export async function discoverVenues(participants: ParticipantRecord[], agreement: GroupAgreement) {
  const key = runtimeValue('GOOGLE_MAPS_API_KEY');
  if (!key) return { venues: fallbackVenues, mode: 'preview' as const };
  const categories = requestedActivityCategories(participants, agreement);
  const requestedCategories = categories.length ? categories : ['games' as const];
  try {
    const areas = await rankedAreas(participants, agreement);
    const dietaryPhrase = agreement.dietary.includes('pure_veg') ? 'pure vegetarian' : agreement.dietary.includes('vegetarian') ? 'vegetarian friendly' : agreement.dietary.includes('no_alcohol') ? 'alcohol free' : '';
    const diningQueries = agreement.foodPreference === 'meal'
      ? [`best rated restaurants ${dietaryPhrase}`, `popular casual lively rooftop restaurants ${dietaryPhrase}`]
      : [`best cafes coffee dessert juice ${dietaryPhrase}`, `popular snacks drinks cafes ${dietaryPhrase}`];
    const searches = areas.flatMap((area) => [
      ...requestedCategories.map((category) => textSearch(`${categoryQuery(category)} in ${area.name}, Delhi NCR`, 'activity', area.name, [category], 6)),
      ...diningQueries.map((query) => textSearch(`${query} in ${area.name}, Delhi NCR`, 'dining', area.name, [], 10)),
    ]);
    const results = (await Promise.all(searches)).flat();
    const unique = mergeDiscovered(results);
    const activities = unique.filter((venue) => venue.kind === 'activity')
      .sort((a, b) => reviewQuality(b) - reviewQuality(a)).slice(0, 40);
    const dining = unique.filter((venue) => venue.kind === 'dining' && (venue.priceMax === null || venue.priceMax <= agreement.budgetHardMax));
    const stronglyReviewed = dining.filter((venue) => (venue.rating ?? 0) >= 4 && (venue.ratingCount ?? 0) >= 100);
    const qualifiedDining = (stronglyReviewed.length >= Math.min(15, areas.length * 3) ? stronglyReviewed : dining.filter((venue) => (venue.rating ?? 0) >= 3.8 && (venue.ratingCount ?? 0) >= 25))
      .sort((a, b) => reviewQuality(b) - reviewQuality(a)).slice(0, 60);
    return { venues: [...activities, ...qualifiedDining], mode: 'live' as const };
  } catch {
    throw new Error('Venue search is temporarily unavailable. Your agreement is saved; try generating plans again shortly.');
  }
}

async function routeMatrix(participants: ParticipantRecord[], destinations: Array<{ lat: number; lng: number }>, mode: TravelMode, departureTime: string) {
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
  const dining = venues.filter((venue) => venue.kind === 'dining' && agreement.dietary.every((requirement) => venue.dietaryVerified && venue.dietary.includes(requirement)));
  const pairs = activities.flatMap((activity) => [...dining].sort((a, b) => {
    const suitability = (restaurant: Venue) => {
      const distancePenalty = haversine(activity, restaurant) * 12;
      const qualityBonus = reviewQuality(restaurant) * 0.3;
      const budgetPenalty = restaurant.priceMax === null || !agreement.budgetHardMax ? 5 : restaurant.priceMax / agreement.budgetHardMax * 10;
      return distancePenalty + budgetPenalty - qualityBonus;
    };
    return suitability(a) - suitability(b);
  }).slice(0, 8).map((restaurant) => ({ activity, dining: restaurant })));
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
    date: agreement.selectedDate ?? undefined,
    timeWindow: agreement.selectedTimeWindow ?? undefined,
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
