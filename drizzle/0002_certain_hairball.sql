CREATE TABLE `collectionTracks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organisationId` int NOT NULL,
	`reference` varchar(64) NOT NULL,
	`title` varchar(255) NOT NULL,
	`status` enum('planned','confirmed','collected','processing','outcome_reported') NOT NULL DEFAULT 'planned',
	`scheduledFor` timestamp,
	`collectionPostcode` varchar(24),
	`customerNote` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `collectionTracks_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `customerOrganisationMembers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organisationId` int NOT NULL,
	`userId` int NOT NULL,
	`role` enum('admin','viewer') NOT NULL DEFAULT 'viewer',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `customerOrganisationMembers_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `customerOrganisations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `customerOrganisations_id` PRIMARY KEY(`id`)
);
