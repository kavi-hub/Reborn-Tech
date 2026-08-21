import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createAssessmentRequest: vi.fn(),
  bulkReassignItadJobExceptions: vi.fn(),
  listAssessmentRequests: vi.fn(),
  updateAssessmentStatus: vi.fn(),
  deleteAssessmentRequest: vi.fn(),
  exportAssessmentRequests: vi.fn(),
  createCollectionTrack: vi.fn(),
  createItadJobAsset: vi.fn(),
  createItadJobAssetsFromImport: vi.fn(),
  createItadJobComment: vi.fn(),
  createItadJobEvidenceRecord: vi.fn(),
  createItadJobException: vi.fn(),
  createSecurazeImportBatch: vi.fn(),
  createSecurazeImportExceptions: vi.fn(),
  approveItadJobEvidence: vi.fn(),
  approveItadJobImpactStatement: vi.fn(),
  updateItadJobStage: vi.fn(),
  upsertItadJobImpactStatement: vi.fn(),
  recordClientNotification: vi.fn(),
  getItadJobDetail: vi.fn(),
  getItadJobExceptionKpis: vi.fn(),
  getItadJobEvidenceFile: vi.fn(),
  getMagicPortalCoreEvidence: vi.fn(),
  listAdminCollections: vi.fn(),
  listCustomerPortalCollections: vi.fn(),
  updateCollectionStatus: vi.fn(),
  updateItadJobException: vi.fn(),
  assignCustomerOrganisationMember: vi.fn(),
  createCustomerPortalInvitation: vi.fn(),
  getPortalInvitation: vi.fn(),
  listActivePortalInvitations: vi.fn(),
  listOrganisationPortalInvitations: vi.fn(),
  listOperationsAdmins: vi.fn(),
  recordPortalInvitationEmail: vi.fn(),
  recordPortalInvitationEmailFailure: vi.fn(),
  revokePortalInvitation: vi.fn(),
  claimCustomerPortalInvitation: vi.fn(),
  getMagicPortalOverview: vi.fn(),
  getMagicPortalAttachment: vi.fn(),
  assignCustomerViewerByOrganisationAdmin: vi.fn(),
  getCustomerOrganisationMembership: vi.fn(),
  getOperationsUserById: vi.fn(),
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
  listSecurazeImportExceptions: vi.fn(),
  notifyOwner: vi.fn(),
  findOperationsAdminByEmail: vi.fn(),
  sendPortalInvitationEmail: vi.fn(),
  sendCollectionStatusEmail: vi.fn(),
  sendCollectionBookedEmail: vi.fn(),
  sendJobCompletedEmail: vi.fn(),
  sendExceptionLifecycleEmail: vi.fn(),
  sendClientPasswordResetEmail: vi.fn(),
  getClientAccountActivationInvitation: vi.fn(),
  activateClientPortalAccount: vi.fn(),
  getClientPortalAccountByEmail: vi.fn(),
  getClientPortalAccountById: vi.fn(),
  getClientPortalAccountForBrand: vi.fn(),
  getActiveClientPortalAccountForSession: vi.fn(),
  createClientPasswordResetToken: vi.fn(),
  resetClientPortalPassword: vi.fn(),
  listClientPortalAccounts: vi.fn(),
  listClientPortalAccountActivity: vi.fn(),
  getBrandSupportContact: vi.fn(),
  upsertBrandSupportContact: vi.fn(),
  setClientPortalAccountStatus: vi.fn(),
  recordClientPortalSignIn: vi.fn(),
  listClientPortalCollections: vi.fn(),
  listClientPortalAttachments: vi.fn(),
  listClientPortalAuditEvents: vi.fn(),
  listClientPortalCoreEvidence: vi.fn(),
  listClientPortalImpactStatements: vi.fn(),
  listClientPortalJobLifecycle: vi.fn(),
  getClientPortalAttachment: vi.fn(),
  getClientPortalCoreEvidence: vi.fn(),
  hashClientPassword: vi.fn(),
  verifyClientPassword: vi.fn(),
  setClientPortalSession: vi.fn(),
  clearClientPortalSession: vi.fn(),
}));

