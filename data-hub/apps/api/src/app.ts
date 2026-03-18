import fs from "node:fs";
import { createReadStream } from "node:fs";
import path from "node:path";

import cookie from "@fastify/cookie";
import cors from "@fastify/cors";
import sensible from "@fastify/sensible";
import Fastify, { type FastifyRequest } from "fastify";
import bcrypt from "bcryptjs";
import {
  type AppModule,
  type Session,
  CreateAgentTokenInputSchema,
  CreateSourceGroupInputSchema,
  CreateSourceInputSchema,
  CreateSummaryProviderInputSchema,
  CreateUserInputSchema,
  CreateWatchlistInputSchema,
  CreateWatchlistRuleInputSchema,
  DiscoverSourceInputSchema,
  FeedFilterSchema,
  FollowSourceInputSchema,
  LoginInputSchema,
  SummaryRequestSchema,
  UpdatePlaybackInputSchema,
  UpsertItemStateInputSchema,
} from "@data-hub/contracts";
import {
  createDataHubConfig,
  createOpaqueToken,
  createQueues,
  discoverSource,
  ensureDataHubSchema,
  getDbPool,
  sha256,
  type DataHubRepository,
} from "@data-hub/core";
import { DataHubRepository as Repository } from "@data-hub/core";

const SESSION_COOKIE = "dh_session";

type AuthContext = { kind: "session" | "agent"; user: Session["user"]; scopes: string[] } | null;

function parseBoolean(value: unknown) {
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "string") {
    return ["1", "true", "yes", "on"].includes(value.toLowerCase());
  }

  return false;
}

