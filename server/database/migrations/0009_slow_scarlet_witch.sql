CREATE TABLE `notifications` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`company_id` integer NOT NULL,
	`type` text NOT NULL,
	`title` text NOT NULL,
	`body` text,
	`link` text,
	`icon` text,
	`read_at` integer,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `sellers` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`company_id` integer NOT NULL,
	`name` text NOT NULL,
	`document` text,
	`email` text,
	`phone` text,
	`commission_rate` real DEFAULT 0 NOT NULL,
	`active` integer DEFAULT true NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `user_companies` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`company_id` integer NOT NULL,
	`role` text DEFAULT 'user' NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `user_companies_user_id_company_id_unique` ON `user_companies` (`user_id`,`company_id`);--> statement-breakpoint
CREATE TABLE `whatsapp_settings` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`company_id` integer NOT NULL,
	`api_url` text DEFAULT 'http://localhost:3025' NOT NULL,
	`api_key` text,
	`phone_number` text,
	`is_connected` integer DEFAULT false NOT NULL,
	`alerts_enabled` integer DEFAULT false NOT NULL,
	`reports_enabled` integer DEFAULT false NOT NULL,
	`alert_recipients` text,
	`report_recipients` text,
	`report_schedule` text DEFAULT 'daily' NOT NULL,
	`quote_pdf_to_seller` integer DEFAULT false NOT NULL,
	`quote_pdf_to_customer` integer DEFAULT false NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `whatsapp_settings_company_id_unique` ON `whatsapp_settings` (`company_id`);--> statement-breakpoint
ALTER TABLE `quotes` ADD `seller_id` integer REFERENCES sellers(id);--> statement-breakpoint
ALTER TABLE `sales` ADD `seller_id` integer REFERENCES sellers(id);