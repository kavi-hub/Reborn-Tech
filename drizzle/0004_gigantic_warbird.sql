CREATE TABLE `collectionAuditEvents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`collectionId` int NOT NULL,
	`eventType` enum('route_created','status_changed','customer_access_changed','attachment_uploaded','attachment_removed') NOT NULL,
	`summary` varchar(600) NOT NULL,
	`customerVisible` boolean NOT NULL DEFAULT false,
	`actorUserId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `collectionAuditEvents_id` PRIMARY KEY(`id`)
);