vi.mock("./db", () => ({
  createAssessmentRequest: mocks.createAssessmentRequest,
  bulkReassignItadJobExceptions: mocks.bulkReassignItadJobExceptions,
  listAssessmentRequests: mocks.listAssessmentRequests,
  updateAssessmentStatus: mocks.updateAssessmentStatus,
  deleteAssessmentRequest: mocks.deleteAssessmentRequest,
  exportAssessmentRequests: mocks.exportAssessmentRequests,
  createCollectionTrack: mocks.createCollectionTrack,
  createItadJobAsset: mocks.createItadJobAsset,
  createItadJobAssetsFromImport: mocks.createItadJobAssetsFromImport,
  createItadJobComment: mocks.createItadJobComment,
  createItadJobEvidenceRecord: mocks.createItadJobEvidenceRecord,
  createItadJobException: mocks.createItadJobException,
  createSecurazeImportBatch: mocks.createSecurazeImportBatch,
  createSecurazeImportExceptions: mocks.createSecurazeImportExceptions,
  approveItadJobEvidence: mocks.approveItadJobEvidence,
  approveItadJobImpactStatement: mocks.approveItadJobImpactStatement,
  updateItadJobStage: mocks.updateItadJobStage,
  upsertItadJobImpactStatement: mocks.upsertItadJobImpactStatement,
  recordClientNotification: mocks.recordClientNotification,
  listAdminCollections: mocks.listAdminCollections,
  listCustomerPortalCollections: mocks.listCustomerPortalCollections,
  updateCollectionStatus: mocks.updateCollectionStatus,
  assignCustomerOrganisationMember: mocks.assignCustomerOrganisationMember,
  createCustomerPortalInvitation: mocks.createCustomerPortalInvitation,
  getPortalInvitation: mocks.getPortalInvitation,
  listActivePortalInvitations: mocks.listActivePortalInvitations,
  listOrganisationPortalInvitations: mocks.listOrganisationPortalInvitations,
  listOperationsAdmins: mocks.listOperationsAdmins,
  recordPortalInvitationEmail: mocks.recordPortalInvitationEmail,
  recordPortalInvitationEmailFailure: mocks.recordPortalInvitationEmailFailure,
  revokePortalInvitation: mocks.revokePortalInvitation,
  claimCustomerPortalInvitation: mocks.claimCustomerPortalInvitation,
  getMagicPortalOverview: mocks.getMagicPortalOverview,
  getMagicPortalAttachment: mocks.getMagicPortalAttachment,
  getMagicPortalCoreEvidence: mocks.getMagicPortalCoreEvidence,
  assignCustomerViewerByOrganisationAdmin: mocks.assignCustomerViewerByOrganisationAdmin,
  getCustomerOrganisationMembership: mocks.getCustomerOrganisationMembership,
  getOperationsUserById: mocks.getOperationsUserById,
  getItadJobDetail: mocks.getItadJobDetail,
  getItadJobExceptionKpis: mocks.getItadJobExceptionKpis,
  getItadJobEvidenceFile: mocks.getItadJobEvidenceFile,
  updateItadJobException: mocks.updateItadJobException,
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
  listSecurazeImportExceptions: mocks.listSecurazeImportExceptions,
  findOperationsAdminByEmail: mocks.findOperationsAdminByEmail,
  getClientAccountActivationInvitation: mocks.getClientAccountActivationInvitation,
  activateClientPortalAccount: mocks.activateClientPortalAccount,
  getClientPortalAccountByEmail: mocks.getClientPortalAccountByEmail,
  getClientPortalAccountById: mocks.getClientPortalAccountById,
  getClientPortalAccountForBrand: mocks.getClientPortalAccountForBrand,
  getActiveClientPortalAccountForSession: mocks.getActiveClientPortalAccountForSession,
  createClientPasswordResetToken: mocks.createClientPasswordResetToken,
  resetClientPortalPassword: mocks.resetClientPortalPassword,
  listClientPortalAccounts: mocks.listClientPortalAccounts,
  listClientPortalAccountActivity: mocks.listClientPortalAccountActivity,
  getBrandSupportContact: mocks.getBrandSupportContact,
  upsertBrandSupportContact: mocks.upsertBrandSupportContact,
  setClientPortalAccountStatus: mocks.setClientPortalAccountStatus,
  recordClientPortalSignIn: mocks.recordClientPortalSignIn,
  listClientPortalCollections: mocks.listClientPortalCollections,
  listClientPortalAttachments: mocks.listClientPortalAttachments,
  listClientPortalAuditEvents: mocks.listClientPortalAuditEvents,
  listClientPortalCoreEvidence: mocks.listClientPortalCoreEvidence,
  listClientPortalImpactStatements: mocks.listClientPortalImpactStatements,
  listClientPortalJobLifecycle: mocks.listClientPortalJobLifecycle,
  getClientPortalAttachment: mocks.getClientPortalAttachment,
  getClientPortalCoreEvidence: mocks.getClientPortalCoreEvidence,
}));

vi.mock("./_core/notification", () => ({
  notifyOwner: mocks.notifyOwner,
}));

vi.mock("./rebornEmail", () => ({
  sendPortalInvitationEmail: mocks.sendPortalInvitationEmail,
  sendCollectionStatusEmail: mocks.sendCollectionStatusEmail,
  sendCollectionBookedEmail: mocks.sendCollectionBookedEmail,
  sendJobCompletedEmail: mocks.sendJobCompletedEmail,
  sendExceptionLifecycleEmail: mocks.sendExceptionLifecycleEmail,
  sendClientPasswordResetEmail: mocks.sendClientPasswordResetEmail,
}));

vi.mock("./storage", () => ({
  storagePut: mocks.storagePut,
  storageGetSignedUrl: mocks.storageGetSignedUrl,
}));

vi.mock("./clientPortalAuth", () => ({
  hashClientPassword: mocks.hashClientPassword,
  verifyClientPassword: mocks.verifyClientPassword,
  setClientPortalSession: mocks.setClientPortalSession,
  clearClientPortalSession: mocks.clearClientPortalSession,
}));

