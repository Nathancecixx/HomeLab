# BigRedPi Dashboard

The dashboard is now a Next.js full-stack app with:

- `GET /api/health` and `GET /api/stream` backed by a shared telemetry cache
- cookie-based admin auth for `/admin`
- Docker Compose service control and `.env` editing for the sibling homelab modules
- host-aware telemetry when deployed on the Pi with the recommended mounts
- admin-only Wake-on-LAN controls driven by `dashboard/.env`
- first-class containerized deployment

## Local or Docker Desktop use

1. Copy `./.env.example` to `./.env`.
2. Generate a bcrypt hash for `ADMIN_PASSWORD_BCRYPT`.
3. Replace `SESSION_SECRET` with a long random value.
4. Add any Wake-on-LAN targets to `dashboard/.env`.
5. Run `make config` to validate the compose file.
6. Run `make up` or `docker compose up -d --build`.
7. Open `http://localhost:<HTTP_PORT>/`.

The default compose setup uses normal bridge networking so ports are published cleanly on Docker Desktop and local dev machines.

## Production deploy on the Pi

For the actual Raspberry Pi deployment, use the Pi override:

1. Copy `./.env.example` to `./.env`.
2. Set real values for `ADMIN_PASSWORD_BCRYPT` and `SESSION_SECRET`.
3. Add any Wake-on-LAN targets to `dashboard/.env`.
4. Run `make config-pi`.
5. Run `make up-pi`.
6. Open `http://<pi-ip>:<HTTP_PORT>/`.

The Pi override adds:

- `network_mode: host`
- `pid: host`
- `uts: host`
- the host root at `/hostfs` for host-aware telemetry
- the homelab repo root at `/homelab`
- `/var/run/docker.sock` for Docker visibility and service control

## Wake-on-LAN targets

Wake-on-LAN targets are read from `dashboard/.env` at runtime, so editing the file does not require rebuilding the image.

Example:

```env
WOL_TARGETS=LAN_SERVER,NAS
WOL_TARGET_LAN_SERVER_LABEL=External LAN Server
WOL_TARGET_LAN_SERVER_MAC=AA:BB:CC:DD:EE:FF
WOL_TARGET_LAN_SERVER_IP=192.168.1.50
WOL_TARGET_LAN_SERVER_BROADCAST=192.168.1.255
WOL_TARGET_LAN_SERVER_PORT=9
```

MAC is required. IP is optional and only used for display and broadcast derivation.

## Smoke checks

After deploy:

1. Open `/api/health` and confirm the Pi hostname, kernel, and LAN interface are correct.
2. Sign into `/admin` and confirm the Deploy panel shows Docker, telemetry, and auth readiness.
3. Start and stop one service module from admin.
4. Confirm the WOL panel lists your configured targets.
5. Send a wake packet to the external server and confirm it powers on.

## Rollback

If the updated dashboard needs to be rolled back:

1. Run `docker compose down`.
2. Restore the previous dashboard image or git revision.
3. Run `docker compose up -d --build`.

## Systemd fallback

If you prefer a non-container fallback:

1. Run `npm ci`
2. Run `npm run build`
3. Copy `dashboard.service` into `/etc/systemd/system/`
4. Enable the service with `systemctl enable --now dashboard`

The fallback service runs the built standalone Next.js server from `.next/standalone/server.js` and sets `HOST_FS_ROOT=/` for direct host telemetry.
