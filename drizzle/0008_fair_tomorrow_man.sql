CREATE TABLE `itadJobs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organisationId` int NOT NULL,
	`brand` enum('reborn','bulk_gsm') NOT NULL,
	`jobReference` varchar(64) NOT NULL,
	`title` varchar(255) NOT NULL,
	`stage` enum('intake','planned_collection','received','processing','exceptions','evidence_review','client_published','completed') NOT NULL DEFAULT 'intake',
	`estimatedAssetCount` int,
	`receivedAssetCount` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `itadJobs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `collectionTracks` ADD `jobId` int;