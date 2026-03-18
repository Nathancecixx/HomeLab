import path from "node:path";

import { appConfig } from "@/lib/config";
import { parseEnvText } from "@/lib/env";
import type { ServiceDeviceEntry, ServiceRegistryEntry } from "@/lib/types";

function withDefaultPort(value: string | undefined, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function appLinkFromUrl(urlValue: string, label: string) {
  const url = new URL(urlValue);
  return {
    label,
    protocol: url.protocol === "https:" ? "https" : "http",
    host: url.hostname,
    port: withDefaultPort(url.port, url.protocol === "https:" ? 443 : 80),
    path: url.pathname || "/",
  } as const;
}

export const serviceDeviceRegistry: ServiceDeviceEntry[] = [
  {
    id: "bigredpi",
    label: "BigRedPi",
  },
  {
    id: "workstation",
    label: "Workstation",
    host: "192.168.40.94",
  },
];

export const serviceRegistry: ServiceRegistryEntry[] = [
  {
    id: "wireguard",
    label: "WireGuard VPN",
    description: "Encrypted remote access into the LAN.",
    kind: "compose",
    deviceId: "bigredpi",
    directoryName: "vpn-wireguard",
    envFileName: ".env",
    composeProject: "vpn-wireguard",
    actions: ["start", "stop", "restart"],
  },
  {
    id: "nextcloud",
    label: "Nextcloud",
    description: "Personal cloud storage and sync surface.",
    kind: "compose",
    deviceId: "bigredpi",
    directoryName: "nextcloud",
    envFileName: ".env",
    composeProject: "nextcloud",
    actions: ["start", "stop", "restart"],
    appResolver: (env) => ({
      label: "Open Nextcloud",
      port: withDefaultPort(env.HTTP_PORT, 8081),
      protocol: "http",
    }),
  },
  {
    id: "bitcoind",
    label: "Bitcoin Node",
    description: "Core blockchain node with private RPC exposure.",
    kind: "compose",
    deviceId: "bigredpi",
    directoryName: "node-bitcoin",
    envFileName: ".env",
    composeProject: "node-bitcoin",
    actions: ["start", "stop", "restart"],
  },
  {
    id: "fitnesspal",
    label: "Fitness Pal",
    description: "Personalized AI training coach.",
    kind: "compose",
    deviceId: "bigredpi",
    directoryName: "../external/FitnessPal",
    envFileName: ".env",
    composeProject: "fitnesspal",
    actions: ["start", "stop", "restart"],
    appResolver: () => ({
      label: "Open App",
      port: 8080,
      protocol: "http",
    }),
  },
  {
    id: "openwebui",
    label: "Open WebUI",
    description: "Remote chat surface on the workstation.",
    kind: "http",
    deviceId: "workstation",
    composeProject: "open-webui",
    actions: [],
    monitorUrl: "http://192.168.40.94:3000/",
    appResolver: () => appLinkFromUrl("http://192.168.40.94:3000/", "Open App"),
  },
  {
    id: "ollama",
    label: "Ollama",
    description: "Remote model runtime served from the workstation.",
    kind: "http",
    deviceId: "workstation",
    composeProject: "ollama",
    actions: [],
    monitorUrl: "http://192.168.40.94:11434/",
  },
];

export function getServiceById(id: string) {
  return serviceRegistry.find((service) => service.id === id) ?? null;
}

export function getServiceDeviceById(id: string) {
  return serviceDeviceRegistry.find((device) => device.id === id) ?? null;
}

export function resolveServiceDevice(service: Pick<ServiceRegistryEntry, "deviceId">): ServiceDeviceEntry {
  return getServiceDeviceById(service.deviceId) ?? {
    id: service.deviceId,
    label: service.deviceId,
  };
}

export function getServicePaths(service: ServiceRegistryEntry) {
  if (!service.directoryName || !service.envFileName) {
    return { modulePath: null, envPath: null };
  }

  const modulePath = path.join(appConfig.homelabRoot, service.directoryName);
  const envPath = path.join(modulePath, service.envFileName);
  return { modulePath, envPath };
}

export function resolveServiceApp(service: ServiceRegistryEntry, envText: string) {
  if (!service.appResolver) {
    return null;
  }

  return service.appResolver(parseEnvText(envText));
}
