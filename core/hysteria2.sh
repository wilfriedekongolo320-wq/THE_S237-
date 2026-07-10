#!/bin/bash
# ============================================================
#   KATASHIE VPN — Installateur Hysteria2 (QUIC/UDP, très rapide)
# ============================================================
set -e
export DEBIAN_FRONTEND=noninteractive
log() { printf "[INFO] %s\n" "$*"; }

log "Installation d'Hysteria2 (installeur officiel)..."
bash <(curl -fsSL https://get.hy2.sh/) >/dev/null 2>&1 || bash <(curl -fsSL https://get.hy2.sh/)

mkdir -p /etc/hysteria
DOMAIN=$(cat /etc/xray/domain 2>/dev/null || true)

if [ -n "$DOMAIN" ] && [ -f /etc/xray/xray.crt ] && [ -f /etc/xray/xray.key ]; then
  CERT="/etc/xray/xray.crt"; KEY="/etc/xray/xray.key"
  log "Utilisation du certificat du domaine: $DOMAIN"
else
  log "Aucun domaine/certificat trouvé, génération d'un certificat auto-signé."
  openssl req -x509 -nodes -newkey ec -pkeyopt ec_paramgen_curve:prime256v1 \
    -keyout /etc/hysteria/server.key -out /etc/hysteria/server.crt \
    -subj "/CN=bing.com" -days 3650 >/dev/null 2>&1
  CERT="/etc/hysteria/server.crt"; KEY="/etc/hysteria/server.key"
fi

if [ ! -f /etc/hysteria/config.yaml ]; then
cat > /etc/hysteria/config.yaml << EOF
listen: :36712

tls:
  cert: ${CERT}
  key: ${KEY}

auth:
  type: userpass
  userpass:
    # USERS-START
    # USERS-END

masquerade:
  type: proxy
  proxy:
    url: https://bing.com
    rewriteHost: true
EOF
fi

touch /etc/hysteria/users.db
systemctl enable --now hysteria-server.service
log "Hysteria2 installé et démarré (port UDP 36712)."
