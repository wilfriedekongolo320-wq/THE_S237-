#!/usr/bin/env bash
set -euo pipefail

APP_DIR=/opt/katashie-web
DB_DIR=/etc/katashie-web
SERVICE_FILE=/etc/systemd/system/katashie-web.service
REPO_DIR=/opt/KATASHIE_VPN

ensure_node20() {
  if ! command -v node >/dev/null 2>&1; then
    return 1
  fi
  local major
  major=$(node --version 2>/dev/null | tr -d 'v' | cut -d. -f1)
  [ -n "$major" ] && [ "$major" -ge 20 ]
}

install_node20() {
  echo "[WEB] Installing Node.js 20 LTS..."
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash - >/dev/null 2>&1 || return 1
  apt-get update -y >/dev/null 2>&1
  apt-get install -y nodejs >/dev/null 2>&1 || return 1
}

if ! ensure_node20; then
  install_node20 || {
    echo "[WEB] Failed to install Node.js 20+. Please install it manually." >&2
    exit 1
  }
fi

if [ ! -d "$REPO_DIR" ]; then
  echo "[WEB] Cloning repository to $REPO_DIR"
  git clone https://github.com/abesskamer237/KATASHIE_VPN.git "$REPO_DIR"
fi

mkdir -p "$APP_DIR" "$DB_DIR"
cp -r "$REPO_DIR/nexus-web"/* "$APP_DIR"/
cd "$APP_DIR"

if ! ensure_node20; then
  echo "[WEB] Node.js 20+ is required. Please install Node 20+ first." >&2
  exit 1
fi

echo "[WEB] Node.js $(node --version)"

npm install
npm run build

cp "$REPO_DIR/module/katashie-web.service" "$SERVICE_FILE"
chmod +x "$APP_DIR/start.sh"
systemctl daemon-reload
systemctl enable --now katashie-web

sleep 3
systemctl status katashie-web --no-pager || true
