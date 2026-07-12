#!/usr/bin/env bash
set -euo pipefail

# ─── PRE-FLIGHT: Ensure Node.js 20+ ─────────────────────────
echo "[WEB] Checking Node.js version..."
if ! command -v node >/dev/null 2>&1; then
  echo "[WEB] Node.js not found. Installing Node.js 20 LTS..."
  curl -fsSL https://deb.nodesource.com/setup_20.x 2>/dev/null | bash - || true
  apt-get update -qq >/dev/null 2>&1 || true
  apt-get install -y nodejs >/dev/null 2>&1 || true
fi

NODE_MAJOR=$(node --version 2>/dev/null | tr -d 'v' | cut -d. -f1 || echo '0')
if [ "$NODE_MAJOR" -lt 20 ]; then
  echo "[WEB] Node.js $NODE_MAJOR detected (too old). Upgrading to Node.js 20 LTS..."
  curl -fsSL https://deb.nodesource.com/setup_20.x 2>/dev/null | bash - || true
  apt-get update -qq >/dev/null 2>&1 || true
  apt-get install -y --only-upgrade nodejs >/dev/null 2>&1 || true
  
  if command -v node >/dev/null 2>&1; then
    NODE_NEW=$(node --version 2>/dev/null | tr -d 'v' | cut -d. -f1 || echo '0')
    if [ "$NODE_NEW" -lt 20 ]; then
      echo "[WEB] ERROR: Node.js upgrade failed. Node $NODE_NEW still too old." >&2
      exit 1
    fi
  fi
fi

echo "[WEB] Node.js $(node --version)"

APP_DIR=/opt/katashie-web
DB_DIR=/etc/katashie-web
SERVICE_FILE=/etc/systemd/system/katashie-web.service
REPO_DIR=/opt/KATASHIE_VPN

cp "$REPO_DIR/module/katashie-web.service" "$SERVICE_FILE"
chmod +x "$APP_DIR/start.sh"
systemctl daemon-reload
systemctl enable --now katashie-web

sleep 3
systemctl status katashie-web --no-pager || true
