CREATE TABLE `customerPortalAccountActivityEvents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`accountId` int NOT NULL,
	`action` enum('reset_requested','password_reset','disabled','enabled') NOT NULL,
	`summary` varchar(500) NOT NULL,
	`actorUserId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `customerPortalAccountActivityEvents_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `customerPortalAccounts` ADD `status` enum('active','disabled') DEFAULT 'active' NOT NULL;--> statement-breakpoint
ALTER TABLE `customerPortalAccounts` ADD `disabledAt` timestamp;--> statement-breakpoint
ALTER TABLE `customerPortalAccounts` ADD `disabledByUserId` int;--> statement-breakpoint
ALTER TABLE `customerPortalAccounts` ADD `resetTokenHash` varchar(128);--> statement-breakpoint
ALTER TABLE `customerPortalAccounts` ADD `resetExpiresAt` timestamp;--> statement-breakpoint
ALTER TABLE `customerPortalAccounts` ADD `sessionVersion` int DEFAULT 0 NOT NULL;