import path from "node:path";

function asNumber(value: string | undefined, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function asBoolean(value: string | undefined, fallback: boolean) {
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

export function createAppConfig(env: NodeJS.ProcessEnv) {
  const homelabRoot = env.HOMELAB_ROOT ?? path.resolve(process.cwd(), "..");
  const nodeEnv = env.NODE_ENV ?? "development";
  const httpPort = asNumber(env.HTTP_PORT ?? env.PORT, 8080);

  return {
    nodeEnv,
    httpPort,
    homelabRoot,
    dashboardEnvPath: path.join(homelabRoot, "dashboard", ".env"),
    hostFsRoot: env.HOST_FS_ROOT ?? null,
    sessionSecret: env.SESSION_SECRET ?? "change-me-for-production",
    sessionTtlSeconds: asNumber(env.SESSION_TTL_SECONDS, 60 * 60 * 12),
    telemetryFastMs: asNumber(env.TELEMETRY_FAST_MS, 2000),
    telemetrySlowMs: asNumber(env.TELEMETRY_SLOW_MS, 10000),
    historyPoints: asNumber(env.TELEMETRY_HISTORY_POINTS, 36),
    adminPasswordBcrypt: env.ADMIN_PASSWORD_BCRYPT ?? "",
    secureCookies: asBoolean(env.COOKIE_SECURE, false),
  };
}

export type AppConfig = ReturnType<typeof createAppConfig>;

export const appConfig = createAppConfig(process.env);
