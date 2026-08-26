CREATE TABLE `audit_logs` (
	`id` varchar(32) NOT NULL,
	`userId` int,
	`action` varchar(120) NOT NULL,
	`entity` varchar(120) NOT NULL,
	`entityId` varchar(64),
	`previousValue` json,
	`newValue` json,
	`metadata` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `audit_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `classification_rules` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(160) NOT NULL,
	`priority` int NOT NULL DEFAULT 100,
	`movementType` varchar(80),
	`cfop` varchar(16),
	`operationNature` varchar(180),
	`invoiceStatus` varchar(80),
	`category` enum('Venda','Devolução','Bonificação','Outros','Cancelado') NOT NULL,
	`active` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `classification_rules_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `commercial_movements` (
	`id` varchar(32) NOT NULL,
	`batchId` varchar(32) NOT NULL,
	`importRowId` varchar(32),
	`movementDate` date,
	`emissionDate` date,
	`branch` varchar(64),
	`invoiceNumber` varchar(64),
	`invoiceSeries` varchar(32),
	`invoiceId` int,
	`invoiceStatus` varchar(80),
	`movementType` varchar(80),
	`cfop` varchar(16),
	`operationNature` varchar(180),
	`customerId` int,
	`customerCode` varchar(32),
	`customerName` varchar(255),
	`productId` int,
	`productCode` varchar(64),
	`productName` varchar(255),
	`productGroup` varchar(160),
	`originalSector` varchar(32),
	`commercialRegion` varchar(160),
	`newNomenclature` varchar(180),
	`responsible` varchar(120),
	`representative` varchar(120),
	`supervisor` varchar(120),
	`priceTable` varchar(120),
	`quantity` decimal(18,3) NOT NULL DEFAULT '0',
	`weightKg` decimal(18,3) NOT NULL DEFAULT '0',
	`productValue` decimal(18,2) NOT NULL DEFAULT '0',
	`discountValue` decimal(18,2) NOT NULL DEFAULT '0',
	`netValue` decimal(18,2) NOT NULL DEFAULT '0',
	`returnValue` decimal(18,2) NOT NULL DEFAULT '0',
	`bonusValue` decimal(18,2) NOT NULL DEFAULT '0',
	`originInvoiceNumber` varchar(64),
	`campaign` varchar(255),
	`category` enum('Venda','Devolução','Bonificação','Outros','Cancelado') NOT NULL DEFAULT 'Outros',
	`classificationRuleId` int,
	`classificationStatus` enum('Classificado','Pendente') NOT NULL DEFAULT 'Pendente',
	`active` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `commercial_movements_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `commercial_people` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(160) NOT NULL,
	`role` enum('Responsável','Representante','Supervisor') NOT NULL,
	`active` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `commercial_people_id` PRIMARY KEY(`id`),
	CONSTRAINT `commercial_people_unique` UNIQUE(`name`,`role`)
);
--> statement-breakpoint
CREATE TABLE `commercial_routes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`internalRegion` varchar(160),
	`formalRegion` varchar(160),
	`newNomenclature` varchar(180) NOT NULL,
	`responsible` varchar(120),
	`priceTable` varchar(120),
	`state` varchar(2),
	`cities` json,
	`active` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `commercial_routes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `commercial_sectors` (
	`id` int AUTO_INCREMENT NOT NULL,
	`code` varchar(32) NOT NULL,
	`internalRegionId` int,
	`formalRegionId` int,
	`active` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `commercial_sectors_id` PRIMARY KEY(`id`),
	CONSTRAINT `commercial_sectors_code_unique` UNIQUE(`code`)
);
--> statement-breakpoint
CREATE TABLE `customer_addresses` (
	`id` int AUTO_INCREMENT NOT NULL,
	`customerId` int NOT NULL,
	`address` text NOT NULL,
	`neighborhood` varchar(120),
	`city` varchar(120),
	`state` varchar(2),
	`zipCode` varchar(16),
	`latitude` decimal(10,7),
	`longitude` decimal(10,7),
	`geocodingStatus` enum('Pendente','Validado','Inválido') NOT NULL DEFAULT 'Pendente',
	`source` varchar(120) NOT NULL,
	`active` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `customer_addresses_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `customer_route_exceptions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`customerId` int NOT NULL,
	`routeId` int NOT NULL,
	`startsAt` date NOT NULL,
	`endsAt` date,
	`source` varchar(160) NOT NULL,
	`note` text,
	`active` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `customer_route_exceptions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `customers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`code` varchar(32) NOT NULL,
	`name` varchar(255) NOT NULL,
	`cnpj` varchar(32),
	`address` text,
	`neighborhood` varchar(120),
	`city` varchar(120),
	`state` varchar(2),
	`zipCode` varchar(16),
	`latitude` decimal(10,7),
	`longitude` decimal(10,7),
	`active` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `customers_id` PRIMARY KEY(`id`),
	CONSTRAINT `customers_code_unique` UNIQUE(`code`)
);
--> statement-breakpoint
CREATE TABLE `formal_regions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(160) NOT NULL,
	`source` varchar(160),
	`active` boolean NOT NULL DEFAULT true,
	CONSTRAINT `formal_regions_id` PRIMARY KEY(`id`),
	CONSTRAINT `formal_regions_name_unique` UNIQUE(`name`)
);
--> statement-breakpoint
CREATE TABLE `fund_movements` (
	`id` varchar(32) NOT NULL,
	`fundId` varchar(32) NOT NULL,
	`type` enum('Geração','Utilização','Cancelamento','Expiração') NOT NULL,
	`amount` decimal(18,2) NOT NULL,
	`campaign` varchar(255),
	`proofKey` varchar(500),
	`responsible` varchar(120),
	`note` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `fund_movements_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `fund_policies` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(180) NOT NULL,
	`percentage` decimal(7,4) NOT NULL,
	`basisMonths` int NOT NULL DEFAULT 6,
	`startsAt` date NOT NULL,
	`endsAt` date,
	`active` boolean NOT NULL DEFAULT true,
	`note` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `fund_policies_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `import_batches` (
	`id` varchar(32) NOT NULL,
	`sourceHash` varchar(128) NOT NULL,
	`sourceName` varchar(255) NOT NULL,
	`status` enum('Rascunho','Validado','Importado','Revertido','Com erro') NOT NULL DEFAULT 'Rascunho',
	`importedBy` int NOT NULL,
	`totalRows` int NOT NULL DEFAULT 0,
	`validRows` int NOT NULL DEFAULT 0,
	`errorRows` int NOT NULL DEFAULT 0,
	`totalValue` decimal(18,2) NOT NULL DEFAULT '0',
	`totalWeightKg` decimal(18,3) NOT NULL DEFAULT '0',
	`mapping` json,
	`revertedAt` timestamp,
	`revertedBy` int,
	`reversalReason` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `import_batches_id` PRIMARY KEY(`id`),
	CONSTRAINT `import_batches_hash_unique` UNIQUE(`sourceHash`)
);
--> statement-breakpoint
CREATE TABLE `import_rows` (
	`id` varchar(32) NOT NULL,
	`batchId` varchar(32) NOT NULL,
	`rowNumber` int NOT NULL,
	`rawData` json NOT NULL,
	`normalizedData` json,
	`errors` json,
	`status` enum('Válida','Com erro','Ignorada') NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `import_rows_id` PRIMARY KEY(`id`),
	CONSTRAINT `import_rows_batch_row_unique` UNIQUE(`batchId`,`rowNumber`)
);
--> statement-breakpoint
CREATE TABLE `internal_regions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(160) NOT NULL,
	`active` boolean NOT NULL DEFAULT true,
	CONSTRAINT `internal_regions_id` PRIMARY KEY(`id`),
	CONSTRAINT `internal_regions_name_unique` UNIQUE(`name`)
);
--> statement-breakpoint
CREATE TABLE `invoices` (
	`id` int AUTO_INCREMENT NOT NULL,
	`branch` varchar(64) NOT NULL,
	`number` varchar(64) NOT NULL,
	`series` varchar(32) NOT NULL,
	`emissionDate` date,
	`status` varchar(80),
	`customerId` int,
	`originInvoiceNumber` varchar(64),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `invoices_id` PRIMARY KEY(`id`),
	CONSTRAINT `invoices_unique_key` UNIQUE(`branch`,`number`,`series`)
);
--> statement-breakpoint
CREATE TABLE `price_tables` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(160) NOT NULL,
	`active` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `price_tables_id` PRIMARY KEY(`id`),
	CONSTRAINT `price_tables_name_unique` UNIQUE(`name`)
);
--> statement-breakpoint
CREATE TABLE `product_groups` (
	`id` int AUTO_INCREMENT NOT NULL,
	`code` varchar(64) NOT NULL,
	`name` varchar(160) NOT NULL,
	`parentName` varchar(160),
	`active` boolean NOT NULL DEFAULT true,
	CONSTRAINT `product_groups_id` PRIMARY KEY(`id`),
	CONSTRAINT `product_groups_code_unique` UNIQUE(`code`)
);
--> statement-breakpoint
CREATE TABLE `products` (
	`id` int AUTO_INCREMENT NOT NULL,
	`code` varchar(64) NOT NULL,
	`name` varchar(255) NOT NULL,
	`groupId` int,
	`subgroup` varchar(160),
	`active` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `products_id` PRIMARY KEY(`id`),
	CONSTRAINT `products_code_unique` UNIQUE(`code`)
);
--> statement-breakpoint
CREATE TABLE `promotional_funds` (
	`id` varchar(32) NOT NULL,
	`customerId` int NOT NULL,
	`policyId` int,
	`basePeriodStart` date NOT NULL,
	`basePeriodEnd` date NOT NULL,
	`baseRevenue` decimal(18,2) NOT NULL,
	`percentage` decimal(7,4) NOT NULL,
	`generatedValue` decimal(18,2) NOT NULL,
	`availableFrom` date NOT NULL,
	`availableUntil` date NOT NULL,
	`usedValue` decimal(18,2) NOT NULL DEFAULT '0',
	`cancelledValue` decimal(18,2) NOT NULL DEFAULT '0',
	`status` enum('Disponível','Utilizada','Expirada','Cancelada') NOT NULL DEFAULT 'Disponível',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `promotional_funds_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `route_rules` (
	`id` int AUTO_INCREMENT NOT NULL,
	`routeId` int NOT NULL,
	`scope` enum('Cliente','Setor','Localidade') NOT NULL,
	`customerCode` varchar(32),
	`sectorCode` varchar(32),
	`city` varchar(120),
	`state` varchar(2),
	`startsAt` date NOT NULL,
	`endsAt` date,
	`version` int NOT NULL DEFAULT 1,
	`source` varchar(160) NOT NULL,
	`note` text,
	`active` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `route_rules_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `saved_views` (
	`id` varchar(32) NOT NULL,
	`userId` int NOT NULL,
	`name` varchar(160) NOT NULL,
	`target` varchar(80) NOT NULL,
	`filters` json NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `saved_views_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `source_files` (
	`id` varchar(32) NOT NULL,
	`batchId` varchar(32) NOT NULL,
	`fileName` varchar(255) NOT NULL,
	`contentType` varchar(120) NOT NULL,
	`storageKey` varchar(500) NOT NULL,
	`sourceHash` varchar(128) NOT NULL,
	`sizeBytes` bigint NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `source_files_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `role` enum('Administrador','Gerência Comercial','Analista','Consulta') NOT NULL DEFAULT 'Consulta';--> statement-breakpoint
ALTER TABLE `audit_logs` ADD CONSTRAINT `audit_logs_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `commercial_movements` ADD CONSTRAINT `commercial_movements_batchId_import_batches_id_fk` FOREIGN KEY (`batchId`) REFERENCES `import_batches`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `commercial_movements` ADD CONSTRAINT `commercial_movements_importRowId_import_rows_id_fk` FOREIGN KEY (`importRowId`) REFERENCES `import_rows`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `commercial_movements` ADD CONSTRAINT `commercial_movements_invoiceId_invoices_id_fk` FOREIGN KEY (`invoiceId`) REFERENCES `invoices`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `commercial_movements` ADD CONSTRAINT `commercial_movements_customerId_customers_id_fk` FOREIGN KEY (`customerId`) REFERENCES `customers`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `commercial_movements` ADD CONSTRAINT `commercial_movements_productId_products_id_fk` FOREIGN KEY (`productId`) REFERENCES `products`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `commercial_movements` ADD CONSTRAINT `cm_classification_rule_fk` FOREIGN KEY (`classificationRuleId`) REFERENCES `classification_rules`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `commercial_sectors` ADD CONSTRAINT `commercial_sectors_internalRegionId_internal_regions_id_fk` FOREIGN KEY (`internalRegionId`) REFERENCES `internal_regions`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `commercial_sectors` ADD CONSTRAINT `commercial_sectors_formalRegionId_formal_regions_id_fk` FOREIGN KEY (`formalRegionId`) REFERENCES `formal_regions`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `customer_addresses` ADD CONSTRAINT `customer_addresses_customerId_customers_id_fk` FOREIGN KEY (`customerId`) REFERENCES `customers`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `customer_route_exceptions` ADD CONSTRAINT `customer_route_exceptions_customerId_customers_id_fk` FOREIGN KEY (`customerId`) REFERENCES `customers`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `customer_route_exceptions` ADD CONSTRAINT `customer_route_exceptions_routeId_commercial_routes_id_fk` FOREIGN KEY (`routeId`) REFERENCES `commercial_routes`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `fund_movements` ADD CONSTRAINT `fund_movements_fundId_promotional_funds_id_fk` FOREIGN KEY (`fundId`) REFERENCES `promotional_funds`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `import_batches` ADD CONSTRAINT `import_batches_importedBy_users_id_fk` FOREIGN KEY (`importedBy`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `import_batches` ADD CONSTRAINT `import_batches_revertedBy_users_id_fk` FOREIGN KEY (`revertedBy`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `import_rows` ADD CONSTRAINT `import_rows_batchId_import_batches_id_fk` FOREIGN KEY (`batchId`) REFERENCES `import_batches`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `invoices` ADD CONSTRAINT `invoices_customerId_customers_id_fk` FOREIGN KEY (`customerId`) REFERENCES `customers`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `products` ADD CONSTRAINT `products_groupId_product_groups_id_fk` FOREIGN KEY (`groupId`) REFERENCES `product_groups`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `promotional_funds` ADD CONSTRAINT `promotional_funds_customerId_customers_id_fk` FOREIGN KEY (`customerId`) REFERENCES `customers`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `promotional_funds` ADD CONSTRAINT `promotional_funds_policyId_fund_policies_id_fk` FOREIGN KEY (`policyId`) REFERENCES `fund_policies`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `route_rules` ADD CONSTRAINT `route_rules_routeId_commercial_routes_id_fk` FOREIGN KEY (`routeId`) REFERENCES `commercial_routes`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `saved_views` ADD CONSTRAINT `saved_views_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `source_files` ADD CONSTRAINT `source_files_batchId_import_batches_id_fk` FOREIGN KEY (`batchId`) REFERENCES `import_batches`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `audit_logs_entity_idx` ON `audit_logs` (`entity`,`entityId`);--> statement-breakpoint
CREATE INDEX `audit_logs_created_idx` ON `audit_logs` (`createdAt`);--> statement-breakpoint
CREATE INDEX `movements_date_idx` ON `commercial_movements` (`movementDate`);--> statement-breakpoint
CREATE INDEX `movements_customer_idx` ON `commercial_movements` (`customerCode`);--> statement-breakpoint
CREATE INDEX `movements_sector_idx` ON `commercial_movements` (`originalSector`);--> statement-breakpoint
CREATE INDEX `movements_category_idx` ON `commercial_movements` (`category`);--> statement-breakpoint
CREATE INDEX `customer_route_exception_idx` ON `customer_route_exceptions` (`customerId`,`startsAt`,`endsAt`);--> statement-breakpoint
CREATE INDEX `route_rules_scope_idx` ON `route_rules` (`scope`,`customerCode`,`sectorCode`);
