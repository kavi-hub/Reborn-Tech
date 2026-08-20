CREATE TABLE `collectionAttachments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`collectionId` int NOT NULL,
	`attachmentType` enum('inventory','evidence') NOT NULL,
	`fileName` varchar(255) NOT NULL,
	`contentType` varchar(160) NOT NULL,
	`sizeBytes` int NOT NULL,
	`storageKey` varchar(900) NOT NULL,
	`customerVisible` boolean NOT NULL DEFAULT true,
	`uploadedByUserId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `collectionAttachments_id` PRIMARY KEY(`id`)
);
