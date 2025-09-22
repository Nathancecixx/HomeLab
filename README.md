# BigRedPi Homelab (Raspberry Pi 5)

A minimal, modular **homelab starter** for Raspberry Pi 5 with:

* **Dashboard** – host‑run Node.js app on `:8080` (Pi status, temp, Docker containers).
* **WireGuard VPN** – containerized (Docker) secure remote access into your LAN.
* **Nextcloud** – containerized personal cloud on `:8081`, reachable only from LAN/VPN.

> **Security model:** Only **UDP 51820** (WireGuard) is exposed to the public internet via your router’s port‑forward. The **Dashboard** and **Nextcloud** are **LAN/VPN‑only**. No reverse proxy by default.

---

## 0) What’s in this repo right now

* `Makefile` targets for **dashboard**, **vpn**, and **nextcloud** (no NFS).
* `dashboard/app/package.json` + `server.js` (host‑run via **systemd** service `dashboard`).
* `vpn-wireguard/docker-compose.yml` + `.env` (LinuxServer WireGuard container).
* `cloud-nextcloud/docker-compose.yml` + `.env` (Nextcloud + MariaDB + Redis, port mapped to `8081`).
* `helpers/` for optional backup/health scripts.

> If you previously had an NFS stack, it’s removed. Ensure your firewall script and Makefile no longer reference NFS.

---

## 1) Prerequisites

* Raspberry Pi **5**, 64‑bit Raspberry Pi OS (Bookworm), SSH enabled.
* Ethernet to your router; reserve a DHCP lease (e.g., `192.168.40.45`).
* **Docker Engine + Compose**:

  ```bash
  curl -fsSL https://get.docker.com | sh
  ```
* Ability to **port‑forward UDP 51820** on your router → your Pi.
* (Recommended) Dynamic DNS: DuckDNS/No‑IP/Cloudflare.

---

## 2) Repo layout (current)

```
/srv/homelab
├─ .gitignore
├─ .env                      # global defaults (TZ, HOST_IP, LAN_SUBNET)
├─ README.md                 # this document
├─ Makefile                  # ops targets (dashboard/vpn/nextcloud)
├─ dashboard/
│  ├─ .env                   # PORT=8080, NODE_ENV=production
│  ├─ app/
│  │  ├─ package.json        # start -> node server.js
│  │  └─ server.js           # host-run Express app
│  └─ service/
│     └─ dashboard.service   # hardened systemd unit
├─ vpn-wireguard/
│  ├─ .env                   # SERVERURL, SERVERPORT=51820, INTERNAL_SUBNET=10.10.250.0/24, etc.
│  └─ docker-compose.yml     # linuxserver/wireguard, container_name: wireguard
├─ cloud-nextcloud/
│  ├─ .env                   # DB creds, etc.
│  └─ docker-compose.yml     # nextcloud:apache + mariadb:10.11 + redis:7-alpine
└─ helpers/
   ├─ backup.sh              # optional (configs/data export)
   └─ health.sh              # optional
```

---

## 3) One‑time host setup

```bash
# Dedicated non-root owner
sudo adduser --system --home /srv/homelab --group homelab
sudo usermod -aG docker homelab
sudo mkdir -p /srv/homelab /srv/nextcloud/data /srv/nextcloud/db
sudo chown -R homelab:homelab /srv/homelab /srv/nextcloud

# Node.js 20 LTS (for dashboard)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs ufw

# Dashboard deps
cd /srv/homelab/dashboard/app
sudo -u homelab npm ci --omit=dev
```

> If you haven’t copied the repo yet, place files into `/srv/homelab` preserving the tree above.

---

## 4) Environment configuration

### 4.1 Global `/.env`

```env
TZ=Europe/Amsterdam
LAN_SUBNET=192.168.40.0/24
HOST_IP=192.168.40.45
```

### 4.2 WireGuard `/vpn-wireguard/.env`

```env
# Required
SERVERURL=your-ddns.example.com   # or your current public IP
SERVERPORT=51820
INTERNAL_SUBNET=10.10.250.0/24    # must include CIDR
PEERS=phone,laptop                 # peers to auto-generate
PEERDNS=192.168.40.1               # or your Pi, or 1.1.1.1
TZ=Europe/Amsterdam
```

> Ensure your router forwards **UDP 51820** to `HOST_IP:51820`.

### 4.3 Nextcloud `/cloud-nextcloud/.env`

```env
DB_ROOT_PASSWORD=change-me-long-unique
DB_PASSWORD=change-me-long-unique
# Add optional overrides as needed (e.g., NEXTCLOUD_TRUSTED_DOMAINS on first run)
```

