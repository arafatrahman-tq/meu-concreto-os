CREATE TABLE `quotes_drivers` (
	`quote_id` integer NOT NULL,
	`driver_id` integer NOT NULL,
	PRIMARY KEY(`quote_id`, `driver_id`),
	FOREIGN KEY (`quote_id`) REFERENCES `quotes`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`driver_id`) REFERENCES `drivers`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `sales_drivers` (
	`sale_id` integer NOT NULL,
	`driver_id` integer NOT NULL,
	PRIMARY KEY(`sale_id`, `driver_id`),
	FOREIGN KEY (`sale_id`) REFERENCES `sales`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`driver_id`) REFERENCES `drivers`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_quotes` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`company_id` integer NOT NULL,
	`user_id` integer,
	`customer_name` text NOT NULL,
	`customer_document` text,
	`customer_phone` text,
	`customer_address` text,
	`status` text DEFAULT 'draft' NOT NULL,
	`date` integer DEFAULT (unixepoch()) NOT NULL,
	`valid_until` integer,
	`seller_id` integer,
	`pumper_id` integer,
	`subtotal` integer DEFAULT 0 NOT NULL,
	`discount` integer DEFAULT 0 NOT NULL,
	`total` integer DEFAULT 0 NOT NULL,
	`notes` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`seller_id`) REFERENCES `sellers`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`pumper_id`) REFERENCES `pumpers`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
INSERT INTO `__new_quotes`("id", "company_id", "user_id", "customer_name", "customer_document", "customer_phone", "customer_address", "status", "date", "valid_until", "seller_id", "pumper_id", "subtotal", "discount", "total", "notes", "created_at", "updated_at") SELECT "id", "company_id", "user_id", "customer_name", "customer_document", "customer_phone", "customer_address", "status", "date", "valid_until", "seller_id", "pumper_id", "subtotal", "discount", "total", "notes", "created_at", "updated_at" FROM `quotes`;--> statement-breakpoint
DROP TABLE `quotes`;--> statement-breakpoint
ALTER TABLE `__new_quotes` RENAME TO `quotes`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE TABLE `__new_sales` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`company_id` integer NOT NULL,
	`user_id` integer,
	`quote_id` integer,
	`customer_name` text NOT NULL,
	`customer_document` text,
	`customer_phone` text,
	`customer_address` text,
	`status` text DEFAULT 'pending' NOT NULL,
	`date` integer DEFAULT (unixepoch()) NOT NULL,
	`delivery_date` integer,
	`subtotal` integer DEFAULT 0 NOT NULL,
	`discount` integer DEFAULT 0 NOT NULL,
	`total` integer DEFAULT 0 NOT NULL,
	`payment_method` text,
	`payment_method_id` integer,
	`seller_id` integer,
	`pumper_id` integer,
	`notes` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`quote_id`) REFERENCES `quotes`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`payment_method_id`) REFERENCES `payment_methods`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`seller_id`) REFERENCES `sellers`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`pumper_id`) REFERENCES `pumpers`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
INSERT INTO `__new_sales`("id", "company_id", "user_id", "quote_id", "customer_name", "customer_document", "customer_phone", "customer_address", "status", "date", "delivery_date", "subtotal", "discount", "total", "payment_method", "payment_method_id", "seller_id", "pumper_id", "notes", "created_at", "updated_at") SELECT "id", "company_id", "user_id", "quote_id", "customer_name", "customer_document", "customer_phone", "customer_address", "status", "date", "delivery_date", "subtotal", "discount", "total", "payment_method", "payment_method_id", "seller_id", "pumper_id", "notes", "created_at", "updated_at" FROM `sales`;--> statement-breakpoint
DROP TABLE `sales`;--> statement-breakpoint
ALTER TABLE `__new_sales` RENAME TO `sales`;