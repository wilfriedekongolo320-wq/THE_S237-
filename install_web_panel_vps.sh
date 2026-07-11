#!/usr/bin/env bash
set -euo pipefail

APP_DIR=/opt/katashie-web
DB_DIR=/etc/katashie-web
SERVICE_FILE=/etc/systemd/system/katashie-web.service
REPO_DIR=/opt/KATASHIE_VPN

if [ ! -d "$REPO_DIR" ]; then
  echo "[WEB] Cloning repository to $REPO_DIR"
  git clone https://github.com/abesskamer237/KATASHIE_VPN.git "$REPO_DIR"
fi

mkdir -p "$APP_DIR" "$DB_DIR"
cp -r "$REPO_DIR/nexus-web"/* "$APP_DIR"/
cd "$APP_DIR"

if ! command -v node >/dev/null 2>&1; then
  echo "[WEB] Node.js is required. Install Node 20+ first." >&2
  exit 1
fi

npm install
npm run build

cp "$REPO_DIR/module/katashie-web.service" "$SERVICE_FILE"
chmod +x "$APP_DIR/start.sh"
systemctl daemon-reload
systemctl enable --now katashie-web

sleep 3
systemctl status katashie-web --no-pager || true