> **Use strong unique secrets**; store Nextcloud volumes on SSD at `/srv/nextcloud`.

---

## 5) Firewall (UFW) – LAN/VPN only for web UIs

```bash
sudo ufw default deny incoming
sudo ufw default allow outgoing

# SSH from LAN
sudo ufw allow from 192.168.40.0/24 to any port 22 proto tcp

# Dashboard from LAN only
sudo ufw allow from 192.168.40.0/24 to any port 8080 proto tcp

# Nextcloud from LAN only
sudo ufw allow from 192.168.40.0/24 to any port 8081 proto tcp

# WireGuard from WAN (your router forwards to the Pi)
sudo ufw allow 51820/udp

sudo ufw enable
sudo ufw status
```

> Update `192.168.40.0/24` to your actual LAN. **Do not** port‑forward 8080/8081 on your router.

---

## 6) Makefile targets (current)

```text
make help                 # list targets
make check                # preflight tools (docker, compose, systemctl)
make all | make up        # dashboard + vpn + nextcloud (starts everything)
make down                 # stop all three

# dashboard (host-run systemd)
make dashboard-start
make dashboard-stop
make dashboard-restart
make dashboard-install    # reload units after editing service file
make dashboard-logs

# vpn (WireGuard)
make vpn-start
make vpn-stop
make vpn-logs

# nextcloud
make nextcloud-start
make nextcloud-stop
make nextcloud-logs

# ops
make status               # systemd + container table + docker space
make upgrade              # docker compose pull for vpn + nextcloud
make firewall-apply       # runs ./firewall.bash if you maintain one
make backup               # runs helpers/backup.sh if present
make prune                # docker system prune (confirmation prompt)
```

---

## 7) Start services

### 7.1 Dashboard (systemd, host‑run)

```bash
sudo cp /srv/homelab/dashboard/service/dashboard.service /etc/systemd/system/dashboard.service
sudo systemctl daemon-reload
sudo systemctl enable --now dashboard
systemctl status dashboard --no-pager
```

Open **Dashboard**: `http://HOST_IP:8080/`

> Ensure `dashboard/.env` contains `PORT=8080` and `NODE_ENV=production`.

### 7.2 WireGuard (Docker)

```bash
cd /srv/homelab/vpn-wireguard
docker compose up -d

# Show QR for "phone" peer (example):
docker exec -it wireguard /app/show-peer phone
```

From a mobile device on cellular, import the QR, connect, and verify you can reach `http://HOST_IP:8080/` through the tunnel.

### 7.3 Nextcloud (Docker)

```bash
cd /srv/homelab/cloud-nextcloud
docker compose up -d
```

Open **Nextcloud** (LAN/VPN only): `http://HOST_IP:8081/`

**First‑run:**

* Create the admin account.
* Database host: `db` | Database: `nextcloud` | User: `nextcloud` | Password: value of `DB_PASSWORD`.
* Redis host: `redis` (port defaults to 6379).
* After setup, in `config.php`, add `trusted_domains` that include `HOST_IP` (and any internal hostname you use).

> Volumes should map Nextcloud data to `/srv/nextcloud/data` and MariaDB data to `/srv/nextcloud/db`.

---

## 8) Compose expectations (sane defaults)

**WireGuard** (excerpt expectations):

* Image: `lscr.io/linuxserver/wireguard` (current tag recommended).
* `container_name: wireguard`.
* `cap_add: [NET_ADMIN, SYS_MODULE]`, devices for `/dev/net/tun`.
* Ports: `51820/udp` → `51820/udp`.
* Env wired to `/vpn-wireguard/.env`.

**Nextcloud stack** (typical):

* `nextcloud:apache` (container\_name: `nextcloud`, ports: `8081:80`).
* `mariadb:10.11` (container\_name: `nextcloud-db`).
* `redis:7-alpine` (container\_name: `nextcloud-redis`).
* Named/bind volumes to `/srv/nextcloud/data` and `/srv/nextcloud/db`.
* Healthchecks on DB are recommended before app start.

> If your `docker-compose.yml` differs, align the **container\_name** values or update the Makefile `*_logs` helpers.

---

## 9) Backups

* **Configs:** store a lightweight archive of this repo plus `.env` files.
* **Nextcloud data:** snapshot `/srv/nextcloud/data` and `/srv/nextcloud/db` (hot backups safest via maintenance mode).

**Example Nextcloud backup flow (manual):**

