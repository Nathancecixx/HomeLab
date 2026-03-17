import fs from "node:fs/promises";
import path from "node:path";

import { appConfig } from "@/lib/config";
import type { DiskSnapshot } from "@/lib/types";

const ignoredFsTypes = new Set([
  "autofs",
  "bpf",
  "cgroup",
  "cgroup2",
  "configfs",
  "debugfs",
  "devpts",
  "devtmpfs",
  "efivarfs",
  "fusectl",
  "hugetlbfs",
  "mqueue",
  "nsfs",
  "overlay",
  "proc",
  "pstore",
  "rpc_pipefs",
  "securityfs",
  "squashfs",
  "sysfs",
  "tmpfs",
  "tracefs",
]);

function hostPath(target: string) {
  if (!appConfig.hostFsRoot) {
    return null;
  }

  const trimmed = target.replace(/^\/+/, "");
  return path.join(appConfig.hostFsRoot, trimmed);
}

async function readHostText(target: string) {
  const pathname = hostPath(target);
  if (!pathname) {
    return null;
  }

  try {
    return (await fs.readFile(pathname, "utf8")).trim();
  } catch {
    return null;
  }
}

async function hostAccess(target: string) {
  const pathname = hostPath(target);
  if (!pathname) {
    return false;
  }

  try {
    await fs.access(pathname);
    return true;
  } catch {
    return false;
  }
}

function formatBytes(value: number) {
  const units = ["B", "KiB", "MiB", "GiB", "TiB"];
  let amount = value;
  let unitIndex = 0;

  while (amount >= 1024 && unitIndex < units.length - 1) {
    amount /= 1024;
    unitIndex += 1;
  }

  return `${amount.toFixed(amount >= 10 || unitIndex === 0 ? 1 : 2)} ${units[unitIndex]}`;
}

function unescapeMount(value: string) {
  return value
    .replace(/\\040/g, " ")
    .replace(/\\011/g, "\t")
    .replace(/\\012/g, "\n")
    .replace(/\\134/g, "\\");
}

function mapOsRelease(text: string | null) {
  if (!text) {
    return null;
  }

  const values = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#") && line.includes("="))
    .reduce<Record<string, string>>((acc, line) => {
      const index = line.indexOf("=");
      const key = line.slice(0, index).trim();
      const value = line.slice(index + 1).trim().replace(/^['"]|['"]$/g, "");
      acc[key] = value;
      return acc;
    }, {});

  return values.PRETTY_NAME || values.NAME || null;
}

export async function hasHostTelemetryAccess() {
  if (process.platform !== "linux") {
    return false;
  }

  return (await hostAccess("/proc")) || (await hostAccess("/etc/hostname"));
}

export async function readHostIdentity() {
  const enabled = await hasHostTelemetryAccess();
  if (!enabled) {
    return {
      enabled: false,
      hostname: null,
      platform: null,
      kernel: null,
    };
  }

  const [hostname, osRelease, kernel] = await Promise.all([
    readHostText("/etc/hostname"),
    readHostText("/etc/os-release"),
    readHostText("/proc/sys/kernel/osrelease"),
  ]);

  return {
    enabled: true,
    hostname,
    platform: mapOsRelease(osRelease),
    kernel,
  };
}

export async function readHostUptimeSeconds() {
  const uptime = await readHostText("/proc/uptime");
  if (!uptime) {
    return null;
  }

  const [seconds] = uptime.split(/\s+/);
  const parsed = Number(seconds);
  return Number.isFinite(parsed) ? parsed : null;
}

export async function readHostPrimaryInterface() {
  const routeText = await readHostText("/proc/net/route");
  if (!routeText) {
    return null;
  }

  const lines = routeText.split(/\r?\n/).slice(1);
  for (const line of lines) {
    const [iface, destination] = line.trim().split(/\s+/);
    if (iface && destination === "00000000") {
      return iface;
    }
  }

  return null;
}

export async function readHostStorage() {
  const mountsText = await readHostText("/proc/mounts");
  if (!mountsText) {
    return null;
  }

  const lines = mountsText.split(/\r?\n/).filter(Boolean);
  const mounts = new Map<string, string>();

  for (const line of lines) {
    const [device, mount, type] = line.split(/\s+/);
    if (!device || !mount || !type) {
      continue;
    }

    if (ignoredFsTypes.has(type)) {
      continue;
    }

    const cleanMount = unescapeMount(mount);
    if (cleanMount.startsWith("/snap")) {
      continue;
    }

    mounts.set(cleanMount, type);
  }

  const disks: DiskSnapshot[] = [];
  for (const mount of mounts.keys()) {
    const mountedPath = hostPath(mount);
    if (!mountedPath) {
      continue;
    }

    try {
      const stats = await fs.statfs(mountedPath);
      const sizeBytes = Number(stats.bsize) * Number(stats.blocks);
      const freeBytes = Number(stats.bsize) * Number(stats.bavail);
      const usedBytes = Math.max(sizeBytes - freeBytes, 0);
      const usagePct = sizeBytes > 0 ? (usedBytes / sizeBytes) * 100 : 0;

      if (sizeBytes <= 0) {
        continue;
      }

      disks.push({
        mount,
        sizeBytes,
        usedBytes,
        freeBytes,
        usagePct: Number(usagePct.toFixed(1)),
        sizeLabel: formatBytes(sizeBytes),
        usedLabel: formatBytes(usedBytes),
        freeLabel: formatBytes(freeBytes),
      });
    } catch {
      continue;
    }
  }

  return disks.sort((left, right) => left.mount.localeCompare(right.mount));
}
