#!/bin/bash
#
# KATASHIE VPN - Shell Script Validator
# Valide tous les fichiers .sh pour les erreurs courantes
# Usage: bash validate_shell_scripts.sh
#

set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

ERRORS_FOUND=0
WARNINGS_FOUND=0
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║${NC} KATASHIE VPN - Shell Script Validator                    ${BLUE}║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Fonction pour vérifier les erreurs ANSI
check_ansi_codes() {
    local file="$1"
    
    # Cherche les codes ANSI mal formés (sans \033)
    if grep -nE "=['\"]\\[[0-9;]+m['\"]" "$file" > /dev/null 2>&1; then
        echo -e "${RED}✗${NC} $file - Code ANSI cassé trouvé (manque \\033)"
        grep -nE "=['\"]\\[[0-9;]+m['\"]" "$file" | sed "s/^/  /"
        return 1
    fi
    return 0
}

# Fonction pour vérifier la syntaxe bash
check_bash_syntax() {
    local file="$1"
    if ! bash -n "$file" 2>/dev/null; then
        echo -e "${RED}✗${NC} $file - Erreur de syntaxe bash"
        bash -n "$file" 2>&1 | sed "s/^/  /" || true
        return 1
    fi
    return 0
}

# Fonction pour vérifier l'encodage UTF-8
check_utf8_encoding() {
    local file="$1"
    if file "$file" | grep -q "UTF-8 Unicode"; then
        # Cherche les caractères mal encodés (Ã©, Ã , Ã€, etc.)
        if grep -P -n "Ã|â€|â|ðŸ" "$file" > /dev/null 2>&1; then
            echo -e "${RED}✗${NC} $file - Caractères mal encodés trouvés"
            return 1
        fi
    fi
    return 0
}

# Fonction pour vérifier les typos communs
check_typos() {
    local file="$1"
    if grep -nE "enu_option|meu_option|menu_optin" "$file" > /dev/null 2>&1; then
        echo -e "${RED}✗${NC} $file - Typo détecté"
        grep -nE "enu_option|meu_option|menu_optin" "$file" | sed "s/^/  /"
        return 1
    fi
    return 0
}

# Fonction pour vérifier les imports
check_imports() {
    local file="$1"
    
    # Si le fichier est dans menu/, il devrait sourcer ui.sh
    if [[ "$file" == */menu/*.sh ]] && [[ "$file" != */menu/ui.sh ]]; then
        if ! grep -q 'source.*ui.sh' "$file"; then
            echo -e "${YELLOW}⚠${NC}  $file - Ne source pas ui.sh (attendu pour fichiers menu/)"
            ((WARNINGS_FOUND++))
        fi
    fi
}

# Main validation loop
echo "Vérification des fichiers shell..."
echo ""

TOTAL_FILES=0
for shell_file in $(find "$SCRIPT_DIR" -name "*.sh" -type f); do
    ((TOTAL_FILES++))
    
    # Ne pas vérifier le validateur lui-même
    if [[ "$shell_file" == *"validate_shell_scripts.sh" ]]; then
        continue
    fi
    
    # Vérifications
    if ! check_ansi_codes "$shell_file"; then ((ERRORS_FOUND++)); fi
    if ! check_bash_syntax "$shell_file"; then ((ERRORS_FOUND++)); fi
    if ! check_utf8_encoding "$shell_file"; then ((ERRORS_FOUND++)); fi
    if ! check_typos "$shell_file"; then ((ERRORS_FOUND++)); fi
    check_imports "$shell_file"
done

echo ""
echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║${NC} Résumé de la Validation                                ${BLUE}║${NC}"
echo -e "${BLUE}╠════════════════════════════════════════════════════════════╣${NC}"
echo -e "${BLUE}║${NC} Fichiers vérifiés : $TOTAL_FILES"
echo -e "${BLUE}║${NC} Erreurs trouvées  : ${RED}$ERRORS_FOUND${NC}"
echo -e "${BLUE}║${NC} Avertissements    : ${YELLOW}$WARNINGS_FOUND${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

if [ $ERRORS_FOUND -eq 0 ]; then
    echo -e "${GREEN}✓ Tous les fichiers sont valides !${NC}"
    exit 0
else
    echo -e "${RED}✗ Des erreurs ont été trouvées. Veuillez les corriger.${NC}"
    exit 1
fi
