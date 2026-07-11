import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import path from 'path';
import fs from 'fs';
import swaggerUi from 'swagger-ui-express';
import { getDb, seedSuperAdmin } from './db';
import authRouter from './routes/auth';
import adminsRouter from './routes/admins';
import clientsRouter from './routes/clients';
import plansRouter from './routes/plans';
import logsRouter from './routes/logs';
import resellersRouter from './routes/resellers';
import settingsRouter from './routes/settings';
import monitoringRouter from './routes/monitoring';
import serversRouter from './routes/servers';
import exportRouter from './routes/export';
import paymentRouter from './routes/payment';
import qrcodeRouter from './routes/qrcode';
import auditLogsRouter from './routes/auditlogs';
import { suspendSshAccount, deleteSshAccount } from './scripts';
import { ensureAuditTable } from './middleware/auditLog';
import { scheduleDailyBackup } from './jobs/backupCron';
import { initNotifier, runExpiryNotifier } from './jobs/notifyExpiry';
import { swaggerSpec } from './swagger';

// ─── BUG FIX: CONFIG_FILE path now uses KATASHIE_DB_DIR to stay consistent ──
const DB_DIR      = process.env.KATASHIE_DB_DIR || process.env.NEXUS_DB_DIR || '/etc/katashie-web';
const CONFIG_FILE = process.env.KATASHIE_CONFIG  || path.join(DB_DIR, 'config.json');

let config: {
  port?: number;
  admin_user?: string;
  admin_password?: string;
  jwt_secret?: string;
  telegram_bot_token?: string;
  telegram_admin_chat?: string;
} = {};

if (fs.existsSync(CONFIG_FILE)) {
  try {
    config = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
  } catch (e) {
    console.error('[CONFIG] Failed to parse config file:', e);
  }
}

if (config.jwt_secret && !process.env.NEXUS_JWT_SECRET) {
  process.env.NEXUS_JWT_SECRET = config.jwt_secret;
}

const PORT_CANDIDATES = [2087, 2096, 8787, 3001, 9090];
const configuredPort = (() => {
  const candidate = process.env.PORT || process.env.NEXUS_PORT || (config.port ? String(config.port) : '0');
  const parsed = Number.parseInt(candidate, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
})();

// ─── Bootstrap super admin ────────────────────────────────────────────────────
const adminUser = config.admin_user || process.env.NEXUS_ADMIN_USER || 'admin';
const adminPass = config.admin_password || process.env.NEXUS_ADMIN_PASS || 'admin';

getDb();
seedSuperAdmin(adminUser, adminPass);

// ─── Ensure extra DB tables ───────────────────────────────────────────────────
ensureAuditTable();

// ─── Init Telegram notifier ───────────────────────────────────────────────────
const tgToken = config.telegram_bot_token || process.env.TELEGRAM_BOT_TOKEN || '';
const tgChat  = config.telegram_admin_chat || process.env.TELEGRAM_ADMIN_CHAT || '';
if (tgToken && tgChat) {
  initNotifier(tgToken, tgChat);
  setInterval(() => runExpiryNotifier().catch(console.error), 60 * 60 * 1000);
  console.log('[NOTIFY] Telegram notifier enabled');
}

// ─── Schedule daily backup ────────────────────────────────────────────────────
scheduleDailyBackup();

// ─── Global error handlers ────────────────────────────────────────────────────
process.on('uncaughtException', (err: Error) => {
  console.error('[FATAL] Uncaught exception:', err);
  process.exit(1);
});
process.on('unhandledRejection', (reason: unknown) => {
  console.error('[FATAL] Unhandled promise rejection:', reason);
  process.exit(1);
});

// ─── Expiry scheduler ─────────────────────────────────────────────────────────
const SSH_PROTOCOLS = new Set(['ssh', 'slowdns', 'udpcustom']);

function runExpiryScheduler(): void {
  try {
    const db = getDb();
    const expiredClients = db.prepare(
      "SELECT id, username, protocol FROM clients WHERE status = 'active' AND expires_at < date('now')"
    ).all() as { id: string; username: string; protocol: string }[];

    for (const client of expiredClients) {
      if (SSH_PROTOCOLS.has(client.protocol)) {
        try { suspendSshAccount(client.username); } catch {}
      }
      db.prepare(
        "UPDATE clients SET status = 'suspended', updated_at = datetime('now') WHERE id = ?"
      ).run(client.id);
    }

    // Suspend expired resellers
    const expiredResellers = db.prepare(
      "SELECT id FROM admins WHERE role = 'reseller' AND status = 'active' AND expiry_date IS NOT NULL AND expiry_date < date('now')"
    ).all() as { id: string }[];
    for (const r of expiredResellers) {
      db.prepare(
        "UPDATE admins SET status = 'suspended', suspended_at = datetime('now'), updated_at = datetime('now') WHERE id = ?"
      ).run(r.id);
    }
  } catch (err) {
    console.error('[SCHEDULER] Error:', err);
  }
}

// Run scheduler every 5 minutes
setInterval(runExpiryScheduler, 5 * 60 * 1000);
runExpiryScheduler(); // run once at startup

// ─── Express app ─────────────────────────────────────────────────────────────
const app = express();

// Security headers
app.use((_req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});

app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: false }));

