#!/bin/bash
# ============================================================
#   KATASHIE VPN — Menu VLESS+WS+TLS (direct, sans nginx)
#   Écoute en direct sur le port 8443 avec le certificat du
#   domaine — utile en complément du VLESS+WS classique (443
#   derrière nginx) pour un chemin TLS indépendant.
# ============================================================
RED='\033[0;31m'; BLUE='\033[0;34m'; GREEN='\033[0;32m'
YELLOW='\033[0;33m'; WHITE='\033[0;37m'; BG_BLUE='\033[44m'; CYAN='\033[0;36m'; NC='\033[0m'
export DOMAIN=$(cat /etc/xray/domain 2>/dev/null || echo "N/A")
XRAY_CONFIG="/etc/xray/config.json"
VLESSTLS_PORT=8443

function add_vlesstls() {
  clear
  while true; do
    echo -e "${BLUE}┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓${NC}"
    echo -e "${BLUE}┃${NC} ${BG_BLUE}     CRÉER UN COMPTE VLESS+WS+TLS — KATASHIE     ${NC} ${BLUE}┃${NC}"
    echo -e "${BLUE}┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛${NC}"
    echo ""
    read -rp "  Nom d'utilisateur : " user
    [[ -z "$user" ]] && { echo -e " ${RED}Le nom d'utilisateur ne peut pas être vide.${NC}"; continue; }
    [[ ! "$user" =~ ^[a-zA-Z0-9_]+$ ]] && { echo -e " ${RED}Caractères autorisés: lettres, chiffres, underscore.${NC}"; continue; }
    grep -qw "$user" "$XRAY_CONFIG" 2>/dev/null && { echo -e " ${RED}Ce nom d'utilisateur existe déjà.${NC}"; sleep 2; clear; continue; }
    break
  done
  while true; do
    read -rp "  Validité (jours) : " days
    [[ "$days" =~ ^[0-9]+$ && "$days" -gt 0 ]] && break
    echo -e " ${RED}Entrez un nombre de jours valide.${NC}"
  done
  uuid=$(cat /proc/sys/kernel/random/uuid)
  exp=$(date -d "+$days days" +"%Y-%m-%d")
  sed -i "/#vlesstls$/a\\#& $user $exp $uuid\\n},{\"id\": \"$uuid\",\"email\": \"$user\"" "$XRAY_CONFIG"
  systemctl restart xray 2>/dev/null
  link="vless://${uuid}@${DOMAIN}:${VLESSTLS_PORT}?path=/vlesstls&security=tls&encryption=none&type=ws&sni=${DOMAIN}#${user}"
  clear
  echo -e "${GREEN}┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓${NC}"
  echo -e "${GREEN}┃${NC} ${BG_BLUE}       COMPTE VLESS+WS+TLS CRÉÉ                  ${NC} ${GREEN}┃${NC}"
  echo -e "${GREEN}┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛${NC}"
  echo -e "${BLUE}┃${NC} Utilisateur : ${user}"
  echo -e "${BLUE}┃${NC} Expiration  : ${exp}"
  echo -e "${BLUE}┃${NC} UUID        : ${uuid}"
  echo -e "${BLUE}┃${NC} Port (TLS)  : ${VLESSTLS_PORT}"
  echo -e "${BLUE}●━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━●${NC}"
  echo -e "${CYAN}${link}${NC}"
  echo ""; read -n 1 -s -r -p " Appuyez sur une touche pour revenir au menu..."
  vlesstls_menu
}

function renew_vlesstls() {
  local n; n=$(grep -c -E "^#& " "$XRAY_CONFIG" 2>/dev/null || echo 0)
  [[ "$n" -eq 0 ]] && { clear; echo -e "${RED}  Aucun client existant.${NC}"; sleep 2; vlesstls_menu; return; }
  clear
  grep -E "^#& " "$XRAY_CONFIG" | awk '{print $2, $3}' | sort -u
  echo ""
  read -rp "  Nom d'utilisateur : " user
  [[ -z "$user" ]] && { vlesstls_menu; return; }
  grep -qwE "^#& $user" "$XRAY_CONFIG" || { echo -e "${RED} Introuvable.${NC}"; sleep 2; vlesstls_menu; return; }
  read -rp "  Jours à ajouter : " days
  [[ "$days" =~ ^[0-9]+$ && "$days" -gt 0 ]] || { echo -e "${RED} Entier positif requis.${NC}"; sleep 2; vlesstls_menu; return; }
  exp=$(grep -wE "^#& $user" "$XRAY_CONFIG" | awk '{print $3}' | sort -u)
  uuid=$(grep -wE "^#& $user" "$XRAY_CONFIG" | awk '{print $4}' | sort -u)
  d1=$(date -d "$exp" +%s); d2=$(date +%s)
  remaining=$(( (d1 - d2) / 86400 ))
  newexp=$(date -d "$(( remaining + days )) days" +"%Y-%m-%d")
  sed -i "/^#& $user /c\\#& $user $newexp $uuid" "$XRAY_CONFIG"
  systemctl restart xray >/dev/null 2>&1
  echo -e "${GREEN}[OK] Nouvelle expiration: $newexp${NC}"
  read -n 1 -s -r -p " Appuyez sur une touche..."; vlesstls_menu
}

function delete_vlesstls() {
  clear
  grep -E "^#& " "$XRAY_CONFIG" | awk '{print $2, $3}' | sort -u
  echo ""
  read -rp " Nom d'utilisateur à supprimer : " user
  [[ -z "$user" ]] && { vlesstls_menu; return; }
  grep -qwE "^#& $user" "$XRAY_CONFIG" || { echo -e "${RED} Introuvable.${NC}"; sleep 2; vlesstls_menu; return; }
  sed -i -e "/^#& $user /d" -e "/\"email\": \"$user\"/d" "$XRAY_CONFIG"
  systemctl restart xray >/dev/null 2>&1
  echo -e "${GREEN}[OK] Compte supprimé.${NC}"
  read -n 1 -s -r -p " Appuyez sur une touche..."; vlesstls_menu
}

function list_vlesstls() {
  clear
  echo -e "${BLUE}  UTILISATEURS VLESS+WS+TLS ACTIFS${NC}"
  echo ""
  grep -E "^#& " "$XRAY_CONFIG" | awk '{print $2, $3}' | sort -u
  echo ""; read -n 1 -s -r -p " Appuyez sur une touche..."; vlesstls_menu
}

function vlesstls_menu() {
  clear
  echo -e "${BLUE}┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓${NC}"
  echo -e "${BLUE}┃${NC} ${BG_BLUE}       MENU VLESS+WS+TLS — KATASHIE VPN          ${NC} ${BLUE}┃${NC}"
  echo -e "${BLUE}┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛${NC}"
  echo -e "${BLUE}┃${NC} ${GREEN}[01]${NC} • Créer un compte    ${GREEN}[04]${NC} • Utilisateurs actifs"
  echo -e "${BLUE}┃${NC} ${GREEN}[02]${NC} • Renouveler"
  echo -e "${BLUE}┃${NC} ${RED}[03]${NC} • Supprimer"
  echo -e "${BLUE}┃${NC} ${WHITE}[00]${NC} • Retour au menu principal"
  echo ""
  read -rp "  Sélectionnez une option : " opt
  case $opt in
  1|01) add_vlesstls ;;
  2|02) renew_vlesstls ;;
  3|03) delete_vlesstls ;;
  4|04) list_vlesstls ;;
  0|00) clear; menu ;;
  *) vlesstls_menu ;;
  esac
}
vlesstls_menu
