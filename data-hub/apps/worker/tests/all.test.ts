import test from "node:test";
import assert from "node:assert/strict";

import { INGEST_QUEUE, MEDIA_QUEUE, SUMMARY_QUEUE } from "@data-hub/core";

test("worker queue names stay stable for API and worker coordination", () => {
  assert.equal(INGEST_QUEUE, "data-hub-ingest");
  assert.equal(MEDIA_QUEUE, "data-hub-media-cache");
  assert.equal(SUMMARY_QUEUE, "data-hub-summary");
});
