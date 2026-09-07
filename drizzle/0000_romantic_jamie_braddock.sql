CREATE TABLE `groups` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`occasion` text NOT NULL,
	`expected_size` integer NOT NULL,
	`candidate_dates` text NOT NULL,
	`join_token_hash` text NOT NULL,
	`organizer_token_hash` text NOT NULL,
	`status` text DEFAULT 'collecting' NOT NULL,
	`agreement_json` text,
	`locked_at` integer,
	`expires_at` integer NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_groups_join_token_hash` ON `groups` (`join_token_hash`);--> statement-breakpoint
CREATE UNIQUE INDEX `idx_groups_organizer_token_hash` ON `groups` (`organizer_token_hash`);--> statement-breakpoint
CREATE INDEX `idx_groups_status` ON `groups` (`status`);--> statement-breakpoint
CREATE INDEX `idx_groups_expires_at` ON `groups` (`expires_at`);--> statement-breakpoint
CREATE TABLE `participants` (
	`id` text PRIMARY KEY NOT NULL,
	`group_id` text NOT NULL,
	`edit_token_hash` text NOT NULL,
	`display_name` text NOT NULL,
	`origin_label` text,
	`origin_place_id` text,
	`origin_lat` real,
	`origin_lng` real,
	`travel_mode` text NOT NULL,
	`travel_max_minutes` integer NOT NULL,
	`budget_target` integer NOT NULL,
	`budget_hard_max` integer NOT NULL,
	`acceptable_dates` text NOT NULL,
	`time_windows` text NOT NULL,
	`activities` text NOT NULL,
	`food_preference` text NOT NULL,
	`dietary` text NOT NULL,
	`duration_band` text NOT NULL,
	`submitted_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`group_id`) REFERENCES `groups`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_participants_edit_token_hash` ON `participants` (`edit_token_hash`);--> statement-breakpoint
CREATE INDEX `idx_participants_group_id` ON `participants` (`group_id`);--> statement-breakpoint
CREATE TABLE `plan_runs` (
	`id` text PRIMARY KEY NOT NULL,
	`group_id` text NOT NULL,
	`constraints_json` text NOT NULL,
	`source_mode` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`group_id`) REFERENCES `groups`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_plan_runs_group_id` ON `plan_runs` (`group_id`);--> statement-breakpoint
CREATE TABLE `plans` (
	`id` text PRIMARY KEY NOT NULL,
	`run_id` text NOT NULL,
	`group_id` text NOT NULL,
	`rank` integer NOT NULL,
	`label` text NOT NULL,
	`title` text NOT NULL,
	`summary` text NOT NULL,
	`score` real NOT NULL,
	`known_cost` integer NOT NULL,
	`has_unknown_activity_cost` integer NOT NULL,
	`plan_json` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`run_id`) REFERENCES `plan_runs`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`group_id`) REFERENCES `groups`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_plans_group_rank` ON `plans` (`group_id`,`rank`);--> statement-breakpoint
CREATE INDEX `idx_plans_run_id` ON `plans` (`run_id`);--> statement-breakpoint
CREATE TABLE `product_events` (
	`id` text PRIMARY KEY NOT NULL,
	`group_id` text,
	`event_name` text NOT NULL,
	`actor_hash` text,
	`payload_json` text,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_product_events_event_created` ON `product_events` (`event_name`,`created_at`);--> statement-breakpoint
CREATE INDEX `idx_product_events_group_id` ON `product_events` (`group_id`);--> statement-breakpoint
CREATE TABLE `relaxations` (
	`id` text PRIMARY KEY NOT NULL,
	`group_id` text NOT NULL,
	`kind` text NOT NULL,
	`description` text NOT NULL,
	`affected_participant_ids` text NOT NULL,
	`proposed_changes` text NOT NULL,
	`approvals` text DEFAULT '[]' NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`group_id`) REFERENCES `groups`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_relaxations_group_status` ON `relaxations` (`group_id`,`status`);--> statement-breakpoint
CREATE TABLE `venues` (
	`id` text PRIMARY KEY NOT NULL,
	`place_id` text NOT NULL,
	`kind` text NOT NULL,
	`name` text NOT NULL,
	`primary_type` text,
	`address` text,
	`area` text,
	`lat` real,
	`lng` real,
	`rating` real,
	`rating_count` integer,
	`price_level` text,
	`price_min` integer,
	`price_max` integer,
	`hours_json` text,
	`image_ref` text,
	`website_url` text,
	`google_maps_url` text,
	`booking_url` text,
	`duration_minutes` integer,
	`categories` text DEFAULT '[]' NOT NULL,
	`dietary` text DEFAULT '[]' NOT NULL,
	`source` text DEFAULT 'google_places' NOT NULL,
	`enabled` integer DEFAULT true NOT NULL,
	`refreshed_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_venues_place_id` ON `venues` (`place_id`);--> statement-breakpoint
CREATE INDEX `idx_venues_kind_area` ON `venues` (`kind`,`area`);--> statement-breakpoint
CREATE TABLE `votes` (
	`id` text PRIMARY KEY NOT NULL,
	`group_id` text NOT NULL,
	`plan_id` text NOT NULL,
	`voter_key_hash` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`group_id`) REFERENCES `groups`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`plan_id`) REFERENCES `plans`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_votes_group_voter` ON `votes` (`group_id`,`voter_key_hash`);--> statement-breakpoint
CREATE INDEX `idx_votes_plan_id` ON `votes` (`plan_id`);
--> statement-breakpoint
PRAGMA optimize;
