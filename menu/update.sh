#!/bin/bash
clear
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" >/dev/null 2>&1 && pwd)"
if [ -L "${BASH_SOURCE[0]}" ] && command -v readlink >/dev/null 2>&1; then
    SCRIPT_DIR="$(cd "$(dirname "$(readlink -f "${BASH_SOURCE[0]}")")" >/dev/null 2>&1 && pwd)"
fi
LN='\e[34m'
NC='\e[0m'
GR='\e[32m'
RD='\e[31m'
SERVER_HOST="https://raw.githubusercontent.com/abesskamer237/KATASHIE_VPN/main"

echo -e "${LN}┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓${NC}"
echo -e "${LN}┃${NC} ${GR}       MISE À JOUR OTA (OVER-THE-AIR)             ${NC}${LN}┃${NC}"
echo -e "${LN}┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛${NC}"
echo -e "\n [*] Connexion au dépôt GitHub central..."
echo -e " [*] Déploiement des modules..."

MODULES=(dns zivpn expiry domain iptools menu socks ssh status trojan vless vmess vmess_new vlesstls netguard openvpn shadowsocks hysteria2 speedtest tuic wireguard port log tgbot uninstall update web fastdns)

mkdir -p "/usr/local/sbin"
for script in "${MODULES[@]}"; do
    local_url="${SERVER_HOST}/menu/${script}.sh"
    target="/usr/local/sbin/${script}.sh"
    if wget -q -O "$target" "$local_url"; then
        chmod +x "$target"
        ln -sf "$target" "/usr/local/sbin/${script}" 2>/dev/null || true
        echo -e "  -> Module $script [OK]"
    else
        echo -e "  -> Module $script [FAIL]"
    fi
    sleep 0.1
 done

if wget -q -O "/usr/local/sbin/ui.sh" "${SERVER_HOST}/menu/ui.sh"; then
    chmod +x "/usr/local/sbin/ui.sh"
    echo -e "  -> Module ui.sh [OK]"
else
    echo -e "  -> Module ui.sh [FAIL]"
fi

if [ -x "/usr/local/sbin/update" ]; then
    ln -sf "/usr/local/sbin/update" "/usr/local/bin/update" 2>/dev/null || true
fi

echo -e "\n${LN}┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓${NC}"
echo -e "${LN}┃${NC} ${GR}         MISE À JOUR KATASHIE VPN WEB            ${NC}${LN}┃${NC}"
echo -e "${LN}┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛${NC}"

NEXUS_WEB_DIR="/opt/katashie-web"
NEXUS_REPO_URL="https://github.com/abesskamer237/KATASHIE_VPN.git"
NTW_TMP="$(mktemp -d)"
trap 'rm -rf "$NTW_TMP"' EXIT

if [ -d "$NEXUS_WEB_DIR" ] && [ -f "$NEXUS_WEB_DIR/dist/server/index.js" ]; then
  echo -e "  -> Panel Nexus Web détecté, mise à jour en cours..."
  if git clone --depth 1 "$NEXUS_REPO_URL" "$NTW_TMP" >/dev/null 2>&1; then
    if [ -d "$NTW_TMP/nexus-web" ]; then
      cp -rf "$NTW_TMP/nexus-web"/. "$NEXUS_WEB_DIR/"
      sed -i "s|const PUBLIC_DIR = .*|const PUBLIC_DIR = '/opt/katashie-web/public';|g" "$NEXUS_WEB_DIR/server/index.ts" 2>/dev/null || true
      sed -i 's/callback(null, false);/callback(null, true);/g' "$NEXUS_WEB_DIR/server/index.ts" 2>/dev/null || true
      if [ -d "$NEXUS_WEB_DIR/frontend" ]; then
        cd "$NEXUS_WEB_DIR/frontend" && npm install --quiet >/dev/null 2>&1 && npm run build >/dev/null 2>&1
      fi
      cd "$NEXUS_WEB_DIR" && npm install --production=false --quiet >/dev/null 2>&1 && npm run build >/dev/null 2>&1
      systemctl restart nexus-web 2>/dev/null || true
      echo -e "  -> Nexus Tunnel Web [OK]"
    fi
    rm -rf "$NTW_TMP"
  else
    echo -e "  -> ${RD}[WARN] Impossible de mettre à jour Nexus Web (pas de connexion GitHub)${NC}"
  fi
else
  echo -e "  -> Nexus Tunnel Web non installé, ignoré."
fi

echo -e "\n ${GR}[+] Mise à jour OTA terminée avec succès !${NC}"
sleep 2
if [ -x "$SCRIPT_DIR/menu.sh" ]; then
    exec bash "$SCRIPT_DIR/menu.sh"
elif [ -x "/usr/local/sbin/menu.sh" ]; then
    exec bash "/usr/local/sbin/menu.sh"
elif command -v menu >/dev/null 2>&1; then
    exec menu
else
    echo -e "${RD}Erreur : menu introuvable. Lancez manuellement /usr/local/sbin/menu.sh${NC}"
    exit 1
fi
