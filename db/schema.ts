import { index, integer, real, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';

export const groups = sqliteTable('groups', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  occasion: text('occasion').notNull(),
  expectedSize: integer('expected_size').notNull(),
  candidateDates: text('candidate_dates').notNull(),
  joinTokenHash: text('join_token_hash').notNull(),
  organizerTokenHash: text('organizer_token_hash').notNull(),
  status: text('status').notNull().default('collecting'),
  agreementJson: text('agreement_json'),
  lockedAt: integer('locked_at'),
  expiresAt: integer('expires_at').notNull(),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
}, (table) => [
  uniqueIndex('idx_groups_join_token_hash').on(table.joinTokenHash),
  uniqueIndex('idx_groups_organizer_token_hash').on(table.organizerTokenHash),
  index('idx_groups_status').on(table.status),
  index('idx_groups_expires_at').on(table.expiresAt),
]);

export const participants = sqliteTable('participants', {
  id: text('id').primaryKey(),
  groupId: text('group_id').notNull().references(() => groups.id, { onDelete: 'cascade' }),
  editTokenHash: text('edit_token_hash').notNull(),
  displayName: text('display_name').notNull(),
  originLabel: text('origin_label'),
  originPlaceId: text('origin_place_id'),
  originLat: real('origin_lat'),
  originLng: real('origin_lng'),
  travelMode: text('travel_mode').notNull(),
  travelMaxMinutes: integer('travel_max_minutes').notNull(),
  budgetTarget: integer('budget_target').notNull(),
  budgetHardMax: integer('budget_hard_max').notNull(),
  acceptableDates: text('acceptable_dates').notNull(),
  timeWindows: text('time_windows').notNull(),
  activities: text('activities').notNull(),
  foodPreference: text('food_preference').notNull(),
  dietary: text('dietary').notNull(),
  durationBand: text('duration_band').notNull(),
  submittedAt: integer('submitted_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
}, (table) => [
  uniqueIndex('idx_participants_edit_token_hash').on(table.editTokenHash),
  index('idx_participants_group_id').on(table.groupId),
]);

export const relaxations = sqliteTable('relaxations', {
  id: text('id').primaryKey(),
  groupId: text('group_id').notNull().references(() => groups.id, { onDelete: 'cascade' }),
  kind: text('kind').notNull(),
  description: text('description').notNull(),
  affectedParticipantIds: text('affected_participant_ids').notNull(),
  proposedChanges: text('proposed_changes').notNull(),
  approvals: text('approvals').notNull().default('[]'),
  status: text('status').notNull().default('pending'),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
}, (table) => [index('idx_relaxations_group_status').on(table.groupId, table.status)]);

export const venues = sqliteTable('venues', {
  id: text('id').primaryKey(),
  placeId: text('place_id').notNull(),
  kind: text('kind').notNull(),
  name: text('name').notNull(),
  primaryType: text('primary_type'),
  address: text('address'),
  area: text('area'),
  lat: real('lat'),
  lng: real('lng'),
  rating: real('rating'),
  ratingCount: integer('rating_count'),
  priceLevel: text('price_level'),
  priceMin: integer('price_min'),
  priceMax: integer('price_max'),
  hoursJson: text('hours_json'),
  imageRef: text('image_ref'),
  websiteUrl: text('website_url'),
  googleMapsUrl: text('google_maps_url'),
  bookingUrl: text('booking_url'),
  durationMinutes: integer('duration_minutes'),
  categories: text('categories').notNull().default('[]'),
  dietary: text('dietary').notNull().default('[]'),
  source: text('source').notNull().default('google_places'),
  enabled: integer('enabled', { mode: 'boolean' }).notNull().default(true),
  refreshedAt: integer('refreshed_at').notNull(),
}, (table) => [
  uniqueIndex('idx_venues_place_id').on(table.placeId),
  index('idx_venues_kind_area').on(table.kind, table.area),
]);

export const planRuns = sqliteTable('plan_runs', {
  id: text('id').primaryKey(),
  groupId: text('group_id').notNull().references(() => groups.id, { onDelete: 'cascade' }),
  constraintsJson: text('constraints_json').notNull(),
  sourceMode: text('source_mode').notNull(),
  createdAt: integer('created_at').notNull(),
}, (table) => [index('idx_plan_runs_group_id').on(table.groupId)]);

export const plans = sqliteTable('plans', {
  id: text('id').primaryKey(),
  runId: text('run_id').notNull().references(() => planRuns.id, { onDelete: 'cascade' }),
  groupId: text('group_id').notNull().references(() => groups.id, { onDelete: 'cascade' }),
  rank: integer('rank').notNull(),
  label: text('label').notNull(),
  title: text('title').notNull(),
  summary: text('summary').notNull(),
  score: real('score').notNull(),
  knownCost: integer('known_cost').notNull(),
  hasUnknownActivityCost: integer('has_unknown_activity_cost', { mode: 'boolean' }).notNull(),
  planJson: text('plan_json').notNull(),
  createdAt: integer('created_at').notNull(),
}, (table) => [
  index('idx_plans_group_rank').on(table.groupId, table.rank),
  index('idx_plans_run_id').on(table.runId),
]);

export const votes = sqliteTable('votes', {
  id: text('id').primaryKey(),
  groupId: text('group_id').notNull().references(() => groups.id, { onDelete: 'cascade' }),
  planId: text('plan_id').notNull().references(() => plans.id, { onDelete: 'cascade' }),
  voterKeyHash: text('voter_key_hash').notNull(),
  createdAt: integer('created_at').notNull(),
}, (table) => [
  uniqueIndex('idx_votes_group_voter').on(table.groupId, table.voterKeyHash),
  index('idx_votes_plan_id').on(table.planId),
]);

export const productEvents = sqliteTable('product_events', {
  id: text('id').primaryKey(),
  groupId: text('group_id'),
  eventName: text('event_name').notNull(),
  actorHash: text('actor_hash'),
  payloadJson: text('payload_json'),
  createdAt: integer('created_at').notNull(),
}, (table) => [
  index('idx_product_events_event_created').on(table.eventName, table.createdAt),
  index('idx_product_events_group_id').on(table.groupId),
]);
