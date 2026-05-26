PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_payment_methods` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`company_id` integer NOT NULL,
	`name` text NOT NULL,
	`type` text DEFAULT 'other' NOT NULL,
	`details` text,
	`active` integer DEFAULT true NOT NULL,
	`is_default` integer DEFAULT false,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_payment_methods`("id", "company_id", "name", "type", "details", "active", "is_default", "created_at", "updated_at") SELECT "id", "company_id", "name", "type", "details", "active", "is_default", "created_at", "updated_at" FROM `payment_methods`;--> statement-breakpoint
DROP TABLE `payment_methods`;--> statement-breakpoint
ALTER TABLE `__new_payment_methods` RENAME TO `payment_methods`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
ALTER TABLE `users` DROP COLUMN `is_default`;