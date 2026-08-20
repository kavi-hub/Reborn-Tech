import { describe, expect, it } from "vitest";
import { hashClientPassword, readClientPortalSession, setClientPortalSession, verifyClientPassword } from "./clientPortalAuth";

describe("client portal password protection", () => {
  it("stores a salted scrypt hash and accepts only the matching password", async () => {
    const password = "SecureClient123";
    const hash = await hashClientPassword(password);
    expect(hash).toMatch(/^scrypt\$[^$]+\$[^$]+$/);
    await expect(verifyClientPassword(password, hash)).resolves.toBe(true);
    await expect(verifyClientPassword("WrongClient123", hash)).resolves.toBe(false);
  });

  it("round-trips a signed client session and rejects a tampered token", async () => {
    let token = "";
    let maxAge = 0;
    const res = { cookie: (_name: string, value: string, options: { maxAge?: number }) => { token = value; maxAge = options.maxAge ?? 0; } };
    const req = { protocol: "https", headers: {} };
    await setClientPortalSession(res as never, req as never, { accountId: 7, organisationId: 13, brand: "reborn", role: "viewer", email: "client@example.com", sessionVersion: 2 }, true);
    expect(maxAge).toBe(60 * 60 * 24 * 30 * 1000);
    await expect(readClientPortalSession({ headers: { cookie: `__Host-reborn_client_portal=${token}` } } as never)).resolves.toEqual({ accountId: 7, organisationId: 13, brand: "reborn", role: "viewer", email: "client@example.com", sessionVersion: 2 });
    await expect(readClientPortalSession({ headers: { cookie: `__Host-reborn_client_portal=${token}x` } } as never)).resolves.toBeNull();
  });
});
