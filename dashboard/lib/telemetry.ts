import fs from "node:fs/promises";
import os from "node:os";
import { EventEmitter } from "node:events";

import si from "systeminformation";

import { appConfig } from "@/lib/config";
import { inspectService, listDockerContainers } from "@/lib/docker";
import { readHostIdentity, readHostPrimaryInterface, readHostStorage, readHostUptimeSeconds } from "@/lib/host";
import { buildRuntimeStatus } from "@/lib/runtime-status";
import { getServicePaths, resolveServiceApp, serviceRegistry } from "@/lib/services";
import type {
  DashboardSnapshot,
  HealthLevel,
  NetworkInterfaceSnapshot,
  NetworkSnapshot,
  ServiceSnapshot,
} from "@/lib/types";

type AggregateCounter = { rx: number; tx: number; at: number };
type InterfaceCounter = Record<string, AggregateCounter>;

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

function pushPoint(list: number[], value: number) {
  list.push(value);
  if (list.length > appConfig.historyPoints) {
    list.shift();
  }
}

function pushLabel(list: string[], value: string) {
  list.push(value);
  if (list.length > appConfig.historyPoints) {
    list.shift();
  }
}

function pickPrimaryInterface(interfaces: NetworkInterfaceSnapshot[], preferredName?: string | null) {
  if (preferredName) {
    const preferred = interfaces.find((item) => item.name === preferredName);
    if (preferred) {
      return preferred.name;
    }
  }

  const preferred = interfaces.find((item) => item.ip4 && /^(e(n|th)|wl)/i.test(item.name));
  return preferred?.name ?? interfaces.find((item) => item.ip4)?.name ?? interfaces[0]?.name ?? null;
}

async function readText(pathname: string) {
  try {
    return await fs.readFile(pathname, "utf8");
  } catch {
    return "";
  }
}

async function pathExists(pathname: string) {
  try {
    await fs.access(pathname);
    return true;
  } catch {
    return false;
  }
}

async function getNetworkSnapshot(
  previousAggregate: AggregateCounter | null,
  previousInterfaces: InterfaceCounter,
  preferredPrimary: string | null
): Promise<{ snapshot: NetworkSnapshot; nextAggregate: AggregateCounter; nextInterfaces: InterfaceCounter }> {
  const [networkInterfaces, networkStats] = await Promise.all([si.networkInterfaces(), si.networkStats()]);
  const statsByName = new Map(
    networkStats.map((stat) => {
      const candidate = stat as typeof stat & {
        ifaceName?: string;
        interface?: string;
        rxBytes?: number;
        txBytes?: number;
      };

      return [
        candidate.iface || candidate.ifaceName || candidate.interface || "unknown",
        {
          rx: candidate.rx_bytes ?? candidate.rxBytes ?? 0,
          tx: candidate.tx_bytes ?? candidate.txBytes ?? 0,
        },
      ] as const;
    })
  );

  const nextInterfaces: InterfaceCounter = {};
  const interfaces = networkInterfaces
    .map((item) => {
      const stats = statsByName.get(item.iface) ?? { rx: 0, tx: 0 };
      const previous = previousInterfaces[item.iface];
      const at = Date.now();
      const seconds = previous ? (at - previous.at) / 1000 : 0;
      const rxBps = seconds > 0 ? Math.max(0, ((stats.rx - previous.rx) * 8) / seconds) : 0;
      const txBps = seconds > 0 ? Math.max(0, ((stats.tx - previous.tx) * 8) / seconds) : 0;

      nextInterfaces[item.iface] = { rx: stats.rx, tx: stats.tx, at };

      return {
        name: item.iface,
        ip4: item.ip4 || "",
        mac: item.mac || "",
        speedMbps: typeof item.speed === "number" && Number.isFinite(item.speed) ? item.speed : null,
        driver: item.type || "",
        rxBytes: stats.rx,
        txBytes: stats.tx,
        rxBps,
        txBps,
      };
    })
    .filter((item) => item.ip4 || item.mac || item.rxBytes > 0 || item.txBytes > 0);

  const totals = interfaces.reduce(
    (acc, item) => {
      acc.rx += item.rxBytes;
      acc.tx += item.txBytes;
      acc.downloadBps += item.rxBps;
      acc.uploadBps += item.txBps;
      return acc;
    },
    { rx: 0, tx: 0, downloadBps: 0, uploadBps: 0 }
  );

  const now = Date.now();
  const elapsed = previousAggregate ? (now - previousAggregate.at) / 1000 : 0;
  const currentDownloadBps =
    elapsed > 0 && previousAggregate
      ? Math.max(totals.downloadBps, ((totals.rx - previousAggregate.rx) * 8) / elapsed)
      : totals.downloadBps;
  const currentUploadBps =
    elapsed > 0 && previousAggregate
      ? Math.max(totals.uploadBps, ((totals.tx - previousAggregate.tx) * 8) / elapsed)
      : totals.uploadBps;

  return {
    snapshot: {
      primaryInterface: pickPrimaryInterface(interfaces, preferredPrimary),
      interfaces,
      currentUploadBps,
      currentDownloadBps,
      peakUploadBps: 0,
      peakDownloadBps: 0,
      totalTxBytes: totals.tx,
      totalRxBytes: totals.rx,
    },
    nextAggregate: { rx: totals.rx, tx: totals.tx, at: now },
    nextInterfaces,
  };
}

