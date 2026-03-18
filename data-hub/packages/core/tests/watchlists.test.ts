import test from "node:test";
import assert from "node:assert/strict";

import { evaluateItemAgainstWatchlists } from "../src/domain/watchlists.js";

test("watchlist matching stays transparent and rule-driven", () => {
  const matches = evaluateItemAgainstWatchlists(
    {
      title: "Ransomware campaign hits MSPs",
      excerpt: "Security teams are investigating.",
      bodyText: "The latest ransomware campaign is affecting managed service providers.",
      sourceId: "source-1",
      sourceTitle: "Security Wire",
      tags: ["security"],
    },
    [
      {
        id: "watch-1",
        userId: "user-1",
        name: "Cyber",
        description: null,
        color: null,
        active: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        rules: [
          {
            id: "rule-1",
            watchlistId: "watch-1",
            ruleType: "keyword",
            pattern: "ransomware",
            caseSensitive: false,
          },
        ],
      },
    ],
  );

  assert.equal(matches[0]?.clusterLabel, "ransomware");
  assert.equal(matches[0]?.matchReason, "keyword:ransomware");
});
