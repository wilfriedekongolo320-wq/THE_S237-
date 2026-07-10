#!/bin/bash

export MENU_CYAN='\033[36m'
export MENU_MAGENTA='\033[35m'
export MENU_GREEN='\033[32m'
export MENU_YELLOW='\033[33m'
export MENU_RED='\033[31m'
export MENU_WHITE='\033[37m'
export MENU_BLUE='\033[34m'
export MENU_BOLD='\033[1m'
export MENU_DIM='\033[2m'
export MENU_NC='\033[0m'

export LN="$MENU_CYAN"
export BG="$MENU_MAGENTA"
export GR="$MENU_GREEN"
export RD="$MENU_RED"
export YL="$MENU_YELLOW"

menu_header() {
  local title="$1"
  local subtitle="${2:-}"
  echo -e "${MENU_CYAN}╔══════════════════════════════════════════════════╗${MENU_NC}"
  echo -e "${MENU_CYAN}║${MENU_NC} ${MENU_BOLD}${MENU_WHITE}${title}${MENU_NC}"
  if [ -n "$subtitle" ]; then
    echo -e "${MENU_CYAN}║${MENU_NC} ${MENU_DIM}${subtitle}${MENU_NC}"
  fi
  echo -e "${MENU_CYAN}╚══════════════════════════════════════════════════╝${MENU_NC}"
}

menu_section() {
  local title="$1"
  echo -e "${MENU_MAGENTA}╭──────────────────────────────────────────────────╮${MENU_NC}"
  echo -e "${MENU_MAGENTA}│${MENU_NC} ${MENU_BOLD}${MENU_WHITE}${title}${MENU_NC}"
  echo -e "${MENU_MAGENTA}╰──────────────────────────────────────────────────╯${MENU_NC}"
}

menu_option() {
  local key="$1"
  local label="$2"
  local color="${3:-$MENU_GREEN}"
  echo -e "${color}[${key}]${MENU_NC} ${MENU_WHITE}${label}${MENU_NC}"
}

menu_note() {
  echo -e "${MENU_YELLOW}•${MENU_NC} $*"
}

menu_prompt() {
  local prompt="$1"
  read -rp "${MENU_WHITE}${prompt}${MENU_NC} " "$2"
}

menu_pause() {
  echo ""
  read -n 1 -s -r -p "${MENU_WHITE}Appuyez sur une touche...${MENU_NC}"
  echo ""
}

return_to_menu() {
  local script_dir
  script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
  if [ -f "$script_dir/menu.sh" ]; then
    exec bash "$script_dir/menu.sh"
  fi
  exit 0
}
