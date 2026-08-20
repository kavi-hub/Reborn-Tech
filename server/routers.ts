import { COOKIE_NAME } from "@shared/const";
import { TRPCError } from "@trpc/server";
import { randomBytes } from "node:crypto";
import { z } from "zod";
import { assignCustomerViewerByOrganisationAdmin, claimCustomerPortalInvitation, createAssessmentRequest, createCollectionAttachment, createCollectionAuditEvent, createCollectionTrack, createCustomerPortalInvitation, deleteCollectionAttachment, deleteAssessmentRequest, exportAssessmentRequests, getAdminCollectionAttachment, getCustomerCollectionAttachment, getCustomerOrganisationMembership, getMagicPortalAttachment, getMagicPortalOverview, listAdminCollectionAttachments, listAdminCollectionAuditEvents, listAdminCollections, listAssessmentRequests, listCollectionIdsForOrganisation, listCustomerCollectionAttachments, listCustomerCollectionAuditEvents, listCustomerPortalCollections, updateAssessmentStatus, updateCollectionStatus } from "./db";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { adminProcedure, protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { notifyOwner } from "./_core/notification";
import { storageGetSignedUrl, storagePut } from "./storage";

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
  collections: router({
    listAdmin: adminProcedure.query(() => listAdminCollections()),
    create: adminProcedure.input(z.object({
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
    updateStatus: adminProcedure.input(z.object({ id: z.number().int().positive(), status: collectionStatusSchema })).mutation(async ({ ctx, input }) => {
      await updateCollectionStatus(input.id, input.status);
      await createCollectionAuditEvent({ collectionId: input.id, eventType: "status_changed", summary: `Collection status changed to ${input.status.replaceAll("_", " ")}`, customerVisible: true, actorUserId: ctx.user.id });
      return { success: true } as const;
    }),
    createInvitation: adminProcedure.input(z.object({
      organisationId: z.number().int().positive(),
      email: z.string().trim().email().max(320),
      role: z.enum(["admin", "viewer"]).default("viewer"),
    })).mutation(async ({ ctx, input }) => {
      const token = randomBytes(24).toString("base64url");
      const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      await createCustomerPortalInvitation({ ...input, token, expiresAt, createdByUserId: ctx.user.id });
      const collectionIds = await listCollectionIdsForOrganisation(input.organisationId);
      await Promise.all(collectionIds.map(({ id }) => createCollectionAuditEvent({ collectionId: id, eventType: "customer_access_changed", summary: `Customer portal invitation created for ${input.role} access`, customerVisible: false, actorUserId: ctx.user.id })));
      return { token, expiresAt };
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
  magicPortal: router({
    overview: publicProcedure.input(z.object({ token: z.string().min(20).max(128) })).query(({ input }) => getMagicPortalOverview(input.token)),
    downloadAttachment: publicProcedure.input(z.object({ token: z.string().min(20).max(128), attachmentId: z.number().int().positive() })).mutation(async ({ input }) => {
      const attachment = await getMagicPortalAttachment(input.token, input.attachmentId);
      return { url: await storageGetSignedUrl(attachment.storageKey), fileName: attachment.fileName };
    }),
  }),
});

export type AppRouter = typeof appRouter;
