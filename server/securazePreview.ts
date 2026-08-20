import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import type { ItadBrand } from "../shared/itadCore";

type PreviewClaims = { jobId: number; brand: ItadBrand; fileHash: string; mappingVersion: "securaze_csv_v1"; expiresAt: number };

const previewSecret = () => {
  if (!process.env.JWT_SECRET) throw new Error("Secure preview confirmation is not configured");
  return process.env.JWT_SECRET;
};

export const securazeFileHash = (bytes: Buffer) => createHash("sha256").update(bytes).digest("hex");

export function createSecurazePreviewReceipt(input: Omit<PreviewClaims, "expiresAt">) {
  const claims: PreviewClaims = { ...input, expiresAt: Date.now() + 20 * 60 * 1000 };
  const payload = Buffer.from(JSON.stringify(claims)).toString("base64url");
  const signature = createHmac("sha256", previewSecret()).update(payload).digest("base64url");
  return { receipt: `${payload}.${signature}`, expiresAt: new Date(claims.expiresAt) };
}

export function verifySecurazePreviewReceipt(receipt: string, input: { jobId: number; brand: ItadBrand; fileHash: string }) {
  const [payload, suppliedSignature, extra] = receipt.split(".");
  if (!payload || !suppliedSignature || extra) throw new Error("The CSV preview receipt is invalid");
  const expectedSignature = createHmac("sha256", previewSecret()).update(payload).digest("base64url");
  const supplied = Buffer.from(suppliedSignature);
  const expected = Buffer.from(expectedSignature);
  if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) throw new Error("The CSV preview receipt is invalid");
  let claims: PreviewClaims;
  try { claims = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as PreviewClaims; } catch { throw new Error("The CSV preview receipt is invalid"); }
  if (claims.expiresAt < Date.now()) throw new Error("The CSV preview has expired; preview the file again before confirming");
  if (claims.jobId !== input.jobId || claims.brand !== input.brand || claims.fileHash !== input.fileHash || claims.mappingVersion !== "securaze_csv_v1") throw new Error("The CSV does not match the reviewed preview");
  return claims;
}
