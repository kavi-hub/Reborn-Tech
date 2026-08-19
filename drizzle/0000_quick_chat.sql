CREATE TABLE `assessmentRequests` (
	`id` int AUTO_INCREMENT NOT NULL,
	`status` enum('new','contacted','qualified','closed') NOT NULL DEFAULT 'new',
	`fullName` varchar(160) NOT NULL,
	`email` varchar(320) NOT NULL,
	`phone` varchar(64),
	`organisation` varchar(255) NOT NULL,
	`jobTitle` varchar(160),
	`sitePostcode` varchar(24),
	`assetCategories` varchar(700) NOT NULL,
	`approximateAssetCount` varchar(80),
	`collectionTimeline` varchar(80),
	`dataSecurityRequirement` varchar(160),
	`hasInventory` boolean NOT NULL DEFAULT false,
	`requiresOnSiteErasure` boolean NOT NULL DEFAULT false,
	`notes` text,
	`source` varchar(64) NOT NULL DEFAULT 'website',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `assessmentRequests_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` int AUTO_INCREMENT NOT NULL,
	`openId` varchar(64) NOT NULL,
	`name` text,
	`email` varchar(320),
	`loginMethod` varchar(64),
	`role` enum('user','admin') NOT NULL DEFAULT 'user',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`lastSignedIn` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `users_id` PRIMARY KEY(`id`),
	CONSTRAINT `users_openId_unique` UNIQUE(`openId`)
);
