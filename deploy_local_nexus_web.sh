#!/usr/bin/env bash
set -euo pipefail

REPO_DIR="$(cd "$(dirname "$0")" && pwd)"
WEB_DIR="$REPO_DIR/nexus-web"
INSTALL_DIR="/opt/katashie-web"
DB_DIR="/etc/katashie-web"
SERVICE_FILE="/etc/systemd/system/katashie-web.service"
NODE_REQUIRED=20

ensure_root() {
  if [ "$(id -u)" -ne 0 ]; then
    echo "This script must be run as root. Use sudo."
    exit 1
  fi
}

install_node20() {
  echo "[deploy] Ensuring Node.js ${NODE_REQUIRED}+ is installed..."
  if command -v node >/dev/null 2>&1 && [ "$(node --version | tr -d 'v' | cut -d. -f1)" -ge "$NODE_REQUIRED" ]; then
    echo "[deploy] Node.js $(node --version) already installed."
    return
  fi

  apt-get update -y >/dev/null 2>&1 || true
  apt-get install -y ca-certificates curl gnupg lsb-release >/dev/null 2>&1 || true

  rm -f /etc/apt/sources.list.d/nodesource.list /usr/share/keyrings/nodesource.gpg /etc/apt/keyrings/nodesource.gpg 2>/dev/null || true
  mkdir -p /usr/share/keyrings

  curl -fsSL https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key | gpg --dearmor -o /usr/share/keyrings/nodesource.gpg >/dev/null 2>&1
  cat > /etc/apt/sources.list.d/nodesource.list <<'EOF'
deb [signed-by=/usr/share/keyrings/nodesource.gpg] https://deb.nodesource.com/node_20.x nodistro main
EOF
  apt-get update -y >/dev/null 2>&1
  apt-get install -y --allow-downgrades --allow-change-held-packages nodejs >/dev/null 2>&1

  if ! command -v node >/dev/null 2>&1 || [ "$(node --version | tr -d 'v' | cut -d. -f1)" -lt "$NODE_REQUIRED" ]; then
    echo "[deploy] ERROR: Node.js ${NODE_REQUIRED}+ installation failed." >&2
    exit 1
  fi

  echo "[deploy] Node.js $(node --version) installed."
}

build_nexus_web() {
  echo "[deploy] Installing backend dependencies..."
  cd "$WEB_DIR"
  npm install

  if [ -d "$WEB_DIR/frontend" ]; then
    echo "[deploy] Installing frontend dependencies..."
    cd "$WEB_DIR/frontend"
    npm install
    cd "$WEB_DIR"
  fi

  echo "[deploy] Building server and frontend..."
  npm run build
}

copy_application() {
  echo "[deploy] Copying app to $INSTALL_DIR..."
  rm -rf "$INSTALL_DIR"/*
  mkdir -p "$INSTALL_DIR"
  cp -r "$WEB_DIR"/* "$INSTALL_DIR/"
}

ensure_service() {
  if [ ! -f "$SERVICE_FILE" ]; then
    echo "[deploy] Installing systemd service..."
    if [ -f "$REPO_DIR/module/katashie-web.service" ]; then
      cp "$REPO_DIR/module/katashie-web.service" "$SERVICE_FILE"
    else
      cat > "$SERVICE_FILE" <<'EOF'
[Unit]
Description=KATASHIE VPN Web Panel
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/opt/katashie-web
Environment=NODE_ENV=production
Environment=PORT=2087
Environment=KATASHIE_DB_DIR=/etc/katashie-web
Environment=NEXUS_ADMIN_USER=admin
Environment=NEXUS_ADMIN_PASS=admin
Environment=NEXUS_JWT_SECRET=change-me
ExecStart=/usr/bin/node /opt/katashie-web/dist/server/index.js
Restart=always
RestartSec=5
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
EOF
    fi
    systemctl daemon-reload
    systemctl enable --now katashie-web
  else
    echo "[deploy] Service file already present; reloading and restarting..."
    systemctl daemon-reload
    systemctl enable --now katashie-web
  fi
}

create_db_dir() {
  mkdir -p "$DB_DIR"
  chmod 755 "$DB_DIR"
}

main() {
  ensure_root
  install_node20
  build_nexus_web
  copy_application
  create_db_dir
  ensure_service
  echo "[deploy] Deployment complete. Access the panel at http://<server-ip>:2087"
}

main "$@"
