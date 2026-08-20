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
  createCustomerPortalInvitation: vi.fn(),
  getPortalInvitation: vi.fn(),
  listActivePortalInvitations: vi.fn(),
  listOrganisationPortalInvitations: vi.fn(),
  recordPortalInvitationEmail: vi.fn(),
  recordPortalInvitationEmailFailure: vi.fn(),
  revokePortalInvitation: vi.fn(),
  claimCustomerPortalInvitation: vi.fn(),
  getMagicPortalOverview: vi.fn(),
  getMagicPortalAttachment: vi.fn(),
  assignCustomerViewerByOrganisationAdmin: vi.fn(),
  getCustomerOrganisationMembership: vi.fn(),
  createCollectionAttachment: vi.fn(),
  listAdminCollectionAttachments: vi.fn(),
  getAdminCollectionAttachment: vi.fn(),
  deleteCollectionAttachment: vi.fn(),
  listCustomerCollectionAttachments: vi.fn(),
  getCustomerCollectionAttachment: vi.fn(),
  storagePut: vi.fn(),
  storageGetSignedUrl: vi.fn(),
  createCollectionAuditEvent: vi.fn(),
  listAdminCollectionAuditEvents: vi.fn(),
  listCollectionIdsForOrganisation: vi.fn(),
  listCustomerCollectionAuditEvents: vi.fn(),
  notifyOwner: vi.fn(),
  sendPortalInvitationEmail: vi.fn(),
  sendCollectionStatusEmail: vi.fn(),
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
  createCustomerPortalInvitation: mocks.createCustomerPortalInvitation,
  getPortalInvitation: mocks.getPortalInvitation,
  listActivePortalInvitations: mocks.listActivePortalInvitations,
  listOrganisationPortalInvitations: mocks.listOrganisationPortalInvitations,
  recordPortalInvitationEmail: mocks.recordPortalInvitationEmail,
  recordPortalInvitationEmailFailure: mocks.recordPortalInvitationEmailFailure,
  revokePortalInvitation: mocks.revokePortalInvitation,
  claimCustomerPortalInvitation: mocks.claimCustomerPortalInvitation,
  getMagicPortalOverview: mocks.getMagicPortalOverview,
  getMagicPortalAttachment: mocks.getMagicPortalAttachment,
  assignCustomerViewerByOrganisationAdmin: mocks.assignCustomerViewerByOrganisationAdmin,
  getCustomerOrganisationMembership: mocks.getCustomerOrganisationMembership,
  createCollectionAttachment: mocks.createCollectionAttachment,
  listAdminCollectionAttachments: mocks.listAdminCollectionAttachments,
  getAdminCollectionAttachment: mocks.getAdminCollectionAttachment,
  deleteCollectionAttachment: mocks.deleteCollectionAttachment,
  listCustomerCollectionAttachments: mocks.listCustomerCollectionAttachments,
  getCustomerCollectionAttachment: mocks.getCustomerCollectionAttachment,
  createCollectionAuditEvent: mocks.createCollectionAuditEvent,
  listAdminCollectionAuditEvents: mocks.listAdminCollectionAuditEvents,
  listCollectionIdsForOrganisation: mocks.listCollectionIdsForOrganisation,
  listCustomerCollectionAuditEvents: mocks.listCustomerCollectionAuditEvents,
}));

vi.mock("./_core/notification", () => ({
  notifyOwner: mocks.notifyOwner,
}));

vi.mock("./rebornEmail", () => ({
  sendPortalInvitationEmail: mocks.sendPortalInvitationEmail,
  sendCollectionStatusEmail: mocks.sendCollectionStatusEmail,
}));

