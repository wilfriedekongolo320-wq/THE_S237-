# KATASHIE VPN — Guide de Déploiement VPS

> GitHub officiel : https://github.com/abesskamer237/KATASHIE_VPN

---

## 🖥️ Prérequis VPS recommandés

| Composant | Minimum | Recommandé |
|-----------|---------|------------|
| OS        | Ubuntu 22.04 LTS | Ubuntu 22.04 LTS |
| RAM       | 1 Go    | 2 Go       |
| Stockage  | 20 Go   | 40 Go SSD  |
| CPU       | 1 vCPU  | 2 vCPU     |
| Virtualisation | KVM / LXC | KVM |
| IPv4 publique | ✅ Requise | ✅ |

> ❌ **OpenVZ NON supporté.** Utilisez uniquement KVM ou LXC.

---

## 📦 Méthode 1 — Installation automatique (recommandée)

```bash
# Sur votre VPS (en root)
wget -qO /tmp/autoinstall.sh https://raw.githubusercontent.com/abesskamer237/KATASHIE_VPN/main/autoinstall.sh
bash /tmp/autoinstall.sh
```

Cette commande télécharge et exécute automatiquement `katashie.sh` qui installe tous les composants VPN (SSH, Xray VLESS/VMESS/Trojan, SlowDNS, UDP).

---

## 🔧 Méthode 2 — Installation du panneau Web seulement

```bash
# 1. Télécharger l'archive
git clone https://github.com/abesskamer237/KATASHIE_VPN.git
cd KATASHIE_VPN

# 2. Lancer l'installateur
sudo bash install.sh
```

L'installateur vous demandera :
- ✏️ Le nom d'utilisateur admin
- ✏️ Le mot de passe admin (min 8 caractères)
- ✏️ Le port du panneau (défaut: 2087)

---

## ⚙️ Méthode 3 — Déploiement VPS fiable (recommandé)

Si tu veux un déploiement propre sur un VPS Ubuntu, utilise le script et le service système déjà préparés dans le dépôt.

```bash
# 1. Cloner le dépôt
sudo apt update && sudo apt install -y git curl
git clone https://github.com/abesskamer237/KATASHIE_VPN.git
cd KATASHIE_VPN

# 2. Installer le panneau web et le service systemd
sudo bash install_web_panel_vps.sh
```

Ce script va :
- installer les dépendances Node.js du panneau,
- compiler l’interface et le backend,
- copier l’application dans /opt/katashie-web,
- créer le service systemd,
- et démarrer automatiquement le panneau sur le port 2087.

Vérification rapide :

```bash
sudo systemctl status katashie-web
curl http://127.0.0.1:2087/health
```

Identifiants par défaut après démarrage :
- utilisateur : admin
- mot de passe : admin

---

## 🐳 Méthode 4 — Docker Compose (stack complète)

```bash
# 1. Cloner le dépôt
git clone https://github.com/abesskamer237/KATASHIE_VPN.git
cd KATASHIE_VPN

# 2. Configurer l'environnement
cp .env.example .env
nano .env   # Remplissez les valeurs requises (⚠️ voir section personnalisation)

# 3. Lancer la stack
docker-compose up -d

# 4. Vérifier les logs
docker-compose logs -f katashie-web
```

---

## 🌐 Configuration SSL avec Nginx (domaine HTTPS)

```bash
# 1. Installer Certbot
apt install -y certbot

# 2. Obtenir le certificat (remplacez VOTRE_DOMAINE.COM)
certbot certonly --standalone -d VOTRE_DOMAINE.COM

# 3. Éditer nginx.conf
nano nginx.conf
# → Remplacez VOTRE_DOMAINE.COM par votre vrai domaine

# 4. Relancer Nginx
docker-compose restart nginx
```

---

## ⚠️ Éléments à personnaliser obligatoirement

Ces valeurs sont marquées `⚠️ À CHANGER` dans `.env.example` :

### 1. Identifiants Admin (`.env`)
```env
NEXUS_ADMIN_USER=votre_nom_admin
NEXUS_ADMIN_PASS=MotDePasse_Tres_Fort_12345!
```

