CREATE TABLE `clientNotificationEvents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organisationId` int NOT NULL,
	`brand` enum('reborn','bulk_gsm') NOT NULL,
	`collectionId` int,
	`jobId` int,
	`invitationId` int,
	`recipientEmail` varchar(320) NOT NULL,
	`eventType` enum('onboarding','collection_booked','job_completed') NOT NULL,
	`deliveryState` enum('sent','failed','skipped') NOT NULL,
	`emailId` varchar(128),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `clientNotificationEvents_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `itadJobImpactStatements` (
	`id` int AUTO_INCREMENT NOT NULL,
	`jobId` int NOT NULL,
	`brand` enum('reborn','bulk_gsm') NOT NULL,
	`assetsReused` int NOT NULL DEFAULT 0,
	`assetsRecycled` int NOT NULL DEFAULT 0,
	`assetsRedistributed` int NOT NULL DEFAULT 0,
	`materialsRecoveredKg` int NOT NULL DEFAULT 0,
	`carbonAvoidedKg` int,
	`carbonMethodology` varchar(255),
	`narrative` text,
	`customerVisible` boolean NOT NULL DEFAULT false,
	`customerApprovedAt` timestamp,
	`customerApprovedByUserId` int,
	`updatedByUserId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `itadJobImpactStatements_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `itadJobActivityEvents` MODIFY COLUMN `eventType` enum('comment_added','exception_opened','exception_updated','exception_resolved','evidence_approved','securaze_imported','stage_changed','impact_updated','impact_approved','client_notification') NOT NULL;--> statement-breakpoint
ALTER TABLE `itadJobEvidenceRecords` MODIFY COLUMN `evidenceType` enum('securaze_report','destruction_certificate','impact_statement','data_erasure','collection_manifest','reuse_outcome','recycling_outcome','other') NOT NULL;--> statement-breakpoint
ALTER TABLE `itadJobs` ADD `completedAt` timestamp;--> statement-breakpoint
ALTER TABLE `itadJobs` ADD `completedByUserId` int;