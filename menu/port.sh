resolve_script_dir() {
  local source="${BASH_SOURCE[0]}"
  local dir=""
  while [ -L "$source" ]; do
    dir="$(cd -P "$(dirname "$source")" && pwd 2>/dev/null || pwd)"
    source="$(readlink "$source")"
    [[ "$source" != /* ]] && source="$dir/$source"
  done
  dir="$(cd -P "$(dirname "$source")" && pwd 2>/dev/null || dirname "$source")"
  printf '%s\n' "$dir"
}

SCRIPT_DIR="$(resolve_script_dir)"
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

LN='[34m'
BG='[44m'
NC='[0m'
GR='[32m'
RD='[31m'
port_info() {
clear
echo -e "${LN}┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓${NC}"
echo -e "${LN}┃${NC} ${BG}                PORT INFORMATION                ${NC} ${LN}┃${NC}"
echo -e "${LN}┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛${NC}"
echo -e "${LN}┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓${NC}"
echo -e "${LN}┃${NC} • Nginx                       : 2081"
echo -e "${LN}┃${NC} • SSH-VPN                     : 22"
echo -e "${LN}┃${NC} • SSH WS HTTPS                : 443"
echo -e "${LN}┃${NC} • SSH WS HTTP                 : 80"
echo -e "${LN}┃${NC} • Dropbear                    : 109, 143"
echo -e "${LN}┃${NC} • Stunnel4                    : 447, 777"
echo -e "${LN}┃${NC} • OpenVPN TCP                 : 1194"
echo -e "${LN}┃${NC} • OpenVPN UDP                 : 2200"
echo -e "${LN}┃${NC} • Squid Proxy                 : 3128, 8880"
echo -e "${LN}┃${NC} • OHP                         : 8000"
echo -e "${LN}┃${NC} • Slow DNS                    : 22, 53, 80, 443"
echo -e "${LN}┃${NC} • UDP Custom                  : 1-65535"
echo -e "${LN}┃${NC} • ZIVPN UDP                   : AUTO"
echo -e "${LN}┃${NC} • XRAY HTTPS                  : 443"
echo -e "${LN}┃${NC} • XRAY HTTP                   : 80"
echo -e "${LN}┃${NC} • BadVPN UDP                  : 7100, 7200, 7300"
echo -e "${LN}●━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━●${NC}"
echo -e "${LN}┃${NC} • XRAY CUSTOM PATH PORT"
echo -e "${LN}┃${NC} "
echo -e "${LN}┃${NC} • VMESS HTTPS                 : $(grep -w "VMESS CUSTOM TLS" /etc/xray/port_info | cut -d: -f2 | tr -d ' ')"
echo -e "${LN}┃${NC} • VMESS HTTP                  : $(grep -w "VMESS CUSTOM NTLS" /etc/xray/port_info | cut -d: -f2 | tr -d ' ')"
echo -e "${LN}┃${NC} • VLSSS HTTPS                 : $(grep -w "VLESS CUSTOM TLS" /etc/xray/port_info | cut -d: -f2 | tr -d ' ')"
echo -e "${LN}┃${NC} • VLESS HTTP                  : $(grep -w "VLESS CUSTOM NTLS" /etc/xray/port_info | cut -d: -f2 | tr -d ' ')"
echo -e "${LN}┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛${NC}"
echo -e "${LN}●━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━●${NC}"
echo ""
read -n 1 -s -r -p " Press any key to return..."
menu
}
port_info
