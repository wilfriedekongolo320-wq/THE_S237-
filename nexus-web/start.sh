#!/usr/bin/env sh
set -eu

APP_DIR=${APP_DIR:-/app}
cd "$APP_DIR"

mkdir -p "${KATASHIE_DB_DIR:-/etc/katashie-web}"

if [ ! -d "$APP_DIR/public" ]; then
  echo "[WEB] Frontend assets missing, building now..."
  npm run build
fi

exec node dist/server/index.js
