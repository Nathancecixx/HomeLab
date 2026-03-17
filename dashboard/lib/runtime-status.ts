import fs from "node:fs/promises";

import { appConfig, type AppConfig } from "@/lib/config";
import { readWolTargets } from "@/lib/wol";
import type { RuntimeCheck, RuntimeStatus } from "@/lib/types";

function isDefaultSecret(value: string) {
  return ["change-me", "change-me-for-production"].includes(value.trim());
}

async function pathReadable(pathname: string) {
  try {
    await fs.access(pathname);
    return true;
  } catch {
    return false;
  }
}

export function summarizeRuntimeStatus(config: AppConfig, input: {
  dockerError: string | null;
  hostTelemetry: boolean;
  homelabReadable: boolean;
  dashboardEnvReadable: boolean;
  wolTargetCount: number;
  wolErrors: string[];
}): RuntimeStatus {
  const warnings: string[] = [];
  if (!config.adminPasswordBcrypt) {
    warnings.push("ADMIN_PASSWORD_BCRYPT is not configured.");
  }

  if (isDefaultSecret(config.sessionSecret) || config.sessionSecret.length < 16) {
    warnings.push("SESSION_SECRET should be replaced with a long random value.");
  }

  if (!input.homelabReadable) {
    warnings.push(`HOMELAB_ROOT is not readable: ${config.homelabRoot}`);
  }

  if (!input.dashboardEnvReadable) {
    warnings.push(`Dashboard env file was not found at ${config.dashboardEnvPath}.`);
  }

  if (!input.hostTelemetry) {
    warnings.push("Host-aware telemetry is unavailable; dashboard is using container fallbacks.");
  }

  if (input.dockerError) {
    warnings.push("Docker control is degraded.");
  }

  warnings.push(...input.wolErrors);

  const checks: RuntimeCheck[] = [
    {
      id: "auth",
      label: "Auth",
      ok: Boolean(config.adminPasswordBcrypt) && !isDefaultSecret(config.sessionSecret) && config.sessionSecret.length >= 16,
      detail: !config.adminPasswordBcrypt
        ? "Password unset"
        : isDefaultSecret(config.sessionSecret) || config.sessionSecret.length < 16
          ? "Secret weak"
          : config.secureCookies
            ? "Secure cookies on"
            : "LAN HTTP mode",
    },
    {
      id: "docker",
      label: "Docker",
      ok: input.homelabReadable && !input.dockerError,
      detail: input.dockerError ? "Socket degraded" : input.homelabReadable ? "Control ready" : "Repo missing",
    },
    {
      id: "telemetry",
      label: "Telemetry",
      ok: input.hostTelemetry,
      detail: input.hostTelemetry ? "Host metrics active" : "Fallback mode",
    },
    {
      id: "wol",
      label: "Wake",
      ok: input.wolTargetCount > 0 && input.wolErrors.length === 0,
      detail:
        input.wolTargetCount > 0
          ? `${input.wolTargetCount} target${input.wolTargetCount === 1 ? "" : "s"}`
          : input.wolErrors.length > 0
            ? "Config invalid"
            : "No targets",
    },
  ];

  return {
    warnings,
    checks,
    hostTelemetry: input.hostTelemetry,
    dashboardEnvPath: config.dashboardEnvPath,
    wolTargetCount: input.wolTargetCount,
  };
}

export async function buildRuntimeStatus(input: {
  dockerError: string | null;
  hostTelemetry: boolean;
}): Promise<RuntimeStatus> {
  const [homelabReadable, dashboardEnvReadable, wolState] = await Promise.all([
    pathReadable(appConfig.homelabRoot),
    pathReadable(appConfig.dashboardEnvPath),
    readWolTargets(),
  ]);

  return summarizeRuntimeStatus(appConfig, {
    dockerError: input.dockerError,
    hostTelemetry: input.hostTelemetry,
    homelabReadable,
    dashboardEnvReadable,
    wolTargetCount: wolState.targets.length,
    wolErrors: wolState.errors,
  });
}
