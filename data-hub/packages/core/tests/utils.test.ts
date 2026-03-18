import test from "node:test";
import assert from "node:assert/strict";

import { parseFeedCursor, sortFeedItemsChronologically } from "../src/utils.js";

test("feed items always sort reverse-chronologically", () => {
  const items = sortFeedItemsChronologically([
    { id: "a", publishedAt: "2026-03-16T10:00:00.000Z" },
    { id: "b", publishedAt: "2026-03-17T10:00:00.000Z" },
    { id: "c", publishedAt: "2026-03-17T10:00:00.000Z" },
  ]);

  assert.deepEqual(
    items.map((item) => item.id),
    ["c", "b", "a"],
  );
});

test("feed cursors round-trip safely", () => {
  const cursor = parseFeedCursor("2026-03-17T10:00:00.000Z::abc");
  assert.equal(cursor?.id, "abc");
});
