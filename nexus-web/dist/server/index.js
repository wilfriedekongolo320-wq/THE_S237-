"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const swagger_ui_express_1 = __importDefault(require("swagger-ui-express"));
const db_1 = require("./db");
const auth_1 = __importDefault(require("./routes/auth"));
const admins_1 = __importDefault(require("./routes/admins"));
const clients_1 = __importDefault(require("./routes/clients"));
const plans_1 = __importDefault(require("./routes/plans"));
const logs_1 = __importDefault(require("./routes/logs"));
const resellers_1 = __importDefault(require("./routes/resellers"));
const settings_1 = __importDefault(require("./routes/settings"));
const monitoring_1 = __importDefault(require("./routes/monitoring"));
const servers_1 = __importDefault(require("./routes/servers"));
const export_1 = __importDefault(require("./routes/export"));
const payment_1 = __importDefault(require("./routes/payment"));
const qrcode_1 = __importDefault(require("./routes/qrcode"));
const auditlogs_1 = __importDefault(require("./routes/auditlogs"));
const scripts_1 = require("./scripts");
const auditLog_1 = require("./middleware/auditLog");
const backupCron_1 = require("./jobs/backupCron");
const notifyExpiry_1 = require("./jobs/notifyExpiry");
const swagger_1 = require("./swagger");
// ─── BUG FIX: CONFIG_FILE path now uses KATASHIE_DB_DIR to stay consistent ──
const DB_DIR = process.env.KATASHIE_DB_DIR || process.env.NEXUS_DB_DIR || '/etc/katashie-web';
const CONFIG_FILE = process.env.KATASHIE_CONFIG || path_1.default.join(DB_DIR, 'config.json');
let config = {};
if (fs_1.default.existsSync(CONFIG_FILE)) {
    try {
        config = JSON.parse(fs_1.default.readFileSync(CONFIG_FILE, 'utf8'));
    }
    catch (e) {
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
(0, db_1.getDb)();
(0, db_1.seedSuperAdmin)(adminUser, adminPass);
// ─── Ensure extra DB tables ───────────────────────────────────────────────────
(0, auditLog_1.ensureAuditTable)();
// ─── Init Telegram notifier ───────────────────────────────────────────────────
const tgToken = config.telegram_bot_token || process.env.TELEGRAM_BOT_TOKEN || '';
const tgChat = config.telegram_admin_chat || process.env.TELEGRAM_ADMIN_CHAT || '';
if (tgToken && tgChat) {
    (0, notifyExpiry_1.initNotifier)(tgToken, tgChat);
    setInterval(() => (0, notifyExpiry_1.runExpiryNotifier)().catch(console.error), 60 * 60 * 1000);
    console.log('[NOTIFY] Telegram notifier enabled');
}
// ─── Schedule daily backup ────────────────────────────────────────────────────
(0, backupCron_1.scheduleDailyBackup)();
// ─── Global error handlers ────────────────────────────────────────────────────
process.on('uncaughtException', (err) => {
    console.error('[FATAL] Uncaught exception:', err);
    process.exit(1);
});
process.on('unhandledRejection', (reason) => {
    console.error('[FATAL] Unhandled promise rejection:', reason);
    process.exit(1);
});
// ─── Expiry scheduler ─────────────────────────────────────────────────────────
const SSH_PROTOCOLS = new Set(['ssh', 'slowdns', 'udpcustom']);
function runExpiryScheduler() {
    try {
        const db = (0, db_1.getDb)();
        const expiredClients = db.prepare("SELECT id, username, protocol FROM clients WHERE status = 'active' AND expires_at < date('now')").all();
        for (const client of expiredClients) {
            if (SSH_PROTOCOLS.has(client.protocol)) {
                try {
                    (0, scripts_1.suspendSshAccount)(client.username);
                }
                catch { }
            }
            db.prepare("UPDATE clients SET status = 'suspended', updated_at = datetime('now') WHERE id = ?").run(client.id);
        }
        // Suspend expired resellers
        const expiredResellers = db.prepare("SELECT id FROM admins WHERE role = 'reseller' AND status = 'active' AND expiry_date IS NOT NULL AND expiry_date < date('now')").all();
        for (const r of expiredResellers) {
            db.prepare("UPDATE admins SET status = 'suspended', suspended_at = datetime('now'), updated_at = datetime('now') WHERE id = ?").run(r.id);
        }
    }
    catch (err) {
        console.error('[SCHEDULER] Error:', err);
    }
}
// Run scheduler every 5 minutes
setInterval(runExpiryScheduler, 5 * 60 * 1000);
runExpiryScheduler(); // run once at startup
// ─── Express app ─────────────────────────────────────────────────────────────
const app = (0, express_1.default)();
// Security headers
app.use((_req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    next();
});
app.use((0, cors_1.default)({ origin: true, credentials: true }));
app.use(express_1.default.json({ limit: '2mb' }));
app.use(express_1.default.urlencoded({ extended: false }));
// Rate limiters
const apiLimiter = (0, express_rate_limit_1.default)({
    windowMs: 60 * 1000,
    max: 120,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many requests — slow down.' },
});
const authLimiter = (0, express_rate_limit_1.default)({
    windowMs: 60 * 1000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many login attempts. Try again in 1 minute.' },
});
// ─── API routes ───────────────────────────────────────────────────────────────
app.use('/api/auth', authLimiter, auth_1.default);
app.use('/api/admins', apiLimiter, admins_1.default);
app.use('/api/clients', apiLimiter, clients_1.default);
app.use('/api/plans', apiLimiter, plans_1.default);
app.use('/api/logs', apiLimiter, logs_1.default);
app.use('/api/resellers', apiLimiter, resellers_1.default);
app.use('/api/settings', apiLimiter, settings_1.default);
app.use('/api/monitoring', apiLimiter, monitoring_1.default);
app.use('/api/servers', apiLimiter, servers_1.default);
app.use('/api/export', apiLimiter, export_1.default);
app.use('/api/payment', apiLimiter, payment_1.default);
app.use('/api/qrcode', apiLimiter, qrcode_1.default);
app.use('/api/auditlogs', apiLimiter, auditlogs_1.default);
// Swagger docs
app.use('/api/docs', swagger_ui_express_1.default.serve, swagger_ui_express_1.default.setup(swagger_1.swaggerSpec));
// Health checks
app.get('/health', (_req, res) => {
    const db = (0, db_1.getDb)();
    const row = db.prepare("SELECT COUNT(*) as n FROM clients").get();
    res.json({ status: 'ok', clients: row.n, ts: new Date().toISOString() });
});
app.get('/api/health', (_req, res) => {
    const db = (0, db_1.getDb)();
    const row = db.prepare("SELECT COUNT(*) as n FROM clients").get();
    res.json({ status: 'ok', clients: row.n, ts: new Date().toISOString() });
});
// Server time
app.get('/api/server-time', apiLimiter, (_req, res) => {
    const db = (0, db_1.getDb)();
    const row = db.prepare("SELECT strftime('%s','now') as unix_ts, datetime('now') as iso").get();
    res.json({ unix: Number(row.unix_ts), iso: row.iso });
});
// ─── Frontend SPA static files ────────────────────────────────────────────────
const PUBLIC_DIR = path_1.default.join(__dirname, '..', 'public');
if (fs_1.default.existsSync(PUBLIC_DIR)) {
    app.use(express_1.default.static(PUBLIC_DIR, { maxAge: '1d', etag: true }));
    app.get('*', (_req, res) => {
        const indexPath = path_1.default.join(PUBLIC_DIR, 'index.html');
        if (fs_1.default.existsSync(indexPath)) {
            res.sendFile(indexPath);
        }
        else {
            res.status(404).json({ error: 'Frontend not built. Run: npm run build:frontend' });
        }
    });
}
// ─── Start server ─────────────────────────────────────────────────────────────
function tryListen(portList, idx) {
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
        console.log(`[KATASHIE-WEB] ✓ DB: ${path_1.default.join(DB_DIR, 'katashie.db')}`);
        // Persist the port to config file
        try {
            fs_1.default.mkdirSync(path_1.default.dirname(CONFIG_FILE), { recursive: true });
            const existing = fs_1.default.existsSync(CONFIG_FILE)
                ? JSON.parse(fs_1.default.readFileSync(CONFIG_FILE, 'utf8'))
                : {};
            existing.port = port;
            fs_1.default.writeFileSync(CONFIG_FILE, JSON.stringify(existing, null, 2));
        }
        catch { }
    })
        .on('error', (err) => {
        if (err.code === 'EADDRINUSE') {
            console.warn(`[KATASHIE-WEB] Port ${port} in use, trying next...`);
            tryListen(portList, idx + 1);
        }
        else {
            console.error('[KATASHIE-WEB] Server error:', err);
            process.exit(1);
        }
    });
}
const portList = configuredPort > 0
    ? [configuredPort, ...PORT_CANDIDATES.filter(p => p !== configuredPort)]
    : PORT_CANDIDATES;
tryListen(portList, 0);
exports.default = app;
//# sourceMappingURL=index.js.map