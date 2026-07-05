/**
 * QR Code generation for VPN configs
 * BUG FIX: Previous version queried 'SELECT key, value FROM settings' from SQLite,
 * but settings are stored in a JSON file, not in a DB table.
 * Now reads settings from the JSON file directly.
 */
import { Router, Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import { getDb } from '../db';
import { requireAuth } from '../middleware/auth';
import QRCode from 'qrcode';

const router = Router();

const SETTINGS_DIR  = process.env.KATASHIE_DB_DIR || process.env.NEXUS_DB_DIR || '/etc/katashie-web';
const SETTINGS_FILE = path.join(SETTINGS_DIR, 'settings.json');

function loadSettingsMap(): Record<string, any> {
  try {
    if (fs.existsSync(SETTINGS_FILE)) {
      return JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf8'));
    }
  } catch {}
  return {};
}

function buildVlessUri(client: any, settings: Record<string, any>): string {
  const host = settings?.server?.domain || settings?.server?.ip || 'server.example.com';
  const port  = settings?.xray_port || 443;
  const uuid  = client.uuid || client.username;
  const sni   = settings?.server?.domain || host;
  return `vless://${uuid}@${host}:${port}?security=tls&sni=${sni}&type=ws&path=/vless#KATASHIE-${client.username}`;
}

function buildVmessUri(client: any, settings: Record<string, any>): string {
  const host = settings?.server?.domain || settings?.server?.ip || 'server.example.com';
  const port  = settings?.xray_port || 443;
  const uuid  = client.uuid || client.username;
  const config = {
    v: '2',
    ps: `KATASHIE-${client.username}`,
    add: host,
    port: String(port),
    id: uuid,
    aid: '0',
    net: 'ws',
    type: 'none',
    host,
    path: '/vmess',
    tls: 'tls',
    sni: host,
  };
  return `vmess://${Buffer.from(JSON.stringify(config)).toString('base64')}`;
}

function buildTrojanUri(client: any, settings: Record<string, any>): string {
  const host = settings?.server?.domain || settings?.server?.ip || 'server.example.com';
  const port  = settings?.xray_port || 443;
  return `trojan://${client.password}@${host}:${port}?security=tls&sni=${host}#KATASHIE-${client.username}`;
}

function buildSshConfig(client: any, settings: Record<string, any>): string {
  const host = settings?.server?.domain || settings?.server?.ip || 'server.example.com';
  const port  = settings?.ssh_port || 22;
  return `Host KATASHIE-${client.username}\n  HostName ${host}\n  User ${client.username}\n  Port ${port}\n  ServerAliveInterval 60`;
}

router.get('/:clientId', requireAuth, async (req: Request, res: Response) => {
  const db    = getDb();
  const admin = (req as any).admin;
  const { format = 'png' } = req.query;

  const client = db.prepare('SELECT * FROM clients WHERE id = ?').get(req.params.clientId) as any;
  if (!client) return res.status(404).json({ error: 'Client not found' });

  if (admin.role === 'reseller' && client.created_by !== admin.id) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  const settings = loadSettingsMap();

  let uri = '';
  switch (client.protocol) {
    case 'vless':   uri = buildVlessUri(client, settings);  break;
    case 'vmess':   uri = buildVmessUri(client, settings);  break;
    case 'trojan':  uri = buildTrojanUri(client, settings); break;
    case 'ssh':
    case 'slowdns': uri = buildSshConfig(client, settings); break;
    default:
      uri = `katashie://connect?user=${client.username}&protocol=${client.protocol}`;
  }

  if (format === 'uri') {
    return res.json({ uri, username: client.username, protocol: client.protocol });
  }

  try {
    const qrDataUrl = await QRCode.toDataURL(uri, {
      errorCorrectionLevel: 'M',
      margin: 2,
      color: { dark: '#0055ff', light: '#ffffff' },
      width: 400,
    });
    res.json({ qr: qrDataUrl, uri, username: client.username, protocol: client.protocol });
  } catch (err: any) {
    res.status(500).json({ error: 'QR generation failed', detail: err.message });
  }
});

export default router;
