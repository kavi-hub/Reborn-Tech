CREATE TABLE `itadJobComments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`jobId` int NOT NULL,
	`brand` enum('reborn','bulk_gsm') NOT NULL,
	`comment` text NOT NULL,
	`createdByUserId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `itadJobComments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `itadJobExceptions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`jobId` int NOT NULL,
	`brand` enum('reborn','bulk_gsm') NOT NULL,
	`status` enum('open','in_progress','resolved') NOT NULL DEFAULT 'open',
	`title` varchar(180) NOT NULL,
	`detail` text,
	`ownerUserId` int,
	`createdByUserId` int NOT NULL,
	`resolvedByUserId` int,
	`resolvedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `itadJobExceptions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `itadJobEvidenceRecords` ADD `customerApprovedAt` timestamp;--> statement-breakpoint
ALTER TABLE `itadJobEvidenceRecords` ADD `customerApprovedByUserId` int;--> statement-breakpoint
ALTER TABLE `itadJobImportBatches` ADD `mappingVersion` varchar(32) DEFAULT 'securaze_csv_v1' NOT NULL;--> statement-breakpoint
ALTER TABLE `itadJobImportBatches` ADD `fieldMapping` text;--> statement-breakpoint
ALTER TABLE `itadJobImportBatches` ADD `sourceHeaderSummary` text;