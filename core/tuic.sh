#!/bin/bash
# ============================================================
#   KATASHIE VPN — Installateur TUIC v5 (QUIC, anti-censure)
# ============================================================
set -e
log() { printf "[INFO] %s\n" "$*"; }

ARCH=$(uname -m)
case "$ARCH" in
  x86_64) BIN_ARCH="x86_64-unknown-linux-gnu" ;;
  aarch64) BIN_ARCH="aarch64-unknown-linux-gnu" ;;
  *) echo "[ERROR] Architecture non supportée: $ARCH"; exit 1 ;;
esac

mkdir -p /etc/tuic
log "Téléchargement de tuic-server..."
LATEST_URL=$(curl -s https://api.github.com/repos/EAimTY/tuic/releases/latest \
  | grep "browser_download_url.*tuic-server.*${BIN_ARCH}" | head -1 | cut -d '"' -f4)
[ -z "$LATEST_URL" ] && { echo "[ERROR] Impossible de trouver le binaire tuic-server."; exit 1; }
curl -fsSL "$LATEST_URL" -o /usr/local/bin/tuic-server
chmod +x /usr/local/bin/tuic-server

DOMAIN=$(cat /etc/xray/domain 2>/dev/null || true)
if [ -n "$DOMAIN" ] && [ -f /etc/xray/xray.crt ] && [ -f /etc/xray/xray.key ]; then
  CERT="/etc/xray/xray.crt"; KEY="/etc/xray/xray.key"
else
  openssl req -x509 -nodes -newkey ec -pkeyopt ec_paramgen_curve:prime256v1 \
    -keyout /etc/tuic/server.key -out /etc/tuic/server.crt \
    -subj "/CN=bing.com" -days 3650 >/dev/null 2>&1
  CERT="/etc/tuic/server.crt"; KEY="/etc/tuic/server.key"
fi

if [ ! -f /etc/tuic/config.json ]; then
cat > /etc/tuic/config.json << EOF
{
  "server": "[::]:443",
  "users": {
    "00000000-0000-0000-0000-000000000000": "placeholder-do-not-remove"
  },
  "certificate": "${CERT}",
  "private_key": "${KEY}",
  "congestion_control": "bbr",
  "alpn": ["h3"],
  "udp_relay_ipv6": false,
  "zero_rtt_handshake": false,
  "dual_stack": true,
  "auth_timeout": "3s",
  "task_negotiation_timeout": "3s",
  "max_idle_time": "10s",
  "max_external_packet_size": 1500,
  "send_window": 16777216,
  "receive_window": 8388608,
  "gc_interval": "3s",
  "gc_lifetime": "15s",
  "log_level": "warn"
}
EOF
fi

cat > /etc/systemd/system/tuic-server.service << 'EOF'
[Unit]
Description=KATASHIE VPN — TUIC v5 Server
After=network.target

[Service]
Type=simple
ExecStart=/usr/local/bin/tuic-server -c /etc/tuic/config.json
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable --now tuic-server.service
log "TUIC v5 installé et démarré (port 443/udp)."
