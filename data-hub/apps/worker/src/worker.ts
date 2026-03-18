import { createWriteStream } from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";

import { Worker } from "bullmq";
import type { MediaAsset, SummaryProvider } from "@data-hub/contracts";
import {
  createDataHubConfig,
  createDbPool,
  createQueues,
  createRedisConnection,
  ensureDataHubSchema,
  evaluateItemAgainstWatchlists,
  getAdapterForSource,
  INGEST_QUEUE,
  MEDIA_QUEUE,
  SUMMARY_QUEUE,
  DataHubRepository,
  summarizeWithProvider,
} from "@data-hub/core";

function getFileExtension(remoteUrl: string) {
  try {
    const url = new URL(remoteUrl);
    const extension = path.extname(url.pathname);
    return extension || ".bin";
  } catch {
    return ".bin";
  }
}

async function downloadFile(remoteUrl: string, targetPath: string) {
  const response = await fetch(remoteUrl, {
    headers: {
      "user-agent": "HomeLab-Data-Hub/0.1 (+https://homelab.local)",
    },
  });

  if (!response.ok || !response.body) {
    throw new Error(`Download failed with ${response.status} ${response.statusText}`);
  }

  await fs.mkdir(path.dirname(targetPath), { recursive: true });
  const body = Readable.fromWeb(response.body as never);
  await pipeline(body, createWriteStream(targetPath));
  return {
    bytes: Number(response.headers.get("content-length") ?? 0),
    mimeType: response.headers.get("content-type"),
  };
}

