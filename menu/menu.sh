#!/bin/bash
# ============================================================
#   KATASHIE VPN — Menu Principal
#   Remplace: menu.sh (nexus)
# ============================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/ui.sh"

# ─── Couleurs ────────────────────────────────────────────────
RED='\033[0;31m'
BLUE='\033[0;34m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
WHITE='\033[0;37m'
CYAN='\033[0;36m'
BOLD='\033[1m'
BG_BLUE='\033[44m'
NC='\033[0m'

# Compat héritage
export LN="${BLUE}"
export BG="${BG_BLUE}"
export GR="${GREEN}"
export RD="${RED}"

MYIP=$(curl -sS ipv4.icanhazip.com 2>/dev/null || wget -qO- ipv4.icanhazip.com)
readonly SERVER_HOST="https://raw.githubusercontent.com/abesskamer237/KATASHIE_VPN/main"
clear

domain=$(cat /etc/xray/domain 2>/dev/null || echo "N/A")
uptime_str="$(uptime -p 2>/dev/null | cut -d ' ' -f 2-10 || echo 'N/A')"
IPV4=$(curl -s -4 ifconfig.co 2>/dev/null || echo 'N/A')

# ─── Vérification de version ──────────────────────────────────
VERSION_FILE="/etc/katashie/version"
INSTALLED_VERSION=$(cat "$VERSION_FILE" 2>/dev/null || cat /etc/version 2>/dev/null || echo "2.0.0")
LATEST_VERSION=$(curl -sS "$SERVER_HOST/version" 2>/dev/null || echo "$INSTALLED_VERSION")
UPDATE_AVAILABLE=0
version_greater() {
    [ "$(printf '%s\n%s\n' "$1" "$2" | sort -V | tail -n1)" = "$1" ] && [ "$1" != "$2" ]
}
if version_greater "$LATEST_VERSION" "$INSTALLED_VERSION"; then
    UPDATE_AVAILABLE=1
    wget -q -O /usr/local/sbin/update "$SERVER_HOST/menu/update.sh" 2>/dev/null && chmod +x /usr/local/sbin/update
fi

# ─── Statut des services ──────────────────────────────────────
get_status() {
    local svc=$1
    if systemctl is-active "$svc" >/dev/null 2>&1; then
        echo -e "${GREEN}●RUN${NC}"
    else
        echo -e "${RED}○OFF${NC}"
    fi
}
s_nginx=$(get_status nginx)
s_xray=$(get_status xray)
s_ws=$(get_status ws-stunnel)

# ─── Infos OS ─────────────────────────────────────────────────
if [ -f /etc/os-release ]; then
    . /etc/os-release
    OS_NAME="$NAME $VERSION_ID"
else
    OS_NAME=$(uname -s)
fi

clear
menu_header "KATASHIE VPN" "Gestion VPN • Services • Bots"
echo -e "${MENU_CYAN}╭──────────────────────────────────────────────────╮${NC}"
echo -e "${MENU_CYAN}│${NC} ${MENU_WHITE}OS${MENU_NC}: ${OS_NAME}    ${MENU_WHITE}IP${MENU_NC}: ${IPV4}"
echo -e "${MENU_CYAN}│${NC} ${MENU_WHITE}Domaine${MENU_NC}: ${domain}    ${MENU_WHITE}Uptime${MENU_NC}: ${uptime_str}"
echo -e "${MENU_CYAN}╰──────────────────────────────────────────────────╯${MENU_NC}"
echo -e "${MENU_CYAN}╭──────────────────────────────────────────────────╮${MENU_NC}"
echo -e "${MENU_CYAN}│${NC} ${MENU_GREEN}NGINX${MENU_NC}: [${s_nginx}]  ${MENU_GREEN}XRAY${MENU_NC}: [${s_xray}]  ${MENU_GREEN}WS${MENU_NC}: [${s_ws}]"
echo -e "${MENU_CYAN}╰──────────────────────────────────────────────────╯${MENU_NC}"

echo ""
menu_section "PROTOCOLES VPN"
menu_option "01" "SSH / WebSocket" "$GREEN"
menu_option "02" "VMess" "$GREEN"
menu_option "03" "VLESS" "$GREEN"
menu_option "04" "Trojan" "$GREEN"
menu_option "05" "Socks" "$GREEN"
menu_option "06" "ZIVPN" "$GREEN"

