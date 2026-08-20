/** ITAD Core brand boundary: one operating model, deliberately distinct brand experiences. */
export const ITAD_BRANDS = ["reborn", "bulk_gsm"] as const;
export type ItadBrand = (typeof ITAD_BRANDS)[number];

export const ITAD_BRAND_CONFIG: Record<ItadBrand, { label: string; sender: string; portalPath: string }> = {
  reborn: { label: "Reborn Tech", sender: "Reborn Tech <reborn@bulkgsm.com>", portalPath: "/portal" },
  bulk_gsm: { label: "Bulk GSM ITAD", sender: "Bulk GSM ITAD <itad@bulkgsm.com>", portalPath: "/portal" },
};

export const DEFAULT_ITAD_BRAND: ItadBrand = "reborn";

export const ITAD_JOB_STAGES = ["intake", "planned_collection", "received", "processing", "exceptions", "evidence_review", "client_published", "completed"] as const;
export type ItadJobStage = (typeof ITAD_JOB_STAGES)[number];
