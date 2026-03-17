import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { buildOverview } from "@/lib/telemetry";
import type { DashboardSnapshot } from "@/lib/types";

function createInput(overrides?: Partial<Pick<DashboardSnapshot, "cpu" | "memory" | "storage" | "services" | "meta">>) {
  return {
    cpu: {
      model: "CPU",
      cores: 4,
      load: 18,
      temp: 48,
      ...overrides?.cpu,
    },
    memory: {
      totalBytes: 100,
      usedBytes: 35,
      freeBytes: 65,
      totalLabel: "100 GiB",
      usedLabel: "35 GiB",
      freeLabel: "65 GiB",
      usedPct: 35,
      ...overrides?.memory,
    },
    storage: {
      disks: [
        {
          mount: "/",
          sizeBytes: 100,
          usedBytes: 30,
          freeBytes: 70,
          usagePct: 30,
          sizeLabel: "100 GiB",
          usedLabel: "30 GiB",
          freeLabel: "70 GiB",
        },
      ],
      totalCount: 1,
      fullestMount: "/",
      ...overrides?.storage,
    },
    services: overrides?.services ?? [],
    meta: {
      hostname: "bigredpi",
      platform: "Linux",
      kernel: "6.0",
      node: "20",
      timeZone: "America/Toronto",
      now: new Date().toISOString(),
      fastRefreshMs: 2000,
      slowRefreshMs: 10000,
      lastFastRefreshAt: null,
      lastSlowRefreshAt: null,
      dockerError: null,
      connectionState: "live",
      hostTelemetry: true,
      configWarnings: [],
      ...overrides?.meta,
    },
  };
}

describe("buildOverview", () => {
  it("marks healthy snapshots as stable", () => {
    const overview = buildOverview(createInput());

    assert.equal(overview.level, "healthy");
    assert.ok(overview.notes[0]?.includes("stable"));
  });

  it("escalates warning and critical conditions", () => {
    const warning = buildOverview(
      createInput({
        cpu: { model: "CPU", cores: 4, load: 70, temp: 60 },
      })
    );
    const critical = buildOverview(
      createInput({
        memory: {
          totalBytes: 100,
          usedBytes: 95,
          freeBytes: 5,
          totalLabel: "100 GiB",
          usedLabel: "95 GiB",
          freeLabel: "5 GiB",
          usedPct: 95,
        },
      })
    );

    assert.equal(warning.level, "warning");
    assert.equal(critical.level, "critical");
  });
});
