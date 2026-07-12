#!/bin/bash
# ============================================================
#   KATASHIE VPN — Node.js 20 Upgrade Fix
#   Diagnostique et force Node 20 installation
# ============================================================

set -e

echo "╔════════════════════════════════════════════════════════╗"
echo "║   Node.js 20 Upgrade — Diagnostic & Fix                ║"
echo "╚════════════════════════════════════════════════════════╝"
echo ""

# 1. Diagnostic
echo "[1/4] Diagnostic actuel..."
NODE_VERSION=$(node --version 2>/dev/null || echo "NONE")
NPM_VERSION=$(npm --version 2>/dev/null || echo "NONE")
echo "  Node: $NODE_VERSION"
echo "  npm:  $NPM_VERSION"
echo ""

# 2. Remove old Node
echo "[2/4] Suppression de Node 12.x..."
apt-get remove -y --purge nodejs npm >/dev/null 2>&1 || echo "  ℹ Aucune version ancienne trouvée"
echo "  ✓ Nettoyage complet effectué"
echo ""

# 3. Install Node 20 LTS
echo "[3/4] Installation de Node 20 LTS..."
export DEBIAN_FRONTEND=noninteractive
apt-get update -y >/dev/null 2>&1 || true
apt-get install -y ca-certificates curl gnupg lsb-release >/dev/null 2>&1 || true

rm -f /etc/apt/sources.list.d/nodesource.list /usr/share/keyrings/nodesource.gpg /etc/apt/keyrings/nodesource.gpg 2>/dev/null || true
mkdir -p /etc/apt/keyrings
curl -fsSL https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key | gpg --dearmor -o /etc/apt/keyrings/nodesource.gpg >/dev/null 2>&1 || {
    echo "  ✗ Erreur : récupération de la clé GPG NodeSource échouée"
    exit 1
}

cat > /etc/apt/sources.list.d/nodesource.list <<'EOF'
deb [signed-by=/etc/apt/keyrings/nodesource.gpg] https://deb.nodesource.com/node_20.x nodistro main
EOF

apt-get update -y >/dev/null 2>&1 || {
    echo "  ✗ Erreur : mise à jour apt échouée"
    exit 1
}
apt-get install -y --allow-downgrades --allow-change-held-packages nodejs >/dev/null 2>&1 || {
    echo "  ✗ Erreur : installation de nodejs échouée"
    echo "  Détails : apt-get install -y nodejs"
    exit 1
}
echo "  ✓ Node 20 installé"
echo ""

# 4. Verify
echo "[4/4] Vérification..."
NEW_NODE=$(node --version 2>/dev/null || echo "NONE")
NEW_NPM=$(npm --version 2>/dev/null || echo "NONE")
echo "  Node: $NEW_NODE"
echo "  npm:  $NEW_NPM"
echo ""

NODE_MAJOR=$(echo "$NEW_NODE" | tr -d 'v' | cut -d. -f1)
if [ "$NODE_MAJOR" -ge 20 ]; then
    echo "╔════════════════════════════════════════════════════════╗"
    echo "║  ✓ SUCCESS: Node 20 LTS installed                      ║"
    echo "║                                                        ║"
    echo "║  Next: Restart web panel installation                 ║"
    echo "║  menu → [18] Panneau Web → [1] Installer              ║"
    echo "╚════════════════════════════════════════════════════════╝"
else
    echo "╔════════════════════════════════════════════════════════╗"
    echo "║  ✗ FAILURE: Node $NODE_MAJOR still too old             ║"
    echo "║  Required: >= 20                                       ║"
    echo "║                                                        ║"
    echo "║  Manual commands:                                      ║"
    echo "║  apt-get remove -y --purge nodejs npm                 ║"
    echo "║  curl -fsSL https://deb.nodesource.com/... | bash -   ║"
    echo "║  apt-get install -y nodejs@20                         ║"
    echo "╚════════════════════════════════════════════════════════╝"
    exit 1
fi
