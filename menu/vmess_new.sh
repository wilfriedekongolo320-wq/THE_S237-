#!/bin/bash
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
  exec bash "$SCRIPT_DIR/vmess.sh"
}

clear
menu_header "VMESS NEW" "Module temporairement désactivé"
echo -e "${MENU_CYAN}╭──────────────────────────────────────────────────╮${MENU_NC}"
echo -e "${MENU_CYAN}│${NC} Ce module est en maintenance."
echo -e "${MENU_CYAN}│${NC} Utilisez l'option VMess standard dans le menu principal."
echo -e "${MENU_CYAN}╰──────────────────────────────────────────────────╯${MENU_NC}"
echo ""
menu_pause
menu
