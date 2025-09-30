# BigRedPi Homelab (Raspberry Pi 5)

> **Modular home server.** Pick the pieces you want; skip the rest. Every module here is **optional** and can be run independently:
>
> * **Dashboard** (Node/Express) — live Pi stats & Docker visibility (LAN/VPN‑only)
> * **WireGuard VPN** (Docker) — secure remote access into your LAN
> * **Bitcoin Core** (Docker) — pruned/full node with optional **Tor** sidecar for onion P2P
> * **Nextcloud** (Docker) — personal cloud (LAN/VPN‑only)
> * **Storage Pool (mergerfs + SnapRAID)** — simple, grow‑as‑you‑go pooled storage across multiple USB SSDs with optional parity/bit‑rot protection
> * **Offline Knowledge (ZIM Server)** — local **Kiwix** server for offline Wikipedia, Wiktionary, etc. (LAN/VPN‑only)
>
> Security by default: **only UDP 51820 (WireGuard)** is exposed via router port‑forward. All other web UIs are **LAN/VPN‑only**.

<div align="center">

[![Raspberry Pi](https://img.shields.io/badge/Raspberry%20Pi-5-red?logo=raspberrypi\&logoColor=white)](https://www.raspberrypi.com/)
[![Raspberry Pi OS](https://img.shields.io/badge/OS-Bookworm-77AAFF?style=for-the-badge\&logo=debian\&logoColor=white)](https://www.raspberrypi.com/software/)
[![Node.js ≥ 20](https://img.shields.io/badge/Node.js-%E2%89%A520-43853D?style=for-the-badge\&logo=node.js\&logoColor=white)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express-4.x-black?style=for-the-badge\&logo=express\&logoColor=white)](https://expressjs.com/)
[![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?style=for-the-badge\&logo=docker\&logoColor=white)](https://docs.docker.com/compose/)
[![WireGuard](https://img.shields.io/badge/WireGuard-88171A?style=for-the-badge\&logo=wireguard\&logoColor=white)](https://www.wireguard.com/)
[![Bitcoin Core](https://img.shields.io/badge/Bitcoin%20Core-FF9900?style=for-the-badge\&logo=bitcoin\&logoColor=white)](https://bitcoincore.org/)
[![Tor](https://img.shields.io/badge/Tor-7D4698?style=for-the-badge\&logo=torproject\&logoColor=white)](https://torproject.org)
[![Nextcloud](https://img.shields.io/badge/Nextcloud-0082C9?style=for-the-badge\&logo=nextcloud\&logoColor=white)](https://nextcloud.com)
[![mergerfs](https://img.shields.io/badge/mergerfs-pooling-6E7B8B?style=for-the-badge)](https://github.com/trapexit/mergerfs)
[![SnapRAID](https://img.shields.io/badge/SnapRAID-parity%20%2B%20scrub-2E8B57?style=for-the-badge)](https://www.snapraid.it/)
[![Kiwix](https://img.shields.io/badge/Kiwix-ZIM%20server-0f6db3?style=for-the-badge)](https://kiwix.org)

</div>

---

## Project Overview

![Dashboard Screenshot](docs/screenshot-dashboard.png)

### Key Features

* **Modular by design**: start with **Dashboard + VPN**; add **Bitcoin Core**, **Nextcloud**, **Offline Knowledge**, and/or the **Storage Pool** later. You can run **any subset** of modules.
* **Secure defaults**: LAN/VPN‑only web UIs, strong `.env` secrets, no public HTTP ports.
* **Clean UI**: SSE‑powered dashboard—live CPU/temp, memory, disks, Docker containers.
* **Easy VPN**: containerized WireGuard with QR codes for mobile peers.
* **Bitcoiner‑ready**: pruned or full node, optional Tor onion service for P2P; RPC stays private on LAN/VPN.
* **Grow‑as‑you‑go storage**: **mergerfs** pools mismatched SSDs into one path; add **SnapRAID** for nightly parity and bit‑rot scrubbing.
* **Offline knowledge**: host **Kiwix** with Wikipedia/Wiktionary/etc. ZIMs; browse locally at `:8082`.

---

## Technology Stack

[Badges omitted here; see header.]

**Dependencies**

* Node ≥ 20, Docker Engine + Compose, UFW
* Dashboard server deps: `express`, `helmet`, `compression`, `morgan`, `systeminformation`

---

## Repository Layout

```
repo/
├─ package.json              # name: bigredpi-dashboard; start -> node server.js
├─ server.js                 # Express server (serves ./public + SSE /api/stream)
├─ index.html  style.css  app.js  # UI (should live under ./public/)
├─ dashboard.service         # systemd unit (edit user/paths)
├─ docker-compose.yml        # Compose for all modules (pick the services you want)
├─ Dockerfile  torrc  start-tor.sh  # Tor sidecar for Bitcoin Core onion P2P
├─ .env                      # Per-module env snippets (examples below)
├─ Makefile                  # Optional convenience targets
└─ docs/screenshot-dashboard.png
```

> **Important:** `server.js` serves **`./public`** — create that folder and move `index.html`, `style.css`, and `app.js` into it.

---

## Prerequisites

* Raspberry Pi 5, Raspberry Pi OS (Bookworm, 64‑bit), SSH enabled
* Ethernet to router; reserve a DHCP lease (e.g., `192.168.40.45`)
* Ability to port‑forward **UDP 51820** on your router → the Pi
* (Optional) DDNS hostname (DuckDNS/No‑IP/Cloudflare)

---

# Getting Started (Pi 5)

This section gets you from a fresh Raspberry Pi OS (64‑bit, Bookworm) to a secure, LAN/VPN‑only homelab with:

* **Docker + Compose**, **Node 20** for the dashboard
* A **locked‑down UFW firewall** (LAN/VPN only for web UIs; only WireGuard is router‑exposed)
* **Pooled USB storage** via mergerfs (grow‑as‑you‑go)
* **Optional parity** & bit‑rot protection via SnapRAID

It’s written to work “as‑is” on a Pi 5. Adjust usernames, paths, and subnets to match your network.

---

## 0) Prereqs

* Raspberry Pi OS (Bookworm, 64‑bit), SSH enabled
* Static DHCP lease (example: `192.168.40.45`)
* A user (examples below use `$USER` and `/home/$USER/bigredpi`)
* Ability to **port‑forward UDP 51820** on your router → Pi (for WireGuard only)

> **Tip:** If you’ll run SnapRAID later, plan a **dedicated parity disk** that’s **≥ your largest data disk**.

---

## 1) Get the files onto the Pi

```bash
# Install git
sudo apt update
sudo apt install git
# Clone the repo
git clone https://github.com/Nathancecixx/HomeLab.git
```

---

## 2) Install system dependencies (Docker, Compose, Node 20, tools)

```bash
# base packages
sudo apt update
sudo apt install -y ca-certificates curl gnupg lsb-release ufw jq htop net-tools

# Docker Engine + Compose plugin
curl -fsSL https://get.docker.com | sh

# Node.js 20 (for the dashboard)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Storage tooling (install now even if you’ll enable later)
sudo apt install -y mergerfs snapraid
```
```bash
# let your user run docker (log out/in afterward)
sudo usermod -aG docker $USER
```

---

## 3) Harden the firewall (UFW) — LAN/VPN‑only web UIs

Set your subnets up front (adjust to taste):

```bash
LAN_SUBNET=192.168.40.0/24
WG_SUBNET=10.10.250.0/24      # must match docker .env INTERNAL_SUBNET
WG_PORT=51820
```

Baseline policy + rules:

```bash
# default policy
sudo ufw --force reset
sudo ufw default deny incoming
sudo ufw default allow outgoing

# SSH (rate‑limited)
sudo ufw limit 22/tcp

# WireGuard (public):
sudo ufw allow ${WG_PORT}/udp

# Dashboard (8080), Nextcloud (8081), Kiwix (8082) — LAN + VPN only
sudo ufw allow from ${LAN_SUBNET} to any port 8080 proto tcp
sudo ufw allow from ${WG_SUBNET}  to any port 8080 proto tcp
sudo ufw allow from ${LAN_SUBNET} to any port 8081 proto tcp
sudo ufw allow from ${WG_SUBNET}  to any port 8081 proto tcp
sudo ufw allow from ${LAN_SUBNET} to any port 8082 proto tcp
sudo ufw allow from ${WG_SUBNET}  to any port 8082 proto tcp

# Bitcoin P2P (8333) — LAN/VPN only (do NOT forward on router unless you choose to serve)
sudo ufw allow from ${LAN_SUBNET} to any port 8333 proto tcp
sudo ufw allow from ${WG_SUBNET}  to any port 8333 proto tcp

# Tor SOCKS (9050) — LAN/VPN only
sudo ufw allow from ${LAN_SUBNET} to any port 9050 proto tcp
sudo ufw allow from ${WG_SUBNET}  to any port 9050 proto tcp

sudo ufw enable
sudo ufw status numbered
```

### Make Docker respect UFW (important)

Docker’s published ports bypass UFW unless you add rules to the `DOCKER-USER` chain. The following keeps **all** container ports reachable only from LAN/VPN:

```bash
sudo tee /etc/ufw/after.rules >/dev/null <<'EOF'
# BEGIN bigredpi DOCKER-USER hardening
*filter
:DOCKER-USER - [0:0]
# allow from LAN and WireGuard subnets, drop everything else trying to reach published container ports
-A DOCKER-USER -s 192.168.40.0/24 -j RETURN
-A DOCKER-USER -s 10.10.250.0/24  -j RETURN
-A DOCKER-USER -j DROP
COMMIT
# END bigredpi DOCKER-USER hardening
EOF

sudo ufw reload
```

> If your LAN/WireGuard subnets differ, edit the two `-s` lines accordingly.

---

## 4) Dashboard — first run & optional service

```bash
# install node deps and run on 8080
npm install
npm ci --omit=dev
```
```bash
PORT=8080 node server.js
# now open http://<PI_LAN_IP>:8080/
```

Optional: run as a service so it starts on boot:

```bash
# edit the unit if your user/path differ
sudo cp dashboard.service /etc/systemd/system/dashboard.service
sudo systemctl daemon-reload
sudo systemctl enable --now dashboard
systemctl status dashboard --no-pager
```

---

## 5) **Pooled USB storage** with mergerfs (no RAID yet)

> Use this when you just want **one big path** (`/srv/storage`) that grows as you plug in more USB SSDs. You can add SnapRAID later without moving data.

1. **Identify & format** your data drives (example uses two 1 TB SSDs at `/dev/sda` and `/dev/sdb`):

```bash
lsblk -o NAME,SIZE,MODEL,MOUNTPOINT
sudo mkfs.ext4 -L data1 /dev/sda
sudo mkfs.ext4 -L data2 /dev/sdb
```
2. **Rename Drives**:

```bash
# Give each disk a label, increment
sudo e2label /dev/sda data1
sudo e2label /dev/sdb data2
# Verify
lsblk -f
```

3. **Create mount points, fstab, and mount**:

```bash
sudo mkdir -p /srv/d1 /srv/d2 /srv/storage
echo 'LABEL=data1 /srv/d1 ext4 defaults,noatime 0 2' | sudo tee -a /etc/fstab
echo 'LABEL=data2 /srv/d2 ext4 defaults,noatime 0 2' | sudo tee -a /etc/fstab
sudo mount -a
sudo systemctl daemon-reload
```

4. **Pool them at `/srv/storage`** (most‑free‑space placement; keeps inode numbers; reserves 50 GiB per disk):

```bash
echo '/srv/d* /srv/storage fuse.mergerfs defaults,allow_other,use_ino,category.create=mfs,moveonenospc=true,minfreespace=50G 0 0' | sudo tee -a /etc/fstab
sudo mount -a

df -h /srv/storage
```

> **Add a new SSD later:** format & label it (e.g., `data3`), `mkdir /srv/d3`, append an fstab line for it, `sudo mount -a`. mergerfs auto‑includes any `/srv/d*` mounts.

> **Recommended layout:** keep your **OS** on its own disk (e.g., a 500 GB SSD) and only pool **data** disks.

---

## 6) (Optional) Add **SnapRAID parity** & integrity scrubs later

> SnapRAID is **cold parity**: it protects against *disk loss* and *bit‑rot* between `sync` runs. It’s not live RAID and it’s not a backup.

1. **Prepare a dedicated parity disk** (size **≥ largest data disk**, e.g., a 2 TB SSD):

```bash
sudo mkfs.ext4 -L parity1 /dev/sdc
sudo mkdir -p /srv/snapraid/parity
echo 'LABEL=parity1 /srv/snapraid/parity ext4 defaults,noatime 0 2' | sudo tee -a /etc/fstab
sudo mount -a
```

2. **Create `/etc/snapraid.conf`** (safer defaults with **multiple content files** and excludes for reproducible data):

```conf
# Parity lives on its own disk/partition
autoselect yes
parity /srv/snapraid/parity/parity0

# Keep a content file on each disk + parity for robust recovery
content /srv/d1/snapraid.content
content /srv/d2/snapraid.content
content /srv/snapraid/parity/snapraid.content

# Data disks (read‑only from SnapRAID’s POV)
data d1 /srv/d1
data d2 /srv/d2
# data d3 /srv/d3   # add as you grow

# Exclude reproducible datasets and junk (saves parity/scrub time)
exclude /srv/d*/bitcoin/**
exclude /srv/d*/zim/**
exclude *.tmp
exclude *.partial~
exclude /lost+found/
```

3. **Initial sync & a light scrub** (pause heavy writes while the first sync runs):

```bash
sudo snapraid -e fix -p 100 -o 2 sync
sudo snapraid scrub -p 12
```

4. **Nightly maintenance (as root)**:

```bash
sudo crontab -e
# add one line:
30 2 * * * /usr/bin/snapraid scrub -p 12 && /usr/bin/snapraid sync
```

> **Restore from a failed disk:** replace the disk, mount it at the same path/label, then `snapraid -e fix`. See SnapRAID docs for recovery flow.

> **Parity math:** usable capacity = sum of **data** disks only. Parity disk doesn’t contribute capacity. If you later add larger data disks, first upgrade parity so it’s ≥ the largest data disk.

---

## 7) Spin up services (pick what you need)

Environment examples live in the README; typical starts:

```bash
# WireGuard (VPN) — exposes only UDP 51820 (router port‑forward required)
docker compose up -d wireguard

# Bitcoin Core (+ optional Tor sidecar)
docker compose up -d tor bitcoind

# Nextcloud (LAN/VPN‑only web UI on 8081)
docker compose up -d nextcloud-db nextcloud-redis nextcloud

# Kiwix (LAN/VPN‑only web UI on 8082)
docker compose up -d kiwix
```

> All persistent data lives under `/srv/storage/...`

```bash
sudo mkdir -p /srv/storage/bitcoin /srv/storage/nextcloud /srv/storage/zim
```

---

## 8) Quick health checklist

* `ufw status` shows only **UDP 51820** open to the world; all other ports limited to **LAN/VPN**
* `docker compose ps` shows only the modules you chose are running
* `df -h /srv/storage` reflects the sum of pooled disks
* If SnapRAID is enabled, `sudo snapraid status` shows **synced** and scrubs completing periodically



---

## Modules (all optional)

### 1) WireGuard VPN (Docker)

**.env (example)**

```env
TZ=America/Toronto
SERVERURL=YOUR_DDNS_OR_PUBLIC_IP
SERVERPORT=51820
PEERS=phone,laptop
PEERDNS=192.168.40.1
INTERNAL_SUBNET=10.10.250.0/24
```

**Compose (reference)** — `wireguard` service:

```yaml
wireguard:
  image: lscr.io/linuxserver/wireguard
  container_name: wireguard
  cap_add: [NET_ADMIN, SYS_MODULE]
  environment:
    - TZ=${TZ}
    - SERVERURL=${SERVERURL}
    - SERVERPORT=${SERVERPORT}
    - PEERS=${PEERS}
    - PEERDNS=${PEERDNS}
    - INTERNAL_SUBNET=${INTERNAL_SUBNET}
    - PUID=1000
    - PGID=1000
  volumes:
    - ./vpn/config:/config
    - /lib/modules:/lib/modules:ro
  ports:
    - "${SERVERPORT}:${SERVERPORT}/udp"
  sysctls:
    - net.ipv4.conf.all.src_valid_mark=1
  restart: unless-stopped
```

**Usage**

```bash
# Start VPN only
docker compose up -d wireguard
# Show QR for a phone peer
docker exec -it wireguard /app/show-peer phone
```

---

### 2) Bitcoin Core (Docker) — with optional Tor sidecar

Run **pruned** (default) or **full** node. RPC remains **private** on LAN/VPN. Onion P2P is available when the **Tor** sidecar is enabled.

**.env (example)**

```env
TZ=America/Toronto
PUID=1000
PGID=1000
RPC_USER=bigred
RPC_PASSWORD=change-this-strong
PRUNE=100000              # 0 = full; else MiB (100000 ≈ 100 GB)
DBCACHE=2048              # 2048–3072 recommended for Pi 5 (8GB)
MAX_CONNECTIONS=60
```

**Compose (reference)** — add to `docker-compose.yml`:

```yaml
bitcoind:
  image: ruimarinho/bitcoin-core:24.2
  container_name: bitcoind
  restart: unless-stopped
  stop_grace_period: 1m
  environment:
    - TZ=${TZ}
  command: >-
    -server=1 -txindex=0
    -rpcuser=${RPC_USER} -rpcpassword=${RPC_PASSWORD}
    -prune=${PRUNE}
    -dbcache=${DBCACHE}
    -maxconnections=${MAX_CONNECTIONS}
    -listen=1 -port=8333 -rpcport=8332
    -fallbackfee=0.0002
  volumes:
    - /srv/storage/bitcoin:/home/bitcoin/.bitcoin
  ports:
    - "8333:8333"        # P2P (LAN/VPN). Do NOT forward on router unless you understand the implications.
  depends_on:
    - tor

# Optional Tor sidecar for onion P2P
tor:
  build:
    context: .
    dockerfile: Dockerfile
  container_name: tor
  restart: unless-stopped
  volumes:
    - /srv/tor/var-lib-tor:/var/lib/tor
    - ./torrc:/etc/tor/torrc:ro
  ports:
    - "9050:9050"        # SOCKS5 (LAN/VPN only)
```

**Usage**

```bash
# Start Bitcoin Core (+ Tor)
docker compose up -d tor bitcoind
# Follow logs
docker logs -f bitcoind
```

---

### 3) Nextcloud (Docker)

**.env (example)**

```env
DB_ROOT_PASSWORD=use-a-strong-unique-secret
DB_PASSWORD=use-a-strong-unique-secret
```

**Compose (reference)**

```yaml
nextcloud-db:
  image: mariadb:10.11
  container_name: nextcloud-db
  restart: unless-stopped
  environment:
    - MYSQL_ROOT_PASSWORD=${DB_ROOT_PASSWORD}
    - MYSQL_DATABASE=nextcloud
    - MYSQL_USER=nextcloud
    - MYSQL_PASSWORD=${DB_PASSWORD}
  volumes:
    - /srv/storage/nextcloud-db:/var/lib/mysql

nextcloud-redis:
  image: redis:7-alpine
  container_name: nextcloud-redis
  restart: unless-stopped

nextcloud:
  image: nextcloud:apache
  container_name: nextcloud
  depends_on: [nextcloud-db, nextcloud-redis]
  restart: unless-stopped
  environment:
    - MYSQL_HOST=nextcloud-db
    - MYSQL_DATABASE=nextcloud
    - MYSQL_USER=nextcloud
    - MYSQL_PASSWORD=${DB_PASSWORD}
    - REDIS_HOST=nextcloud-redis
    - APACHE_DISABLE_REWRITE_IP=1
  volumes:
    - /srv/storage/nextcloud:/var/www/html
  ports:
    - "8081:80"   # LAN/VPN only; do NOT port‑forward
```

**First‑run**: open `http://<PI_LAN_IP>:8081/`, create admin user, set DB host to `nextcloud-db`, Redis to `nextcloud-redis`, and add `trusted_domains` with the Pi’s LAN IP.

---

### 4) Offline Knowledge (ZIM Server)

Serve offline copies of knowledge bases (Wikipedia, Wiktionary, Wikinews, Wikibooks) over your LAN/VPN. This module has **two services**:

* **`zim-fetcher`** — one-shot helper to download/update ZIM files into `/srv/offline/zim`
* **`kiwix`** — **Kiwix** HTTP server that serves the ZIMs at `http://<pi-ip>:8082/`

**Compose (reference)**

```yaml
# --- 0) One-shot: fetch ZIMs into /srv/offline/zim --------------------------
zim-fetcher:
  image: alpine:3.20
  container_name: zim-fetcher
  restart: "no"
  environment:
    TZ: America/Toronto
    MIRROR_BASE: "https://download.kiwix.org/zim"
    # Use exact, existing filenames. Edit to taste.
    ZIM_LIST: >
      wikipedia/wikipedia_en_all_nopic_2025-08.zim,
      wiktionary/wiktionary_en_all_nopic_2025-08.zim,
      wikinews/wikinews_en_all_maxi_2025-08.zim,
      wikibooks/wikibooks_en_all_maxi_2025-08.zim
  volumes:
    - /srv/offline/zim:/data
  command: ["/bin/sh","-c","set -e; apk add --no-cache wget ca-certificates; mkdir -p /data; LIST=$(echo $$ZIM_LIST | tr ',' ' '); for ITEM in $$LIST; do ITEM=$(echo $$ITEM | xargs); [ -z \"$$ITEM\" ] && continue; URL=\"$$MIRROR_BASE/$$ITEM\"; echo \">> Checking: $$URL\"; if ! wget --spider -q \"$$URL\"; then echo \"!! Not found (skipping): $$URL\"; continue; fi; echo \">> Downloading/updating: $$URL\"; wget -c --timestamping -P /data \"$$URL\"; done; echo \"== ZIM fetching complete ==\"; ls -lh /data/*.zim || true"]

# --- 1) Serve ZIMs over LAN --------------------------------------------------
kiwix:
  image: ghcr.io/kiwix/kiwix-serve:3.7.0
  container_name: kiwix
  restart: unless-stopped
  ports: ["8082:8080"]      # browse at http://<pi-ip>:8082
  volumes:
    - /srv/offline/zim:/data:ro
  command:
    - "/data/wikipedia_en_all_nopic_2025-08.zim"
    - "/data/wiktionary_en_all_nopic_2025-08.zim"
    - "/data/wikinews_en_all_maxi_2025-08.zim"
    - "/data/wikibooks_en_all_maxi_2025-08.zim"
  healthcheck:
    test: ["CMD-SHELL","wget -qO- http://localhost:8080/ >/dev/null 2>&1 || exit 1"]
    interval: 30s
    timeout: 5s
    retries: 5
```

**Usage**

```bash
# 1) Create the data folder (host)
sudo mkdir -p /srv/offline/zim

# 2) Download or update ZIMs (run on demand)
docker compose up --build zim-fetcher && docker compose rm -f zim-fetcher

# 3) Serve them on LAN/VPN
docker compose up -d kiwix
# Open http://<PI_LAN_IP>:8082/
```

> Keep **8082** LAN/VPN-only via UFW (see firewall section). You can add/remove ZIM files later—just update the `kiwix` `command` list to include the files you want indexed on boot.

---

## Common Commands

```bash
# Start only what you want
docker compose up -d wireguard
docker compose up -d tor bitcoind
docker compose up -d nextcloud-db nextcloud-redis nextcloud
docker compose up -d kiwix

# One-shot ZIM update
docker compose up zim-fetcher

# Stop modules
docker compose stop bitcoind kiwix

# Logs
journalctl -u dashboard -e
docker logs -f wireguard
docker logs -f bitcoind
docker logs -f kiwix

# Updates (images)
docker compose pull && docker compose up -d
```

---

## Troubleshooting

**Dashboard**

* `systemctl status dashboard` / `journalctl -u dashboard -e`
* Ensure `public/` exists and contains UI files.

**WireGuard**

* Router must port‑forward **UDP 51820** to the Pi.
* Show peer QR: `docker exec -it wireguard /app/show-peer phone`.
* If connected but can’t reach LAN, confirm client `AllowedIPs` include your LAN (e.g., `192.168.40.0/24`).

**Bitcoin Core**

* Prune size too small → frequent re‑downloads; set `PRUNE` ≥ `100000` (~100 GB target).
* Slow IBD → increase `DBCACHE` (within RAM limits) and ensure SSD storage under `/srv/storage/bitcoin`.
* Onion unreachable → check Tor volume perms (`/srv/tor/var-lib-tor` owned by root inside container, mode 0700).

**Nextcloud**

* Check logs: `docker logs nextcloud nextcloud-db nextcloud-redis`.
* Add proper `trusted_domains` and keep port 8081 LAN/VPN‑only.

**ZIM Server (Kiwix)**

* `docker logs -f kiwix` to confirm it indexed all paths.
* If a ZIM doesn’t appear, verify its exact filename in `kiwix` `command` list and that it exists under `/srv/offline/zim`.
* Use `zim-fetcher` periodically to update ZIMs with `--timestamping`.

**Storage (mergerfs/SnapRAID)**

* Pool missing after reboot → re‑check `/etc/fstab` lines and `mount -a` output.
* SnapRAID complains about moved/renamed files → run `snapraid fix` and resync; avoid moving files while `sync` runs.

---

## Maintenance & Security Checklist

* Keep **8080/8081/8082** un‑forwarded on the router; allow LAN/VPN only via UFW.
* Use **strong, unique** secrets in `.env` files; never commit them to git.
* Periodically `docker compose pull && docker compose up -d`.
* Back up persistent volumes: `/srv/storage/bitcoin`, `/srv/storage/nextcloud`, `/srv/offline/zim`, and your repo configs.
* Schedule SnapRAID `scrub` + `sync` and check logs monthly.

---

## License

This project is licensed under the **MIT License** — add a `LICENSE` file with the full text if you haven’t already.
