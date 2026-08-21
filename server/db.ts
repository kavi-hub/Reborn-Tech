import { and, asc, count, desc, eq, gt, gte, inArray, isNotNull, like, lte, or } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { createHash, randomBytes } from "node:crypto";
import { assessmentRequests, brandSupportContacts, clientNotificationEvents, collectionAttachments, collectionAuditEvents, collectionTracks, customerOrganisationMembers, customerOrganisations, customerPortalAccountActivityEvents, customerPortalAccounts, customerPortalInvitations, InsertAssessmentRequest, InsertUser, itadJobActivityEvents, itadJobAssets, itadJobComments, itadJobEvidenceRecords, itadJobExceptions, itadJobImpactStatements, itadJobImportBatches, itadJobImportExceptions, itadJobs, users } from "../drizzle/schema";
import { ENV } from './_core/env';
import { DEFAULT_ITAD_BRAND, type ItadBrand, type ItadJobStage } from "../shared/itadCore";
import { calculateCoreJobExceptionKpis } from "../shared/coreJobKpis";

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

export async function getClientAccountActivationInvitation(token: string) {
  const db = await getDb();
  if (!db) throw new Error("Customer portal storage is temporarily unavailable");
  const invitation = await db.select().from(customerPortalInvitations).where(eq(customerPortalInvitations.token, token)).limit(1);
  if (!invitation[0] || invitation[0].status === "revoked") throw new Error("This client access invitation is not recognised");
  if (invitation[0].expiresAt <= new Date()) {
    if (invitation[0].status !== "expired") await db.update(customerPortalInvitations).set({ status: "expired" }).where(eq(customerPortalInvitations.id, invitation[0].id));
    throw new Error("This client access invitation has expired");
  }
  return invitation[0];
}

export async function activateClientPortalAccount(input: { token: string; passwordHash: string }) {
  const db = await getDb();
  if (!db) throw new Error("Customer portal storage is temporarily unavailable");
  const invitation = await getClientAccountActivationInvitation(input.token);
  const email = invitation.email.toLowerCase();
  const existing = await db.select().from(customerPortalAccounts).where(eq(customerPortalAccounts.email, email)).limit(1);
  if (existing[0]) throw new Error("This work email already has client portal access. Please sign in instead.");
  await db.insert(customerPortalAccounts).values({ organisationId: invitation.organisationId, brand: invitation.brand, email, role: invitation.role, passwordHash: input.passwordHash, activatedFromInvitationId: invitation.id, lastSignedInAt: new Date() });
  const account = await db.select().from(customerPortalAccounts).where(eq(customerPortalAccounts.email, email)).limit(1);
  await db.update(customerPortalInvitations).set({ status: "claimed", claimedAt: new Date() }).where(eq(customerPortalInvitations.id, invitation.id));
  if (!account[0]) throw new Error("Client portal account could not be activated");
  await recordClientPortalAccountActivity({ accountId: account[0].id, action: "activated", summary: "Client account activated from secure invitation" });
  return account[0];
}

export async function getClientPortalAccountByEmail(email: string) {
  const db = await getDb();
  if (!db) throw new Error("Customer portal storage is temporarily unavailable");
  const account = await db.select().from(customerPortalAccounts).where(eq(customerPortalAccounts.email, email.toLowerCase())).limit(1);
  return account[0] ?? null;
}

export async function getClientPortalAccountById(accountId: number) {
  const db = await getDb();
  if (!db) throw new Error("Customer portal storage is temporarily unavailable");
  const account = await db.select().from(customerPortalAccounts).where(eq(customerPortalAccounts.id, accountId)).limit(1);
  return account[0] ?? null;
}

export async function getClientPortalAccountForBrand(accountId: number, brand: ItadBrand) {
  const db = await getDb();
  if (!db) throw new Error("Customer portal storage is temporarily unavailable");
  const account = await db.select().from(customerPortalAccounts).where(and(eq(customerPortalAccounts.id, accountId), eq(customerPortalAccounts.brand, brand))).limit(1);
  return account[0] ?? null;
}

export async function recordClientPortalSignIn(accountId: number) {
  const db = await getDb();
  if (!db) throw new Error("Customer portal storage is temporarily unavailable");
  await db.update(customerPortalAccounts).set({ lastSignedInAt: new Date() }).where(eq(customerPortalAccounts.id, accountId));
  await recordClientPortalAccountActivity({ accountId, action: "signed_in", summary: "Client signed in to their dashboard" });
}

