#!/usr/bin/env bash
set -euo pipefail

# Try to get a primary non-loopback IPv4 address (works on most Linux)
IP=""
# preferred: ip command
if command -v ip >/dev/null 2>&1; then
  IP=$(ip -4 addr show scope global | awk '/inet/ { sub(/\/.*/,"",$2); print $2; exit }' || true)
fi

# fallback to hostname -I
if [ -z "$IP" ]; then
  if command -v hostname >/dev/null 2>&1; then
    IP=$(hostname -I 2>/dev/null | awk '{print $1}' || true)
  fi
fi

# final fallback
if [ -z "$IP" ]; then
  echo "Warning: could not detect a non-loopback IP, binding to 0.0.0.0"
  IP="0.0.0.0"
fi

echo "Detected local IP: $IP"

# Start Angular dev server with SSL and proxy
ng serve \
  --host "$IP" \
  --ssl true \
  --ssl-cert ./cert.pem \
  --ssl-key ./key.pem \
  --proxy-config proxy.conf.json
# ng serve \
#   --host 0.0.0.0 \
#   --port 4200 \
#   --ssl false \
#   --proxy-config proxy.conf.json