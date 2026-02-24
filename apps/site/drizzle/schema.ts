import {
  serial,
  pgEnum,
  pgTable,
  text,
  timestamp,
  varchar,
  boolean,
  json,
  integer,
} from "drizzle-orm/pg-core";

// ─── Enums ────────────────────────────────────────────────────────────────────
export const roleEnum = pgEnum("role", ["user", "admin"]);
export const contactStatusEnum = pgEnum("contact_status", ["new", "read", "replied", "archived"]);
export const donationFrequencyEnum = pgEnum("donation_frequency", ["one-time", "monthly", "quarterly", "yearly"]);
export const donationDestinationTypeEnum = pgEnum("donation_destination_type", ["general", "unit", "project"]);
export const paymentStatusEnum = pgEnum("payment_status", ["pending", "completed", "failed", "refunded"]);
export const transparencyCategoryEnum = pgEnum("transparency_category", ["financial", "institutional", "reports", "other"]);
export const jobStatusEnum = pgEnum("job_status", ["new", "reviewing", "interview", "approved", "rejected"]);

// ─── Users ────────────────────────────────────────────────────────────────────
/**
 * Core user table backing auth flow.
 */
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: roleEnum("role").default("user").notNull(),
  createdAt: timestamp("createdAt", { mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updatedAt", { mode: "date" }).defaultNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn", { mode: "date" }).defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// ─── Units ────────────────────────────────────────────────────────────────────
/**
 * Units table - CEPIs and Creches
 */
export const units = pgTable("units", {
  id: serial("id").primaryKey(),
  unitCode: varchar("unitCode", { length: 50 }).notNull().unique(),
  unitName: varchar("unitName", { length: 255 }).notNull(),
  slug: varchar("slug", { length: 255 }).notNull().unique(),
  mantenedoraName: varchar("mantenedoraName", { length: 255 }).notNull(),
  city: varchar("city", { length: 100 }).notNull(),
  state: varchar("state", { length: 2 }).notNull(),
  addressPublic: text("addressPublic").notNull(),
  phonePublic: varchar("phonePublic", { length: 100 }),
  emailPublic: varchar("emailPublic", { length: 320 }),
  websiteUrl: text("websiteUrl"),
  description: text("description"),
  imageUrl: text("imageUrl"),
  latitude: varchar("latitude", { length: 50 }),
  longitude: varchar("longitude", { length: 50 }),
  active: boolean("active").default(true).notNull(),
  createdAt: timestamp("createdAt", { mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updatedAt", { mode: "date" }).defaultNow().notNull(),
});

export type Unit = typeof units.$inferSelect;
export type InsertUnit = typeof units.$inferInsert;

// ─── Blog Categories ──────────────────────────────────────────────────────────
export const blogCategories = pgTable("blogCategories", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  slug: varchar("slug", { length: 100 }).notNull().unique(),
  description: text("description"),
  createdAt: timestamp("createdAt", { mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updatedAt", { mode: "date" }).defaultNow().notNull(),
});

export type BlogCategory = typeof blogCategories.$inferSelect;
export type InsertBlogCategory = typeof blogCategories.$inferInsert;

// ─── Blog Tags ────────────────────────────────────────────────────────────────
export const blogTags = pgTable("blogTags", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  slug: varchar("slug", { length: 100 }).notNull().unique(),
  createdAt: timestamp("createdAt", { mode: "date" }).defaultNow().notNull(),
});

export type BlogTag = typeof blogTags.$inferSelect;
export type InsertBlogTag = typeof blogTags.$inferInsert;

// ─── Blog Posts ───────────────────────────────────────────────────────────────
export const blogPosts = pgTable("blogPosts", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  slug: varchar("slug", { length: 255 }).notNull().unique(),
  excerpt: text("excerpt"),
  content: text("content").notNull(),
  featuredImage: text("featuredImage"),
  categoryId: integer("categoryId").references(() => blogCategories.id),
  authorId: integer("authorId").references(() => users.id),
  published: boolean("published").default(false).notNull(),
  publishedAt: timestamp("publishedAt", { mode: "date" }),
  views: integer("views").default(0).notNull(),
  createdAt: timestamp("createdAt", { mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updatedAt", { mode: "date" }).defaultNow().notNull(),
});

export type BlogPost = typeof blogPosts.$inferSelect;
export type InsertBlogPost = typeof blogPosts.$inferInsert;

// ─── Blog Post Tags (M2M) ─────────────────────────────────────────────────────
export const blogPostTags = pgTable("blogPostTags", {
  id: serial("id").primaryKey(),
  postId: integer("postId").notNull().references(() => blogPosts.id, { onDelete: "cascade" }),
  tagId: integer("tagId").notNull().references(() => blogTags.id, { onDelete: "cascade" }),
  createdAt: timestamp("createdAt", { mode: "date" }).defaultNow().notNull(),
});

export type BlogPostTag = typeof blogPostTags.$inferSelect;
export type InsertBlogPostTag = typeof blogPostTags.$inferInsert;

// ─── Newsletter Subscriptions ─────────────────────────────────────────────────
export const newsletterSubscriptions = pgTable("newsletterSubscriptions", {
  id: serial("id").primaryKey(),
  email: varchar("email", { length: 320 }).notNull().unique(),
  name: varchar("name", { length: 255 }),
  active: boolean("active").default(true).notNull(),
  confirmedAt: timestamp("confirmedAt", { mode: "date" }),
  unsubscribedAt: timestamp("unsubscribedAt", { mode: "date" }),
  createdAt: timestamp("createdAt", { mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updatedAt", { mode: "date" }).defaultNow().notNull(),
});

export type NewsletterSubscription = typeof newsletterSubscriptions.$inferSelect;
export type InsertNewsletterSubscription = typeof newsletterSubscriptions.$inferInsert;

// ─── Contact Submissions ──────────────────────────────────────────────────────
export const contactSubmissions = pgTable("contactSubmissions", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 320 }).notNull(),
  phone: varchar("phone", { length: 50 }),
  subject: varchar("subject", { length: 255 }).notNull(),
  message: text("message").notNull(),
  unitId: integer("unitId").references(() => units.id),
  status: contactStatusEnum("status").default("new").notNull(),
  readAt: timestamp("readAt", { mode: "date" }),
  repliedAt: timestamp("repliedAt", { mode: "date" }),
  createdAt: timestamp("createdAt", { mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updatedAt", { mode: "date" }).defaultNow().notNull(),
});

export type ContactSubmission = typeof contactSubmissions.$inferSelect;
export type InsertContactSubmission = typeof contactSubmissions.$inferInsert;

// ─── Donations ────────────────────────────────────────────────────────────────
export const donations = pgTable("donations", {
  id: serial("id").primaryKey(),
  donorName: varchar("donorName", { length: 255 }).notNull(),
  donorEmail: varchar("donorEmail", { length: 320 }).notNull(),
  donorPhone: varchar("donorPhone", { length: 50 }),
  amount: integer("amount").notNull(), // Amount in cents
  currency: varchar("currency", { length: 3 }).default("BRL").notNull(),
  frequency: donationFrequencyEnum("frequency").default("one-time").notNull(),
  destinationType: donationDestinationTypeEnum("destinationType").default("general").notNull(),
  destinationId: integer("destinationId"),
  paymentMethod: varchar("paymentMethod", { length: 50 }).notNull(),
  paymentStatus: paymentStatusEnum("paymentStatus").default("pending").notNull(),
  transactionId: varchar("transactionId", { length: 255 }),
  paymentData: json("paymentData"),
  anonymous: boolean("anonymous").default(false).notNull(),
  message: text("message"),
  receiptSent: boolean("receiptSent").default(false).notNull(),
  createdAt: timestamp("createdAt", { mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updatedAt", { mode: "date" }).defaultNow().notNull(),
});

export type Donation = typeof donations.$inferSelect;
export type InsertDonation = typeof donations.$inferInsert;

// ─── Projects ─────────────────────────────────────────────────────────────────
export const projects = pgTable("projects", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  slug: varchar("slug", { length: 255 }).notNull().unique(),
  description: text("description"),
  content: text("content"),
  featuredImage: text("featuredImage"),
  goalAmount: integer("goalAmount"),
  currentAmount: integer("currentAmount").default(0).notNull(),
  active: boolean("active").default(true).notNull(),
  startDate: timestamp("startDate", { mode: "date" }),
  endDate: timestamp("endDate", { mode: "date" }),
  createdAt: timestamp("createdAt", { mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updatedAt", { mode: "date" }).defaultNow().notNull(),
});

export type Project = typeof projects.$inferSelect;
export type InsertProject = typeof projects.$inferInsert;

// ─── Transparency Documents ───────────────────────────────────────────────────
export const transparencyDocuments = pgTable("transparencyDocuments", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  category: transparencyCategoryEnum("category").notNull(),
  fileUrl: text("fileUrl").notNull(),
  fileType: varchar("fileType", { length: 50 }),
  fileSize: integer("fileSize"),
  year: integer("year"),
  month: integer("month"),
  published: boolean("published").default(true).notNull(),
  createdAt: timestamp("createdAt", { mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updatedAt", { mode: "date" }).defaultNow().notNull(),
});

export type TransparencyDocument = typeof transparencyDocuments.$inferSelect;
export type InsertTransparencyDocument = typeof transparencyDocuments.$inferInsert;

// ─── Job Applications ─────────────────────────────────────────────────────────
export const jobApplications = pgTable("jobApplications", {
  id: serial("id").primaryKey(),
  fullName: varchar("fullName", { length: 255 }).notNull(),
  email: varchar("email", { length: 320 }).notNull(),
  phone: varchar("phone", { length: 50 }).notNull(),
  cpf: varchar("cpf", { length: 14 }).notNull(),
  birthDate: varchar("birthDate", { length: 10 }).notNull(),
  address: text("address").notNull(),
  city: varchar("city", { length: 100 }).notNull(),
  state: varchar("state", { length: 2 }).notNull(),
  zipCode: varchar("zipCode", { length: 10 }).notNull(),
  position: varchar("position", { length: 255 }).notNull(),
  unitId: integer("unitId").references(() => units.id),
  education: varchar("education", { length: 255 }).notNull(),
  experience: text("experience"),
  skills: text("skills"),
  availability: varchar("availability", { length: 100 }),
  resumeUrl: text("resumeUrl"),
  coverLetter: text("coverLetter"),
  status: jobStatusEnum("status").default("new").notNull(),
  reviewedAt: timestamp("reviewedAt", { mode: "date" }),
  reviewedBy: integer("reviewedBy").references(() => users.id),
  notes: text("notes"),
  createdAt: timestamp("createdAt", { mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updatedAt", { mode: "date" }).defaultNow().notNull(),
});

export type JobApplication = typeof jobApplications.$inferSelect;
export type InsertJobApplication = typeof jobApplications.$inferInsert;
