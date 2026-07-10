#!/bin/bash
# ============================================================
#   KATASHIE VPN — Menu WireGuard
#   Délègue la gestion des clients au script communautaire
#   angristan/wireguard-install (installé par core/wireguard.sh),
#   dont le menu interactif gère déjà add/list/revoke proprement.
# ============================================================
RED='\033[0;31m'; BLUE='\033[0;34m'; GREEN='\033[0;32m'; NC='\033[0m'
SERVER_HOST="${SERVER_HOST:-https://raw.githubusercontent.com/abesskamer237/KATASHIE_VPN/main}"
TOOL="/etc/katashie/tools/wireguard-install.sh"

if [ ! -f "$TOOL" ] || ! command -v wg >/dev/null 2>&1; then
  echo -e "${RED}WireGuard n'est pas installé. Installation en cours...${NC}"
  curl -fsSL "${SERVER_HOST}/core/wireguard.sh" -o /tmp/wireguard_install.sh
  bash /tmp/wireguard_install.sh
fi

echo -e "${GREEN}Ouverture du gestionnaire WireGuard (ajouter/lister/révoquer un client)...${NC}"
sleep 1
bash "$TOOL"
echo ""
read -n 1 -s -r -p " Appuyez sur une touche pour revenir au menu KATASHIE..."
clear
menu
