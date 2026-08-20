CREATE TABLE `customerPortalInvitations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organisationId` int NOT NULL,
	`email` varchar(320) NOT NULL,
	`role` enum('admin','viewer') NOT NULL DEFAULT 'viewer',
	`token` varchar(128) NOT NULL,
	`status` enum('pending','claimed','revoked','expired') NOT NULL DEFAULT 'pending',
	`expiresAt` timestamp NOT NULL,
	`createdByUserId` int NOT NULL,
	`claimedByUserId` int,
	`claimedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `customerPortalInvitations_id` PRIMARY KEY(`id`),
	CONSTRAINT `customerPortalInvitations_token_unique` UNIQUE(`token`)
);
