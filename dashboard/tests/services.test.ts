import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { getServiceById, getServiceDeviceById, resolveServiceApp } from "@/lib/services";

describe("service registry", () => {
  it("exposes the configured service list", () => {
    assert.equal(getServiceById("nextcloud")?.label, "Nextcloud");
    assert.equal(getServiceById("nextcloud")?.deviceId, "bigredpi");
    assert.equal(getServiceById("openwebui")?.label, "Open WebUI");
    assert.equal(getServiceById("openwebui")?.deviceId, "workstation");
    assert.equal(getServiceById("ollama")?.label, "Ollama");
    assert.equal(getServiceById("btc-explorer"), null);
    assert.equal(getServiceById("n8n"), null);
  });

  it("resolves service devices from the shared device registry", () => {
    assert.deepEqual(getServiceDeviceById("bigredpi"), {
      id: "bigredpi",
      label: "BigRedPi",
    });
    assert.deepEqual(getServiceDeviceById("workstation"), {
      id: "workstation",
      label: "Workstation",
      host: "192.168.40.94",
    });
  });

  it("derives app links from registry metadata instead of docker port scraping", () => {
    const nextcloud = getServiceById("nextcloud");
    const fitnesspal = getServiceById("fitnesspal");
    const openwebui = getServiceById("openwebui");

    assert.notEqual(nextcloud, null);
    assert.notEqual(fitnesspal, null);
    assert.notEqual(openwebui, null);
    assert.deepEqual(resolveServiceApp(nextcloud!, "HTTP_PORT=9090\n"), {
      label: "Open Nextcloud",
      port: 9090,
      protocol: "http",
    });
    assert.deepEqual(resolveServiceApp(fitnesspal!, ""), {
      label: "Open App",
      port: 8080,
      protocol: "http",
    });
    assert.deepEqual(resolveServiceApp(openwebui!, ""), {
      label: "Open App",
      host: "192.168.40.94",
      port: 3000,
      protocol: "http",
      path: "/",
    });
  });
});
