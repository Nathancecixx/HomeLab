
---

# Makefile (drop-in)

```make
SHELL := /bin/bash

# -------- paths --------
WG_DIR       := vpn-wireguard
NC_DIR       := cloud-nextcloud
HELPERS_DIR  := helpers

# -------- commands --------
COMPOSE  := docker compose
SYSTEMCTL:= sudo systemctl

# -------- service/container names --------
DASHBOARD_SVC := dashboard
WG_NAME       := wireguard
NC_APP_NAME   := nextcloud

.DEFAULT_GOAL := help

.PHONY: help check all up down \
        dashboard-start dashboard-stop dashboard-restart dashboard-install dashboard-logs \
        vpn-start vpn-stop vpn-logs \
        nextcloud-start nextcloud-stop nextcloud-logs \
        status logs upgrade firewall-apply backup prune

## help: Show this help
help:
	@echo "Usage: make <target>\n"
	@awk 'BEGIN {FS":.*##"; printf "Targets:\n"} /^[a-zA-Z0-9_.-]+:.*##/ { printf "  \033[36m%-22s\033[0m %s\n", $$1, $$2 }' $(MAKEFILE_LIST)

## check: Verify required tools/daemons exist
check:
	@command -v docker >/dev/null || { echo "docker not found"; exit 1; }
	@docker version >/dev/null || { echo "docker daemon not running?"; exit 1; }
	@$(COMPOSE) version >/dev/null || { echo "'docker compose' plugin not found"; exit 1; }
	@command -v $(SYSTEMCTL) >/dev/null || { echo "systemctl not available"; exit 1; }
	@echo "Preflight OK."

## all: Start dashboard, VPN, and Nextcloud
all: check dashboard-start vpn-start nextcloud-start

## up: Alias of 'all'
up: all

## down: Stop dashboard, VPN, and Nextcloud
down: dashboard-stop vpn-stop nextcloud-stop

# ---------------- dashboard (host systemd) ----------------
## dashboard-start: Enable & start dashboard service
dashboard-start:
	$(SYSTEMCTL) enable --now $(DASHBOARD_SVC)

## dashboard-stop: Disable & stop dashboard service
dashboard-stop:
	-$(SYSTEMCTL) disable --now $(DASHBOARD_SVC) || true

## dashboard-restart: Restart dashboard service
dashboard-restart:
	$(SYSTEMCTL) restart $(DASHBOARD_SVC)

## dashboard-install: Reload units and (re)enable dashboard (after unit edits)
dashboard-install:
	$(SYSTEMCTL) daemon-reload
	$(SYSTEMCTL) enable --now $(DASHBOARD_SVC)

## dashboard-logs: Tail dashboard logs
dashboard-logs:
	journalctl -u $(DASHBOARD_SVC) -f -n 200

# ---------------- wireguard (vpn) ----------------
## vpn-start: Start WireGuard stack
vpn-start:
	cd $(WG_DIR) && $(COMPOSE) up -d

## vpn-stop: Stop WireGuard stack
vpn-stop:
	-cd $(WG_DIR) && $(COMPOSE) down || true

## vpn-logs: Tail WireGuard logs
vpn-logs:
	@docker logs -f $$(docker ps --format '{{.Names}}' | grep -E '^$(WG_NAME)$$') 2>/dev/null || echo "WireGuard container not running."

# ---------------- nextcloud ----------------
## nextcloud-start: Start Nextcloud stack
nextcloud-start:
	@if [ -d "$(NC_DIR)" ]; then cd $(NC_DIR) && $(COMPOSE) up -d; else echo "$(NC_DIR) not found"; exit 1; fi

## nextcloud-stop: Stop Nextcloud stack
nextcloud-stop:
	@if [ -d "$(NC_DIR)" ]; then cd $(NC_DIR) && $(COMPOSE) down || true; else echo "$(NC_DIR) not found"; fi

## nextcloud-logs: Tail Nextcloud app logs
nextcloud-logs:
	@if docker ps --format '{{.Names}}' | grep -q '^$(NC_APP_NAME)$$'; then docker logs -f $(NC_APP_NAME); else echo "Nextcloud container '$(NC_APP_NAME)' not running."; fi

# ---------------- status / ops ----------------
## status: Show systemd + container status
status:
	@echo "=== dashboard (systemd) ==="
	-$(SYSTEMCTL) is-active $(DASHBOARD_SVC) || true
	@echo
	@echo "=== containers ==="
	@docker ps --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}' | ( sed -u 1q; sort -k1,1 )
	@echo
	@echo "=== docker space ==="
	@df -h /var/lib/docker 2>/dev/null || true

## logs: Follow WireGuard + Nextcloud logs (Ctrl-C to exit)
logs:
	@echo "Press Ctrl-C to stop..."
	@docker logs -f $$(docker ps --format '{{.Names}}' | grep -E '^($(WG_NAME)|$(NC_APP_NAME))$$') 2>/dev/null || echo "No target containers running."

## upgrade: Pull latest images for VPN + Nextcloud
upgrade:
	@if [ -d "$(WG_DIR)" ]; then cd $(WG_DIR) && $(COMPOSE) pull; fi
	@if [ -d "$(NC_DIR)" ]; then cd $(NC_DIR) && $(COMPOSE) pull; fi
	@echo "Images pulled. Restart stacks to apply."

## firewall-apply: Run your firewall script (adjusts UFW rules)
firewall-apply:
	@test -x ./firewall.bash || { echo "./firewall.bash not found or not executable"; exit 1; }
	@sudo ./firewall.bash

## backup: Run helper backup script if present
backup:
	@if [ -x "$(HELPERS_DIR)/backup.sh" ]; then $(HELPERS_DIR)/backup.sh; else echo "$(HELPERS_DIR)/backup.sh not found or not executable"; fi

## prune: Prune unused Docker data (CAUTION)
prune:
	@echo "About to run: docker system prune -f --volumes"
	@read -p "Continue? [y/N] " ans; if [[ $$ans =~ ^[Yy]$$ ]]; then docker system prune -f --volumes; else echo "Aborted."; fi
