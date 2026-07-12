#!/usr/bin/env bash
set -euo pipefail

# ─── PRE-FLIGHT: Ensure Node.js 20+ ─────────────────────────
echo "[WEB] Checking Node.js version..."
ensure_node20() {
  export DEBIAN_FRONTEND=noninteractive
  apt-get update -y >/dev/null 2>&1 || true
  apt-get install -y ca-certificates curl gnupg lsb-release >/dev/null 2>&1 || true

  mkdir -p /etc/apt/keyrings
  curl -fsSL https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key | gpg --dearmor -o /etc/apt/keyrings/nodesource.gpg >/dev/null 2>&1 || {
    echo "[WEB] ERROR: Unable to fetch NodeSource GPG key." >&2
    exit 1
  }

  cat > /etc/apt/sources.list.d/nodesource.list <<'EOF'
deb [signed-by=/etc/apt/keyrings/nodesource.gpg] https://deb.nodesource.com/node_20.x nodistro main
EOF

  apt-get update -y >/dev/null 2>&1 || true
  apt-get install -y --allow-downgrades --allow-change-held-packages nodejs >/dev/null 2>&1 || {
    echo "[WEB] ERROR: Unable to install Node.js 20 from NodeSource." >&2
    exit 1
  }
}

if ! command -v node >/dev/null 2>&1; then
  echo "[WEB] Node.js not found. Installing Node.js 20 LTS..."
  ensure_node20
fi

NODE_MAJOR=$(node --version 2>/dev/null | tr -d 'v' | cut -d. -f1 || echo '0')
if [ "$NODE_MAJOR" -lt 20 ]; then
  echo "[WEB] Node.js $NODE_MAJOR detected (too old). Upgrading to Node.js 20 LTS..."
  ensure_node20
  
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
