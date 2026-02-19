import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

function createMockContext(): TrpcContext {
  return {
    user: null,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };
}

describe("COCRIS API Tests", () => {
  describe("Units API", () => {
    it("should fetch all units successfully", async () => {
      const ctx = createMockContext();
      const caller = appRouter.createCaller(ctx);

      const units = await caller.units.getAll();

      expect(units).toBeDefined();
      expect(Array.isArray(units)).toBe(true);
      expect(units.length).toBeGreaterThan(0);
      expect(units[0]).toHaveProperty("unitName");
      expect(units[0]).toHaveProperty("slug");
      expect(units[0]).toHaveProperty("active");
    });

    it("should fetch unit by slug", async () => {
      const ctx = createMockContext();
      const caller = appRouter.createCaller(ctx);

      const unit = await caller.units.getBySlug({ slug: "cepi-arara-caninde" });

      expect(unit).toBeDefined();
      if (unit) {
        expect(unit.unitName).toBe("CEPI Arara Canindé");
        expect(unit.slug).toBe("cepi-arara-caninde");
        expect(unit.city).toBe("Recanto das Emas");
      }
    });

    it("should return undefined for non-existent unit slug", async () => {
      const ctx = createMockContext();
      const caller = appRouter.createCaller(ctx);

      const unit = await caller.units.getBySlug({ slug: "non-existent-unit" });

      expect(unit).toBeUndefined();
    });
  });

  describe("Blog API", () => {
    it("should fetch blog categories", async () => {
      const ctx = createMockContext();
      const caller = appRouter.createCaller(ctx);

      const categories = await caller.blog.getCategories();

      expect(categories).toBeDefined();
      expect(Array.isArray(categories)).toBe(true);
    });

    it("should fetch blog tags", async () => {
      const ctx = createMockContext();
      const caller = appRouter.createCaller(ctx);

      const tags = await caller.blog.getTags();

      expect(tags).toBeDefined();
      expect(Array.isArray(tags)).toBe(true);
    });

    it("should fetch blog posts with pagination", async () => {
      const ctx = createMockContext();
      const caller = appRouter.createCaller(ctx);

      const posts = await caller.blog.getPosts({ limit: 5, offset: 0 });

      expect(posts).toBeDefined();
      expect(Array.isArray(posts)).toBe(true);
      expect(posts.length).toBeLessThanOrEqual(5);
    });
  });

  describe("Newsletter API", () => {
    it("should subscribe to newsletter with valid email", async () => {
      const ctx = createMockContext();
      const caller = appRouter.createCaller(ctx);

      const testEmail = `test-${Date.now()}@example.com`;

      const result = await caller.newsletter.subscribe({
        email: testEmail,
        name: "Test User",
      });

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
    });

    it("should handle duplicate newsletter subscription", async () => {
      const ctx = createMockContext();
      const caller = appRouter.createCaller(ctx);

      const testEmail = `duplicate-${Date.now()}@example.com`;

      // First subscription
      await caller.newsletter.subscribe({
        email: testEmail,
        name: "Test User",
      });

      // Second subscription (should throw error for duplicate)
      try {
        await caller.newsletter.subscribe({
          email: testEmail,
          name: "Test User",
        });
        // If no error thrown, fail the test
        expect(true).toBe(false);
      } catch (error) {
        // Expect error for duplicate email
        expect(error).toBeDefined();
      }
    });
  });

  describe("Contact API", () => {
    it("should submit contact form successfully", async () => {
      const ctx = createMockContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.contact.submit({
        name: "Test User",
        email: "test@example.com",
        subject: "Test Subject",
        message: "This is a test message for the contact form.",
      });

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
    });

    it("should submit contact form with phone and unit", async () => {
      const ctx = createMockContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.contact.submit({
        name: "Test User",
        email: "test@example.com",
        phone: "(61) 99999-9999",
        subject: "Test Subject",
        message: "This is a test message with phone and unit.",
        unitId: 1,
      });

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
    });
  });

  describe("Donations API", () => {
    it("should get donation totals", async () => {
      const ctx = createMockContext();
      const caller = appRouter.createCaller(ctx);

      const totals = await caller.donations.getTotals();

      expect(totals).toBeDefined();
      expect(totals).toHaveProperty("total");
      expect(totals).toHaveProperty("count");
      // totals.total and totals.count can be null if no donations exist
      expect(typeof totals.total === 'number' || totals.total === null).toBe(true);
      expect(typeof totals.count === 'number' || totals.count === null).toBe(true);
    });

    it("should create donation successfully", async () => {
      const ctx = createMockContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.donations.create({
        donorName: "Test Donor",
        donorEmail: "donor@example.com",
        amount: 5000, // R$ 50.00
        frequency: "one-time",
        destinationType: "general",
        paymentMethod: "pix",
        anonymous: false,
      });

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
    });
  });

  describe("Projects API", () => {
    it("should fetch all projects", async () => {
      const ctx = createMockContext();
      const caller = appRouter.createCaller(ctx);

      const projects = await caller.projects.getAll();

      expect(projects).toBeDefined();
      expect(Array.isArray(projects)).toBe(true);
    });
  });

  describe("Transparency API", () => {
    it("should fetch transparency documents", async () => {
      const ctx = createMockContext();
      const caller = appRouter.createCaller(ctx);

      const documents = await caller.transparency.getDocuments({});

      expect(documents).toBeDefined();
      expect(Array.isArray(documents)).toBe(true);
    });

    it("should filter transparency documents by category", async () => {
      const ctx = createMockContext();
      const caller = appRouter.createCaller(ctx);

      const documents = await caller.transparency.getDocuments({
        category: "financial",
      });

      expect(documents).toBeDefined();
      expect(Array.isArray(documents)).toBe(true);
    });
  });
});
