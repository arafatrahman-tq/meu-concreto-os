ALTER TABLE `companies` ADD `quick_access_enabled` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `companies` ADD `quick_access_pin` text;--> statement-breakpoint
ALTER TABLE `companies` ADD `quick_access_code` text;--> statement-breakpoint
CREATE UNIQUE INDEX `companies_quick_access_code_unique` ON `companies` (`quick_access_code`);