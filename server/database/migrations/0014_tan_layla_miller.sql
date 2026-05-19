ALTER TABLE `sales` ADD `payment_method_id` integer REFERENCES payment_methods(id);--> statement-breakpoint
ALTER TABLE `whatsapp_settings` ADD `use_global` integer DEFAULT false NOT NULL;