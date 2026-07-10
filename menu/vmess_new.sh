#!/bin/bash
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/ui.sh"

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
