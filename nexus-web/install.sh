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
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash - >/dev/null 2>&1 || true
    apt-get update -y >/dev/null 2>&1 || true
    apt-get install -y nodejs >/dev/null 2>&1 || true
  fi
  if ! command -v node >/dev/null 2>&1 || [[ "$(node --version | tr -d 'v' | cut -d. -f1)" -lt 20 ]]; then
    echo "[nexus-web] Failed to install Node.js 20+. Please install Node 20+ manually." >&2
    exit 1
  fi
  echo "[nexus-web] Node.js $(node --version)"
  npm install
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
