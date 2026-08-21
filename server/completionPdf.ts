import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";

const INK = rgb(0.12, 0.15, 0.13);
const MINERAL = rgb(0.13, 0.29, 0.24);
const LIME = rgb(0.79, 0.95, 0.29);
const PAPER = rgb(0.96, 0.95, 0.9);

type Impact = { assetsReused: number; assetsRecycled: number; assetsRedistributed: number; materialsRecoveredKg: number; carbonAvoidedKg: number | null; carbonMethodology: string | null; narrative: string | null };
type DocumentRecord = { evidenceType: string; certificateReference: string | null; issuer: string | null; customerApprovedAt: Date | null };

function wrap(text: string, font: PDFFont, size: number, width: number) {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (font.widthOfTextAtSize(next, size) <= width) line = next;
    else { if (line) lines.push(line); line = word; }
  }
  if (line) lines.push(line);
  return lines;
}

function drawParagraph(page: PDFPage, text: string, x: number, y: number, width: number, font: PDFFont, size = 10, color = INK, leading = 15) {
  let cursor = y;
  for (const line of wrap(text, font, size, width)) { page.drawText(line, { x, y: cursor, size, font, color }); cursor -= leading; }
  return cursor;
}

function brandLabel(brand: "reborn" | "bulk_gsm") { return brand === "bulk_gsm" ? "BULK GSM / ITAD CORE" : "REBORN TECH / ITAD CORE"; }
function documentLabel(type: string) { return ({ securaze_report: "Securaze evidence", destruction_certificate: "Destruction certificate", impact_statement: "Impact statement", data_erasure: "Data erasure evidence", collection_manifest: "Collection manifest", reuse_outcome: "Reuse outcome", recycling_outcome: "Recycling outcome" } as Record<string, string>)[type] || "Issued document"; }

async function createBase(brand: "reborn" | "bulk_gsm", title: string, subtitle: string) {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([595.28, 841.89]);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  page.drawRectangle({ x: 0, y: 0, width: 595.28, height: 841.89, color: PAPER });
  page.drawRectangle({ x: 0, y: 783, width: 595.28, height: 58.89, color: INK });
  page.drawRectangle({ x: 42, y: 801, width: 8, height: 8, color: LIME });
  page.drawText(brandLabel(brand), { x: 59, y: 801, size: 8.5, font: bold, color: PAPER });
  page.drawText(title, { x: 43, y: 735, size: 25, font: bold, color: INK });
  page.drawText(subtitle, { x: 43, y: 714, size: 10, font: regular, color: MINERAL });
  return { pdf, page, bold, regular };
}

export async function createDestructionCertificateTemplatePdf(input: { brand: "reborn" | "bulk_gsm"; jobReference: string; jobTitle: string; organisationName: string; collectionReference?: string | null; assetCount: number }) {
  const { pdf, page, bold, regular } = await createBase(input.brand, "Destruction Certificate", "Operations completion template — complete only from verified destruction records.");
  let y = 667;
  const rows = [["Core Job", input.jobReference], ["Organisation", input.organisationName], ["Collection", input.collectionReference || "Not linked"], ["Asset inventory", `${input.assetCount} recorded asset rows`]];
  for (const [label, value] of rows) { page.drawText(label.toUpperCase(), { x: 43, y, size: 8, font: bold, color: MINERAL }); page.drawText(value, { x: 187, y, size: 11, font: regular, color: INK }); page.drawLine({ start: { x: 43, y: y - 9 }, end: { x: 552, y: y - 9 }, thickness: .55, color: rgb(.72, .73, .68) }); y -= 37; }
  page.drawText("CERTIFICATE DETAILS TO COMPLETE", { x: 43, y: y - 3, size: 9, font: bold, color: MINERAL }); y -= 31;
  const fields = ["Certificate reference", "Destruction date", "Method / facility", "Authorised signatory", "Supporting evidence reference"];
  for (const field of fields) { page.drawText(field, { x: 43, y, size: 10, font: regular, color: INK }); page.drawLine({ start: { x: 200, y: y - 2 }, end: { x: 552, y: y - 2 }, thickness: .75, color: rgb(.48, .51, .47) }); y -= 41; }
  page.drawRectangle({ x: 43, y: 150, width: 509, height: 93, color: rgb(.9, .92, .84), borderColor: rgb(.63, .68, .56), borderWidth: .6 });
  page.drawText("CONTROL NOTE", { x: 57, y: 221, size: 8.5, font: bold, color: MINERAL });
  drawParagraph(page, "This template is an operational aid. It is not a completed destruction certificate until authorised details and supporting evidence are verified, uploaded and explicitly approved for the client portal.", 57, 202, 476, regular, 10, INK, 14);
  page.drawText("Reborn Tech ITAD Core — controlled operational template", { x: 43, y: 57, size: 8.5, font: regular, color: MINERAL });
  return Buffer.from(await pdf.save()).toString("base64");
}

