import bcrypt from "bcryptjs";
import type { Pool } from "pg";

import {
  type ActivityEvent,
  type ActivityEventType,
  type AgentToken,
  type AlertIncident,
  type AppModule,
  type CreateSourceGroupInput,
  type CreateSourceInput,
  type CreateSummaryProviderInput,
  type CreateUserInput,
  type CreateWatchlistInput,
  type CreateWatchlistRuleInput,
  type FeedFilter,
  type FeedItem,
  type FeedItemState,
  type FeedPage,
  type HealthSnapshot,
  type MediaAsset,
  type PlaybackProgress,
  type SessionUser,
  type Source,
  type SourceGroup,
  type SourceHealth,
  type Summary,
  type SummaryProvider,
  type UserRole,
  type Watchlist,
  type WatchlistMatch,
  type WatchlistRule,
} from "@data-hub/contracts";

import type { DataHubConfig } from "../config.js";
import { getDefaultEnabledModules } from "../config.js";
import { feedCursorFromItem, parseFeedCursor, slugify } from "../utils.js";

type DbUserRow = {
  id: string;
  email: string;
  display_name: string;
  role: UserRole;
  password_hash: string;
  created_at: Date;
  updated_at: Date;
};

type DbSummaryRow = {
  id: string;
  item_id: string | null;
  watchlist_id: string | null;
  user_id: string;
  provider_id: string | null;
  provider_label: string | null;
  status: "pending" | "completed" | "failed";
  prompt_style: string;
  summary_text: string | null;
  model: string | null;
  created_at: Date;
  error: string | null;
};

function toSessionUser(row: Pick<DbUserRow, "id" | "email" | "display_name" | "role">): SessionUser {
  return {
    id: row.id,
    email: row.email,
    displayName: row.display_name,
    role: row.role,
  };
}

function toSourceGroup(row: Record<string, unknown>): SourceGroup {
  return {
    id: String(row.id),
    name: String(row.name),
    slug: String(row.slug),
    description: row.description ? String(row.description) : null,
    module: row.module as AppModule,
    sortOrder: Number(row.sort_order ?? 0),
    active: Boolean(row.active),
    createdAt: new Date(String(row.created_at)).toISOString(),
    updatedAt: new Date(String(row.updated_at)).toISOString(),
  };
}

function toSourceHealth(row: Record<string, unknown> | null): SourceHealth | null {
  if (!row?.source_id) {
    return null;
  }

  return {
    sourceId: String(row.source_id),
    consecutiveFailures: Number(row.consecutive_failures ?? 0),
    lastSuccessAt: row.last_success_at ? new Date(String(row.last_success_at)).toISOString() : null,
    lastErrorAt: row.last_error_at ? new Date(String(row.last_error_at)).toISOString() : null,
    lastError: row.last_error ? String(row.last_error) : null,
    nextRetryAt: row.next_retry_at ? new Date(String(row.next_retry_at)).toISOString() : null,
    averageLatencyMs: row.average_latency_ms === null || row.average_latency_ms === undefined ? null : Number(row.average_latency_ms),
  };
}

function toSource(row: Record<string, unknown>): Source {
  const group = row.group_id
    ? toSourceGroup({
        id: row.group_id,
        name: row.group_name,
        slug: row.group_slug,
        description: row.group_description,
        module: row.group_module,
        sort_order: row.group_sort_order,
        active: row.group_active,
        created_at: row.group_created_at,
        updated_at: row.group_updated_at,
      })
    : null;

  const health = toSourceHealth({
    source_id: row.health_source_id,
    consecutive_failures: row.consecutive_failures,
    last_success_at: row.last_success_at,
    last_error_at: row.last_error_at,
    last_error: row.last_error,
    next_retry_at: row.next_retry_at,
    average_latency_ms: row.average_latency_ms,
  });

  return {
    id: String(row.id),
    title: String(row.title),
    description: row.description ? String(row.description) : null,
    module: row.module as AppModule,
    sourceType: row.source_type as Source["sourceType"],
    sourceTier: row.source_tier as Source["sourceTier"],
    adapterKey: String(row.adapter_key),
    feedUrl: String(row.feed_url),
    siteUrl: row.site_url ? String(row.site_url) : null,
    imageUrl: row.image_url ? String(row.image_url) : null,
    language: row.language ? String(row.language) : null,
    active: Boolean(row.active),
    pollingMinutes: Number(row.polling_minutes),
    createdAt: new Date(String(row.created_at)).toISOString(),
    updatedAt: new Date(String(row.updated_at)).toISOString(),
    group,
    health,
    metadata: (row.metadata as Record<string, unknown> | null) ?? {},
    isFollowing: Boolean(row.is_following),
    followFolder: row.follow_folder ? String(row.follow_folder) : null,
  };
}

function toSummaryProvider(row: Record<string, unknown>): SummaryProvider {
  return {
    id: String(row.id),
    label: String(row.label),
    providerType: row.provider_type as SummaryProvider["providerType"],
    baseUrl: row.base_url ? String(row.base_url) : null,
    apiKeyEnv: row.api_key_env ? String(row.api_key_env) : null,
    model: String(row.model),
    active: Boolean(row.active),
    metadata: (row.metadata as Record<string, unknown> | null) ?? {},
    createdAt: new Date(String(row.created_at)).toISOString(),
    updatedAt: new Date(String(row.updated_at)).toISOString(),
  };
}

function toSummary(row: DbSummaryRow): Summary {
  return {
    id: row.id,
    itemId: row.item_id,
    watchlistId: row.watchlist_id,
    userId: row.user_id,
    providerId: row.provider_id,
    providerLabel: row.provider_label,
    status: row.status,
    promptStyle: row.prompt_style,
    summaryText: row.summary_text,
    model: row.model,
    createdAt: row.created_at.toISOString(),
    error: row.error,
  };
}

function toMediaAsset(row: Record<string, unknown>, apiOrigin: string): MediaAsset {
  const localPath = row.localPath ? String(row.localPath) : null;
  return {
    id: String(row.id),
    kind: row.kind as MediaAsset["kind"],
    remoteUrl: String(row.remoteUrl),
    localUrl: localPath ? `${apiOrigin}/api/v1/media/${row.id}` : null,
    mimeType: row.mimeType ? String(row.mimeType) : null,
    status: row.status as MediaAsset["status"],
    bytes: row.bytes === null || row.bytes === undefined ? null : Number(row.bytes),
    cachedAt: row.cachedAt ? new Date(String(row.cachedAt)).toISOString() : null,
  };
}

