import type { FeedItem, Watchlist } from "@data-hub/contracts";

function normalize(value: string, caseSensitive: boolean) {
  return caseSensitive ? value : value.toLowerCase();
}

export interface WatchlistEvaluationResult {
  watchlistId: string;
  matchReason: string;
  clusterKey: string;
  clusterLabel: string;
}

export function evaluateItemAgainstWatchlists(item: Pick<FeedItem, "title" | "excerpt" | "bodyText" | "sourceId" | "sourceTitle" | "tags">, watchlists: Watchlist[]) {
  const haystack = `${item.title}\n${item.excerpt ?? ""}\n${item.bodyText ?? ""}`;
  const results: WatchlistEvaluationResult[] = [];

  for (const watchlist of watchlists) {
    for (const rule of watchlist.rules) {
      const left = normalize(haystack, rule.caseSensitive);
      const pattern = normalize(rule.pattern, rule.caseSensitive);
      let matched = false;

      if (rule.ruleType === "source") {
        matched = normalize(item.sourceTitle, rule.caseSensitive).includes(pattern);
      } else if (rule.ruleType === "tag") {
        matched = item.tags.some((tag) => normalize(tag, rule.caseSensitive) === pattern);
      } else {
        matched = left.includes(pattern);
      }

      if (matched) {
        results.push({
          watchlistId: watchlist.id,
          matchReason: `${rule.ruleType}:${rule.pattern}`,
          clusterKey: `${watchlist.id}:${rule.ruleType}:${pattern}`,
          clusterLabel: rule.pattern,
        });
      }
    }
  }

  return results;
}