```bash
# Maintenance mode on
docker exec -u www-data nextcloud php occ maintenance:mode --on

# DB dump
docker exec nextcloud-db sh -c 'exec mysqldump --single-transaction -unextcloud -p"$${MYSQL_PASSWORD}" nextcloud' > /srv/nextcloud/backup/nextcloud.sql

# Tar data (or use rsync/borg to external disk)
sudo tar -czf /srv/nextcloud/backup/data-$(date +%F).tgz -C /srv/nextcloud data

# Maintenance mode off
docker exec -u www-data nextcloud php occ maintenance:mode --off
```

---

## 10) Maintenance & updates

```bash
# Pull newer images
make upgrade

# Apply updates (per stack)
cd /srv/homelab/vpn-wireguard && docker compose up -d
cd /srv/homelab/cloud-nextcloud && docker compose up -d

# Clean old images
docker image prune -f
```

---

## 11) Troubleshooting

**Dashboard not reachable**

* `systemctl status dashboard` and `journalctl -u dashboard -e`
* Verify UFW allows `8080/tcp` from your LAN.

**Pi temperature shows null**

* Confirm `vcgencmd` exists on Pi OS: `vcgencmd measure_temp`.

**WireGuard tunnel won’t connect**

* Router forward: UDP 51820 → `HOST_IP:51820`.
* `docker logs wireguard` for port/key issues.
* Ensure client `AllowedIPs` include your LAN (e.g., `192.168.40.0/24`).

**Nextcloud slow or failing**

* Check `docker logs nextcloud nextcloud-db nextcloud-redis`.
* Confirm Redis host `redis` resolves; DB creds match `.env`.
* Add proper `trusted_domains`.

---

## 12) Security checklist (current stack)

* Only **WireGuard** is publicly exposed; **do not** port‑forward 8080/8081.
* UFW restricted to LAN for web UIs; WAN allowed only for 51820/udp.
* Strong unique secrets in all `.env` files; `.env` is `.gitignore`d.
* Nextcloud and DB data on SSD under `/srv/nextcloud/`.
* Keep images updated and periodically review `docker logs`.

---

## 13) Appendix

### 13.1 `dashboard.service` (reference)

```ini
[Unit]
Description=BigRedPi Dashboard
After=network-online.target docker.service
Wants=network-online.target

[Service]
User=homelab
Group=homelab
EnvironmentFile=/srv/homelab/dashboard/.env
WorkingDirectory=/srv/homelab/dashboard/app
ExecStart=/usr/bin/node /srv/homelab/dashboard/app/server.js
Restart=on-failure
RestartSec=3

# Hardening
NoNewPrivileges=true
ProtectSystem=full
ProtectHome=true
PrivateTmp=true
ProtectKernelTunables=true
ProtectKernelModules=true
ProtectControlGroups=true
ReadWritePaths=/srv/homelab/dashboard

[Install]
WantedBy=multi-user.target
```

### 13.2 Minimal Nextcloud compose (reference)

```yaml
version: "3.9"
services:
  db:
    image: mariadb:10.11
    container_name: nextcloud-db
    restart: unless-stopped
    environment:
      - MYSQL_ROOT_PASSWORD=${DB_ROOT_PASSWORD}
      - MYSQL_DATABASE=nextcloud
      - MYSQL_USER=nextcloud
      - MYSQL_PASSWORD=${DB_PASSWORD}
    volumes:
      - /srv/nextcloud/db:/var/lib/mysql

  redis:
    image: redis:7-alpine
    container_name: nextcloud-redis
    restart: unless-stopped

  app:
    image: nextcloud:apache
    container_name: nextcloud
    depends_on: [db, redis]
    restart: unless-stopped
    environment:
      - MYSQL_HOST=db
      - MYSQL_DATABASE=nextcloud
      - MYSQL_USER=nextcloud
      - MYSQL_PASSWORD=${DB_PASSWORD}
      - REDIS_HOST=redis
      - APACHE_DISABLE_REWRITE_IP=1
    volumes:
      - /srv/nextcloud/data:/var/www/html
    ports:
      - "8081:80"   # LAN/VPN only (no router port-forward!)
```

> Align `container_name` values with the Makefile (e.g., `wireguard`, `nextcloud`).

---

**You’re set.** Start with `make up`, open `http://HOST_IP:8080/` for the dashboard, connect a WireGuard peer, and finish Nextcloud’s web installer at `http://HOST_IP:8081/`. Keep everything LAN/VPN‑only for a secure, quiet homelab.
