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
clear
LN='\e[36m'
NC='\e[0m'
BG='\e[44m'
RD='\e[31m'
GR='\e[32m'

menu_header "INSTALLATION BOT TELEGRAM" "Connexion au serveur Telegram"
echo -e "${MENU_CYAN}╭──────────────────────────────────────────────────╮${MENU_NC}"
echo -e "${MENU_CYAN}│${NC} Ce module relie votre serveur à Telegram."
echo -e "${MENU_CYAN}│${NC} Vous deviendrez SUPER ADMIN du système."
echo -e "${MENU_CYAN}╰──────────────────────────────────────────────────╯${MENU_NC}"
echo ""

read -p " ➔ Entrez le TOKEN du Bot (ex: 1234:ABCDef...) : " bot_token
if [[ -z "$bot_token" ]]; then echo -e "${RD}Erreur: Le Token est obligatoire.${NC}"; sleep 2; exit; fi

read -p " ➔ Entrez votre ID Telegram (ex: 123456789) : " admin_id
if [[ -z "$admin_id" ]]; then echo -e "${RD}Erreur: L'ID Admin est obligatoire.${NC}"; sleep 2; exit; fi

echo -e "\n${GR}[+] Préparation de l'environnement Python...${NC}"
apt-get install -y python3 python3-pip git >/dev/null 2>&1
pip3 install pyTelegramBotAPI psutil >/dev/null 2>&1

echo -e "${GR}[+] Création sécurisée de la base de données...${NC}"
mkdir -p /etc/katashie_bot
cat <<JSON > /etc/katashie_bot/config.json
{
  "bot_token": "$bot_token",
  "super_admin": $admin_id,
  "admins": []
}
JSON

echo -e "${GR}[+] Téléchargement complet du moteur NEXUS C2 (Fichiers + Modules)...${NC}"
if [ -d "$SCRIPT_DIR/../katashie_core_bot" ]; then
  cp -r "$SCRIPT_DIR/../katashie_core_bot/"* /etc/katashie_bot/ 2>/dev/null || true
  cp -r "$SCRIPT_DIR/../katashie_core_bot/modules" /etc/katashie_bot/ 2>/dev/null || true
else
  cd /tmp
  rm -rf repo_temp
  git clone https://github.com/abesskamer237/KATASHIE_VPN.git repo_temp >/dev/null 2>&1
  if [ -d repo_temp/katashie_core_bot ]; then
    cp -r repo_temp/katashie_core_bot/* /etc/katashie_bot/ 2>/dev/null || true
  fi
  rm -rf repo_temp
fi

echo -e "${GR}[+] Configuration et alignement du Démon système...${NC}"
# On force l'écriture d'un service parfait avec les bons chemins
cat << 'SRV' > /etc/systemd/system/katashie_bot.service
[Unit]
Description=Nexus Bot Telegram C2
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/etc/katashie_bot
ExecStart=/usr/bin/python3 /etc/katashie_bot/katashie_bot.py
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
SRV

systemctl daemon-reload
systemctl enable --now katashie_bot
systemctl restart katashie_bot

echo -e "\n${GR}[+] Base de données verrouillée et Bot activé.${NC}"
echo -e " Allez sur Telegram et tapez /start"
echo -e "\n Appuyez sur ENTRÉE pour retourner au menu."
read
menu
