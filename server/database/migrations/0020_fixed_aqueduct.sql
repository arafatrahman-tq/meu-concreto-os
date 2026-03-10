ALTER TABLE `mix_designs` ADD `slump` integer;--> statement-breakpoint
ALTER TABLE `mix_designs` ADD `stone_size` text;--> statement-breakpoint
ALTER TABLE `quote_items` ADD `mix_design_id` integer;--> statement-breakpoint
ALTER TABLE `sale_items` ADD `mix_design_id` integer;