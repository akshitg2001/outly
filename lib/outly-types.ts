export const ACTIVITY_CATEGORIES = [
  'games',
  'sports',
  'arts',
  'nightlife',
  'anything',
] as const;

export type ActivityCategory = (typeof ACTIVITY_CATEGORIES)[number];
export type TravelMode = 'drive' | 'transit';
export type FoodPreference = 'meal' | 'snacks';
export type DurationBand = 'quick' | 'standard' | 'extended' | 'flexible';
export type TimeWindow = 'morning' | 'lunch' | 'afternoon' | 'evening' | 'late';

export const ACTIVITY_LABELS: Record<ActivityCategory, string> = {
  games: 'Games & entertainment',
  sports: 'Sports & active',
  arts: 'Arts & experiences',
  nightlife: 'Nightlife',
  anything: 'Open to anything',
};

export const TIME_WINDOW_LABELS: Record<TimeWindow, string> = {
  morning: 'Morning · 8–11',
  lunch: 'Lunch · 11–3',
  afternoon: 'Afternoon · 3–6',
  evening: 'Evening · 6–9',
  late: 'Late · 8–11',
};

export const TIME_WINDOWS: Record<TimeWindow, { start: number; end: number }> = {
  morning: { start: 8 * 60, end: 11 * 60 },
  lunch: { start: 11 * 60, end: 15 * 60 },
  afternoon: { start: 15 * 60, end: 18 * 60 },
  evening: { start: 18 * 60, end: 21 * 60 },
  late: { start: 20 * 60, end: 23 * 60 },
};

export const DURATION_BANDS: Record<DurationBand, { min: number; max: number }> = {
  quick: { min: 90, max: 180 },
  standard: { min: 180, max: 300 },
  extended: { min: 300, max: 420 },
  flexible: { min: 90, max: 420 },
};

export type ParticipantPreferenceInput = {
  displayName: string;
  originLabel: string;
  originPlaceId?: string | null;
  travelMode: TravelMode;
  travelMaxMinutes: number;
  budgetTarget: number;
  acceptableDates: string[];
  timeWindows: TimeWindow[];
  activities: ActivityCategory[];
  foodPreference: FoodPreference;
  dietary: string[];
  durationBand: DurationBand;
};

export type ParticipantRecord = ParticipantPreferenceInput & {
  timeExtensionMinutes?: number;
  durationMaxOverride?: number | null;
  id: string;
  groupId: string;
  originLat: number | null;
  originLng: number | null;
  budgetHardMax: number;
  submittedAt: number;
  updatedAt: number;
};

export type GroupRecord = {
  id: string;
  name: string;
  occasion: string;
  expectedSize: number;
  candidateDates: string[];
  status: 'collecting' | 'locked' | 'planned';
  agreement: GroupAgreement | null;
  lockedAt: number | null;
  expiresAt: number;
  createdAt: number;
  updatedAt: number;
};

export type ConflictKind = 'responses' | 'date' | 'time' | 'duration' | 'travel' | 'budget' | 'inventory';

export type ConflictSuggestion = {
  kind: ConflictKind;
  title: string;
  description: string;
  affectedParticipantIds: string[];
  proposedChanges: Record<string, unknown>;
};

export type GroupAgreement = {
  commonTimeRanges?: Array<{ start: number; end: number }>;
  participantCount: number;
  selectedDate: string | null;
  commonDates: string[];
  selectedTimeWindow: TimeWindow | null;
  commonTimeWindows: TimeWindow[];
  budgetTarget: number;
  budgetHardMax: number;
  rankedActivities: Array<{ category: Exclude<ActivityCategory, 'anything'>; votes: number }>;
  foodPreference: FoodPreference;
  dietary: string[];
  durationMin: number;
  durationMax: number;
  conflict: ConflictSuggestion | null;
};

export type VenueKind = 'activity' | 'dining';

export type Venue = {
  id: string;
  placeId: string;
  kind: VenueKind;
  name: string;
  primaryType: string | null;
  address: string;
  area: string;
  lat: number;
  lng: number;
  rating: number | null;
  ratingCount: number | null;
  priceLevel: string | null;
  priceMin: number | null;
  priceMax: number | null;
  durationMinutes: number | null;
  categories: ActivityCategory[];
  dietary: string[];
  openingPeriods: OpeningPeriod[];
  imageUrl: string | null;
  websiteUrl: string | null;
  googleMapsUrl: string;
  bookingUrl: string | null;
  source: 'google_places' | 'outly_fallback' | 'admin';
  dietaryVerified: boolean;
  photoAttributions?: Array<{ displayName: string; uri: string | null }>;
};

export type OpeningPeriod = {
  open: { day: number; hour: number; minute: number };
  close?: { day: number; hour: number; minute: number };
};

export type TravelEstimate = {
  participantId: string;
  participantName: string;
  mode: TravelMode;
  minutes: number;
  estimated: boolean;
};

export type CandidatePair = {
  activity: Venue;
  dining: Venue;
  travel: TravelEstimate[];
  betweenMinutes: number;
};

export type PlanStop = {
  kind: VenueKind;
  time: string;
  durationMinutes: number;
  venue: Venue;
  priceLabel: string;
  actionUrl: string;
  actionLabel: string;
};

export type OutingPlan = {
  hasUnknownDiningCost?: boolean;
  hoursVerificationRequired?: boolean;
  id: string;
  rank: number;
  label: 'Best overall fit' | 'Easiest commute' | 'Best value';
  title: string;
  summary: string;
  score: number;
  fitCount: number;
  participantCount: number;
  area: string;
  date: string;
  startTime: string;
  endTime: string;
  knownCost: number;
  hasUnknownActivityCost: boolean;
  dietaryVerificationRequired: boolean;
  travel: TravelEstimate[];
  stops: PlanStop[];
  reasons: string[];
};

export type PublicGroupView = {
  selectedPlanId?: string | null;
  planHydrationError?: string | null;
  planShortfallMessage?: string | null;
  role: 'participant' | 'organizer';
  group: GroupRecord;
  participantNames: string[];
  participantSummaries: Array<{ id: string; displayName: string }>;
  submittedCount: number;
  expectedSize: number;
  agreement: GroupAgreement | null;
  pendingRelaxation?: {
    id: string;
    kind: ConflictKind;
    description: string;
    affectedParticipantIds: string[];
    approvals: string[];
    status: string;
  } | null;
  plans?: OutingPlan[];
  votes?: Record<string, number>;
  dataMode?: 'live' | 'preview';
};