// Rate limiters
const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests — slow down.' },
});
const authLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many login attempts. Try again in 1 minute.' },
});

// ─── API routes ───────────────────────────────────────────────────────────────
app.use('/api/auth',      authLimiter, authRouter);
app.use('/api/admins',    apiLimiter,  adminsRouter);
app.use('/api/clients',   apiLimiter,  clientsRouter);
app.use('/api/plans',     apiLimiter,  plansRouter);
app.use('/api/logs',      apiLimiter,  logsRouter);
app.use('/api/resellers', apiLimiter,  resellersRouter);
app.use('/api/settings',  apiLimiter,  settingsRouter);
app.use('/api/monitoring',apiLimiter,  monitoringRouter);
app.use('/api/servers',   apiLimiter,  serversRouter);
app.use('/api/export',    apiLimiter,  exportRouter);
app.use('/api/payment',   apiLimiter,  paymentRouter);
app.use('/api/qrcode',    apiLimiter,  qrcodeRouter);
app.use('/api/auditlogs', apiLimiter,  auditLogsRouter);

// Swagger docs
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Health checks
app.get('/health', (_req, res) => {
  const db = getDb();
  const row = db.prepare("SELECT COUNT(*) as n FROM clients").get() as any;
  res.json({ status: 'ok', clients: row.n, ts: new Date().toISOString() });
});

app.get('/api/health', (_req, res) => {
  const db = getDb();
  const row = db.prepare("SELECT COUNT(*) as n FROM clients").get() as any;
  res.json({ status: 'ok', clients: row.n, ts: new Date().toISOString() });
});

// Server time
app.get('/api/server-time', apiLimiter, (_req, res) => {
  const db = getDb();
  const row = db.prepare("SELECT strftime('%s','now') as unix_ts, datetime('now') as iso").get() as any;
  res.json({ unix: Number(row.unix_ts), iso: row.iso });
});

// ─── Frontend SPA static files ────────────────────────────────────────────────
const PUBLIC_DIR = path.join(__dirname, '..', 'public');
if (fs.existsSync(PUBLIC_DIR)) {
  app.use(express.static(PUBLIC_DIR, { maxAge: '1d', etag: true }));
  app.get('*', (_req, res) => {
    const indexPath = path.join(PUBLIC_DIR, 'index.html');
    if (fs.existsSync(indexPath)) {
      res.sendFile(indexPath);
    } else {
      res.status(404).json({ error: 'Frontend not built. Run: npm run build:frontend' });
    }
  });
}

// ─── Start server ─────────────────────────────────────────────────────────────
function tryListen(portList: number[], idx: number): void {
  if (idx >= portList.length) {
    console.error('[ERROR] No available port found. Exiting.');
    process.exit(1);
  }
  const port = portList[idx];
  app.listen(port)
    .on('listening', () => {
      console.log(`[KATASHIE-WEB] ✓ Server running on http://0.0.0.0:${port}`);
      console.log(`[KATASHIE-WEB] ✓ Swagger docs: http://0.0.0.0:${port}/api/docs`);
      console.log(`[KATASHIE-WEB] ✓ Admin user: ${adminUser}`);
      console.log(`[KATASHIE-WEB] ✓ DB: ${path.join(DB_DIR, 'katashie.db')}`);
      // Persist the port to config file
      try {
        fs.mkdirSync(path.dirname(CONFIG_FILE), { recursive: true });
        const existing = fs.existsSync(CONFIG_FILE)
          ? JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'))
          : {};
        existing.port = port;
        fs.writeFileSync(CONFIG_FILE, JSON.stringify(existing, null, 2));
      } catch {}
    })
    .on('error', (err: NodeJS.ErrnoException) => {
      if (err.code === 'EADDRINUSE') {
        console.warn(`[KATASHIE-WEB] Port ${port} in use, trying next...`);
        tryListen(portList, idx + 1);
      } else {
        console.error('[KATASHIE-WEB] Server error:', err);
        process.exit(1);
      }
    });
}

const portList = configuredPort > 0
  ? [configuredPort, ...PORT_CANDIDATES.filter(p => p !== configuredPort)]
  : PORT_CANDIDATES;

tryListen(portList, 0);

export default app;
