ALTER TABLE `transactions` ADD `parent_transaction_id` integer;
ALTER TABLE `transactions` ADD `installment_number` integer;
ALTER TABLE `transactions` ADD `installment_total` integer;
ALTER TABLE `transactions` ADD `is_installment_parent` integer DEFAULT false NOT NULL;