function toFeedItem(row: Record<string, unknown>, apiOrigin: string): FeedItem {
  const mediaAssets = Array.isArray(row.media_assets)
    ? row.media_assets.map((asset) => toMediaAsset(asset as Record<string, unknown>, apiOrigin))
    : [];

  const state: FeedItemState = {
    isRead: Boolean(row.is_read),
    isSaved: Boolean(row.is_saved),
    isHidden: Boolean(row.is_hidden),
    savedAt: row.saved_at ? new Date(String(row.saved_at)).toISOString() : null,
    readAt: row.read_at ? new Date(String(row.read_at)).toISOString() : null,
  };

  const playback: PlaybackProgress | null = row.playback_updated_at
    ? {
        progressSeconds: Number(row.progress_seconds ?? 0),
        durationSeconds: row.duration_seconds === null || row.duration_seconds === undefined ? null : Number(row.duration_seconds),
        completed: Boolean(row.completed),
        updatedAt: new Date(String(row.playback_updated_at)).toISOString(),
      }
    : null;

  return {
    id: String(row.id),
    sourceId: String(row.source_id),
    sourceTitle: String(row.source_title),
    title: String(row.title),
    canonicalUrl: row.canonical_url ? String(row.canonical_url) : null,
    excerpt: row.excerpt ? String(row.excerpt) : null,
    bodyText: row.body_text ? String(row.body_text) : null,
    authorName: row.author_name ? String(row.author_name) : null,
    publishedAt: new Date(String(row.published_at)).toISOString(),
    ingestedAt: new Date(String(row.ingested_at)).toISOString(),
    module: row.module as FeedItem["module"],
    itemType: row.item_type as FeedItem["itemType"],
    tags: Array.isArray(row.tags) ? (row.tags as string[]) : [],
    embedUrl: row.embed_url ? String(row.embed_url) : null,
    siteUrl: row.site_url ? String(row.site_url) : null,
    imageUrl: row.image_url ? String(row.image_url) : null,
    audioUrl: row.audio_url ? String(row.audio_url) : null,
    videoUrl: row.video_url ? String(row.video_url) : null,
    videoId: row.video_id ? String(row.video_id) : null,
    mediaAssets,
    state,
    playback,
    matchReasons: Array.isArray(row.match_reasons) ? (row.match_reasons as string[]) : [],
    rawPayload: (row.raw_payload as Record<string, unknown> | null) ?? {},
  };
}

function toWatchlistRule(row: Record<string, unknown>): WatchlistRule {
  return {
    id: String(row.id),
    watchlistId: String(row.watchlist_id),
    ruleType: row.rule_type as WatchlistRule["ruleType"],
    pattern: String(row.pattern),
    caseSensitive: Boolean(row.case_sensitive),
  };
}

function toWatchlist(row: Record<string, unknown>): Watchlist {
  return {
    id: String(row.id),
    userId: String(row.user_id),
    name: String(row.name),
    description: row.description ? String(row.description) : null,
    color: row.color ? String(row.color) : null,
    active: Boolean(row.active),
    createdAt: new Date(String(row.created_at)).toISOString(),
    updatedAt: new Date(String(row.updated_at)).toISOString(),
    rules: Array.isArray(row.rules) ? (row.rules as Record<string, unknown>[]).map(toWatchlistRule) : [],
  };
}

export class DataHubRepository {
  constructor(
    private readonly pool: Pool,
    private readonly apiOrigin: string,
  ) {}

  async seedUsers(config: DataHubConfig) {
    const users = [
      { email: config.seedAdmin.email, displayName: config.seedAdmin.displayName, password: config.seedAdmin.password, role: "admin" as const },
      { email: config.seedMember.email, displayName: config.seedMember.displayName, password: config.seedMember.password, role: "member" as const },
    ];

    for (const user of users) {
      const existing = await this.pool.query("SELECT id FROM users WHERE email = $1", [user.email.toLowerCase()]);
      if (existing.rowCount) {
        continue;
      }

      const passwordHash = await bcrypt.hash(user.password, 12);
      await this.pool.query(
        `INSERT INTO users (email, display_name, role, password_hash)
         VALUES ($1, $2, $3, $4)`,
        [user.email.toLowerCase(), user.displayName, user.role, passwordHash],
      );
    }
  }

  async seedDefaultProviders(config: DataHubConfig) {
    const defaults: Array<CreateSummaryProviderInput & { apiKeyEnv?: string | null }> = [];

    if (config.aiDefaults.ollamaBaseUrl) {
      defaults.push({
        label: "Local Ollama",
        providerType: "ollama",
        baseUrl: config.aiDefaults.ollamaBaseUrl,
        apiKeyEnv: null,
        model: "llama3.1",
        metadata: { recommended: true },
      });
    }

    if (config.aiDefaults.openAiKey) {
      defaults.push({
        label: "OpenAI",
        providerType: "openai",
        baseUrl: "https://api.openai.com",
        apiKeyEnv: "OPENAI_API_KEY",
        model: "gpt-4.1-mini",
        metadata: {},
      });
    }

    if (config.aiDefaults.anthropicKey) {
      defaults.push({
        label: "Anthropic",
        providerType: "anthropic",
        baseUrl: "https://api.anthropic.com",
        apiKeyEnv: "ANTHROPIC_API_KEY",
        model: "claude-3-5-haiku-latest",
        metadata: {},
      });
    }

    for (const provider of defaults) {
      const existing = await this.pool.query("SELECT id FROM ai_providers WHERE label = $1", [provider.label]);
      if (!existing.rowCount) {
        await this.createSummaryProvider(provider);
      }
    }
  }

  async listEnabledModules(): Promise<AppModule[]> {
    const result = await this.pool.query<{ setting_value: AppModule[] }>(
      "SELECT setting_value FROM app_settings WHERE setting_key = 'enabled_modules'",
    );

    if (!result.rowCount) {
      return getDefaultEnabledModules();
    }

    return Array.isArray(result.rows[0]?.setting_value) ? result.rows[0]!.setting_value : getDefaultEnabledModules();
  }

  async updateEnabledModules(modules: AppModule[]) {
    await this.pool.query(
      `INSERT INTO app_settings (setting_key, setting_value, updated_at)
       VALUES ('enabled_modules', $1::jsonb, NOW())
       ON CONFLICT (setting_key)
       DO UPDATE SET setting_value = EXCLUDED.setting_value, updated_at = NOW()`,
      [JSON.stringify(modules)],
    );

    return this.listEnabledModules();
  }

