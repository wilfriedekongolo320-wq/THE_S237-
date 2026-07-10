#!/bin/bash
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/ui.sh"

menu() {
  exec bash "$SCRIPT_DIR/menu.sh"
}

clear
readonly LN='\u001b[34m'
readonly BG='\u001b[44m'
readonly NC='\u001b[0m'
readonly GR='\u001b[32m'
readonly RD='\u001b[31m'
readonly DOMAIN=$(cat /etc/xray/domain)
readonly MYIP=$(ip addr show eth0 | grep 'inet ' | awk '{print $2}' | cut -d/ -f1)
function add_vmess() {
while true; do
echo -e "${LN}┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓${NC}"
echo -e "${LN}┃${NC} ${BG}                ADD VMESS ACCOUNT               ${NC} ${LN}┃${NC}"
echo -e "${LN}┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛${NC}"
echo -e "${LN}●━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━●${NC}"
echo -e ""
read -rp "  Enter username: " -e user
if [[ -z "$user" ]]; then
echo -e ""
echo -e " ${RD}Username cannot be empty. Please try again.${NC}"
continue
fi
if [[ ! "$user" =~ ^[a-zA-Z0-9_]+$ ]]; then
echo -e ""
echo -e " ${RD}Username may only contain letters, numbers, and underscores.${NC}"
continue
fi
CLIENT_EXISTS=$(grep -w "$user" /etc/xray/config.json | wc -l)
if [[ "$CLIENT_EXISTS" -gt 0 ]]; then
echo -e ""
echo -e " ${RD}This username already exists. Please choose another one.${NC}"
echo -e ""
read -n 1 -s -r -p " Press any key to try again..."
clear
continue
fi
break
done
while true; do
read -p "  Validity (days): " masaaktif
if [[ -z "$masaaktif" || ! "$masaaktif" =~ ^[0-9]+$ || "$masaaktif" -le 0 ]]; then
echo -e ""
echo -e "${RD}Expiry days must be a positive number. Please try again.${NC}"
echo -e ""
continue
fi
break
done
uuid=$(cat /proc/sys/kernel/random/uuid)
exp=$(date -d "$masaaktif days" +"%Y-%m-%d")
sed -i '/#vmess$/a\### '"$user $exp $uuid"'\
},{