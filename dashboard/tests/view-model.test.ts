import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { buildAppHref, formatDuration, getServiceIssueLabel, levelLabel, serviceLabel } from "@/lib/view-model";
import type { ServiceSnapshot } from "@/lib/types";

function createService(overrides?: Partial<ServiceSnapshot>): ServiceSnapshot {
  return {
    id: "nextcloud",
    label: "Nextcloud",
    description: "Files",
    modulePath: "/homelab/nextcloud",
    envPath: "/homelab/nextcloud/.env",
    composeProject: "nextcloud",
    definedServices: ["app"],
    runningServices: ["app"],
    running: true,
    hasEnv: true,
    health: "running",
    details: ["1 of 1 compose services running."],
    app: {
      label: "Open",
      port: 8443,
      protocol: "https",
      path: "/",
    },
    ...overrides,
  };
}

describe("view-model helpers", () => {
  it("formats uptime in a compact form", () => {
    assert.equal(formatDuration(3665), "1h 1m");
    assert.equal(formatDuration(90065), "1d 1h 1m");
  });

  it("returns concise health labels", () => {
    assert.equal(levelLabel("healthy"), "OK");
    assert.equal(levelLabel("warning"), "Warn");
    assert.equal(levelLabel("critical"), "Critical");
    assert.equal(serviceLabel("running"), "Live");
    assert.equal(serviceLabel("stopped"), "Idle");
  });

  it("builds direct app links from a service snapshot", () => {
    assert.equal(buildAppHref(createService(), "bigredpi"), "https://bigredpi:8443/");
    assert.equal(buildAppHref(createService({ app: null }), "bigredpi"), null);
  });

  it("compresses raw service errors into short issue labels", () => {
    assert.equal(
      getServiceIssueLabel(
        createService({
          health: "error",
          hasEnv: false,
          details: ['time="2026-03-17" level=warning msg="The \\"SERVERURL\\" variable is not set." invalid proto:'],
        })
      ),
      "Config missing"
    );
    assert.equal(
      getServiceIssueLabel(
        createService({
          health: "error",
          details: ["Module directory is missing or not mounted into the dashboard container."],
        })
      ),
      "Module missing"
    );
  });
});