export async function getActiveClientPortalAccountForSession(input: { accountId: number; organisationId: number; brand: ItadBrand; email: string; sessionVersion: number }) {
  const account = await getClientPortalAccountById(input.accountId);
  if (!account || account.status !== "active" || account.organisationId !== input.organisationId || account.brand !== input.brand || account.email !== input.email || account.sessionVersion !== input.sessionVersion) return null;
  return account;
}

async function recordClientPortalAccountActivity(input: { accountId: number; action: "activated" | "signed_in" | "reset_requested" | "password_reset" | "disabled" | "enabled"; summary: string; actorUserId?: number | null }) {
  const db = await getDb();
  if (!db) throw new Error("Customer portal storage is temporarily unavailable");
  await db.insert(customerPortalAccountActivityEvents).values({ accountId: input.accountId, action: input.action, summary: input.summary, actorUserId: input.actorUserId ?? null });
}

export async function listClientPortalAccounts(brand: ItadBrand, filter: "all" | "disabled" | "reset_pending" = "all") {
  const db = await getDb();
  if (!db) throw new Error("Customer portal storage is temporarily unavailable");
  const statusFilter = filter === "disabled" ? eq(customerPortalAccounts.status, "disabled") : filter === "reset_pending" ? and(eq(customerPortalAccounts.status, "active"), isNotNull(customerPortalAccounts.resetTokenHash), gt(customerPortalAccounts.resetExpiresAt, new Date())) : undefined;
  return db.select({ account: customerPortalAccounts, organisation: customerOrganisations }).from(customerPortalAccounts)
    .innerJoin(customerOrganisations, eq(customerOrganisations.id, customerPortalAccounts.organisationId))
    .where(statusFilter ? and(eq(customerPortalAccounts.brand, brand), statusFilter) : eq(customerPortalAccounts.brand, brand)).orderBy(desc(customerPortalAccounts.updatedAt));
}

export async function listClientPortalAccountActivity(brand: ItadBrand, limit = 80) {
  const db = await getDb();
  if (!db) throw new Error("Customer portal storage is temporarily unavailable");
  return db.select({ event: customerPortalAccountActivityEvents, account: { id: customerPortalAccounts.id, email: customerPortalAccounts.email }, organisation: { id: customerOrganisations.id, name: customerOrganisations.name }, actorName: users.name }).from(customerPortalAccountActivityEvents)
    .innerJoin(customerPortalAccounts, eq(customerPortalAccounts.id, customerPortalAccountActivityEvents.accountId))
    .innerJoin(customerOrganisations, eq(customerOrganisations.id, customerPortalAccounts.organisationId))
    .leftJoin(users, eq(users.id, customerPortalAccountActivityEvents.actorUserId))
    .where(eq(customerPortalAccounts.brand, brand)).orderBy(desc(customerPortalAccountActivityEvents.createdAt)).limit(limit);
}

export async function getBrandSupportContact(brand: ItadBrand) {
  const db = await getDb();
  if (!db) throw new Error("Customer portal storage is temporarily unavailable");
  const rows = await db.select().from(brandSupportContacts).where(eq(brandSupportContacts.brand, brand)).limit(1);
  return rows[0] ?? null;
}

export async function upsertBrandSupportContact(input: { brand: ItadBrand; contactName: string; email: string; phone?: string | null; updatedByUserId: number }) {
  const db = await getDb();
  if (!db) throw new Error("Customer portal storage is temporarily unavailable");
  await db.insert(brandSupportContacts).values({ brand: input.brand, contactName: input.contactName, email: input.email.toLowerCase(), phone: input.phone || null, updatedByUserId: input.updatedByUserId }).onDuplicateKeyUpdate({ set: { contactName: input.contactName, email: input.email.toLowerCase(), phone: input.phone || null, updatedByUserId: input.updatedByUserId, updatedAt: new Date() } });
  return getBrandSupportContact(input.brand);
}

