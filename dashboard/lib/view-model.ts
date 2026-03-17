import type { HealthLevel, ServiceHealth, ServiceSnapshot } from "@/lib/types";

export type Tone = "neutral" | "accent" | "good" | "warning" | "danger";

export function formatBytes(value: number) {
  const units = ["B", "KiB", "MiB", "GiB", "TiB"];
  let amount = value;
  let unitIndex = 0;

  while (amount >= 1024 && unitIndex < units.length - 1) {
    amount /= 1024;
    unitIndex += 1;
  }

  return `${amount.toFixed(amount >= 10 || unitIndex === 0 ? 1 : 2)} ${units[unitIndex]}`;
}

export function formatBitsPerSecond(value: number) {
  const units = ["bps", "Kbps", "Mbps", "Gbps"];
  let amount = value;
  let unitIndex = 0;

  while (amount >= 1000 && unitIndex < units.length - 1) {
    amount /= 1000;
    unitIndex += 1;
  }

  return `${amount.toFixed(amount >= 10 || unitIndex === 0 ? 1 : 2)} ${units[unitIndex]}`;
}

export function formatDuration(seconds: number) {
  const total = Math.max(0, Math.floor(seconds));
  const days = Math.floor(total / 86400);
  const hours = Math.floor((total % 86400) / 3600);
  const minutes = Math.floor((total % 3600) / 60);

  return `${days ? `${days}d ` : ""}${hours}h ${minutes}m`;
}

export function formatPercent(value: number, digits = 0) {
  return `${value.toFixed(digits)}%`;
}

export function formatSignedNumber(value: number, digits = 0) {
  if (value === 0) {
    return "0";
  }

  return `${value > 0 ? "+" : "-"}${Math.abs(value).toFixed(digits)}`;
}

export function formatClock(value: string | null) {
  if (!value) {
    return "--:--";
  }

  return new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

export function formatDateTime(value: string | null) {
  if (!value) {
    return "Not written";
  }

  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

export function levelLabel(level: HealthLevel) {
  return level === "healthy" ? "OK" : level === "warning" ? "Warn" : "Critical";
}

export function serviceLabel(health: ServiceHealth) {
  if (health === "running") {
    return "Live";
  }

  if (health === "partial") {
    return "Partial";
  }

  if (health === "stopped") {
    return "Idle";
  }

  return "Error";
}

export function toneForHealth(level: HealthLevel): Tone {
  if (level === "healthy") {
    return "good";
  }

  if (level === "warning") {
    return "warning";
  }

  return "danger";
}

export function toneForService(health: ServiceHealth): Tone {
  if (health === "running") {
    return "good";
  }

  if (health === "partial") {
    return "warning";
  }

  return "danger";
}

export function toneForUsage(value: number): Tone {
  if (value >= 90) {
    return "danger";
  }

  if (value >= 75) {
    return "warning";
  }

  return "good";
}

export function getSeriesDelta(values: number[]) {
  if (values.length < 2) {
    return 0;
  }

  return values[values.length - 1]! - values[0]!;
}

export function getPeak(values: number[]) {
  return values.length === 0 ? 0 : Math.max(...values);
}

export function buildAppHref(service: ServiceSnapshot, hostname: string) {
  if (!service.app) {
    return null;
  }

  const path = service.app.path ?? "/";
  return `${service.app.protocol}://${hostname}:${service.app.port}${path}`;
}

export function getServiceIssueLabel(service: ServiceSnapshot) {
  if (service.health !== "error") {
    return null;
  }

  const details = service.details.join(" ").toLowerCase();

  if (details.includes("directory is missing") || details.includes("not mounted")) {
    return "Module missing";
  }

  if (!service.hasEnv && (details.includes("variable is not set") || details.includes("invalid proto") || details.includes(".env"))) {
    return "Config missing";
  }

  if (details.includes("variable is not set")) {
    return "Unset variables";
  }

  if (details.includes("invalid proto") || details.includes("compose")) {
    return "Compose error";
  }

  return "Inspect failed";
}
