import { Queue } from "bullmq";

import { INGEST_QUEUE, MEDIA_QUEUE, SUMMARY_QUEUE } from "./index.js";

export function createRedisConnection(redisUrl: string) {
  const parsed = new URL(redisUrl);
  return {
    host: parsed.hostname,
    port: Number(parsed.port || 6379),
    username: parsed.username || undefined,
    password: parsed.password || undefined,
    maxRetriesPerRequest: null,
  };
}

export function createQueues(redisUrl: string) {
  const connection = createRedisConnection(redisUrl);
  return {
    connection,
    ingestQueue: new Queue(INGEST_QUEUE, { connection }),
    mediaQueue: new Queue(MEDIA_QUEUE, { connection }),
    summaryQueue: new Queue(SUMMARY_QUEUE, { connection }),
  };
}
