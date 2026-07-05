/**
 * Settings routes
 * BUG FIX: SETTINGS_DIR used NEXUS_DB_DIR → /etc/nexus-tunnel-web (wrong path, now standardized)
 * BUG FIX: Default siteName/footerText referenced "Nexus Pro" → replaced with "KATASHIE VPN"
 */
import { Router, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { requireAuth, AuthRequest } from '../middleware/auth';

const router = Router();

// BUG FIX: standardized to KATASHIE_DB_DIR
const SETTINGS_DIR  = process.env.KATASHIE_DB_DIR || process.env.NEXUS_DB_DIR || '/etc/katashie-web';
const SETTINGS_FILE = path.join(SETTINGS_DIR, 'settings.json');

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

function loadSettings(): typeof DEFAULT_SETTINGS & Record<string, any> {
  try {
    if (fs.existsSync(SETTINGS_FILE)) {
      const raw = fs.readFileSync(SETTINGS_FILE, 'utf8');
      return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
    }
  } catch {}
  return { ...DEFAULT_SETTINGS };
}

function saveSettings(data: Record<string, any>): void {
  fs.mkdirSync(SETTINGS_DIR, { recursive: true });
  fs.writeFileSync(SETTINGS_FILE, JSON.stringify(data, null, 2));
}

function detectServerInfo(): typeof DEFAULT_SETTINGS['server'] {
  let ip = '', domain = '', nsDomain = '', slowdnsPub = '', openvpnDownload = '';
  try { ip = execSync('curl -s4 --connect-timeout 3 ipv4.icanhazip.com', { timeout: 5000 }).toString().trim(); } catch {}
  try { if (fs.existsSync('/etc/xray/domain')) domain = fs.readFileSync('/etc/xray/domain', 'utf8').trim(); } catch {}
  try { if (fs.existsSync('/etc/slowdns/nsdomain')) nsDomain = fs.readFileSync('/etc/slowdns/nsdomain', 'utf8').trim(); } catch {}
  try { if (fs.existsSync('/etc/slowdns/server.pub')) slowdnsPub = fs.readFileSync('/etc/slowdns/server.pub', 'utf8').trim(); } catch {}
  if (domain) openvpnDownload = `https://${domain}:2081`;
  return { ip, domain, nsDomain, slowdnsPub, openvpnDownload };
}

// GET /api/settings
router.get('/', requireAuth, (req: AuthRequest, res: Response): void => {
  const settings = loadSettings();
  const detected = detectServerInfo();
  settings.server = {
    ...DEFAULT_SETTINGS.server,
    ...settings.server,
    ip:             settings.server?.ip             || detected.ip,
    domain:         settings.server?.domain         || detected.domain,
    nsDomain:       settings.server?.nsDomain       || detected.nsDomain,
    slowdnsPub:     settings.server?.slowdnsPub     || detected.slowdnsPub,
    openvpnDownload: settings.server?.openvpnDownload || detected.openvpnDownload,
  };
  res.json(settings);
});

// PUT /api/settings
router.put('/', requireAuth, (req: AuthRequest, res: Response): void => {
  const admin = req.admin!;
  if (admin.role !== 'admin' && admin.role !== 'super_admin') {
    res.status(403).json({ error: 'Forbidden' }); return;
  }
  const current  = loadSettings();
  const incoming = req.body as Record<string, any>;
  const updated  = {
    ...current,
    ...incoming,
    server: { ...current.server, ...(incoming.server || {}) },
  };
  try {
    saveSettings(updated);
    res.json(updated);
  } catch (e: any) {
    res.status(500).json({ error: 'Failed to save settings: ' + (e.message || e) });
  }
});

export default router;
