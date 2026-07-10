clear
set -euo pipefail
IFS=$'
	'
export LN='[34m'
export BG='[44m'
export NC='[0m'
export GR='[32m'
export RD='[31m'
export YL='[33m'
logs_to_clear=(
"/var/log/*.log"
"/var/log/*.err"
"/var/log/mail.*"
"/var/log/syslog"
"/var/log/btmp"
"/var/log/messages"
"/var/log/debug"
"/var/log/auth.log"
"/var/log/alternatives.log"
"/var/log/cloud-init.log"
"/var/log/cloud-init-output.log"
"/var/log/daemon.log"
"/var/log/dpkg.log"
"/var/log/fail2ban.log"
"/var/log/kern.log"
"/var/log/user.log"
"/var/log/stunnel4/*.log"
"/var/log/xray/access*.log"
"/var/log/xray/error.log"
"/var/log/nginx/*.log"
"/var/log/nginx/vps-*.log"
)
clear_logs() {
echo -e "${LN}┃${NC} [**] Starting Clearing LOGS.."
for logfile in "${logs_to_clear[@]}"; do
for file in $logfile; do
[ -f "$file" ] && truncate -s 0 "$file" 2>/dev/null
done
done
sleep 3
rm -f /var/log/btmp.* /var/log/debug.* /var/log/messages.* /var/log/syslog.* /var/log/*.log.* /var/log/stunnel4/*.log.* /var/log/nginx/*.log.* 2>/dev/null
echo -e "${LN}┃${NC} [**] Logs cleared successfully.."
sleep 3
}
clear_zombie() {
echo -e "${LN}┃${NC} [**] Killing zombie processes.."
sleep 3
zombies=$(ps -eo pid,stat | awk '$2=="Z"{print $1}')
if [ -n "$zombies" ]; then
echo "$zombies" | xargs -r kill -9 2>/dev/null
sleep 3
echo -e "${LN}┃${NC} [**] Killed zombies.."
else
echo -e "${LN}┃${NC} [**] No zombie processes found..."
sleep 3
fi
}
free_ram() {
echo -e "${LN}┃${NC} [**] Releasing RAM caches.."
sleep 3
sync 2>/dev/null
echo 3 > /proc/sys/vm/drop_caches 2>/dev/null
echo -e "${LN}┃${NC} [**] RAM caches released.."
}
#!/bin/bash
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/ui.sh"

menu() {
  exec bash "$SCRIPT_DIR/menu.sh"
}
log() {
  exec bash "$SCRIPT_DIR/log.sh"
}

clear
menu_header "LOGS PANEL" "Nettoyage du système"
clear_logs
clear_zombie
free_ram
echo -e "${MENU_CYAN}╭──────────────────────────────────────────────────╮${MENU_NC}"
echo -e "${MENU_CYAN}│${NC} ${MENU_GREEN}Nettoyage terminé${MENU_NC}"
echo -e "${MENU_CYAN}╰──────────────────────────────────────────────────╯${MENU_NC}"
echo ""
menu_pause
menu
