CREATE TABLE `notifications` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `company_id` integer NOT NULL REFERENCES `companies`(`id`) ON DELETE CASCADE,
  `type` text NOT NULL,
  `title` text NOT NULL,
  `body` text,
  `link` text,
  `icon` text,
  `read_at` integer,
  `created_at` integer NOT NULL DEFAULT (unixepoch())
);
