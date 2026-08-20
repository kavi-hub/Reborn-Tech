CREATE TABLE `customerPortalAccounts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organisationId` int NOT NULL,
	`brand` enum('reborn','bulk_gsm') NOT NULL DEFAULT 'reborn',
	`email` varchar(320) NOT NULL,
	`role` enum('admin','viewer') NOT NULL DEFAULT 'viewer',
	`passwordHash` varchar(255) NOT NULL,
	`activatedFromInvitationId` int NOT NULL,
	`lastSignedInAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `customerPortalAccounts_id` PRIMARY KEY(`id`),
	CONSTRAINT `customerPortalAccounts_email_unique` UNIQUE(`email`)
);
