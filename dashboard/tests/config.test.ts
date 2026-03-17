import assert from "node:assert/strict";
import path from "node:path";
import { describe, it } from "node:test";

import { createAppConfig } from "@/lib/config";

describe("createAppConfig", () => {
  it("defaults cookie security off for LAN deployments", () => {
    const config = createAppConfig({});

    assert.equal(config.httpPort, 8080);
    assert.equal(config.secureCookies, false);
  });

  it("reads explicit cookie and host fs settings", () => {
    const config = createAppConfig({
      COOKIE_SECURE: "true",
      HOST_FS_ROOT: "/hostfs",
      HTTP_PORT: "8090",
      HOMELAB_ROOT: "/homelab",
    });

    assert.equal(config.secureCookies, true);
    assert.equal(config.hostFsRoot, "/hostfs");
    assert.equal(config.httpPort, 8090);
    assert.equal(config.dashboardEnvPath, path.join("/homelab", "dashboard", ".env"));
  });
});
