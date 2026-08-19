import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createAssessmentRequest: vi.fn(),
  listAssessmentRequests: vi.fn(),
  updateAssessmentStatus: vi.fn(),
  deleteAssessmentRequest: vi.fn(),
}));

vi.mock("./db", () => ({
  createAssessmentRequest: mocks.createAssessmentRequest,
  listAssessmentRequests: mocks.listAssessmentRequests,
  updateAssessmentStatus: mocks.updateAssessmentStatus,
  deleteAssessmentRequest: mocks.deleteAssessmentRequest,
}));

import { assessmentInputSchema, appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

const validRequest = {
  fullName: "Amina Johnson",
  email: "amina@example.com",
  organisation: "Northwind Services",
  assetCategories: ["Laptops", "Mobile devices"],
  contactConsent: true as const,
};

describe("assessment input validation", () => {
  it("accepts a valid public assessment request and defaults operational flags", () => {
    const parsed = assessmentInputSchema.parse(validRequest);

    expect(parsed.assetCategories).toEqual(["Laptops", "Mobile devices"]);
    expect(parsed.hasInventory).toBe(false);
    expect(parsed.requiresOnSiteErasure).toBe(false);
  });

  it("rejects requests without an asset category or contact consent", () => {
    const parsed = assessmentInputSchema.safeParse({
      ...validRequest,
      assetCategories: [],
      contactConsent: false,
    });

    expect(parsed.success).toBe(false);
  });

  it("stores a valid public request through the assessment procedure", async () => {
    mocks.createAssessmentRequest.mockResolvedValue(undefined);
    const ctx = {
      user: null,
      req: {},
      res: {},
    } as TrpcContext;
    const caller = appRouter.createCaller(ctx);

    await expect(caller.assessment.submit(validRequest)).resolves.toEqual({ success: true });
    expect(mocks.createAssessmentRequest).toHaveBeenCalledWith(expect.objectContaining({
      fullName: "Amina Johnson",
      organisation: "Northwind Services",
      assetCategories: "Laptops, Mobile devices",
      source: "website",
      retentionReviewAt: expect.any(Date),
    }));
  });

  it("returns assessment records to an admin caller", async () => {
    mocks.listAssessmentRequests.mockResolvedValue({
      items: [], total: 0, statusCounts: { new: 0, contacted: 0, qualified: 0, closed: 0 },
    });
    const ctx = { user: { id: 1, role: "admin" }, req: {}, res: {} } as TrpcContext;
    const caller = appRouter.createCaller(ctx);

    await expect(caller.assessment.list({ page: 1, limit: 20, sort: "newest" })).resolves.toMatchObject({ total: 0 });
    expect(mocks.listAssessmentRequests).toHaveBeenCalledWith({ page: 1, limit: 20, sort: "newest" });
  });

  it("rejects assessment records for a non-admin caller", async () => {
    const ctx = { user: { id: 1, role: "user" }, req: {}, res: {} } as TrpcContext;
    const caller = appRouter.createCaller(ctx);

    await expect(caller.assessment.list({ page: 1, limit: 20, sort: "newest" })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});
