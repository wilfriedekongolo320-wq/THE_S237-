#!/bin/bash
# ============================================================
#   KATASHIE VPN — Menu Principal (v3 "NEON HACK")
#   Style: hacking / terminal néon, multi-couleurs
# ============================================================

# ─── Palette néon ──────────────────────────────────────────────
GREEN='\033[0;32m'; LGREEN='\033[1;32m'
CYAN='\033[0;36m';  LCYAN='\033[1;36m'
MAGENTA='\033[0;35m'; LMAGENTA='\033[1;35m'
YELLOW='\033[1;33m'
RED='\033[1;31m'
WHITE='\033[1;37m'
GREY='\033[0;90m'
BOLD='\033[1m'
BLINK='\033[5m'
NC='\033[0m'

# Compat héritage (anciens scripts)
export LN="${CYAN}"; export BG="${MAGENTA}"; export GR="${GREEN}"; export RD="${RED}"

readonly SERVER_HOST="https://raw.githubusercontent.com/abesskamer237/KATASHIE_VPN/main"
clear

MYIP=$(curl -sS ipv4.icanhazip.com 2>/dev/null || wget -qO- ipv4.icanhazip.com)
domain=$(cat /etc/xray/domain 2>/dev/null || echo "N/A")
uptime_str="$(uptime -p 2>/dev/null | sed 's/up //' || echo 'N/A')"
IPV4=$(curl -s -4 ifconfig.co 2>/dev/null || echo "$MYIP")
CPU_LOAD=$(uptime | awk -F'load average:' '{print $2}' | cut -d, -f1 | xargs)
RAM_USED=$(free -m | awk '/Mem:/ {printf "%s/%sMo", $3, $2}')

# ─── Version / mise à jour ─────────────────────────────────────
VERSION_FILE="/etc/katashie/version"
INSTALLED_VERSION=$(cat "$VERSION_FILE" 2>/dev/null || cat /etc/version 2>/dev/null || echo "3.0.0")
LATEST_VERSION=$(curl -sS "$SERVER_HOST/version" 2>/dev/null || echo "$INSTALLED_VERSION")
UPDATE_AVAILABLE=0
version_greater() {
    [ "$(printf '%s\n%s\n' "$1" "$2" | sort -V | tail -n1)" = "$1" ] && [ "$1" != "$2" ]
}
if version_greater "$LATEST_VERSION" "$INSTALLED_VERSION"; then
    UPDATE_AVAILABLE=1
    wget -q -O /usr/local/sbin/update "$SERVER_HOST/menu/update.sh" 2>/dev/null && chmod +x /usr/local/sbin/update
fi

# ─── Statut services ────────────────────────────────────────────
get_status() {
    local svc=$1
    if systemctl is-active "$svc" >/dev/null 2>&1; then
        echo -e "${LGREEN}●ON ${NC}"
    else
        echo -e "${RED}○OFF${NC}"
    fi
}
s_nginx=$(get_status nginx)
s_xray=$(get_status xray)
s_ws=$(get_status ws-stunnel)
s_web=$(get_status nexus-web)
s_corebot=$(get_status katashie-core-bot)
s_deploybot=$(get_status katashie-deploy-bot)
s_wabot=$(get_status katashie-whatsapp-bot)

if [ -f /etc/os-release ]; then
    . /etc/os-release
    OS_NAME="$NAME $VERSION_ID"
else
    OS_NAME=$(uname -s)
fi

# ─── Petits helpers d'affichage ────────────────────────────────
line()  { printf "${GREY}%s${NC}\n" "───────────────────────────────────────────────────────"; }
top()   { echo -e "${MAGENTA}╔══════════════════════════════════════════════════════╗${NC}"; }
mid()   { echo -e "${MAGENTA}╠══════════════════════════════════════════════════════╣${NC}"; }
bot()   { echo -e "${MAGENTA}╚══════════════════════════════════════════════════════╝${NC}"; }
row()   { printf "${MAGENTA}║${NC} %-54s ${MAGENTA}║${NC}\n" "$1"; }

clear
echo -e "${LGREEN}"
cat << 'BANNER'
 ██╗  ██╗ █████╗ ████████╗ █████╗ ███████╗██╗  ██╗██╗███████╗
 ██║ ██╔╝██╔══██╗╚══██╔══╝██╔══██╗██╔════╝██║  ██║██║██╔════╝
 █████╔╝ ███████║   ██║   ███████║███████╗███████║██║█████╗
 ██╔═██╗ ██╔══██║   ██║   ██╔══██║╚════██║██╔══██║██║██╔══╝
 ██║  ██╗██║  ██║   ██║   ██║  ██║███████║██║  ██║██║███████╗
 ╚═╝  ╚═╝╚═╝  ╚═╝   ╚═╝   ╚═╝  ╚═╝╚══════╝╚═╝  ╚═╝╚═╝╚══════╝
BANNER
echo -e "${LCYAN}          [ V P N   C O N T R O L   C E N T E R ]${NC}"
echo -e "${NC}"

top
row "$(echo -e ${WHITE}SYSTÈME${NC})"
mid
row "$(echo -e ${GREY}OS      ${NC}: ${CYAN}${OS_NAME}${NC})"
row "$(echo -e ${GREY}Uptime  ${NC}: ${CYAN}${uptime_str}${NC})"
row "$(echo -e ${GREY}CPU load${NC}: ${CYAN}${CPU_LOAD}${NC}   ${GREY}RAM${NC}: ${CYAN}${RAM_USED}${NC})"
row "$(echo -e ${GREY}IP      ${NC}: ${YELLOW}${IPV4}${NC})"
row "$(echo -e ${GREY}Domaine ${NC}: ${YELLOW}${domain}${NC})"
bot