vi.mock("./storage", () => ({
  storagePut: mocks.storagePut,
  storageGetSignedUrl: mocks.storageGetSignedUrl,
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
    mocks.createCollectionAuditEvent.mockResolvedValue(undefined);
    mocks.listCollectionIdsForOrganisation.mockResolvedValue([]);
    mocks.listActivePortalInvitations.mockResolvedValue([]);
    mocks.listOrganisationPortalInvitations.mockResolvedValue([]);
    mocks.sendPortalInvitationEmail.mockResolvedValue("email_123");
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
    mocks.createCollectionTrack.mockResolvedValue({ id: 44, reference: "RB-2026-001" });
    mocks.createCollectionAuditEvent.mockResolvedValue(undefined);
    const ctx = { user: { id: 1, role: "admin" }, req: {}, res: {} } as TrpcContext;
    const caller = appRouter.createCaller(ctx);

    await expect(caller.collections.create({ organisationName: "Northwind Services", reference: "RB-2026-001", title: "London device collection" })).resolves.toEqual({ success: true });
    expect(mocks.createCollectionTrack).toHaveBeenCalledWith(expect.objectContaining({ organisationName: "Northwind Services", status: "planned" }));
    expect(mocks.createCollectionAuditEvent).toHaveBeenCalledWith(expect.objectContaining({ collectionId: 44, eventType: "route_created", actorUserId: 1 }));
  });

  it("keeps the Bulk GSM Dash collection list and new Core Jobs inside the bulk_gsm partition", async () => {
    mocks.listAdminCollections.mockResolvedValue([]);
    mocks.createCollectionTrack.mockResolvedValue({ id: 54, reference: "BG-2026-001", brand: "bulk_gsm" });
    const admin = appRouter.createCaller({ user: { id: 1, role: "admin" }, req: {}, res: {} } as TrpcContext);

    await expect(admin.collections.listAdmin({ brand: "bulk_gsm" })).resolves.toEqual([]);
    await expect(admin.collections.create({ brand: "bulk_gsm", organisationName: "Northwind Services", reference: "BG-2026-001", title: "Bulk GSM device collection" })).resolves.toEqual({ success: true });

    expect(mocks.listAdminCollections).toHaveBeenCalledWith("bulk_gsm");
    expect(mocks.createCollectionTrack).toHaveBeenCalledWith(expect.objectContaining({ brand: "bulk_gsm", reference: "BG-2026-001" }));
  });

  it("scopes invitation creation and its route audit activity to the chosen Core brand", async () => {
    mocks.listCollectionIdsForOrganisation.mockResolvedValue([{ id: 73 }]);
    mocks.listAdminCollections.mockResolvedValue([{ organisation: { id: 8, name: "Northwind Services" } }]);
    mocks.createCustomerPortalInvitation.mockImplementation(async (input) => ({ id: 19, ...input }));
    const admin = appRouter.createCaller({ user: { id: 1, role: "admin" }, req: {}, res: {} } as TrpcContext);

    await admin.collections.createInvitation({ organisationId: 8, brand: "bulk_gsm", email: "bulk.client@example.com", role: "viewer" });

    expect(mocks.createCustomerPortalInvitation).toHaveBeenCalledWith(expect.objectContaining({ organisationId: 8, brand: "bulk_gsm" }));
    expect(mocks.listCollectionIdsForOrganisation).toHaveBeenCalledWith(8, "bulk_gsm");
    expect(mocks.listAdminCollections).toHaveBeenCalledWith("bulk_gsm");
    expect(mocks.createCollectionAuditEvent).toHaveBeenCalledWith(expect.objectContaining({ collectionId: 73, eventType: "invitation_sent" }));
  });

  it("rejects invitation resend when its record belongs to a different brand workspace", async () => {
    mocks.getPortalInvitation.mockResolvedValue({ id: 19, organisationId: 8, brand: "bulk_gsm", status: "pending" });
    const admin = appRouter.createCaller({ user: { id: 1, role: "admin" }, req: {}, res: {} } as TrpcContext);

    await expect(admin.collections.resendInvitation({ invitationId: 19, brand: "reborn" })).rejects.toMatchObject({ code: "NOT_FOUND" });
    expect(mocks.sendPortalInvitationEmail).not.toHaveBeenCalled();
    expect(mocks.listCollectionIdsForOrganisation).not.toHaveBeenCalled();
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

  it("stores an allowed attachment only through an admin route", async () => {
    mocks.storagePut.mockResolvedValue({ key: "collection-routes/4/inventory.pdf", url: "/manus-storage/collection-routes/4/inventory.pdf" });
    mocks.createCollectionAttachment.mockResolvedValue(undefined);
    const admin = appRouter.createCaller({ user: { id: 1, role: "admin" }, req: {}, res: {} } as TrpcContext);

    await expect(admin.collections.uploadAttachment({ collectionId: 4, attachmentType: "inventory", fileName: "inventory.pdf", contentType: "application/pdf", contentBase64: "c2FtcGxl", customerVisible: true })).resolves.toEqual({ success: true });
    expect(mocks.storagePut).toHaveBeenCalledWith(expect.stringContaining("collection-routes/4"), expect.any(Buffer), "application/pdf");
    expect(mocks.createCollectionAttachment).toHaveBeenCalledWith(expect.objectContaining({ collectionId: 4, attachmentType: "inventory", customerVisible: true, uploadedByUserId: 1 }));
    expect(mocks.createCollectionAuditEvent).toHaveBeenCalledWith(expect.objectContaining({ collectionId: 4, eventType: "attachment_uploaded", customerVisible: true, actorUserId: 1 }));
  });

  it("rejects route attachment uploads from non-admin users", async () => {
    const customer = appRouter.createCaller({ user: { id: 82, role: "user" }, req: {}, res: {} } as TrpcContext);
    await expect(customer.collections.uploadAttachment({ collectionId: 4, attachmentType: "evidence", fileName: "evidence.pdf", contentType: "application/pdf", contentBase64: "c2FtcGxl", customerVisible: true })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("fetches customer attachment metadata only for the signed-in organisation member", async () => {
    mocks.listCustomerCollectionAttachments.mockResolvedValue([]);
    const customer = appRouter.createCaller({ user: { id: 82, role: "user" }, req: {}, res: {} } as TrpcContext);
    await expect(customer.customerPortal.attachments()).resolves.toEqual([]);
    expect(mocks.listCustomerCollectionAttachments).toHaveBeenCalledWith(82);
  });

  it("returns only customer-safe audit events for the signed-in organisation member", async () => {
    mocks.listCustomerCollectionAuditEvents.mockResolvedValue({ events: [], total: 0 });
    const customer = appRouter.createCaller({ user: { id: 82, role: "user" }, req: {}, res: {} } as TrpcContext);
    await expect(customer.customerPortal.auditEvents({ page: 2, pageSize: 6 })).resolves.toEqual({ events: [], total: 0 });
    expect(mocks.listCustomerCollectionAuditEvents).toHaveBeenCalledWith(82, 2, 6);
  });

  it("lets an admin pre-provision a time-limited customer invitation", async () => {
    mocks.listCollectionIdsForOrganisation.mockResolvedValue([{ id: 31 }]);
    mocks.listAdminCollections.mockResolvedValue([{ organisation: { id: 4, name: "Northwind Services" } }]);
    mocks.createCustomerPortalInvitation.mockImplementation(async (input) => ({ id: 14, ...input }));
    const admin = appRouter.createCaller({ user: { id: 7, role: "admin" }, req: {}, res: {} } as TrpcContext);

    const result = await admin.collections.createInvitation({ organisationId: 4, email: "client@example.com", role: "viewer" });

    expect(result.token).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(result.expiresAt).toBeInstanceOf(Date);
    expect(mocks.createCustomerPortalInvitation).toHaveBeenCalledWith(expect.objectContaining({ organisationId: 4, email: "client@example.com", role: "viewer", createdByUserId: 7 }));
    expect(mocks.createCollectionAuditEvent).toHaveBeenCalledWith(expect.objectContaining({ collectionId: 31, eventType: "invitation_sent", actorUserId: 7 }));
    expect(mocks.sendPortalInvitationEmail).toHaveBeenCalledWith(expect.objectContaining({ to: "client@example.com", organisationName: "Northwind Services" }));
  });

  it("claims an invited customer portal link for the authenticated work email", async () => {
    mocks.claimCustomerPortalInvitation.mockResolvedValue({ alreadyClaimed: false });
    const customer = appRouter.createCaller({ user: { id: 82, email: "client@example.com", role: "user" }, req: {}, res: {} } as TrpcContext);

    await expect(customer.customerPortal.claimInvitation({ token: "z".repeat(24) })).resolves.toEqual({ alreadyClaimed: false });
    expect(mocks.claimCustomerPortalInvitation).toHaveBeenCalledWith({ token: "z".repeat(24), userId: 82, email: "client@example.com" });
  });

  it("opens only token-scoped customer portal data without requiring a user session", async () => {
    mocks.getMagicPortalOverview.mockResolvedValue({ organisation: { id: 4, name: "Northwind Services" }, collections: [], attachments: [], events: [] });
    const publicCaller = appRouter.createCaller({ user: null, req: {}, res: {} } as TrpcContext);

    await expect(publicCaller.magicPortal.overview({ token: "p".repeat(24) })).resolves.toMatchObject({ organisation: { id: 4 } });
    expect(mocks.getMagicPortalOverview).toHaveBeenCalledWith("p".repeat(24));
  });

  it("uses the direct-link token as the only portal scope, preventing a caller from selecting another brand", async () => {
    const rebornToken = "r".repeat(24);
    const bulkToken = "b".repeat(24);
    mocks.getMagicPortalOverview.mockImplementation(async (token) => token === rebornToken
      ? { organisation: { id: 4, name: "Reborn customer" }, collections: [{ brand: "reborn" }], attachments: [], events: [] }
      : { organisation: { id: 8, name: "Bulk GSM customer" }, collections: [{ brand: "bulk_gsm" }], attachments: [], events: [] });
    const publicCaller = appRouter.createCaller({ user: null, req: {}, res: {} } as TrpcContext);

    await expect(publicCaller.magicPortal.overview({ token: rebornToken })).resolves.toMatchObject({ collections: [{ brand: "reborn" }] });
    await expect(publicCaller.magicPortal.overview({ token: bulkToken })).resolves.toMatchObject({ collections: [{ brand: "bulk_gsm" }] });

    expect(mocks.getMagicPortalOverview).toHaveBeenNthCalledWith(1, rebornToken);
    expect(mocks.getMagicPortalOverview).toHaveBeenNthCalledWith(2, bulkToken);
  });

  it("rejects invalid and expired direct invitation tokens", async () => {
    const publicCaller = appRouter.createCaller({ user: null, req: {}, res: {} } as TrpcContext);
    mocks.getMagicPortalOverview.mockRejectedValueOnce(new Error("This invitation is not recognised"));
    await expect(publicCaller.magicPortal.overview({ token: "i".repeat(24) })).rejects.toThrow("not recognised");
    mocks.getMagicPortalOverview.mockRejectedValueOnce(new Error("This invitation has expired"));
    await expect(publicCaller.magicPortal.overview({ token: "e".repeat(24) })).rejects.toThrow("expired");
  });

  it("rejects a magic-link file request outside its customer-visible organisation scope", async () => {
    const publicCaller = appRouter.createCaller({ user: null, req: {}, res: {} } as TrpcContext);
    mocks.getMagicPortalAttachment.mockRejectedValueOnce(new Error("This file is not available through the invitation link"));
    await expect(publicCaller.magicPortal.downloadAttachment({ token: "f".repeat(24), attachmentId: 91 })).rejects.toThrow("not available");
  });

  it("releases a customer-visible document from the invited organisation through a signed URL", async () => {
    const publicCaller = appRouter.createCaller({ user: null, req: {}, res: {} } as TrpcContext);
    mocks.getMagicPortalAttachment.mockResolvedValueOnce({ storageKey: "collection-routes/4/inventory.pdf", fileName: "inventory.pdf" });
    mocks.storageGetSignedUrl.mockResolvedValueOnce("https://files.example.com/signed-inventory");

    await expect(publicCaller.magicPortal.downloadAttachment({ token: "a".repeat(24), attachmentId: 8 })).resolves.toEqual({ url: "https://files.example.com/signed-inventory", fileName: "inventory.pdf" });
    expect(mocks.getMagicPortalAttachment).toHaveBeenCalledWith("a".repeat(24), 8);
  });
});