  async findUserByEmail(email: string) {
    const result = await this.pool.query<DbUserRow>("SELECT * FROM users WHERE email = $1", [email.toLowerCase()]);
    return result.rows[0] ?? null;
  }

  async findUserById(id: string) {
    const result = await this.pool.query<DbUserRow>("SELECT * FROM users WHERE id = $1", [id]);
    return result.rows[0] ?? null;
  }

  async listUsers() {
    const result = await this.pool.query<DbUserRow>("SELECT * FROM users ORDER BY created_at ASC");
    return result.rows.map(toSessionUser);
  }

  async createUser(input: CreateUserInput) {
    const passwordHash = await bcrypt.hash(input.password, 12);
    const result = await this.pool.query<DbUserRow>(
      `INSERT INTO users (email, display_name, role, password_hash)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [input.email.toLowerCase(), input.displayName, input.role, passwordHash],
    );

    return toSessionUser(result.rows[0]!);
  }

  async createSession(userId: string, tokenHash: string, userAgent: string | null, ipAddress: string | null, expiresAt: Date) {
    await this.pool.query(
      `INSERT INTO sessions (user_id, token_hash, user_agent, ip_address, expires_at)
       VALUES ($1, $2, $3, $4, $5)`,
      [userId, tokenHash, userAgent, ipAddress, expiresAt],
    );
  }

  async getSessionUser(tokenHash: string) {
    const result = await this.pool.query<
      DbUserRow & {
        expires_at: Date;
      }
    >(
      `SELECT u.*, s.expires_at
       FROM sessions s
       JOIN users u ON u.id = s.user_id
       WHERE s.token_hash = $1
         AND s.expires_at > NOW()`,
      [tokenHash],
    );

    const row = result.rows[0];
    if (!row) {
      return null;
    }

    await this.pool.query("UPDATE sessions SET last_seen_at = NOW() WHERE token_hash = $1", [tokenHash]);
    return toSessionUser(row);
  }

  async deleteSession(tokenHash: string) {
    await this.pool.query("DELETE FROM sessions WHERE token_hash = $1", [tokenHash]);
  }

  async listAgentTokens(userId: string): Promise<AgentToken[]> {
    const result = await this.pool.query<Record<string, unknown>>(
      `SELECT id, label, scopes, last_used_at, created_at
       FROM personal_access_tokens
       WHERE user_id = $1
         AND revoked_at IS NULL
       ORDER BY created_at DESC`,
      [userId],
    );

    return result.rows.map((row) => ({
      id: String(row.id),
      label: String(row.label),
      scopes: Array.isArray(row.scopes) ? (row.scopes as string[]) : [],
      lastUsedAt: row.last_used_at ? new Date(String(row.last_used_at)).toISOString() : null,
      createdAt: new Date(String(row.created_at)).toISOString(),
    }));
  }

  async createAgentToken(userId: string, label: string, tokenHash: string): Promise<AgentToken> {
    const result = await this.pool.query<Record<string, unknown>>(
      `INSERT INTO personal_access_tokens (user_id, label, token_hash)
       VALUES ($1, $2, $3)
       RETURNING id, label, scopes, last_used_at, created_at`,
      [userId, label, tokenHash],
    );

    const row = result.rows[0]!;
    return {
      id: String(row.id),
      label: String(row.label),
      scopes: Array.isArray(row.scopes) ? (row.scopes as string[]) : [],
      lastUsedAt: null,
      createdAt: new Date(String(row.created_at)).toISOString(),
    };
  }

  async getAgentTokenUser(tokenHash: string) {
    const result = await this.pool.query<
      DbUserRow & {
        token_id: string;
        scopes: string[];
      }
    >(
      `SELECT u.*, t.id AS token_id, t.scopes
       FROM personal_access_tokens t
       JOIN users u ON u.id = t.user_id
       WHERE t.token_hash = $1
         AND t.revoked_at IS NULL`,
      [tokenHash],
    );

    const row = result.rows[0];
    if (!row) {
      return null;
    }

    await this.pool.query("UPDATE personal_access_tokens SET last_used_at = NOW() WHERE id = $1", [row.token_id]);
    return {
      user: toSessionUser(row),
      scopes: row.scopes,
    };
  }

  async listSourceGroups() {
    const result = await this.pool.query("SELECT * FROM source_groups ORDER BY module, sort_order, name");
    return result.rows.map((row) => toSourceGroup(row));
  }

  async createSourceGroup(input: CreateSourceGroupInput) {
    const result = await this.pool.query(
      `INSERT INTO source_groups (name, slug, description, module, sort_order)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [input.name, slugify(input.name), input.description ?? null, input.module, input.sortOrder],
    );

    return toSourceGroup(result.rows[0]!);
  }

  async listSources(userId: string, module?: AppModule) {
    const params: unknown[] = [userId];
    const where: string[] = [];

    if (module) {
      params.push(module);
      where.push(`s.module = $${params.length}`);
    }

    const result = await this.pool.query(
      `SELECT
         s.*,
         sg.id AS group_id,
         sg.name AS group_name,
         sg.slug AS group_slug,
         sg.description AS group_description,
         sg.module AS group_module,
         sg.sort_order AS group_sort_order,
         sg.active AS group_active,
         sg.created_at AS group_created_at,
         sg.updated_at AS group_updated_at,
         sh.source_id AS health_source_id,
         sh.consecutive_failures,
         sh.last_success_at,
         sh.last_error_at,
         sh.last_error,
         sh.next_retry_at,
         sh.average_latency_ms,
         (uf.id IS NOT NULL) AS is_following,
         uf.folder AS follow_folder
       FROM sources s
       LEFT JOIN source_groups sg ON sg.id = s.source_group_id
       LEFT JOIN source_health sh ON sh.source_id = s.id
       LEFT JOIN user_follows uf ON uf.source_id = s.id AND uf.user_id = $1
       ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
       ORDER BY s.module, COALESCE(sg.sort_order, 9999), s.title`,
      params,
    );

    return result.rows.map((row) => toSource(row));
  }