export function buildOverview(input: Pick<DashboardSnapshot, "cpu" | "memory" | "storage" | "services" | "meta">) {
  const notes: string[] = [];
  let level: HealthLevel = "healthy";
  const raiseWarning = () => {
    if (level !== "critical") {
      level = "warning";
    }
  };

  if (input.meta.dockerError) {
    notes.push("Docker telemetry is unavailable.");
    raiseWarning();
  }

  if (input.cpu.load >= 85) {
    notes.push(`CPU load is elevated at ${input.cpu.load.toFixed(0)}%.`);
    level = "critical";
  } else if (input.cpu.load >= 65) {
    notes.push(`CPU load is running warm at ${input.cpu.load.toFixed(0)}%.`);
    raiseWarning();
  }

  if ((input.cpu.temp ?? 0) >= 80) {
    notes.push(`CPU temperature is ${input.cpu.temp?.toFixed(1)}°C.`);
    level = "critical";
  } else if ((input.cpu.temp ?? 0) >= 70) {
    notes.push(`CPU temperature is climbing at ${input.cpu.temp?.toFixed(1)}°C.`);
    raiseWarning();
  }

  if (input.memory.usedPct >= 88) {
    notes.push(`Memory usage is high at ${input.memory.usedPct.toFixed(0)}%.`);
    level = "critical";
  } else if (input.memory.usedPct >= 75) {
    notes.push(`Memory usage is above target at ${input.memory.usedPct.toFixed(0)}%.`);
    raiseWarning();
  }

  const fullestDisk = input.storage.disks.reduce<{ mount: string; usagePct: number } | null>(
    (current, disk) => {
      if (!current || disk.usagePct > current.usagePct) {
        return { mount: disk.mount, usagePct: disk.usagePct };
      }
      return current;
    },
    null
  );

  if ((fullestDisk?.usagePct ?? 0) >= 92) {
    notes.push(`${fullestDisk?.mount} is nearly full at ${fullestDisk?.usagePct.toFixed(0)}%.`);
    level = "critical";
  } else if ((fullestDisk?.usagePct ?? 0) >= 80) {
    notes.push(`${fullestDisk?.mount} is reaching capacity at ${fullestDisk?.usagePct.toFixed(0)}%.`);
    raiseWarning();
  }

  const stopped = input.services.filter((service) => service.health === "stopped").length;
  const errored = input.services.filter((service) => service.health === "error").length;
  const partial = input.services.filter((service) => service.health === "partial").length;

  if (errored > 0) {
    notes.push(`${errored} service module${errored === 1 ? "" : "s"} could not be inspected.`);
    level = "critical";
  } else if (partial > 0) {
    notes.push(`${partial} service module${partial === 1 ? "" : "s"} are only partially up.`);
    raiseWarning();
  } else if (stopped > 0) {
    notes.push(`${stopped} service module${stopped === 1 ? "" : "s"} are currently stopped.`);
  }

  if (input.meta.configWarnings.length > 0) {
    notes.push(...input.meta.configWarnings);
    raiseWarning();
  }

  if (notes.length === 0) {
    notes.push("Everything looks stable across system load, storage, and service health.");
  }

  const statusLevel = level as HealthLevel;
  const labelMap: Record<HealthLevel, string> = {
    healthy: "Stable",
    warning: "Needs Attention",
    critical: "Action Recommended",
  };

  return {
    level: statusLevel,
    label: labelMap[statusLevel],
    notes,
  };
}

