#!/bin/bash
# ============================================================
#   KATASHIE VPN — Menu Shadowsocks (WS + gRPC via Xray)
# ============================================================
RED='\033[0;31m'; BLUE='\033[0;34m'; GREEN='\033[0;32m'
WHITE='\033[0;37m'; BG_BLUE='\033[44m'; CYAN='\033[0;36m'; NC='\033[0m'
export DOMAIN=$(cat /etc/xray/domain 2>/dev/null || echo "N/A")
XRAY_CONFIG="/etc/xray/config.json"
METHOD="aes-128-gcm"

b64() { echo -n "$1" | base64 -w0; }

function add_ss() {
  clear
  while true; do
    echo -e "${BLUE}┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓${NC}"
    echo -e "${BLUE}┃${NC} ${BG_BLUE}    CRÉER UN COMPTE SHADOWSOCKS — KATASHIE       ${NC} ${BLUE}┃${NC}"
    echo -e "${BLUE}┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛${NC}"
    echo ""
    read -rp "  Nom d'utilisateur : " user
    [[ -z "$user" ]] && { echo -e " ${RED}Requis.${NC}"; continue; }
    [[ ! "$user" =~ ^[a-zA-Z0-9_]+$ ]] && { echo -e " ${RED}Lettres, chiffres, underscore uniquement.${NC}"; continue; }
    grep -qw "$user" "$XRAY_CONFIG" 2>/dev/null && { echo -e " ${RED}Existe déjà.${NC}"; sleep 2; clear; continue; }
    break
  done
  while true; do
    read -rp "  Validité (jours) : " days
    [[ "$days" =~ ^[0-9]+$ && "$days" -gt 0 ]] && break
    echo -e " ${RED}Nombre de jours invalide.${NC}"
  done
  pass=$(cat /proc/sys/kernel/random/uuid)
  exp=$(date -d "+$days days" +"%Y-%m-%d")
  sed -i "/#ssws$/a\\#& $user $exp $pass\\n},{\"method\": \"$METHOD\",\"password\": \"$pass\",\"email\": \"$user\"" "$XRAY_CONFIG"
  sed -i "/#ssgrpc$/a\\#& $user $exp $pass\\n},{\"method\": \"$METHOD\",\"password\": \"$pass\",\"email\": \"$user\"" "$XRAY_CONFIG"
  systemctl restart xray 2>/dev/null
  userinfo=$(b64 "${METHOD}:${pass}")
  sslink_ws="ss://${userinfo}@${DOMAIN}:443?path=/ssws&security=tls&type=ws#${user}"
  sslink_grpc="ss://${userinfo}@${DOMAIN}:443?mode=gun&security=tls&type=grpc&serviceName=ss-grpc#${user}"
  clear
  echo -e "${GREEN}┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓${NC}"
  echo -e "${GREEN}┃${NC} ${BG_BLUE}     COMPTE SHADOWSOCKS CRÉÉ                     ${NC} ${GREEN}┃${NC}"
  echo -e "${GREEN}┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛${NC}"
  echo -e "${BLUE}┃${NC} Utilisateur : ${user}"
  echo -e "${BLUE}┃${NC} Expiration  : ${exp}"
  echo -e "${BLUE}┃${NC} Méthode     : ${METHOD}"
  echo -e "${BLUE}┃${NC} Mot de passe: ${pass}"
  echo -e "${BLUE}●━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━●${NC}"
  echo -e "${CYAN}WS  :${NC} ${sslink_ws}"
  echo -e "${CYAN}gRPC:${NC} ${sslink_grpc}"
  echo ""; read -n 1 -s -r -p " Appuyez sur une touche pour revenir au menu..."
  ss_menu
}

function renew_ss() {
  local n; n=$(grep -c -E "^#& " "$XRAY_CONFIG" 2>/dev/null || echo 0)
  [[ "$n" -eq 0 ]] && { clear; echo -e "${RED}  Aucun client existant.${NC}"; sleep 2; ss_menu; return; }
  clear
  grep -E "^#& " "$XRAY_CONFIG" | awk '{print $2, $3}' | sort -u
  echo ""
  read -rp "  Nom d'utilisateur : " user
  [[ -z "$user" ]] && { ss_menu; return; }
  grep -qwE "^#& $user" "$XRAY_CONFIG" || { echo -e "${RED} Introuvable.${NC}"; sleep 2; ss_menu; return; }
  read -rp "  Jours à ajouter : " days
  [[ "$days" =~ ^[0-9]+$ && "$days" -gt 0 ]] || { echo -e "${RED} Entier positif requis.${NC}"; sleep 2; ss_menu; return; }
  exp=$(grep -wE "^#& $user" "$XRAY_CONFIG" | awk '{print $3}' | sort -u)
  pass=$(grep -wE "^#& $user" "$XRAY_CONFIG" | awk '{print $4}' | sort -u)
  d1=$(date -d "$exp" +%s); d2=$(date +%s)
  remaining=$(( (d1 - d2) / 86400 ))
  newexp=$(date -d "$(( remaining + days )) days" +"%Y-%m-%d")
  sed -i "/^#& $user /c\\#& $user $newexp $pass" "$XRAY_CONFIG"
  systemctl restart xray >/dev/null 2>&1
  echo -e "${GREEN}[OK] Nouvelle expiration: $newexp${NC}"
  read -n 1 -s -r -p " Appuyez sur une touche..."; ss_menu
}

function delete_ss() {
  clear
  grep -E "^#& " "$XRAY_CONFIG" | awk '{print $2, $3}' | sort -u
  echo ""
  read -rp " Nom d'utilisateur à supprimer : " user
  [[ -z "$user" ]] && { ss_menu; return; }
  grep -qwE "^#& $user" "$XRAY_CONFIG" || { echo -e "${RED} Introuvable.${NC}"; sleep 2; ss_menu; return; }
  sed -i -e "/^#& $user /d" -e "/\"email\": \"$user\"/d" "$XRAY_CONFIG"
  systemctl restart xray >/dev/null 2>&1
  echo -e "${GREEN}[OK] Compte supprimé.${NC}"
  read -n 1 -s -r -p " Appuyez sur une touche..."; ss_menu
}

function list_ss() {
  clear
  echo -e "${BLUE}  UTILISATEURS SHADOWSOCKS ACTIFS${NC}"
  echo ""
  grep -E "^#& " "$XRAY_CONFIG" | awk '{print $2, $3}' | sort -u
  echo ""; read -n 1 -s -r -p " Appuyez sur une touche..."; ss_menu
}

function ss_menu() {
  clear
  echo -e "${BLUE}┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓${NC}"
  echo -e "${BLUE}┃${NC} ${BG_BLUE}       MENU SHADOWSOCKS — KATASHIE VPN           ${NC} ${BLUE}┃${NC}"
  echo -e "${BLUE}┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛${NC}"
  echo -e "${BLUE}┃${NC} ${GREEN}[01]${NC} • Créer un compte    ${GREEN}[04]${NC} • Utilisateurs actifs"
  echo -e "${BLUE}┃${NC} ${GREEN}[02]${NC} • Renouveler"
  echo -e "${BLUE}┃${NC} ${RED}[03]${NC} • Supprimer"
  echo -e "${BLUE}┃${NC} ${WHITE}[00]${NC} • Retour au menu principal"
  echo ""
  read -rp "  Sélectionnez une option : " opt
  case $opt in
  1|01) add_ss ;;
  2|02) renew_ss ;;
  3|03) delete_ss ;;
  4|04) list_ss ;;
  0|00) clear; menu ;;
  *) ss_menu ;;
  esac
}
ss_menu