  async getSourceById(sourceId: string, userId?: string) {
    const params: unknown[] = [sourceId];
    const followJoin = userId
      ? "LEFT JOIN user_follows uf ON uf.source_id = s.id AND uf.user_id = $2"
      : "LEFT JOIN user_follows uf ON FALSE";
    if (userId) {
      params.push(userId);
    }

    const result = await this.pool.query(
      `SELECT
         s.*,
         sg.id AS group_id,
         sg.name AS group_name,
         sg.slug AS group_slug,
         sg.description AS group_description,
         sg.module AS group_module,
         sg.sort_order AS group_sort_order,
         sg.active AS group_active,
         sg.created_at AS group_created_at,
         sg.updated_at AS group_updated_at,
         sh.source_id AS health_source_id,
         sh.consecutive_failures,
         sh.last_success_at,
         sh.last_error_at,
         sh.last_error,
         sh.next_retry_at,
         sh.average_latency_ms,
         (uf.id IS NOT NULL) AS is_following,
         uf.folder AS follow_folder
       FROM sources s
       LEFT JOIN source_groups sg ON sg.id = s.source_group_id
       LEFT JOIN source_health sh ON sh.source_id = s.id
       ${followJoin}
       WHERE s.id = $1`,
      params,
    );

    return result.rows[0] ? toSource(result.rows[0]) : null;
  }

  async createSource(input: CreateSourceInput, createdBy: string) {
    const result = await this.pool.query(
      `INSERT INTO sources (
         source_group_id,
         title,
         description,
         module,
         source_type,
         source_tier,
         adapter_key,
         feed_url,
         site_url,
         image_url,
         language,
         active,
         polling_minutes,
         metadata,
         created_by
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, TRUE, $12, $13::jsonb, $14)
       RETURNING *`,
      [
        input.sourceGroupId ?? null,
        input.title,
        input.description ?? null,
        input.module,
        input.sourceType,
        input.sourceTier,
        input.adapterKey,
        input.feedUrl,
        input.siteUrl ?? null,
        input.imageUrl ?? null,
        input.language ?? null,
        input.pollingMinutes,
        JSON.stringify(input.metadata ?? {}),
        createdBy,
      ],
    );

    await this.pool.query("INSERT INTO source_health (source_id) VALUES ($1) ON CONFLICT (source_id) DO NOTHING", [result.rows[0]!.id]);
    return this.getSourceById(String(result.rows[0]!.id), createdBy);
  }

  async followSource(userId: string, sourceId: string, folder: string) {
    await this.pool.query(
      `INSERT INTO user_follows (user_id, source_id, folder)
       VALUES ($1, $2, $3)
       ON CONFLICT (user_id, source_id)
       DO UPDATE SET folder = EXCLUDED.folder`,
      [userId, sourceId, folder],
    );
  }

  async unfollowSource(userId: string, sourceId: string) {
    await this.pool.query("DELETE FROM user_follows WHERE user_id = $1 AND source_id = $2", [userId, sourceId]);
  }

  async createActivityEvent(eventType: ActivityEventType, payload: Record<string, unknown>, userId: string | null = null, entityType: string | null = null, entityId: string | null = null) {
    await this.pool.query(
      `INSERT INTO activity_events (event_type, user_id, entity_type, entity_id, payload)
       VALUES ($1, $2, $3, $4, $5::jsonb)`,
      [eventType, userId, entityType, entityId, JSON.stringify(payload)],
    );
  }

  async listActivityEventsSince(cursor: string | null, userId: string | null = null): Promise<ActivityEvent[]> {
    const params: unknown[] = [];
    const where: string[] = [];

    if (cursor) {
      params.push(cursor);
      where.push(`created_at > $${params.length}::timestamptz`);
    }

    if (userId) {
      params.push(userId);
      where.push(`(user_id IS NULL OR user_id = $${params.length})`);
    }

    const result = await this.pool.query(
      `SELECT id, event_type, created_at, payload
       FROM activity_events
       ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
       ORDER BY created_at ASC
       LIMIT 50`,
      params,
    );

    return result.rows.map((row) => ({
      id: String(row.id),
      eventType: row.event_type as ActivityEvent["eventType"],
      createdAt: new Date(String(row.created_at)).toISOString(),
      payload: (row.payload as Record<string, unknown> | null) ?? {},
    }));
  }

  async listSummaryProviders() {
    const result = await this.pool.query("SELECT * FROM ai_providers ORDER BY active DESC, created_at ASC");
    return result.rows.map((row) => toSummaryProvider(row));
  }

  async createSummaryProvider(input: CreateSummaryProviderInput & { apiKeyEnv?: string | null }) {
    const result = await this.pool.query(
      `INSERT INTO ai_providers (label, provider_type, base_url, api_key_env, model, metadata)
       VALUES ($1, $2, $3, $4, $5, $6::jsonb)
       RETURNING *`,
      [input.label, input.providerType, input.baseUrl ?? null, input.apiKeyEnv ?? null, input.model, JSON.stringify(input.metadata ?? {})],
    );

    return toSummaryProvider(result.rows[0]!);
  }

  async getSummaryProviderById(providerId: string) {
    const result = await this.pool.query("SELECT * FROM ai_providers WHERE id = $1", [providerId]);
    return result.rows[0] ? toSummaryProvider(result.rows[0]) : null;
  }

  private async listFeedItemIds(userId: string, filters: FeedFilter) {
    const enabledModules = await this.listEnabledModules();
    const params: unknown[] = [enabledModules, userId];
    const where: string[] = ["s.active = TRUE", "i.module = ANY($1::text[])"];
    const joins: string[] = [
      "JOIN sources s ON s.id = i.source_id",
      "LEFT JOIN user_follows uf ON uf.source_id = i.source_id AND uf.user_id = $2",
      "LEFT JOIN item_states st ON st.item_id = i.id AND st.user_id = $2",
    ];

    const cursor = parseFeedCursor(filters.cursor);

    if (filters.module) {
      params.push(filters.module);
      where.push(`i.module = $${params.length}`);
    }

    if (filters.sourceId) {
      params.push(filters.sourceId);
      where.push(`i.source_id = $${params.length}::uuid`);
    }

    if (filters.sourceGroupId) {
      params.push(filters.sourceGroupId);
      where.push(`s.source_group_id = $${params.length}::uuid`);
    }

    if (filters.watchlistId) {
      params.push(filters.watchlistId);
      joins.push(`JOIN watchlist_matches wm_filter ON wm_filter.item_id = i.id AND wm_filter.watchlist_id = $${params.length}::uuid`);
    }

    if (!filters.query && !filters.savedOnly && !filters.watchlistId) {
      where.push("uf.id IS NOT NULL");
    }

    if (filters.unreadOnly) {
      where.push("COALESCE(st.is_read, FALSE) = FALSE");
    }

    if (filters.savedOnly) {
      where.push("COALESCE(st.is_saved, FALSE) = TRUE");
    }

    if (filters.hidden !== true) {
      where.push("COALESCE(st.is_hidden, FALSE) = FALSE");
    }

    if (filters.from) {
      params.push(filters.from);
      where.push(`i.published_at >= $${params.length}::timestamptz`);
    }

    if (filters.to) {
      params.push(filters.to);
      where.push(`i.published_at <= $${params.length}::timestamptz`);
    }

    if (filters.query) {
      params.push(filters.query);
      where.push(
        `to_tsvector('english', coalesce(i.title, '') || ' ' || coalesce(i.excerpt, '') || ' ' || coalesce(i.body_text, '') || ' ' || coalesce(i.source_title, ''))
         @@ websearch_to_tsquery('english', $${params.length})`,
      );
    }

    if (cursor) {
      params.push(cursor.publishedAt, cursor.id);
      where.push(`(i.published_at, i.id) < ($${params.length - 1}::timestamptz, $${params.length}::uuid)`);
    }

    params.push((filters.limit ?? 30) + 1);

    const result = await this.pool.query<Record<string, unknown>>(
      `SELECT i.id, i.published_at, COUNT(*) OVER() AS total_count
       FROM items i
       ${joins.join("\n")}
       WHERE ${where.join(" AND ")}
       ORDER BY i.published_at DESC, i.id DESC
       LIMIT $${params.length}`,
      params,
    );

    const rows = result.rows;
    const hasMore = rows.length > (filters.limit ?? 30);
    const pageRows = hasMore ? rows.slice(0, filters.limit ?? 30) : rows;

    return {
      ids: pageRows.map((row) => String(row.id)),
      total: Number(pageRows[0]?.total_count ?? 0),
      nextCursor:
        hasMore && pageRows.length
          ? feedCursorFromItem({
              id: String(pageRows[pageRows.length - 1]!.id),
              publishedAt: new Date(String(pageRows[pageRows.length - 1]!.published_at)).toISOString(),
            })
          : null,
    };
  }

