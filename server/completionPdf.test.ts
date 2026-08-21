import { describe, expect, it } from "vitest";
import { createCompletionSummaryPdf, createDestructionCertificateTemplatePdf } from "./completionPdf";

describe("completion PDF builders", () => {
  it("creates a controlled destruction certificate template PDF", async () => {
    const content = await createDestructionCertificateTemplatePdf({ brand: "reborn", jobReference: "RB-100", jobTitle: "London laptop collection", organisationName: "Example client", collectionReference: "COL-100", assetCount: 2 });
    expect(Buffer.from(content, "base64").subarray(0, 4).toString("utf8")).toBe("%PDF");
  });

  it("creates a completion summary with approved non-financial outcomes", async () => {
    const content = await createCompletionSummaryPdf({ brand: "bulk_gsm", jobReference: "BG-100", jobTitle: "Bulk collection", organisationName: "Example client", completedAt: new Date("2026-09-10"), documents: [{ evidenceType: "securaze_report", certificateReference: "SEC-1", issuer: "Securaze", customerApprovedAt: new Date("2026-09-10") }], impact: { assetsReused: 3, assetsRecycled: 2, assetsRedistributed: 1, materialsRecoveredKg: 12, carbonAvoidedKg: null, carbonMethodology: null, narrative: "Verified non-financial outcomes." } });
    expect(Buffer.from(content, "base64").subarray(0, 4).toString("utf8")).toBe("%PDF");
  });
});
