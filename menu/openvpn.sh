#!/bin/bash
# ============================================================
#   KATASHIE VPN — Menu OpenVPN
#   Délègue la gestion des clients au script communautaire
#   angristan/openvpn-install (installé par core/openvpn.sh),
#   dont le menu interactif gère déjà add/list/revoke proprement.
# ============================================================
RED='\033[0;31m'; GREEN='\033[0;32m'; NC='\033[0m'
SERVER_HOST="${SERVER_HOST:-https://raw.githubusercontent.com/abesskamer237/KATASHIE_VPN/main}"
TOOL="/etc/katashie/tools/openvpn-install.sh"

if [ ! -f "$TOOL" ] || [ ! -d /etc/openvpn ]; then
  echo -e "${RED}OpenVPN n'est pas installé. Installation en cours...${NC}"
  curl -fsSL "${SERVER_HOST}/core/openvpn.sh" -o /tmp/openvpn_install.sh
  bash /tmp/openvpn_install.sh
fi

echo -e "${GREEN}Ouverture du gestionnaire OpenVPN (ajouter/lister/révoquer un client)...${NC}"
sleep 1
bash "$TOOL"
echo ""
read -n 1 -s -r -p " Appuyez sur une touche pour revenir au menu KATASHIE..."
clear
menu
