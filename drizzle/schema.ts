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

/** Pre-provisioned customer access. The invitation email must match the authenticated work email before it can be claimed. */
export const customerPortalInvitations = mysqlTable("customerPortalInvitations", {
  id: int("id").autoincrement().primaryKey(),
  organisationId: int("organisationId").notNull(),
  brand: mysqlEnum("brand", ["reborn", "bulk_gsm"]).default("reborn").notNull(),
  email: varchar("email", { length: 320 }).notNull(),
  role: mysqlEnum("role", ["admin", "viewer"]).default("viewer").notNull(),
  token: varchar("token", { length: 128 }).notNull().unique(),
  status: mysqlEnum("status", ["pending", "claimed", "revoked", "expired"]).default("pending").notNull(),
  expiresAt: timestamp("expiresAt").notNull(),
  createdByUserId: int("createdByUserId").notNull(),
  claimedByUserId: int("claimedByUserId"),
  claimedAt: timestamp("claimedAt"),
  lastSentAt: timestamp("lastSentAt"),
  lastEmailState: mysqlEnum("lastEmailState", ["not_sent", "sent", "failed"]).default("not_sent").notNull(),
  lastEmailId: varchar("lastEmailId", { length: 128 }),
  resendCount: int("resendCount").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

/** Password credentials for a customer portal account activated from a verified invitation. */
export const customerPortalAccounts = mysqlTable("customerPortalAccounts", {
  id: int("id").autoincrement().primaryKey(),
  organisationId: int("organisationId").notNull(),
  brand: mysqlEnum("brand", ["reborn", "bulk_gsm"]).default("reborn").notNull(),
  email: varchar("email", { length: 320 }).notNull().unique(),
  role: mysqlEnum("role", ["admin", "viewer"]).default("viewer").notNull(),
  passwordHash: varchar("passwordHash", { length: 255 }).notNull(),
  activatedFromInvitationId: int("activatedFromInvitationId").notNull(),
  lastSignedInAt: timestamp("lastSignedInAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

/** Collection milestones visible to the Reborn team and scoped customer-organisation members. */
export const collectionTracks = mysqlTable("collectionTracks", {
  id: int("id").autoincrement().primaryKey(),
  organisationId: int("organisationId").notNull(),
  brand: mysqlEnum("brand", ["reborn", "bulk_gsm"]).default("reborn").notNull(),
  jobId: int("jobId"),
  reference: varchar("reference", { length: 64 }).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  status: mysqlEnum("status", ["planned", "confirmed", "collected", "processing", "outcome_reported"]).default("planned").notNull(),
  scheduledFor: timestamp("scheduledFor"),
  collectionPostcode: varchar("collectionPostcode", { length: 24 }),
  customerNote: text("customerNote"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

/** Canonical cross-brand ITAD job. Collection routes, assets, evidence and reporting attach to this durable identity. */
export const itadJobs = mysqlTable("itadJobs", {
  id: int("id").autoincrement().primaryKey(),
  organisationId: int("organisationId").notNull(),
  brand: mysqlEnum("brand", ["reborn", "bulk_gsm"]).notNull(),
  jobReference: varchar("jobReference", { length: 64 }).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  stage: mysqlEnum("stage", ["intake", "planned_collection", "received", "processing", "exceptions", "evidence_review", "client_published", "completed"]).default("intake").notNull(),
  estimatedAssetCount: int("estimatedAssetCount"),
  receivedAssetCount: int("receivedAssetCount"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

/** Structured asset inventory. A row can represent an individual identified asset or a homogeneous quantity batch. */
export const itadJobAssets = mysqlTable("itadJobAssets", {
  id: int("id").autoincrement().primaryKey(),
  jobId: int("jobId").notNull(),
  brand: mysqlEnum("brand", ["reborn", "bulk_gsm"]).notNull(),
  assetCategory: varchar("assetCategory", { length: 120 }).notNull(),
  manufacturer: varchar("manufacturer", { length: 120 }),
  model: varchar("model", { length: 160 }),
  assetTag: varchar("assetTag", { length: 160 }),
  serialNumber: varchar("serialNumber", { length: 160 }),
  quantity: int("quantity").default(1).notNull(),
  condition: mysqlEnum("condition", ["unassessed", "working", "repairable", "parts_only", "recycling"]).default("unassessed").notNull(),
  dataHandlingState: mysqlEnum("dataHandlingState", ["not_recorded", "evidence_pending", "evidence_recorded", "exception"]).default("not_recorded").notNull(),
  sourceImportBatchId: int("sourceImportBatchId"),
  sourceRowNumber: int("sourceRowNumber"),
  sourceResult: varchar("sourceResult", { length: 160 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

/** Documentary evidence held against a Core Job or an individual asset. Verification is an internal workflow state, not a compliance claim. */
export const itadJobEvidenceRecords = mysqlTable("itadJobEvidenceRecords", {
  id: int("id").autoincrement().primaryKey(),
  jobId: int("jobId").notNull(),
  assetId: int("assetId"),
  brand: mysqlEnum("brand", ["reborn", "bulk_gsm"]).notNull(),
  evidenceType: mysqlEnum("evidenceType", ["data_erasure", "collection_manifest", "reuse_outcome", "recycling_outcome", "other"]).notNull(),
  certificateReference: varchar("certificateReference", { length: 180 }),
  issuer: varchar("issuer", { length: 180 }),
  verificationState: mysqlEnum("verificationState", ["recorded", "reviewed", "verified", "exception"]).default("recorded").notNull(),
  evidenceDate: timestamp("evidenceDate"),
  fileName: varchar("fileName", { length: 255 }),
  contentType: varchar("contentType", { length: 160 }),
  sizeBytes: int("sizeBytes"),
  storageKey: varchar("storageKey", { length: 900 }),
  customerVisible: boolean("customerVisible").default(false).notNull(),
  customerApprovedAt: timestamp("customerApprovedAt"),
  customerApprovedByUserId: int("customerApprovedByUserId"),
  createdByUserId: int("createdByUserId").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

/** Import ledger for structured Securaze exports. The original file is retained by storage key; parsed outcomes remain reviewable rather than assumed valid. */
export const itadJobImportBatches = mysqlTable("itadJobImportBatches", {
  id: int("id").autoincrement().primaryKey(),
  jobId: int("jobId").notNull(),
  brand: mysqlEnum("brand", ["reborn", "bulk_gsm"]).notNull(),
  source: mysqlEnum("source", ["securaze"]).default("securaze").notNull(),
  importReference: varchar("importReference", { length: 180 }),
  status: mysqlEnum("status", ["recorded", "review_required", "accepted", "rejected"]).default("recorded").notNull(),
  sourceFileName: varchar("sourceFileName", { length: 255 }),
  sourceContentType: varchar("sourceContentType", { length: 160 }),
  sourceSizeBytes: int("sourceSizeBytes"),
  storageKey: varchar("storageKey", { length: 900 }),
  reportedRecordCount: int("reportedRecordCount"),
  importedRecordCount: int("importedRecordCount").default(0).notNull(),
  exceptionCount: int("exceptionCount").default(0).notNull(),
  mappingVersion: varchar("mappingVersion", { length: 32 }).default("securaze_csv_v1").notNull(),
  fieldMapping: text("fieldMapping"),
  sourceHeaderSummary: text("sourceHeaderSummary"),
  importedByUserId: int("importedByUserId").notNull(),
  importedAt: timestamp("importedAt").defaultNow().notNull(),
});

/** Row-level exceptions produced by a confirmed Securaze CSV import, retained for review and export. */
export const itadJobImportExceptions = mysqlTable("itadJobImportExceptions", {
  id: int("id").autoincrement().primaryKey(),
  importBatchId: int("importBatchId").notNull(),
  jobId: int("jobId").notNull(),
  brand: mysqlEnum("brand", ["reborn", "bulk_gsm"]).notNull(),
  sourceRowNumber: int("sourceRowNumber").notNull(),
  code: mysqlEnum("code", ["missing_serial", "missing_result", "duplicate_serial"]).notNull(),
  message: varchar("message", { length: 500 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

/** Internal operational context against a Core Job. Comments are intentionally not exposed to customers. */
export const itadJobComments = mysqlTable("itadJobComments", {
  id: int("id").autoincrement().primaryKey(),
  jobId: int("jobId").notNull(),
  brand: mysqlEnum("brand", ["reborn", "bulk_gsm"]).notNull(),
  comment: text("comment").notNull(),
  createdByUserId: int("createdByUserId").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

/** Assigned operational exception ledger. Resolution is explicit and attributable. */
export const itadJobExceptions = mysqlTable("itadJobExceptions", {
  id: int("id").autoincrement().primaryKey(),
  jobId: int("jobId").notNull(),
  brand: mysqlEnum("brand", ["reborn", "bulk_gsm"]).notNull(),
  status: mysqlEnum("status", ["open", "in_progress", "resolved"]).default("open").notNull(),
  title: varchar("title", { length: 180 }).notNull(),
  detail: text("detail"),
  ownerUserId: int("ownerUserId"),
  dueAt: timestamp("dueAt"),
  createdByUserId: int("createdByUserId").notNull(),
  resolvedByUserId: int("resolvedByUserId"),
  resolvedAt: timestamp("resolvedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

/** Immutable operational history for Core Job comments, exception lifecycle and evidence approvals. */
export const itadJobActivityEvents = mysqlTable("itadJobActivityEvents", {
  id: int("id").autoincrement().primaryKey(),
  jobId: int("jobId").notNull(),
  brand: mysqlEnum("brand", ["reborn", "bulk_gsm"]).notNull(),
  eventType: mysqlEnum("eventType", ["comment_added", "exception_opened", "exception_updated", "exception_resolved", "evidence_approved", "securaze_imported"]).notNull(),
  summary: varchar("summary", { length: 500 }).notNull(),
  actorUserId: int("actorUserId").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
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

/** Immutable event ledger for changes to a tracked collection route. */
export const collectionAuditEvents = mysqlTable("collectionAuditEvents", {
  id: int("id").autoincrement().primaryKey(),
  collectionId: int("collectionId").notNull(),
  eventType: mysqlEnum("eventType", ["route_created", "status_changed", "customer_access_changed", "invitation_sent", "invitation_revoked", "attachment_uploaded", "attachment_removed"]).notNull(),
  summary: varchar("summary", { length: 600 }).notNull(),
  customerVisible: boolean("customerVisible").default(false).notNull(),
  actorUserId: int("actorUserId").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type CustomerOrganisation = typeof customerOrganisations.$inferSelect;
export type CustomerOrganisationMember = typeof customerOrganisationMembers.$inferSelect;
export type CustomerPortalInvitation = typeof customerPortalInvitations.$inferSelect;
export type CollectionTrack = typeof collectionTracks.$inferSelect;
export type ItadJob = typeof itadJobs.$inferSelect;
export type ItadJobAsset = typeof itadJobAssets.$inferSelect;
export type ItadJobEvidenceRecord = typeof itadJobEvidenceRecords.$inferSelect;
export type ItadJobImportBatch = typeof itadJobImportBatches.$inferSelect;
export type ItadJobImportException = typeof itadJobImportExceptions.$inferSelect;
export type ItadJobComment = typeof itadJobComments.$inferSelect;
export type ItadJobException = typeof itadJobExceptions.$inferSelect;
export type ItadJobActivityEvent = typeof itadJobActivityEvents.$inferSelect;
export type CollectionAttachment = typeof collectionAttachments.$inferSelect;
export type CollectionAuditEvent = typeof collectionAuditEvents.$inferSelect;
