ALTER TABLE `matches` ADD `formation_name` text;--> statement-breakpoint
ALTER TABLE `matches` ADD `is_home` integer DEFAULT true NOT NULL;