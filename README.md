<div align="center">

# 🛡️ KATASHIE VPN

### Auto-installeur VPN multi-protocoles + Panneau Web + Bots de gestion

![Bash](https://img.shields.io/badge/Bash-Script-4EAA25?style=for-the-badge&logo=gnubash&logoColor=white)
![Xray](https://img.shields.io/badge/Xray--core-VLESS%20%7C%20VMESS%20%7C%20Trojan-000000?style=for-the-badge)
![Node](https://img.shields.io/badge/Node.js-20-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)
![React](https://img.shields.io/badge/React-Panel-61DAFB?style=for-the-badge&logo=react&logoColor=black)
![License](https://img.shields.io/badge/License-Privé-red?style=for-the-badge)

**Panneau web complet · Bot Telegram · Bot Deploy multi-VPS · Bot WhatsApp**

Contact: [@abess237](https://t.me/abess237) &nbsp;•&nbsp; [WhatsApp](https://wa.me/237682229367) &nbsp;•&nbsp; [Chaîne WhatsApp](https://whatsapp.com/channel/0029Vb8J9L44Y9li0Ffkqu1J)

</div>

---

## 🔌 Protocoles supportés

| Protocole | Transport | Statut |
|---|---|---|
| SSH / WebSocket | WS | ✅ |
| VMess | WS / gRPC | ✅ |
| **VLESS** | WS / gRPC | ✅ |
| **VLESS+WS+TLS** (direct, port 8443) | WS + TLS | ✅ |
| Trojan | WS / gRPC | ✅ |
| Shadowsocks | WS / gRPC | ✅ |
| Socks5 | — | ✅ |
| ZIVPN (UDP) | UDP | ✅ |
| Hysteria2 | QUIC/UDP | ✅ |
| TUIC v5 | QUIC/UDP | ✅ |
| WireGuard | UDP | ✅ |
| OpenVPN | TCP/UDP | ✅ |

Tous les protocoles se gèrent depuis le même menu interactif (`menu`) : créer, renouveler, lister, supprimer un compte, avec lien de connexion généré automatiquement.

---

## 📦 Nouveautés v2.0

- ✅ **Rate limiting** anti-brute force (express-rate-limit)
- ✅ **Audit log** complet (qui, quoi, quand, depuis quelle IP)
- ✅ **Expiry auto-ban** (cron interne + kill SSH/XRAY)
- ✅ **Dashboard graphique** (Recharts — courbes bande passante, pie protocoles)
- ✅ **Monitoring temps réel** (SSE — CPU/RAM/Disque toutes les 3s)
- ✅ **Export CSV/Excel** des comptes (UTF-8 BOM pour Excel)
- ✅ **Mode sombre/clair** basculable
- ✅ **Multi-langue** FR/EN/AR avec RTL pour l'arabe
- ✅ **Panel mobile-responsive** (hamburger menu, grilles adaptatives)
- ✅ **QR Codes** de connexion (VLESS/VMESS/SSH config)
- ✅ **Bot Telegram inline** (boutons cliquables, menu interactif)
- ✅ **Notifications auto** (alerte Telegram expiry 24h + CPU > 80%)
- ✅ **Bot Deploy multi-VPS** (déploiement parallèle Paramiko)
- ✅ **Bot WhatsApp revendeurs** (créer sous-revendeur via WhatsApp)
- ✅ **Gestion multi-serveurs** (plusieurs VPS dans le panneau)
- ✅ **Backup automatique** SQLite → S3/Backblaze à 02h00
- ✅ **API Swagger/OpenAPI** à `/api/docs`
- ✅ **Docker Compose** complet
- ✅ **Page de vente publique** avec paiement Mobile Money
- ✅ **Intégration Campay** (Orange Money + MTN MoMo auto-account creation)

---

## 🚀 Installation rapide

```bash
# Installation en une ligne
wget -qO- https://raw.githubusercontent.com/abesskamer237/KATASHIE_VPN/main/autoinstall.sh | bash

wget https://raw.githubusercontent.com/abesskamer237/KATASHIE_VPN/main/autoinstall.sh
chmod +x autoinstall.sh
./autoinstall.sh
```

## 🐳 Installation Docker

```bash
# Copier et configurer les variables
cp .env.example .env
nano .env

# Démarrer tous les services
docker compose up -d

# Voir les logs
docker compose logs -f katashie-web
```

## 📋 Structure du projet

```
KATASHIE_VPN/
├── autoinstall.sh              # Script d'installation principal
├── katashie.sh                 # Menu principal (lancé par autoinstall)
├── menu/                       # Sous-menus (SSH, VLESS, VMESS...)
├── core/                       # Scripts core (BBR, XRAY, Websocket...)
├── nexus-web/                  # Panneau Web (Express + React)
│   ├── server/                 # API Express + SQLite
│   │   ├── routes/             # auth, clients, monitoring, servers, payment...
│   │   ├── jobs/               # notifyExpiry, backupCron
│   │   ├── middleware/         # auditLog, auth
│   │   └── swagger.ts          # Documentation OpenAPI
│   └── frontend/               # React + Vite + Tailwind
│       ├── src/i18n/           # FR/EN/AR translations
│       ├── src/contexts/       # ThemeContext, I18nContext
│       └── src/pages/          # Dashboard, Monitoring, Servers, Payment...
├── katashie_core_bot/          # Bot Telegram principal (inline + notifs)
├── katashie_deploy_bot/        # Bot Deploy multi-VPS Paramiko
├── katashie_whatsapp_bot/      # Bot WhatsApp Twilio (admin + revendeurs)
├── docker-compose.yml          # Stack complète Docker
├── nginx.conf                  # Nginx SSL + reverse proxy
└── .env.example                # Variables d'environnement
```

## 🧩 Ajouter/gérer un protocole précis

```bash
menu shadowsocks   # Comptes Shadowsocks (WS + gRPC)
menu hysteria2     # Comptes Hysteria2 (installation à la volée si absente)
menu tuic          # Comptes TUIC v5
menu wireguard     # Ouvre le gestionnaire WireGuard (add/list/revoke)
menu openvpn       # Ouvre le gestionnaire OpenVPN (add/list/revoke)
menu vlesstls      # Comptes VLESS+WS+TLS (port 8443, cert du domaine)
menu speedtest     # Test de débit du serveur
```

WireGuard et OpenVPN s'appuient sur les installeurs communautaires éprouvés [angristan/wireguard-install](https://github.com/angristan/wireguard-install) et [angristan/openvpn-install](https://github.com/angristan/openvpn-install) — leur propre menu de gestion des clients s'ouvre directement depuis `menu wireguard` / `menu openvpn`.

## 🌐 Panneau Web — Accès

| URL | Description |
|-----|-------------|
| `http://IP:2087/` | Page de vente publique (sans auth) |
| `http://IP:2087/login` | Connexion admin/revendeur |
| `http://IP:2087/api/docs` | Documentation Swagger API |

**Identifiants par défaut:** admin / admin123 _(changez immédiatement!)_

## 🤖 Bots — Configuration

### Bot Telegram Principal
```bash
cp katashie_core_bot/config.example.json /etc/katashie_bot/config.json
nano /etc/katashie_bot/config.json  # → bot_token + admin_ids
systemctl start katashie-core-bot
```

### Bot Deploy Multi-VPS
```bash
cp katashie_deploy_bot/config.example.json /etc/katashie_deploy_bot/config.json
# Commandes dans Telegram:
# /add_vps mon-vps 1.2.3.4 22 root motdepasse
# /deploy mon-vps        → un seul VPS
# /deploy all            → tous les VPS en parallèle
```

### Bot WhatsApp
```bash
cp katashie_whatsapp_bot/config.example.json /etc/katashie_whatsapp_bot/config.json
# Configurez le webhook Twilio → https://VOTRE_DOMAINE/whatsapp
# Ajoutez les numéros revendeurs dans reseller_numbers
```

## 💰 Mobile Money (Campay)

1. Créez un compte sur [campay.net](https://campay.net)
2. Définissez `CAMPAY_APP_USERNAME` et `CAMPAY_APP_PASSWORD` dans `.env`
3. Créez des plans dans le panneau → les clients paient directement sur la page de vente
4. Les comptes VPN sont créés automatiquement après paiement réussi

## 📞 Support

- **Telegram:** [@abess237](https://t.me/abess237)
- **WhatsApp:** [+237 682 229 367](https://wa.me/237682229367)
- **Groupe WhatsApp:** [Rejoindre](https://chat.whatsapp.com/Ed08KdCa94L2mDsbtWmkMu)
- **Chaîne WhatsApp:** [S'abonner](https://whatsapp.com/channel/0029Vb8J9L44Y9li0Ffkqu1J)

---
© 2025-2026 KATASHIE VPN — Tous droits réservés
