#!/bin/bash
# ============================================================
#   KATASHIE VPN — Installateur OpenVPN
#   Basé sur le script communautaire éprouvé angristan/openvpn-install
# ============================================================
set -e
mkdir -p /etc/katashie/tools
curl -fsSL -o /etc/katashie/tools/openvpn-install.sh \
  https://raw.githubusercontent.com/angristan/openvpn-install/master/openvpn-install.sh
chmod +x /etc/katashie/tools/openvpn-install.sh
AUTO_INSTALL=y bash /etc/katashie/tools/openvpn-install.sh
echo "[INFO] OpenVPN installé. Gérez les clients via le menu 'openvpn'."
