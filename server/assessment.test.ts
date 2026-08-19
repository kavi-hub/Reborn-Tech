import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createAssessmentRequest: vi.fn(),
  listAssessmentRequests: vi.fn(),
  updateAssessmentStatus: vi.fn(),
  deleteAssessmentRequest: vi.fn(),
  exportAssessmentRequests: vi.fn(),
  createCollectionTrack: vi.fn(),
  listAdminCollections: vi.fn(),
  listCustomerPortalCollections: vi.fn(),
  updateCollectionStatus: vi.fn(),
  assignCustomerOrganisationMember: vi.fn(),
  assignCustomerViewerByOrganisationAdmin: vi.fn(),
  getCustomerOrganisationMembership: vi.fn(),
  notifyOwner: vi.fn(),
}));

vi.mock("./db", () => ({
  createAssessmentRequest: mocks.createAssessmentRequest,
  listAssessmentRequests: mocks.listAssessmentRequests,
  updateAssessmentStatus: mocks.updateAssessmentStatus,
  deleteAssessmentRequest: mocks.deleteAssessmentRequest,
  exportAssessmentRequests: mocks.exportAssessmentRequests,
  createCollectionTrack: mocks.createCollectionTrack,
  listAdminCollections: mocks.listAdminCollections,
  listCustomerPortalCollections: mocks.listCustomerPortalCollections,
  updateCollectionStatus: mocks.updateCollectionStatus,
  assignCustomerOrganisationMember: mocks.assignCustomerOrganisationMember,
  assignCustomerViewerByOrganisationAdmin: mocks.assignCustomerViewerByOrganisationAdmin,
  getCustomerOrganisationMembership: mocks.getCustomerOrganisationMembership,
}));

vi.mock("./_core/notification", () => ({
  notifyOwner: mocks.notifyOwner,
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
  beforeEach(() => {
    vi.clearAllMocks();
  });
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
    mocks.notifyOwner.mockResolvedValue(true);
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
    expect(mocks.notifyOwner).toHaveBeenCalledWith(expect.objectContaining({
      title: "New Reborn ITAD assessment",
      content: expect.stringContaining("Northwind Services"),
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

  it("scopes customer portal collections to the signed-in user", async () => {
    mocks.listCustomerPortalCollections.mockResolvedValue([]);
    const ctx = { user: { id: 82, role: "user" }, req: {}, res: {} } as TrpcContext;
    const caller = appRouter.createCaller(ctx);

    await expect(caller.customerPortal.collections()).resolves.toEqual([]);
    expect(mocks.listCustomerPortalCollections).toHaveBeenCalledWith(82);
  });

  it("allows an admin to open a tracked collection route", async () => {
    mocks.createCollectionTrack.mockResolvedValue(undefined);
    const ctx = { user: { id: 1, role: "admin" }, req: {}, res: {} } as TrpcContext;
    const caller = appRouter.createCaller(ctx);

    await expect(caller.collections.create({ organisationName: "Northwind Services", reference: "RB-2026-001", title: "London device collection" })).resolves.toEqual({ success: true });
    expect(mocks.createCollectionTrack).toHaveBeenCalledWith(expect.objectContaining({ organisationName: "Northwind Services", status: "planned" }));
  });

  it("passes the signed-in customer admin to the scoped viewer-grant boundary", async () => {
    mocks.getCustomerOrganisationMembership.mockResolvedValue({ role: "admin" });
    mocks.assignCustomerViewerByOrganisationAdmin.mockResolvedValue(undefined);
    const ctx = { user: { id: 82, role: "user" }, req: {}, res: {} } as TrpcContext;
    const caller = appRouter.createCaller(ctx);

    await expect(caller.customerPortal.assignViewer({ organisationId: 14, email: "viewer@example.com" })).resolves.toEqual({ success: true });
    expect(mocks.assignCustomerViewerByOrganisationAdmin).toHaveBeenCalledWith({ actorUserId: 82, organisationId: 14, email: "viewer@example.com" });
  });

  it("rejects a customer viewer before any portal-access delegation", async () => {
    mocks.getCustomerOrganisationMembership.mockResolvedValue({ role: "viewer" });
    const ctx = { user: { id: 82, role: "user" }, req: {}, res: {} } as TrpcContext;
    const caller = appRouter.createCaller(ctx);

    await expect(caller.customerPortal.assignViewer({ organisationId: 14, email: "viewer@example.com" })).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(mocks.assignCustomerViewerByOrganisationAdmin).not.toHaveBeenCalled();
  });

  it("rejects a customer with no organisation membership before delegation", async () => {
    mocks.getCustomerOrganisationMembership.mockResolvedValue(null);
    const ctx = { user: { id: 91, role: "user" }, req: {}, res: {} } as TrpcContext;
    const caller = appRouter.createCaller(ctx);

    await expect(caller.customerPortal.assignViewer({ organisationId: 14, email: "viewer@example.com" })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});
