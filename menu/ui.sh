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

# Column layout width used by menu_pair (characters for left column)
export MENU_COL_WIDTH=${MENU_COL_WIDTH:-40}

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

menu_option_inline() {
  local key="$1"
  local label="$2"
  local color="${3:-$MENU_GREEN}"
  # print a single option without a trailing newline, with color codes expanded
  printf "%b" "${color}[${key}]${MENU_NC} ${MENU_WHITE}${label}${MENU_NC}"
}

menu_pair() {
  # menu_pair <k1> <label1> <color1> <k2> <label2> <color2>
  local k1="$1" l1="$2" c1="${3:-$MENU_GREEN}"
  local k2="$4" l2="$5" c2="${6:-$MENU_GREEN}"
  local left right
  left="$(menu_option_inline "$k1" "$l1" "$c1")"
  if [ -n "$k2" ]; then
    right="$(menu_option_inline "$k2" "$l2" "$c2")"
  else
    right=""
  fi
  # align columns using configurable width (MENU_COL_WIDTH)
  printf "  %-${MENU_COL_WIDTH}s %s\n" "$left" "$right"
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
  script_dir="$(resolve_script_dir)"
  if [ -f "$script_dir/menu.sh" ]; then
    exec bash "$script_dir/menu.sh"
  fi
  exit 0
}
