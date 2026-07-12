#!/usr/bin/env bash
set -euo pipefail

# Wrapper installer for Nexus Web panel — referenced by the terminal menu.
# It delegates to the repository-level installer if present, or performs
# a local build+install as fallback.

BASE_DIR="$(cd "$(dirname "$0")/.." && pwd)"

echo "[nexus-web] Installer wrapper running from $BASE_DIR"

if [ -f "$BASE_DIR/install_web_panel_vps.sh" ]; then
  echo "[nexus-web] Delegating to $BASE_DIR/install_web_panel_vps.sh"
  bash "$BASE_DIR/install_web_panel_vps.sh"
  exit $?
fi

cd "$(dirname "$0")"

if command -v npm >/dev/null 2>&1; then
  echo "[nexus-web] Installing Node dependencies and building assets..."
  if ! command -v node >/dev/null 2>&1 || [[ "$(node --version | tr -d 'v' | cut -d. -f1)" -lt 20 ]]; then
    echo "[nexus-web] Node.js 20+ is required. Installing Node.js 20 LTS..."
    export DEBIAN_FRONTEND=noninteractive
    apt-get update -y >/dev/null 2>&1 || true
    apt-get install -y ca-certificates curl gnupg lsb-release >/dev/null 2>&1 || true

    rm -f /etc/apt/sources.list.d/nodesource.list /usr/share/keyrings/nodesource.gpg /etc/apt/keyrings/nodesource.gpg 2>/dev/null || true
    mkdir -p /usr/share/keyrings
    curl -fsSL https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key | gpg --dearmor -o /usr/share/keyrings/nodesource.gpg >/dev/null 2>&1 || {
      echo "[nexus-web] Failed to fetch NodeSource GPG key." >&2
      exit 1
    }
    cat > /etc/apt/sources.list.d/nodesource.list <<'EOF'
deb [signed-by=/usr/share/keyrings/nodesource.gpg] https://deb.nodesource.com/node_20.x nodistro main
EOF
    apt-get update -y >/dev/null 2>&1 || true
    apt-get install -y --allow-downgrades --allow-change-held-packages nodejs >/dev/null 2>&1 || {
      echo "[nexus-web] Failed to install Node.js 20+. Please install Node 20+ manually." >&2
      exit 1
    }
  fi
  if ! command -v node >/dev/null 2>&1 || [[ "$(node --version | tr -d 'v' | cut -d. -f1)" -lt 20 ]]; then
    echo "[nexus-web] Failed to install Node.js 20+. Please install Node 20+ manually." >&2
    exit 1
  fi
  echo "[nexus-web] Node.js $(node --version)"
  npm install
  cd frontend
  npm install
  cd ..
  npm run build
  echo "[nexus-web] Build complete. Copying files to /opt/katashie-web (requires sudo)"
  sudo mkdir -p /opt/katashie-web
  sudo cp -r "$PWD"/* /opt/katashie-web/
  echo "[nexus-web] Installation finished. You can start the service with: sudo systemctl start katashie-web"
  exit 0
else
  echo "[ERROR] npm not found — install Node.js (>=20) and npm first."
  exit 1
fi
