export type HealthLevel = "healthy" | "warning" | "critical";
export type ServiceHealth = "running" | "partial" | "stopped" | "error";
export type ServiceKind = "compose" | "http";
export type ThemeMode = "dark" | "light";
export type AdminAction = "start" | "stop" | "restart";
export type RuntimeCheckId = "auth" | "docker" | "telemetry" | "wol";

export interface ServiceAppLink {
  label: string;
  port: number;
  protocol: "http" | "https";
  host?: string;
  path?: string;
}

export interface ServiceDeviceEntry {
  id: string;
  label: string;
  host?: string;
}

export interface ServiceRegistryEntry {
  kind?: ServiceKind;
  id: string;
  label: string;
  description: string;
  deviceId: string;
  directoryName?: string;
  envFileName?: string;
  composeProject: string;
  actions: AdminAction[];
  monitorUrl?: string;
  appResolver?: (env: Record<string, string>) => ServiceAppLink | null;
}

export interface ServiceSnapshot {
  kind: ServiceKind;
  id: string;
  label: string;
  description: string;
  device: ServiceDeviceEntry;
  modulePath: string | null;
  envPath: string | null;
  composeProject: string;
  definedServices: string[];
  runningServices: string[];
  actions: AdminAction[];
  running: boolean;
  supportsEnvFile: boolean;
  hasEnv: boolean;
  health: ServiceHealth;
  statusLabel?: string;
  details: string[];
  monitorUrl: string | null;
  app: ServiceAppLink | null;
}

export interface ContainerSnapshot {
  name: string;
  image: string;
  status: string;
  ports: string;
  up: boolean;
}

export interface DockerSnapshot {
  count: number;
  running: number;
  stopped: number;
  error: string | null;
  containers: ContainerSnapshot[];
}

export interface DiskSnapshot {
  mount: string;
  sizeBytes: number;
  usedBytes: number;
  freeBytes: number;
  usagePct: number;
  sizeLabel: string;
  usedLabel: string;
  freeLabel: string;
}

export interface NetworkInterfaceSnapshot {
  name: string;
  ip4: string;
  mac: string;
  speedMbps: number | null;
  driver: string;
  rxBytes: number;
  txBytes: number;
  rxBps: number;
  txBps: number;
}

export interface NetworkSnapshot {
  primaryInterface: string | null;
  interfaces: NetworkInterfaceSnapshot[];
  currentUploadBps: number;
  currentDownloadBps: number;
  peakUploadBps: number;
  peakDownloadBps: number;
  totalTxBytes: number;
  totalRxBytes: number;
}

export interface MetricHistory {
  labels: string[];
  cpuLoad: number[];
  memoryUsedPct: number[];
  uploadBps: number[];
  downloadBps: number[];
}

export interface RuntimeCheck {
  id: RuntimeCheckId;
  label: string;
  ok: boolean;
  detail: string;
}

export interface RuntimeStatus {
  warnings: string[];
  checks: RuntimeCheck[];
  hostTelemetry: boolean;
  dashboardEnvPath: string;
  wolTargetCount: number;
}

export interface WolTarget {
  id: string;
  label: string;
  mac: string;
  ip: string | null;
  broadcast: string;
  port: number;
}

export interface WolConfigSnapshot {
  targets: WolTarget[];
  errors: string[];
}

export interface WolWakeResult {
  id: string;
  label: string;
  ok: boolean;
  sentTo: string;
  port: number;
  executedAt: string;
  error?: string;
}

export interface DashboardSnapshot {
  meta: {
    hostname: string;
    platform: string;
    kernel: string;
    node: string;
    timeZone: string;
    now: string;
    fastRefreshMs: number;
    slowRefreshMs: number;
    lastFastRefreshAt: string | null;
    lastSlowRefreshAt: string | null;
    dockerError: string | null;
    connectionState: "live" | "degraded";
    hostTelemetry: boolean;
    configWarnings: string[];
  };
  overview: {
    level: HealthLevel;
    label: string;
    notes: string[];
  };
  cpu: {
    model: string;
    cores: number;
    load: number;
    temp: number | null;
  };
  memory: {
    totalBytes: number;
    usedBytes: number;
    freeBytes: number;
    totalLabel: string;
    usedLabel: string;
    freeLabel: string;
    usedPct: number;
  };
  uptime: {
    boot: string;
    uptimeSec: number;
  };
  storage: {
    disks: DiskSnapshot[];
    totalCount: number;
    fullestMount: string | null;
  };
  network: NetworkSnapshot;
  docker: DockerSnapshot;
  services: ServiceSnapshot[];
  history: MetricHistory;
}

export interface EnvFileSnapshot {
  path: string;
  exists: boolean;
  text: string;
  modifiedAt: string | null;
}

export interface AdminActionResult {
  ok: boolean;
  action: AdminAction;
  serviceId: string;
  stdout: string;
  stderr: string;
  exitCode: number | null;
  executedAt: string;
}

export interface SessionPayload {
  role: "admin";
  iat: number;
  exp: number;
}
