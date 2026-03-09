DROP INDEX IF EXISTS `users_email_unique`;--> statement-breakpoint
DROP INDEX IF EXISTS `users_document_unique`;--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `users_email_unique_idx` ON `users` (`email`);--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `users_document_unique_idx` ON `users` (`document`);