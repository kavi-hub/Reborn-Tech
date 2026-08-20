import { COOKIE_NAME } from "@shared/const";
import { TRPCError } from "@trpc/server";
import { randomBytes } from "node:crypto";
import { z } from "zod";
import { activateClientPortalAccount, approveItadJobEvidence, assignCustomerViewerByOrganisationAdmin, bulkReassignItadJobExceptions, claimCustomerPortalInvitation, createAssessmentRequest, createCollectionAttachment, createCollectionAuditEvent, createCollectionTrack, createCustomerPortalInvitation, createItadJobAsset, createItadJobAssetsFromImport, createItadJobComment, createItadJobEvidenceRecord, createItadJobException, createSecurazeImportBatch, createSecurazeImportExceptions, deleteCollectionAttachment, deleteAssessmentRequest, exportAssessmentRequests, findOperationsAdminByEmail, getAdminCollectionAttachment, getClientAccountActivationInvitation, getClientPortalAccountByEmail, getClientPortalAccountById, getClientPortalAttachment, getClientPortalCoreEvidence, getCustomerCollectionAttachment, getCustomerOrganisationMembership, getItadJobDetail, getItadJobEvidenceFile, getItadJobExceptionKpis, getOperationsUserById, getPortalInvitation, listActivePortalInvitations, listAdminCollectionAttachments, listAdminCollectionAuditEvents, listAdminCollections, listAssessmentRequests, listClientPortalAttachments, listClientPortalAuditEvents, listClientPortalCollections, listClientPortalCoreEvidence, listCollectionIdsForOrganisation, listCustomerCollectionAttachments, listCustomerCollectionAuditEvents, listCustomerPortalCollections, listOperationsAdmins, listOrganisationPortalInvitations, listSecurazeImportExceptions, recordClientPortalSignIn, recordPortalInvitationEmail, recordPortalInvitationEmailFailure, revokePortalInvitation, updateAssessmentStatus, updateCollectionStatus, updateItadJobException } from "./db";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { adminProcedure, clientPortalProcedure, protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { notifyOwner } from "./_core/notification";
import { storageGetSignedUrl, storagePut } from "./storage";
import { sendCollectionStatusEmail, sendExceptionLifecycleEmail, sendPortalInvitationEmail } from "./rebornEmail";
import { mapSecurazeCsv } from "./securazeCsv";
import { createSecurazePreviewReceipt, securazeFileHash, verifySecurazePreviewReceipt } from "./securazePreview";
import { clearClientPortalSession, hashClientPassword, setClientPortalSession, verifyClientPassword } from "./clientPortalAuth";

const publicOrigin = (req: { headers?: Record<string, string | string[] | undefined> }) => {
  const origin = req.headers?.origin;
  if (typeof origin === "string" && origin.startsWith("http")) return origin.replace(/\/$/, "");
  const host = req.headers?.host;
  const forwarded = req.headers?.["x-forwarded-proto"];
  if (typeof host === "string") return `${typeof forwarded === "string" ? forwarded : "https"}://${host}`;
  return "https://www.rebornltd.co.uk";
};

async function deliverInvitation(input: { invitation: { id: number; email: string; token: string; expiresAt: Date }; organisationName: string; origin: string; resend: boolean }) {
  try {
    const emailId = await sendPortalInvitationEmail({ to: input.invitation.email, organisationName: input.organisationName, portalUrl: `${input.origin}/login?invite=${input.invitation.token}`, expiresAt: input.invitation.expiresAt, resend: input.resend });
    await recordPortalInvitationEmail(input.invitation.id, emailId, input.resend);
    return { delivered: true } as const;
  } catch (error) {
    await recordPortalInvitationEmailFailure(input.invitation.id);
    console.error("[Email] Invitation delivery failed", error);
    return { delivered: false } as const;
  }
}

export const assessmentInputSchema = z.object({
  fullName: z.string().trim().min(2, "Enter your name").max(160),
  email: z.string().trim().email("Enter a valid work email").max(320),
  phone: z.string().trim().max(64).optional(),
  organisation: z.string().trim().min(2, "Enter your organisation").max(255),
  jobTitle: z.string().trim().max(160).optional(),
  sitePostcode: z.string().trim().max(24).optional(),
  assetCategories: z.array(z.string().trim().min(1)).min(1, "Select at least one asset category"),
  approximateAssetCount: z.string().trim().max(80).optional(),
  collectionTimeline: z.string().trim().max(80).optional(),
  dataSecurityRequirement: z.string().trim().max(160).optional(),
  hasInventory: z.boolean().default(false),
  requiresOnSiteErasure: z.boolean().default(false),
  notes: z.string().trim().max(2000).optional(),
  contactConsent: z.literal(true, { error: "Please confirm that we may contact you about this request" }),
});

const collectionStatusSchema = z.enum(["planned", "confirmed", "collected", "processing", "outcome_reported"]);
const attachmentTypeSchema = z.enum(["inventory", "evidence"]);
const supportedAttachmentTypes = new Set([
  "application/pdf", "text/csv", "application/vnd.ms-excel", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "image/jpeg", "image/png",
]);
const attachmentUploadSchema = z.object({
  collectionId: z.number().int().positive(),
  attachmentType: attachmentTypeSchema,
  fileName: z.string().trim().min(1).max(180),
  contentType: z.string().trim().max(160),
  contentBase64: z.string().min(1).max(14_000_000),
  customerVisible: z.boolean().default(true),
});
const itadBrandSchema = z.enum(["reborn", "bulk_gsm"]);
const coreFileSchema = z.object({
  fileName: z.string().trim().min(1).max(255),
  contentType: z.string().trim().max(160),
  contentBase64: z.string().min(1).max(14_000_000),
});
const coreAssetSchema = z.object({
  jobId: z.number().int().positive(),
  brand: itadBrandSchema,
  assetCategory: z.string().trim().min(2).max(120),
  manufacturer: z.string().trim().max(120).optional(),
  model: z.string().trim().max(160).optional(),
  assetTag: z.string().trim().max(160).optional(),
  serialNumber: z.string().trim().max(160).optional(),
  quantity: z.number().int().min(1).max(100_000).default(1),
  condition: z.enum(["unassessed", "working", "repairable", "parts_only", "recycling"]).default("unassessed"),
  dataHandlingState: z.enum(["not_recorded", "evidence_pending", "evidence_recorded", "exception"]).default("not_recorded"),
});
const coreEvidenceSchema = z.object({
  jobId: z.number().int().positive(),
  assetId: z.number().int().positive().optional(),
  brand: itadBrandSchema,
  evidenceType: z.enum(["data_erasure", "collection_manifest", "reuse_outcome", "recycling_outcome", "other"]),
  certificateReference: z.string().trim().max(180).optional(),
  issuer: z.string().trim().max(180).optional(),
  verificationState: z.enum(["recorded", "reviewed", "verified", "exception"]).default("recorded"),
  evidenceDate: z.coerce.date().optional(),
  file: coreFileSchema.optional(),
});
const securazeImportSchema = z.object({
  jobId: z.number().int().positive(),
  brand: itadBrandSchema,
  importReference: z.string().trim().max(180).optional(),
  reportedRecordCount: z.number().int().min(0).max(1_000_000).optional(),
  importedRecordCount: z.number().int().min(0).max(1_000_000).default(0),
  exceptionCount: z.number().int().min(0).max(1_000_000).default(0),
  file: coreFileSchema.optional(),
});
const securazeCsvImportSchema = z.object({
  jobId: z.number().int().positive(),
  brand: itadBrandSchema,
  importReference: z.string().trim().max(180).optional(),
  file: coreFileSchema,
});
const securazeCsvConfirmSchema = securazeCsvImportSchema.extend({ previewReceipt: z.string().min(40).max(2_000) });
const exceptionEmailSchema = z.string().trim().email().max(320).optional();
const csvCell = (value: string | number | null | undefined) => {
  const text = String(value ?? "");
  const safe = /^[=+\-@]/.test(text) ? `'${text}` : text;
  return `"${safe.replaceAll('"', '""')}"`;
};
const clientPasswordSchema = z.string().min(12, "Use at least 12 characters").max(128, "Password is too long").refine((value) => /[A-Za-z]/.test(value) && /\d/.test(value), "Include at least one letter and one number");
const maskClientEmail = (email: string) => {
  const [local, domain] = email.split("@");
  return `${local.slice(0, 2)}${"•".repeat(Math.max(2, local.length - 2))}@${domain}`;
};

export const appRouter = router({
    // if you need to use socket.io, read and register route in server/_core/index.ts, all api should start with '/api/' so that the gateway can route correctly
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),
  clientAuth: router({
    invitation: publicProcedure.input(z.object({ token: z.string().min(20).max(128) })).query(async ({ input }) => {
      const invitation = await getClientAccountActivationInvitation(input.token);
      return { email: maskClientEmail(invitation.email), organisationId: invitation.organisationId, brand: invitation.brand, role: invitation.role };
    }),
    activate: publicProcedure.input(z.object({ token: z.string().min(20).max(128), password: clientPasswordSchema })).mutation(async ({ ctx, input }) => {
      const account = await activateClientPortalAccount({ token: input.token, passwordHash: await hashClientPassword(input.password) });
      await setClientPortalSession(ctx.res, ctx.req, { accountId: account.id, organisationId: account.organisationId, brand: account.brand, role: account.role, email: account.email });
      return { success: true, brand: account.brand } as const;
    }),
    login: publicProcedure.input(z.object({ email: z.string().trim().email().max(320), password: z.string().min(1).max(128) })).mutation(async ({ ctx, input }) => {
      const account = await getClientPortalAccountByEmail(input.email);
      if (!account || !(await verifyClientPassword(input.password, account.passwordHash))) throw new TRPCError({ code: "UNAUTHORIZED", message: "Email or password is not recognised" });
      await recordClientPortalSignIn(account.id);
      await setClientPortalSession(ctx.res, ctx.req, { accountId: account.id, organisationId: account.organisationId, brand: account.brand, role: account.role, email: account.email });
      return { success: true, brand: account.brand } as const;
    }),
    me: publicProcedure.query(async ({ ctx }) => {
      if (!ctx.clientSession) return null;
      const account = await getClientPortalAccountById(ctx.clientSession.accountId);
      if (!account || account.organisationId !== ctx.clientSession.organisationId || account.brand !== ctx.clientSession.brand || account.email !== ctx.clientSession.email) return null;
      return { email: account.email, role: account.role, organisationId: account.organisationId, brand: account.brand };
    }),
    logout: publicProcedure.mutation(({ ctx }) => { clearClientPortalSession(ctx.res, ctx.req); return { success: true } as const; }),
  }),
  clientPortal: router({
    collections: clientPortalProcedure.query(({ ctx }) => listClientPortalCollections(ctx.clientSession.organisationId, ctx.clientSession.brand)),
    attachments: clientPortalProcedure.query(({ ctx }) => listClientPortalAttachments(ctx.clientSession.organisationId, ctx.clientSession.brand)),
    auditEvents: clientPortalProcedure.input(z.object({ page: z.number().int().positive().default(1), pageSize: z.number().int().min(1).max(50).default(10) })).query(({ ctx, input }) => listClientPortalAuditEvents(ctx.clientSession.organisationId, ctx.clientSession.brand, input.page, input.pageSize)),
    coreEvidence: clientPortalProcedure.query(({ ctx }) => listClientPortalCoreEvidence(ctx.clientSession.organisationId, ctx.clientSession.brand)),
    downloadAttachment: clientPortalProcedure.input(z.object({ attachmentId: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
      const attachment = await getClientPortalAttachment(ctx.clientSession.organisationId, ctx.clientSession.brand, input.attachmentId);
      return { url: await storageGetSignedUrl(attachment.storageKey), fileName: attachment.fileName };
    }),
    downloadCoreEvidence: clientPortalProcedure.input(z.object({ evidenceId: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
      const evidence = await getClientPortalCoreEvidence(ctx.clientSession.organisationId, ctx.clientSession.brand, input.evidenceId);
      if (!evidence.storageKey || !evidence.fileName) throw new TRPCError({ code: "NOT_FOUND", message: "This evidence file is not available through your client account" });
      return { url: await storageGetSignedUrl(evidence.storageKey), fileName: evidence.fileName };
    }),
  }),
  assessment: router({
    submit: publicProcedure.input(assessmentInputSchema).mutation(async ({ input }) => {
      const retentionReviewAt = new Date();
      retentionReviewAt.setUTCFullYear(retentionReviewAt.getUTCFullYear() + 2);

      await createAssessmentRequest({
        fullName: input.fullName,
        email: input.email,
        phone: input.phone || null,
        organisation: input.organisation,
        jobTitle: input.jobTitle || null,
        sitePostcode: input.sitePostcode || null,
        assetCategories: input.assetCategories.join(", "),
        approximateAssetCount: input.approximateAssetCount || null,
        collectionTimeline: input.collectionTimeline || null,
        dataSecurityRequirement: input.dataSecurityRequirement || null,
        hasInventory: input.hasInventory,
        requiresOnSiteErasure: input.requiresOnSiteErasure,
        notes: input.notes || null,
        source: "website",
        retentionReviewAt,
      });

      try {
        const sent = await notifyOwner({
          title: "New Reborn ITAD assessment",
          content: `${input.organisation} submitted an assessment for ${input.assetCategories.join(", ")}. Collection: ${input.sitePostcode || "not stated"}; timing: ${input.collectionTimeline || "not stated"}. Review it in Reborn Operations.`,
        });
        if (!sent) console.warn("[Assessment] Owner notification was not accepted by the notification service.");
      } catch (error) {
        // Notification availability must not prevent a customer enquiry from being stored.
        console.warn("[Assessment] Owner notification could not be sent:", error);
      }

      return { success: true } as const;
    }),
    list: adminProcedure.input(z.object({
      search: z.string().trim().max(160).optional(),
      status: z.enum(["new", "contacted", "qualified", "closed"]).optional(),
      page: z.number().int().min(1).default(1),
      limit: z.number().int().min(5).max(50).default(20),
      sort: z.enum(["newest", "oldest"]).default("newest"),
    })).query(({ input }) => listAssessmentRequests(input)),
    exportCsv: adminProcedure.input(z.object({
      search: z.string().trim().max(160).optional(),
      status: z.enum(["new", "contacted", "qualified", "closed"]).optional(),
      sort: z.enum(["newest", "oldest"]).default("newest"),
    })).mutation(({ input }) => exportAssessmentRequests(input)),
    updateStatus: adminProcedure.input(z.object({
      id: z.number().int().positive(),
      status: z.enum(["new", "contacted", "qualified", "closed"]),
    })).mutation(async ({ input }) => {
      await updateAssessmentStatus(input.id, input.status);
      return { success: true } as const;
    }),
    delete: adminProcedure.input(z.object({ id: z.number().int().positive() })).mutation(async ({ input }) => {
      await deleteAssessmentRequest(input.id);
      return { success: true } as const;
    }),
  }),
  itadCore: router({
    detail: adminProcedure.input(z.object({ jobId: z.number().int().positive(), brand: itadBrandSchema })).query(({ input }) => getItadJobDetail(input.jobId, input.brand)),
    exceptionKpis: adminProcedure.input(z.object({ jobId: z.number().int().positive(), brand: itadBrandSchema })).query(({ input }) => getItadJobExceptionKpis(input.jobId, input.brand)),
    operationsAdmins: adminProcedure.query(() => listOperationsAdmins()),
    securazeTemplate: adminProcedure.query(() => ({ fileName: "securaze-itad-import-template.csv", acceptedHeaders: ["Serial Number", "Result", "Device Type", "Manufacturer", "Model", "Asset Tag"], csv: "\uFEFFSerial Number,Result,Device Type,Manufacturer,Model,Asset Tag\r\nEXAMPLE-123,Completed,Laptop,Example Manufacturer,Example Model,ASSET-001\r\n" })),
    addAsset: adminProcedure.input(coreAssetSchema).mutation(async ({ input }) => {
      const asset = await createItadJobAsset(input);
      return { asset };
    }),
    recordEvidence: adminProcedure.input(coreEvidenceSchema).mutation(async ({ ctx, input }) => {
      let file: { fileName: string; contentType: string; sizeBytes: number; storageKey: string } | undefined;
      if (input.file) {
        if (!supportedAttachmentTypes.has(input.file.contentType)) throw new TRPCError({ code: "BAD_REQUEST", message: "Use PDF, CSV, Excel, Word, PNG or JPEG evidence files only" });
        const bytes = Buffer.from(input.file.contentBase64, "base64");
        if (!bytes.length || bytes.length > 10_000_000) throw new TRPCError({ code: "BAD_REQUEST", message: "Evidence files must be between 1 byte and 10 MB" });
        const safeName = input.file.fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
        const stored = await storagePut(`itad-core/jobs/${input.jobId}/evidence/${Date.now()}-${safeName}`, bytes, input.file.contentType);
        file = { fileName: input.file.fileName, contentType: input.file.contentType, sizeBytes: bytes.length, storageKey: stored.key };
      }
      const { file: _uploadedFile, ...recordInput } = input;
      const evidence = await createItadJobEvidenceRecord({ ...recordInput, ...file, customerVisible: false, createdByUserId: ctx.user.id });
      return { evidence };
    }),
    previewSecurazeCsv: adminProcedure.input(securazeCsvImportSchema).mutation(async ({ input }) => {
      if (input.file.contentType !== "text/csv") throw new TRPCError({ code: "BAD_REQUEST", message: "Use a UTF-8 CSV export for mapped Securaze import" });
      const bytes = Buffer.from(input.file.contentBase64, "base64");
      if (!bytes.length || bytes.length > 10_000_000) throw new TRPCError({ code: "BAD_REQUEST", message: "Import files must be between 1 byte and 10 MB" });
      let mapped;
      try { mapped = mapSecurazeCsv(bytes.toString("utf8")); } catch (error) { throw new TRPCError({ code: "BAD_REQUEST", message: error instanceof Error ? error.message : "The Securaze CSV could not be mapped" }); }
      const preview = createSecurazePreviewReceipt({ jobId: input.jobId, brand: input.brand, fileHash: securazeFileHash(bytes), mappingVersion: mapped.mappingVersion });
      return { previewReceipt: preview.receipt, previewExpiresAt: preview.expiresAt, preview: { totalRows: mapped.validRows.length + mapped.exceptions.length, validRows: mapped.validRows, fieldMapping: mapped.fieldMapping, sourceHeaders: mapped.sourceHeaders, exceptions: mapped.exceptions } };
    }),
    confirmSecurazeCsv: adminProcedure.input(securazeCsvConfirmSchema).mutation(async ({ ctx, input }) => {
      if (input.file.contentType !== "text/csv") throw new TRPCError({ code: "BAD_REQUEST", message: "Use the reviewed UTF-8 CSV export" });
      const bytes = Buffer.from(input.file.contentBase64, "base64");
      if (!bytes.length || bytes.length > 10_000_000) throw new TRPCError({ code: "BAD_REQUEST", message: "Import files must be between 1 byte and 10 MB" });
      let mapped;
      try { mapped = mapSecurazeCsv(bytes.toString("utf8")); verifySecurazePreviewReceipt(input.previewReceipt, { jobId: input.jobId, brand: input.brand, fileHash: securazeFileHash(bytes) }); } catch (error) { throw new TRPCError({ code: "BAD_REQUEST", message: error instanceof Error ? error.message : "The reviewed CSV could not be confirmed" }); }
      const safeName = input.file.fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
      const stored = await storagePut(`itad-core/jobs/${input.jobId}/securaze/${Date.now()}-${safeName}`, bytes, input.file.contentType);
      const importBatch = await createSecurazeImportBatch({ jobId: input.jobId, brand: input.brand, importReference: input.importReference, status: "review_required", sourceFileName: input.file.fileName, sourceContentType: input.file.contentType, sourceSizeBytes: bytes.length, storageKey: stored.key, reportedRecordCount: mapped.validRows.length + mapped.exceptions.length, importedRecordCount: mapped.validRows.length, exceptionCount: mapped.exceptions.length, mappingVersion: mapped.mappingVersion, fieldMapping: JSON.stringify(mapped.fieldMapping), sourceHeaderSummary: JSON.stringify(mapped.sourceHeaders), importedByUserId: ctx.user.id });
      const importedRows = await createItadJobAssetsFromImport({ jobId: input.jobId, brand: input.brand, sourceImportBatchId: importBatch.id, rows: mapped.validRows });
      const exceptionRows = await createSecurazeImportExceptions({ importBatchId: importBatch.id, jobId: input.jobId, brand: input.brand, rows: mapped.exceptions });
      return { importBatch: { ...importBatch, importedRecordCount: importedRows, exceptionCount: exceptionRows }, mapping: { fieldMapping: mapped.fieldMapping, sourceHeaders: mapped.sourceHeaders, exceptions: mapped.exceptions } };
    }),
    recordSecurazeImport: adminProcedure.input(securazeImportSchema).mutation(async ({ ctx, input }) => {
      let file: { sourceFileName: string; sourceContentType: string; sourceSizeBytes: number; storageKey: string } | undefined;
      if (input.file) {
        if (!["text/csv", "application/vnd.ms-excel", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"].includes(input.file.contentType)) throw new TRPCError({ code: "BAD_REQUEST", message: "Use a CSV or spreadsheet export for Securaze intake" });
        const bytes = Buffer.from(input.file.contentBase64, "base64");
        if (!bytes.length || bytes.length > 10_000_000) throw new TRPCError({ code: "BAD_REQUEST", message: "Import files must be between 1 byte and 10 MB" });
        const safeName = input.file.fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
        const stored = await storagePut(`itad-core/jobs/${input.jobId}/securaze/${Date.now()}-${safeName}`, bytes, input.file.contentType);
        file = { sourceFileName: input.file.fileName, sourceContentType: input.file.contentType, sourceSizeBytes: bytes.length, storageKey: stored.key };
      }
      const { file: _uploadedFile, ...recordInput } = input;
      const importBatch = await createSecurazeImportBatch({ ...recordInput, ...file, status: "review_required", importedByUserId: ctx.user.id });
      return { importBatch };
    }),
    approveEvidence: adminProcedure.input(z.object({ evidenceId: z.number().int().positive(), jobId: z.number().int().positive(), brand: itadBrandSchema })).mutation(async ({ ctx, input }) => ({ evidence: await approveItadJobEvidence({ ...input, approvedByUserId: ctx.user.id }) })),
    addComment: adminProcedure.input(z.object({ jobId: z.number().int().positive(), brand: itadBrandSchema, comment: z.string().trim().min(2).max(3_000) })).mutation(async ({ ctx, input }) => { await createItadJobComment({ ...input, createdByUserId: ctx.user.id }); return { success: true } as const; }),
    exportSecurazeExceptions: adminProcedure.input(z.object({ jobId: z.number().int().positive(), brand: itadBrandSchema, importBatchId: z.number().int().positive().optional() })).mutation(async ({ input }) => {
      const rows = await listSecurazeImportExceptions(input);
      const csv = ["Import reference,Source file,Row number,Issue code,Issue detail", ...rows.map(({ exception, importBatch }) => [csvCell(importBatch.importReference || `Batch ${importBatch.id}`), csvCell(importBatch.sourceFileName), csvCell(exception.sourceRowNumber), csvCell(exception.code), csvCell(exception.message)].join(","))].join("\r\n");
      return { fileName: `securaze-exceptions-${input.brand}-job-${input.jobId}${input.importBatchId ? `-batch-${input.importBatchId}` : ""}.csv`, csv: `\uFEFF${csv}` };
    }),
    createException: adminProcedure.input(z.object({ jobId: z.number().int().positive(), brand: itadBrandSchema, title: z.string().trim().min(2).max(180), detail: z.string().trim().max(3_000).optional(), dueAt: z.coerce.date().nullable().optional(), assigneeEmail: exceptionEmailSchema })).mutation(async ({ ctx, input }) => {
      const assignee = input.assigneeEmail ? await findOperationsAdminByEmail(input.assigneeEmail) : null;
      if (input.assigneeEmail && !assignee) throw new TRPCError({ code: "BAD_REQUEST", message: "Assign exceptions only to a registered operations admin" });
      const { assigneeEmail: _assigneeEmail, ...recordInput } = input;
      const created = await createItadJobException({ ...recordInput, ownerUserId: assignee?.id ?? ctx.user.id, createdByUserId: ctx.user.id });
      let emailDelivered = false;
      if (assignee?.email && assignee.id !== ctx.user.id) { try { await sendExceptionLifecycleEmail({ to: assignee.email, recipientName: assignee.name || assignee.email, jobReference: created.job.jobReference, exceptionTitle: created.title, event: "assigned", workspaceLabel: input.brand === "bulk_gsm" ? "Bulk GSM" : "Reborn", operationsUrl: `${publicOrigin(ctx.req)}${input.brand === "bulk_gsm" ? "/bulk/itad-dash" : "/operations/collections"}` }); emailDelivered = true; } catch (error) { console.error("[Email] Exception assignment notice failed", error); } }
      return { success: true, emailDelivered } as const;
    }),
    updateException: adminProcedure.input(z.object({ exceptionId: z.number().int().positive(), jobId: z.number().int().positive(), brand: itadBrandSchema, status: z.enum(["open", "in_progress", "resolved"]), takeOwnership: z.boolean().default(false), dueAt: z.coerce.date().nullable().optional(), assigneeEmail: exceptionEmailSchema })).mutation(async ({ ctx, input }) => {
      const assignee = input.assigneeEmail ? await findOperationsAdminByEmail(input.assigneeEmail) : null;
      if (input.assigneeEmail && !assignee) throw new TRPCError({ code: "BAD_REQUEST", message: "Assign exceptions only to a registered operations admin" });
      const { assigneeEmail: _assigneeEmail, ...updateInput } = input;
      const updated = await updateItadJobException({ ...updateInput, actorUserId: ctx.user.id, ...(assignee ? { ownerUserId: assignee.id } : {}) });
      const recipient = input.status === "resolved" ? await getOperationsUserById(updated.ownerUserId ?? ctx.user.id) : assignee && assignee.id !== updated.exception.ownerUserId ? assignee : assignee;
      let emailDelivered = false;
      const event = input.status === "resolved" ? "resolved" : assignee && assignee.id !== updated.exception.ownerUserId ? "assigned" : null;
      if (recipient?.email && event) { try { await sendExceptionLifecycleEmail({ to: recipient.email, recipientName: recipient.name || recipient.email, jobReference: updated.job.jobReference, exceptionTitle: updated.exception.title, event, workspaceLabel: input.brand === "bulk_gsm" ? "Bulk GSM" : "Reborn", operationsUrl: `${publicOrigin(ctx.req)}${input.brand === "bulk_gsm" ? "/bulk/itad-dash" : "/operations/collections"}` }); emailDelivered = true; } catch (error) { console.error("[Email] Exception lifecycle notice failed", error); } }
      return { success: true, emailDelivered } as const;
    }),
    bulkReassignExceptions: adminProcedure.input(z.object({ jobId: z.number().int().positive(), brand: itadBrandSchema, exceptionIds: z.array(z.number().int().positive()).min(1).max(100).transform((ids) => Array.from(new Set(ids))), assigneeUserId: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
      const assignee = await getOperationsUserById(input.assigneeUserId);
      if (!assignee) throw new TRPCError({ code: "BAD_REQUEST", message: "Bulk reassignment is limited to a registered operations admin" });
      const result = await bulkReassignItadJobExceptions({ jobId: input.jobId, brand: input.brand, exceptionIds: input.exceptionIds, ownerUserId: assignee.id, actorUserId: ctx.user.id });
      let emailDelivered = false;
      if (assignee.email && assignee.id !== ctx.user.id) { try { await sendExceptionLifecycleEmail({ to: assignee.email, recipientName: assignee.name || assignee.email, jobReference: result.job.jobReference, exceptionTitle: `${result.records.length} selected exception${result.records.length === 1 ? "" : "s"}`, event: "assigned", workspaceLabel: input.brand === "bulk_gsm" ? "Bulk GSM" : "Reborn", operationsUrl: `${publicOrigin(ctx.req)}${input.brand === "bulk_gsm" ? "/bulk/itad-dash" : "/operations/collections"}` }); emailDelivered = true; } catch (error) { console.error("[Email] Bulk exception assignment notice failed", error); } }
      return { success: true, reassignedCount: result.records.length, emailDelivered } as const;
    }),
    downloadEvidence: adminProcedure.input(z.object({ evidenceId: z.number().int().positive(), jobId: z.number().int().positive(), brand: itadBrandSchema })).mutation(async ({ input }) => {
      const evidence = await getItadJobEvidenceFile(input);
      if (!evidence.storageKey || !evidence.fileName) throw new TRPCError({ code: "NOT_FOUND", message: "This evidence record does not have an attached file" });
      return { url: await storageGetSignedUrl(evidence.storageKey), fileName: evidence.fileName };
    }),
  }),
  collections: router({
    listAdmin: adminProcedure.input(z.object({ brand: z.enum(["reborn", "bulk_gsm"]).default("reborn") }).optional()).query(({ input }) => listAdminCollections(input?.brand)),
    create: adminProcedure.input(z.object({
      brand: z.enum(["reborn", "bulk_gsm"]).default("reborn"),
      organisationName: z.string().trim().min(2).max(255),
      reference: z.string().trim().min(3).max(64),
      title: z.string().trim().min(2).max(255),
      status: collectionStatusSchema.default("planned"),
      scheduledFor: z.coerce.date().optional(),
      collectionPostcode: z.string().trim().max(24).optional(),
      customerNote: z.string().trim().max(2000).optional(),
    })).mutation(async ({ ctx, input }) => {
      const created = await createCollectionTrack(input);
      await createCollectionAuditEvent({ collectionId: created.id, eventType: "route_created", summary: `Collection route ${created.reference} opened`, customerVisible: true, actorUserId: ctx.user.id });
      return { success: true } as const;
    }),
    updateStatus: adminProcedure.input(z.object({ id: z.number().int().positive(), status: collectionStatusSchema, brand: z.enum(["reborn", "bulk_gsm"]).default("reborn") })).mutation(async ({ ctx, input }) => {
      const route = await updateCollectionStatus(input.id, input.status, input.brand);
      await createCollectionAuditEvent({ collectionId: input.id, eventType: "status_changed", summary: `Collection status changed to ${input.status.replaceAll("_", " ")}`, customerVisible: true, actorUserId: ctx.user.id });
      const invitations = await listActivePortalInvitations(route.organisation.id, input.brand);
      const origin = publicOrigin(ctx.req);
      const statusLabel = input.status.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
      const deliveries = await Promise.allSettled(invitations.map((invitation) => sendCollectionStatusEmail({ to: invitation.email, organisationName: route.organisation.name, collectionReference: route.collection.reference, collectionTitle: route.collection.title, statusLabel, portalUrl: invitation.status === "pending" ? `${origin}/login?invite=${invitation.token}` : `${origin}/login` })));
      return { success: true, statusEmailsSent: deliveries.filter((result) => result.status === "fulfilled").length } as const;
    }),
    createInvitation: adminProcedure.input(z.object({
      organisationId: z.number().int().positive(),
      brand: z.enum(["reborn", "bulk_gsm"]).default("reborn"),
      email: z.string().trim().email().max(320),
      role: z.enum(["admin", "viewer"]).default("viewer"),
    })).mutation(async ({ ctx, input }) => {
      const token = randomBytes(24).toString("base64url");
      const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      const invitation = await createCustomerPortalInvitation({ ...input, token, expiresAt, createdByUserId: ctx.user.id });
      const collectionIds = await listCollectionIdsForOrganisation(input.organisationId, input.brand);
      await Promise.all(collectionIds.map(({ id }) => createCollectionAuditEvent({ collectionId: id, eventType: "invitation_sent", summary: `Customer portal invitation created for ${input.role} access`, customerVisible: false, actorUserId: ctx.user.id })));
      const organisation = (await listAdminCollections(input.brand)).find((route) => route.organisation.id === input.organisationId)?.organisation;
      const delivery = organisation ? await deliverInvitation({ invitation, organisationName: organisation.name, origin: publicOrigin(ctx.req), resend: false }) : { delivered: false };
      return { token, expiresAt, invitationId: invitation.id, ...delivery };
    }),
    listInvitations: adminProcedure.input(z.object({ organisationId: z.number().int().positive(), brand: z.enum(["reborn", "bulk_gsm"]).default("reborn") })).query(({ input }) => listOrganisationPortalInvitations(input.organisationId, input.brand)),
    resendInvitation: adminProcedure.input(z.object({ invitationId: z.number().int().positive(), brand: z.enum(["reborn", "bulk_gsm"]).default("reborn") })).mutation(async ({ ctx, input }) => {
      const invitation = await getPortalInvitation(input.invitationId);
      if (invitation.brand !== input.brand) throw new TRPCError({ code: "NOT_FOUND", message: "Customer invitation could not be found in this brand workspace" });
      if (invitation.status === "revoked" || invitation.status === "expired") throw new TRPCError({ code: "BAD_REQUEST", message: "Create a new invitation for a revoked or expired access link" });
      const organisation = (await listAdminCollections(invitation.brand)).find((route) => route.organisation.id === invitation.organisationId)?.organisation;
      if (!organisation) throw new TRPCError({ code: "NOT_FOUND", message: "Customer organisation could not be found" });
      const delivery = await deliverInvitation({ invitation, organisationName: organisation.name, origin: publicOrigin(ctx.req), resend: true });
      const collectionIds = await listCollectionIdsForOrganisation(invitation.organisationId, invitation.brand);
      await Promise.all(collectionIds.map(({ id }) => createCollectionAuditEvent({ collectionId: id, eventType: "invitation_sent", summary: "Customer portal invitation resent", customerVisible: false, actorUserId: ctx.user.id })));
      return delivery;
    }),
    revokeInvitation: adminProcedure.input(z.object({ invitationId: z.number().int().positive(), brand: z.enum(["reborn", "bulk_gsm"]).default("reborn") })).mutation(async ({ ctx, input }) => {
      const existingInvitation = await getPortalInvitation(input.invitationId);
      if (existingInvitation.brand !== input.brand) throw new TRPCError({ code: "NOT_FOUND", message: "Customer invitation could not be found in this brand workspace" });
      const invitation = await revokePortalInvitation(input.invitationId);
      const collectionIds = await listCollectionIdsForOrganisation(invitation.organisationId, invitation.brand);
      await Promise.all(collectionIds.map(({ id }) => createCollectionAuditEvent({ collectionId: id, eventType: "invitation_revoked", summary: "Customer portal invitation revoked", customerVisible: false, actorUserId: ctx.user.id })));
      return { success: true } as const;
    }),
    listAudit: adminProcedure.input(z.object({ collectionId: z.number().int().positive(), page: z.number().int().min(1).default(1), pageSize: z.number().int().min(1).max(25).default(8) })).query(({ input }) => listAdminCollectionAuditEvents(input.collectionId, input.page, input.pageSize)),
    listAttachments: adminProcedure.input(z.object({ collectionId: z.number().int().positive() })).query(({ input }) => listAdminCollectionAttachments(input.collectionId)),
    uploadAttachment: adminProcedure.input(attachmentUploadSchema).mutation(async ({ ctx, input }) => {
      if (!supportedAttachmentTypes.has(input.contentType)) throw new TRPCError({ code: "BAD_REQUEST", message: "Use PDF, CSV, Excel, Word, PNG or JPEG files only" });
      const data = Buffer.from(input.contentBase64, "base64");
      if (!data.length || data.length > 10_000_000) throw new TRPCError({ code: "BAD_REQUEST", message: "Files must be between 1 byte and 10 MB" });
      const safeName = input.fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
      const stored = await storagePut(`collection-routes/${input.collectionId}/${Date.now()}-${safeName}`, data, input.contentType);
      await createCollectionAttachment({ collectionId: input.collectionId, attachmentType: input.attachmentType, fileName: input.fileName, contentType: input.contentType, sizeBytes: data.length, storageKey: stored.key, customerVisible: input.customerVisible, uploadedByUserId: ctx.user.id });
      await createCollectionAuditEvent({ collectionId: input.collectionId, eventType: "attachment_uploaded", summary: `${input.attachmentType === "inventory" ? "Asset inventory" : "Evidence file"} added: ${input.fileName}`, customerVisible: input.customerVisible, actorUserId: ctx.user.id });
      return { success: true } as const;
    }),
    downloadAttachment: adminProcedure.input(z.object({ attachmentId: z.number().int().positive() })).mutation(async ({ input }) => {
      const attachment = await getAdminCollectionAttachment(input.attachmentId);
      return { url: await storageGetSignedUrl(attachment.storageKey), fileName: attachment.fileName };
    }),
    deleteAttachment: adminProcedure.input(z.object({ attachmentId: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
      const attachment = await getAdminCollectionAttachment(input.attachmentId);
      await deleteCollectionAttachment(input.attachmentId);
      await createCollectionAuditEvent({ collectionId: attachment.collectionId, eventType: "attachment_removed", summary: `${attachment.attachmentType === "inventory" ? "Asset inventory" : "Evidence file"} removed: ${attachment.fileName}`, customerVisible: attachment.customerVisible, actorUserId: ctx.user.id });
      return { success: true } as const;
    }),
  }),
  customerPortal: router({
    claimInvitation: protectedProcedure.input(z.object({ token: z.string().min(20).max(128) })).mutation(({ ctx, input }) => claimCustomerPortalInvitation({ token: input.token, userId: ctx.user.id, email: ctx.user.email ?? null })),
    collections: protectedProcedure.query(({ ctx }) => listCustomerPortalCollections(ctx.user.id)),
    attachments: protectedProcedure.query(({ ctx }) => listCustomerCollectionAttachments(ctx.user.id)),
    auditEvents: protectedProcedure.input(z.object({ page: z.number().int().min(1).default(1), pageSize: z.number().int().min(1).max(25).default(8) })).query(({ ctx, input }) => listCustomerCollectionAuditEvents(ctx.user.id, input.page, input.pageSize)),
    downloadAttachment: protectedProcedure.input(z.object({ attachmentId: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
      const attachment = await getCustomerCollectionAttachment(ctx.user.id, input.attachmentId);
      return { url: await storageGetSignedUrl(attachment.storageKey), fileName: attachment.fileName };
    }),
    assignViewer: protectedProcedure.input(z.object({ organisationId: z.number().int().positive(), email: z.string().trim().email().max(320) })).mutation(async ({ ctx, input }) => {
      const membership = await getCustomerOrganisationMembership(ctx.user.id, input.organisationId);
      if (membership?.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Only an organisation admin can grant viewer access" });
      }
      await assignCustomerViewerByOrganisationAdmin({ actorUserId: ctx.user.id, ...input });
      const collectionIds = await listCollectionIdsForOrganisation(input.organisationId);
      await Promise.all(collectionIds.map(({ id }) => createCollectionAuditEvent({ collectionId: id, eventType: "customer_access_changed", summary: "Customer portal viewer access granted", customerVisible: false, actorUserId: ctx.user.id })));
      return { success: true } as const;
    }),
  }),
});

export type AppRouter = typeof appRouter;