### 2. Secret JWT (`.env`)
```bash
# Génération automatique (copier la valeur dans .env)
openssl rand -hex 32
```
```env
NEXUS_JWT_SECRET=la_valeur_generee_ici
```

### 3. Domaine Nginx (`nginx.conf`)
```nginx
server_name VOTRE_DOMAINE.COM;                          # ← votre domaine
ssl_certificate /etc/letsencrypt/live/VOTRE_DOMAINE.COM/fullchain.pem;
ssl_certificate_key /etc/letsencrypt/live/VOTRE_DOMAINE.COM/privkey.pem;
```

### 4. Notifications Telegram (optionnel, `.env`)
```env
TELEGRAM_BOT_TOKEN=123456789:ABCdefGHIjklMNOpqrsTUVwxyz  # ← de @BotFather
TELEGRAM_ADMIN_CHAT=123456789  # ← votre Chat ID
```

### 5. Paiement Campay (optionnel, `.env`)
```env
CAMPAY_APP_USERNAME=votre_username_campay
CAMPAY_APP_PASSWORD=votre_password_campay
CAMPAY_REDIRECT_URL=https://VOTRE_DOMAINE.COM/payment/success
```

### 6. Bot Deploy — VPS cibles (`katashie_deploy_bot/config.example.json`)
```json
{
  "bot_token": "VOTRE_TOKEN_TELEGRAM_BOT_DEPLOY",
  "admin_ids": [VOTRE_TELEGRAM_USER_ID],
  "install_url": "https://raw.githubusercontent.com/abesskamer237/KATASHIE_VPN/main/autoinstall.sh",
  "vps_presets": {
    "mon-vps-1": {
      "host": "IP_DE_VOTRE_VPS",
      "port": 22,
      "user": "root",
      "password": "VOTRE_MOT_DE_PASSE_SSH"
    }
  }
}
```

### 7. Bot Core Telegram (`katashie_core_bot/config.example.json`)
- `bot_token` → token de @BotFather
- `admin_id` → votre Chat ID Telegram
- `panel_url` → `http://IP_VPS:2087` ou `https://VOTRE_DOMAINE.COM`
- `panel_token` → généré après connexion au panneau (`/api/auth/login`)

---

## 🔒 Sécurité post-installation

```bash
# Ouvrir les ports requis
ufw allow 22/tcp      # SSH
ufw allow 2087/tcp    # Panneau Web
ufw allow 80/tcp      # HTTP (redirection)
ufw allow 443/tcp     # HTTPS
ufw allow 1194/tcp    # OpenVPN (si activé)
ufw enable

# Changer le port SSH pour éviter les scans
sed -i 's|#Port 22|Port 2222|' /etc/ssh/sshd_config
systemctl restart sshd
ufw allow 2222/tcp && ufw delete allow 22/tcp
```

---

## 📊 Accès au panneau Web

| Accès | URL |
|-------|-----|
| Sans domaine | `http://IP_VPS:2087` |
| Avec domaine | `https://VOTRE_DOMAINE.COM` |
| Swagger API  | `http://IP_VPS:2087/api/docs` |

Identifiants par défaut :
- **Utilisateur** : valeur de `NEXUS_ADMIN_USER` dans `.env`
- **Mot de passe** : valeur de `NEXUS_ADMIN_PASS` dans `.env`

---

## 🔄 Commandes utiles

```bash
# PM2 (sans Docker)
pm2 status
pm2 logs katashie-web
pm2 restart katashie-web

# Docker
docker-compose ps
docker-compose logs -f
docker-compose restart katashie-web
docker-compose down && docker-compose up -d

# Base de données (SQLite)
sqlite3 /etc/katashie-web/katashie.db ".tables"
sqlite3 /etc/katashie-web/katashie.db "SELECT * FROM admins;"
```

---

## 🆘 Support

- **Telegram** : @abess237
- **GitHub Issues** : https://github.com/abesskamer237/KATASHIE_VPN/issues