function createEmptySnapshot(): DashboardSnapshot {
  return {
    meta: {
      hostname: os.hostname(),
      platform: "Unknown platform",
      kernel: "Unknown kernel",
      node: process.version.replace(/^v/, ""),
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      now: new Date().toISOString(),
      fastRefreshMs: appConfig.telemetryFastMs,
      slowRefreshMs: appConfig.telemetrySlowMs,
      lastFastRefreshAt: null,
      lastSlowRefreshAt: null,
      dockerError: null,
      connectionState: "degraded",
      hostTelemetry: false,
      configWarnings: [],
    },
    overview: {
      level: "warning",
      label: "Starting",
      notes: ["Telemetry is warming up."],
    },
    cpu: {
      model: "Unknown CPU",
      cores: 0,
      load: 0,
      temp: null,
    },
    memory: {
      totalBytes: 0,
      usedBytes: 0,
      freeBytes: 0,
      totalLabel: "0 B",
      usedLabel: "0 B",
      freeLabel: "0 B",
      usedPct: 0,
    },
    uptime: {
      boot: new Date().toISOString(),
      uptimeSec: 0,
    },
    storage: {
      disks: [],
      totalCount: 0,
      fullestMount: null,
    },
    network: {
      primaryInterface: null,
      interfaces: [],
      currentUploadBps: 0,
      currentDownloadBps: 0,
      peakUploadBps: 0,
      peakDownloadBps: 0,
      totalTxBytes: 0,
      totalRxBytes: 0,
    },
    docker: {
      count: 0,
      running: 0,
      stopped: 0,
      error: null,
      containers: [],
    },
    services: [],
    history: {
      labels: [],
      cpuLoad: [],
      memoryUsedPct: [],
      uploadBps: [],
      downloadBps: [],
    },
  };
}

class TelemetryManager {
  private snapshot = createEmptySnapshot();
  private emitter = new EventEmitter();
  private started = false;
  private bootPromise: Promise<void> | null = null;
  private fastTimer: ReturnType<typeof setInterval> | null = null;
  private slowTimer: ReturnType<typeof setInterval> | null = null;
  private aggregateCounter: AggregateCounter | null = null;
  private interfaceCounters: InterfaceCounter = {};
  private peaks = { upload: 0, download: 0 };
  private hostTelemetry = false;

  private emit() {
    this.snapshot.overview = buildOverview(this.snapshot);
    this.emitter.emit("snapshot", structuredClone(this.snapshot));
  }

  private async ensureStarted() {
    if (this.started) {
      return;
    }

    if (!this.bootPromise) {
      this.bootPromise = (async () => {
        const [osInfo, versions] = await Promise.all([si.osInfo(), si.versions()]);
        const hostIdentity = await readHostIdentity();
        this.hostTelemetry = hostIdentity.enabled;
        this.snapshot.meta.hostname = hostIdentity.hostname || os.hostname();
        this.snapshot.meta.platform = hostIdentity.platform || `${osInfo.distro || "Unknown OS"} ${osInfo.release || ""}`.trim();
        this.snapshot.meta.kernel = hostIdentity.kernel || osInfo.kernel || "Unknown kernel";
        this.snapshot.meta.node = versions.node || process.version.replace(/^v/, "");
        this.snapshot.meta.connectionState = "live";
        this.snapshot.meta.hostTelemetry = hostIdentity.enabled;

        await Promise.all([this.refreshFast(), this.refreshSlow()]);

        this.fastTimer = setInterval(() => {
          void this.refreshFast();
        }, appConfig.telemetryFastMs);
        this.slowTimer = setInterval(() => {
          void this.refreshSlow();
        }, appConfig.telemetrySlowMs);
        this.started = true;
      })();
    }

    await this.bootPromise;
  }