top
row "$(echo -e ${WHITE}SERVICES${NC})"
mid
row "$(echo -e NGINX:${s_nginx}  XRAY:${s_xray}  WS:${s_ws})"
row "$(echo -e WEB:${s_web}  BOT-CORE:${s_corebot})"
row "$(echo -e BOT-DEPLOY:${s_deploybot}  BOT-WA:${s_wabot})"
bot

top
row "$(echo -e ${WHITE}PROTOCOLES VPN${NC})"
mid
row "$(echo -e ${LGREEN}[01]${NC} SSH / WebSocket      ${LGREEN}[07]${NC} SHADOWSOCKS)"
row "$(echo -e ${LGREEN}[02]${NC} VMESS                ${LGREEN}[08]${NC} HYSTERIA2)"
row "$(echo -e ${LGREEN}[03]${NC} VLESS                ${LGREEN}[09]${NC} TUIC)"
row "$(echo -e ${LGREEN}[04]${NC} TROJAN               ${LGREEN}[10]${NC} WIREGUARD)"
row "$(echo -e ${LGREEN}[05]${NC} SOCKS5               ${LGREEN}[11]${NC} OPENVPN)"
row "$(echo -e ${LGREEN}[06]${NC} ZIVPN \(UDP\)         ${LGREEN}[12]${NC} VLESS+WS+TLS)"
bot

top
row "$(echo -e ${WHITE}OUTILS SERVEUR${NC})"
mid
row "$(echo -e ${LCYAN}[20]${NC} DNS Panel            ${LCYAN}[25]${NC} Ports VPN)"
row "$(echo -e ${LCYAN}[21]${NC} Domaine Panel        ${LCYAN}[26]${NC} Nettoyer Logs)"
row "$(echo -e ${LCYAN}[22]${NC} IP Tools             ${LCYAN}[27]${NC} Fast DNS)"
row "$(echo -e ${LCYAN}[23]${NC} Statut VPS           ${LCYAN}[28]${NC} Speedtest)"
row "$(echo -e ${LCYAN}[24]${NC} NetGuard \(sécurité\))"
bot

top
row "$(echo -e ${WHITE}DÉPLOIEMENT${NC} ${GREY}\(panneau web \& bots\)${NC})"
mid
row "$(echo -e ${LMAGENTA}[30]${NC} Panneau Web KATASHIE     [${s_web}])"
row "$(echo -e ${LMAGENTA}[31]${NC} Bot Telegram — Core      [${s_corebot}])"
row "$(echo -e ${LMAGENTA}[32]${NC} Bot Telegram — Deploy    [${s_deploybot}])"
row "$(echo -e ${LMAGENTA}[33]${NC} Bot WhatsApp             [${s_wabot}])"
row "$(echo -e ${LMAGENTA}[34]${NC} Déployer TOUT \(web + 3 bots\))"
bot

if [ "$UPDATE_AVAILABLE" -eq 1 ] 2>/dev/null; then
    echo -e "${YELLOW}╔══════════════════════════════════════════════════════╗${NC}"
    echo -e "${YELLOW}║${NC} ${BLINK}⚡${NC} ${YELLOW}[99] MISE À JOUR DISPONIBLE → v${LATEST_VERSION}${NC}"
    echo -e "${YELLOW}╚══════════════════════════════════════════════════════╝${NC}"
fi

top
row "$(echo -e ${RED}[15]${NC} Désinstaller             ${RED}[88]${NC} Redémarrer VPS)"
row "$(echo -e ${WHITE}[00]${NC} Quitter)"
bot

line
echo -e " ${GREY}Version ${NC}${LGREEN}${INSTALLED_VERSION}${NC}  ${GREY}|${NC}  ${GREY}by${NC} ${LMAGENTA}KATASHIE TEAM${NC}"
line
echo ""
echo -ne " ${LGREEN}root@katashie${NC}:${CYAN}~${NC}\$ ${WHITE}"
read -p "Sélectionnez une option : " opt
echo -e "${NC}"

case $opt in
1 | 01) clear ; ssh ;;
2 | 02) clear ; vmess ;;
3 | 03) clear ; vless ;;
4 | 04) clear ; trojan ;;
5 | 05) clear ; socks ;;
6 | 06) clear ; zivpn ;;
7 | 07) clear ; shadowsocks ;;
8 | 08) clear ; hysteria2 ;;
9 | 09) clear ; tuic ;;
10)     clear ; wireguard ;;
11)     clear ; openvpn ;;
12)     clear ; vlesstls ;;
20)     clear ; dns ;;
21)     clear ; domain ;;
22)     clear ; iptools ;;
23)     clear ; status ;;
24)     clear ; netguard ;;
25)     clear ; port ;;
26)     clear ; log ;;
27)     clear ; fastdns ;;
28)     clear ; speedtest ;;
30)     clear ; web ;;
31)     clear ; deploy corebot ;;
32)     clear ; deploy deploybot ;;
33)     clear ; deploy whatsapp ;;
34)     clear ; deploy all ;;
15)     clear ; uninstall ;;
88)     reboot ;;
99)     clear ; update ;;
0 | 00) exit 0 ;;
*)      clear ; menu ;;
esac
