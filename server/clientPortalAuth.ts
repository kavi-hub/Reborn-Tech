import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { SignJWT, jwtVerify } from "jose";
import { parse } from "cookie";
import type { Request, Response } from "express";
import { ENV } from "./_core/env";
import { getSessionCookieOptions } from "./_core/cookies";

const scrypt = promisify(scryptCallback);
const CLIENT_PORTAL_COOKIE = "__Host-reborn_client_portal";
const CLIENT_PORTAL_AUDIENCE = "reborn-client-portal";
const SESSION_SECONDS = 60 * 60 * 8;

export type ClientPortalSession = { accountId: number; organisationId: number; brand: "reborn" | "bulk_gsm"; role: "admin" | "viewer"; email: string };

function signingKey() {
  if (!ENV.cookieSecret) throw new Error("Client portal session signing is not configured");
  return new TextEncoder().encode(ENV.cookieSecret);
}

export async function hashClientPassword(password: string) {
  const salt = randomBytes(16).toString("base64url");
  const derived = (await scrypt(password, salt, 64)) as Buffer;
  return `scrypt$${salt}$${derived.toString("base64url")}`;
}

export async function verifyClientPassword(password: string, stored: string) {
  const [algorithm, salt, expected] = stored.split("$");
  if (algorithm !== "scrypt" || !salt || !expected) return false;
  const derived = (await scrypt(password, salt, 64)) as Buffer;
  const expectedBuffer = Buffer.from(expected, "base64url");
  return expectedBuffer.length === derived.length && timingSafeEqual(expectedBuffer, derived);
}

export async function setClientPortalSession(res: Response, req: Request, session: ClientPortalSession) {
  const token = await new SignJWT({ organisationId: session.organisationId, brand: session.brand, role: session.role, email: session.email })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(String(session.accountId))
    .setAudience(CLIENT_PORTAL_AUDIENCE)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_SECONDS}s`)
    .sign(signingKey());
  res.cookie(CLIENT_PORTAL_COOKIE, token, { ...getSessionCookieOptions(req), maxAge: SESSION_SECONDS * 1000 });
}

export function clearClientPortalSession(res: Response, req: Request) {
  res.clearCookie(CLIENT_PORTAL_COOKIE, getSessionCookieOptions(req));
}

export async function readClientPortalSession(req: Request): Promise<ClientPortalSession | null> {
  const token = parse(req.headers.cookie ?? "")[CLIENT_PORTAL_COOKIE];
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, signingKey(), { audience: CLIENT_PORTAL_AUDIENCE });
    const accountId = Number(payload.sub);
    const organisationId = Number(payload.organisationId);
    const brand = payload.brand;
    const role = payload.role;
    const email = payload.email;
    if (!Number.isInteger(accountId) || !Number.isInteger(organisationId) || (brand !== "reborn" && brand !== "bulk_gsm") || (role !== "admin" && role !== "viewer") || typeof email !== "string") return null;
    return { accountId, organisationId, brand, role, email };
  } catch {
    return null;
  }
}