  private async getItemsByIds(userId: string, ids: string[]): Promise<FeedItem[]> {
    if (!ids.length) {
      return [];
    }

    const result = await this.pool.query<Record<string, unknown>>(
      `SELECT
         i.*,
         COALESCE(
           json_agg(
             DISTINCT jsonb_build_object(
               'id', ma.id,
               'kind', ma.kind,
               'remoteUrl', ma.remote_url,
               'localPath', ma.local_path,
               'mimeType', ma.mime_type,
               'status', ma.status,
               'bytes', ma.bytes,
               'cachedAt', ma.cached_at
             )
           ) FILTER (WHERE ma.id IS NOT NULL),
           '[]'::json
         ) AS media_assets,
         COALESCE(st.is_read, FALSE) AS is_read,
         COALESCE(st.is_saved, FALSE) AS is_saved,
         COALESCE(st.is_hidden, FALSE) AS is_hidden,
         st.saved_at,
         st.read_at,
         pp.progress_seconds,
         pp.duration_seconds,
         pp.completed,
         pp.updated_at AS playback_updated_at,
         COALESCE(array_agg(DISTINCT wm.match_reason) FILTER (WHERE wm.id IS NOT NULL), ARRAY[]::text[]) AS match_reasons
       FROM items i
       LEFT JOIN media_assets ma ON ma.item_id = i.id
       LEFT JOIN item_states st ON st.item_id = i.id AND st.user_id = $2
       LEFT JOIN playback_progress pp ON pp.item_id = i.id AND pp.user_id = $2
       LEFT JOIN watchlists w ON w.user_id = $2
       LEFT JOIN watchlist_matches wm ON wm.item_id = i.id AND wm.watchlist_id = w.id
       WHERE i.id = ANY($1::uuid[])
       GROUP BY i.id, st.id, pp.id`,
      [ids, userId],
    );

    const itemsById = new Map(result.rows.map((row) => [String(row.id), toFeedItem(row, this.apiOrigin)]));
    return ids.map((id) => itemsById.get(id)).filter((item): item is FeedItem => Boolean(item));
  }

  async listFeed(userId: string, filters: FeedFilter): Promise<FeedPage> {
    const { ids, total, nextCursor } = await this.listFeedItemIds(userId, filters);
    const items = await this.getItemsByIds(userId, ids);
    return {
      items,
      nextCursor,
      total,
    };
  }

  async getItemById(userId: string, itemId: string) {
    const items = await this.getItemsByIds(userId, [itemId]);
    return items[0] ?? null;
  }

  async upsertItemState(userId: string, itemId: string, patch: { isRead?: boolean; isSaved?: boolean; isHidden?: boolean }) {
    const current = await this.pool.query<Record<string, unknown>>(
      "SELECT * FROM item_states WHERE user_id = $1 AND item_id = $2",
      [userId, itemId],
    );

    const previous = current.rows[0] ?? {};
    const next = {
      isRead: patch.isRead ?? Boolean(previous.is_read),
      isSaved: patch.isSaved ?? Boolean(previous.is_saved),
      isHidden: patch.isHidden ?? Boolean(previous.is_hidden),
    };

    await this.pool.query(
      `INSERT INTO item_states (user_id, item_id, is_read, is_saved, is_hidden, read_at, saved_at, updated_at)
       VALUES (
         $1,
         $2,
         $3,
         $4,
         $5,
         CASE WHEN $3 THEN NOW() ELSE NULL END,
         CASE WHEN $4 THEN NOW() ELSE NULL END,
         NOW()
       )
       ON CONFLICT (item_id, user_id)
       DO UPDATE SET
         is_read = EXCLUDED.is_read,
         is_saved = EXCLUDED.is_saved,
         is_hidden = EXCLUDED.is_hidden,
         read_at = CASE WHEN EXCLUDED.is_read THEN COALESCE(item_states.read_at, NOW()) ELSE NULL END,
         saved_at = CASE WHEN EXCLUDED.is_saved THEN COALESCE(item_states.saved_at, NOW()) ELSE NULL END,
         updated_at = NOW()`,
      [userId, itemId, next.isRead, next.isSaved, next.isHidden],
    );

    return this.getItemById(userId, itemId);
  }

  async updatePlayback(userId: string, itemId: string, progressSeconds: number, durationSeconds: number | null, completed: boolean) {
    await this.pool.query(
      `INSERT INTO playback_progress (user_id, item_id, progress_seconds, duration_seconds, completed, updated_at)
       VALUES ($1, $2, $3, $4, $5, NOW())
       ON CONFLICT (item_id, user_id)
       DO UPDATE SET
         progress_seconds = EXCLUDED.progress_seconds,
         duration_seconds = EXCLUDED.duration_seconds,
         completed = EXCLUDED.completed,
         updated_at = NOW()`,
      [userId, itemId, progressSeconds, durationSeconds, completed],
    );

    return this.getItemById(userId, itemId);
  }

