CREATE TABLE `import_mappings` (
	`id` varchar(32) NOT NULL,
	`userId` int NOT NULL,
	`name` varchar(160) NOT NULL,
	`sourceSignature` varchar(255) NOT NULL,
	`mapping` json NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `import_mappings_id` PRIMARY KEY(`id`),
	CONSTRAINT `import_mapping_owner_name` UNIQUE(`userId`,`name`)
);
--> statement-breakpoint
ALTER TABLE `import_mappings` ADD CONSTRAINT `import_mappings_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;