async function main() {
  const config = createDataHubConfig(process.env);
  const pool = createDbPool(config.databaseUrl);
  await ensureDataHubSchema(pool);
  const repository = new DataHubRepository(pool, config.apiOrigin);
  await repository.seedUsers(config);
  await repository.seedDefaultProviders(config);

  const queues = createQueues(config.redisUrl);
  const workerConnection = createRedisConnection(config.redisUrl);

  const ingestWorker = new Worker(
    INGEST_QUEUE,
    async (job) => {
      const sourceId = String(job.data.sourceId);
      const source = await repository.getSourceById(sourceId);
      if (!source || !source.active) {
        return;
      }

      const runId = await repository.createIngestionRun(source.id);
      const startedAt = Date.now();
      let newItemCount = 0;
      let cachedMediaCount = 0;
      try {
        const adapter = getAdapterForSource(source.sourceType, source.adapterKey);
        const normalizedItems = await adapter.poll(source, {
          fetch,
          now: () => new Date(),
        });

        const watchlists = await repository.listActiveWatchlistsWithRules();
        for (const normalizedItem of normalizedItems) {
          const resolved = await adapter.resolveMedia(normalizedItem, {
            fetch,
            now: () => new Date(),
          });

          const result = await repository.upsertIngestedItem(source, {
            ...resolved,
            externalId: normalizedItem.externalId,
            mediaAssets: resolved.mediaAssets as MediaAsset[],
          });

          if (result.inserted) {
            newItemCount += 1;
            await repository.createActivityEvent("item.created", {
              sourceId: source.id,
              itemId: result.itemId,
              module: resolved.module,
            });

            const watchlistMatches = evaluateItemAgainstWatchlists(
              {
                title: resolved.title,
                excerpt: resolved.excerpt,
                bodyText: resolved.bodyText,
                sourceId: source.id,
                sourceTitle: source.title,
                tags: resolved.tags,
              },
              watchlists,
            );

            for (const match of watchlistMatches) {
              const inserted = await repository.createWatchlistMatch(match.watchlistId, result.itemId, match.matchReason, match.clusterKey, match.clusterLabel);
              if (inserted) {
                const watchlist = watchlists.find((entry) => entry.id === match.watchlistId);
                await repository.createActivityEvent(
                  "watchlist.match",
                  {
                    watchlistId: match.watchlistId,
                    itemId: result.itemId,
                    matchReason: match.matchReason,
                    clusterLabel: match.clusterLabel,
                  },
                  watchlist?.userId ?? null,
                );
              }
            }
          }
        }

        if (source.sourceType === "podcast" && (await repository.hasFollowersForSource(source.id))) {
          const assets = await repository.findCacheableAudioAssetsForSource(source.id);
          for (const asset of assets) {
            await queues.mediaQueue.add("cache-media", { assetId: asset.id }, { jobId: `asset:${asset.id}` });
            cachedMediaCount += 1;
          }
        }

        await repository.noteSourcePollSuccess(source.id, Date.now() - startedAt);
        await repository.finishIngestionRun(runId, "completed", {
          itemCount: normalizedItems.length,
          newItemCount,
          cachedMediaCount,
          latencyMs: Date.now() - startedAt,
        });
        await repository.createActivityEvent("ingestion", {
          sourceId: source.id,
          status: "completed",
          itemCount: normalizedItems.length,
          newItemCount,
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown ingestion failure";
        await repository.noteSourcePollFailure(source.id, message);
        await repository.finishIngestionRun(runId, "failed", {
          itemCount: 0,
          newItemCount: 0,
          cachedMediaCount: 0,
          latencyMs: Date.now() - startedAt,
          error: message,
        });
        await repository.createActivityEvent("ingestion", {
          sourceId: source.id,
          status: "failed",
          error: message,
        });
        throw error;
      }
    },
    { connection: workerConnection, concurrency: 2 },
  );

  const mediaWorker = new Worker(
    MEDIA_QUEUE,
    async (job) => {
      const assetId = String(job.data.assetId);
      const asset = await repository.getMediaAssetById(assetId);
      if (!asset?.remote_url) {
        return;
      }

      const totalBytes = await repository.getTotalCachedBytes();
      if (totalBytes > config.mediaQuotaBytes) {
        const candidates = await repository.listCacheEvictionCandidates();
        for (const candidate of candidates) {
          if (candidate.localPath) {
            await fs.rm(candidate.localPath, { force: true });
          }
          await repository.clearMediaAssetCache(candidate.id);
        }
      }

      const extension = getFileExtension(String(asset.remote_url));
      const targetPath = path.join(config.mediaRoot, "cache", `${assetId}${extension}`);
      try {
        const download = await downloadFile(String(asset.remote_url), targetPath);
        await repository.markMediaAssetCached(assetId, targetPath, download.bytes, download.mimeType);
        await repository.createActivityEvent("cache.completed", {
          assetId,
          remoteUrl: asset.remote_url,
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown cache failure";
        await repository.markMediaAssetFailed(assetId, message);
        await repository.createActivityEvent("cache.failed", {
          assetId,
          error: message,
        });
      }
    },
    { connection: workerConnection, concurrency: 1 },
  );

  const summaryWorker = new Worker(
    SUMMARY_QUEUE,
    async (job) => {
      const summaryId = String(job.data.summaryId);
      const summary = await repository.getSummaryById(summaryId);
      if (!summary || summary.status === "completed") {
        return;
      }

      const providers = await repository.listSummaryProviders();
      const provider =
        (summary.providerId ? providers.find((entry) => entry.id === summary.providerId) : providers.find((entry) => entry.active)) ?? null;
      if (!provider) {
        await repository.failSummary(summaryId, "No active summary provider is configured.");
        return;
      }

      try {
        let prompt = "";
        if (summary.itemId) {
          const item = await repository.getItemById(summary.userId, summary.itemId);
          if (!item) {
            throw new Error("Summary item no longer exists.");
          }

          prompt = `Summarize this feed item for a private chronological dashboard.\n\nTitle: ${item.title}\nSource: ${item.sourceTitle}\nPublished: ${item.publishedAt}\n\n${item.bodyText ?? item.excerpt ?? ""}`;
        } else if (summary.watchlistId) {
          const watchlists = await repository.listWatchlists(summary.userId);
          const watchlist = watchlists.find((entry) => entry.id === summary.watchlistId);
          const matches = await repository.listWatchlistMatches(summary.userId, summary.watchlistId);
          const excerpt = matches
            .slice(0, 10)
            .map((match) => `- ${match.item.publishedAt} | ${match.item.sourceTitle} | ${match.item.title}\n  ${match.item.excerpt ?? ""}`)
            .join("\n");
          prompt = `Summarize the current status of this watchlist.\n\nWatchlist: ${watchlist?.name ?? summary.watchlistId}\n\nRecent matches:\n${excerpt}`;
        } else {
          throw new Error("Summary has no target.");
        }

        const text = await summarizeWithProvider({
          provider: provider as SummaryProvider,
          prompt,
          env: process.env,
          fetch,
        });

        await repository.completeSummary(summaryId, text, provider.model);
        await repository.createActivityEvent(
          "summary.completed",
          {
            summaryId,
            itemId: summary.itemId,
            watchlistId: summary.watchlistId,
          },
          summary.userId,
        );
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown summary failure";
        await repository.failSummary(summaryId, message);
        await repository.createActivityEvent(
          "summary.failed",
          {
            summaryId,
            error: message,
          },
          summary.userId,
        );
        throw error;
      }
    },
    { connection: workerConnection, concurrency: 1 },
  );

  const scheduleDueSources = async () => {
    const dueSources = await repository.listDueSources();
    for (const source of dueSources) {
      await queues.ingestQueue.add("ingest-source", { sourceId: source.id }, { jobId: `source:${source.id}` });
    }
  };

  await scheduleDueSources();
  const interval = setInterval(() => {
    void scheduleDueSources();
  }, 30_000);

  const shutdown = async () => {
    clearInterval(interval);
    await Promise.all([
      ingestWorker.close(),
      mediaWorker.close(),
      summaryWorker.close(),
      queues.ingestQueue.close(),
      queues.mediaQueue.close(),
      queues.summaryQueue.close(),
      pool.end(),
    ]);
    process.exit(0);
  };

  process.on("SIGINT", () => {
    void shutdown();
  });
  process.on("SIGTERM", () => {
    void shutdown();
  });
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
