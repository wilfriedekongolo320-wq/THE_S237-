"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Settings routes
 * BUG FIX: SETTINGS_DIR used NEXUS_DB_DIR → /etc/nexus-tunnel-web (wrong path, now standardized)
 * BUG FIX: Default siteName/footerText referenced "Nexus Pro" → replaced with "KATASHIE VPN"
 */
const express_1 = require("express");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const child_process_1 = require("child_process");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// BUG FIX: standardized to KATASHIE_DB_DIR
const SETTINGS_DIR = process.env.KATASHIE_DB_DIR || process.env.NEXUS_DB_DIR || '/etc/katashie-web';
const SETTINGS_FILE = path_1.default.join(SETTINGS_DIR, 'settings.json');
const DEFAULT_SETTINGS = {
    siteName: 'KATASHIE VPN',
    sitePort: 2087,
    primaryColor: '220 100% 50%',
    accentColor: '220 100% 60%',
    logoText: 'K',
    footerText: 'KATASHIE VPN Panel',
    maintenanceMode: false,
    registrationEnabled: false,
    maxResellersPerAdmin: 10,
    defaultResellerDuration: 30,
    telegramBot: '',
    telegramChannel: '',
    server: {
        ip: '',
        domain: '',
        nsDomain: '',
        slowdnsPub: '',
        openvpnDownload: '',
    },
};
function loadSettings() {
    try {
        if (fs_1.default.existsSync(SETTINGS_FILE)) {
            const raw = fs_1.default.readFileSync(SETTINGS_FILE, 'utf8');
            return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
        }
    }
    catch { }
    return { ...DEFAULT_SETTINGS };
}
function saveSettings(data) {
    fs_1.default.mkdirSync(SETTINGS_DIR, { recursive: true });
    fs_1.default.writeFileSync(SETTINGS_FILE, JSON.stringify(data, null, 2));
}
function detectServerInfo() {
    let ip = '', domain = '', nsDomain = '', slowdnsPub = '', openvpnDownload = '';
    try {
        ip = (0, child_process_1.execSync)('curl -s4 --connect-timeout 3 ipv4.icanhazip.com', { timeout: 5000 }).toString().trim();
    }
    catch { }
    try {
        if (fs_1.default.existsSync('/etc/xray/domain'))
            domain = fs_1.default.readFileSync('/etc/xray/domain', 'utf8').trim();
    }
    catch { }
    try {
        if (fs_1.default.existsSync('/etc/slowdns/nsdomain'))
            nsDomain = fs_1.default.readFileSync('/etc/slowdns/nsdomain', 'utf8').trim();
    }
    catch { }
    try {
        if (fs_1.default.existsSync('/etc/slowdns/server.pub'))
            slowdnsPub = fs_1.default.readFileSync('/etc/slowdns/server.pub', 'utf8').trim();
    }
    catch { }
    if (domain)
        openvpnDownload = `https://${domain}:2081`;
    return { ip, domain, nsDomain, slowdnsPub, openvpnDownload };
}
// GET /api/settings
router.get('/', auth_1.requireAuth, (req, res) => {
    const settings = loadSettings();
    const detected = detectServerInfo();
    settings.server = {
        ...DEFAULT_SETTINGS.server,
        ...settings.server,
        ip: settings.server?.ip || detected.ip,
        domain: settings.server?.domain || detected.domain,
        nsDomain: settings.server?.nsDomain || detected.nsDomain,
        slowdnsPub: settings.server?.slowdnsPub || detected.slowdnsPub,
        openvpnDownload: settings.server?.openvpnDownload || detected.openvpnDownload,
    };
    res.json(settings);
});
// PUT /api/settings
router.put('/', auth_1.requireAuth, (req, res) => {
    const admin = req.admin;
    if (admin.role !== 'admin' && admin.role !== 'super_admin') {
        res.status(403).json({ error: 'Forbidden' });
        return;
    }
    const current = loadSettings();
    const incoming = req.body;
    const updated = {
        ...current,
        ...incoming,
        server: { ...current.server, ...(incoming.server || {}) },
    };
    try {
        saveSettings(updated);
        res.json(updated);
    }
    catch (e) {
        res.status(500).json({ error: 'Failed to save settings: ' + (e.message || e) });
    }
});
exports.default = router;
//# sourceMappingURL=settings.js.map