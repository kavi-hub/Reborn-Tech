import { COOKIE_NAME } from "@shared/const";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { assignCustomerOrganisationMember, assignCustomerViewerByOrganisationAdmin, createAssessmentRequest, createCollectionTrack, deleteAssessmentRequest, exportAssessmentRequests, getCustomerOrganisationMembership, listAdminCollections, listAssessmentRequests, listCustomerPortalCollections, updateAssessmentStatus, updateCollectionStatus } from "./db";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { adminProcedure, protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { notifyOwner } from "./_core/notification";

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
    })).mutation(async ({ input }) => {
      await createCollectionTrack(input);
      return { success: true } as const;
    }),
    updateStatus: adminProcedure.input(z.object({ id: z.number().int().positive(), status: collectionStatusSchema })).mutation(async ({ input }) => {
      await updateCollectionStatus(input.id, input.status);
      return { success: true } as const;
    }),
    assignMember: adminProcedure.input(z.object({
      organisationId: z.number().int().positive(),
      email: z.string().trim().email().max(320),
      role: z.enum(["admin", "viewer"]),
    })).mutation(async ({ input }) => {
      await assignCustomerOrganisationMember(input);
      return { success: true } as const;
    }),
  }),
  customerPortal: router({
    collections: protectedProcedure.query(({ ctx }) => listCustomerPortalCollections(ctx.user.id)),
    assignViewer: protectedProcedure.input(z.object({ organisationId: z.number().int().positive(), email: z.string().trim().email().max(320) })).mutation(async ({ ctx, input }) => {
      const membership = await getCustomerOrganisationMembership(ctx.user.id, input.organisationId);
      if (membership?.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Only an organisation admin can grant viewer access" });
      }
      await assignCustomerViewerByOrganisationAdmin({ actorUserId: ctx.user.id, ...input });
      return { success: true } as const;
    }),
  }),
});

export type AppRouter = typeof appRouter;