export async function createClientPasswordResetToken(input: { email: string; actorUserId?: number | null }) {
  const account = await getClientPortalAccountByEmail(input.email);
  if (!account || account.status !== "active") return null;
  const db = await getDb();
  if (!db) throw new Error("Customer portal storage is temporarily unavailable");
  const token = randomBytes(32).toString("base64url");
  const resetTokenHash = createHash("sha256").update(token).digest("hex");
  const resetExpiresAt = new Date(Date.now() + 60 * 60 * 1000);
  await db.update(customerPortalAccounts).set({ resetTokenHash, resetExpiresAt }).where(eq(customerPortalAccounts.id, account.id));
  await recordClientPortalAccountActivity({ accountId: account.id, action: "reset_requested", summary: input.actorUserId ? "Client password reset issued by Operations" : "Client password reset requested", actorUserId: input.actorUserId });
  return { account, token, resetExpiresAt };
}

export async function resetClientPortalPassword(input: { tokenHash: string; passwordHash: string }) {
  const db = await getDb();
  if (!db) throw new Error("Customer portal storage is temporarily unavailable");
  const accounts = await db.select().from(customerPortalAccounts).where(and(eq(customerPortalAccounts.resetTokenHash, input.tokenHash), gt(customerPortalAccounts.resetExpiresAt, new Date()), eq(customerPortalAccounts.status, "active"))).limit(1);
  const account = accounts[0];
  if (!account) throw new Error("This password reset link is invalid or has expired");
  await db.update(customerPortalAccounts).set({ passwordHash: input.passwordHash, resetTokenHash: null, resetExpiresAt: null, sessionVersion: account.sessionVersion + 1 }).where(eq(customerPortalAccounts.id, account.id));
  await recordClientPortalAccountActivity({ accountId: account.id, action: "password_reset", summary: "Client password reset completed" });
  return { ...account, sessionVersion: account.sessionVersion + 1 };
}

export async function setClientPortalAccountStatus(input: { accountId: number; brand: ItadBrand; status: "active" | "disabled"; actorUserId: number }) {
  const db = await getDb();
  if (!db) throw new Error("Customer portal storage is temporarily unavailable");
  const accounts = await db.select().from(customerPortalAccounts).where(and(eq(customerPortalAccounts.id, input.accountId), eq(customerPortalAccounts.brand, input.brand))).limit(1);
  const account = accounts[0];
  if (!account) throw new Error("Client account could not be found in this brand workspace");
  const sessionVersion = account.sessionVersion + 1;
  await db.update(customerPortalAccounts).set({ status: input.status, disabledAt: input.status === "disabled" ? new Date() : null, disabledByUserId: input.status === "disabled" ? input.actorUserId : null, sessionVersion }).where(eq(customerPortalAccounts.id, account.id));
  await recordClientPortalAccountActivity({ accountId: account.id, action: input.status === "disabled" ? "disabled" : "enabled", summary: input.status === "disabled" ? "Client account disabled by Operations" : "Client account re-enabled by Operations", actorUserId: input.actorUserId });
  return { ...account, status: input.status, sessionVersion };
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
  const [assets, evidence, importBatches, comments, exceptions, activity, impactStatements] = await Promise.all([
    db.select().from(itadJobAssets).where(and(eq(itadJobAssets.jobId, jobId), eq(itadJobAssets.brand, brand))).orderBy(desc(itadJobAssets.createdAt)),
    db.select().from(itadJobEvidenceRecords).where(and(eq(itadJobEvidenceRecords.jobId, jobId), eq(itadJobEvidenceRecords.brand, brand))).orderBy(desc(itadJobEvidenceRecords.createdAt)),
    db.select().from(itadJobImportBatches).where(and(eq(itadJobImportBatches.jobId, jobId), eq(itadJobImportBatches.brand, brand))).orderBy(desc(itadJobImportBatches.importedAt)),
    db.select().from(itadJobComments).where(and(eq(itadJobComments.jobId, jobId), eq(itadJobComments.brand, brand))).orderBy(desc(itadJobComments.createdAt)),
    db.select().from(itadJobExceptions).where(and(eq(itadJobExceptions.jobId, jobId), eq(itadJobExceptions.brand, brand))).orderBy(desc(itadJobExceptions.updatedAt)),
    db.select().from(itadJobActivityEvents).where(and(eq(itadJobActivityEvents.jobId, jobId), eq(itadJobActivityEvents.brand, brand))).orderBy(desc(itadJobActivityEvents.createdAt)).limit(30),
    db.select().from(itadJobImpactStatements).where(and(eq(itadJobImpactStatements.jobId, jobId), eq(itadJobImpactStatements.brand, brand))).orderBy(desc(itadJobImpactStatements.updatedAt)).limit(1),
  ]);
  const operatorIds = Array.from(new Set([...comments.map((row) => row.createdByUserId), ...activity.map((row) => row.actorUserId), ...exceptions.flatMap((row) => [row.createdByUserId, row.ownerUserId, row.resolvedByUserId].filter((id): id is number => typeof id === "number"))]));
  const operators = operatorIds.length ? await db.select({ id: users.id, name: users.name, email: users.email }).from(users).where(inArray(users.id, operatorIds)) : [];
  const operatorNames = new Map(operators.map((operator) => [operator.id, operator.name || operator.email || `Operator #${operator.id}`]));
  return { job, assets, evidence, importBatches, impactStatement: impactStatements[0] ?? null, comments: comments.map((row) => ({ ...row, actorName: operatorNames.get(row.createdByUserId) || `Operator #${row.createdByUserId}` })), exceptions: exceptions.map((row) => ({ ...row, ownerName: row.ownerUserId ? operatorNames.get(row.ownerUserId) || `Operator #${row.ownerUserId}` : "Unassigned" })), activity: activity.map((row) => ({ ...row, actorName: operatorNames.get(row.actorUserId) || `Operator #${row.actorUserId}` })) };
}

