import crypto from "node:crypto";

import type { FeedItem } from "@data-hub/contracts";

export function sha256(value: string) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

export function createOpaqueToken(prefix: string) {
  return `${prefix}_${crypto.randomBytes(24).toString("hex")}`;
}

export function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export function stripHtml(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  return value
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, "\"")
    .replace(/\s+/g, " ")
    .trim();
}

export function truncate(value: string | null | undefined, max = 280) {
  if (!value) {
    return null;
  }

  if (value.length <= max) {
    return value;
  }

  return `${value.slice(0, max - 1).trimEnd()}…`;
}

export function ensureUrl(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  try {
    return new URL(value).toString();
  } catch {
    return null;
  }
}

export function parseYouTubeVideoId(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  try {
    const url = new URL(value);
    if (url.hostname.includes("youtube.com")) {
      return url.searchParams.get("v");
    }

    if (url.hostname.includes("youtu.be")) {
      return url.pathname.slice(1) || null;
    }
  } catch {
    return null;
  }

  return null;
}

export function buildYouTubeEmbedUrl(videoId: string | null) {
  return videoId ? `https://www.youtube-nocookie.com/embed/${videoId}` : null;
}

export function toIsoDate(value: string | Date | null | undefined) {
  if (!value) {
    return null;
  }

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.toISOString();
}

export function feedCursorFromItem(item: Pick<FeedItem, "publishedAt" | "id">) {
  return `${item.publishedAt}::${item.id}`;
}

export function parseFeedCursor(cursor: string | undefined) {
  if (!cursor) {
    return null;
  }

  const [publishedAt, id] = cursor.split("::");
  if (!publishedAt || !id) {
    return null;
  }

  return {
    publishedAt,
    id,
  };
}

export function sortFeedItemsChronologically<T extends { publishedAt: string; id: string }>(items: T[]) {
  return [...items].sort((left, right) => {
    if (left.publishedAt === right.publishedAt) {
      return right.id.localeCompare(left.id);
    }

    return right.publishedAt.localeCompare(left.publishedAt);
  });
}

export function safeJsonParse<T>(value: string | null | undefined, fallback: T): T {
  if (!value) {
    return fallback;
  }

  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}
