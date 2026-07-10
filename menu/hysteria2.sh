#!/bin/bash
# ============================================================
#   KATASHIE VPN — Menu Hysteria2
# ============================================================
RED='\033[0;31m'; BLUE='\033[0;34m'; GREEN='\033[0;32m'
WHITE='\033[0;37m'; BG_BLUE='\033[44m'; CYAN='\033[0;36m'; NC='\033[0m'
export DOMAIN=$(cat /etc/xray/domain 2>/dev/null || curl -s4 ifconfig.co)
CONFIG="/etc/hysteria/config.yaml"
DB="/etc/hysteria/users.db"
PORT=36712
SERVER_HOST="${SERVER_HOST:-https://raw.githubusercontent.com/abesskamer237/KATASHIE_VPN/main}"

ensure_installed() {
  if ! systemctl list-unit-files | grep -q '^hysteria-server.service'; then
    echo -e "${YELLOW}Hysteria2 n'est pas installé. Installation en cours...${NC}"
    curl -fsSL "${SERVER_HOST}/core/hysteria2.sh" -o /tmp/hysteria2_install.sh
    bash /tmp/hysteria2_install.sh
  fi
}

function add_hy2() {
  clear
  echo -e "${BLUE}┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓${NC}"
  echo -e "${BLUE}┃${NC} ${BG_BLUE}      CRÉER UN COMPTE HYSTERIA2 — KATASHIE       ${NC} ${BLUE}┃${NC}"
  echo -e "${BLUE}┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛${NC}"
  echo ""
  read -rp "  Nom d'utilisateur : " user
  [[ -z "$user" ]] && { hy2_menu; return; }
  grep -qw "$user" "$DB" 2>/dev/null && { echo -e "${RED} Existe déjà.${NC}"; sleep 2; hy2_menu; return; }
  read -rp "  Validité (jours) : " days
  [[ "$days" =~ ^[0-9]+$ && "$days" -gt 0 ]] || { echo -e "${RED} Jours invalides.${NC}"; sleep 2; hy2_menu; return; }
  pass=$(tr -dc 'A-Za-z0-9' </dev/urandom | head -c 16)
  exp=$(date -d "+$days days" +"%Y-%m-%d")
  echo -e "$user\t$pass\t$exp" >> "$DB"
  sed -i "/# USERS-END/i\\    ${user}: ${pass}" "$CONFIG"
  systemctl restart hysteria-server.service
  link="hysteria2://${pass}@${DOMAIN}:${PORT}/?insecure=1&sni=${DOMAIN}#${user}"
  clear
  echo -e "${GREEN}[OK] Compte Hysteria2 créé pour ${user} (expire le ${exp})${NC}"
  echo -e "${CYAN}${link}${NC}"
  echo -e "${WHITE}(insecure=1 requis si certificat auto-signé)${NC}"
  echo ""; read -n 1 -s -r -p " Appuyez sur une touche..."; hy2_menu
}

function list_hy2() {
  clear
  echo -e "${BLUE}  UTILISATEURS HYSTERIA2${NC}"
  echo ""
  [ -f "$DB" ] && awk -F'\t' '{printf "  %-16s expire: %s\n", $1, $3}' "$DB"
  echo ""; read -n 1 -s -r -p " Appuyez sur une touche..."; hy2_menu
}

function delete_hy2() {
  clear
  [ -f "$DB" ] && awk -F'\t' '{print "  "$1}' "$DB"
  echo ""
  read -rp " Nom d'utilisateur à supprimer : " user
  [[ -z "$user" ]] && { hy2_menu; return; }
  grep -qw "$user" "$DB" 2>/dev/null || { echo -e "${RED} Introuvable.${NC}"; sleep 2; hy2_menu; return; }
  sed -i "/^${user}\t/d" "$DB"
  sed -i "/^    ${user}: /d" "$CONFIG"
  systemctl restart hysteria-server.service
  echo -e "${GREEN}[OK] Compte supprimé.${NC}"
  read -n 1 -s -r -p " Appuyez sur une touche..."; hy2_menu
}

function hy2_menu() {
  ensure_installed
  clear
  echo -e "${BLUE}┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓${NC}"
  echo -e "${BLUE}┃${NC} ${BG_BLUE}        MENU HYSTERIA2 — KATASHIE VPN            ${NC} ${BLUE}┃${NC}"
  echo -e "${BLUE}┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛${NC}"
  echo -e "${BLUE}┃${NC} ${GREEN}[01]${NC} • Créer un compte    ${GREEN}[03]${NC} • Utilisateurs actifs"
  echo -e "${BLUE}┃${NC} ${RED}[02]${NC} • Supprimer"
  echo -e "${BLUE}┃${NC} ${WHITE}[00]${NC} • Retour au menu principal"
  echo ""
  read -rp "  Sélectionnez une option : " opt
  case $opt in
  1|01) add_hy2 ;;
  2|02) delete_hy2 ;;
  3|03) list_hy2 ;;
  0|00) clear; menu ;;
  *) hy2_menu ;;
  esac
}
hy2_menu
