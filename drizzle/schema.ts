import { boolean, int, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Public ITAD assessment submissions. These records are intentionally independent
 * of authenticated users so a prospective customer can enquire without an account.
 */
export const assessmentRequests = mysqlTable("assessmentRequests", {
  id: int("id").autoincrement().primaryKey(),
  status: mysqlEnum("status", ["new", "contacted", "qualified", "closed"]).default("new").notNull(),
  fullName: varchar("fullName", { length: 160 }).notNull(),
  email: varchar("email", { length: 320 }).notNull(),
  phone: varchar("phone", { length: 64 }),
  organisation: varchar("organisation", { length: 255 }).notNull(),
  jobTitle: varchar("jobTitle", { length: 160 }),
  sitePostcode: varchar("sitePostcode", { length: 24 }),
  assetCategories: varchar("assetCategories", { length: 700 }).notNull(),
  approximateAssetCount: varchar("approximateAssetCount", { length: 80 }),
  collectionTimeline: varchar("collectionTimeline", { length: 80 }),
  dataSecurityRequirement: varchar("dataSecurityRequirement", { length: 160 }),
  hasInventory: boolean("hasInventory").default(false).notNull(),
  requiresOnSiteErasure: boolean("requiresOnSiteErasure").default(false).notNull(),
  notes: text("notes"),
  source: varchar("source", { length: 64 }).default("website").notNull(),
  /** Initial review point for enquiry data; live customer records follow their own documented schedule. */
  retentionReviewAt: timestamp("retentionReviewAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type AssessmentRequest = typeof assessmentRequests.$inferSelect;
export type InsertAssessmentRequest = typeof assessmentRequests.$inferInsert;

/** Customer organisations are the scope boundary for customer-portal visibility. */
export const customerOrganisations = mysqlTable("customerOrganisations", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

/** A signed-in person can have an admin or viewer role within a customer organisation. */
export const customerOrganisationMembers = mysqlTable("customerOrganisationMembers", {
  id: int("id").autoincrement().primaryKey(),
  organisationId: int("organisationId").notNull(),
  userId: int("userId").notNull(),
  role: mysqlEnum("role", ["admin", "viewer"]).default("viewer").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

/** Collection milestones visible to the Reborn team and scoped customer-organisation members. */
export const collectionTracks = mysqlTable("collectionTracks", {
  id: int("id").autoincrement().primaryKey(),
  organisationId: int("organisationId").notNull(),
  reference: varchar("reference", { length: 64 }).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  status: mysqlEnum("status", ["planned", "confirmed", "collected", "processing", "outcome_reported"]).default("planned").notNull(),
  scheduledFor: timestamp("scheduledFor"),
  collectionPostcode: varchar("collectionPostcode", { length: 24 }),
  customerNote: text("customerNote"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

/** Metadata for route-specific inventories and evidence. File bytes remain in secure object storage. */
export const collectionAttachments = mysqlTable("collectionAttachments", {
  id: int("id").autoincrement().primaryKey(),
  collectionId: int("collectionId").notNull(),
  attachmentType: mysqlEnum("attachmentType", ["inventory", "evidence"]).notNull(),
  fileName: varchar("fileName", { length: 255 }).notNull(),
  contentType: varchar("contentType", { length: 160 }).notNull(),
  sizeBytes: int("sizeBytes").notNull(),
  storageKey: varchar("storageKey", { length: 900 }).notNull(),
  customerVisible: boolean("customerVisible").default(true).notNull(),
  uploadedByUserId: int("uploadedByUserId").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type CustomerOrganisation = typeof customerOrganisations.$inferSelect;
export type CustomerOrganisationMember = typeof customerOrganisationMembers.$inferSelect;
export type CollectionTrack = typeof collectionTracks.$inferSelect;
export type CollectionAttachment = typeof collectionAttachments.$inferSelect;