  async listWatchlists(userId: string) {
    const result = await this.pool.query<Record<string, unknown>>(
      `SELECT
         w.*,
         COALESCE(
           json_agg(
             DISTINCT jsonb_build_object(
               'id', wr.id,
               'watchlist_id', wr.watchlist_id,
               'rule_type', wr.rule_type,
               'pattern', wr.pattern,
               'case_sensitive', wr.case_sensitive
             )
           ) FILTER (WHERE wr.id IS NOT NULL),
           '[]'::json
         ) AS rules
       FROM watchlists w
       LEFT JOIN watchlist_rules wr ON wr.watchlist_id = w.id
       WHERE w.user_id = $1
       GROUP BY w.id
       ORDER BY w.created_at ASC`,
      [userId],
    );

    return result.rows.map((row) => toWatchlist(row));
  }

  async createWatchlist(userId: string, input: CreateWatchlistInput) {
    const result = await this.pool.query(
      `INSERT INTO watchlists (user_id, name, description, color)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [userId, input.name, input.description ?? null, input.color ?? null],
    );

    return toWatchlist({
      ...result.rows[0],
      rules: [],
    });
  }

  async createWatchlistRule(userId: string, watchlistId: string, input: CreateWatchlistRuleInput) {
    const ownership = await this.pool.query("SELECT id FROM watchlists WHERE id = $1 AND user_id = $2", [watchlistId, userId]);
    if (!ownership.rowCount) {
      return null;
    }

    const result = await this.pool.query(
      `INSERT INTO watchlist_rules (watchlist_id, rule_type, pattern, case_sensitive)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [watchlistId, input.ruleType, input.pattern, input.caseSensitive],
    );

    return toWatchlistRule(result.rows[0]!);
  }

  async listWatchlistMatches(userId: string, watchlistId: string): Promise<WatchlistMatch[]> {
    const matchRows = await this.pool.query<Record<string, unknown>>(
      `SELECT wm.id, wm.watchlist_id, wm.match_reason, wm.cluster_key, wm.cluster_label, wm.first_seen_at, wm.item_id
       FROM watchlist_matches wm
       JOIN watchlists w ON w.id = wm.watchlist_id
       WHERE w.user_id = $1
         AND w.id = $2
       ORDER BY wm.first_seen_at DESC
       LIMIT 100`,
      [userId, watchlistId],
    );

    const items = await this.getItemsByIds(
      userId,
      matchRows.rows.map((row) => String(row.item_id)),
    );
    const itemById = new Map(items.map((item) => [item.id, item]));

    return matchRows.rows
      .map((row) => {
        const item = itemById.get(String(row.item_id));
        if (!item) {
          return null;
        }

        return {
          id: String(row.id),
          watchlistId: String(row.watchlist_id),
          item,
          matchReason: String(row.match_reason),
          clusterKey: String(row.cluster_key),
          clusterLabel: String(row.cluster_label),
          firstSeenAt: new Date(String(row.first_seen_at)).toISOString(),
        } satisfies WatchlistMatch;
      })
      .filter((match): match is WatchlistMatch => Boolean(match));
  }

  async listAlertIncidents(userId: string): Promise<AlertIncident[]> {
    const result = await this.pool.query<Record<string, unknown>>(
      `SELECT
         wm.cluster_key,
         wm.cluster_label,
         w.id AS watchlist_id,
         w.name AS watchlist_name,
         MIN(wm.first_seen_at) AS first_seen_at,
         MAX(i.published_at) AS latest_seen_at,
         ARRAY_AGG(DISTINCT i.source_title) AS corroborating_sources,
         ARRAY_AGG(i.id ORDER BY i.published_at DESC) AS item_ids
       FROM watchlist_matches wm
       JOIN watchlists w ON w.id = wm.watchlist_id
       JOIN items i ON i.id = wm.item_id
       WHERE w.user_id = $1
       GROUP BY wm.cluster_key, wm.cluster_label, w.id, w.name
       ORDER BY MAX(i.published_at) DESC
       LIMIT 30`,
      [userId],
    );

    const allIds = result.rows.flatMap((row) => ((row.item_ids as string[] | null) ?? []).slice(0, 6));
    const items = await this.getItemsByIds(userId, allIds);
    const itemsById = new Map(items.map((item) => [item.id, item]));

    return result.rows.map((row) => ({
      clusterKey: String(row.cluster_key),
      clusterLabel: String(row.cluster_label),
      watchlistId: String(row.watchlist_id),
      watchlistName: String(row.watchlist_name),
      firstSeenAt: new Date(String(row.first_seen_at)).toISOString(),
      latestSeenAt: new Date(String(row.latest_seen_at)).toISOString(),
      corroboratingSources: Array.isArray(row.corroborating_sources) ? (row.corroborating_sources as string[]) : [],
      items: (((row.item_ids as string[] | null) ?? []).slice(0, 6).map((id) => itemsById.get(id)).filter(Boolean) as FeedItem[]),
    }));
  }

  async createSummaryRequest(userId: string, itemId: string | null, watchlistId: string | null, providerId: string | null, promptStyle: string) {
    const result = await this.pool.query<DbSummaryRow>(
      `INSERT INTO summaries (user_id, item_id, watchlist_id, provider_id, prompt_style, status)
       VALUES ($1, $2, $3, $4, $5, 'pending')
       RETURNING
         id,
         item_id,
         watchlist_id,
         user_id,
         provider_id,
         NULL::text AS provider_label,
         status,
         prompt_style,
         summary_text,
         model,
         created_at,
         error`,
      [userId, itemId, watchlistId, providerId, promptStyle],
    );

    return toSummary(result.rows[0]!);
  }

  async listSummaries(userId: string) {
    const result = await this.pool.query<DbSummaryRow>(
      `SELECT
         s.id,
         s.item_id,
         s.watchlist_id,
         s.user_id,
         s.provider_id,
         p.label AS provider_label,
         s.status,
         s.prompt_style,
         s.summary_text,
         s.model,
         s.created_at,
         s.error
       FROM summaries s
       LEFT JOIN ai_providers p ON p.id = s.provider_id
       WHERE s.user_id = $1
       ORDER BY s.created_at DESC
       LIMIT 50`,
      [userId],
    );

    return result.rows.map(toSummary);
  }

