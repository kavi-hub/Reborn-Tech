CREATE TABLE `itadJobImportExceptions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`importBatchId` int NOT NULL,
	`jobId` int NOT NULL,
	`brand` enum('reborn','bulk_gsm') NOT NULL,
	`sourceRowNumber` int NOT NULL,
	`code` enum('missing_serial','missing_result','duplicate_serial') NOT NULL,
	`message` varchar(500) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `itadJobImportExceptions_id` PRIMARY KEY(`id`)
);
