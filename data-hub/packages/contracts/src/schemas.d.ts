import { z } from "zod";
export declare const UserRoleSchema: z.ZodEnum<{
    admin: "admin";
    member: "member";
}>;
export type UserRole = z.infer<typeof UserRoleSchema>;
export declare const AppModuleSchema: z.ZodEnum<{
    inbox: "inbox";
    news: "news";
    channels: "channels";
    podcasts: "podcasts";
    saved: "saved";
}>;
export type AppModule = z.infer<typeof AppModuleSchema>;
export declare const SourceTypeSchema: z.ZodEnum<{
    rss: "rss";
    youtube: "youtube";
    podcast: "podcast";
    adapter: "adapter";
}>;
export type SourceType = z.infer<typeof SourceTypeSchema>;
export declare const SourceTierSchema: z.ZodEnum<{
    breaking: "breaking";
    verified: "verified";
    standard: "standard";
}>;
export type SourceTier = z.infer<typeof SourceTierSchema>;
export declare const WatchlistRuleTypeSchema: z.ZodEnum<{
    keyword: "keyword";
    phrase: "phrase";
    source: "source";
    tag: "tag";
}>;
export type WatchlistRuleType = z.infer<typeof WatchlistRuleTypeSchema>;
export declare const SummaryProviderTypeSchema: z.ZodEnum<{
    ollama: "ollama";
    openai: "openai";
    anthropic: "anthropic";
    custom: "custom";
}>;
export type SummaryProviderType = z.infer<typeof SummaryProviderTypeSchema>;
export declare const ActivityEventTypeSchema: z.ZodEnum<{
    ingestion: "ingestion";
    "item.created": "item.created";
    "watchlist.match": "watchlist.match";
    "summary.completed": "summary.completed";
    "summary.failed": "summary.failed";
    "cache.completed": "cache.completed";
    "cache.failed": "cache.failed";
}>;
export type ActivityEventType = z.infer<typeof ActivityEventTypeSchema>;
export declare const PaginationSchema: z.ZodObject<{
    limit: z.ZodDefault<z.ZodNumber>;
    cursor: z.ZodOptional<z.ZodNullable<z.ZodString>>;
}, z.core.$strip>;
export type PaginationInput = z.infer<typeof PaginationSchema>;
export declare const SessionUserSchema: z.ZodObject<{
    id: z.ZodString;
    email: z.ZodString;
    displayName: z.ZodString;
    role: z.ZodEnum<{
        admin: "admin";
        member: "member";
    }>;
}, z.core.$strip>;
export type SessionUser = z.infer<typeof SessionUserSchema>;
export declare const SessionSchema: z.ZodObject<{
    user: z.ZodObject<{
        id: z.ZodString;
        email: z.ZodString;
        displayName: z.ZodString;
        role: z.ZodEnum<{
            admin: "admin";
            member: "member";
        }>;
    }, z.core.$strip>;
    scopes: z.ZodDefault<z.ZodArray<z.ZodString>>;
    authenticatedAt: z.ZodString;
}, z.core.$strip>;
export type Session = z.infer<typeof SessionSchema>;
export declare const SourceGroupSchema: z.ZodObject<{
    id: z.ZodString;
    name: z.ZodString;
    slug: z.ZodString;
    description: z.ZodNullable<z.ZodString>;
    module: z.ZodEnum<{
        inbox: "inbox";
        news: "news";
        channels: "channels";
        podcasts: "podcasts";
        saved: "saved";
    }>;
    sortOrder: z.ZodNumber;
    active: z.ZodBoolean;
    createdAt: z.ZodString;
    updatedAt: z.ZodString;
}, z.core.$strip>;
export type SourceGroup = z.infer<typeof SourceGroupSchema>;
export declare const SourceHealthSchema: z.ZodObject<{
    sourceId: z.ZodString;
    consecutiveFailures: z.ZodNumber;
    lastSuccessAt: z.ZodNullable<z.ZodString>;
    lastErrorAt: z.ZodNullable<z.ZodString>;
    lastError: z.ZodNullable<z.ZodString>;
    nextRetryAt: z.ZodNullable<z.ZodString>;
    averageLatencyMs: z.ZodNullable<z.ZodNumber>;
}, z.core.$strip>;
export type SourceHealth = z.infer<typeof SourceHealthSchema>;
export declare const SourceSchema: z.ZodObject<{
    id: z.ZodString;
    title: z.ZodString;
    description: z.ZodNullable<z.ZodString>;
    module: z.ZodEnum<{
        inbox: "inbox";
        news: "news";
        channels: "channels";
        podcasts: "podcasts";
        saved: "saved";
    }>;
    sourceType: z.ZodEnum<{
        rss: "rss";
        youtube: "youtube";
        podcast: "podcast";
        adapter: "adapter";
    }>;
    sourceTier: z.ZodEnum<{
        breaking: "breaking";
        verified: "verified";
        standard: "standard";
    }>;
    adapterKey: z.ZodString;
    feedUrl: z.ZodString;
    siteUrl: z.ZodNullable<z.ZodString>;
    imageUrl: z.ZodNullable<z.ZodString>;
    language: z.ZodNullable<z.ZodString>;
    active: z.ZodBoolean;
    pollingMinutes: z.ZodNumber;
    createdAt: z.ZodString;
    updatedAt: z.ZodString;
    group: z.ZodNullable<z.ZodObject<{
        id: z.ZodString;
        name: z.ZodString;
        slug: z.ZodString;
        description: z.ZodNullable<z.ZodString>;
        module: z.ZodEnum<{
            inbox: "inbox";
            news: "news";
            channels: "channels";
            podcasts: "podcasts";
            saved: "saved";
        }>;
        sortOrder: z.ZodNumber;
        active: z.ZodBoolean;
        createdAt: z.ZodString;
        updatedAt: z.ZodString;
    }, z.core.$strip>>;
    health: z.ZodNullable<z.ZodObject<{
        sourceId: z.ZodString;
        consecutiveFailures: z.ZodNumber;
        lastSuccessAt: z.ZodNullable<z.ZodString>;
        lastErrorAt: z.ZodNullable<z.ZodString>;
        lastError: z.ZodNullable<z.ZodString>;
        nextRetryAt: z.ZodNullable<z.ZodString>;
        averageLatencyMs: z.ZodNullable<z.ZodNumber>;
    }, z.core.$strip>>;
    metadata: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    isFollowing: z.ZodDefault<z.ZodBoolean>;
    followFolder: z.ZodDefault<z.ZodNullable<z.ZodString>>;
}, z.core.$strip>;
export type Source = z.infer<typeof SourceSchema>;
export declare const MediaAssetSchema: z.ZodObject<{
    id: z.ZodString;
    kind: z.ZodEnum<{
        thumbnail: "thumbnail";
        image: "image";
        audio: "audio";
        video: "video";
    }>;
    remoteUrl: z.ZodString;
    localUrl: z.ZodNullable<z.ZodString>;
    mimeType: z.ZodNullable<z.ZodString>;
    status: z.ZodEnum<{
        remote: "remote";
        cached: "cached";
        failed: "failed";
    }>;
    bytes: z.ZodNullable<z.ZodNumber>;
    cachedAt: z.ZodNullable<z.ZodString>;
}, z.core.$strip>;
export type MediaAsset = z.infer<typeof MediaAssetSchema>;
export declare const FeedItemStateSchema: z.ZodObject<{
    isRead: z.ZodBoolean;
    isSaved: z.ZodBoolean;
    isHidden: z.ZodBoolean;
    savedAt: z.ZodNullable<z.ZodString>;
    readAt: z.ZodNullable<z.ZodString>;
}, z.core.$strip>;
export type FeedItemState = z.infer<typeof FeedItemStateSchema>;
export declare const PlaybackProgressSchema: z.ZodObject<{
    progressSeconds: z.ZodNumber;
    durationSeconds: z.ZodNullable<z.ZodNumber>;
    completed: z.ZodBoolean;
    updatedAt: z.ZodString;
}, z.core.$strip>;
export type PlaybackProgress = z.infer<typeof PlaybackProgressSchema>;
export declare const FeedItemSchema: z.ZodObject<{
    id: z.ZodString;
    sourceId: z.ZodString;
    sourceTitle: z.ZodString;
    title: z.ZodString;
    canonicalUrl: z.ZodNullable<z.ZodString>;
    excerpt: z.ZodNullable<z.ZodString>;
    bodyText: z.ZodNullable<z.ZodString>;
    authorName: z.ZodNullable<z.ZodString>;
    publishedAt: z.ZodString;
    ingestedAt: z.ZodString;
    module: z.ZodEnum<{
        inbox: "inbox";
        news: "news";
        channels: "channels";
        podcasts: "podcasts";
        saved: "saved";
    }>;
    itemType: z.ZodEnum<{
        podcast: "podcast";
        video: "video";
        article: "article";
        update: "update";
    }>;
    tags: z.ZodArray<z.ZodString>;
    embedUrl: z.ZodNullable<z.ZodString>;
    siteUrl: z.ZodNullable<z.ZodString>;
    imageUrl: z.ZodNullable<z.ZodString>;
    audioUrl: z.ZodNullable<z.ZodString>;
    videoUrl: z.ZodNullable<z.ZodString>;
    videoId: z.ZodNullable<z.ZodString>;
    mediaAssets: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        kind: z.ZodEnum<{
            thumbnail: "thumbnail";
            image: "image";
            audio: "audio";
            video: "video";
        }>;
        remoteUrl: z.ZodString;
        localUrl: z.ZodNullable<z.ZodString>;
        mimeType: z.ZodNullable<z.ZodString>;
        status: z.ZodEnum<{
            remote: "remote";
            cached: "cached";
            failed: "failed";
        }>;
        bytes: z.ZodNullable<z.ZodNumber>;
        cachedAt: z.ZodNullable<z.ZodString>;
    }, z.core.$strip>>;
    state: z.ZodObject<{
        isRead: z.ZodBoolean;
        isSaved: z.ZodBoolean;
        isHidden: z.ZodBoolean;
        savedAt: z.ZodNullable<z.ZodString>;
        readAt: z.ZodNullable<z.ZodString>;
    }, z.core.$strip>;
    playback: z.ZodNullable<z.ZodObject<{
        progressSeconds: z.ZodNumber;
        durationSeconds: z.ZodNullable<z.ZodNumber>;
        completed: z.ZodBoolean;
        updatedAt: z.ZodString;
    }, z.core.$strip>>;
    matchReasons: z.ZodDefault<z.ZodArray<z.ZodString>>;
    rawPayload: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
}, z.core.$strip>;
export type FeedItem = z.infer<typeof FeedItemSchema>;
export declare const FeedPageSchema: z.ZodObject<{
    items: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        sourceId: z.ZodString;
        sourceTitle: z.ZodString;
        title: z.ZodString;
        canonicalUrl: z.ZodNullable<z.ZodString>;
        excerpt: z.ZodNullable<z.ZodString>;
        bodyText: z.ZodNullable<z.ZodString>;
        authorName: z.ZodNullable<z.ZodString>;
        publishedAt: z.ZodString;
        ingestedAt: z.ZodString;
        module: z.ZodEnum<{
            inbox: "inbox";
            news: "news";
            channels: "channels";
            podcasts: "podcasts";
            saved: "saved";
        }>;
        itemType: z.ZodEnum<{
            podcast: "podcast";
            video: "video";
            article: "article";
            update: "update";
        }>;
        tags: z.ZodArray<z.ZodString>;
        embedUrl: z.ZodNullable<z.ZodString>;
        siteUrl: z.ZodNullable<z.ZodString>;
        imageUrl: z.ZodNullable<z.ZodString>;
        audioUrl: z.ZodNullable<z.ZodString>;
        videoUrl: z.ZodNullable<z.ZodString>;
        videoId: z.ZodNullable<z.ZodString>;
        mediaAssets: z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            kind: z.ZodEnum<{
                thumbnail: "thumbnail";
                image: "image";
                audio: "audio";
                video: "video";
            }>;
            remoteUrl: z.ZodString;
            localUrl: z.ZodNullable<z.ZodString>;
            mimeType: z.ZodNullable<z.ZodString>;
            status: z.ZodEnum<{
                remote: "remote";
                cached: "cached";
                failed: "failed";
            }>;
            bytes: z.ZodNullable<z.ZodNumber>;
            cachedAt: z.ZodNullable<z.ZodString>;
        }, z.core.$strip>>;
        state: z.ZodObject<{
            isRead: z.ZodBoolean;
            isSaved: z.ZodBoolean;
            isHidden: z.ZodBoolean;
            savedAt: z.ZodNullable<z.ZodString>;
            readAt: z.ZodNullable<z.ZodString>;
        }, z.core.$strip>;
        playback: z.ZodNullable<z.ZodObject<{
            progressSeconds: z.ZodNumber;
            durationSeconds: z.ZodNullable<z.ZodNumber>;
            completed: z.ZodBoolean;
            updatedAt: z.ZodString;
        }, z.core.$strip>>;
        matchReasons: z.ZodDefault<z.ZodArray<z.ZodString>>;
        rawPayload: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    }, z.core.$strip>>;
    nextCursor: z.ZodNullable<z.ZodString>;
    total: z.ZodNumber;
}, z.core.$strip>;
export type FeedPage = z.infer<typeof FeedPageSchema>;
export declare const WatchlistRuleSchema: z.ZodObject<{
    id: z.ZodString;
    watchlistId: z.ZodString;
    ruleType: z.ZodEnum<{
        keyword: "keyword";
        phrase: "phrase";
        source: "source";
        tag: "tag";
    }>;
    pattern: z.ZodString;
    caseSensitive: z.ZodBoolean;
}, z.core.$strip>;
export type WatchlistRule = z.infer<typeof WatchlistRuleSchema>;
export declare const WatchlistSchema: z.ZodObject<{
    id: z.ZodString;
    userId: z.ZodString;
    name: z.ZodString;
    description: z.ZodNullable<z.ZodString>;
    color: z.ZodNullable<z.ZodString>;
    active: z.ZodBoolean;
    createdAt: z.ZodString;
    updatedAt: z.ZodString;
    rules: z.ZodDefault<z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        watchlistId: z.ZodString;
        ruleType: z.ZodEnum<{
            keyword: "keyword";
            phrase: "phrase";
            source: "source";
            tag: "tag";
        }>;
        pattern: z.ZodString;
        caseSensitive: z.ZodBoolean;
    }, z.core.$strip>>>;
}, z.core.$strip>;
export type Watchlist = z.infer<typeof WatchlistSchema>;
export declare const WatchlistMatchSchema: z.ZodObject<{
    id: z.ZodString;
    watchlistId: z.ZodString;
    item: z.ZodObject<{
        id: z.ZodString;
        sourceId: z.ZodString;
        sourceTitle: z.ZodString;
        title: z.ZodString;
        canonicalUrl: z.ZodNullable<z.ZodString>;
        excerpt: z.ZodNullable<z.ZodString>;
        bodyText: z.ZodNullable<z.ZodString>;
        authorName: z.ZodNullable<z.ZodString>;
        publishedAt: z.ZodString;
        ingestedAt: z.ZodString;
        module: z.ZodEnum<{
            inbox: "inbox";
            news: "news";
            channels: "channels";
            podcasts: "podcasts";
            saved: "saved";
        }>;
        itemType: z.ZodEnum<{
            podcast: "podcast";
            video: "video";
            article: "article";
            update: "update";
        }>;
        tags: z.ZodArray<z.ZodString>;
        embedUrl: z.ZodNullable<z.ZodString>;
        siteUrl: z.ZodNullable<z.ZodString>;
        imageUrl: z.ZodNullable<z.ZodString>;
        audioUrl: z.ZodNullable<z.ZodString>;
        videoUrl: z.ZodNullable<z.ZodString>;
        videoId: z.ZodNullable<z.ZodString>;
        mediaAssets: z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            kind: z.ZodEnum<{
                thumbnail: "thumbnail";
                image: "image";
                audio: "audio";
                video: "video";
            }>;
            remoteUrl: z.ZodString;
            localUrl: z.ZodNullable<z.ZodString>;
            mimeType: z.ZodNullable<z.ZodString>;
            status: z.ZodEnum<{
                remote: "remote";
                cached: "cached";
                failed: "failed";
            }>;
            bytes: z.ZodNullable<z.ZodNumber>;
            cachedAt: z.ZodNullable<z.ZodString>;
        }, z.core.$strip>>;
        state: z.ZodObject<{
            isRead: z.ZodBoolean;
            isSaved: z.ZodBoolean;
            isHidden: z.ZodBoolean;
            savedAt: z.ZodNullable<z.ZodString>;
            readAt: z.ZodNullable<z.ZodString>;
        }, z.core.$strip>;
        playback: z.ZodNullable<z.ZodObject<{
            progressSeconds: z.ZodNumber;
            durationSeconds: z.ZodNullable<z.ZodNumber>;
            completed: z.ZodBoolean;
            updatedAt: z.ZodString;
        }, z.core.$strip>>;
        matchReasons: z.ZodDefault<z.ZodArray<z.ZodString>>;
        rawPayload: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    }, z.core.$strip>;
    matchReason: z.ZodString;
    clusterKey: z.ZodString;
    clusterLabel: z.ZodString;
    firstSeenAt: z.ZodString;
}, z.core.$strip>;
export type WatchlistMatch = z.infer<typeof WatchlistMatchSchema>;
export declare const AlertIncidentSchema: z.ZodObject<{
    clusterKey: z.ZodString;
    clusterLabel: z.ZodString;
    watchlistId: z.ZodString;
    watchlistName: z.ZodString;
    firstSeenAt: z.ZodString;
    latestSeenAt: z.ZodString;
    corroboratingSources: z.ZodArray<z.ZodString>;
    items: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        sourceId: z.ZodString;
        sourceTitle: z.ZodString;
        title: z.ZodString;
        canonicalUrl: z.ZodNullable<z.ZodString>;
        excerpt: z.ZodNullable<z.ZodString>;
        bodyText: z.ZodNullable<z.ZodString>;
        authorName: z.ZodNullable<z.ZodString>;
        publishedAt: z.ZodString;
        ingestedAt: z.ZodString;
        module: z.ZodEnum<{
            inbox: "inbox";
            news: "news";
            channels: "channels";
            podcasts: "podcasts";
            saved: "saved";
        }>;
        itemType: z.ZodEnum<{
            podcast: "podcast";
            video: "video";
            article: "article";
            update: "update";
        }>;
        tags: z.ZodArray<z.ZodString>;
        embedUrl: z.ZodNullable<z.ZodString>;
        siteUrl: z.ZodNullable<z.ZodString>;
        imageUrl: z.ZodNullable<z.ZodString>;
        audioUrl: z.ZodNullable<z.ZodString>;
        videoUrl: z.ZodNullable<z.ZodString>;
        videoId: z.ZodNullable<z.ZodString>;
        mediaAssets: z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            kind: z.ZodEnum<{
                thumbnail: "thumbnail";
                image: "image";
                audio: "audio";
                video: "video";
            }>;
            remoteUrl: z.ZodString;
            localUrl: z.ZodNullable<z.ZodString>;
            mimeType: z.ZodNullable<z.ZodString>;
            status: z.ZodEnum<{
                remote: "remote";
                cached: "cached";
                failed: "failed";
            }>;
            bytes: z.ZodNullable<z.ZodNumber>;
            cachedAt: z.ZodNullable<z.ZodString>;
        }, z.core.$strip>>;
        state: z.ZodObject<{
            isRead: z.ZodBoolean;
            isSaved: z.ZodBoolean;
            isHidden: z.ZodBoolean;
            savedAt: z.ZodNullable<z.ZodString>;
            readAt: z.ZodNullable<z.ZodString>;
        }, z.core.$strip>;
        playback: z.ZodNullable<z.ZodObject<{
            progressSeconds: z.ZodNumber;
            durationSeconds: z.ZodNullable<z.ZodNumber>;
            completed: z.ZodBoolean;
            updatedAt: z.ZodString;
        }, z.core.$strip>>;
        matchReasons: z.ZodDefault<z.ZodArray<z.ZodString>>;
        rawPayload: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    }, z.core.$strip>>;
}, z.core.$strip>;
export type AlertIncident = z.infer<typeof AlertIncidentSchema>;
export declare const SummaryProviderSchema: z.ZodObject<{
    id: z.ZodString;
    label: z.ZodString;
    providerType: z.ZodEnum<{
        ollama: "ollama";
        openai: "openai";
        anthropic: "anthropic";
        custom: "custom";
    }>;
    baseUrl: z.ZodNullable<z.ZodString>;
    apiKeyEnv: z.ZodNullable<z.ZodString>;
    model: z.ZodString;
    active: z.ZodBoolean;
    metadata: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    createdAt: z.ZodString;
    updatedAt: z.ZodString;
}, z.core.$strip>;
export type SummaryProvider = z.infer<typeof SummaryProviderSchema>;
export declare const SummarySchema: z.ZodObject<{
    id: z.ZodString;
    itemId: z.ZodNullable<z.ZodString>;
    watchlistId: z.ZodNullable<z.ZodString>;
    userId: z.ZodString;
    providerId: z.ZodNullable<z.ZodString>;
    providerLabel: z.ZodNullable<z.ZodString>;
    status: z.ZodEnum<{
        failed: "failed";
        completed: "completed";
        pending: "pending";
    }>;
    promptStyle: z.ZodString;
    summaryText: z.ZodNullable<z.ZodString>;
    model: z.ZodNullable<z.ZodString>;
    createdAt: z.ZodString;
    error: z.ZodNullable<z.ZodString>;
}, z.core.$strip>;
export type Summary = z.infer<typeof SummarySchema>;
export declare const AgentTokenSchema: z.ZodObject<{
    id: z.ZodString;
    label: z.ZodString;
    scopes: z.ZodArray<z.ZodString>;
    lastUsedAt: z.ZodNullable<z.ZodString>;
    createdAt: z.ZodString;
}, z.core.$strip>;
export type AgentToken = z.infer<typeof AgentTokenSchema>;
export declare const ActivityEventSchema: z.ZodObject<{
    id: z.ZodString;
    eventType: z.ZodEnum<{
        ingestion: "ingestion";
        "item.created": "item.created";
        "watchlist.match": "watchlist.match";
        "summary.completed": "summary.completed";
        "summary.failed": "summary.failed";
        "cache.completed": "cache.completed";
        "cache.failed": "cache.failed";
    }>;
    createdAt: z.ZodString;
    payload: z.ZodRecord<z.ZodString, z.ZodUnknown>;
}, z.core.$strip>;
export type ActivityEvent = z.infer<typeof ActivityEventSchema>;
export declare const HealthSnapshotSchema: z.ZodObject<{
    status: z.ZodEnum<{
        ok: "ok";
        degraded: "degraded";
    }>;
    appVersion: z.ZodString;
    now: z.ZodString;
    enabledModules: z.ZodArray<z.ZodEnum<{
        inbox: "inbox";
        news: "news";
        channels: "channels";
        podcasts: "podcasts";
        saved: "saved";
    }>>;
    database: z.ZodBoolean;
    redis: z.ZodBoolean;
    ingestion: z.ZodObject<{
        recentRuns: z.ZodNumber;
        failingSources: z.ZodNumber;
        pendingJobs: z.ZodNumber;
    }, z.core.$strip>;
}, z.core.$strip>;
export type HealthSnapshot = z.infer<typeof HealthSnapshotSchema>;
export declare const CreateSourceInputSchema: z.ZodObject<{
    title: z.ZodString;
    description: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    module: z.ZodEnum<{
        inbox: "inbox";
        news: "news";
        channels: "channels";
        podcasts: "podcasts";
        saved: "saved";
    }>;
    sourceType: z.ZodEnum<{
        rss: "rss";
        youtube: "youtube";
        podcast: "podcast";
        adapter: "adapter";
    }>;
    sourceTier: z.ZodDefault<z.ZodEnum<{
        breaking: "breaking";
        verified: "verified";
        standard: "standard";
    }>>;
    adapterKey: z.ZodString;
    feedUrl: z.ZodString;
    siteUrl: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    imageUrl: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    language: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    pollingMinutes: z.ZodNumber;
    sourceGroupId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    metadata: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
}, z.core.$strip>;
export type CreateSourceInput = z.infer<typeof CreateSourceInputSchema>;
export declare const DiscoverSourceInputSchema: z.ZodObject<{
    sourceType: z.ZodEnum<{
        rss: "rss";
        youtube: "youtube";
        podcast: "podcast";
        adapter: "adapter";
    }>;
    adapterKey: z.ZodString;
    url: z.ZodString;
    module: z.ZodOptional<z.ZodEnum<{
        inbox: "inbox";
        news: "news";
        channels: "channels";
        podcasts: "podcasts";
        saved: "saved";
    }>>;
}, z.core.$strip>;
export type DiscoverSourceInput = z.infer<typeof DiscoverSourceInputSchema>;
export declare const CreateSourceGroupInputSchema: z.ZodObject<{
    name: z.ZodString;
    description: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    module: z.ZodEnum<{
        inbox: "inbox";
        news: "news";
        channels: "channels";
        podcasts: "podcasts";
        saved: "saved";
    }>;
    sortOrder: z.ZodDefault<z.ZodNumber>;
}, z.core.$strip>;
export type CreateSourceGroupInput = z.infer<typeof CreateSourceGroupInputSchema>;
export declare const FollowSourceInputSchema: z.ZodObject<{
    folder: z.ZodDefault<z.ZodString>;
}, z.core.$strip>;
export type FollowSourceInput = z.infer<typeof FollowSourceInputSchema>;
export declare const UpsertItemStateInputSchema: z.ZodObject<{
    isRead: z.ZodOptional<z.ZodBoolean>;
    isSaved: z.ZodOptional<z.ZodBoolean>;
    isHidden: z.ZodOptional<z.ZodBoolean>;
}, z.core.$strip>;
export type UpsertItemStateInput = z.infer<typeof UpsertItemStateInputSchema>;
export declare const UpdatePlaybackInputSchema: z.ZodObject<{
    progressSeconds: z.ZodNumber;
    durationSeconds: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
    completed: z.ZodDefault<z.ZodBoolean>;
}, z.core.$strip>;
export type UpdatePlaybackInput = z.infer<typeof UpdatePlaybackInputSchema>;
export declare const CreateWatchlistInputSchema: z.ZodObject<{
    name: z.ZodString;
    description: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    color: z.ZodOptional<z.ZodNullable<z.ZodString>>;
}, z.core.$strip>;
export type CreateWatchlistInput = z.infer<typeof CreateWatchlistInputSchema>;
export declare const CreateWatchlistRuleInputSchema: z.ZodObject<{
    ruleType: z.ZodEnum<{
        keyword: "keyword";
        phrase: "phrase";
        source: "source";
        tag: "tag";
    }>;
    pattern: z.ZodString;
    caseSensitive: z.ZodDefault<z.ZodBoolean>;
}, z.core.$strip>;
export type CreateWatchlistRuleInput = z.infer<typeof CreateWatchlistRuleInputSchema>;
export declare const CreateSummaryProviderInputSchema: z.ZodObject<{
    label: z.ZodString;
    providerType: z.ZodEnum<{
        ollama: "ollama";
        openai: "openai";
        anthropic: "anthropic";
        custom: "custom";
    }>;
    baseUrl: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    apiKeyEnv: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    model: z.ZodString;
    metadata: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
}, z.core.$strip>;
export type CreateSummaryProviderInput = z.infer<typeof CreateSummaryProviderInputSchema>;
export declare const SummaryRequestSchema: z.ZodObject<{
    itemId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    watchlistId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    providerId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    promptStyle: z.ZodDefault<z.ZodString>;
}, z.core.$strip>;
export type SummaryRequest = z.infer<typeof SummaryRequestSchema>;
export declare const LoginInputSchema: z.ZodObject<{
    email: z.ZodString;
    password: z.ZodString;
}, z.core.$strip>;
export type LoginInput = z.infer<typeof LoginInputSchema>;
export declare const CreateUserInputSchema: z.ZodObject<{
    email: z.ZodString;
    displayName: z.ZodString;
    password: z.ZodString;
    role: z.ZodDefault<z.ZodEnum<{
        admin: "admin";
        member: "member";
    }>>;
}, z.core.$strip>;
export type CreateUserInput = z.infer<typeof CreateUserInputSchema>;
export declare const CreateAgentTokenInputSchema: z.ZodObject<{
    label: z.ZodString;
}, z.core.$strip>;
export type CreateAgentTokenInput = z.infer<typeof CreateAgentTokenInputSchema>;
export declare const FeedFilterSchema: z.ZodObject<{
    module: z.ZodOptional<z.ZodEnum<{
        inbox: "inbox";
        news: "news";
        channels: "channels";
        podcasts: "podcasts";
        saved: "saved";
    }>>;
    sourceId: z.ZodOptional<z.ZodString>;
    sourceGroupId: z.ZodOptional<z.ZodString>;
    unreadOnly: z.ZodOptional<z.ZodBoolean>;
    savedOnly: z.ZodOptional<z.ZodBoolean>;
    hidden: z.ZodOptional<z.ZodBoolean>;
    watchlistId: z.ZodOptional<z.ZodString>;
    from: z.ZodOptional<z.ZodString>;
    to: z.ZodOptional<z.ZodString>;
    query: z.ZodOptional<z.ZodString>;
    limit: z.ZodDefault<z.ZodNumber>;
    cursor: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export type FeedFilter = z.infer<typeof FeedFilterSchema>;
export declare const SearchResultSchema: z.ZodObject<{
    items: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        sourceId: z.ZodString;
        sourceTitle: z.ZodString;
        title: z.ZodString;
        canonicalUrl: z.ZodNullable<z.ZodString>;
        excerpt: z.ZodNullable<z.ZodString>;
        bodyText: z.ZodNullable<z.ZodString>;
        authorName: z.ZodNullable<z.ZodString>;
        publishedAt: z.ZodString;
        ingestedAt: z.ZodString;
        module: z.ZodEnum<{
            inbox: "inbox";
            news: "news";
            channels: "channels";
            podcasts: "podcasts";
            saved: "saved";
        }>;
        itemType: z.ZodEnum<{
            podcast: "podcast";
            video: "video";
            article: "article";
            update: "update";
        }>;
        tags: z.ZodArray<z.ZodString>;
        embedUrl: z.ZodNullable<z.ZodString>;
        siteUrl: z.ZodNullable<z.ZodString>;
        imageUrl: z.ZodNullable<z.ZodString>;
        audioUrl: z.ZodNullable<z.ZodString>;
        videoUrl: z.ZodNullable<z.ZodString>;
        videoId: z.ZodNullable<z.ZodString>;
        mediaAssets: z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            kind: z.ZodEnum<{
                thumbnail: "thumbnail";
                image: "image";
                audio: "audio";
                video: "video";
            }>;
            remoteUrl: z.ZodString;
            localUrl: z.ZodNullable<z.ZodString>;
            mimeType: z.ZodNullable<z.ZodString>;
            status: z.ZodEnum<{
                remote: "remote";
                cached: "cached";
                failed: "failed";
            }>;
            bytes: z.ZodNullable<z.ZodNumber>;
            cachedAt: z.ZodNullable<z.ZodString>;
        }, z.core.$strip>>;
        state: z.ZodObject<{
            isRead: z.ZodBoolean;
            isSaved: z.ZodBoolean;
            isHidden: z.ZodBoolean;
            savedAt: z.ZodNullable<z.ZodString>;
            readAt: z.ZodNullable<z.ZodString>;
        }, z.core.$strip>;
        playback: z.ZodNullable<z.ZodObject<{
            progressSeconds: z.ZodNumber;
            durationSeconds: z.ZodNullable<z.ZodNumber>;
            completed: z.ZodBoolean;
            updatedAt: z.ZodString;
        }, z.core.$strip>>;
        matchReasons: z.ZodDefault<z.ZodArray<z.ZodString>>;
        rawPayload: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    }, z.core.$strip>>;
    query: z.ZodString;
    total: z.ZodNumber;
}, z.core.$strip>;
export type SearchResult = z.infer<typeof SearchResultSchema>;
export declare const SourceDiscoveryResultSchema: z.ZodObject<{
    title: z.ZodString;
    description: z.ZodNullable<z.ZodString>;
    feedUrl: z.ZodString;
    siteUrl: z.ZodNullable<z.ZodString>;
    imageUrl: z.ZodNullable<z.ZodString>;
    module: z.ZodEnum<{
        inbox: "inbox";
        news: "news";
        channels: "channels";
        podcasts: "podcasts";
        saved: "saved";
    }>;
    sourceType: z.ZodEnum<{
        rss: "rss";
        youtube: "youtube";
        podcast: "podcast";
        adapter: "adapter";
    }>;
    adapterKey: z.ZodString;
    language: z.ZodNullable<z.ZodString>;
    metadata: z.ZodRecord<z.ZodString, z.ZodUnknown>;
}, z.core.$strip>;
export type SourceDiscoveryResult = z.infer<typeof SourceDiscoveryResultSchema>;
export interface SourceAdapterContext {
    fetch: typeof fetch;
    now: () => Date;
}
export interface DiscoveredSource {
    title: string;
    description: string | null;
    feedUrl: string;
    siteUrl: string | null;
    imageUrl: string | null;
    language: string | null;
    module: AppModule;
    sourceType: SourceType;
    adapterKey: string;
    metadata: Record<string, unknown>;
}
export interface NormalizedSourceItem {
    externalId: string;
    canonicalUrl: string | null;
    title: string;
    excerpt: string | null;
    bodyText: string | null;
    authorName: string | null;
    publishedAt: string;
    module: AppModule;
    itemType: "article" | "video" | "podcast" | "update";
    tags: string[];
    siteUrl: string | null;
    imageUrl: string | null;
    audioUrl: string | null;
    videoUrl: string | null;
    embedUrl: string | null;
    videoId: string | null;
    mediaAssets: Array<{
        kind: "thumbnail" | "image" | "audio" | "video";
        remoteUrl: string;
        mimeType: string | null;
    }>;
    rawPayload: Record<string, unknown>;
}
export interface SourceAdapter {
    key: string;
    supportedTypes: SourceType[];
    validate(input: {
        url: string;
        sourceType: SourceType;
    }): Promise<void>;
    discover(input: {
        url: string;
        sourceType: SourceType;
        module: AppModule;
    }, context: SourceAdapterContext): Promise<DiscoveredSource>;
    poll(source: Pick<Source, "feedUrl" | "module" | "sourceType" | "adapterKey" | "title">, context: SourceAdapterContext): Promise<NormalizedSourceItem[]>;
    normalize(input: {
        sourceTitle: string;
        sourceType: SourceType;
        module: AppModule;
        rawItem: Record<string, unknown>;
    }, context: SourceAdapterContext): Promise<NormalizedSourceItem>;
    resolveMedia(item: NormalizedSourceItem, context: SourceAdapterContext): Promise<NormalizedSourceItem>;
}
