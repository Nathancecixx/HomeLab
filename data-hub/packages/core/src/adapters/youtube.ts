import type { SourceAdapter } from "@data-hub/contracts";

import { fetchXml, getAtomItems, getFeedMeta, normalizeYouTubeEntry, toDiscoveryResult } from "./shared.js";

async function resolveYouTubeFeedUrl(url: string, fetchFn: typeof fetch) {
  const parsed = new URL(url);
  if (parsed.pathname.endsWith("/feeds/videos.xml") || parsed.pathname === "/feeds/videos.xml") {
    return parsed.toString();
  }

  if (parsed.searchParams.has("channel_id")) {
    return `https://www.youtube.com/feeds/videos.xml?channel_id=${parsed.searchParams.get("channel_id")}`;
  }

  const channelMatch = parsed.pathname.match(/\/channel\/([^/?]+)/i);
  if (channelMatch?.[1]) {
    return `https://www.youtube.com/feeds/videos.xml?channel_id=${channelMatch[1]}`;
  }

  const response = await fetchFn(url, {
    headers: {
      "user-agent": "HomeLab-Data-Hub/0.1 (+https://homelab.local)",
      accept: "text/html,application/xhtml+xml",
    },
  });

  if (!response.ok) {
    throw new Error(`YouTube page request failed with ${response.status}`);
  }

  const html = await response.text();
  const channelIdMatch = html.match(/"channelId":"(UC[^"]+)"/);
  if (!channelIdMatch?.[1]) {
    throw new Error("Unable to resolve a YouTube channel id from the provided URL.");
  }

  return `https://www.youtube.com/feeds/videos.xml?channel_id=${channelIdMatch[1]}`;
}

export const youtubeAdapter: SourceAdapter = {
  key: "youtube",
  supportedTypes: ["youtube"],
  async validate(input) {
    const url = new URL(input.url);
    if (!["http:", "https:"].includes(url.protocol)) {
      throw new Error("Only HTTP(S) YouTube URLs are supported.");
    }
  },
  async discover(input, context) {
    const feedUrl = await resolveYouTubeFeedUrl(input.url, context.fetch);
    const document = await fetchXml(feedUrl, context);
    const meta = getFeedMeta(document);
    return toDiscoveryResult(meta, "youtube", input.module, "youtube", feedUrl);
  },
  async poll(source, context) {
    const document = await fetchXml(source.feedUrl, context);
    return getAtomItems(document).map((item) => normalizeYouTubeEntry(item, source.module));
  },
  async normalize(input) {
    return normalizeYouTubeEntry(input.rawItem, input.module);
  },
  async resolveMedia(item) {
    return item;
  },
};
