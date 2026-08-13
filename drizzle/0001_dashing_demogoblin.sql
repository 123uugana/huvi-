CREATE TABLE `alerts` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`livestock_id` text,
	`type` text DEFAULT 'SYSTEM' NOT NULL,
	`title` text NOT NULL,
	`message` text NOT NULL,
	`is_read` integer DEFAULT false NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`livestock_id`) REFERENCES `livestock`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `alerts_user_id_idx` ON `alerts` (`user_id`);--> statement-breakpoint
CREATE INDEX `alerts_user_read_idx` ON `alerts` (`user_id`,`is_read`);--> statement-breakpoint
ALTER TABLE `otp_codes` ADD `attempt_count` integer DEFAULT 0 NOT NULL;