import { COOKIE_NAME } from "@shared/const";
import { z } from "zod";
import { createAssessmentRequest, deleteAssessmentRequest, listAssessmentRequests, updateAssessmentStatus } from "./db";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { adminProcedure, publicProcedure, router } from "./_core/trpc";

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

      return { success: true } as const;
    }),
    list: adminProcedure.input(z.object({
      search: z.string().trim().max(160).optional(),
      status: z.enum(["new", "contacted", "qualified", "closed"]).optional(),
      page: z.number().int().min(1).default(1),
      limit: z.number().int().min(5).max(50).default(20),
      sort: z.enum(["newest", "oldest"]).default("newest"),
    })).query(({ input }) => listAssessmentRequests(input)),
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
});

export type AppRouter = typeof appRouter;
