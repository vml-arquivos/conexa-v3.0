CREATE TABLE `jobApplications` (
	`id` int AUTO_INCREMENT NOT NULL,
	`fullName` varchar(255) NOT NULL,
	`email` varchar(320) NOT NULL,
	`phone` varchar(50) NOT NULL,
	`cpf` varchar(14) NOT NULL,
	`birthDate` varchar(10) NOT NULL,
	`address` text NOT NULL,
	`city` varchar(100) NOT NULL,
	`state` varchar(2) NOT NULL,
	`zipCode` varchar(10) NOT NULL,
	`position` varchar(255) NOT NULL,
	`unitId` int,
	`education` varchar(255) NOT NULL,
	`experience` text,
	`skills` text,
	`availability` varchar(100),
	`resumeUrl` text,
	`coverLetter` text,
	`status` enum('new','reviewing','interview','approved','rejected') NOT NULL DEFAULT 'new',
	`reviewedAt` timestamp,
	`reviewedBy` int,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `jobApplications_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `jobApplications` ADD CONSTRAINT `jobApplications_unitId_units_id_fk` FOREIGN KEY (`unitId`) REFERENCES `units`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `jobApplications` ADD CONSTRAINT `jobApplications_reviewedBy_users_id_fk` FOREIGN KEY (`reviewedBy`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;