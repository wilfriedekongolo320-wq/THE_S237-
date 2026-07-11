SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
if [ -f "$SCRIPT_DIR/ui.sh" ]; then
  source "$SCRIPT_DIR/ui.sh"
elif [ -f "/usr/local/sbin/ui.sh" ]; then
  SCRIPT_DIR="/usr/local/sbin"
  source "$SCRIPT_DIR/ui.sh"
else
  echo "Erreur : ui.sh introuvable" >&2
  exit 1
fi

menu() {
  exec bash "$SCRIPT_DIR/menu.sh"
}

export LN='\033[34m'
export BG='\033[44m'
export NC='\033[0m'
export GR='\033[32m'
export RD='\033[31m'
show_current_dns() {
current_dns=$(grep "nameserver" /etc/resolv.conf | awk '{print $2}' | xargs)
if [[ -z "$current_dns" ]]; then
current_dns="No DNS configured"
fi
echo -e "${LN}┃${NC} Current Active DNS : ${GR}${current_dns}${NC}"
echo -e "${LN}┃${NC}"
}
apply_dns() {
if systemctl is-active --quiet systemd-resolved; then
if [ -L /etc/resolv.conf ]; then
sudo unlink /etc/resolv.conf
fi
echo -e "nameserver $dns1
nameserver $dns2" | sudo tee /etc/resolv.conf > /dev/null
sudo systemctl restart systemd-resolved
else
echo -e "nameserver $dns1
nameserver $dns2" | sudo tee /etc/resolv.conf > /dev/null
fi
}
dns_menu() {
clear
menu_header "DNS PANEL" "Choisissez un fournisseur DNS"
echo -e "${MENU_CYAN}╭──────────────────────────────────────────────────╮${MENU_NC}"
show_current_dns
echo -e "${MENU_CYAN}│${NC} ${MENU_GREEN}[01]${NC} Google DNS      ${MENU_GREEN}[04]${NC} Quad9 DNS"
echo -e "${MENU_CYAN}│${NC} ${MENU_GREEN}[02]${NC} Cloudflare DNS  ${MENU_GREEN}[05]${NC} AdGuard Default"
echo -e "${MENU_CYAN}│${NC} ${MENU_GREEN}[03]${NC} OpenDNS         ${MENU_GREEN}[06]${NC} AdGuard Family"
echo -e "${MENU_CYAN}│${NC} ${MENU_YELLOW}[99]${NC} DNS personnalisé"
echo -e "${MENU_CYAN}│${NC} ${MENU_RED}[00]${NC} Retour au menu principal"
echo -e "${MENU_CYAN}╰──────────────────────────────────────────────────╯${MENU_NC}"
echo ""
read -rp " Choix : " opt
case $opt in
1 |01) dns1="8.8.8.8"; dns2="8.8.4.4"; provider="Google DNS" ;;
2 |02) dns1="1.1.1.1"; dns2="1.0.0.1"; provider="Cloudflare DNS" ;;
3 |03) dns1="208.67.222.222"; dns2="208.67.220.220"; provider="OpenDNS" ;;
4 |04) dns1="9.9.9.9"; dns2="149.112.112.112"; provider="Quad9" ;;
5 |05) dns1="94.140.14.14"; dns2="94.140.15.15"; provider="AdGuard Default" ;;
6 |06) dns1="94.140.14.15"; dns2="94.140.15.16"; provider="AdGuard Family" ;;
99)
read -rp " Enter Primary DNS  : " dns1
read -rp " Enter Secondary DNS: " dns2
provider="Custom DNS"
;;
0 |00) clear ; menu ;;
*)
echo ""
echo -e " ${RD}[ERROR] Invalid option!${NC}"
sleep 2
dns_menu
;;
esac
apply_dns
clear
menu_header "DNS PANEL" "Configuration appliquée"
echo -e "${MENU_CYAN}╭──────────────────────────────────────────────────╮${MENU_NC}"
echo -e "${MENU_CYAN}│${NC} ${MENU_GREEN}DNS configuré avec succès${MENU_NC}"
echo -e "${MENU_CYAN}│${NC} Fournisseur : ${provider}"
echo -e "${MENU_CYAN}│${NC} Primaire    : ${dns1}"
echo -e "${MENU_CYAN}│${NC} Secondaire  : ${dns2}"
echo -e "${MENU_CYAN}╰──────────────────────────────────────────────────╯${MENU_NC}"
echo ""
menu_pause
dns_menu
}
dns_menu