  async getSummaryById(summaryId: string) {
    const result = await this.pool.query<DbSummaryRow>(
      `SELECT
         s.id,
         s.item_id,
         s.watchlist_id,
         s.user_id,
         s.provider_id,
         p.label AS provider_label,
         s.status,
         s.prompt_style,
         s.summary_text,
         s.model,
         s.created_at,
         s.error
       FROM summaries s
       LEFT JOIN ai_providers p ON p.id = s.provider_id
       WHERE s.id = $1`,
      [summaryId],
    );

    return result.rows[0] ? toSummary(result.rows[0]) : null;
  }

  async completeSummary(summaryId: string, summaryText: string, model: string | null) {
    await this.pool.query(
      `UPDATE summaries
       SET status = 'completed',
           summary_text = $2,
           model = $3,
           error = NULL
       WHERE id = $1`,
      [summaryId, summaryText, model],
    );
  }

  async failSummary(summaryId: string, error: string) {
    await this.pool.query(
      `UPDATE summaries
       SET status = 'failed',
           error = $2
       WHERE id = $1`,
      [summaryId, error],
    );
  }

  async getMediaAssetById(assetId: string) {
    const result = await this.pool.query<Record<string, unknown>>(
      "SELECT * FROM media_assets WHERE id = $1",
      [assetId],
    );

    return result.rows[0] ?? null;
  }

  async listDueSources() {
    const enabledModules = await this.listEnabledModules();
    const result = await this.pool.query<Record<string, unknown>>(
      `SELECT
         s.*,
         sh.source_id AS health_source_id,
         sh.consecutive_failures,
         sh.last_success_at,
         sh.last_error_at,
         sh.last_error,
         sh.next_retry_at,
         sh.average_latency_ms
       FROM sources s
       LEFT JOIN source_health sh ON sh.source_id = s.id
       WHERE s.active = TRUE
         AND s.module = ANY($1::text[])
         AND (
           sh.next_retry_at IS NULL OR sh.next_retry_at <= NOW()
         )
         AND (
           s.last_polled_at IS NULL OR s.last_polled_at <= NOW() - make_interval(mins => s.polling_minutes)
         )
       ORDER BY s.last_polled_at NULLS FIRST, s.created_at ASC`,
      [enabledModules],
    );

    return result.rows.map((row) => toSource(row));
  }

  async createIngestionRun(sourceId: string) {
    const result = await this.pool.query<Record<string, unknown>>(
      `INSERT INTO ingestion_runs (source_id, status)
       VALUES ($1, 'running')
       RETURNING id`,
      [sourceId],
    );

    return String(result.rows[0]!.id);
  }

  async finishIngestionRun(runId: string, status: "completed" | "failed", stats: { itemCount: number; newItemCount: number; cachedMediaCount: number; latencyMs: number | null; error?: string | null }) {
    await this.pool.query(
      `UPDATE ingestion_runs
       SET status = $2,
           finished_at = NOW(),
           item_count = $3,
           new_item_count = $4,
           cached_media_count = $5,
           latency_ms = $6,
           error = $7
       WHERE id = $1`,
      [runId, status, stats.itemCount, stats.newItemCount, stats.cachedMediaCount, stats.latencyMs, stats.error ?? null],
    );
  }

  async noteSourcePollSuccess(sourceId: string, latencyMs: number | null) {
    await this.pool.query(
      `INSERT INTO source_health (source_id, consecutive_failures, last_success_at, next_retry_at, average_latency_ms, updated_at)
       VALUES ($1, 0, NOW(), NULL, $2, NOW())
       ON CONFLICT (source_id)
       DO UPDATE SET
         consecutive_failures = 0,
         last_success_at = NOW(),
         next_retry_at = NULL,
         average_latency_ms = COALESCE($2, source_health.average_latency_ms),
         updated_at = NOW()`,
      [sourceId, latencyMs],
    );

    await this.pool.query("UPDATE sources SET last_polled_at = NOW(), updated_at = NOW() WHERE id = $1", [sourceId]);
  }

  async noteSourcePollFailure(sourceId: string, error: string) {
    await this.pool.query(
      `INSERT INTO source_health (source_id, consecutive_failures, last_error_at, last_error, next_retry_at, updated_at)
       VALUES ($1, 1, NOW(), $2, NOW() + INTERVAL '5 minutes', NOW())
       ON CONFLICT (source_id)
       DO UPDATE SET
         consecutive_failures = source_health.consecutive_failures + 1,
         last_error_at = NOW(),
         last_error = EXCLUDED.last_error,
         next_retry_at = NOW() + make_interval(mins => LEAST(60, GREATEST(5, (source_health.consecutive_failures + 1) * 5))),
         updated_at = NOW()`,
      [sourceId, error],
    );

    await this.pool.query("UPDATE sources SET last_polled_at = NOW(), updated_at = NOW() WHERE id = $1", [sourceId]);
  }

  async upsertIngestedItem(
    source: Pick<Source, "id" | "title">,
    item: {
      externalId: string;
      canonicalUrl: string | null;
      title: string;
      excerpt: string | null;
      bodyText: string | null;
      authorName: string | null;
      publishedAt: string;
      module: FeedItem["module"];
      itemType: FeedItem["itemType"];
      tags: string[];
      siteUrl: string | null;
      imageUrl: string | null;
      audioUrl: string | null;
      videoUrl: string | null;
      embedUrl: string | null;
      videoId: string | null;
      rawPayload: Record<string, unknown>;
      mediaAssets: Array<Pick<MediaAsset, "kind" | "remoteUrl" | "mimeType">>;
    },
  ) {
    const existing = await this.pool.query<Record<string, unknown>>(
      "SELECT id FROM items WHERE source_id = $1 AND external_id = $2",
      [source.id, item.externalId],
    );

    let itemId: string;
    let inserted = false;
    if (!existing.rowCount) {
      const created = await this.pool.query<Record<string, unknown>>(
        `INSERT INTO items (
           source_id,
           external_id,
           source_title,
           canonical_url,
           title,
           excerpt,
           body_text,
           author_name,
           published_at,
           module,
           item_type,
           tags,
           site_url,
           image_url,
           audio_url,
           video_url,
           embed_url,
           video_id,
           raw_payload
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12::text[], $13, $14, $15, $16, $17, $18, $19::jsonb)
         RETURNING id`,
        [
          source.id,
          item.externalId,
          source.title,
          item.canonicalUrl,
          item.title,
          item.excerpt,
          item.bodyText,
          item.authorName,
          item.publishedAt,
          item.module,
          item.itemType,
          item.tags,
          item.siteUrl,
          item.imageUrl,
          item.audioUrl,
          item.videoUrl,
          item.embedUrl,
          item.videoId,
          JSON.stringify(item.rawPayload ?? {}),
        ],
      );
      itemId = String(created.rows[0]!.id);
      inserted = true;
    } else {
      itemId = String(existing.rows[0]!.id);
      await this.pool.query(
        `UPDATE items
         SET canonical_url = $2,
             title = $3,
             excerpt = $4,
             body_text = $5,
             author_name = $6,
             published_at = $7,
             module = $8,
             item_type = $9,
             tags = $10::text[],
             site_url = $11,
             image_url = $12,
             audio_url = $13,
             video_url = $14,
             embed_url = $15,
             video_id = $16,
             raw_payload = $17::jsonb
         WHERE id = $1`,
        [
          itemId,
          item.canonicalUrl,
          item.title,
          item.excerpt,
          item.bodyText,
          item.authorName,
          item.publishedAt,
          item.module,
          item.itemType,
          item.tags,
          item.siteUrl,
          item.imageUrl,
          item.audioUrl,
          item.videoUrl,
          item.embedUrl,
          item.videoId,
          JSON.stringify(item.rawPayload ?? {}),
        ],
      );
    }

    for (const asset of item.mediaAssets) {
      await this.pool.query(
        `INSERT INTO media_assets (item_id, kind, remote_url, mime_type, status)
         VALUES ($1, $2, $3, $4, 'remote')
         ON CONFLICT (item_id, kind, remote_url)
         DO UPDATE SET mime_type = EXCLUDED.mime_type`,
        [itemId, asset.kind, asset.remoteUrl, asset.mimeType],
      );
    }

    return { itemId, inserted };
  }

