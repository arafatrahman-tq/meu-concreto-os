CREATE TABLE `products` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`company_id` integer NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`type` text DEFAULT 'other' NOT NULL,
	`unit` text DEFAULT 'un' NOT NULL,
	`price` integer DEFAULT 0 NOT NULL,
	`sku` text,
	`fck` integer,
	`slump` integer,
	`stone_size` text,
	`active` integer DEFAULT true NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON UPDATE no action ON DELETE cascade
);
