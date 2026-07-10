#!/bin/bash
# ============================================================
#   KATASHIE VPN — Menu TUIC v5
# ============================================================
RED='\033[0;31m'; BLUE='\033[0;34m'; GREEN='\033[0;32m'
WHITE='\033[0;37m'; BG_BLUE='\033[44m'; CYAN='\033[0;36m'; NC='\033[0m'
export DOMAIN=$(cat /etc/xray/domain 2>/dev/null || curl -s4 ifconfig.co)
CONFIG="/etc/tuic/config.json"
SERVER_HOST="${SERVER_HOST:-https://raw.githubusercontent.com/abesskamer237/KATASHIE_VPN/main}"

ensure_installed() {
  if ! systemctl list-unit-files | grep -q '^tuic-server.service'; then
    echo -e "${YELLOW}TUIC n'est pas installé. Installation en cours...${NC}"
    curl -fsSL "${SERVER_HOST}/core/tuic.sh" -o /tmp/tuic_install.sh
    bash /tmp/tuic_install.sh
  fi
}

function add_tuic() {
  clear
  echo -e "${BLUE}┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓${NC}"
  echo -e "${BLUE}┃${NC} ${BG_BLUE}        CRÉER UN COMPTE TUIC — KATASHIE          ${NC} ${BLUE}┃${NC}"
  echo -e "${BLUE}┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛${NC}"
  echo ""
  read -rp "  Nom d'utilisateur : " user
  [[ -z "$user" ]] && { tuic_menu; return; }
  grep -q "\"comment_${user}\"" "$CONFIG" 2>/dev/null && { echo -e "${RED} Existe déjà.${NC}"; sleep 2; tuic_menu; return; }
  uuid=$(cat /proc/sys/kernel/random/uuid)
  pass=$(tr -dc 'A-Za-z0-9' </dev/urandom | head -c 16)
  sed -i "/\"users\": {/a\\    \"${uuid}\": \"${pass}\",\\n    \"comment_${user}\": \"marker-do-not-use\"," "$CONFIG"
  systemctl restart tuic-server.service
  link="tuic://${uuid}:${pass}@${DOMAIN}:443?congestion_control=bbr&alpn=h3&sni=${DOMAIN}#${user}"
  clear
  echo -e "${GREEN}[OK] Compte TUIC créé pour ${user}${NC}"
  echo -e "  UUID : ${uuid}"
  echo -e "  Pass : ${pass}"
  echo -e "${CYAN}${link}${NC}"
  echo ""; read -n 1 -s -r -p " Appuyez sur une touche..."; tuic_menu
}

function list_tuic() {
  clear
  echo -e "${BLUE}  UTILISATEURS TUIC (par identifiant repère)${NC}"
  echo ""
  grep -oE '"comment_[a-zA-Z0-9_]+"' "$CONFIG" 2>/dev/null | sed 's/"comment_//;s/"//' 
  echo ""; read -n 1 -s -r -p " Appuyez sur une touche..."; tuic_menu
}

function delete_tuic() {
  clear
  grep -oE '"comment_[a-zA-Z0-9_]+"' "$CONFIG" 2>/dev/null | sed 's/"comment_//;s/"//'
  echo ""
  read -rp " Nom d'utilisateur à supprimer : " user
  [[ -z "$user" ]] && { tuic_menu; return; }
  grep -q "\"comment_${user}\"" "$CONFIG" 2>/dev/null || { echo -e "${RED} Introuvable.${NC}"; sleep 2; tuic_menu; return; }
  # Delete the marker line and the uuid line directly above it
  awk -v u="comment_${user}" '
    BEGIN{prev=""}
    { if ($0 ~ "\""u"\"") { next } else { if (prev!="") print prev; prev=$0 } }
    END{ if (prev!="") print prev }
  ' "$CONFIG" > "${CONFIG}.tmp" && mv "${CONFIG}.tmp" "$CONFIG"
  systemctl restart tuic-server.service
  echo -e "${GREEN}[OK] Compte supprimé.${NC}"
  read -n 1 -s -r -p " Appuyez sur une touche..."; tuic_menu
}

function tuic_menu() {
  ensure_installed
  clear
  echo -e "${BLUE}┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓${NC}"
  echo -e "${BLUE}┃${NC} ${BG_BLUE}          MENU TUIC — KATASHIE VPN               ${NC} ${BLUE}┃${NC}"
  echo -e "${BLUE}┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛${NC}"
  echo -e "${BLUE}┃${NC} ${GREEN}[01]${NC} • Créer un compte    ${GREEN}[03]${NC} • Utilisateurs actifs"
  echo -e "${BLUE}┃${NC} ${RED}[02]${NC} • Supprimer"
  echo -e "${BLUE}┃${NC} ${WHITE}[00]${NC} • Retour au menu principal"
  echo ""
  read -rp "  Sélectionnez une option : " opt
  case $opt in
  1|01) add_tuic ;;
  2|02) delete_tuic ;;
  3|03) list_tuic ;;
  0|00) clear; menu ;;
  *) tuic_menu ;;
  esac
}
tuic_menu