export async function getItadJobExceptionKpis(jobId: number, brand: ItadBrand = DEFAULT_ITAD_BRAND) {
  const db = await getDb();
  if (!db) throw new Error("ITAD Core storage is temporarily unavailable");
  await getItadJobForBrand(jobId, brand);
  const exceptions = await db.select({ id: itadJobExceptions.id, title: itadJobExceptions.title, status: itadJobExceptions.status, createdAt: itadJobExceptions.createdAt, dueAt: itadJobExceptions.dueAt }).from(itadJobExceptions).where(and(eq(itadJobExceptions.jobId, jobId), eq(itadJobExceptions.brand, brand)));
  return calculateCoreJobExceptionKpis(exceptions);
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

export async function listOperationsAdmins() {
  const db = await getDb();
  if (!db) throw new Error("Operations user storage is temporarily unavailable");
  return db.select({ id: users.id, name: users.name, email: users.email }).from(users).where(eq(users.role, "admin")).orderBy(asc(users.name), asc(users.email));
}

export async function createItadJobEvidenceRecord(input: { jobId: number; assetId?: number; brand: ItadBrand; evidenceType: "securaze_report" | "destruction_certificate" | "impact_statement" | "data_erasure" | "collection_manifest" | "reuse_outcome" | "recycling_outcome" | "other"; certificateReference?: string; issuer?: string; verificationState: "recorded" | "reviewed" | "verified" | "exception"; evidenceDate?: Date; fileName?: string; contentType?: string; sizeBytes?: number; storageKey?: string; customerVisible: boolean; createdByUserId: number }) {
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

async function createItadJobActivityEvent(input: { jobId: number; brand: ItadBrand; eventType: "comment_added" | "exception_opened" | "exception_updated" | "exception_resolved" | "evidence_approved" | "securaze_imported" | "stage_changed" | "impact_updated" | "impact_approved" | "client_notification"; summary: string; actorUserId: number }) {
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

export async function updateItadJobStage(input: { jobId: number; brand: ItadBrand; stage: ItadJobStage; actorUserId: number }) {
  const db = await getDb();
  if (!db) throw new Error("ITAD Core storage is temporarily unavailable");
  const job = await getItadJobForBrand(input.jobId, input.brand);
  if (input.stage === "completed") {
    const [documents, impact] = await Promise.all([
      db.select({ evidenceType: itadJobEvidenceRecords.evidenceType }).from(itadJobEvidenceRecords).where(and(eq(itadJobEvidenceRecords.jobId, input.jobId), eq(itadJobEvidenceRecords.brand, input.brand), eq(itadJobEvidenceRecords.customerVisible, true), isNotNull(itadJobEvidenceRecords.customerApprovedAt))),
      db.select().from(itadJobImpactStatements).where(and(eq(itadJobImpactStatements.jobId, input.jobId), eq(itadJobImpactStatements.brand, input.brand), eq(itadJobImpactStatements.customerVisible, true), isNotNull(itadJobImpactStatements.customerApprovedAt))).limit(1),
    ]);
    const issuedTypes = new Set(documents.map((document) => document.evidenceType));
    if (!issuedTypes.has("securaze_report") || !issuedTypes.has("destruction_certificate") || !impact[0]) {
      throw new Error("Complete this job only after approved Securaze evidence, a destruction certificate and an approved impact statement are released to the client");
    }
  }
  const completed = input.stage === "completed";
  await db.update(itadJobs).set({ stage: input.stage, completedAt: completed ? new Date() : null, completedByUserId: completed ? input.actorUserId : null }).where(and(eq(itadJobs.id, input.jobId), eq(itadJobs.brand, input.brand)));
  await createItadJobActivityEvent({ jobId: input.jobId, brand: input.brand, eventType: "stage_changed", summary: `Job stage changed from ${job.stage.replaceAll("_", " ")} to ${input.stage.replaceAll("_", " ")}`, actorUserId: input.actorUserId });
  return { ...job, stage: input.stage, completedAt: completed ? new Date() : null, completedByUserId: completed ? input.actorUserId : null };
}

export async function upsertItadJobImpactStatement(input: { jobId: number; brand: ItadBrand; assetsReused: number; assetsRecycled: number; assetsRedistributed: number; materialsRecoveredKg: number; carbonAvoidedKg?: number | null; carbonMethodology?: string | null; narrative?: string | null; updatedByUserId: number }) {
  const db = await getDb();
  if (!db) throw new Error("ITAD Core storage is temporarily unavailable");
  await getItadJobForBrand(input.jobId, input.brand);
  const existing = await db.select().from(itadJobImpactStatements).where(and(eq(itadJobImpactStatements.jobId, input.jobId), eq(itadJobImpactStatements.brand, input.brand))).orderBy(desc(itadJobImpactStatements.updatedAt)).limit(1);
  const values = { ...input, carbonAvoidedKg: input.carbonAvoidedKg ?? null, carbonMethodology: input.carbonMethodology || null, narrative: input.narrative || null, customerVisible: false, customerApprovedAt: null, customerApprovedByUserId: null };
  if (existing[0]) {
    await db.update(itadJobImpactStatements).set(values).where(eq(itadJobImpactStatements.id, existing[0].id));
  } else {
    await db.insert(itadJobImpactStatements).values(values);
  }
  const statement = await db.select().from(itadJobImpactStatements).where(and(eq(itadJobImpactStatements.jobId, input.jobId), eq(itadJobImpactStatements.brand, input.brand))).orderBy(desc(itadJobImpactStatements.updatedAt)).limit(1);
  if (!statement[0]) throw new Error("Impact statement could not be saved");
  await createItadJobActivityEvent({ jobId: input.jobId, brand: input.brand, eventType: "impact_updated", summary: "Privacy-safe impact statement updated for internal review", actorUserId: input.updatedByUserId });
  return statement[0];
}

export async function approveItadJobImpactStatement(input: { jobId: number; brand: ItadBrand; approvedByUserId: number }) {
  const db = await getDb();
  if (!db) throw new Error("ITAD Core storage is temporarily unavailable");
  const statement = await db.select().from(itadJobImpactStatements).where(and(eq(itadJobImpactStatements.jobId, input.jobId), eq(itadJobImpactStatements.brand, input.brand))).orderBy(desc(itadJobImpactStatements.updatedAt)).limit(1);
  if (!statement[0]) throw new Error("Create an impact statement before approving it for the client");
  if (statement[0].carbonAvoidedKg !== null && !statement[0].carbonMethodology) throw new Error("Add a carbon methodology before releasing a carbon outcome");
  const approvedAt = new Date();
  await db.update(itadJobImpactStatements).set({ customerVisible: true, customerApprovedAt: approvedAt, customerApprovedByUserId: input.approvedByUserId }).where(eq(itadJobImpactStatements.id, statement[0].id));
  await createItadJobActivityEvent({ jobId: input.jobId, brand: input.brand, eventType: "impact_approved", summary: "Impact statement approved for client dashboard", actorUserId: input.approvedByUserId });
  return { ...statement[0], customerVisible: true, customerApprovedAt: approvedAt, customerApprovedByUserId: input.approvedByUserId };
}

export async function recordClientNotification(input: { organisationId: number; brand: ItadBrand; recipientEmail: string; eventType: "onboarding" | "collection_booked" | "job_completed"; deliveryState: "sent" | "failed" | "skipped"; collectionId?: number | null; jobId?: number | null; invitationId?: number | null; emailId?: string | null; actorUserId?: number }) {
  const db = await getDb();
  if (!db) throw new Error("Client notification storage is temporarily unavailable");
  await db.insert(clientNotificationEvents).values({ ...input, collectionId: input.collectionId ?? null, jobId: input.jobId ?? null, invitationId: input.invitationId ?? null, emailId: input.emailId ?? null, recipientEmail: input.recipientEmail.toLowerCase() });
  if (input.jobId && input.actorUserId) await createItadJobActivityEvent({ jobId: input.jobId, brand: input.brand, eventType: "client_notification", summary: `Client ${input.eventType.replaceAll("_", " ")} email ${input.deliveryState}`, actorUserId: input.actorUserId });
}

export async function createItadJobComment(input: { jobId: number; brand: ItadBrand; comment: string; createdByUserId: number }) {
  const db = await getDb();
  if (!db) throw new Error("ITAD Core storage is temporarily unavailable");
  await getItadJobForBrand(input.jobId, input.brand);
  await db.insert(itadJobComments).values(input);
  await createItadJobActivityEvent({ jobId: input.jobId, brand: input.brand, eventType: "comment_added", summary: "Internal Core Job comment added", actorUserId: input.createdByUserId });
}

export async function createItadJobException(input: { jobId: number; brand: ItadBrand; title: string; detail?: string; dueAt?: Date | null; ownerUserId: number; createdByUserId: number }) {
  const db = await getDb();
  if (!db) throw new Error("ITAD Core storage is temporarily unavailable");
  const job = await getItadJobForBrand(input.jobId, input.brand);
  await db.insert(itadJobExceptions).values({ ...input, detail: input.detail ?? null, dueAt: input.dueAt ?? null, status: "open" });
  await createItadJobActivityEvent({ jobId: input.jobId, brand: input.brand, eventType: "exception_opened", summary: `Exception opened: ${input.title}`, actorUserId: input.createdByUserId });
  return { job, title: input.title, ownerUserId: input.ownerUserId };
}

export async function updateItadJobException(input: { exceptionId: number; jobId: number; brand: ItadBrand; status: "open" | "in_progress" | "resolved"; actorUserId: number; takeOwnership: boolean; ownerUserId?: number; dueAt?: Date | null }) {
  const db = await getDb();
  if (!db) throw new Error("ITAD Core storage is temporarily unavailable");
  const job = await getItadJobForBrand(input.jobId, input.brand);
  const exception = await db.select().from(itadJobExceptions).where(and(eq(itadJobExceptions.id, input.exceptionId), eq(itadJobExceptions.jobId, input.jobId), eq(itadJobExceptions.brand, input.brand))).limit(1);
  if (!exception[0]) throw new Error("Exception record could not be found in this Core Job");
  const resolved = input.status === "resolved";
  const ownerUserId = input.ownerUserId ?? (input.takeOwnership ? input.actorUserId : exception[0].ownerUserId);
  const dueAt = input.dueAt === undefined ? exception[0].dueAt : input.dueAt;
  await db.update(itadJobExceptions).set({ status: input.status, ownerUserId, dueAt, resolvedByUserId: resolved ? input.actorUserId : null, resolvedAt: resolved ? new Date() : null }).where(eq(itadJobExceptions.id, input.exceptionId));
  const dueDateChanged = input.dueAt === undefined ? "" : ` · due date ${dueAt ? "set" : "cleared"}`;
  await createItadJobActivityEvent({ jobId: input.jobId, brand: input.brand, eventType: resolved ? "exception_resolved" : "exception_updated", summary: resolved ? `Exception resolved: ${exception[0].title}` : `Exception updated: ${exception[0].title}${input.takeOwnership ? " (ownership accepted)" : ""}${dueDateChanged}`, actorUserId: input.actorUserId });
  return { job, exception: exception[0], ownerUserId };
}

export async function bulkReassignItadJobExceptions(input: { exceptionIds: number[]; jobId: number; brand: ItadBrand; ownerUserId: number; actorUserId: number }) {
  const db = await getDb();
  if (!db) throw new Error("ITAD Core storage is temporarily unavailable");
  const job = await getItadJobForBrand(input.jobId, input.brand);
  const records = await db.select().from(itadJobExceptions).where(and(inArray(itadJobExceptions.id, input.exceptionIds), eq(itadJobExceptions.jobId, input.jobId), eq(itadJobExceptions.brand, input.brand)));
  if (records.length !== input.exceptionIds.length) throw new Error("One or more selected exceptions do not belong to this Core Job brand workspace");
  if (records.some((record) => record.status === "resolved")) throw new Error("Resolved exceptions cannot be reassigned in bulk");
  await db.update(itadJobExceptions).set({ ownerUserId: input.ownerUserId }).where(and(inArray(itadJobExceptions.id, input.exceptionIds), eq(itadJobExceptions.jobId, input.jobId), eq(itadJobExceptions.brand, input.brand)));
  await db.insert(itadJobActivityEvents).values(records.map((record) => ({ jobId: input.jobId, brand: input.brand, eventType: "exception_updated" as const, summary: `Exception reassigned in bulk: ${record.title}`, actorUserId: input.actorUserId })));
  return { job, records };
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

export async function listClientPortalCollections(organisationId: number, brand: ItadBrand) {
  const db = await getDb();
  if (!db) throw new Error("Customer portal storage is temporarily unavailable");
  return db.select({ collection: collectionTracks, organisation: customerOrganisations }).from(collectionTracks)
    .innerJoin(customerOrganisations, eq(customerOrganisations.id, collectionTracks.organisationId))
    .where(and(eq(collectionTracks.organisationId, organisationId), eq(collectionTracks.brand, brand)))
    .orderBy(desc(collectionTracks.createdAt));
}

export async function listClientPortalAttachments(organisationId: number, brand: ItadBrand) {
  const db = await getDb();
  if (!db) throw new Error("Customer portal storage is temporarily unavailable");
  return db.select({ attachment: collectionAttachments, collection: collectionTracks }).from(collectionTracks)
    .innerJoin(collectionAttachments, eq(collectionAttachments.collectionId, collectionTracks.id))
    .where(and(eq(collectionTracks.organisationId, organisationId), eq(collectionTracks.brand, brand), eq(collectionAttachments.customerVisible, true)))
    .orderBy(desc(collectionAttachments.createdAt));
}

export async function listClientPortalAuditEvents(organisationId: number, brand: ItadBrand, page: number, pageSize: number) {
  const db = await getDb();
  if (!db) throw new Error("Customer portal storage is temporarily unavailable");
  const where = and(eq(collectionTracks.organisationId, organisationId), eq(collectionTracks.brand, brand), eq(collectionAuditEvents.customerVisible, true));
  const [{ total }] = await db.select({ total: count() }).from(collectionTracks).innerJoin(collectionAuditEvents, eq(collectionAuditEvents.collectionId, collectionTracks.id)).where(where);
  const events = await db.select({ event: collectionAuditEvents, collection: collectionTracks }).from(collectionTracks).innerJoin(collectionAuditEvents, eq(collectionAuditEvents.collectionId, collectionTracks.id)).where(where).orderBy(desc(collectionAuditEvents.createdAt)).limit(pageSize).offset((page - 1) * pageSize);
  return { events, total };
}

export async function getClientPortalAttachment(organisationId: number, brand: ItadBrand, attachmentId: number) {
  const db = await getDb();
  if (!db) throw new Error("Attachment storage metadata is temporarily unavailable");
  const attachment = await db.select({ attachment: collectionAttachments }).from(collectionTracks).innerJoin(collectionAttachments, eq(collectionAttachments.collectionId, collectionTracks.id))
    .where(and(eq(collectionTracks.organisationId, organisationId), eq(collectionTracks.brand, brand), eq(collectionAttachments.id, attachmentId), eq(collectionAttachments.customerVisible, true))).limit(1);
  if (!attachment[0]) throw new Error("This file is not available through your client account");
  return attachment[0].attachment;
}

export async function listClientPortalCoreEvidence(organisationId: number, brand: ItadBrand) {
  const db = await getDb();
  if (!db) throw new Error("ITAD Core storage is temporarily unavailable");
  return db.select({ evidence: itadJobEvidenceRecords, job: itadJobs }).from(itadJobs).innerJoin(itadJobEvidenceRecords, eq(itadJobEvidenceRecords.jobId, itadJobs.id))
    .where(and(eq(itadJobs.organisationId, organisationId), eq(itadJobs.brand, brand), eq(itadJobEvidenceRecords.brand, brand), eq(itadJobEvidenceRecords.customerVisible, true), isNotNull(itadJobEvidenceRecords.customerApprovedAt)))
    .orderBy(desc(itadJobEvidenceRecords.customerApprovedAt));
}

export async function getClientPortalCoreEvidence(organisationId: number, brand: ItadBrand, evidenceId: number) {
  const db = await getDb();
  if (!db) throw new Error("ITAD Core storage is temporarily unavailable");
  const evidence = await db.select({ evidence: itadJobEvidenceRecords }).from(itadJobs).innerJoin(itadJobEvidenceRecords, eq(itadJobEvidenceRecords.jobId, itadJobs.id))
    .where(and(eq(itadJobs.organisationId, organisationId), eq(itadJobs.brand, brand), eq(itadJobEvidenceRecords.brand, brand), eq(itadJobEvidenceRecords.id, evidenceId), eq(itadJobEvidenceRecords.customerVisible, true), isNotNull(itadJobEvidenceRecords.customerApprovedAt))).limit(1);
  if (!evidence[0]?.evidence.storageKey || !evidence[0].evidence.fileName) throw new Error("This Core evidence file is not available through your client account");
  return evidence[0].evidence;
}

export async function listClientPortalImpactStatements(organisationId: number, brand: ItadBrand) {
  const db = await getDb();
  if (!db) throw new Error("ITAD Core storage is temporarily unavailable");
  return db.select({ impact: itadJobImpactStatements, job: itadJobs }).from(itadJobs)
    .innerJoin(itadJobImpactStatements, eq(itadJobImpactStatements.jobId, itadJobs.id))
    .where(and(eq(itadJobs.organisationId, organisationId), eq(itadJobs.brand, brand), eq(itadJobImpactStatements.brand, brand), eq(itadJobImpactStatements.customerVisible, true), isNotNull(itadJobImpactStatements.customerApprovedAt)))
    .orderBy(desc(itadJobImpactStatements.customerApprovedAt));
}

export async function listClientPortalJobLifecycle(organisationId: number, brand: ItadBrand) {
  const db = await getDb();
  if (!db) throw new Error("ITAD Core storage is temporarily unavailable");
  return db.select({ job: itadJobs, collection: collectionTracks }).from(itadJobs)
    .leftJoin(collectionTracks, eq(collectionTracks.jobId, itadJobs.id))
    .where(and(eq(itadJobs.organisationId, organisationId), eq(itadJobs.brand, brand), eq(collectionTracks.brand, brand)))
    .orderBy(desc(itadJobs.updatedAt));
}

export async function listClientPortalCompletionArchive(organisationId: number, brand: ItadBrand, input: { search?: string; completedFrom?: Date; completedTo?: Date; sort: "newest" | "oldest" }) {
  const db = await getDb();
  if (!db) throw new Error("ITAD Core storage is temporarily unavailable");
  const conditions = [eq(itadJobs.organisationId, organisationId), eq(itadJobs.brand, brand), eq(itadJobs.stage, "completed"), isNotNull(itadJobs.completedAt)];
  if (input.search) {
    const query = `%${input.search.replace(/[\\%_]/g, "\\$&")}%`;
    conditions.push(or(like(itadJobs.jobReference, query), like(itadJobs.title, query))!);
  }
  if (input.completedFrom) conditions.push(gte(itadJobs.completedAt, input.completedFrom));
  if (input.completedTo) conditions.push(lte(itadJobs.completedAt, input.completedTo));
  return db.select({ job: itadJobs, collection: collectionTracks }).from(itadJobs)
    .leftJoin(collectionTracks, and(eq(collectionTracks.jobId, itadJobs.id), eq(collectionTracks.brand, brand)))
    .where(and(...conditions))
    .orderBy(input.sort === "oldest" ? asc(itadJobs.completedAt) : desc(itadJobs.completedAt));
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
