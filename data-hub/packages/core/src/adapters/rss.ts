import type { SourceAdapter } from "@data-hub/contracts";

import { fetchXml, getFeedMeta, getRssItems, normalizeRssLikeItem, toDiscoveryResult } from "./shared.js";

export const rssAdapter: SourceAdapter = {
  key: "rss",
  supportedTypes: ["rss", "adapter"],
  async validate(input) {
    const url = new URL(input.url);
    if (!["http:", "https:"].includes(url.protocol)) {
      throw new Error("Only HTTP(S) feed URLs are supported.");
    }
  },
  async discover(input, context) {
    const document = await fetchXml(input.url, context);
    const meta = getFeedMeta(document);
    return toDiscoveryResult(meta, input.sourceType, input.module, "rss", input.url);
  },
  async poll(source, context) {
    const document = await fetchXml(source.feedUrl, context);
    return getRssItems(document).map((item) => normalizeRssLikeItem(item, source.module, "article", source.sourceType));
  },
  async normalize(input) {
    return normalizeRssLikeItem(input.rawItem, input.module, "article", input.sourceType);
  },
  async resolveMedia(item) {
    return item;
  },
};
