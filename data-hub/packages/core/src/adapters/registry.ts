import type { AppModule, SourceAdapter, SourceType } from "@data-hub/contracts";

import { podcastAdapter } from "./podcast.js";
import { rssAdapter } from "./rss.js";
import { youtubeAdapter } from "./youtube.js";

const adapters: SourceAdapter[] = [rssAdapter, podcastAdapter, youtubeAdapter];

export function listAdapters() {
  return adapters;
}

export function getAdapterByKey(key: string) {
  return adapters.find((adapter) => adapter.key === key) ?? null;
}

export function getAdapterForSource(sourceType: SourceType, adapterKey: string) {
  const adapter = getAdapterByKey(adapterKey);
  if (!adapter) {
    throw new Error(`Unknown adapter "${adapterKey}".`);
  }

  if (!adapter.supportedTypes.includes(sourceType)) {
    throw new Error(`Adapter "${adapterKey}" does not support source type "${sourceType}".`);
  }

  return adapter;
}

export async function discoverSource(input: { sourceType: SourceType; adapterKey: string; url: string; module: AppModule }, fetchFn: typeof fetch) {
  const adapter = getAdapterForSource(input.sourceType, input.adapterKey);
  await adapter.validate({ url: input.url, sourceType: input.sourceType });
  return adapter.discover(input, {
    fetch: fetchFn,
    now: () => new Date(),
  });
}
