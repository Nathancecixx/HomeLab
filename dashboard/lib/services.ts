import path from "node:path";

import { appConfig } from "@/lib/config";
import { parseEnvText } from "@/lib/env";
import type { ServiceRegistryEntry } from "@/lib/types";

function withDefaultPort(value: string | undefined, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export const serviceRegistry: ServiceRegistryEntry[] = [
  {
    id: "wireguard",
    label: "WireGuard VPN",
    description: "Encrypted remote access into the LAN.",
    directoryName: "vpn-wireguard",
    envFileName: ".env",
    composeProject: "vpn-wireguard",
    actions: ["start", "stop", "restart"],
  },
  {
    id: "nextcloud",
    label: "Nextcloud",
    description: "Personal cloud storage and sync surface.",
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
    directoryName: "node-bitcoin",
    envFileName: ".env",
    composeProject: "node-bitcoin",
    actions: ["start", "stop", "restart"],
  },
  {
    id: "zim",
    label: "Offline Knowledge",
    description: "Kiwix server with local ZIM collections.",
    directoryName: "zim-server",
    envFileName: ".env",
    composeProject: "zim-server",
    actions: ["start", "stop", "restart"],
    appResolver: () => ({
      label: "Open Library",
      port: 8082,
      protocol: "http",
    }),
  },
];

export function getServiceById(id: string) {
  return serviceRegistry.find((service) => service.id === id) ?? null;
}

export function getServicePaths(service: ServiceRegistryEntry) {
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
