ALTER TABLE `collectionAuditEvents` MODIFY COLUMN `eventType` enum('route_created','status_changed','customer_access_changed','invitation_sent','invitation_revoked','attachment_uploaded','attachment_removed') NOT NULL;--> statement-breakpoint
ALTER TABLE `customerPortalInvitations` ADD `lastSentAt` timestamp;--> statement-breakpoint
ALTER TABLE `customerPortalInvitations` ADD `lastEmailState` enum('not_sent','sent','failed') DEFAULT 'not_sent' NOT NULL;--> statement-breakpoint
ALTER TABLE `customerPortalInvitations` ADD `lastEmailId` varchar(128);--> statement-breakpoint
ALTER TABLE `customerPortalInvitations` ADD `resendCount` int DEFAULT 0 NOT NULL;