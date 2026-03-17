import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";

import { parseEnvText, readEnvFileSnapshot, writeEnvFile } from "@/lib/env";

const tempRoot = path.join(os.tmpdir(), "bigredpi-dashboard-tests");

afterEach(async () => {
  await fs.rm(tempRoot, { recursive: true, force: true });
});

describe("env helpers", () => {
  it("parses env text while ignoring comments and quotes", () => {
    const parsed = parseEnvText(`
      # comment
      HTTP_PORT=8081
      APP_NAME="Nextcloud"
      EMPTY=
    `);

    assert.deepEqual(parsed, {
      HTTP_PORT: "8081",
      APP_NAME: "Nextcloud",
      EMPTY: "",
    });
  });

  it("writes and reads env files with metadata", async () => {
    const envPath = path.join(tempRoot, "nextcloud", ".env");
    await writeEnvFile(envPath, "HTTP_PORT=8081\n");
    const snapshot = await readEnvFileSnapshot(envPath);

    assert.equal(snapshot.exists, true);
    assert.ok(snapshot.text.includes("HTTP_PORT=8081"));
    assert.notEqual(snapshot.modifiedAt, null);
  });
});
