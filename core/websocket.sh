clear
set -e
echo "[INFO] Checking for proxy dependencies..."
if ! command -v node >/dev/null 2>&1; then
echo "[ERROR] Node.js not found. Installing..."
apt update -y
apt install -y nodejs npm
else
echo "[INFO] Node.js is already installed."
fi

PROXY_JS="/usr/local/sbin/proxy3.js"
if [[ ! -f "$PROXY_JS" ]]; then
echo "[INFO] Downloading proxy3.js..."
wget -q -O "$PROXY_JS" "https://raw.githubusercontent.com/abesskamer237/KATASHIE_VPN/main/module/proxy3.js" || {
  echo "[ERROR] Failed to download proxy3.js"; exit 1
}
chmod 755 "$PROXY_JS"
else
echo "[INFO] PROXY_JS already installed."
fi

# BUG FIX: Replace fragile tmux sessions with proper systemd units
echo "[INFO] Setting up systemd units for SSH WebSocket..."

# SSH WS (Port 80 frontend → 109 backend)
cat > /etc/systemd/system/sshws.service <<'EOF'
[Unit]
Description=SSH WebSocket Proxy
After=network.target
Wants=network.target
[Service]
Type=simple
User=root
ExecStart=/usr/bin/node /usr/local/sbin/proxy3.js -dport 109 -mport 80
Restart=always
RestartSec=3
StandardOutput=journal
StandardError=journal
[Install]
WantedBy=multi-user.target
EOF

# SSH WS SSL (Port 443 frontend → 109 backend)
cat > /etc/systemd/system/sshwsssl.service <<'EOF'
[Unit]
Description=SSH WebSocket SSL Proxy
After=network.target
Wants=network.target
[Service]
Type=simple
User=root
ExecStart=/usr/bin/node /usr/local/sbin/proxy3.js -dport 109 -mport 443
Restart=always
RestartSec=3
StandardOutput=journal
StandardError=journal
[Install]
WantedBy=multi-user.target
EOF

# Enable and start services
systemctl daemon-reload
systemctl enable sshws.service sshwsssl.service
systemctl restart sshws.service sshwsssl.service

echo "[INFO] SSH WebSocket services started."
echo "[OK] WebSocket setup completed."
