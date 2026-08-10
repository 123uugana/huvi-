CREATE TABLE `device_push_tokens` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`token` text NOT NULL,
	`platform` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `device_push_tokens_token_idx` ON `device_push_tokens` (`token`);--> statement-breakpoint
CREATE INDEX `device_push_tokens_user_id_idx` ON `device_push_tokens` (`user_id`);--> statement-breakpoint
CREATE TABLE `livestock` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`ear_number` text NOT NULL,
	`name` text,
	`gender` text DEFAULT 'UNKNOWN' NOT NULL,
	`birth_year` integer,
	`color` text,
	`mark_description` text,
	`image_url` text,
	`status` text DEFAULT 'ACTIVE' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `livestock_user_ear_number_idx` ON `livestock` (`user_id`,`ear_number`);--> statement-breakpoint
CREATE INDEX `livestock_user_id_idx` ON `livestock` (`user_id`);--> statement-breakpoint
CREATE INDEX `livestock_status_idx` ON `livestock` (`status`);--> statement-breakpoint
CREATE TABLE `otp_codes` (
	`id` text PRIMARY KEY NOT NULL,
	`phone_number` text NOT NULL,
	`code` text NOT NULL,
	`expires_at` text NOT NULL,
	`consumed_at` text,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `otp_codes_phone_number_idx` ON `otp_codes` (`phone_number`);--> statement-breakpoint
CREATE TABLE `refresh_sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`refresh_token_hash` text NOT NULL,
	`expires_at` text NOT NULL,
	`revoked_at` text,
	`created_at` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `refresh_sessions_token_idx` ON `refresh_sessions` (`refresh_token_hash`);--> statement-breakpoint
CREATE INDEX `refresh_sessions_user_id_idx` ON `refresh_sessions` (`user_id`);--> statement-breakpoint
CREATE TABLE `rfid_readers` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`name` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `rfid_scans` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`livestock_id` text,
	`reader_id` text,
	`epc` text NOT NULL,
	`direction` text DEFAULT 'UNKNOWN' NOT NULL,
	`scanned_at` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`livestock_id`) REFERENCES `livestock`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`reader_id`) REFERENCES `rfid_readers`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `rfid_scans_livestock_id_idx` ON `rfid_scans` (`livestock_id`);--> statement-breakpoint
CREATE INDEX `rfid_scans_scanned_at_idx` ON `rfid_scans` (`scanned_at`);--> statement-breakpoint
CREATE TABLE `rfid_tags` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`livestock_id` text NOT NULL,
	`epc` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`livestock_id`) REFERENCES `livestock`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `rfid_tags_user_epc_idx` ON `rfid_tags` (`user_id`,`epc`);--> statement-breakpoint
CREATE UNIQUE INDEX `rfid_tags_livestock_id_idx` ON `rfid_tags` (`livestock_id`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`phone_number` text NOT NULL,
	`name` text DEFAULT '' NOT NULL,
	`role` text DEFAULT 'FARMER' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_phone_number_idx` ON `users` (`phone_number`);