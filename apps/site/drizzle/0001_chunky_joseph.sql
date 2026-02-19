CREATE TABLE `blogCategories` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(100) NOT NULL,
	`slug` varchar(100) NOT NULL,
	`description` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `blogCategories_id` PRIMARY KEY(`id`),
	CONSTRAINT `blogCategories_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `blogPostTags` (
	`id` int AUTO_INCREMENT NOT NULL,
	`postId` int NOT NULL,
	`tagId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `blogPostTags_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `blogPosts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`title` varchar(255) NOT NULL,
	`slug` varchar(255) NOT NULL,
	`excerpt` text,
	`content` text NOT NULL,
	`featuredImage` text,
	`categoryId` int,
	`authorId` int,
	`published` boolean NOT NULL DEFAULT false,
	`publishedAt` timestamp,
	`views` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `blogPosts_id` PRIMARY KEY(`id`),
	CONSTRAINT `blogPosts_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `blogTags` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(100) NOT NULL,
	`slug` varchar(100) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `blogTags_id` PRIMARY KEY(`id`),
	CONSTRAINT `blogTags_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `contactSubmissions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`email` varchar(320) NOT NULL,
	`phone` varchar(50),
	`subject` varchar(255) NOT NULL,
	`message` text NOT NULL,
	`unitId` int,
	`status` enum('new','read','replied','archived') NOT NULL DEFAULT 'new',
	`readAt` timestamp,
	`repliedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `contactSubmissions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `donations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`donorName` varchar(255) NOT NULL,
	`donorEmail` varchar(320) NOT NULL,
	`donorPhone` varchar(50),
	`amount` int NOT NULL,
	`currency` varchar(3) NOT NULL DEFAULT 'BRL',
	`frequency` enum('one-time','monthly','quarterly','yearly') NOT NULL DEFAULT 'one-time',
	`destinationType` enum('general','unit','project') NOT NULL DEFAULT 'general',
	`destinationId` int,
	`paymentMethod` varchar(50) NOT NULL,
	`paymentStatus` enum('pending','completed','failed','refunded') NOT NULL DEFAULT 'pending',
	`transactionId` varchar(255),
	`paymentData` json,
	`anonymous` boolean NOT NULL DEFAULT false,
	`message` text,
	`receiptSent` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `donations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `newsletterSubscriptions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`email` varchar(320) NOT NULL,
	`name` varchar(255),
	`active` boolean NOT NULL DEFAULT true,
	`confirmedAt` timestamp,
	`unsubscribedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `newsletterSubscriptions_id` PRIMARY KEY(`id`),
	CONSTRAINT `newsletterSubscriptions_email_unique` UNIQUE(`email`)
);
--> statement-breakpoint
CREATE TABLE `projects` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`slug` varchar(255) NOT NULL,
	`description` text,
	`content` text,
	`featuredImage` text,
	`goalAmount` int,
	`currentAmount` int NOT NULL DEFAULT 0,
	`active` boolean NOT NULL DEFAULT true,
	`startDate` timestamp,
	`endDate` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `projects_id` PRIMARY KEY(`id`),
	CONSTRAINT `projects_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `transparencyDocuments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`title` varchar(255) NOT NULL,
	`description` text,
	`category` enum('financial','institutional','reports','other') NOT NULL,
	`fileUrl` text NOT NULL,
	`fileType` varchar(50),
	`fileSize` int,
	`year` int,
	`month` int,
	`published` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `transparencyDocuments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `units` (
	`id` int AUTO_INCREMENT NOT NULL,
	`unitCode` varchar(50) NOT NULL,
	`unitName` varchar(255) NOT NULL,
	`slug` varchar(255) NOT NULL,
	`mantenedoraName` varchar(255) NOT NULL,
	`city` varchar(100) NOT NULL,
	`state` varchar(2) NOT NULL,
	`addressPublic` text NOT NULL,
	`phonePublic` varchar(100),
	`emailPublic` varchar(320),
	`websiteUrl` text,
	`description` text,
	`imageUrl` text,
	`latitude` varchar(50),
	`longitude` varchar(50),
	`active` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `units_id` PRIMARY KEY(`id`),
	CONSTRAINT `units_unitCode_unique` UNIQUE(`unitCode`),
	CONSTRAINT `units_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
ALTER TABLE `blogPostTags` ADD CONSTRAINT `blogPostTags_postId_blogPosts_id_fk` FOREIGN KEY (`postId`) REFERENCES `blogPosts`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `blogPostTags` ADD CONSTRAINT `blogPostTags_tagId_blogTags_id_fk` FOREIGN KEY (`tagId`) REFERENCES `blogTags`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `blogPosts` ADD CONSTRAINT `blogPosts_categoryId_blogCategories_id_fk` FOREIGN KEY (`categoryId`) REFERENCES `blogCategories`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `blogPosts` ADD CONSTRAINT `blogPosts_authorId_users_id_fk` FOREIGN KEY (`authorId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `contactSubmissions` ADD CONSTRAINT `contactSubmissions_unitId_units_id_fk` FOREIGN KEY (`unitId`) REFERENCES `units`(`id`) ON DELETE no action ON UPDATE no action;