echo ""
menu_section "OUTILS & GESTION"
menu_option "07" "DNS Panel" "$CYAN"
menu_option "08" "Domaine Panel" "$CYAN"
menu_option "09" "IPv6 Panel" "$CYAN"
menu_option "10" "Statut VPS" "$CYAN"
menu_option "11" "NetGuard" "$CYAN"
menu_option "12" "Ports VPN" "$CYAN"
menu_option "13" "Nettoyer Logs" "$CYAN"
menu_option "14" "Fast DNS" "$CYAN"

echo ""
menu_section "BOTS & PANNEAU"
menu_option "15" "Bot Telegram" "$YELLOW"
menu_option "16" "Bot Deploy" "$YELLOW"
menu_option "17" "Bot WhatsApp" "$YELLOW"
menu_option "18" "Panneau Web" "$WHITE"

echo ""
menu_section "SYSTEME"
menu_option "88" "Redémarrer VPS" "$RED"
menu_option "99" "Mise à jour" "$RED"
menu_option "00" "Quitter" "$WHITE"

echo ""
if [ "$UPDATE_AVAILABLE" -eq 1 ] 2>/dev/null; then
    echo -e "${YELLOW}⚡ Mise à jour disponible v${LATEST_VERSION}${NC}"
fi

if [ "$UPDATE_AVAILABLE" -eq 1 ] 2>/dev/null; then
    echo -e "${YELLOW}┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓${NC}"
    echo -e "${YELLOW}┃${NC} ${YELLOW}[99]${NC} • ⚡ MISE À JOUR DISPONIBLE (v${LATEST_VERSION})"
    echo -e "${YELLOW}┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛${NC}"
fi

echo -e "${BLUE}┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓${NC}"
echo -e "${BLUE}┃${NC} ${WHITE}Version    :${NC} ${INSTALLED_VERSION}"
echo -e "${BLUE}┃${NC} ${WHITE}Script by  :${NC} KATASHIE TEAM"
echo -e "${BLUE}┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛${NC}"
echo -e "${BLUE}●━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━●${NC}"
echo ""
read -p "  Sélectionnez une option : " opt
echo ""
case $opt in
1 | 01) clear ; exec bash "$SCRIPT_DIR/ssh.sh" ;;
2 | 02) clear ; exec bash "$SCRIPT_DIR/vmess.sh" ;;
3 | 03) clear ; exec bash "$SCRIPT_DIR/vless.sh" ;;
4 | 04) clear ; exec bash "$SCRIPT_DIR/trojan.sh" ;;
5 | 05) clear ; exec bash "$SCRIPT_DIR/socks.sh" ;;
6 | 06) clear ; exec bash "$SCRIPT_DIR/zivpn.sh" ;;
7 | 07) clear ; exec bash "$SCRIPT_DIR/dns.sh" ;;
8 | 08) clear ; exec bash "$SCRIPT_DIR/domain.sh" ;;
9 | 09) clear ; exec bash "$SCRIPT_DIR/iptools.sh" ;;
10)     clear ; exec bash "$SCRIPT_DIR/status.sh" ;;
11)     clear ; exec bash "$SCRIPT_DIR/netguard.sh" ;;
12)     clear ; exec bash "$SCRIPT_DIR/port.sh" ;;
13)     clear ; exec bash "$SCRIPT_DIR/log.sh" ;;
14)     clear ; exec bash "$SCRIPT_DIR/fastdns.sh" ;;
15)     clear ; bash "$SCRIPT_DIR/../katashie_core_bot/install.sh" ;;
16)     clear ; bash "$SCRIPT_DIR/../katashie_deploy_bot/install.sh" ;;
17)     clear ; bash "$SCRIPT_DIR/../katashie_whatsapp_bot/install.sh" ;;
18)     clear ; exec bash "$SCRIPT_DIR/web.sh" ;;
88)     reboot ;;
99)     clear ; exec bash "$SCRIPT_DIR/update.sh" ;;
0 | 00) exit 0 ;;
*)      clear ; exec bash "$SCRIPT_DIR/menu.sh" ;;
esac
