import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { createAppConfig } from "@/lib/config";
import { summarizeRuntimeStatus } from "@/lib/runtime-status";

describe("summarizeRuntimeStatus", () => {
  it("flags weak production auth and missing WOL config", () => {
    const config = createAppConfig({
      HOMELAB_ROOT: "/homelab",
      SESSION_SECRET: "change-me",
      ADMIN_PASSWORD_BCRYPT: "",
      COOKIE_SECURE: "false",
    });

    const status = summarizeRuntimeStatus(config, {
      dockerError: "docker unavailable",
      hostTelemetry: false,
      homelabReadable: false,
      dashboardEnvReadable: false,
      wolTargetCount: 0,
      wolErrors: ["WOL target LAN_SERVER is missing a valid MAC address."],
    });

    assert.equal(status.checks.find((item) => item.id === "auth")?.ok, false);
    assert.equal(status.checks.find((item) => item.id === "docker")?.ok, false);
    assert.equal(status.checks.find((item) => item.id === "telemetry")?.ok, false);
    assert.ok(status.warnings.some((warning) => warning.includes("SESSION_SECRET")));
    assert.ok(status.warnings.some((warning) => warning.includes("ADMIN_PASSWORD_BCRYPT")));
    assert.ok(status.warnings.some((warning) => warning.includes("WOL target")));
  });
});
