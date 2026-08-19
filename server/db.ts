import { and, asc, count, desc, eq, like, or } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { assessmentRequests, InsertAssessmentRequest, InsertUser, users } from "../drizzle/schema";
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
