import test from "node:test";
import assert from "node:assert/strict";

import { createDataHubConfig } from "@data-hub/core";

test("api config exposes the expected default ports and origins", () => {
  const config = createDataHubConfig({
    DATA_HUB_API_ORIGIN: "http://localhost:8184",
    DATA_HUB_WEB_ORIGIN: "http://localhost:8183",
  });

  assert.equal(config.apiOrigin, "http://localhost:8184");
  assert.equal(config.webOrigin, "http://localhost:8183");
});
