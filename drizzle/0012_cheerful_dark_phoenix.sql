CREATE TABLE `itadJobActivityEvents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`jobId` int NOT NULL,
	`brand` enum('reborn','bulk_gsm') NOT NULL,
	`eventType` enum('comment_added','exception_opened','exception_updated','exception_resolved','evidence_approved','securaze_imported') NOT NULL,
	`summary` varchar(500) NOT NULL,
	`actorUserId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `itadJobActivityEvents_id` PRIMARY KEY(`id`)
);
