ALTER TABLE `transactions` ADD `parent_transaction_id` integer;--> statement-breakpoint
ALTER TABLE `transactions` ADD `installment_number` integer;--> statement-breakpoint
ALTER TABLE `transactions` ADD `installment_total` integer;--> statement-breakpoint
ALTER TABLE `transactions` ADD `is_installment_parent` integer DEFAULT false NOT NULL;