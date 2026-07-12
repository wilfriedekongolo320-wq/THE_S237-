#!/usr/bin/env bash
set -euo pipefail

REPO_DIR="$(cd "$(dirname "$0")" && pwd)"
NGINX_CONF="$REPO_DIR/nginx.conf"
DOMAIN=""
DOCKER_MODE=false
NO_RESTART=false

usage() {
  cat <<EOF
Usage: sudo bash enable_https.sh <domain> [--docker] [--no-restart]

This script enables HTTPS for the KATASHIE VPN web panel by:
  - installing certbot if needed
  - obtaining a Let's Encrypt certificate for <domain>
  - updating nginx.conf with the domain and certificate paths
  - restarting nginx or the docker nginx container

Options:
  --docker      restart nginx via docker compose if available
  --no-restart  update nginx.conf and certificates without reloading nginx
EOF
  exit 1
}

if [ "$#" -lt 1 ]; then
  usage
fi

while [ "$#" -gt 0 ]; do
  case "$1" in
    --docker)
      DOCKER_MODE=true
      shift
      ;;
    --no-restart)
      NO_RESTART=true
      shift
      ;;
    --help|-h)
      usage
      ;;
    *)
      if [ -z "$DOMAIN" ]; then
        DOMAIN="$1"
        shift
      else
        usage
      fi
      ;;
  esac
done

if [ -z "$DOMAIN" ]; then
  usage
fi

if [ "$EUID" -ne 0 ]; then
  echo "This script must be run as root. Use sudo."
  exit 1
fi

if [ ! -f "$NGINX_CONF" ]; then
  echo "ERROR: nginx.conf not found at $NGINX_CONF"
  exit 1
fi

install_certbot() {
  if command -v certbot >/dev/null 2>&1; then
    echo "[https] certbot already installed"
    return
  fi

  echo "[https] Installing certbot..."
  apt-get update -y >/dev/null 2>&1 || true
  apt-get install -y certbot >/dev/null 2>&1
  echo "[https] certbot installed"
}

request_certificate() {
  echo "[https] Requesting certificate for $DOMAIN"
  certbot certonly --standalone --preferred-challenges http \
    --agree-tos --no-eff-email --register-unsafely-without-email \
    -d "$DOMAIN"
}

update_nginx_conf() {
  echo "[https] Updating nginx.conf for domain $DOMAIN"

  local escaped_domain
  escaped_domain=$(printf '%s' "$DOMAIN" | sed 's/[].[^$/\\*]/\\&/g')

  sed -i "s/server_name[[:space:]]\+VOTRE_DOMAINE\.COM;/server_name $escaped_domain;/g" "$NGINX_CONF"
  sed -i "s#ssl_certificate[[:space:]]\+.*fullchain.pem;#ssl_certificate /etc/letsencrypt/live/$DOMAIN/fullchain.pem;#g" "$NGINX_CONF"
  sed -i "s#ssl_certificate_key[[:space:]]\+.*privkey.pem;#ssl_certificate_key /etc/letsencrypt/live/$DOMAIN/privkey.pem;#g" "$NGINX_CONF"

  if grep -q "wa\.VOTRE_DOMAINE\.COM" "$NGINX_CONF" 2>/dev/null; then
    sed -i "s/wa\.VOTRE_DOMAINE\.COM/wa.$escaped_domain/g" "$NGINX_CONF"
  fi

  echo "[https] nginx.conf updated"
}

reload_nginx() {
  if [ "$NO_RESTART" = true ]; then
    echo "[https] Skipping nginx restart (--no-restart enabled)"
    return
  fi

  if [ "$DOCKER_MODE" = true ]; then
    if command -v docker >/dev/null 2>&1; then
      echo "[https] Restarting nginx container via docker compose"
      if command -v docker-compose >/dev/null 2>&1; then
        docker-compose restart nginx
      else
        docker compose restart nginx
      fi
      return
    fi
    echo "[https] Docker not available; falling back to system nginx reload"
  fi

  if command -v nginx >/dev/null 2>&1; then
    echo "[https] Testing nginx configuration"
    nginx -t
    echo "[https] Reloading nginx"
    systemctl reload nginx
    return
  fi

  echo "[https] WARNING: nginx binary not found. Please reload nginx manually."
}

main() {
  install_certbot
  request_certificate
  update_nginx_conf
  reload_nginx
  echo "[https] HTTPS enabled for $DOMAIN"
  echo "[https] Browse to https://$DOMAIN"
}

main
