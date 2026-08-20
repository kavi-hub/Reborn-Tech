import { and, asc, count, desc, eq, gt, inArray, isNotNull, like, or } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { assessmentRequests, collectionAttachments, collectionAuditEvents, collectionTracks, customerOrganisationMembers, customerOrganisations, customerPortalInvitations, InsertAssessmentRequest, InsertUser, itadJobActivityEvents, itadJobAssets, itadJobComments, itadJobEvidenceRecords, itadJobExceptions, itadJobImportBatches, itadJobImportExceptions, itadJobs, users } from "../drizzle/schema";
import { ENV } from './_core/env';
import { DEFAULT_ITAD_BRAND, type ItadBrand, type ItadJobStage } from "../shared/itadCore";

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
    if (user.email) {
      await claimPendingInvitationsForEmail(user.openId, user.email);
    }
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

async function claimPendingInvitationsForEmail(openId: string, email: string) {
  const db = await getDb();
  if (!db) return;
  const currentUser = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  if (!currentUser[0]) return;
  const now = new Date();
  const invitations = await db.select().from(customerPortalInvitations).where(and(eq(customerPortalInvitations.email, email.toLowerCase()), eq(customerPortalInvitations.status, "pending"), gt(customerPortalInvitations.expiresAt, now)));
  for (const invitation of invitations) {
    await claimInvitationRecord(invitation, currentUser[0].id, now);
  }
}

async function claimInvitationRecord(invitation: typeof customerPortalInvitations.$inferSelect, userId: number, claimedAt: Date) {
  const db = await getDb();
  if (!db) throw new Error("Customer portal storage is temporarily unavailable");
  const existingMembership = await db.select().from(customerOrganisationMembers).where(and(eq(customerOrganisationMembers.organisationId, invitation.organisationId), eq(customerOrganisationMembers.userId, userId))).limit(1);
  if (existingMembership[0]) {
    await db.update(customerOrganisationMembers).set({ role: invitation.role }).where(eq(customerOrganisationMembers.id, existingMembership[0].id));
  } else {
    await db.insert(customerOrganisationMembers).values({ organisationId: invitation.organisationId, userId, role: invitation.role });
  }
  await db.update(customerPortalInvitations).set({ status: "claimed", claimedByUserId: userId, claimedAt }).where(eq(customerPortalInvitations.id, invitation.id));
}

