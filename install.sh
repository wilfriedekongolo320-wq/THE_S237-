#!/bin/bash
# ============================================================
#   KATASHIE VPN — Script d'installation du Panneau Web
#   Installe nexus-web (serveur Node.js + interface React)
#   sur Ubuntu 22.04 / Debian 11+
#
#   Usage:
#     sudo bash install.sh
#
#   Requis: Node.js 20+, npm, PM2
#   GitHub: https://github.com/abesskamer237/KATASHIE_VPN
# ============================================================

set -euo pipefail

RED='\033[0;31m'
BLUE='\033[0;34m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
NC='\033[0m'
BOLD='\033[1m'

log_info()    { echo -e "${BLUE}[INFO]${NC}    $*"; }
log_success() { echo -e "${GREEN}[OK]${NC}      $*"; }
log_warn()    { echo -e "${YELLOW}[WARN]${NC}    $*"; }
log_error()   { echo -e "${RED}[ERROR]${NC}   $*"; exit 1; }

INSTALL_DIR="/opt/katashie-web"
SERVICE_NAME="katashie-web"
DB_DIR="/etc/katashie-web"
ENV_FILE="$INSTALL_DIR/.env"

# ─── Root check ──────────────────────────────────────────────
[ "$EUID" -ne 0 ] && log_error "Ce script doit être exécuté en tant que root (sudo bash install.sh)"

echo -e "${BLUE}"
cat << 'BANNER'
 ██╗  ██╗ █████╗ ████████╗ █████╗ ███████╗██╗  ██╗██╗███████╗
 ██║ ██╔╝██╔══██╗╚══██╔══╝██╔══██╗██╔════╝██║  ██║██║██╔════╝
 █████╔╝ ███████║   ██║   ███████║███████╗███████║██║█████╗
 ██╔═██╗ ██╔══██║   ██║   ██╔══██║╚════██║██╔══██║██║██╔══╝
 ██║  ██╗██║  ██║   ██║   ██║  ██║███████║██║  ██║██║███████╗
 ╚═╝  ╚═╝╚═╝  ╚═╝   ╚═╝   ╚═╝  ╚═╝╚══════╝╚═╝  ╚═╝╚═╝╚══════╝
                 Panneau Web — Installateur v2.0
BANNER
echo -e "${NC}"

# ─── Étape 1 : Vérifier les dépendances système ──────────────
log_info "Vérification des dépendances système..."
apt-get update -y >/dev/null 2>&1
apt-get install -y curl wget git openssl sqlite3 >/dev/null 2>&1

# Node.js 20 LTS
if ! command -v node &>/dev/null || [[ "$(node --version | cut -d. -f1 | tr -d 'v')" -lt 20 ]]; then
    log_info "Installation de Node.js 20 LTS..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash - >/dev/null 2>&1
    apt-get install -y nodejs >/dev/null 2>&1
fi
log_success "Node.js $(node --version)"

# PM2
if ! command -v pm2 &>/dev/null; then
    log_info "Installation de PM2..."
    npm install -g pm2 >/dev/null 2>&1
fi
log_success "PM2 $(pm2 --version)"

# ─── Étape 2 : Copier le projet ──────────────────────────────
log_info "Installation des fichiers dans $INSTALL_DIR..."
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

if [ ! -d "$SCRIPT_DIR/nexus-web" ]; then
    log_error "Répertoire 'nexus-web' introuvable. Extrayez l'archive complète."
fi

mkdir -p "$INSTALL_DIR"
cp -r "$SCRIPT_DIR/nexus-web/." "$INSTALL_DIR/"
log_success "Fichiers copiés dans $INSTALL_DIR."

# ─── Étape 3 : Créer le répertoire de données ───────────────
mkdir -p "$DB_DIR"
log_success "Répertoire de données : $DB_DIR"

