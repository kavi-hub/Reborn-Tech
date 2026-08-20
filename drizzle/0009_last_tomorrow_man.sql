CREATE TABLE `itadJobAssets` (
	`id` int AUTO_INCREMENT NOT NULL,
	`jobId` int NOT NULL,
	`brand` enum('reborn','bulk_gsm') NOT NULL,
	`assetCategory` varchar(120) NOT NULL,
	`manufacturer` varchar(120),
	`model` varchar(160),
	`assetTag` varchar(160),
	`serialNumber` varchar(160),
	`quantity` int NOT NULL DEFAULT 1,
	`condition` enum('unassessed','working','repairable','parts_only','recycling') NOT NULL DEFAULT 'unassessed',
	`dataHandlingState` enum('not_recorded','evidence_pending','evidence_recorded','exception') NOT NULL DEFAULT 'not_recorded',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `itadJobAssets_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `itadJobEvidenceRecords` (
	`id` int AUTO_INCREMENT NOT NULL,
	`jobId` int NOT NULL,
	`assetId` int,
	`brand` enum('reborn','bulk_gsm') NOT NULL,
	`evidenceType` enum('data_erasure','collection_manifest','reuse_outcome','recycling_outcome','other') NOT NULL,
	`certificateReference` varchar(180),
	`issuer` varchar(180),
	`verificationState` enum('recorded','reviewed','verified','exception') NOT NULL DEFAULT 'recorded',
	`evidenceDate` timestamp,
	`fileName` varchar(255),
	`contentType` varchar(160),
	`sizeBytes` int,
	`storageKey` varchar(900),
	`customerVisible` boolean NOT NULL DEFAULT false,
	`createdByUserId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `itadJobEvidenceRecords_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `itadJobImportBatches` (
	`id` int AUTO_INCREMENT NOT NULL,
	`jobId` int NOT NULL,
	`brand` enum('reborn','bulk_gsm') NOT NULL,
	`source` enum('securaze') NOT NULL DEFAULT 'securaze',
	`importReference` varchar(180),
	`status` enum('recorded','review_required','accepted','rejected') NOT NULL DEFAULT 'recorded',
	`sourceFileName` varchar(255),
	`sourceContentType` varchar(160),
	`sourceSizeBytes` int,
	`storageKey` varchar(900),
	`reportedRecordCount` int,
	`importedRecordCount` int NOT NULL DEFAULT 0,
	`exceptionCount` int NOT NULL DEFAULT 0,
	`importedByUserId` int NOT NULL,
	`importedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `itadJobImportBatches_id` PRIMARY KEY(`id`)
);
