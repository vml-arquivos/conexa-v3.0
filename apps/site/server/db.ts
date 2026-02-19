import { eq, desc, and, like, sql, or } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { 
  InsertUser, 
  users, 
  units, 
  InsertUnit,
  blogCategories,
  blogTags,
  blogPosts,
  blogPostTags,
  InsertBlogPost,
  newsletterSubscriptions,
  InsertNewsletterSubscription,
  contactSubmissions,
  InsertContactSubmission,
  donations,
  InsertDonation,
  projects,
  InsertProject,
  transparencyDocuments,
  InsertTransparencyDocument,
  jobApplications,
  InsertJobApplication
} from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

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

// ============ USER HELPERS ============

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

// ============ UNITS HELPERS ============

export async function getAllUnits() {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(units).where(eq(units.active, true)).orderBy(units.unitName);
}

export async function getUnitBySlug(slug: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(units).where(eq(units.slug, slug)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function createUnit(unit: InsertUnit) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(units).values(unit);
  return result;
}

// ============ BLOG HELPERS ============

export async function getAllBlogCategories() {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(blogCategories).orderBy(blogCategories.name);
}

export async function getAllBlogTags() {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(blogTags).orderBy(blogTags.name);
}

export async function getPublishedBlogPosts(limit = 10, offset = 0) {
  const db = await getDb();
  if (!db) return [];
  return await db
    .select()
    .from(blogPosts)
    .where(eq(blogPosts.published, true))
    .orderBy(desc(blogPosts.publishedAt))
    .limit(limit)
    .offset(offset);
}

export async function getBlogPostBySlug(slug: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(blogPosts).where(eq(blogPosts.slug, slug)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function searchBlogPosts(searchTerm: string, limit = 10) {
  const db = await getDb();
  if (!db) return [];
  return await db
    .select()
    .from(blogPosts)
    .where(
      and(
        eq(blogPosts.published, true),
        or(
          like(blogPosts.title, `%${searchTerm}%`),
          like(blogPosts.content, `%${searchTerm}%`)
        )
      )
    )
    .orderBy(desc(blogPosts.publishedAt))
    .limit(limit);
}

export async function incrementBlogPostViews(postId: number) {
  const db = await getDb();
  if (!db) return;
  await db
    .update(blogPosts)
    .set({ views: sql`${blogPosts.views} + 1` })
    .where(eq(blogPosts.id, postId));
}

// ============ NEWSLETTER HELPERS ============

export async function subscribeNewsletter(subscription: InsertNewsletterSubscription) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  try {
    await db.insert(newsletterSubscriptions).values(subscription);
    return { success: true };
  } catch (error: any) {
    if (error?.code === 'ER_DUP_ENTRY') {
      return { success: false, error: 'Email already subscribed' };
    }
    throw error;
  }
}

export async function unsubscribeNewsletter(email: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db
    .update(newsletterSubscriptions)
    .set({ active: false, unsubscribedAt: new Date() })
    .where(eq(newsletterSubscriptions.email, email));
  
  return { success: true };
}

// ============ CONTACT HELPERS ============

export async function createContactSubmission(submission: InsertContactSubmission) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(contactSubmissions).values(submission);
  return result;
}

export async function getAllContactSubmissions() {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(contactSubmissions).orderBy(desc(contactSubmissions.createdAt));
}

// ============ DONATIONS HELPERS ============

export async function createDonation(donation: InsertDonation) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(donations).values(donation);
  return result;
}

export async function getTotalDonations() {
  const db = await getDb();
  if (!db) return { total: 0, count: 0 };
  
  const result = await db
    .select({
      total: sql<number>`SUM(${donations.amount})`,
      count: sql<number>`COUNT(*)`,
    })
    .from(donations)
    .where(eq(donations.paymentStatus, 'completed'));
  
  return result[0] || { total: 0, count: 0 };
}

// ============ PROJECTS HELPERS ============

export async function getAllProjects() {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(projects).where(eq(projects.active, true)).orderBy(projects.name);
}

export async function getProjectBySlug(slug: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(projects).where(eq(projects.slug, slug)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// ============ TRANSPARENCY HELPERS ============

export async function getTransparencyDocuments(category?: string, year?: number) {
  const db = await getDb();
  if (!db) return [];
  
  const conditions = [eq(transparencyDocuments.published, true)];
  
  if (category) {
    conditions.push(eq(transparencyDocuments.category, category as any));
  }
  
  if (year) {
    conditions.push(eq(transparencyDocuments.year, year));
  }
  
  return await db
    .select()
    .from(transparencyDocuments)
    .where(and(...conditions))
    .orderBy(desc(transparencyDocuments.year), desc(transparencyDocuments.month));
}


// ============ JOB APPLICATIONS HELPERS ============

export async function createJobApplication(application: InsertJobApplication) {
  const db = await getDb();
  if (!db) {
    throw new Error("[Database] Cannot create job application: database not available");
  }
  
  const result = await db.insert(jobApplications).values(application);
  return result;
}

export async function getAllJobApplications() {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(jobApplications).orderBy(desc(jobApplications.createdAt));
}

export async function getJobApplicationById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(jobApplications).where(eq(jobApplications.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}
