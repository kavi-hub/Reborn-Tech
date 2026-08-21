CREATE TABLE `customerPortalBulkExportAuditEvents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`accountId` int NOT NULL,
	`organisationId` int NOT NULL,
	`brand` enum('reborn','bulk_gsm') NOT NULL,
	`summaryCount` int NOT NULL,
	`jobReferences` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `customerPortalBulkExportAuditEvents_id` PRIMARY KEY(`id`)
);
