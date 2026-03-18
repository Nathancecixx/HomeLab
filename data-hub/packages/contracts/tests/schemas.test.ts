import test from "node:test";
import assert from "node:assert/strict";

import { FeedFilterSchema, LoginInputSchema, SummaryRequestSchema } from "../src/index.js";

test("login schema validates a household email/password payload", () => {
  const value = LoginInputSchema.parse({
    email: "admin@homelab.local",
    password: "super-secret-password",
  });

  assert.equal(value.email, "admin@homelab.local");
});

test("summary requests require a target", () => {
  assert.throws(() => SummaryRequestSchema.parse({ promptStyle: "brief" }));
  const itemSummary = SummaryRequestSchema.parse({ itemId: "123e4567-e89b-12d3-a456-426614174000" });
  assert.equal(itemSummary.promptStyle, "brief");
});

test("feed filters keep pagination defaults bounded", () => {
  const value = FeedFilterSchema.parse({ query: "wireguard" });
  assert.equal(value.limit, 30);
});