function parseOptionalString(value: unknown) {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function parseFeedQuery(query: Record<string, unknown>) {
  return FeedFilterSchema.parse({
    module: parseOptionalString(query.module),
    sourceId: parseOptionalString(query.sourceId),
    sourceGroupId: parseOptionalString(query.sourceGroupId),
    unreadOnly: query.unreadOnly === undefined ? undefined : parseBoolean(query.unreadOnly),
    savedOnly: query.savedOnly === undefined ? undefined : parseBoolean(query.savedOnly),
    hidden: query.hidden === undefined ? undefined : parseBoolean(query.hidden),
    watchlistId: parseOptionalString(query.watchlistId),
    from: parseOptionalString(query.from),
    to: parseOptionalString(query.to),
    query: parseOptionalString(query.query),
    limit: query.limit ? Number(query.limit) : undefined,
    cursor: parseOptionalString(query.cursor),
  });
}

export async function createApp() {
  const config = createDataHubConfig(process.env);
  const pool = getDbPool(config.databaseUrl);
  await ensureDataHubSchema(pool);

  const repository = new Repository(pool, config.apiOrigin);
  await repository.seedUsers(config);
  await repository.seedDefaultProviders(config);

  const queues = createQueues(config.redisUrl);
  const app = Fastify({
    logger: true,
  });

  await app.register(cookie, {
    secret: config.sessionSecret,
  });
  await app.register(sensible);

  await app.register(cors, {
    origin: [config.webOrigin, config.apiOrigin],
    credentials: true,
  });

  async function getAuthContext(request: FastifyRequest): Promise<AuthContext> {
    const authorization = typeof request.headers.authorization === "string" ? request.headers.authorization : null;
    if (authorization?.startsWith("Bearer ")) {
      const token = authorization.slice("Bearer ".length);
      const tokenRecord = await repository.getAgentTokenUser(sha256(token));
      if (tokenRecord) {
        return {
          kind: "agent",
          user: tokenRecord.user,
          scopes: tokenRecord.scopes,
        };
      }
    }

    const sessionToken = request.cookies[SESSION_COOKIE];
    if (!sessionToken) {
      return null;
    }

    const user = await repository.getSessionUser(sha256(sessionToken));
    if (!user) {
      return null;
    }

    return {
      kind: "session",
      user,
      scopes: [],
    };
  }

  async function getRequiredAuth(request: FastifyRequest) {
    const auth = await getAuthContext(request);
    if (!auth) {
      throw app.httpErrors.unauthorized("Authentication required.");
    }

    return auth;
  }

  async function getInteractiveAuth(request: FastifyRequest) {
    const auth = await getRequiredAuth(request);
    if (auth.kind === "agent") {
      throw app.httpErrors.forbidden("Agent tokens are read-only.");
    }

    return auth;
  }

  async function getAdminAuth(request: FastifyRequest) {
    const auth = await getInteractiveAuth(request);
    if (auth.user.role !== "admin") {
      throw app.httpErrors.forbidden("Admin access required.");
    }

    return auth;
  }

  app.get("/api/v1/health", async () => {
    const [ingestCounts, mediaCounts, summaryCounts] = await Promise.all([
      queues.ingestQueue.getJobCounts(),
      queues.mediaQueue.getJobCounts(),
      queues.summaryQueue.getJobCounts(),
    ]);
    const pendingJobs =
      (ingestCounts.waiting ?? 0) +
      (ingestCounts.active ?? 0) +
      (mediaCounts.waiting ?? 0) +
      (mediaCounts.active ?? 0) +
      (summaryCounts.waiting ?? 0) +
      (summaryCounts.active ?? 0);

    return repository.getHealthSnapshot(config.appVersion, pendingJobs);
  });

  app.post("/api/v1/auth/login", async (request, reply) => {
    const body = LoginInputSchema.parse(request.body ?? {});
    const user = await repository.findUserByEmail(body.email);
    if (!user || !(await bcrypt.compare(body.password, user.password_hash))) {
      throw app.httpErrors.unauthorized("Invalid credentials.");
    }

    const sessionToken = createOpaqueToken("dh_session");
    const expiresAt = new Date(Date.now() + config.sessionTtlSeconds * 1000);
    const userAgentHeader = request.headers["user-agent"];
    const userAgent = Array.isArray(userAgentHeader) ? userAgentHeader[0] : userAgentHeader ?? null;
    await repository.createSession(user.id, sha256(sessionToken), userAgent, request.ip, expiresAt);

    reply.setCookie(SESSION_COOKIE, sessionToken, {
      httpOnly: true,
      secure: config.cookieSecure,
      sameSite: "lax",
      path: "/",
      expires: expiresAt,
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        displayName: user.display_name,
        role: user.role,
      },
      authenticatedAt: new Date().toISOString(),
      scopes: [],
    };
  });

  app.post("/api/v1/auth/logout", async (request, reply) => {
    const token = request.cookies[SESSION_COOKIE];
    if (token) {
      await repository.deleteSession(sha256(token));
    }

    reply.clearCookie(SESSION_COOKIE, {
      path: "/",
    });

    return { ok: true };
  });

  app.get("/api/v1/auth/session", async (request) => {
    const auth = await getAuthContext(request);
    if (!auth) {
      return { user: null };
    }

    return {
      user: auth.user,
      authenticatedAt: new Date().toISOString(),
      scopes: auth.scopes,
    };
  });

  app.get("/api/v1/auth/users", async (request) => {
    await getAdminAuth(request);
    return repository.listUsers();
  });

  app.post("/api/v1/auth/users", async (request) => {
    await getAdminAuth(request);
    const body = CreateUserInputSchema.parse(request.body ?? {});
    return repository.createUser(body);
  });

  app.get("/api/v1/me", async (request) => {
    const auth = await getRequiredAuth(request);
    return auth.user;
  });

  app.get("/api/v1/me/tokens", async (request) => {
    const auth = await getInteractiveAuth(request);
    return repository.listAgentTokens(auth.user.id);
  });

  app.post("/api/v1/me/tokens", async (request) => {
    const auth = await getInteractiveAuth(request);
    const body = CreateAgentTokenInputSchema.parse(request.body ?? {});
    const rawToken = createOpaqueToken("dh_pat");
    const token = await repository.createAgentToken(auth.user.id, body.label, sha256(rawToken));
    return {
      token,
      rawToken,
    };
  });

  app.get("/api/v1/me/modules", async (request) => {
    await getRequiredAuth(request);
    return repository.listEnabledModules();
  });

  app.put("/api/v1/me/modules", async (request) => {
    await getAdminAuth(request);
    const body = request.body as { modules?: string[] } | null;
    if (!body?.modules || !Array.isArray(body.modules)) {
      throw app.httpErrors.badRequest("Expected a modules array.");
    }

    return repository.updateEnabledModules(body.modules as AppModule[]);
  });

  app.get("/api/v1/source-groups", async (request) => {
    await getRequiredAuth(request);
    return repository.listSourceGroups();
  });

  app.post("/api/v1/source-groups", async (request) => {
    await getAdminAuth(request);
    const body = CreateSourceGroupInputSchema.parse(request.body ?? {});
    return repository.createSourceGroup(body);
  });

  app.get("/api/v1/sources", async (request) => {
    const auth = await getRequiredAuth(request);
    const module = parseOptionalString((request.query as Record<string, unknown> | undefined)?.module) as AppModule | undefined;
    return repository.listSources(auth.user.id, module);
  });

  app.post("/api/v1/sources/discover", async (request) => {
    await getAdminAuth(request);
    const body = DiscoverSourceInputSchema.parse(request.body ?? {});
    return discoverSource(
      {
        ...body,
        module: body.module ?? (body.sourceType === "podcast" ? "podcasts" : body.sourceType === "youtube" ? "channels" : "news"),
      },
      fetch,
    );
  });

  app.post("/api/v1/sources", async (request) => {
    const auth = await getAdminAuth(request);
    const body = CreateSourceInputSchema.parse(request.body ?? {});
    const source = await repository.createSource(body, auth.user.id);
    if (source) {
      await queues.ingestQueue.add("ingest-source", { sourceId: source.id }, { jobId: `source:${source.id}` });
    }

    return source;
  });

  app.post("/api/v1/sources/:id/follow", async (request) => {
    const auth = await getInteractiveAuth(request);
    const body = FollowSourceInputSchema.parse(request.body ?? {});
    await repository.followSource(auth.user.id, String((request.params as { id: string }).id), body.folder);
    return repository.getSourceById(String((request.params as { id: string }).id), auth.user.id);
  });

  app.post("/api/v1/sources/:id/unfollow", async (request) => {
    const auth = await getInteractiveAuth(request);
    await repository.unfollowSource(auth.user.id, String((request.params as { id: string }).id));
    return { ok: true };
  });

  app.get("/api/v1/feed", async (request) => {
    const auth = await getRequiredAuth(request);
    const filters = parseFeedQuery((request.query ?? {}) as Record<string, unknown>);
    return repository.listFeed(auth.user.id, filters);
  });

  app.get("/api/v1/search", async (request) => {
    const auth = await getRequiredAuth(request);
    const filters = parseFeedQuery((request.query ?? {}) as Record<string, unknown>);
    if (!filters.query) {
      throw app.httpErrors.badRequest("A search query is required.");
    }

    return repository.listFeed(auth.user.id, filters);
  });

  app.get("/api/v1/items/:id", async (request) => {
    const auth = await getRequiredAuth(request);
    const item = await repository.getItemById(auth.user.id, String((request.params as { id: string }).id));
    if (!item) {
      throw app.httpErrors.notFound("Item not found.");
    }

    return item;
  });

  app.put("/api/v1/item-state/:itemId", async (request) => {
    const auth = await getInteractiveAuth(request);
    const body = UpsertItemStateInputSchema.parse(request.body ?? {});
    const item = await repository.upsertItemState(auth.user.id, String((request.params as { itemId: string }).itemId), body);
    if (!item) {
      throw app.httpErrors.notFound("Item not found.");
    }

    return item;
  });

  app.put("/api/v1/playback/:itemId", async (request) => {
    const auth = await getInteractiveAuth(request);
    const body = UpdatePlaybackInputSchema.parse(request.body ?? {});
    const item = await repository.updatePlayback(
      auth.user.id,
      String((request.params as { itemId: string }).itemId),
      body.progressSeconds,
      body.durationSeconds ?? null,
      body.completed,
    );
    if (!item) {
      throw app.httpErrors.notFound("Item not found.");
    }

    return item;
  });

  app.get("/api/v1/watchlists", async (request) => {
    const auth = await getRequiredAuth(request);
    return repository.listWatchlists(auth.user.id);
  });

  app.post("/api/v1/watchlists", async (request) => {
    const auth = await getInteractiveAuth(request);
    const body = CreateWatchlistInputSchema.parse(request.body ?? {});
    return repository.createWatchlist(auth.user.id, body);
  });

  app.post("/api/v1/watchlists/:id/rules", async (request) => {
    const auth = await getInteractiveAuth(request);
    const body = CreateWatchlistRuleInputSchema.parse(request.body ?? {});
    const rule = await repository.createWatchlistRule(auth.user.id, String((request.params as { id: string }).id), body);
    if (!rule) {
      throw app.httpErrors.notFound("Watchlist not found.");
    }

    return rule;
  });

  app.get("/api/v1/watchlists/:id/matches", async (request) => {
    const auth = await getRequiredAuth(request);
    return repository.listWatchlistMatches(auth.user.id, String((request.params as { id: string }).id));
  });

  app.get("/api/v1/alerts", async (request) => {
    const auth = await getRequiredAuth(request);
    return repository.listAlertIncidents(auth.user.id);
  });

  app.get("/api/v1/summaries/providers", async (request) => {
    await getRequiredAuth(request);
    return repository.listSummaryProviders();
  });

  app.post("/api/v1/summaries/providers", async (request) => {
    await getAdminAuth(request);
    const body = CreateSummaryProviderInputSchema.parse(request.body ?? {});
    return repository.createSummaryProvider(body);
  });

  app.get("/api/v1/summaries", async (request) => {
    const auth = await getRequiredAuth(request);
    return repository.listSummaries(auth.user.id);
  });

  app.post("/api/v1/summaries", async (request) => {
    const auth = await getInteractiveAuth(request);
    const body = SummaryRequestSchema.parse(request.body ?? {});
    const summary = await repository.createSummaryRequest(auth.user.id, body.itemId ?? null, body.watchlistId ?? null, body.providerId ?? null, body.promptStyle);
    await queues.summaryQueue.add("generate-summary", { summaryId: summary.id }, { jobId: `summary:${summary.id}` });
    return summary;
  });

  app.get("/api/v1/media/:assetId", async (request, reply) => {
    await getRequiredAuth(request);
    const asset = await repository.getMediaAssetById(String((request.params as { assetId: string }).assetId));
    if (!asset) {
      throw app.httpErrors.notFound("Media asset not found.");
    }

    if (asset.local_path && fs.existsSync(String(asset.local_path))) {
      if (asset.mime_type) {
        reply.type(String(asset.mime_type));
      }

      return reply.send(createReadStream(String(asset.local_path)));
    }

    if (asset.remote_url) {
      return reply.redirect(String(asset.remote_url));
    }

    throw app.httpErrors.notFound("Media asset is unavailable.");
  });

  app.get("/api/v1/events", async (request, reply) => {
    const auth = await getRequiredAuth(request);
    reply.raw.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    });

    let cursor = parseOptionalString((request.query as Record<string, unknown> | undefined)?.cursor) ?? new Date(Date.now() - 60_000).toISOString();
    const sendEvents = async () => {
      const events = await repository.listActivityEventsSince(cursor, auth.user.id);
      if (events.length) {
        cursor = events[events.length - 1]!.createdAt;
        for (const event of events) {
          reply.raw.write(`event: ${event.eventType}\n`);
          reply.raw.write(`data: ${JSON.stringify(event)}\n\n`);
        }
      } else {
        reply.raw.write(`event: heartbeat\ndata: ${JSON.stringify({ now: new Date().toISOString() })}\n\n`);
      }
    };

    const timer = setInterval(() => {
      void sendEvents();
    }, 5000);

    request.raw.on("close", () => {
      clearInterval(timer);
      reply.raw.end();
    });

    await sendEvents();
  });

  app.setErrorHandler((error, _request, reply) => {
    app.log.error(error);
    const statusCode =
      typeof error === "object" && error !== null && "statusCode" in error && typeof (error as { statusCode?: number }).statusCode === "number"
        ? (error as { statusCode: number }).statusCode
        : 500;
    reply.status(statusCode).send({
      error: statusCode >= 500 ? "Internal Server Error" : error instanceof Error ? error.message : "Request failed",
    });
  });

  app.addHook("onClose", async () => {
    await Promise.all([
      queues.ingestQueue.close(),
      queues.mediaQueue.close(),
      queues.summaryQueue.close(),
      pool.end(),
    ]);
  });

  return app;
}
