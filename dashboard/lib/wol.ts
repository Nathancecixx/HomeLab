import dgram from "node:dgram";

import { appConfig } from "@/lib/config";
import { readEnvRecord } from "@/lib/env";
import type { WolConfigSnapshot, WolTarget, WolWakeResult } from "@/lib/types";

const macPattern = /^(?:[0-9a-f]{2}[:-]){5}[0-9a-f]{2}$/i;
const ipPattern = /^(?:\d{1,3}\.){3}\d{1,3}$/;

function sanitizeId(value: string) {
  return value.trim().toUpperCase().replace(/[^A-Z0-9_]/g, "_");
}

function normalizeMac(value: string) {
  return value
    .trim()
    .replace(/-/g, ":")
    .toUpperCase();
}

function isIpv4(value: string | undefined) {
  if (!value || !ipPattern.test(value)) {
    return false;
  }

  return value.split(".").every((part) => {
    const parsed = Number(part);
    return Number.isInteger(parsed) && parsed >= 0 && parsed <= 255;
  });
}

export function deriveBroadcastAddress(ip: string | undefined | null) {
  if (!ip || !isIpv4(ip)) {
    return "255.255.255.255";
  }

  const parts = ip.split(".");
  parts[3] = "255";
  return parts.join(".");
}

export function createMagicPacket(mac: string) {
  const normalized = normalizeMac(mac);
  if (!macPattern.test(normalized)) {
    throw new Error("Invalid MAC address.");
  }

  const macBytes = normalized.split(":").map((part) => Number.parseInt(part, 16));
  const packet = Buffer.alloc(6 + 16 * macBytes.length, 0xff);

  for (let index = 6; index < packet.length; index += macBytes.length) {
    for (let inner = 0; inner < macBytes.length; inner += 1) {
      packet[index + inner] = macBytes[inner] ?? 0;
    }
  }

  return packet;
}

export function parseWolTargets(env: Record<string, string>): WolConfigSnapshot {
  const rawTargets = env.WOL_TARGETS ?? "";
  const ids = rawTargets
    .split(",")
    .map((item) => sanitizeId(item))
    .filter(Boolean);

  const targets: WolTarget[] = [];
  const errors: string[] = [];

  for (const id of ids) {
    const mac = normalizeMac(env[`WOL_TARGET_${id}_MAC`] ?? "");
    const ip = env[`WOL_TARGET_${id}_IP`] ?? "";
    const broadcast = env[`WOL_TARGET_${id}_BROADCAST`] ?? "";
    const port = Number(env[`WOL_TARGET_${id}_PORT`] ?? "9");
    const label = (env[`WOL_TARGET_${id}_LABEL`] ?? id.replace(/_/g, " ")).trim();

    if (!macPattern.test(mac)) {
      errors.push(`WOL target ${id} is missing a valid MAC address.`);
      continue;
    }

    if (ip && !isIpv4(ip)) {
      errors.push(`WOL target ${id} has an invalid IP address.`);
      continue;
    }

    if (broadcast && !isIpv4(broadcast)) {
      errors.push(`WOL target ${id} has an invalid broadcast address.`);
      continue;
    }

    if (!Number.isFinite(port) || port <= 0 || port > 65535) {
      errors.push(`WOL target ${id} has an invalid port.`);
      continue;
    }

    targets.push({
      id: id.toLowerCase(),
      label,
      mac,
      ip: ip || null,
      broadcast: broadcast || deriveBroadcastAddress(ip),
      port,
    });
  }

  return { targets, errors };
}

export async function readWolTargets() {
  const env = {
    ...(process.env as Record<string, string>),
    ...(await readEnvRecord(appConfig.dashboardEnvPath)),
  };
  return parseWolTargets(env);
}

export async function wakeTarget(target: WolTarget): Promise<WolWakeResult> {
  const packet = createMagicPacket(target.mac);
  const socket = dgram.createSocket("udp4");

  try {
    await new Promise<void>((resolve, reject) => {
      socket.once("error", reject);
      socket.bind(() => {
        try {
          socket.setBroadcast(true);
          socket.send(packet, target.port, target.broadcast, (error) => {
            if (error) {
              reject(error);
              return;
            }

            resolve();
          });
        } catch (error) {
          reject(error);
        }
      });
    });

    return {
      id: target.id,
      label: target.label,
      ok: true,
      sentTo: target.broadcast,
      port: target.port,
      executedAt: new Date().toISOString(),
    };
  } catch (error) {
    return {
      id: target.id,
      label: target.label,
      ok: false,
      sentTo: target.broadcast,
      port: target.port,
      executedAt: new Date().toISOString(),
      error: error instanceof Error ? error.message : "Wake-on-LAN failed.",
    };
  } finally {
    socket.close();
  }
}
