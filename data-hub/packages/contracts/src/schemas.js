import { z } from "zod";
export const UserRoleSchema = z.enum(["admin", "member"]);
export const AppModuleSchema = z.enum(["inbox", "news", "channels", "podcasts", "saved"]);
export const SourceTypeSchema = z.enum(["rss", "youtube", "podcast", "adapter"]);
export const SourceTierSchema = z.enum(["breaking", "verified", "standard"]);
export const WatchlistRuleTypeSchema = z.enum(["keyword", "phrase", "source", "tag"]);
export const SummaryProviderTypeSchema = z.enum(["ollama", "openai", "anthropic", "custom"]);
export const ActivityEventTypeSchema = z.enum([
    "ingestion",
    "item.created",
    "watchlist.match",
    "summary.completed",
    "summary.failed",
    "cache.completed",
    "cache.failed",
]);
export const PaginationSchema = z.object({
    limit: z.number().int().min(1).max(100).default(30),
    cursor: z.string().nullish(),
});
export const SessionUserSchema = z.object({
    id: z.string().uuid(),
    email: z.string().email(),
    displayName: z.string().min(1),
    role: UserRoleSchema,
});
export const SessionSchema = z.object({
    user: SessionUserSchema,
    scopes: z.array(z.string()).default([]),
    authenticatedAt: z.string(),
});
export const SourceGroupSchema = z.object({
    id: z.string().uuid(),
    name: z.string(),
    slug: z.string(),
    description: z.string().nullable(),
    module: AppModuleSchema,
    sortOrder: z.number().int(),
    active: z.boolean(),
    createdAt: z.string(),
    updatedAt: z.string(),
});
export const SourceHealthSchema = z.object({
    sourceId: z.string().uuid(),
    consecutiveFailures: z.number().int(),
    lastSuccessAt: z.string().nullable(),
    lastErrorAt: z.string().nullable(),
    lastError: z.string().nullable(),
    nextRetryAt: z.string().nullable(),
    averageLatencyMs: z.number().int().nullable(),
});
export const SourceSchema = z.object({
    id: z.string().uuid(),
    title: z.string(),
    description: z.string().nullable(),
    module: AppModuleSchema,
    sourceType: SourceTypeSchema,
    sourceTier: SourceTierSchema,
    adapterKey: z.string(),
    feedUrl: z.string().url(),
    siteUrl: z.string().url().nullable(),
    imageUrl: z.string().url().nullable(),
    language: z.string().nullable(),
    active: z.boolean(),
    pollingMinutes: z.number().int().min(1),
    createdAt: z.string(),
    updatedAt: z.string(),
    group: SourceGroupSchema.nullable(),
    health: SourceHealthSchema.nullable(),
    metadata: z.record(z.string(), z.unknown()).default({}),
    isFollowing: z.boolean().default(false),
    followFolder: z.string().nullable().default(null),
});
export const MediaAssetSchema = z.object({
    id: z.string().uuid(),
    kind: z.enum(["thumbnail", "image", "audio", "video"]),
    remoteUrl: z.string().url(),
    localUrl: z.string().nullable(),
    mimeType: z.string().nullable(),
    status: z.enum(["remote", "cached", "failed"]),
    bytes: z.number().int().nullable(),
    cachedAt: z.string().nullable(),
});
export const FeedItemStateSchema = z.object({
    isRead: z.boolean(),
    isSaved: z.boolean(),
    isHidden: z.boolean(),
    savedAt: z.string().nullable(),
    readAt: z.string().nullable(),
});
export const PlaybackProgressSchema = z.object({
    progressSeconds: z.number().min(0),
    durationSeconds: z.number().min(0).nullable(),
    completed: z.boolean(),
    updatedAt: z.string(),
});
export const FeedItemSchema = z.object({
    id: z.string().uuid(),
    sourceId: z.string().uuid(),
    sourceTitle: z.string(),
    title: z.string(),
    canonicalUrl: z.string().url().nullable(),
    excerpt: z.string().nullable(),
    bodyText: z.string().nullable(),
    authorName: z.string().nullable(),
    publishedAt: z.string(),
    ingestedAt: z.string(),
    module: AppModuleSchema,
    itemType: z.enum(["article", "video", "podcast", "update"]),
    tags: z.array(z.string()),
    embedUrl: z.string().url().nullable(),
    siteUrl: z.string().url().nullable(),
    imageUrl: z.string().url().nullable(),
    audioUrl: z.string().url().nullable(),
    videoUrl: z.string().url().nullable(),
    videoId: z.string().nullable(),
    mediaAssets: z.array(MediaAssetSchema),
    state: FeedItemStateSchema,
    playback: PlaybackProgressSchema.nullable(),
    matchReasons: z.array(z.string()).default([]),
    rawPayload: z.record(z.string(), z.unknown()).default({}),
});
export const FeedPageSchema = z.object({
    items: z.array(FeedItemSchema),
    nextCursor: z.string().nullable(),
    total: z.number().int(),
});
export const WatchlistRuleSchema = z.object({
    id: z.string().uuid(),
    watchlistId: z.string().uuid(),
    ruleType: WatchlistRuleTypeSchema,
    pattern: z.string().min(1),
    caseSensitive: z.boolean(),
});
export const WatchlistSchema = z.object({
    id: z.string().uuid(),
    userId: z.string().uuid(),
    name: z.string(),
    description: z.string().nullable(),
    color: z.string().nullable(),
    active: z.boolean(),
    createdAt: z.string(),
    updatedAt: z.string(),
    rules: z.array(WatchlistRuleSchema).default([]),
});
export const WatchlistMatchSchema = z.object({
    id: z.string().uuid(),
    watchlistId: z.string().uuid(),
    item: FeedItemSchema,
    matchReason: z.string(),
    clusterKey: z.string(),
    clusterLabel: z.string(),
    firstSeenAt: z.string(),
});
export const AlertIncidentSchema = z.object({
    clusterKey: z.string(),
    clusterLabel: z.string(),
    watchlistId: z.string().uuid(),
    watchlistName: z.string(),
    firstSeenAt: z.string(),
    latestSeenAt: z.string(),
    corroboratingSources: z.array(z.string()),
    items: z.array(FeedItemSchema),
});
export const SummaryProviderSchema = z.object({
    id: z.string().uuid(),
    label: z.string(),
    providerType: SummaryProviderTypeSchema,
    baseUrl: z.string().nullable(),
    apiKeyEnv: z.string().nullable(),
    model: z.string(),
    active: z.boolean(),
    metadata: z.record(z.string(), z.unknown()).default({}),
    createdAt: z.string(),
    updatedAt: z.string(),
});
export const SummarySchema = z.object({
    id: z.string().uuid(),
    itemId: z.string().uuid().nullable(),
    watchlistId: z.string().uuid().nullable(),
    userId: z.string().uuid(),
    providerId: z.string().uuid().nullable(),
    providerLabel: z.string().nullable(),
    status: z.enum(["pending", "completed", "failed"]),
    promptStyle: z.string(),
    summaryText: z.string().nullable(),
    model: z.string().nullable(),
    createdAt: z.string(),
    error: z.string().nullable(),
});
export const AgentTokenSchema = z.object({
    id: z.string().uuid(),
    label: z.string(),
    scopes: z.array(z.string()),
    lastUsedAt: z.string().nullable(),
    createdAt: z.string(),
});
export const ActivityEventSchema = z.object({
    id: z.string().uuid(),
    eventType: ActivityEventTypeSchema,
    createdAt: z.string(),
    payload: z.record(z.string(), z.unknown()),
});
export const HealthSnapshotSchema = z.object({
    status: z.enum(["ok", "degraded"]),
    appVersion: z.string(),
    now: z.string(),
    enabledModules: z.array(AppModuleSchema),
    database: z.boolean(),
    redis: z.boolean(),
    ingestion: z.object({
        recentRuns: z.number().int(),
        failingSources: z.number().int(),
        pendingJobs: z.number().int(),
    }),
});
export const CreateSourceInputSchema = z.object({
    title: z.string().min(1),
    description: z.string().nullish(),
    module: AppModuleSchema,
    sourceType: SourceTypeSchema,
    sourceTier: SourceTierSchema.default("standard"),
    adapterKey: z.string().min(1),
    feedUrl: z.string().url(),
    siteUrl: z.string().url().nullish(),
    imageUrl: z.string().url().nullish(),
    language: z.string().nullish(),
    pollingMinutes: z.number().int().min(1).max(120),
    sourceGroupId: z.string().uuid().nullish(),
    metadata: z.record(z.string(), z.unknown()).default({}),
});
export const DiscoverSourceInputSchema = z.object({
    sourceType: SourceTypeSchema,
    adapterKey: z.string().min(1),
    url: z.string().url(),
    module: AppModuleSchema.optional(),
});
export const CreateSourceGroupInputSchema = z.object({
    name: z.string().min(1),
    description: z.string().nullish(),
    module: AppModuleSchema,
    sortOrder: z.number().int().min(0).default(0),
});
export const FollowSourceInputSchema = z.object({
    folder: z.string().min(1).max(80).default("Following"),
});
export const UpsertItemStateInputSchema = z.object({
    isRead: z.boolean().optional(),
    isSaved: z.boolean().optional(),
    isHidden: z.boolean().optional(),
});
export const UpdatePlaybackInputSchema = z.object({
    progressSeconds: z.number().min(0),
    durationSeconds: z.number().min(0).nullish(),
    completed: z.boolean().default(false),
});
export const CreateWatchlistInputSchema = z.object({
    name: z.string().min(1),
    description: z.string().nullish(),
    color: z.string().nullish(),
});
export const CreateWatchlistRuleInputSchema = z.object({
    ruleType: WatchlistRuleTypeSchema,
    pattern: z.string().min(1),
    caseSensitive: z.boolean().default(false),
});
export const CreateSummaryProviderInputSchema = z.object({
    label: z.string().min(1),
    providerType: SummaryProviderTypeSchema,
    baseUrl: z.string().url().nullish(),
    apiKeyEnv: z.string().nullish(),
    model: z.string().min(1),
    metadata: z.record(z.string(), z.unknown()).default({}),
});
export const SummaryRequestSchema = z.object({
    itemId: z.string().uuid().nullish(),
    watchlistId: z.string().uuid().nullish(),
    providerId: z.string().uuid().nullish(),
    promptStyle: z.string().default("brief"),
}).refine((value) => Boolean(value.itemId || value.watchlistId), {
    message: "Either itemId or watchlistId is required.",
});
export const LoginInputSchema = z.object({
    email: z.string().email(),
    password: z.string().min(8),
});
export const CreateUserInputSchema = z.object({
    email: z.string().email(),
    displayName: z.string().min(1),
    password: z.string().min(8),
    role: UserRoleSchema.default("member"),
});
export const CreateAgentTokenInputSchema = z.object({
    label: z.string().min(1),
});
export const FeedFilterSchema = z.object({
    module: AppModuleSchema.optional(),
    sourceId: z.string().uuid().optional(),
    sourceGroupId: z.string().uuid().optional(),
    unreadOnly: z.boolean().optional(),
    savedOnly: z.boolean().optional(),
    hidden: z.boolean().optional(),
    watchlistId: z.string().uuid().optional(),
    from: z.string().datetime().optional(),
    to: z.string().datetime().optional(),
    query: z.string().optional(),
    limit: z.number().int().min(1).max(100).default(30),
    cursor: z.string().optional(),
});
export const SearchResultSchema = z.object({
    items: z.array(FeedItemSchema),
    query: z.string(),
    total: z.number().int(),
});
export const SourceDiscoveryResultSchema = z.object({
    title: z.string(),
    description: z.string().nullable(),
    feedUrl: z.string().url(),
    siteUrl: z.string().url().nullable(),
    imageUrl: z.string().url().nullable(),
    module: AppModuleSchema,
    sourceType: SourceTypeSchema,
    adapterKey: z.string(),
    language: z.string().nullable(),
    metadata: z.record(z.string(), z.unknown()),
});