export async function claimCustomerPortalInvitation(input: { token: string; userId: number; email: string | null }) {
  if (!input.email) throw new Error("Your signed-in account does not have a work email");
  const db = await getDb();
  if (!db) throw new Error("Customer portal storage is temporarily unavailable");
  const invitation = await db.select().from(customerPortalInvitations).where(eq(customerPortalInvitations.token, input.token)).limit(1);
  if (!invitation[0]) throw new Error("This portal invitation is not recognised");
  if (invitation[0].status === "claimed" && invitation[0].claimedByUserId === input.userId) return { alreadyClaimed: true };
  if (invitation[0].status !== "pending" || invitation[0].expiresAt <= new Date()) throw new Error("This portal invitation is no longer active");
  if (invitation[0].email !== input.email.toLowerCase()) throw new Error("Please sign in with the work email that received this invitation");
  await claimInvitationRecord(invitation[0], input.userId, new Date());
  return { alreadyClaimed: false };
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

export async function createAssessmentRequest(request: InsertAssessmentRequest): Promise<void> {
  const db = await getDb();
  if (!db) {
    throw new Error("Assessment storage is temporarily unavailable");
  }

  await db.insert(assessmentRequests).values(request);
}

export type AssessmentListOptions = {
  search?: string;
  status?: "new" | "contacted" | "qualified" | "closed";
  page: number;
  limit: number;
  sort: "newest" | "oldest";
};

export async function listAssessmentRequests(options: AssessmentListOptions) {
  const db = await getDb();
  if (!db) throw new Error("Assessment storage is temporarily unavailable");

  const clauses = [];
  if (options.status) clauses.push(eq(assessmentRequests.status, options.status));
  if (options.search?.trim()) {
    const term = `%${options.search.trim()}%`;
    clauses.push(or(
      like(assessmentRequests.fullName, term),
      like(assessmentRequests.email, term),
      like(assessmentRequests.organisation, term),
      like(assessmentRequests.sitePostcode, term),
    ));
  }
  const where = clauses.length ? and(...clauses) : undefined;
  const ordering = options.sort === "oldest" ? asc(assessmentRequests.createdAt) : desc(assessmentRequests.createdAt);
  const [items, totalResult, grouped] = await Promise.all([
    db.select().from(assessmentRequests).where(where).orderBy(ordering).limit(options.limit).offset((options.page - 1) * options.limit),
    db.select({ total: count() }).from(assessmentRequests).where(where),
    db.select({ status: assessmentRequests.status, total: count() }).from(assessmentRequests).groupBy(assessmentRequests.status),
  ]);

  const statusCounts = { new: 0, contacted: 0, qualified: 0, closed: 0 };
  grouped.forEach((entry) => { statusCounts[entry.status] = Number(entry.total); });
  return { items, total: Number(totalResult[0]?.total ?? 0), statusCounts };
}

export async function exportAssessmentRequests(options: Pick<AssessmentListOptions, "search" | "status" | "sort">) {
  const result = await listAssessmentRequests({ ...options, page: 1, limit: 5_000 });
  return result.items;
}

export async function updateAssessmentStatus(id: number, status: "new" | "contacted" | "qualified" | "closed") {
  const db = await getDb();
  if (!db) throw new Error("Assessment storage is temporarily unavailable");
  await db.update(assessmentRequests).set({ status }).where(eq(assessmentRequests.id, id));
}

export async function deleteAssessmentRequest(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Assessment storage is temporarily unavailable");
  await db.delete(assessmentRequests).where(eq(assessmentRequests.id, id));
}

export type CollectionStatus = "planned" | "confirmed" | "collected" | "processing" | "outcome_reported";
const jobStageForCollectionStatus: Record<CollectionStatus, ItadJobStage> = { planned: "planned_collection", confirmed: "planned_collection", collected: "received", processing: "processing", outcome_reported: "client_published" };

export async function getOrCreateCustomerOrganisation(name: string) {
  const db = await getDb();
  if (!db) throw new Error("Customer portal storage is temporarily unavailable");
  const existing = await db.select().from(customerOrganisations).where(eq(customerOrganisations.name, name)).limit(1);
  if (existing[0]) return existing[0];
  await db.insert(customerOrganisations).values({ name });
  const created = await db.select().from(customerOrganisations).where(eq(customerOrganisations.name, name)).limit(1);
  if (!created[0]) throw new Error("Customer organisation could not be created");
  return created[0];
}

export async function createCollectionTrack(input: {
  organisationName: string;
  brand?: ItadBrand;
  reference: string;
  title: string;
  status: CollectionStatus;
  scheduledFor?: Date;
  collectionPostcode?: string;
  customerNote?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Customer portal storage is temporarily unavailable");
  const organisation = await getOrCreateCustomerOrganisation(input.organisationName);
  await db.insert(collectionTracks).values({
    organisationId: organisation.id,
    brand: input.brand ?? DEFAULT_ITAD_BRAND,
    reference: input.reference,
    title: input.title,
    status: input.status,
    scheduledFor: input.scheduledFor ?? null,
    collectionPostcode: input.collectionPostcode || null,
    customerNote: input.customerNote || null,
  });
  const created = await db.select().from(collectionTracks)
    .where(and(eq(collectionTracks.organisationId, organisation.id), eq(collectionTracks.reference, input.reference), eq(collectionTracks.brand, input.brand ?? DEFAULT_ITAD_BRAND)))
    .orderBy(desc(collectionTracks.createdAt)).limit(1);
  if (!created[0]) throw new Error("Collection route could not be created");
  await db.insert(itadJobs).values({ organisationId: organisation.id, brand: created[0].brand, jobReference: created[0].reference, title: created[0].title, stage: jobStageForCollectionStatus[created[0].status] });
  const job = await db.select().from(itadJobs).where(and(eq(itadJobs.organisationId, organisation.id), eq(itadJobs.brand, created[0].brand), eq(itadJobs.jobReference, created[0].reference))).orderBy(desc(itadJobs.createdAt)).limit(1);
  if (!job[0]) throw new Error("ITAD Core Job could not be created");
  await db.update(collectionTracks).set({ jobId: job[0].id }).where(eq(collectionTracks.id, created[0].id));
  return { ...created[0], jobId: job[0].id };
}

export async function listAdminCollections(brand: ItadBrand = DEFAULT_ITAD_BRAND) {
  const db = await getDb();
  if (!db) throw new Error("Customer portal storage is temporarily unavailable");
  return db.select({ collection: collectionTracks, organisation: customerOrganisations, job: itadJobs }).from(collectionTracks)
    .innerJoin(customerOrganisations, eq(collectionTracks.organisationId, customerOrganisations.id))
    .leftJoin(itadJobs, eq(collectionTracks.jobId, itadJobs.id))
    .where(eq(collectionTracks.brand, brand))
    .orderBy(desc(collectionTracks.createdAt));
}

export async function updateCollectionStatus(id: number, status: CollectionStatus, brand: ItadBrand = DEFAULT_ITAD_BRAND) {
  const db = await getDb();
  if (!db) throw new Error("Customer portal storage is temporarily unavailable");
  await db.update(collectionTracks).set({ status }).where(and(eq(collectionTracks.id, id), eq(collectionTracks.brand, brand)));
  const updated = await db.select({ collection: collectionTracks, organisation: customerOrganisations }).from(collectionTracks)
    .innerJoin(customerOrganisations, eq(collectionTracks.organisationId, customerOrganisations.id))
    .where(and(eq(collectionTracks.id, id), eq(collectionTracks.brand, brand))).limit(1);
  if (!updated[0]) throw new Error("Collection route could not be found");
  if (updated[0].collection.jobId) await db.update(itadJobs).set({ stage: jobStageForCollectionStatus[status] }).where(eq(itadJobs.id, updated[0].collection.jobId));
  return updated[0];
}

async function getItadJobForBrand(jobId: number, brand: ItadBrand) {
  const db = await getDb();
  if (!db) throw new Error("ITAD Core storage is temporarily unavailable");
  const job = await db.select().from(itadJobs).where(and(eq(itadJobs.id, jobId), eq(itadJobs.brand, brand))).limit(1);
  if (!job[0]) throw new Error("ITAD Core Job could not be found in this brand workspace");
  return job[0];
}

export async function getItadJobDetail(jobId: number, brand: ItadBrand = DEFAULT_ITAD_BRAND) {
  const db = await getDb();
  if (!db) throw new Error("ITAD Core storage is temporarily unavailable");
  const job = await getItadJobForBrand(jobId, brand);
  const [assets, evidence, importBatches, comments, exceptions, activity] = await Promise.all([
    db.select().from(itadJobAssets).where(and(eq(itadJobAssets.jobId, jobId), eq(itadJobAssets.brand, brand))).orderBy(desc(itadJobAssets.createdAt)),
    db.select().from(itadJobEvidenceRecords).where(and(eq(itadJobEvidenceRecords.jobId, jobId), eq(itadJobEvidenceRecords.brand, brand))).orderBy(desc(itadJobEvidenceRecords.createdAt)),
    db.select().from(itadJobImportBatches).where(and(eq(itadJobImportBatches.jobId, jobId), eq(itadJobImportBatches.brand, brand))).orderBy(desc(itadJobImportBatches.importedAt)),
    db.select().from(itadJobComments).where(and(eq(itadJobComments.jobId, jobId), eq(itadJobComments.brand, brand))).orderBy(desc(itadJobComments.createdAt)),
    db.select().from(itadJobExceptions).where(and(eq(itadJobExceptions.jobId, jobId), eq(itadJobExceptions.brand, brand))).orderBy(desc(itadJobExceptions.updatedAt)),
    db.select().from(itadJobActivityEvents).where(and(eq(itadJobActivityEvents.jobId, jobId), eq(itadJobActivityEvents.brand, brand))).orderBy(desc(itadJobActivityEvents.createdAt)).limit(30),
  ]);
  const operatorIds = Array.from(new Set([...comments.map((row) => row.createdByUserId), ...activity.map((row) => row.actorUserId), ...exceptions.flatMap((row) => [row.createdByUserId, row.ownerUserId, row.resolvedByUserId].filter((id): id is number => typeof id === "number"))]));
  const operators = operatorIds.length ? await db.select({ id: users.id, name: users.name, email: users.email }).from(users).where(inArray(users.id, operatorIds)) : [];
  const operatorNames = new Map(operators.map((operator) => [operator.id, operator.name || operator.email || `Operator #${operator.id}`]));
  return { job, assets, evidence, importBatches, comments: comments.map((row) => ({ ...row, actorName: operatorNames.get(row.createdByUserId) || `Operator #${row.createdByUserId}` })), exceptions: exceptions.map((row) => ({ ...row, ownerName: row.ownerUserId ? operatorNames.get(row.ownerUserId) || `Operator #${row.ownerUserId}` : "Unassigned" })), activity: activity.map((row) => ({ ...row, actorName: operatorNames.get(row.actorUserId) || `Operator #${row.actorUserId}` })) };
}

export async function createItadJobAsset(input: { jobId: number; brand: ItadBrand; assetCategory: string; manufacturer?: string; model?: string; assetTag?: string; serialNumber?: string; quantity: number; condition: "unassessed" | "working" | "repairable" | "parts_only" | "recycling"; dataHandlingState: "not_recorded" | "evidence_pending" | "evidence_recorded" | "exception"; sourceImportBatchId?: number; sourceRowNumber?: number; sourceResult?: string }) {
  const db = await getDb();
  if (!db) throw new Error("ITAD Core storage is temporarily unavailable");
  await getItadJobForBrand(input.jobId, input.brand);
  await db.insert(itadJobAssets).values(input);
  const created = await db.select().from(itadJobAssets).where(and(eq(itadJobAssets.jobId, input.jobId), eq(itadJobAssets.brand, input.brand), eq(itadJobAssets.assetCategory, input.assetCategory))).orderBy(desc(itadJobAssets.createdAt)).limit(1);
  if (!created[0]) throw new Error("Asset inventory record could not be created");
  return created[0];
}

export async function createItadJobAssetsFromImport(input: { jobId: number; brand: ItadBrand; sourceImportBatchId: number; rows: Array<{ assetCategory: string; manufacturer?: string; model?: string; assetTag?: string; serialNumber?: string; quantity: number; sourceRowNumber: number; sourceResult?: string; dataHandlingState: "not_recorded" | "evidence_pending" }> }) {
  const db = await getDb();
  if (!db) throw new Error("ITAD Core storage is temporarily unavailable");
  await getItadJobForBrand(input.jobId, input.brand);
  if (!input.rows.length) return 0;
  await db.insert(itadJobAssets).values(input.rows.map((row) => ({ ...row, jobId: input.jobId, brand: input.brand, sourceImportBatchId: input.sourceImportBatchId, condition: "unassessed" as const })));
  return input.rows.length;
}

export async function createSecurazeImportExceptions(input: { importBatchId: number; jobId: number; brand: ItadBrand; rows: Array<{ rowNumber: number; code: "missing_serial" | "missing_result" | "duplicate_serial"; message: string }> }) {
  const db = await getDb();
  if (!db) throw new Error("ITAD Core storage is temporarily unavailable");
  await getItadJobForBrand(input.jobId, input.brand);
  if (!input.rows.length) return 0;
  await db.insert(itadJobImportExceptions).values(input.rows.map((row) => ({ importBatchId: input.importBatchId, jobId: input.jobId, brand: input.brand, sourceRowNumber: row.rowNumber, code: row.code, message: row.message })));
  return input.rows.length;
}

export async function listSecurazeImportExceptions(input: { jobId: number; brand: ItadBrand; importBatchId?: number }) {
  const db = await getDb();
  if (!db) throw new Error("ITAD Core storage is temporarily unavailable");
  await getItadJobForBrand(input.jobId, input.brand);
  const conditions = [eq(itadJobImportExceptions.jobId, input.jobId), eq(itadJobImportExceptions.brand, input.brand)];
  if (input.importBatchId) conditions.push(eq(itadJobImportExceptions.importBatchId, input.importBatchId));
  return db.select({ exception: itadJobImportExceptions, importBatch: itadJobImportBatches }).from(itadJobImportExceptions).innerJoin(itadJobImportBatches, eq(itadJobImportExceptions.importBatchId, itadJobImportBatches.id)).where(and(...conditions)).orderBy(desc(itadJobImportExceptions.sourceRowNumber));
}

export async function findOperationsAdminByEmail(email: string) {
  const db = await getDb();
  if (!db) throw new Error("Operations user storage is temporarily unavailable");
  const user = await db.select().from(users).where(and(eq(users.email, email.toLowerCase()), eq(users.role, "admin"))).limit(1);
  return user[0] ?? null;
}

export async function getOperationsUserById(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Operations user storage is temporarily unavailable");
  const user = await db.select().from(users).where(and(eq(users.id, userId), eq(users.role, "admin"))).limit(1);
  return user[0] ?? null;
}

export async function createItadJobEvidenceRecord(input: { jobId: number; assetId?: number; brand: ItadBrand; evidenceType: "data_erasure" | "collection_manifest" | "reuse_outcome" | "recycling_outcome" | "other"; certificateReference?: string; issuer?: string; verificationState: "recorded" | "reviewed" | "verified" | "exception"; evidenceDate?: Date; fileName?: string; contentType?: string; sizeBytes?: number; storageKey?: string; customerVisible: boolean; createdByUserId: number }) {
  const db = await getDb();
  if (!db) throw new Error("ITAD Core storage is temporarily unavailable");
  await getItadJobForBrand(input.jobId, input.brand);
  if (input.assetId) {
    const asset = await db.select().from(itadJobAssets).where(and(eq(itadJobAssets.id, input.assetId), eq(itadJobAssets.jobId, input.jobId), eq(itadJobAssets.brand, input.brand))).limit(1);
    if (!asset[0]) throw new Error("Asset inventory record could not be found in this Core Job");
  }
  await db.insert(itadJobEvidenceRecords).values({ ...input, customerVisible: false, customerApprovedAt: null, customerApprovedByUserId: null, assetId: input.assetId ?? null, evidenceDate: input.evidenceDate ?? null, fileName: input.fileName ?? null, contentType: input.contentType ?? null, sizeBytes: input.sizeBytes ?? null, storageKey: input.storageKey ?? null });
  const created = await db.select().from(itadJobEvidenceRecords).where(and(eq(itadJobEvidenceRecords.jobId, input.jobId), eq(itadJobEvidenceRecords.brand, input.brand))).orderBy(desc(itadJobEvidenceRecords.createdAt)).limit(1);
  if (!created[0]) throw new Error("Evidence record could not be created");
  return created[0];
}

export async function createSecurazeImportBatch(input: { jobId: number; brand: ItadBrand; importReference?: string; status: "recorded" | "review_required" | "accepted" | "rejected"; sourceFileName?: string; sourceContentType?: string; sourceSizeBytes?: number; storageKey?: string; reportedRecordCount?: number; importedRecordCount: number; exceptionCount: number; mappingVersion?: string; fieldMapping?: string; sourceHeaderSummary?: string; importedByUserId: number }) {
  const db = await getDb();
  if (!db) throw new Error("ITAD Core storage is temporarily unavailable");
  await getItadJobForBrand(input.jobId, input.brand);
  await db.insert(itadJobImportBatches).values({ ...input, source: "securaze", importReference: input.importReference ?? null, sourceFileName: input.sourceFileName ?? null, sourceContentType: input.sourceContentType ?? null, sourceSizeBytes: input.sourceSizeBytes ?? null, storageKey: input.storageKey ?? null, reportedRecordCount: input.reportedRecordCount ?? null, mappingVersion: input.mappingVersion ?? "securaze_csv_v1", fieldMapping: input.fieldMapping ?? null, sourceHeaderSummary: input.sourceHeaderSummary ?? null });
  const created = await db.select().from(itadJobImportBatches).where(and(eq(itadJobImportBatches.jobId, input.jobId), eq(itadJobImportBatches.brand, input.brand))).orderBy(desc(itadJobImportBatches.importedAt)).limit(1);
  if (!created[0]) throw new Error("Securaze import batch could not be recorded");
  return created[0];
}

async function createItadJobActivityEvent(input: { jobId: number; brand: ItadBrand; eventType: "comment_added" | "exception_opened" | "exception_updated" | "exception_resolved" | "evidence_approved" | "securaze_imported"; summary: string; actorUserId: number }) {
  const db = await getDb();
  if (!db) throw new Error("ITAD Core storage is temporarily unavailable");
  await db.insert(itadJobActivityEvents).values(input);
}

export async function approveItadJobEvidence(input: { evidenceId: number; jobId: number; brand: ItadBrand; approvedByUserId: number }) {
  const db = await getDb();
  if (!db) throw new Error("ITAD Core storage is temporarily unavailable");
  const evidence = await db.select().from(itadJobEvidenceRecords).where(and(eq(itadJobEvidenceRecords.id, input.evidenceId), eq(itadJobEvidenceRecords.jobId, input.jobId), eq(itadJobEvidenceRecords.brand, input.brand))).limit(1);
  if (!evidence[0]) throw new Error("Evidence record could not be found in this Core Job");
  if (!evidence[0].storageKey || !evidence[0].fileName) throw new Error("Attach a supporting file before making evidence visible to a customer");
  const approvedAt = new Date();
  await db.update(itadJobEvidenceRecords).set({ customerVisible: true, customerApprovedAt: approvedAt, customerApprovedByUserId: input.approvedByUserId }).where(eq(itadJobEvidenceRecords.id, input.evidenceId));
  await createItadJobActivityEvent({ jobId: input.jobId, brand: input.brand, eventType: "evidence_approved", summary: `Customer portal approval recorded for ${evidence[0].fileName}`, actorUserId: input.approvedByUserId });
  return { ...evidence[0], customerVisible: true, customerApprovedAt: approvedAt, customerApprovedByUserId: input.approvedByUserId };
}

export async function createItadJobComment(input: { jobId: number; brand: ItadBrand; comment: string; createdByUserId: number }) {
  const db = await getDb();
  if (!db) throw new Error("ITAD Core storage is temporarily unavailable");
  await getItadJobForBrand(input.jobId, input.brand);
  await db.insert(itadJobComments).values(input);
  await createItadJobActivityEvent({ jobId: input.jobId, brand: input.brand, eventType: "comment_added", summary: "Internal Core Job comment added", actorUserId: input.createdByUserId });
}

export async function createItadJobException(input: { jobId: number; brand: ItadBrand; title: string; detail?: string; ownerUserId: number; createdByUserId: number }) {
  const db = await getDb();
  if (!db) throw new Error("ITAD Core storage is temporarily unavailable");
  const job = await getItadJobForBrand(input.jobId, input.brand);
  await db.insert(itadJobExceptions).values({ ...input, detail: input.detail ?? null, status: "open" });
  await createItadJobActivityEvent({ jobId: input.jobId, brand: input.brand, eventType: "exception_opened", summary: `Exception opened: ${input.title}`, actorUserId: input.createdByUserId });
  return { job, title: input.title, ownerUserId: input.ownerUserId };
}

export async function updateItadJobException(input: { exceptionId: number; jobId: number; brand: ItadBrand; status: "open" | "in_progress" | "resolved"; actorUserId: number; takeOwnership: boolean; ownerUserId?: number }) {
  const db = await getDb();
  if (!db) throw new Error("ITAD Core storage is temporarily unavailable");
  const job = await getItadJobForBrand(input.jobId, input.brand);
  const exception = await db.select().from(itadJobExceptions).where(and(eq(itadJobExceptions.id, input.exceptionId), eq(itadJobExceptions.jobId, input.jobId), eq(itadJobExceptions.brand, input.brand))).limit(1);
  if (!exception[0]) throw new Error("Exception record could not be found in this Core Job");
  const resolved = input.status === "resolved";
  const ownerUserId = input.ownerUserId ?? (input.takeOwnership ? input.actorUserId : exception[0].ownerUserId);
  await db.update(itadJobExceptions).set({ status: input.status, ownerUserId, resolvedByUserId: resolved ? input.actorUserId : null, resolvedAt: resolved ? new Date() : null }).where(eq(itadJobExceptions.id, input.exceptionId));
  await createItadJobActivityEvent({ jobId: input.jobId, brand: input.brand, eventType: resolved ? "exception_resolved" : "exception_updated", summary: resolved ? `Exception resolved: ${exception[0].title}` : `Exception updated: ${exception[0].title}${input.takeOwnership ? " (ownership accepted)" : ""}`, actorUserId: input.actorUserId });
  return { job, exception: exception[0], ownerUserId };
}

export async function getItadJobEvidenceFile(input: { evidenceId: number; jobId: number; brand: ItadBrand }) {
  const db = await getDb();
  if (!db) throw new Error("ITAD Core storage is temporarily unavailable");
  const evidence = await db.select().from(itadJobEvidenceRecords).where(and(eq(itadJobEvidenceRecords.id, input.evidenceId), eq(itadJobEvidenceRecords.jobId, input.jobId), eq(itadJobEvidenceRecords.brand, input.brand))).limit(1);
  if (!evidence[0]?.storageKey || !evidence[0].fileName) throw new Error("This evidence record does not have an attached file in this Core Job");
  return evidence[0];
}

export async function createCollectionAttachment(input: { collectionId: number; attachmentType: "inventory" | "evidence"; fileName: string; contentType: string; sizeBytes: number; storageKey: string; customerVisible: boolean; uploadedByUserId: number }) {
  const db = await getDb();
  if (!db) throw new Error("Attachment storage metadata is temporarily unavailable");
  await db.insert(collectionAttachments).values(input);
}

export async function listAdminCollectionAttachments(collectionId: number) {
  const db = await getDb();
  if (!db) throw new Error("Attachment storage metadata is temporarily unavailable");
  return db.select().from(collectionAttachments).where(eq(collectionAttachments.collectionId, collectionId)).orderBy(desc(collectionAttachments.createdAt));
}

export async function getAdminCollectionAttachment(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Attachment storage metadata is temporarily unavailable");
  const attachment = await db.select().from(collectionAttachments).where(eq(collectionAttachments.id, id)).limit(1);
  if (!attachment[0]) throw new Error("Attachment not found");
  return attachment[0];
}

export async function deleteCollectionAttachment(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Attachment storage metadata is temporarily unavailable");
  await db.delete(collectionAttachments).where(eq(collectionAttachments.id, id));
}

export type CollectionAuditEventType = "route_created" | "status_changed" | "customer_access_changed" | "invitation_sent" | "invitation_revoked" | "attachment_uploaded" | "attachment_removed";

export async function createCollectionAuditEvent(input: { collectionId: number; eventType: CollectionAuditEventType; summary: string; customerVisible: boolean; actorUserId: number }) {
  const db = await getDb();
  if (!db) throw new Error("Collection audit storage is temporarily unavailable");
  await db.insert(collectionAuditEvents).values(input);
}

export async function listAdminCollectionAuditEvents(collectionId: number, page: number, pageSize: number) {
  const db = await getDb();
  if (!db) throw new Error("Collection audit storage is temporarily unavailable");
  const [{ total }] = await db.select({ total: count() }).from(collectionAuditEvents).where(eq(collectionAuditEvents.collectionId, collectionId));
  const events = await db.select({ event: collectionAuditEvents, actor: users }).from(collectionAuditEvents)
    .leftJoin(users, eq(collectionAuditEvents.actorUserId, users.id))
    .where(eq(collectionAuditEvents.collectionId, collectionId))
    .orderBy(desc(collectionAuditEvents.createdAt)).limit(pageSize).offset((page - 1) * pageSize);
  return { events, total };
}

export async function listCollectionIdsForOrganisation(organisationId: number, brand: ItadBrand = DEFAULT_ITAD_BRAND) {
  const db = await getDb();
  if (!db) throw new Error("Collection audit storage is temporarily unavailable");
  return db.select({ id: collectionTracks.id }).from(collectionTracks).where(and(eq(collectionTracks.organisationId, organisationId), eq(collectionTracks.brand, brand)));
}

export async function createCustomerPortalInvitation(input: { organisationId: number; brand?: ItadBrand; email: string; role: "admin" | "viewer"; token: string; expiresAt: Date; createdByUserId: number }) {
  const db = await getDb();
  if (!db) throw new Error("Customer portal storage is temporarily unavailable");
  const email = input.email.toLowerCase();
  const brand = input.brand ?? DEFAULT_ITAD_BRAND;
  const existing = await db.select().from(customerPortalInvitations).where(and(eq(customerPortalInvitations.organisationId, input.organisationId), eq(customerPortalInvitations.email, email), eq(customerPortalInvitations.brand, brand)));
  await Promise.all(existing.filter((invitation) => invitation.status === "pending" || invitation.status === "claimed").map((invitation) => db.update(customerPortalInvitations).set({ status: "revoked" }).where(eq(customerPortalInvitations.id, invitation.id))));
  await db.insert(customerPortalInvitations).values({ ...input, brand, email });
  const created = await db.select().from(customerPortalInvitations).where(eq(customerPortalInvitations.token, input.token)).limit(1);
  if (!created[0]) throw new Error("Customer invitation could not be created");
  return created[0];
}

export async function listOrganisationPortalInvitations(organisationId: number, brand: ItadBrand = DEFAULT_ITAD_BRAND) {
  const db = await getDb();
  if (!db) throw new Error("Customer portal storage is temporarily unavailable");
  const invitations = await db.select().from(customerPortalInvitations).where(and(eq(customerPortalInvitations.organisationId, organisationId), eq(customerPortalInvitations.brand, brand))).orderBy(desc(customerPortalInvitations.createdAt));
  const now = new Date();
  await Promise.all(invitations.filter((invitation) => (invitation.status === "pending" || invitation.status === "claimed") && invitation.expiresAt <= now).map((invitation) => db.update(customerPortalInvitations).set({ status: "expired" }).where(eq(customerPortalInvitations.id, invitation.id))));
  return invitations.map((invitation) => invitation.expiresAt <= now && (invitation.status === "pending" || invitation.status === "claimed") ? { ...invitation, status: "expired" as const } : invitation);
}

export async function getPortalInvitation(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Customer portal storage is temporarily unavailable");
  const invitation = await db.select().from(customerPortalInvitations).where(eq(customerPortalInvitations.id, id)).limit(1);
  if (!invitation[0]) throw new Error("Customer invitation could not be found");
  return invitation[0];
}

export async function recordPortalInvitationEmail(id: number, emailId: string, resend: boolean) {
  const db = await getDb();
  if (!db) throw new Error("Customer portal storage is temporarily unavailable");
  const invitation = await getPortalInvitation(id);
  await db.update(customerPortalInvitations).set({ lastSentAt: new Date(), lastEmailState: "sent", lastEmailId: emailId, resendCount: resend ? invitation.resendCount + 1 : invitation.resendCount }).where(eq(customerPortalInvitations.id, id));
}

export async function recordPortalInvitationEmailFailure(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Customer portal storage is temporarily unavailable");
  await db.update(customerPortalInvitations).set({ lastEmailState: "failed" }).where(eq(customerPortalInvitations.id, id));
}

export async function revokePortalInvitation(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Customer portal storage is temporarily unavailable");
  const invitation = await getPortalInvitation(id);
  if (invitation.status === "revoked") return invitation;
  await db.update(customerPortalInvitations).set({ status: "revoked" }).where(eq(customerPortalInvitations.id, id));
  return { ...invitation, status: "revoked" as const };
}

export async function listActivePortalInvitations(organisationId: number, brand: ItadBrand = DEFAULT_ITAD_BRAND) {
  const invitations = await listOrganisationPortalInvitations(organisationId, brand);
  return invitations.filter((invitation) => invitation.status === "pending" || invitation.status === "claimed");
}

export async function assignCustomerViewerByOrganisationAdmin(input: { actorUserId: number; organisationId: number; email: string }) {
  const db = await getDb();
  if (!db) throw new Error("Customer portal storage is temporarily unavailable");
  const actorMembership = await db.select().from(customerOrganisationMembers).where(and(eq(customerOrganisationMembers.organisationId, input.organisationId), eq(customerOrganisationMembers.userId, input.actorUserId))).limit(1);
  if (actorMembership[0]?.role !== "admin") {
    throw new Error("Only an organisation admin can grant customer portal viewer access");
  }
  const viewer = await db.select().from(users).where(eq(users.email, input.email)).limit(1);
  if (!viewer[0]) {
    throw new Error("This person needs to sign in to the portal once before access can be granted");
  }
  const existing = await db.select().from(customerOrganisationMembers).where(and(eq(customerOrganisationMembers.organisationId, input.organisationId), eq(customerOrganisationMembers.userId, viewer[0].id))).limit(1);
  if (existing[0]) {
    throw new Error("This person already has portal access for this organisation");
  }
  await db.insert(customerOrganisationMembers).values({ organisationId: input.organisationId, userId: viewer[0].id, role: "viewer" });
}

export async function getCustomerOrganisationMembership(userId: number, organisationId: number) {
  const db = await getDb();
  if (!db) throw new Error("Customer portal storage is temporarily unavailable");
  const membership = await db.select().from(customerOrganisationMembers)
    .where(and(eq(customerOrganisationMembers.organisationId, organisationId), eq(customerOrganisationMembers.userId, userId)))
    .limit(1);
  return membership[0] ?? null;
}

export async function listCustomerCollectionAttachments(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Attachment storage metadata is temporarily unavailable");
  return db.select({ attachment: collectionAttachments, collection: collectionTracks, organisation: customerOrganisations }).from(customerOrganisationMembers)
    .innerJoin(customerOrganisations, eq(customerOrganisationMembers.organisationId, customerOrganisations.id))
    .innerJoin(collectionTracks, eq(collectionTracks.organisationId, customerOrganisations.id))
    .innerJoin(collectionAttachments, eq(collectionAttachments.collectionId, collectionTracks.id))
    .where(and(eq(customerOrganisationMembers.userId, userId), eq(collectionAttachments.customerVisible, true)))
    .orderBy(desc(collectionAttachments.createdAt));
}

export async function getCustomerCollectionAttachment(userId: number, attachmentId: number) {
  const attachments = await listCustomerCollectionAttachments(userId);
  const match = attachments.find((entry) => entry.attachment.id === attachmentId);
  if (!match) throw new Error("Attachment not found or not available to your organisation");
  return match.attachment;
}

export async function listCustomerCollectionAuditEvents(userId: number, page: number, pageSize: number) {
  const db = await getDb();
  if (!db) throw new Error("Collection audit storage is temporarily unavailable");
  const conditions = and(eq(customerOrganisationMembers.userId, userId), eq(collectionAuditEvents.customerVisible, true));
  const [{ total }] = await db.select({ total: count() }).from(customerOrganisationMembers)
    .innerJoin(collectionTracks, eq(collectionTracks.organisationId, customerOrganisationMembers.organisationId))
    .innerJoin(collectionAuditEvents, eq(collectionAuditEvents.collectionId, collectionTracks.id))
    .where(conditions);
  const events = await db.select({ event: collectionAuditEvents, collection: collectionTracks }).from(customerOrganisationMembers)
    .innerJoin(collectionTracks, eq(collectionTracks.organisationId, customerOrganisationMembers.organisationId))
    .innerJoin(collectionAuditEvents, eq(collectionAuditEvents.collectionId, collectionTracks.id))
    .where(conditions)
    .orderBy(desc(collectionAuditEvents.createdAt)).limit(pageSize).offset((page - 1) * pageSize);
  return { events, total };
}

export async function listCustomerPortalCollections(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Customer portal storage is temporarily unavailable");
  return db.select({ collection: collectionTracks, organisation: customerOrganisations, member: customerOrganisationMembers }).from(customerOrganisationMembers)
    .innerJoin(customerOrganisations, eq(customerOrganisationMembers.organisationId, customerOrganisations.id))
    .innerJoin(collectionTracks, eq(collectionTracks.organisationId, customerOrganisations.id))
    .where(eq(customerOrganisationMembers.userId, userId))
    .orderBy(desc(collectionTracks.createdAt));
}

async function getActivePortalInvitation(token: string) {
  const db = await getDb();
  if (!db) throw new Error("Customer portal storage is temporarily unavailable");
  const invitation = await db.select().from(customerPortalInvitations).where(eq(customerPortalInvitations.token, token)).limit(1);
  if (!invitation[0] || invitation[0].status === "revoked") throw new Error("This invitation is not recognised");
  if (invitation[0].expiresAt <= new Date()) {
    if (invitation[0].status !== "expired") await db.update(customerPortalInvitations).set({ status: "expired" }).where(eq(customerPortalInvitations.id, invitation[0].id));
    throw new Error("This invitation has expired");
  }
  if (invitation[0].status === "pending") await db.update(customerPortalInvitations).set({ status: "claimed", claimedAt: new Date() }).where(eq(customerPortalInvitations.id, invitation[0].id));
  return invitation[0];
}

export async function getMagicPortalOverview(token: string) {
  const db = await getDb();
  if (!db) throw new Error("Customer portal storage is temporarily unavailable");
  const invitation = await getActivePortalInvitation(token);
  const organisation = await db.select().from(customerOrganisations).where(eq(customerOrganisations.id, invitation.organisationId)).limit(1);
  if (!organisation[0]) throw new Error("This invitation’s organisation is unavailable");
  const collections = await db.select().from(collectionTracks).where(and(eq(collectionTracks.organisationId, invitation.organisationId), eq(collectionTracks.brand, invitation.brand))).orderBy(desc(collectionTracks.createdAt));
  const attachments = await db.select({ attachment: collectionAttachments, collection: collectionTracks }).from(collectionTracks).innerJoin(collectionAttachments, eq(collectionAttachments.collectionId, collectionTracks.id)).where(and(eq(collectionTracks.organisationId, invitation.organisationId), eq(collectionTracks.brand, invitation.brand), eq(collectionAttachments.customerVisible, true))).orderBy(desc(collectionAttachments.createdAt));
  const events = await db.select({ event: collectionAuditEvents, collection: collectionTracks }).from(collectionTracks).innerJoin(collectionAuditEvents, eq(collectionAuditEvents.collectionId, collectionTracks.id)).where(and(eq(collectionTracks.organisationId, invitation.organisationId), eq(collectionTracks.brand, invitation.brand), eq(collectionAuditEvents.customerVisible, true))).orderBy(desc(collectionAuditEvents.createdAt)).limit(20);
  const coreEvidence = await db.select({ evidence: itadJobEvidenceRecords, job: itadJobs }).from(itadJobs).innerJoin(itadJobEvidenceRecords, eq(itadJobEvidenceRecords.jobId, itadJobs.id)).where(and(eq(itadJobs.organisationId, invitation.organisationId), eq(itadJobs.brand, invitation.brand), eq(itadJobEvidenceRecords.brand, invitation.brand), eq(itadJobEvidenceRecords.customerVisible, true), isNotNull(itadJobEvidenceRecords.customerApprovedAt))).orderBy(desc(itadJobEvidenceRecords.customerApprovedAt));
  return { organisation: organisation[0], role: invitation.role, collections, attachments, events, coreEvidence, expiresAt: invitation.expiresAt };
}

export async function getMagicPortalAttachment(token: string, attachmentId: number) {
  const db = await getDb();
  if (!db) throw new Error("Attachment storage metadata is temporarily unavailable");
  const invitation = await getActivePortalInvitation(token);
  const attachment = await db.select({ attachment: collectionAttachments }).from(collectionTracks).innerJoin(collectionAttachments, eq(collectionAttachments.collectionId, collectionTracks.id)).where(and(eq(collectionTracks.organisationId, invitation.organisationId), eq(collectionTracks.brand, invitation.brand), eq(collectionAttachments.id, attachmentId), eq(collectionAttachments.customerVisible, true))).limit(1);
  if (!attachment[0]) throw new Error("This file is not available through the invitation link");
  return attachment[0].attachment;
}

export async function getMagicPortalCoreEvidence(token: string, evidenceId: number) {
  const db = await getDb();
  if (!db) throw new Error("ITAD Core storage is temporarily unavailable");
  const invitation = await getActivePortalInvitation(token);
  const evidence = await db.select({ evidence: itadJobEvidenceRecords }).from(itadJobs).innerJoin(itadJobEvidenceRecords, eq(itadJobEvidenceRecords.jobId, itadJobs.id)).where(and(eq(itadJobs.organisationId, invitation.organisationId), eq(itadJobs.brand, invitation.brand), eq(itadJobEvidenceRecords.brand, invitation.brand), eq(itadJobEvidenceRecords.id, evidenceId), eq(itadJobEvidenceRecords.customerVisible, true), isNotNull(itadJobEvidenceRecords.customerApprovedAt))).limit(1);
  if (!evidence[0]?.evidence.storageKey || !evidence[0].evidence.fileName) throw new Error("This Core evidence file is not available through the invitation link");
  return evidence[0].evidence;
}
