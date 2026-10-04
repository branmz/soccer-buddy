CREATE TABLE `formations` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`team_id` integer NOT NULL,
	`name` text NOT NULL,
	`field_size` integer NOT NULL,
	`layout_json` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`team_id`) REFERENCES `teams`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "formations_field_size_check" CHECK("formations"."field_size" in (5, 7, 9, 11))
);
--> statement-breakpoint
CREATE INDEX `formations_team_idx` ON `formations` (`team_id`);--> statement-breakpoint
CREATE TABLE `match_events` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`match_id` integer NOT NULL,
	`player_id` integer,
	`related_player_id` integer,
	`slot_id` text,
	`event_type` text NOT NULL,
	`period_number` integer NOT NULL,
	`game_time_ms` integer NOT NULL,
	`match_minute` integer NOT NULL,
	`group_id` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`match_id`) REFERENCES `matches`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`player_id`) REFERENCES `players`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`related_player_id`) REFERENCES `players`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `match_events_match_idx` ON `match_events` (`match_id`);--> statement-breakpoint
CREATE INDEX `match_events_player_idx` ON `match_events` (`player_id`);--> statement-breakpoint
CREATE INDEX `match_events_related_player_idx` ON `match_events` (`related_player_id`);--> statement-breakpoint
CREATE INDEX `match_events_group_idx` ON `match_events` (`group_id`);--> statement-breakpoint
CREATE TABLE `match_periods` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`match_id` integer NOT NULL,
	`period_number` integer NOT NULL,
	`started_at` integer NOT NULL,
	`ended_at` integer,
	`paused_at` integer,
	`paused_total_ms` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`match_id`) REFERENCES `matches`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `match_periods_match_period_idx` ON `match_periods` (`match_id`,`period_number`);--> statement-breakpoint
CREATE TABLE `matches` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`team_id` integer NOT NULL,
	`formation_id` integer,
	`opponent_name` text NOT NULL,
	`period_count` integer NOT NULL,
	`period_length_minutes` integer NOT NULL,
	`game_length_minutes` integer NOT NULL,
	`max_subs` integer,
	`status` text DEFAULT 'setup' NOT NULL,
	`starting_lineup_json` text,
	`live_layout_json` text,
	`started_at` integer,
	`ended_at` integer,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`team_id`) REFERENCES `teams`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`formation_id`) REFERENCES `formations`(`id`) ON UPDATE no action ON DELETE set null,
	CONSTRAINT "matches_period_count_check" CHECK("matches"."period_count" > 0),
	CONSTRAINT "matches_period_length_check" CHECK("matches"."period_length_minutes" > 0),
	CONSTRAINT "matches_max_subs_check" CHECK("matches"."max_subs" is null or "matches"."max_subs" >= 0)
);
--> statement-breakpoint
CREATE INDEX `matches_team_idx` ON `matches` (`team_id`);--> statement-breakpoint
CREATE INDEX `matches_status_idx` ON `matches` (`status`);--> statement-breakpoint
CREATE TABLE `players` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`team_id` integer NOT NULL,
	`name` text NOT NULL,
	`jersey_number` integer,
	`is_active` integer DEFAULT true NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`team_id`) REFERENCES `teams`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `players_team_idx` ON `players` (`team_id`);--> statement-breakpoint
CREATE TABLE `quick_sub_presets` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`team_id` integer,
	`match_id` integer,
	`preset_name` text NOT NULL,
	`substitutions_json` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`team_id`) REFERENCES `teams`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`match_id`) REFERENCES `matches`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "quick_sub_presets_scope_check" CHECK(("quick_sub_presets"."team_id" is null) <> ("quick_sub_presets"."match_id" is null))
);
--> statement-breakpoint
CREATE INDEX `quick_sub_presets_team_idx` ON `quick_sub_presets` (`team_id`);--> statement-breakpoint
CREATE INDEX `quick_sub_presets_match_idx` ON `quick_sub_presets` (`match_id`);--> statement-breakpoint
CREATE TABLE `teams` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`field_size` integer DEFAULT 11 NOT NULL,
	`created_at` integer NOT NULL,
	CONSTRAINT "teams_field_size_check" CHECK("teams"."field_size" in (5, 7, 9, 11))
);
