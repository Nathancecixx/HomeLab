import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { createAdminSession, parseSessionToken } from "@/lib/auth";

describe("auth session tokens", () => {
  it("creates a token that can be parsed back into a session payload", () => {
    const token = createAdminSession();
    const payload = parseSessionToken(token);

    assert.notEqual(payload, null);
    assert.equal(payload?.role, "admin");
    assert.ok((payload?.exp ?? 0) > (payload?.iat ?? 0));
  });

  it("rejects tampered tokens", () => {
    const token = createAdminSession();
    const [payload] = token.split(".");
    const tampered = `${payload}.tampered`;

    assert.equal(parseSessionToken(tampered), null);
  });
});