  async hasFollowersForSource(sourceId: string) {
    const result = await this.pool.query("SELECT 1 FROM user_follows WHERE source_id = $1 LIMIT 1", [sourceId]);
    return (result.rowCount ?? 0) > 0;
  }

  async listActiveWatchlistsWithRules() {
    const result = await this.pool.query<Record<string, unknown>>(
      `SELECT
         w.*,
         COALESCE(
           json_agg(
             DISTINCT jsonb_build_object(
               'id', wr.id,
               'watchlist_id', wr.watchlist_id,
               'rule_type', wr.rule_type,
               'pattern', wr.pattern,
               'case_sensitive', wr.case_sensitive
             )
           ) FILTER (WHERE wr.id IS NOT NULL),
           '[]'::json
         ) AS rules
       FROM watchlists w
       LEFT JOIN watchlist_rules wr ON wr.watchlist_id = w.id
       WHERE w.active = TRUE
       GROUP BY w.id`,
    );

    return result.rows.map((row) => toWatchlist(row));
  }

  async createWatchlistMatch(watchlistId: string, itemId: string, matchReason: string, clusterKey: string, clusterLabel: string) {
    const result = await this.pool.query<Record<string, unknown>>(
      `INSERT INTO watchlist_matches (watchlist_id, item_id, match_reason, cluster_key, cluster_label)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (watchlist_id, item_id) DO NOTHING
       RETURNING id`,
      [watchlistId, itemId, matchReason, clusterKey, clusterLabel],
    );

    return (result.rowCount ?? 0) > 0;
  }

  async getTotalCachedBytes() {
    const result = await this.pool.query("SELECT COALESCE(SUM(bytes), 0)::bigint AS total FROM media_assets WHERE status = 'cached'");
    return Number(result.rows[0]?.total ?? 0);
  }

  async listCacheEvictionCandidates(limit = 20) {
    const result = await this.pool.query<Record<string, unknown>>(
      `SELECT ma.id, ma.local_path
       FROM media_assets ma
       JOIN items i ON i.id = ma.item_id
       LEFT JOIN item_states st ON st.item_id = i.id AND st.is_saved = TRUE
       WHERE ma.status = 'cached'
         AND ma.local_path IS NOT NULL
         AND st.id IS NULL
       ORDER BY ma.cached_at ASC NULLS FIRST
       LIMIT $1`,
      [limit],
    );

    return result.rows.map((row) => ({
      id: String(row.id),
      localPath: row.local_path ? String(row.local_path) : null,
    }));
  }

  async markMediaAssetCached(assetId: string, localPath: string, bytes: number, mimeType: string | null) {
    await this.pool.query(
      `UPDATE media_assets
       SET local_path = $2,
           bytes = $3,
           mime_type = COALESCE($4, mime_type),
           status = 'cached',
           cached_at = NOW(),
           error = NULL
       WHERE id = $1`,
      [assetId, localPath, bytes, mimeType],
    );
  }

  async markMediaAssetFailed(assetId: string, error: string) {
    await this.pool.query(
      `UPDATE media_assets
       SET status = 'failed',
           error = $2
       WHERE id = $1`,
      [assetId, error],
    );
  }

  async clearMediaAssetCache(assetId: string) {
    await this.pool.query(
      `UPDATE media_assets
       SET local_path = NULL,
           bytes = NULL,
           cached_at = NULL,
           status = 'remote',
           error = NULL
       WHERE id = $1`,
      [assetId],
    );
  }

  async findCacheableAudioAssetsForSource(sourceId: string) {
    const result = await this.pool.query<Record<string, unknown>>(
      `SELECT ma.*
       FROM media_assets ma
       JOIN items i ON i.id = ma.item_id
       WHERE i.source_id = $1
         AND ma.kind = 'audio'
         AND ma.status = 'remote'
       ORDER BY i.published_at DESC
       LIMIT 10`,
      [sourceId],
    );

    return result.rows;
  }

  async getHealthSnapshot(appVersion: string, pendingJobs: number): Promise<HealthSnapshot> {
    const enabledModules = await this.listEnabledModules();
    const [dbCheck, failingSources, recentRuns] = await Promise.all([
      this.pool.query("SELECT 1"),
      this.pool.query("SELECT COUNT(*)::int AS count FROM source_health WHERE consecutive_failures > 0"),
      this.pool.query("SELECT COUNT(*)::int AS count FROM ingestion_runs WHERE started_at > NOW() - INTERVAL '6 hours'"),
    ]);

    return {
      status: Number(failingSources.rows[0]?.count ?? 0) > 0 ? "degraded" : "ok",
      appVersion,
      now: new Date().toISOString(),
      enabledModules,
      database: dbCheck.rowCount === 1,
      redis: pendingJobs >= 0,
      ingestion: {
        recentRuns: Number(recentRuns.rows[0]?.count ?? 0),
        failingSources: Number(failingSources.rows[0]?.count ?? 0),
        pendingJobs,
      },
    };
  }
}
