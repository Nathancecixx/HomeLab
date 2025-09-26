import path from "node:path";

const HOMELAB_ROOT = process.env.HOMELAB_ROOT || path.resolve(process.cwd(), "..");

// Helper for consistent absolute paths
const R = (...p) => path.join(HOMELAB_ROOT, ...p);

export const SERVICES = [
  {
    id: "wireguard",
    label: "WireGuard VPN",
    dir: R("vpn-wireguard"),
    envPath: R("vpn-wireguard", ".env"),
    project: "vpn-wireguard",
    make: { start: "up", stop: "down", restart: "restart" },
  },
  {
    id: "nextcloud",
    label: "Nextcloud",
    dir: R("nextcloud"),
    envPath: R("nextcloud", ".env"),
    project: "cloud-nextcloud",
    make: { start: "up", stop: "down", restart: "restart" },
  },
  {
    id: "zim",
    label: "Zim Server",
    dir: R("zim-server"),
    envPath: R("zim-server", ".env"),
    project: "kiwix",
    make: { start: "up", stop: "down", restart: "restart" },
  },
];

export function getService(id) {
  return SERVICES.find((s) => s.id === id);
}