import { assessmentInputSchema, appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import { mapSecurazeCsv } from "./securazeCsv";

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
    process.env.JWT_SECRET ||= "test-preview-receipt-secret";
    mocks.createCollectionAuditEvent.mockResolvedValue(undefined);
    mocks.listCollectionIdsForOrganisation.mockResolvedValue([]);
    mocks.listActivePortalInvitations.mockResolvedValue([]);
    mocks.listOrganisationPortalInvitations.mockResolvedValue([]);
    mocks.sendPortalInvitationEmail.mockResolvedValue("email_123");
    mocks.getActiveClientPortalAccountForSession.mockResolvedValue({ id: 44, status: "active", sessionVersion: 0 });
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

  it("keeps detailed Core Job records inside the requested brand partition", async () => {
    mocks.getItadJobDetail.mockResolvedValue({ job: { id: 44, brand: "bulk_gsm", jobReference: "BG-2026-001" }, assets: [], evidence: [], importBatches: [] });
    const admin = appRouter.createCaller({ user: { id: 1, role: "admin" }, req: {}, res: {} } as TrpcContext);

    await expect(admin.itadCore.detail({ jobId: 44, brand: "bulk_gsm" })).resolves.toMatchObject({ job: { brand: "bulk_gsm" } });

    expect(mocks.getItadJobDetail).toHaveBeenCalledWith(44, "bulk_gsm");
  });

  it("records structured inventory with its explicit Core brand and rejects an invalid quantity", async () => {
    mocks.createItadJobAsset.mockResolvedValue({ id: 4, jobId: 44, brand: "reborn", assetCategory: "Laptop", quantity: 12 });
    const admin = appRouter.createCaller({ user: { id: 1, role: "admin" }, req: {}, res: {} } as TrpcContext);

    await expect(admin.itadCore.addAsset({ jobId: 44, brand: "reborn", assetCategory: "Laptop", quantity: 12, condition: "working", dataHandlingState: "evidence_pending" })).resolves.toMatchObject({ asset: { brand: "reborn", quantity: 12 } });
    await expect(admin.itadCore.addAsset({ jobId: 44, brand: "reborn", assetCategory: "Laptop", quantity: 0, condition: "working", dataHandlingState: "evidence_pending" })).rejects.toThrow();

    expect(mocks.createItadJobAsset).toHaveBeenCalledWith(expect.objectContaining({ jobId: 44, brand: "reborn", assetCategory: "Laptop", quantity: 12 }));
  });

  it("records Securaze exports as review-required intake instead of treating them as verified erasure evidence", async () => {
    mocks.createSecurazeImportBatch.mockResolvedValue({ id: 6, jobId: 44, brand: "bulk_gsm", status: "review_required" });
    const admin = appRouter.createCaller({ user: { id: 1, role: "admin" }, req: {}, res: {} } as TrpcContext);

    await expect(admin.itadCore.recordSecurazeImport({ jobId: 44, brand: "bulk_gsm", importReference: "SZ-2026-004", reportedRecordCount: 40 })).resolves.toMatchObject({ importBatch: { status: "review_required" } });

    expect(mocks.createSecurazeImportBatch).toHaveBeenCalledWith(expect.objectContaining({ jobId: 44, brand: "bulk_gsm", status: "review_required", reportedRecordCount: 40, importedByUserId: 1 }));
  });

  it("requires the correct job and brand before releasing a Core evidence file", async () => {
    mocks.getItadJobEvidenceFile.mockResolvedValue({ id: 9, jobId: 44, brand: "reborn", fileName: "certificate.pdf", storageKey: "itad-core/jobs/44/evidence/certificate.pdf" });
    mocks.storageGetSignedUrl.mockResolvedValue("https://files.example.com/core-evidence");
    const admin = appRouter.createCaller({ user: { id: 1, role: "admin" }, req: {}, res: {} } as TrpcContext);

    await expect(admin.itadCore.downloadEvidence({ evidenceId: 9, jobId: 44, brand: "reborn" })).resolves.toEqual({ url: "https://files.example.com/core-evidence", fileName: "certificate.pdf" });

    expect(mocks.getItadJobEvidenceFile).toHaveBeenCalledWith({ evidenceId: 9, jobId: 44, brand: "reborn" });
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

  it("exposes only masked invitation activation metadata before a password client session exists", async () => {
    mocks.getClientAccountActivationInvitation.mockResolvedValue({ id: 9, email: "client@example.com", organisationId: 4, brand: "reborn", role: "viewer", expiresAt: new Date("2026-09-01") });
    const publicCaller = appRouter.createCaller({ user: null, clientSession: null, req: {}, res: {} } as TrpcContext);
    await expect(publicCaller.clientAuth.invitation({ token: "p".repeat(24) })).resolves.toEqual({ email: "cl••••@example.com", organisationId: 4, brand: "reborn", role: "viewer" });
    await expect(publicCaller.clientPortal.collections()).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    expect(appRouter._def.procedures["magicPortal.overview"]).toBeUndefined();
  });

  it("rejects invalid and expired client activation invitations", async () => {
    const publicCaller = appRouter.createCaller({ user: null, clientSession: null, req: {}, res: {} } as TrpcContext);
    mocks.getClientAccountActivationInvitation.mockRejectedValueOnce(new Error("This client access invitation is not recognised"));
    await expect(publicCaller.clientAuth.invitation({ token: "i".repeat(24) })).rejects.toThrow("not recognised");
    mocks.getClientAccountActivationInvitation.mockRejectedValueOnce(new Error("This client access invitation has expired"));
    await expect(publicCaller.clientAuth.invitation({ token: "e".repeat(24) })).rejects.toThrow("expired");
  });

  it("releases a customer-visible document only through the signed client organisation scope", async () => {
    const clientCaller = appRouter.createCaller({ user: null, clientSession: { accountId: 12, organisationId: 4, brand: "reborn", role: "viewer", email: "client@example.com" }, req: {}, res: {} } as TrpcContext);
    mocks.getClientPortalAttachment.mockResolvedValueOnce({ storageKey: "collection-routes/4/inventory.pdf", fileName: "inventory.pdf" });
    mocks.storageGetSignedUrl.mockResolvedValueOnce("https://files.example.com/signed-inventory");
    await expect(clientCaller.clientPortal.downloadAttachment({ attachmentId: 8 })).resolves.toEqual({ url: "https://files.example.com/signed-inventory", fileName: "inventory.pdf" });
    expect(mocks.getClientPortalAttachment).toHaveBeenCalledWith(4, "reborn", 8);
  });

  it("maps a Securaze CSV through explicit headers while holding invalid and duplicate rows as review exceptions", () => {
    const mapped = mapSecurazeCsv("Serial Number,Result,Device Type,Manufacturer\nSN-001,Completed,Laptop,Dell\nSN-002,,Laptop,Lenovo\nSN-001,Completed,Laptop,Dell");

    expect(mapped.fieldMapping).toMatchObject({ serialNumber: "Serial Number", sourceResult: "Result", assetCategory: "Device Type" });
    expect(mapped.validRows).toEqual([expect.objectContaining({ serialNumber: "SN-001", assetCategory: "Laptop", sourceResult: "Completed", dataHandlingState: "evidence_pending" })]);
    expect(mapped.exceptions).toEqual(expect.arrayContaining([expect.objectContaining({ rowNumber: 3, code: "missing_result" }), expect.objectContaining({ rowNumber: 4, code: "duplicate_serial" })]));
    expect(() => mapSecurazeCsv("Serial Number,Device Type\nSN-001,Laptop")).toThrow("result/status");
  });

  it("previews mapped Securaze rows without writes, then confirms the exact reviewed file into the selected brand", async () => {
    mocks.storagePut.mockResolvedValue({ key: "itad-core/jobs/44/securaze/export.csv", url: "/manus-storage/itad-core/jobs/44/securaze/export.csv" });
    mocks.createSecurazeImportBatch.mockResolvedValue({ id: 61, jobId: 44, brand: "bulk_gsm", importedRecordCount: 1, exceptionCount: 0 });
    mocks.createItadJobAssetsFromImport.mockResolvedValue(1);
    mocks.createSecurazeImportExceptions.mockResolvedValue(0);
    const admin = appRouter.createCaller({ user: { id: 1, role: "admin" }, req: {}, res: {} } as TrpcContext);
    const source = "Serial Number,Result,Device Type\nBG-101,Completed,Laptop";
    const file = { fileName: "securaze.csv", contentType: "text/csv", contentBase64: Buffer.from(source).toString("base64") };

    const preview = await admin.itadCore.previewSecurazeCsv({ jobId: 44, brand: "bulk_gsm", importReference: "SZ-BG-101", file });
    expect(preview.preview.validRows).toHaveLength(1);
    expect(mocks.createSecurazeImportBatch).not.toHaveBeenCalled();
    expect(mocks.storagePut).not.toHaveBeenCalled();

    await expect(admin.itadCore.confirmSecurazeCsv({ jobId: 44, brand: "bulk_gsm", importReference: "SZ-BG-101", file, previewReceipt: preview.previewReceipt })).resolves.toMatchObject({ importBatch: { id: 61 }, mapping: { fieldMapping: { serialNumber: "Serial Number" } } });

    expect(mocks.createSecurazeImportBatch).toHaveBeenCalledWith(expect.objectContaining({ jobId: 44, brand: "bulk_gsm", status: "review_required", importedRecordCount: 1, exceptionCount: 0, mappingVersion: "securaze_csv_v1" }));
    expect(mocks.createItadJobAssetsFromImport).toHaveBeenCalledWith(expect.objectContaining({ jobId: 44, brand: "bulk_gsm", sourceImportBatchId: 61, rows: [expect.objectContaining({ serialNumber: "BG-101", sourceResult: "Completed", dataHandlingState: "evidence_pending" })] }));
  });

  it("refuses confirmation when the CSV no longer matches the reviewed preview", async () => {
    const admin = appRouter.createCaller({ user: { id: 1, role: "admin" }, req: {}, res: {} } as TrpcContext);
    const reviewed = { fileName: "securaze.csv", contentType: "text/csv", contentBase64: Buffer.from("Serial Number,Result\nSN-1,Completed").toString("base64") };
    const changed = { ...reviewed, contentBase64: Buffer.from("Serial Number,Result\nSN-2,Completed").toString("base64") };
    const preview = await admin.itadCore.previewSecurazeCsv({ jobId: 44, brand: "reborn", file: reviewed });

    await expect(admin.itadCore.confirmSecurazeCsv({ jobId: 44, brand: "reborn", file: changed, previewReceipt: preview.previewReceipt })).rejects.toThrow("does not match");
    expect(mocks.createSecurazeImportBatch).not.toHaveBeenCalled();
    expect(mocks.storagePut).not.toHaveBeenCalled();
  });

  it("requires an explicit admin approval before a Core evidence record can enter the customer channel", async () => {
    mocks.approveItadJobEvidence.mockResolvedValue({ id: 17, jobId: 44, brand: "reborn", customerVisible: true, customerApprovedAt: new Date() });
    const admin = appRouter.createCaller({ user: { id: 7, role: "admin" }, req: {}, res: {} } as TrpcContext);

    await expect(admin.itadCore.approveEvidence({ evidenceId: 17, jobId: 44, brand: "reborn" })).resolves.toMatchObject({ evidence: { customerVisible: true } });
    expect(mocks.approveItadJobEvidence).toHaveBeenCalledWith({ evidenceId: 17, jobId: 44, brand: "reborn", approvedByUserId: 7 });
  });

  it("keeps Core comments and exception ownership explicitly attributed to the acting operator", async () => {
    mocks.createItadJobComment.mockResolvedValue(undefined);
    mocks.createItadJobException.mockResolvedValue({ job: { jobReference: "RB-44" }, title: "Serial mismatch", ownerUserId: 7 });
    mocks.updateItadJobException.mockResolvedValue({ job: { jobReference: "RB-44" }, exception: { title: "Serial mismatch", ownerUserId: 7 }, ownerUserId: 7 });
    const admin = appRouter.createCaller({ user: { id: 7, role: "admin" }, req: {}, res: {} } as TrpcContext);

    await expect(admin.itadCore.addComment({ jobId: 44, brand: "reborn", comment: "Awaiting manifest confirmation." })).resolves.toEqual({ success: true });
    await expect(admin.itadCore.createException({ jobId: 44, brand: "reborn", title: "Serial mismatch", detail: "One source serial requires review." })).resolves.toMatchObject({ success: true });
    await expect(admin.itadCore.updateException({ exceptionId: 8, jobId: 44, brand: "reborn", status: "in_progress", takeOwnership: true })).resolves.toMatchObject({ success: true });

    expect(mocks.createItadJobComment).toHaveBeenCalledWith({ jobId: 44, brand: "reborn", comment: "Awaiting manifest confirmation.", createdByUserId: 7 });
    expect(mocks.createItadJobException).toHaveBeenCalledWith({ jobId: 44, brand: "reborn", title: "Serial mismatch", detail: "One source serial requires review.", ownerUserId: 7, createdByUserId: 7 });
    expect(mocks.updateItadJobException).toHaveBeenCalledWith({ exceptionId: 8, jobId: 44, brand: "reborn", status: "in_progress", takeOwnership: true, actorUserId: 7 });
  });

  it("releases only approved Core evidence through the signed client session scope", async () => {
    const clientCaller = appRouter.createCaller({ user: null, clientSession: { accountId: 12, organisationId: 4, brand: "reborn", role: "viewer", email: "client@example.com" }, req: {}, res: {} } as TrpcContext);
    mocks.getClientPortalCoreEvidence.mockResolvedValueOnce({ id: 22, storageKey: "itad-core/jobs/44/evidence/approved.pdf", fileName: "approved.pdf" });
    mocks.storageGetSignedUrl.mockResolvedValueOnce("https://files.example.com/approved-core-evidence");

    await expect(clientCaller.clientPortal.downloadCoreEvidence({ evidenceId: 22 })).resolves.toEqual({ url: "https://files.example.com/approved-core-evidence", fileName: "approved.pdf" });
    expect(mocks.getClientPortalCoreEvidence).toHaveBeenCalledWith(4, "reborn", 22);

    mocks.getClientPortalCoreEvidence.mockRejectedValueOnce(new Error("This Core evidence file is not available through your client account"));
    await expect(clientCaller.clientPortal.downloadCoreEvidence({ evidenceId: 99 })).rejects.toThrow("not available");
  });

  it("fails closed when an advanced Core action targets a Job from another brand partition", async () => {
    const admin = appRouter.createCaller({ user: { id: 7, role: "admin" }, req: {}, res: {} } as TrpcContext);
    mocks.storagePut.mockResolvedValue({ key: "itad-core/jobs/44/securaze/cross-brand.csv", url: "/manus-storage/itad-core/jobs/44/securaze/cross-brand.csv" });
    mocks.createSecurazeImportBatch.mockRejectedValueOnce(new Error("ITAD Core Job could not be found in this brand workspace"));
    mocks.approveItadJobEvidence.mockRejectedValueOnce(new Error("Evidence record could not be found in this Core Job"));
    mocks.createItadJobComment.mockRejectedValueOnce(new Error("ITAD Core Job could not be found in this brand workspace"));
    mocks.updateItadJobException.mockRejectedValueOnce(new Error("Exception record could not be found in this Core Job"));
    const source = "Serial Number,Result\nRB-999,Completed";

    const file = { fileName: "cross-brand.csv", contentType: "text/csv", contentBase64: Buffer.from(source).toString("base64") };
    const preview = await admin.itadCore.previewSecurazeCsv({ jobId: 44, brand: "bulk_gsm", file });
    await expect(admin.itadCore.confirmSecurazeCsv({ jobId: 44, brand: "bulk_gsm", file, previewReceipt: preview.previewReceipt })).rejects.toThrow("brand workspace");
    await expect(admin.itadCore.approveEvidence({ evidenceId: 17, jobId: 44, brand: "bulk_gsm" })).rejects.toThrow("could not be found");
    await expect(admin.itadCore.addComment({ jobId: 44, brand: "bulk_gsm", comment: "This must not cross brands." })).rejects.toThrow("brand workspace");
    await expect(admin.itadCore.updateException({ exceptionId: 8, jobId: 44, brand: "bulk_gsm", status: "resolved", takeOwnership: true })).rejects.toThrow("could not be found");
  });

  it("rejects a Core evidence download when the requested brand does not own the Job", async () => {
    mocks.getItadJobEvidenceFile.mockRejectedValueOnce(new Error("This evidence record does not have an attached file in this Core Job"));
    const admin = appRouter.createCaller({ user: { id: 7, role: "admin" }, req: {}, res: {} } as TrpcContext);

    await expect(admin.itadCore.downloadEvidence({ evidenceId: 22, jobId: 44, brand: "bulk_gsm" })).rejects.toThrow("Core Job");
    expect(mocks.getItadJobEvidenceFile).toHaveBeenCalledWith({ evidenceId: 22, jobId: 44, brand: "bulk_gsm" });
  });

  it("exports only the Securaze exceptions scoped to the requested Core Job and brand", async () => {
    mocks.listSecurazeImportExceptions.mockResolvedValue([{ exception: { sourceRowNumber: 8, code: "missing_result", message: "Result/status is required" }, importBatch: { id: 61, importReference: "SZ-61", sourceFileName: "securaze.csv" } }]);
    const admin = appRouter.createCaller({ user: { id: 7, role: "admin" }, req: {}, res: {} } as TrpcContext);

    const report = await admin.itadCore.exportSecurazeExceptions({ jobId: 44, brand: "bulk_gsm", importBatchId: 61 });
    expect(mocks.listSecurazeImportExceptions).toHaveBeenCalledWith({ jobId: 44, brand: "bulk_gsm", importBatchId: 61 });
    expect(report.fileName).toContain("bulk_gsm-job-44-batch-61");
    expect(report.csv).toContain('"SZ-61","securaze.csv","8","missing_result","Result/status is required"');
  });

  it("notifies a registered operations admin on assignment and does not block an update when a resolution email fails", async () => {
    mocks.findOperationsAdminByEmail.mockResolvedValue({ id: 14, name: "Andi", email: "andi@example.com" });
    mocks.createItadJobException.mockResolvedValue({ job: { jobReference: "RB-44" }, title: "Serial mismatch", ownerUserId: 14 });
    mocks.sendExceptionLifecycleEmail.mockResolvedValue("email_14");
    mocks.updateItadJobException.mockResolvedValue({ job: { jobReference: "RB-44" }, exception: { title: "Serial mismatch", ownerUserId: 14 }, ownerUserId: 14 });
    mocks.getOperationsUserById.mockResolvedValue({ id: 14, name: "Andi", email: "andi@example.com" });
    const admin = appRouter.createCaller({ user: { id: 7, name: "Kavi", role: "admin" }, req: { headers: { host: "reborntech.manus.space" } }, res: {} } as TrpcContext);

    await expect(admin.itadCore.createException({ jobId: 44, brand: "reborn", title: "Serial mismatch", assigneeEmail: "andi@example.com" })).resolves.toMatchObject({ success: true, emailDelivered: true });
    expect(mocks.sendExceptionLifecycleEmail).toHaveBeenCalledWith(expect.objectContaining({ to: "andi@example.com", event: "assigned" }));

    mocks.sendExceptionLifecycleEmail.mockRejectedValueOnce(new Error("Resend unavailable"));
    await expect(admin.itadCore.updateException({ exceptionId: 8, jobId: 44, brand: "reborn", status: "resolved", takeOwnership: false })).resolves.toMatchObject({ success: true, emailDelivered: false });
  });

  it("returns the accepted Securaze template and brand-scoped exception KPI summary", async () => {
    mocks.getItadJobExceptionKpis.mockResolvedValue({ unresolvedCount: 4, ageingOver24Hours: 2, ageingOver72Hours: 1, oldestUnresolved: { id: 9, title: "Awaiting serial", ageHours: 80, createdAt: new Date() } });
    const admin = appRouter.createCaller({ user: { id: 7, role: "admin" }, req: {}, res: {} } as TrpcContext);

    await expect(admin.itadCore.exceptionKpis({ jobId: 44, brand: "bulk_gsm" })).resolves.toMatchObject({ unresolvedCount: 4, ageingOver72Hours: 1 });
    expect(mocks.getItadJobExceptionKpis).toHaveBeenCalledWith(44, "bulk_gsm");
    const template = await admin.itadCore.securazeTemplate();
    expect(template.acceptedHeaders).toEqual(expect.arrayContaining(["Serial Number", "Result", "Device Type"]));
    expect(template.csv).toContain("EXAMPLE-123,Completed,Laptop");
  });

  it("bulk reassigns only selected brand-scoped exceptions to one registered operations admin", async () => {
    mocks.getOperationsUserById.mockResolvedValue({ id: 14, name: "Andi", email: "andi@example.com" });
    mocks.bulkReassignItadJobExceptions.mockResolvedValue({ job: { jobReference: "BG-44" }, records: [{ id: 3 }, { id: 8 }] });
    mocks.sendExceptionLifecycleEmail.mockResolvedValue("email_bulk");
    const admin = appRouter.createCaller({ user: { id: 7, name: "Kavi", role: "admin" }, req: { headers: { host: "reborntech.manus.space" } }, res: {} } as TrpcContext);

    await expect(admin.itadCore.bulkReassignExceptions({ jobId: 44, brand: "bulk_gsm", exceptionIds: [3, 8, 3], assigneeUserId: 14 })).resolves.toMatchObject({ success: true, reassignedCount: 2, emailDelivered: true });
    expect(mocks.bulkReassignItadJobExceptions).toHaveBeenCalledWith({ jobId: 44, brand: "bulk_gsm", exceptionIds: [3, 8], ownerUserId: 14, actorUserId: 7 });
    expect(mocks.sendExceptionLifecycleEmail).toHaveBeenCalledWith(expect.objectContaining({ to: "andi@example.com", jobReference: "BG-44", event: "assigned" }));

    mocks.getOperationsUserById.mockResolvedValueOnce(null);
    await expect(admin.itadCore.bulkReassignExceptions({ jobId: 44, brand: "bulk_gsm", exceptionIds: [3], assigneeUserId: 999 })).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("lists registered operations admins and persists optional due dates through exception lifecycle actions", async () => {
    mocks.listOperationsAdmins.mockResolvedValue([{ id: 7, name: "Kavi", email: "kavi@example.com" }, { id: 14, name: "Andi", email: "andi@example.com" }]);
    mocks.createItadJobException.mockResolvedValue({ job: { jobReference: "RB-44" }, title: "Manifest check", ownerUserId: 7 });
    mocks.updateItadJobException.mockResolvedValue({ job: { jobReference: "RB-44" }, exception: { title: "Manifest check", ownerUserId: 7 }, ownerUserId: 7 });
    const admin = appRouter.createCaller({ user: { id: 7, role: "admin" }, req: {}, res: {} } as TrpcContext);
    const dueAt = new Date("2026-09-01T23:59:59.999Z");

    await expect(admin.itadCore.operationsAdmins()).resolves.toHaveLength(2);
    await admin.itadCore.createException({ jobId: 44, brand: "reborn", title: "Manifest check", dueAt });
    await admin.itadCore.updateException({ exceptionId: 8, jobId: 44, brand: "reborn", status: "in_progress", takeOwnership: false, dueAt: null });
    expect(mocks.createItadJobException).toHaveBeenCalledWith(expect.objectContaining({ jobId: 44, brand: "reborn", dueAt }));
    expect(mocks.updateItadJobException).toHaveBeenCalledWith(expect.objectContaining({ exceptionId: 8, jobId: 44, brand: "reborn", dueAt: null, actorUserId: 7 }));
  });

  it("rejects malformed due dates and prevents non-admin callers from reading the admin directory", async () => {
    const admin = appRouter.createCaller({ user: { id: 7, role: "admin" }, req: {}, res: {} } as TrpcContext);
    const member = appRouter.createCaller({ user: { id: 9, role: "user" }, req: {}, res: {} } as TrpcContext);

    await expect(admin.itadCore.createException({ jobId: 44, brand: "reborn", title: "Bad deadline", dueAt: "not-a-date" as unknown as Date })).rejects.toMatchObject({ code: "BAD_REQUEST" });
    await expect(member.itadCore.operationsAdmins()).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(mocks.listOperationsAdmins).not.toHaveBeenCalled();
  });

  it("activates an invited client password account and scopes the resulting session to its organisation and brand", async () => {
    mocks.getClientAccountActivationInvitation.mockResolvedValue({ id: 91, email: "client@example.com", organisationId: 55, brand: "reborn", role: "viewer", expiresAt: new Date("2026-09-01") });
    mocks.hashClientPassword.mockResolvedValue("scrypt$hash");
    mocks.activateClientPortalAccount.mockResolvedValue({ id: 44, email: "client@example.com", organisationId: 55, brand: "reborn", role: "viewer", sessionVersion: 0 });
    const caller = appRouter.createCaller({ user: null, clientSession: null, req: {}, res: {} } as TrpcContext);

    await expect(caller.clientAuth.invitation({ token: "a".repeat(24) })).resolves.toMatchObject({ email: "cl••••@example.com", brand: "reborn" });
    await expect(caller.clientAuth.activate({ token: "a".repeat(24), password: "Password12345" })).resolves.toEqual({ success: true, brand: "reborn" });
    expect(mocks.activateClientPortalAccount).toHaveBeenCalledWith({ token: "a".repeat(24), passwordHash: "scrypt$hash" });
    expect(mocks.setClientPortalSession).toHaveBeenCalledWith(expect.anything(), expect.anything(), { accountId: 44, organisationId: 55, brand: "reborn", role: "viewer", email: "client@example.com", sessionVersion: 0 }, false);
  });

  it("rejects invalid client credentials and denies client dashboard reads without a client session", async () => {
    mocks.getClientPortalAccountByEmail.mockResolvedValue(null);
    const anonymous = appRouter.createCaller({ user: null, clientSession: null, req: {}, res: {} } as TrpcContext);
    await expect(anonymous.clientAuth.login({ email: "nobody@example.com", password: "Password12345" })).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    await expect(anonymous.clientPortal.collections()).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    expect(appRouter._def.procedures["magicPortal.overview"]).toBeUndefined();
  });

  it("reads client dashboard data only from the signed client organisation and brand", async () => {
    mocks.listClientPortalCollections.mockResolvedValue([]);
    mocks.listClientPortalAttachments.mockResolvedValue([]);
    mocks.listClientPortalAuditEvents.mockResolvedValue({ events: [], total: 0 });
    mocks.listClientPortalCoreEvidence.mockResolvedValue([]);
    const client = appRouter.createCaller({ user: null, clientSession: { accountId: 44, organisationId: 55, brand: "bulk_gsm", role: "viewer", email: "client@example.com", sessionVersion: 0 }, req: {}, res: {} } as TrpcContext);
    await client.clientPortal.collections();
    await client.clientPortal.attachments();
    await client.clientPortal.auditEvents({ page: 2, pageSize: 6 });
    await client.clientPortal.coreEvidence();
    expect(mocks.listClientPortalCollections).toHaveBeenCalledWith(55, "bulk_gsm");
    expect(mocks.listClientPortalAttachments).toHaveBeenCalledWith(55, "bulk_gsm");
    expect(mocks.listClientPortalAuditEvents).toHaveBeenCalledWith(55, "bulk_gsm", 2, 6);
    expect(mocks.listClientPortalCoreEvidence).toHaveBeenCalledWith(55, "bulk_gsm");
  });

  it("issues a generic client reset response while delivering only to an active account", async () => {
    mocks.createClientPasswordResetToken.mockResolvedValue({ account: { id: 44, email: "client@example.com" }, token: "r".repeat(43), resetExpiresAt: new Date("2026-09-01T12:00:00Z") });
    mocks.sendClientPasswordResetEmail.mockResolvedValue("email_reset");
    const caller = appRouter.createCaller({ user: null, clientSession: null, req: { headers: { host: "reborntech.manus.space" }, protocol: "https" }, res: {} } as TrpcContext);

    await expect(caller.clientAuth.requestPasswordReset({ email: "client@example.com" })).resolves.toEqual({ success: true });
    expect(mocks.sendClientPasswordResetEmail).toHaveBeenCalledWith(expect.objectContaining({ to: "client@example.com", resetUrl: expect.stringContaining("/login?reset=") }));
    mocks.createClientPasswordResetToken.mockResolvedValue(null);
    await expect(caller.clientAuth.requestPasswordReset({ email: "missing@example.com" })).resolves.toEqual({ success: true });
  });

  it("resets a client password into a new remembered session and rejects disabled dashboard access", async () => {
    mocks.hashClientPassword.mockResolvedValue("scrypt$new-hash");
    mocks.resetClientPortalPassword.mockResolvedValue({ id: 44, email: "client@example.com", organisationId: 55, brand: "reborn", role: "viewer", sessionVersion: 3 });
    const caller = appRouter.createCaller({ user: null, clientSession: null, req: {}, res: {} } as TrpcContext);
    await expect(caller.clientAuth.resetPassword({ token: "r".repeat(24), password: "Password12345", rememberMe: true })).resolves.toEqual({ success: true, brand: "reborn" });
    expect(mocks.setClientPortalSession).toHaveBeenCalledWith(expect.anything(), expect.anything(), expect.objectContaining({ accountId: 44, sessionVersion: 3 }), true);

    mocks.getActiveClientPortalAccountForSession.mockResolvedValue(null);
    const disabled = appRouter.createCaller({ user: null, clientSession: { accountId: 44, organisationId: 55, brand: "reborn", role: "viewer", email: "client@example.com", sessionVersion: 2 }, req: {}, res: {} } as TrpcContext);
    await expect(disabled.clientPortal.collections()).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("lets staff list, disable and re-enable only brand-scoped client accounts", async () => {
    mocks.listClientPortalAccounts.mockResolvedValue([{ account: { id: 44, email: "client@example.com", status: "active" }, organisation: { name: "Example client" } }]);
    mocks.setClientPortalAccountStatus.mockResolvedValue({ id: 44, status: "disabled" });
    const admin = appRouter.createCaller({ user: { id: 7, role: "admin" }, req: {}, res: {} } as TrpcContext);
    const nonAdmin = appRouter.createCaller({ user: { id: 8, role: "user" }, req: {}, res: {} } as TrpcContext);
    await expect(admin.clientAccounts.list({ brand: "reborn" })).resolves.toHaveLength(1);
    await expect(admin.clientAccounts.setStatus({ accountId: 44, brand: "reborn", status: "disabled" })).resolves.toMatchObject({ account: { status: "disabled" } });
    expect(mocks.setClientPortalAccountStatus).toHaveBeenCalledWith({ accountId: 44, brand: "reborn", status: "disabled", actorUserId: 7 });
    await expect(nonAdmin.clientAccounts.list({ brand: "reborn" })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("attributes a staff-issued client reset to the initiating Operations administrator", async () => {
    mocks.getClientPortalAccountForBrand.mockResolvedValue({ id: 44, email: "client@example.com", brand: "reborn", status: "active" });
    mocks.createClientPasswordResetToken.mockResolvedValue({ account: { id: 44, email: "client@example.com" }, token: "r".repeat(43), resetExpiresAt: new Date("2026-09-01T12:00:00Z") });
    mocks.sendClientPasswordResetEmail.mockResolvedValue("email_reset");
    const admin = appRouter.createCaller({ user: { id: 7, role: "admin" }, req: { headers: { host: "reborntech.manus.space" }, protocol: "https" }, res: {} } as TrpcContext);
    await expect(admin.clientAccounts.sendPasswordReset({ accountId: 44, brand: "reborn" })).resolves.toMatchObject({ delivery: { delivered: true } });
    expect(mocks.createClientPasswordResetToken).toHaveBeenCalledWith({ email: "client@example.com", actorUserId: 7 });
  });

  it("returns brand-scoped activation history and forwards the selected quick filter", async () => {
    mocks.listClientPortalAccountActivity.mockResolvedValueOnce([{ event: { id: 1, action: "activated", summary: "Client account activated from secure invitation" }, account: { email: "client@example.com" }, organisation: { name: "Example client" }, actorName: null }]).mockResolvedValueOnce([]);
    mocks.listClientPortalAccounts.mockResolvedValue([]);
    const admin = appRouter.createCaller({ user: { id: 7, role: "admin" }, req: {}, res: {} } as TrpcContext);
    await expect(admin.clientAccounts.activity({ brand: "reborn" })).resolves.toMatchObject([{ event: { action: "activated" } }]);
    await expect(admin.clientAccounts.activity({ brand: "bulk_gsm" })).resolves.toEqual([]);
    await expect(admin.clientAccounts.list({ brand: "reborn", filter: "reset_pending" })).resolves.toEqual([]);
    expect(mocks.listClientPortalAccountActivity).toHaveBeenNthCalledWith(1, "reborn");
    expect(mocks.listClientPortalAccountActivity).toHaveBeenNthCalledWith(2, "bulk_gsm");
    expect(mocks.listClientPortalAccounts).toHaveBeenCalledWith("reborn", "reset_pending");
  });

  it("returns a support contact only to the matching client brand and lets admins update it", async () => {
    mocks.getBrandSupportContact.mockResolvedValue({ brand: "bulk_gsm", contactName: "Bulk account manager", email: "bulk@example.com", phone: "+44 20 0000 0000" });
    mocks.upsertBrandSupportContact.mockResolvedValue({ brand: "reborn", contactName: "Reborn account manager", email: "reborn@example.com", phone: null });
    const admin = appRouter.createCaller({ user: { id: 7, role: "admin" }, req: {}, res: {} } as TrpcContext);
    const client = appRouter.createCaller({ user: null, clientSession: { accountId: 44, organisationId: 55, brand: "bulk_gsm", role: "viewer", email: "client@example.com", sessionVersion: 0 }, req: {}, res: {} } as TrpcContext);
    await expect(client.clientPortal.supportContact()).resolves.toMatchObject({ brand: "bulk_gsm" });
    await expect(admin.clientAccounts.updateSupportContact({ brand: "reborn", contactName: "Reborn account manager", email: "reborn@example.com" })).resolves.toMatchObject({ brand: "reborn" });
    expect(mocks.getBrandSupportContact).toHaveBeenCalledWith("bulk_gsm");
    expect(mocks.upsertBrandSupportContact).toHaveBeenCalledWith({ brand: "reborn", contactName: "Reborn account manager", email: "reborn@example.com", phone: null, updatedByUserId: 7 });
  });

  it("sends and records the agreed collection-booked milestone only when a route is confirmed", async () => {
    mocks.updateCollectionStatus.mockResolvedValue({ collection: { id: 91, jobId: 12, reference: "RB-100", title: "London laptop collection", scheduledFor: new Date("2026-09-10") }, organisation: { id: 55, name: "Example client" } });
    mocks.listActivePortalInvitations.mockResolvedValue([{ id: 7, email: "client@example.com", status: "claimed", token: "token" }]);
    mocks.sendCollectionBookedEmail.mockResolvedValue("email_booked");
    const admin = appRouter.createCaller({ user: { id: 7, role: "admin" }, req: { headers: { host: "reborntech.manus.space" }, protocol: "https" }, res: {} } as TrpcContext);
    await expect(admin.collections.updateStatus({ id: 91, brand: "reborn", status: "confirmed" })).resolves.toMatchObject({ statusEmailsSent: 1 });
    expect(mocks.sendCollectionBookedEmail).toHaveBeenCalledWith(expect.objectContaining({ to: "client@example.com", collectionReference: "RB-100" }));
    expect(mocks.recordClientNotification).toHaveBeenCalledWith(expect.objectContaining({ eventType: "collection_booked", deliveryState: "sent", brand: "reborn", jobId: 12 }));
  });

  it("keeps impact approval and final document completion inside the selected Core Job brand", async () => {
    mocks.upsertItadJobImpactStatement.mockResolvedValue({ id: 4, jobId: 12, brand: "bulk_gsm", assetsReused: 8, customerVisible: false });
    mocks.approveItadJobImpactStatement.mockResolvedValue({ id: 4, jobId: 12, brand: "bulk_gsm", customerVisible: true });
    const admin = appRouter.createCaller({ user: { id: 7, role: "admin" }, req: {}, res: {} } as TrpcContext);
    await expect(admin.itadCore.saveImpactStatement({ jobId: 12, brand: "bulk_gsm", assetsReused: 8, assetsRecycled: 2, assetsRedistributed: 1, materialsRecoveredKg: 14, carbonAvoidedKg: 18, carbonMethodology: "Approved internal methodology", narrative: "Verified device recovery outcomes." })).resolves.toMatchObject({ impactStatement: { brand: "bulk_gsm" } });
    await expect(admin.itadCore.approveImpactStatement({ jobId: 12, brand: "bulk_gsm" })).resolves.toMatchObject({ impactStatement: { customerVisible: true } });
    expect(mocks.upsertItadJobImpactStatement).toHaveBeenCalledWith(expect.objectContaining({ jobId: 12, brand: "bulk_gsm", updatedByUserId: 7 }));
    expect(mocks.approveItadJobImpactStatement).toHaveBeenCalledWith({ jobId: 12, brand: "bulk_gsm", approvedByUserId: 7 });
  });

  it("notifies the client when an eligible job completes and exposes lifecycle data only to its client session", async () => {
    mocks.updateItadJobStage.mockResolvedValue({ id: 12, organisationId: 55, brand: "reborn", jobReference: "RB-100", title: "London laptop collection", stage: "completed" });
    mocks.listAdminCollections.mockResolvedValue([{ job: { id: 12 }, organisation: { id: 55, name: "Example client" } }]);
    mocks.listActivePortalInvitations.mockResolvedValue([{ id: 7, email: "client@example.com", status: "claimed", token: "token" }]);
    mocks.sendJobCompletedEmail.mockResolvedValue("email_complete");
    mocks.listClientPortalJobLifecycle.mockResolvedValue([{ job: { id: 12, brand: "reborn", stage: "completed" }, collection: { id: 91, brand: "reborn" } }]);
    mocks.listClientPortalImpactStatements.mockResolvedValue([{ impact: { id: 4, customerVisible: true }, job: { id: 12, brand: "reborn" } }]);
    const admin = appRouter.createCaller({ user: { id: 7, role: "admin" }, req: { headers: { host: "reborntech.manus.space" }, protocol: "https" }, res: {} } as TrpcContext);
    await expect(admin.itadCore.updateStage({ jobId: 12, brand: "reborn", stage: "completed" })).resolves.toMatchObject({ completionEmailsSent: 1 });
    expect(mocks.sendJobCompletedEmail).toHaveBeenCalledWith(expect.objectContaining({ jobReference: "RB-100", to: "client@example.com" }));
    expect(mocks.recordClientNotification).toHaveBeenCalledWith(expect.objectContaining({ eventType: "job_completed", deliveryState: "sent", jobId: 12, brand: "reborn" }));

    const client = appRouter.createCaller({ user: null, clientSession: { accountId: 44, organisationId: 55, brand: "reborn", role: "viewer", email: "client@example.com", sessionVersion: 0 }, req: {}, res: {} } as TrpcContext);
    await expect(client.clientPortal.lifecycle()).resolves.toHaveLength(1);
    await expect(client.clientPortal.impactStatements()).resolves.toHaveLength(1);
    expect(mocks.listClientPortalJobLifecycle).toHaveBeenCalledWith(55, "reborn");
    expect(mocks.listClientPortalImpactStatements).toHaveBeenCalledWith(55, "reborn");
  });

  it("retains booked and completed milestone email failures without blocking the route or Core Job transition", async () => {
    mocks.updateCollectionStatus.mockResolvedValue({ collection: { id: 91, jobId: 12, reference: "RB-100", title: "London laptop collection", scheduledFor: null }, organisation: { id: 55, name: "Example client" } });
    mocks.updateItadJobStage.mockResolvedValue({ id: 12, organisationId: 55, brand: "reborn", jobReference: "RB-100", title: "London laptop collection", stage: "completed" });
    mocks.listAdminCollections.mockResolvedValue([{ job: { id: 12 }, organisation: { id: 55, name: "Example client" } }]);
    mocks.listActivePortalInvitations.mockResolvedValue([{ id: 7, email: "client@example.com", status: "claimed", token: "token" }]);
    mocks.sendCollectionBookedEmail.mockRejectedValue(new Error("Resend unavailable"));
    mocks.sendJobCompletedEmail.mockRejectedValue(new Error("Resend unavailable"));
    const admin = appRouter.createCaller({ user: { id: 7, role: "admin" }, req: { headers: { host: "reborntech.manus.space" }, protocol: "https" }, res: {} } as TrpcContext);
    await expect(admin.collections.updateStatus({ id: 91, brand: "reborn", status: "confirmed" })).resolves.toMatchObject({ statusEmailsSent: 0 });
    await expect(admin.itadCore.updateStage({ jobId: 12, brand: "reborn", stage: "completed" })).resolves.toMatchObject({ completionEmailsSent: 0 });
    expect(mocks.recordClientNotification).toHaveBeenCalledWith(expect.objectContaining({ eventType: "collection_booked", deliveryState: "failed", brand: "reborn" }));
    expect(mocks.recordClientNotification).toHaveBeenCalledWith(expect.objectContaining({ eventType: "job_completed", deliveryState: "failed", brand: "reborn" }));
  });
});
