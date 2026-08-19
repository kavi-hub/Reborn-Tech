import { and, asc, count, desc, eq, like, or } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { assessmentRequests, collectionTracks, customerOrganisationMembers, customerOrganisations, InsertAssessmentRequest, InsertUser, users } from "../drizzle/schema";
import { ENV } from './_core/env';

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
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
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
    reference: input.reference,
    title: input.title,
    status: input.status,
    scheduledFor: input.scheduledFor ?? null,
    collectionPostcode: input.collectionPostcode || null,
    customerNote: input.customerNote || null,
  });
}

export async function listAdminCollections() {
  const db = await getDb();
  if (!db) throw new Error("Customer portal storage is temporarily unavailable");
  return db.select({ collection: collectionTracks, organisation: customerOrganisations }).from(collectionTracks)
    .innerJoin(customerOrganisations, eq(collectionTracks.organisationId, customerOrganisations.id))
    .orderBy(desc(collectionTracks.createdAt));
}

export async function updateCollectionStatus(id: number, status: CollectionStatus) {
  const db = await getDb();
  if (!db) throw new Error("Customer portal storage is temporarily unavailable");
  await db.update(collectionTracks).set({ status }).where(eq(collectionTracks.id, id));
}

export async function assignCustomerOrganisationMember(input: { organisationId: number; email: string; role: "admin" | "viewer" }) {
  const db = await getDb();
  if (!db) throw new Error("Customer portal storage is temporarily unavailable");
  const user = await db.select().from(users).where(eq(users.email, input.email)).limit(1);
  if (!user[0]) throw new Error("This person needs to sign in to the portal once before their role can be assigned");
  const existing = await db.select().from(customerOrganisationMembers).where(and(eq(customerOrganisationMembers.organisationId, input.organisationId), eq(customerOrganisationMembers.userId, user[0].id))).limit(1);
  if (existing[0]) {
    await db.update(customerOrganisationMembers).set({ role: input.role }).where(eq(customerOrganisationMembers.id, existing[0].id));
  } else {
    await db.insert(customerOrganisationMembers).values({ organisationId: input.organisationId, userId: user[0].id, role: input.role });
  }
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

export async function listCustomerPortalCollections(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Customer portal storage is temporarily unavailable");
  return db.select({ collection: collectionTracks, organisation: customerOrganisations, member: customerOrganisationMembers }).from(customerOrganisationMembers)
    .innerJoin(customerOrganisations, eq(customerOrganisationMembers.organisationId, customerOrganisations.id))
    .innerJoin(collectionTracks, eq(collectionTracks.organisationId, customerOrganisations.id))
    .where(eq(customerOrganisationMembers.userId, userId))
    .orderBy(desc(collectionTracks.createdAt));
}
