import type { SourceAdapter } from "@data-hub/contracts";

import { fetchXml, getFeedMeta, getRssItems, normalizeRssLikeItem, toDiscoveryResult } from "./shared.js";

export const podcastAdapter: SourceAdapter = {
  key: "podcast",
  supportedTypes: ["podcast"],
  async validate(input) {
    const url = new URL(input.url);
    if (!["http:", "https:"].includes(url.protocol)) {
      throw new Error("Only HTTP(S) podcast feeds are supported.");
    }
  },
  async discover(input, context) {
    const document = await fetchXml(input.url, context);
    const meta = getFeedMeta(document);
    return toDiscoveryResult(meta, "podcast", input.module, "podcast", input.url);
  },
  async poll(source, context) {
    const document = await fetchXml(source.feedUrl, context);
    return getRssItems(document).map((item) => normalizeRssLikeItem(item, source.module, "podcast", "podcast"));
  },
  async normalize(input) {
    return normalizeRssLikeItem(input.rawItem, input.module, "podcast", "podcast");
  },
  async resolveMedia(item) {
    return item;
  },
};