  private async refreshFast() {
    const [cpu, load, mem, temp, time, hostStorage, hostUptimeSec, preferredPrimary] = await Promise.all([
      si.cpu(),
      si.currentLoad(),
      si.mem(),
      si.cpuTemperature(),
      si.time(),
      readHostStorage(),
      readHostUptimeSeconds(),
      readHostPrimaryInterface(),
    ]);
    const network = await getNetworkSnapshot(this.aggregateCounter, this.interfaceCounters, preferredPrimary);

    const memUsed = mem.active ?? mem.used ?? mem.total - mem.available;
    const memoryUsedPct = mem.total > 0 ? (memUsed / mem.total) * 100 : 0;
    const disks =
      hostStorage ??
      (await si.fsSize()).map((disk) => ({
        mount: disk.mount,
        sizeBytes: disk.size,
        usedBytes: disk.used,
        freeBytes: Math.max(disk.size - disk.used, 0),
        usagePct: typeof disk.use === "number" ? disk.use : disk.size > 0 ? (disk.used / disk.size) * 100 : 0,
        sizeLabel: formatBytes(disk.size),
        usedLabel: formatBytes(disk.used),
        freeLabel: formatBytes(Math.max(disk.size - disk.used, 0)),
      }));

    this.aggregateCounter = network.nextAggregate;
    this.interfaceCounters = network.nextInterfaces;
    this.peaks.upload = Math.max(this.peaks.upload, network.snapshot.currentUploadBps);
    this.peaks.download = Math.max(this.peaks.download, network.snapshot.currentDownloadBps);

    this.snapshot.meta.now = new Date().toISOString();
    this.snapshot.meta.lastFastRefreshAt = this.snapshot.meta.now;
    this.snapshot.meta.hostTelemetry = this.hostTelemetry;
    this.snapshot.cpu = {
      model: cpu.brand || cpu.manufacturer || "Unknown CPU",
      cores: cpu.cores,
      load: Number(load.currentLoad.toFixed(1)),
      temp: typeof temp.main === "number" ? Number(temp.main.toFixed(1)) : null,
    };
    this.snapshot.memory = {
      totalBytes: mem.total,
      usedBytes: memUsed,
      freeBytes: mem.available,
      totalLabel: formatBytes(mem.total),
      usedLabel: formatBytes(memUsed),
      freeLabel: formatBytes(mem.available),
      usedPct: Number(memoryUsedPct.toFixed(1)),
    };
    const timeData = time as typeof time & { boot?: number };
    const uptimeSec = hostUptimeSec ?? Number(time.uptime || 0);
    this.snapshot.uptime = {
      boot:
        typeof timeData.boot === "number" && hostUptimeSec === null
          ? new Date(timeData.boot * 1000).toISOString()
          : new Date(Date.now() - uptimeSec * 1000).toISOString(),
      uptimeSec,
    };
    this.snapshot.storage = {
      disks,
      totalCount: disks.length,
      fullestMount: disks.slice().sort((left, right) => right.usagePct - left.usagePct)[0]?.mount ?? null,
    };
    this.snapshot.network = {
      ...network.snapshot,
      peakUploadBps: this.peaks.upload,
      peakDownloadBps: this.peaks.download,
    };

    const label = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
    pushLabel(this.snapshot.history.labels, label);
    pushPoint(this.snapshot.history.cpuLoad, this.snapshot.cpu.load);
    pushPoint(this.snapshot.history.memoryUsedPct, this.snapshot.memory.usedPct);
    pushPoint(this.snapshot.history.uploadBps, this.snapshot.network.currentUploadBps);
    pushPoint(this.snapshot.history.downloadBps, this.snapshot.network.currentDownloadBps);

    this.emit();
  }

  private async refreshSlow() {
    const [docker, services] = await Promise.all([
      listDockerContainers(),
      Promise.all(
        serviceRegistry.map(async (service) => {
          const { modulePath, envPath } = getServicePaths(service);
          const [moduleExists, hasEnv, envText] = await Promise.all([
            pathExists(modulePath),
            pathExists(envPath),
            readText(envPath),
          ]);

          if (!moduleExists) {
            return {
              id: service.id,
              label: service.label,
              description: service.description,
              modulePath,
              envPath,
              composeProject: service.composeProject,
              definedServices: [],
              runningServices: [],
              running: false,
              hasEnv,
              health: "error",
              details: ["Module directory is missing or not mounted into the dashboard container."],
              app: resolveServiceApp(service, envText),
            } satisfies ServiceSnapshot;
          }

          return inspectService(service, envText, hasEnv);
        })
      ),
    ]);
    const runtimeStatus = await buildRuntimeStatus({
      dockerError: docker.error,
      hostTelemetry: this.hostTelemetry,
    });

    this.snapshot.meta.lastSlowRefreshAt = new Date().toISOString();
    this.snapshot.meta.dockerError = docker.error;
    this.snapshot.meta.connectionState = docker.error ? "degraded" : "live";
    this.snapshot.meta.configWarnings = runtimeStatus.warnings;
    this.snapshot.docker = docker;
    this.snapshot.services = services;
    this.emit();
  }

  async getSnapshot() {
    await this.ensureStarted();
    return structuredClone(this.snapshot);
  }

  async subscribe(listener: (snapshot: DashboardSnapshot) => void) {
    await this.ensureStarted();
    this.emitter.on("snapshot", listener);
    return () => {
      this.emitter.off("snapshot", listener);
    };
  }
}

declare global {
  var __bigredpiTelemetry__: TelemetryManager | undefined;
}

function getManager() {
  if (!globalThis.__bigredpiTelemetry__) {
    globalThis.__bigredpiTelemetry__ = new TelemetryManager();
  }

  return globalThis.__bigredpiTelemetry__;
}

export async function getDashboardSnapshot() {
  return getManager().getSnapshot();
}

export async function subscribeToSnapshots(listener: (snapshot: DashboardSnapshot) => void) {
  return getManager().subscribe(listener);
}
