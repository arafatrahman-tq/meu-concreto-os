CREATE TABLE `user_companies` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `user_id` integer NOT NULL REFERENCES `users`(`id`) ON DELETE CASCADE,
  `company_id` integer NOT NULL REFERENCES `companies`(`id`) ON DELETE CASCADE,
  `role` text NOT NULL DEFAULT 'user',
  `created_at` integer NOT NULL DEFAULT (unixepoch()),
  UNIQUE(`user_id`, `company_id`)
);
--> statement-breakpoint
-- Migrate existing data: seed junction from users.company_id
INSERT INTO `user_companies` (`user_id`, `company_id`, `role`)
SELECT `id`, `company_id`, `role`
FROM `users`
WHERE `company_id` IS NOT NULL;
