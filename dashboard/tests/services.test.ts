import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { getServiceById, resolveServiceApp } from "@/lib/services";

describe("service registry", () => {
  it("exposes only repo-backed services", () => {
    assert.equal(getServiceById("nextcloud")?.label, "Nextcloud");
    assert.equal(getServiceById("btc-explorer"), null);
    assert.equal(getServiceById("n8n"), null);
  });

  it("derives app links from registry metadata instead of docker port scraping", () => {
    const nextcloud = getServiceById("nextcloud");
    const zim = getServiceById("zim");

    assert.notEqual(nextcloud, null);
    assert.deepEqual(resolveServiceApp(nextcloud!, "HTTP_PORT=9090\n"), {
      label: "Open Nextcloud",
      port: 9090,
      protocol: "http",
    });
    assert.deepEqual(resolveServiceApp(zim!, ""), {
      label: "Open Library",
      port: 8082,
      protocol: "http",
    });
  });
});
