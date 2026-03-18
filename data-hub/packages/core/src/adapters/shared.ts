import { XMLParser } from "fast-xml-parser";

import type { AppModule, DiscoveredSource, NormalizedSourceItem, SourceAdapterContext, SourceType } from "@data-hub/contracts";

import { buildYouTubeEmbedUrl, ensureUrl, parseYouTubeVideoId, stripHtml, truncate } from "../utils.js";

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "",
  removeNSPrefix: true,
  textNodeName: "text",
});

export function asArray<T>(value: T | T[] | null | undefined): T[] {
  if (!value) {
    return [];
  }

  return Array.isArray(value) ? value : [value];
}

export async function fetchXml(url: string, context: SourceAdapterContext) {
  const response = await context.fetch(url, {
    headers: {
      "user-agent": "HomeLab-Data-Hub/0.1 (+https://homelab.local)",
      accept: "application/rss+xml, application/atom+xml, application/xml, text/xml, text/html",
    },
  });

  if (!response.ok) {
    throw new Error(`Feed request failed with ${response.status} ${response.statusText}`);
  }

  const xml = await response.text();
  return parser.parse(xml) as Record<string, unknown>;
}

export function getFeedMeta(document: Record<string, unknown>) {
  if (document.feed) {
    const feed = document.feed as Record<string, unknown>;
    const links = asArray(feed.link as Record<string, unknown> | Array<Record<string, unknown>>);
    const htmlLink = links.find((link) => link.rel === "alternate") ?? links[0];
    return {
      title: String(feed.title ?? "Untitled feed"),
      description: feed.subtitle ? String(feed.subtitle) : null,
      siteUrl: htmlLink?.href ? String(htmlLink.href) : null,
      imageUrl: null,
      language: feed.lang ? String(feed.lang) : null,
    };
  }

  const channel = (document.rss as Record<string, unknown> | undefined)?.channel as Record<string, unknown> | undefined;
  if (!channel) {
    throw new Error("Unsupported feed format.");
  }

  const image = channel.image as Record<string, unknown> | undefined;
  return {
    title: String(channel.title ?? "Untitled feed"),
    description: channel.description ? String(channel.description) : null,
    siteUrl: channel.link ? String(channel.link) : null,
    imageUrl: image?.url ? String(image.url) : null,
    language: channel.language ? String(channel.language) : null,
  };
}

export function getRssItems(document: Record<string, unknown>) {
  const channel = (document.rss as Record<string, unknown> | undefined)?.channel as Record<string, unknown> | undefined;
  return asArray(channel?.item as Record<string, unknown> | Array<Record<string, unknown>>);
}

export function getAtomItems(document: Record<string, unknown>) {
  const feed = document.feed as Record<string, unknown> | undefined;
  return asArray(feed?.entry as Record<string, unknown> | Array<Record<string, unknown>>);
}

export function normalizeRssLikeItem(rawItem: Record<string, unknown>, module: AppModule, itemType: NormalizedSourceItem["itemType"], sourceType: SourceType): NormalizedSourceItem {
  const description = stripHtml(
    (rawItem["content:encoded"] as string | undefined) ??
      (rawItem.description as string | undefined) ??
      (rawItem.summary as string | undefined),
  );
  const audioUrl =
    itemType === "podcast"
      ? ensureUrl((rawItem.enclosure as Record<string, unknown> | undefined)?.url as string | undefined)
      : null;
  const imageUrl =
    ensureUrl((rawItem.image as Record<string, unknown> | undefined)?.url as string | undefined) ??
    ensureUrl((rawItem["itunes:image"] as Record<string, unknown> | undefined)?.href as string | undefined) ??
    null;

  return {
    externalId: String(rawItem.guid ?? rawItem.id ?? rawItem.link ?? `${rawItem.title ?? "item"}:${rawItem.pubDate ?? rawItem.isoDate ?? ""}`),
    canonicalUrl: ensureUrl(rawItem.link as string | undefined),
    title: String(rawItem.title ?? "Untitled item"),
    excerpt: truncate(description, 240),
    bodyText: description,
    authorName: rawItem.author ? String(rawItem.author) : rawItem.creator ? String(rawItem.creator) : null,
    publishedAt: new Date(String(rawItem.pubDate ?? rawItem.isoDate ?? rawItem.published ?? new Date().toISOString())).toISOString(),
    module,
    itemType,
    tags: asArray(rawItem.category as string | string[]).map(String).filter(Boolean),
    siteUrl: ensureUrl(rawItem.link as string | undefined),
    imageUrl,
    audioUrl,
    videoUrl: null,
    embedUrl: null,
    videoId: null,
    mediaAssets: [
      ...(imageUrl ? [{ kind: "thumbnail" as const, remoteUrl: imageUrl, mimeType: null }] : []),
      ...(audioUrl ? [{ kind: "audio" as const, remoteUrl: audioUrl, mimeType: ((rawItem.enclosure as Record<string, unknown> | undefined)?.type as string | undefined) ?? null }] : []),
    ],
    rawPayload: {
      sourceType,
      ...rawItem,
    },
  };
}

export function normalizeYouTubeEntry(rawItem: Record<string, unknown>, module: AppModule): NormalizedSourceItem {
  const links = asArray(rawItem.link as Record<string, unknown> | Array<Record<string, unknown>>);
  const siteUrl = ensureUrl((links[0]?.href as string | undefined) ?? (rawItem.link as string | undefined));
  const videoId =
    String(rawItem["videoId"] ?? rawItem.id ?? "")
      .replace("yt:video:", "")
      .trim() || parseYouTubeVideoId(siteUrl);
  const thumbnail = ensureUrl(
    ((rawItem.group as Record<string, unknown> | undefined)?.thumbnail as Record<string, unknown> | undefined)?.url as string | undefined,
  );

  return {
    externalId: videoId ?? String(rawItem.id ?? rawItem.published ?? rawItem.title),
    canonicalUrl: siteUrl,
    title: String(rawItem.title ?? "Untitled video"),
    excerpt: truncate(stripHtml((rawItem.group as Record<string, unknown> | undefined)?.description as string | undefined), 240),
    bodyText: stripHtml((rawItem.group as Record<string, unknown> | undefined)?.description as string | undefined),
    authorName: rawItem.author ? String((rawItem.author as Record<string, unknown>).name ?? "") : null,
    publishedAt: new Date(String(rawItem.published ?? rawItem.updated ?? new Date().toISOString())).toISOString(),
    module,
    itemType: "video",
    tags: ["youtube"],
    siteUrl,
    imageUrl: thumbnail,
    audioUrl: null,
    videoUrl: siteUrl,
    embedUrl: buildYouTubeEmbedUrl(videoId),
    videoId,
    mediaAssets: thumbnail ? [{ kind: "thumbnail", remoteUrl: thumbnail, mimeType: null }] : [],
    rawPayload: rawItem,
  };
}

export function toDiscoveryResult(meta: ReturnType<typeof getFeedMeta>, sourceType: SourceType, module: AppModule, adapterKey: string, feedUrl: string): DiscoveredSource {
  return {
    title: meta.title,
    description: meta.description,
    feedUrl,
    siteUrl: ensureUrl(meta.siteUrl),
    imageUrl: ensureUrl(meta.imageUrl),
    language: meta.language,
    module,
    sourceType,
    adapterKey,
    metadata: {},
  };
}
