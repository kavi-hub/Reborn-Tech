CREATE TABLE `brandSupportContacts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`brand` enum('reborn','bulk_gsm') NOT NULL,
	`contactName` varchar(160) NOT NULL,
	`email` varchar(320) NOT NULL,
	`phone` varchar(48),
	`updatedByUserId` int,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `brandSupportContacts_id` PRIMARY KEY(`id`),
	CONSTRAINT `brandSupportContacts_brand_unique` UNIQUE(`brand`)
);
--> statement-breakpoint
ALTER TABLE `customerPortalAccountActivityEvents` MODIFY COLUMN `action` enum('signed_in','reset_requested','password_reset','disabled','enabled') NOT NULL;