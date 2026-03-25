-- Migration: Add sellers table + sellerId to sales and quotes
--> statement-breakpoint
CREATE TABLE `sellers` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `company_id` integer NOT NULL REFERENCES `companies`(`id`) ON DELETE CASCADE,
  `name` text NOT NULL,
  `document` text,
  `email` text,
  `phone` text,
  `commission_rate` real NOT NULL DEFAULT 0,
  `active` integer NOT NULL DEFAULT 1,
  `created_at` integer NOT NULL DEFAULT (unixepoch()),
  `updated_at` integer NOT NULL DEFAULT (unixepoch())
);
--> statement-breakpoint
ALTER TABLE `sales` ADD COLUMN `seller_id` integer REFERENCES `sellers`(`id`) ON DELETE SET NULL;
--> statement-breakpoint
ALTER TABLE `quotes` ADD COLUMN `seller_id` integer REFERENCES `sellers`(`id`) ON DELETE SET NULL;
