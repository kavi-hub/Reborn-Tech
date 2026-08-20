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
    const res = { cookie: (_name: string, value: string) => { token = value; } };
    const req = { protocol: "https", headers: {} };
    await setClientPortalSession(res as never, req as never, { accountId: 7, organisationId: 13, brand: "reborn", role: "viewer", email: "client@example.com" });
    await expect(readClientPortalSession({ headers: { cookie: `__Host-reborn_client_portal=${token}` } } as never)).resolves.toEqual({ accountId: 7, organisationId: 13, brand: "reborn", role: "viewer", email: "client@example.com" });
    await expect(readClientPortalSession({ headers: { cookie: `__Host-reborn_client_portal=${token}x` } } as never)).resolves.toBeNull();
  });
});