export async function createCompletionSummaryPdf(input: { brand: "reborn" | "bulk_gsm"; jobReference: string; jobTitle: string; organisationName: string; completedAt: Date; documents: DocumentRecord[]; impact: Impact | null }) {
  const { pdf, page, bold, regular } = await createBase(input.brand, "ITAD Completion Summary", "Client-issued summary of approved documents and verified non-financial outcomes.");
  let y = 665;
  for (const [label, value] of [["Core Job", input.jobReference], ["Organisation", input.organisationName], ["Completed", new Date(input.completedAt).toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" })]] as Array<[string, string]>) { page.drawText(label.toUpperCase(), { x: 43, y, size: 8, font: bold, color: MINERAL }); page.drawText(value, { x: 187, y, size: 11, font: regular, color: INK }); page.drawLine({ start: { x: 43, y: y - 9 }, end: { x: 552, y: y - 9 }, thickness: .55, color: rgb(.72, .73, .68) }); y -= 37; }
  page.drawText(input.jobTitle, { x: 43, y: y - 5, size: 14, font: bold, color: INK }); y -= 43;
  page.drawText("ISSUED DOCUMENTS", { x: 43, y, size: 9, font: bold, color: MINERAL }); y -= 20;
  for (const document of input.documents) { page.drawText("•", { x: 48, y, size: 12, font: bold, color: MINERAL }); page.drawText(documentLabel(document.evidenceType), { x: 63, y, size: 10.5, font: bold, color: INK }); const detail = [document.certificateReference, document.issuer].filter(Boolean).join(" · "); if (detail) page.drawText(detail, { x: 220, y, size: 9.2, font: regular, color: MINERAL }); y -= 22; }
  y -= 10;
  page.drawText("VERIFIED NON-FINANCIAL OUTCOMES", { x: 43, y, size: 9, font: bold, color: MINERAL }); y -= 26;
  if (input.impact) {
    const metrics = [["Assets reused", String(input.impact.assetsReused)], ["Assets recycled", String(input.impact.assetsRecycled)], ["Assets redistributed", String(input.impact.assetsRedistributed)], ["Materials recovered", `${input.impact.materialsRecoveredKg} kg`]];
    for (const [label, value] of metrics) { page.drawRectangle({ x: 43, y: y - 27, width: 244, height: 38, color: rgb(.91, .92, .86) }); page.drawText(label, { x: 55, y: y - 5, size: 8.5, font: regular, color: MINERAL }); page.drawText(value, { x: 55, y: y - 20, size: 15, font: bold, color: INK }); y -= 47; }
    if (input.impact.carbonAvoidedKg !== null && input.impact.carbonMethodology) { page.drawText(`Carbon avoided: ${input.impact.carbonAvoidedKg} kg CO₂e`, { x: 315, y: 268, size: 11, font: bold, color: INK }); drawParagraph(page, input.impact.carbonMethodology, 315, 250, 215, regular, 8.7, MINERAL, 12); }
    if (input.impact.narrative) drawParagraph(page, input.impact.narrative, 315, 200, 215, regular, 9.5, INK, 14);
  } else page.drawText("No approved impact statement was available when this summary was issued.", { x: 43, y, size: 10, font: regular, color: INK });
  page.drawRectangle({ x: 43, y: 72, width: 509, height: 58, color: rgb(.9, .92, .84), borderColor: rgb(.63, .68, .56), borderWidth: .6 });
  drawParagraph(page, "This summary lists approved client records only. It does not disclose service fees, resale values, costs, margins or profit information.", 57, 109, 476, regular, 9.5, INK, 13);
  page.drawText("Issued through the secured ITAD client dashboard", { x: 43, y: 52, size: 8.5, font: regular, color: MINERAL });
  return Buffer.from(await pdf.save()).toString("base64");
}