# ─── Étape 4 : Créer le fichier .env ─────────────────────────
if [ ! -f "$ENV_FILE" ]; then
    log_info "Création du fichier .env..."

    # Générer un JWT secret aléatoire de 64 caractères
    JWT_SECRET=$(openssl rand -hex 32)

    echo ""
    echo -e "${YELLOW}─── Configuration du Super Admin ───${NC}"
    read -rp "  Nom d'utilisateur admin (défaut: admin): " ADMIN_USER
    ADMIN_USER="${ADMIN_USER:-admin}"

    while true; do
        read -rsp "  Mot de passe admin (min 8 caractères): " ADMIN_PASS
        echo ""
        if [ ${#ADMIN_PASS} -ge 8 ]; then
            break
        fi
        echo -e "${RED}  ✗ Le mot de passe doit faire au moins 8 caractères.${NC}"
    done

    read -rp "  Port du panneau web (défaut: 2087): " PANEL_PORT
    PANEL_PORT="${PANEL_PORT:-2087}"

    # BUG FIX: heredoc complet et non-tronqué
    cat > "$ENV_FILE" << ENVFILE
# ─── KATASHIE VPN — Configuration Panneau Web ───────────────────
NODE_ENV=production

# ─── Admin principal (créé au premier démarrage) ─────────────────
# ⚠️  À CHANGER : remplacez ces valeurs par les vôtres
NEXUS_ADMIN_USER=${ADMIN_USER}
NEXUS_ADMIN_PASS=${ADMIN_PASS}

# ─── Sécurité JWT (généré automatiquement) ───────────────────────
# ⚠️  Ne jamais partager ce secret
NEXUS_JWT_SECRET=${JWT_SECRET}

# ─── Port du panneau ─────────────────────────────────────────────
NEXUS_PORT=${PANEL_PORT}

# ─── Répertoire de la base de données ────────────────────────────
KATASHIE_DB_DIR=${DB_DIR}

# ─── Notifications Telegram (optionnel) ──────────────────────────
# Obtenez votre token via @BotFather sur Telegram
# ⚠️  À CHANGER : remplacez par vos informations Telegram
TELEGRAM_BOT_TOKEN=
TELEGRAM_ADMIN_CHAT=

# ─── Paiement Campay Mobile Money (optionnel) ────────────────────
# Créez un compte sur https://campay.net puis copiez vos identifiants
# ⚠️  À CHANGER : remplacez par vos identifiants Campay
CAMPAY_APP_USERNAME=
CAMPAY_APP_PASSWORD=
CAMPAY_REDIRECT_URL=https://VOTRE_DOMAINE.COM/payment/success

# ─── Backup S3/Backblaze B2 (optionnel) ──────────────────────────
# ⚠️  À CHANGER si vous souhaitez activer les sauvegardes cloud
BACKUP_S3_BUCKET=
BACKUP_S3_ENDPOINT=https://s3.us-west-004.backblazeb2.com
BACKUP_S3_ACCESS_KEY=
BACKUP_S3_SECRET_KEY=
BACKUP_S3_REGION=us-west-004
ENVFILE

    log_success "Fichier .env créé."
else
    log_warn "Fichier .env existant conservé."
    PANEL_PORT=$(grep '^NEXUS_PORT=' "$ENV_FILE" | cut -d= -f2 | tr -d ' ' || echo 2087)
fi

# ─── Étape 5 : Installer les dépendances Node.js ─────────────
log_info "Installation des dépendances npm..."
cd "$INSTALL_DIR"
npm install --omit=dev 2>/dev/null || npm install
log_success "Dépendances installées."

# ─── Étape 6 : Builder le serveur TypeScript ─────────────────
log_info "Compilation du serveur TypeScript..."
npm run build:server 2>/dev/null || npx tsc 2>/dev/null || \
    npx esbuild server/index.ts \
        --bundle --platform=node --target=node20 \
        --outfile=dist/server.js \
        --external:better-sqlite3 --external:bcryptjs --external:qrcode
log_success "Serveur compilé."

# ─── Étape 7 : Builder le frontend React ─────────────────────
log_info "Compilation du frontend React..."
if [ -d "$INSTALL_DIR/frontend" ]; then
    cd "$INSTALL_DIR/frontend"
    npm install >/dev/null 2>&1
    npm run build 2>/dev/null && log_success "Frontend compilé." || log_warn "Compilation frontend échouée — panneau web uniquement."
    cd "$INSTALL_DIR"
fi

# ─── Étape 8 : Configurer PM2 ────────────────────────────────
log_info "Configuration de PM2..."
PANEL_PORT_ACTUAL="${PANEL_PORT:-2087}"

cat > "$INSTALL_DIR/ecosystem.config.js" << PMCONF
module.exports = {
  apps: [{
    name: '${SERVICE_NAME}',
    // BUG FIX: tsc outDir=./dist + rootDir=./ + include=server/**/* → dist/server/index.js
    script: '${INSTALL_DIR}/dist/server/index.js',
    cwd: '${INSTALL_DIR}',
    instances: 1,
    exec_mode: 'fork',
    env_file: '${ENV_FILE}',
    restart_delay: 3000,
    max_restarts: 10,
    error_file: '/var/log/katashie-web-error.log',
    out_file:   '/var/log/katashie-web-out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss',
  }]
};
PMCONF

pm2 delete "$SERVICE_NAME" 2>/dev/null || true
pm2 start "$INSTALL_DIR/ecosystem.config.js"
pm2 save
pm2 startup systemd -u root --hp /root 2>/dev/null | bash 2>/dev/null || true
log_success "PM2 configuré et démarré."

# ─── Résumé ──────────────────────────────────────────────────
SERVER_IP=$(hostname -I | awk '{print $1}' || echo "VOTRE_IP")
echo ""
echo -e "${GREEN}┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓${NC}"
echo -e "${GREEN}┃      INSTALLATION TERMINÉE AVEC SUCCÈS ! ✓        ┃${NC}"
echo -e "${GREEN}┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛${NC}"
echo ""
echo -e "  ${BOLD}Panneau Web :${NC} http://${SERVER_IP}:${PANEL_PORT_ACTUAL}"
echo -e "  ${BOLD}Config .env :${NC} $ENV_FILE"
echo -e "  ${BOLD}Base données:${NC} $DB_DIR/katashie.db"
echo -e "  ${BOLD}Logs PM2    :${NC} pm2 logs $SERVICE_NAME"
echo ""
echo -e "${YELLOW}  ⚠️  Actions requises après l'installation :${NC}"
echo -e "  1. Éditez ${BOLD}${ENV_FILE}${NC} et renseignez vos informations Campay/Telegram"
echo -e "  2. Redémarrez : ${BOLD}pm2 restart $SERVICE_NAME${NC}"
echo -e "  3. Ouvrez le port : ${BOLD}ufw allow ${PANEL_PORT_ACTUAL}/tcp${NC}"
echo ""
echo -e "${BLUE}  ► GitHub : https://github.com/abesskamer237/KATASHIE_VPN${NC}"
echo ""
