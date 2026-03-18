import path from "node:path";

import type { AppModule, SourceTier, SourceType, SummaryProviderType } from "@data-hub/contracts";

function parseNumber(value: string | undefined, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function parseBoolean(value: string | undefined, fallback: boolean) {
  if (value === undefined) {
    return fallback;
  }

  const normalized = value.trim().toLowerCase();
  if (["1", "true", "yes", "on"].includes(normalized)) {
    return true;
  }

  if (["0", "false", "no", "off"].includes(normalized)) {
    return false;
  }

  return fallback;
}

export interface DataHubConfig {
  nodeEnv: string;
  port: number;
  databaseUrl: string;
  redisUrl: string;
  sessionSecret: string;
  sessionTtlSeconds: number;
  cookieSecure: boolean;
  mediaRoot: string;
  mediaQuotaBytes: number;
  webOrigin: string;
  apiOrigin: string;
  internalApiUrl: string;
  seedAdmin: {
    email: string;
    password: string;
    displayName: string;
  };
  seedMember: {
    email: string;
    password: string;
    displayName: string;
  };
  defaultAiProvider: SummaryProviderType | null;
  appVersion: string;
  aiDefaults: {
    ollamaBaseUrl: string | null;
    openAiKey: string | null;
    anthropicKey: string | null;
  };
}

export function createDataHubConfig(env: NodeJS.ProcessEnv): DataHubConfig {
  return {
    nodeEnv: env.NODE_ENV ?? "development",
    port: parseNumber(env.PORT, 8184),
    databaseUrl: env.DATABASE_URL ?? "postgres://datahub:datahub@localhost:5432/datahub",
    redisUrl: env.REDIS_URL ?? "redis://127.0.0.1:6379",
    sessionSecret: env.SESSION_SECRET ?? "change-me",
    sessionTtlSeconds: parseNumber(env.SESSION_TTL_SECONDS, 60 * 60 * 12),
    cookieSecure: parseBoolean(env.COOKIE_SECURE, false),
    mediaRoot: env.MEDIA_ROOT ?? env.DATA_HUB_MEDIA_ROOT ?? path.resolve(process.cwd(), "..", "..", ".data-hub-media"),
    mediaQuotaBytes: parseNumber(env.DATA_HUB_MEDIA_QUOTA_BYTES, 20 * 1024 * 1024 * 1024),
    webOrigin: env.DATA_HUB_WEB_ORIGIN ?? "http://localhost:8183",
    apiOrigin: env.DATA_HUB_API_ORIGIN ?? "http://localhost:8184",
    internalApiUrl: env.DATA_HUB_INTERNAL_API_URL ?? "http://127.0.0.1:8184",
    seedAdmin: {
      email: env.SEED_ADMIN_EMAIL ?? "admin@homelab.local",
      password: env.SEED_ADMIN_PASSWORD ?? "change-me-admin",
      displayName: env.SEED_ADMIN_NAME ?? "HomeLab Admin",
    },
    seedMember: {
      email: env.SEED_MEMBER_EMAIL ?? "member@homelab.local",
      password: env.SEED_MEMBER_PASSWORD ?? "change-me-member",
      displayName: env.SEED_MEMBER_NAME ?? "Household Member",
    },
    defaultAiProvider: (env.DEFAULT_AI_PROVIDER as SummaryProviderType | undefined) ?? null,
    appVersion: env.npm_package_version ?? "0.1.0",
    aiDefaults: {
      ollamaBaseUrl: env.OLLAMA_BASE_URL ?? null,
      openAiKey: env.OPENAI_API_KEY ?? null,
      anthropicKey: env.ANTHROPIC_API_KEY ?? null,
    },
  };
}

export function getDefaultPollingMinutes(sourceType: SourceType, sourceTier: SourceTier) {
  if (sourceTier === "breaking") {
    return 2;
  }

  if (sourceType === "youtube" || sourceType === "podcast") {
    return 10;
  }

  return 15;
}

export function getDefaultEnabledModules(): AppModule[] {
  return ["inbox", "news", "channels", "podcasts", "saved"];
}
