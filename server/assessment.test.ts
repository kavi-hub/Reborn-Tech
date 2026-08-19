import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createAssessmentRequest: vi.fn(),
}));

vi.mock("./db", () => ({
  createAssessmentRequest: mocks.createAssessmentRequest,
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
    }));
  });
});
