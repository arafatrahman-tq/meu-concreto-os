ALTER TABLE `whatsapp_settings` ADD `schedules_reminder_enabled` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `whatsapp_settings` ADD `schedules_reminder_recipients` text;