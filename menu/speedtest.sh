#!/bin/bash
# ============================================================
#   KATASHIE VPN — Speedtest serveur
# ============================================================
GREEN='\033[0;32m'; YELLOW='\033[0;33m'; NC='\033[0m'

if ! command -v speedtest >/dev/null 2>&1; then
  echo -e "${YELLOW}Installation de speedtest-cli (Ookla)...${NC}"
  curl -fsSL https://packagecloud.io/install/repositories/ookla/speedtest-cli/script.deb.sh | bash >/dev/null 2>&1
  apt-get install -y speedtest >/dev/null 2>&1
fi

echo -e "${GREEN}Test de débit du serveur en cours...${NC}"
speedtest --accept-license --accept-gdpr
echo ""
read -n 1 -s -r -p " Appuyez sur une touche pour revenir au menu..."
clear
menu
