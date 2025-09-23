#!/bin/sh
set -e

# Ensure dirs exist
mkdir -p /var/lib/tor/hidden_service

# Since Tor runs as root in this container, the DataDirectory must be owned by root
chown -R 0:0 /var/lib/tor
chmod 0700 /var/lib/tor /var/lib/tor/hidden_service

# Start Tor (will read /etc/tor/torrc)
exec tor -f /etc/tor/torrc