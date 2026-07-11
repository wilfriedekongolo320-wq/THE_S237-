"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const uuid_1 = require("uuid");
const db_1 = require("../db");
const auth_1 = require("../middleware/auth");
const scripts_1 = require("../scripts");
const router = (0, express_1.Router)();
const PROTOCOLS = ['ssh', 'vmess', 'vless', 'trojan', 'socks', 'zipvpn', 'slowdns', 'udpcustom'];
function normalizeProtocol(protocol) {
    const p = String(protocol || '').toLowerCase().trim();
    if (p === 'udp-custom')
        return 'udpcustom';
    if (p === 'zivpn')
        return 'zipvpn';
    return p;
}
function getResellerState(adminId) {
    const db = (0, db_1.getDb)();
    const row = db.prepare("SELECT bouquet, expiry_date FROM admins WHERE id = ? AND role = 'reseller' AND status = 'active' AND (expiry_date IS NULL OR expiry_date >= datetime('now'))").get(adminId);
    if (!row)
        return null;
    let bouquet = [];
    try {
        bouquet = row.bouquet ? JSON.parse(row.bouquet) : [];
    }
    catch {
        bouquet = [];
    }
    let remainingDays = 9999;
    if (row.expiry_date) {
        const result = db.prepare("SELECT CAST(JULIANDAY(?) - JULIANDAY(datetime('now')) AS INTEGER) as days").get(row.expiry_date);
        remainingDays = Math.max(0, result.days);
    }
    return {
        bouquet: Array.isArray(bouquet) ? bouquet : [],
        remainingDays,
        expiryDate: row.expiry_date || null,
    };
}
function canResellerUseProtocol(adminId, protocol) {
    const db = (0, db_1.getDb)();
    const state = getResellerState(adminId);
    if (!state)
        return { ok: false, error: 'Reseller account not active or not found' };
    const item = state.bouquet.find(b => normalizeProtocol(String(b.protocolId || '')) === protocol);
    if (!item)
        return { ok: false, error: `Protocol '${protocol}' not allowed for your reseller bouquet` };
    const maxAccounts = Number(item.maxAccounts || 0);
    if (maxAccounts < 1)
        return { ok: false, error: `Protocol '${protocol}' quota is 0` };
    const used = Number(db.prepare('SELECT COUNT(*) as c FROM clients WHERE created_by = ? AND protocol = ?').get(adminId, protocol).c);
    if (used >= maxAccounts) {
        return { ok: false, error: `Quota atteint pour le protocole '${protocol}' (${used}/${maxAccounts})` };
    }
    return { ok: true };
}
// GET /api/clients
router.get('/', auth_1.requireAuth, (req, res) => {
    const db = (0, db_1.getDb)();
    const admin = req.admin;
    const mine = req.query.mine === 'true' || admin.role === 'reseller';
    const createdBy = req.query.created_by;
    let query = `SELECT id, username, protocol, plan_id, expires_at, status, created_by, created_at, updated_at FROM clients`;
    const params = [];
    if (mine) {
        query += ' WHERE created_by = ?';
        params.push(admin.id);
    }
    else if (createdBy) {
        query += ' WHERE created_by = ?';
        params.push(createdBy);
    }
    query += ' ORDER BY created_at DESC';
    res.json(db.prepare(query).all(...params));
});
// POST /api/clients (CRÉATION AVEC PLAFONNEMENT)
router.post('/', auth_1.requireAuth, (req, res) => {
    const { username, password, protocol, days, plan_id } = req.body;
    if (!username || !password || !protocol || !days) {
        res.status(400).json({ error: 'username, password, protocol, and days are required' });
        return;
    }
    const normalizedProtocol = normalizeProtocol(protocol);
    if (!PROTOCOLS.includes(normalizedProtocol)) {
        res.status(400).json({ error: `Protocol must be one of: ${PROTOCOLS.join(', ')}` });
        return;
    }
    if (days < 1 || days > 3650) {
        res.status(400).json({ error: 'days must be between 1 and 3650' });
        return;
    }
    const db = (0, db_1.getDb)();
    const exists = db.prepare('SELECT id FROM clients WHERE username = ? AND protocol = ?').get(username, normalizedProtocol);
    if (exists) {
        res.status(409).json({ error: `Client '${username}' already exists for protocol '${normalizedProtocol}'` });
        return;
    }
    let resellerExpiry = null;
    if (req.admin.role === 'reseller') {
        const state = getResellerState(req.admin.id);
        if (!state) {
            res.status(403).json({ error: 'Reseller account not active or expired' });
            return;
        }
        resellerExpiry = state.expiryDate;
        const protocolCheck = canResellerUseProtocol(req.admin.id, normalizedProtocol);
        if (!protocolCheck.ok) {
            res.status(403).json({ error: protocolCheck.error || 'Protocol not allowed for reseller' });
            return;
        }
    }
    let scriptResult;
    switch (normalizedProtocol) {
        case 'ssh':
            scriptResult = (0, scripts_1.createSshAccount)(username, password, days);
            break;
        case 'vmess':
            scriptResult = (0, scripts_1.createXrayVmessAccount)(username, days);
            break;
        case 'vless':
            scriptResult = (0, scripts_1.createXrayVlessAccount)(username, days);
            break;
        case 'trojan':
            scriptResult = (0, scripts_1.createXrayTrojanAccount)(username, password, days);
            break;
        case 'socks':
            scriptResult = (0, scripts_1.createXraySocksAccount)(username, password, days);
            break;
        case 'zipvpn':
            scriptResult = (0, scripts_1.createZipVpnAccount)(username, password, days);
            break;
        case 'slowdns':
            scriptResult = (0, scripts_1.createSlowDnsAccount)(username, password, days);
            break;
        case 'udpcustom':
            scriptResult = (0, scripts_1.createUdpCustomAccount)(username, password, days);
            break;
        default:
            res.status(400).json({ error: 'Unknown protocol' });
            return;
    }
    if (!scriptResult.success) {
        res.status(500).json({ error: scriptResult.error || 'Failed to create account' });
        return;
    }
    let expiresAt = db.prepare("SELECT datetime('now', ?) as d").get(`+${days} days`).d;
    // --- APPLICATION DE TA THÉORIE (CAPPING) ---
    if (resellerExpiry && expiresAt > resellerExpiry) {
        expiresAt = resellerExpiry;
    }
    // -------------------------------------------
    const id = (0, uuid_1.v4)();
    try {
        db.prepare(`INSERT INTO clients (id, username, password, protocol, plan_id, expires_at, status, created_by, extra_data) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(id, username, password, normalizedProtocol, plan_id || null, expiresAt, 'active', req.admin.id, JSON.stringify(scriptResult.data || {}));
    }
    catch (e) {
        res.status(500).json({ error: 'Failed to persist client in database' });
        return;
    }
    (0, db_1.logAction)(req.admin.id, req.admin.username, 'CREATE_CLIENT', 'client', id, { username, protocol: normalizedProtocol, days }, req.ip || null);
    res.status(201).json({ id, username, protocol: normalizedProtocol, expires_at: expiresAt, account_data: scriptResult.data });
});
// GET /api/clients/:id
router.get('/:id', auth_1.requireAuth, (req, res) => {
    const db = (0, db_1.getDb)();
    const client = db.prepare('SELECT * FROM clients WHERE id = ?').get(req.params.id);
    if (!client) {
        res.status(404).json({ error: 'Client not found' });
        return;
    }
    if (req.admin.role === 'reseller' && client.created_by !== req.admin.id) {
        res.status(403).json({ error: 'Forbidden' });
        return;
    }
    try {
        client.extra_data = JSON.parse(client.extra_data);
    }
    catch { }
    res.json(client);
});
// PUT /api/clients/:id
router.put('/:id', auth_1.requireAuth, (req, res) => {
    const { password } = req.body;
    const db = (0, db_1.getDb)();
    const client = db.prepare('SELECT * FROM clients WHERE id = ?').get(req.params.id);
    if (!client) {
        res.status(404).json({ error: 'Client not found' });
        return;
    }
    if (req.admin.role === 'reseller') {
        const own = db.prepare('SELECT created_by FROM clients WHERE id = ?').get(req.params.id);
        if (!own || own.created_by !== req.admin.id) {
            res.status(403).json({ error: 'Forbidden' });
            return;
        }
    }
    if (!password) {
        res.status(400).json({ error: 'password required' });
        return;
    }
    db.prepare("UPDATE clients SET password = ?, updated_at = datetime('now') WHERE id = ?").run(password, req.params.id);
    (0, db_1.logAction)(req.admin.id, req.admin.username, 'UPDATE_CLIENT', 'client', req.params.id, { username: client.username }, req.ip || null);
    res.json({ message: 'Client updated' });
});
// POST /api/clients/:id/renew (RENOUVELLEMENT AVEC PLAFONNEMENT)
router.post('/:id/renew', auth_1.requireAuth, (req, res) => {
    const { days } = req.body;
    if (!days || days < 1) {
        res.status(400).json({ error: 'days required and must be >= 1' });
        return;
    }
    const db = (0, db_1.getDb)();
    const client = db.prepare('SELECT * FROM clients WHERE id = ?').get(req.params.id);
    if (!client) {
        res.status(404).json({ error: 'Client not found' });
        return;
    }
    if (req.admin.role === 'reseller' && client.created_by !== req.admin.id) {
        res.status(403).json({ error: 'Forbidden' });
        return;
    }
    let resellerExpiry = null;
    if (req.admin.role === 'reseller') {
        const state = getResellerState(req.admin.id);
        if (!state) {
            res.status(403).json({ error: 'Reseller account not active or expired' });
            return;
        }
        resellerExpiry = state.expiryDate;
    }
    let scriptResult;
    if (['ssh', 'slowdns', 'udpcustom'].includes(client.protocol)) {
        scriptResult = (0, scripts_1.renewSshAccount)(client.username, days);
    }
    else {
        scriptResult = { success: true, data: {} };
    }
    if (!scriptResult.success) {
        res.status(500).json({ error: scriptResult.error });
        return;
    }
    let newExpiry = db.prepare("SELECT datetime('now', ?) as d").get(`+${days} days`).d;
    // --- APPLICATION DE TA THÉORIE (CAPPING) ---
    if (resellerExpiry && newExpiry > resellerExpiry) {
        newExpiry = resellerExpiry;
    }
    // -------------------------------------------
    db.prepare("UPDATE clients SET expires_at = ?, status = 'active', updated_at = datetime('now') WHERE id = ?").run(newExpiry, req.params.id);
    (0, db_1.logAction)(req.admin.id, req.admin.username, 'RENEW_CLIENT', 'client', req.params.id, { username: client.username, days, new_expiry: newExpiry }, req.ip || null);
    res.json({ message: 'Client renewed', expires_at: newExpiry });
});
// POST /api/clients/:id/suspend
router.post('/:id/suspend', auth_1.requireAuth, (req, res) => {
    const db = (0, db_1.getDb)();
    const client = db.prepare('SELECT * FROM clients WHERE id = ?').get(req.params.id);
    if (!client) {
        res.status(404).json({ error: 'Client not found' });
        return;
    }
    if (req.admin.role === 'reseller' && client.created_by !== req.admin.id) {
        res.status(403).json({ error: 'Forbidden' });
        return;
    }
    if (['ssh', 'slowdns', 'udpcustom'].includes(client.protocol)) {
        const result = (0, scripts_1.suspendSshAccount)(client.username);
        if (!result.success) {
            res.status(500).json({ error: result.error });
            return;
        }
    }
    db.prepare("UPDATE clients SET status = 'suspended', updated_at = datetime('now') WHERE id = ?").run(req.params.id);
    (0, db_1.logAction)(req.admin.id, req.admin.username, 'SUSPEND_CLIENT', 'client', req.params.id, { username: client.username }, req.ip || null);
    res.json({ message: 'Client suspended' });
});
// POST /api/clients/:id/reduce-days
router.post('/:id/reduce-days', auth_1.requireAuth, (req, res) => {
    const { days } = req.body;
    if (!days || days < 1) {
        res.status(400).json({ error: 'days required and must be >= 1' });
        return;
    }
    const db = (0, db_1.getDb)();
    const client = db.prepare('SELECT * FROM clients WHERE id = ?').get(req.params.id);
    if (!client) {
        res.status(404).json({ error: 'Client not found' });
        return;
    }
    if (req.admin.role === 'reseller' && client.created_by !== req.admin.id) {
        res.status(403).json({ error: 'Forbidden' });
        return;
    }
    const timeCheck = db.prepare("SELECT CAST(JULIANDAY(expires_at) - JULIANDAY(datetime('now')) AS INTEGER) as remaining FROM clients WHERE id = ?").get(req.params.id);
    if (days > timeCheck.remaining) {
        res.status(400).json({ error: `Action impossible : vous essayez de réduire ${days} jours, mais il ne reste que ${timeCheck.remaining} jours sur ce compte.` });
        return;
    }
    const newExpiry = db.prepare("SELECT datetime(?, ?) as d").get(client.expires_at, `-${days} days`).d;
    const isExpired = db.prepare("SELECT ? <= datetime('now') as expired").get(newExpiry).expired;
    if (['ssh', 'slowdns', 'udpcustom'].includes(client.protocol)) {
        if (isExpired) {
            try {
                (0, scripts_1.suspendSshAccount)(client.username);
            }
            catch (e) { }
        }
        else {
            try {
                (0, scripts_1.setSshAccountExpiry)(client.username, newExpiry);
            }
            catch (e) { }
        }
    }
    const newStatus = isExpired ? 'suspended' : (client.status === 'suspended' ? 'suspended' : 'active');
    db.prepare("UPDATE clients SET expires_at = ?, status = ?, updated_at = datetime('now') WHERE id = ?").run(newExpiry, newStatus, req.params.id);
    (0, db_1.logAction)(req.admin.id, req.admin.username, 'REDUCE_CLIENT_DAYS', 'client', req.params.id, { username: client.username, days_removed: days, new_expiry: newExpiry }, req.ip || null);
    res.json({ message: 'Client expiry reduced', expires_at: newExpiry, status: newStatus });
});
// DELETE /api/clients/:id
router.delete('/:id', auth_1.requireAuth, (req, res) => {
    const db = (0, db_1.getDb)();
    const client = db.prepare('SELECT * FROM clients WHERE id = ?').get(req.params.id);
    if (!client) {
        res.status(404).json({ error: 'Client not found' });
        return;
    }
    if (req.admin.role === 'reseller' && client.created_by !== req.admin.id) {
        res.status(403).json({ error: 'Forbidden' });
        return;
    }
    if (['ssh', 'slowdns', 'udpcustom'].includes(client.protocol)) {
        (0, scripts_1.deleteSshAccount)(client.username);
    }
    db.prepare('DELETE FROM clients WHERE id = ?').run(req.params.id);
    (0, db_1.logAction)(req.admin.id, req.admin.username, 'DELETE_CLIENT', 'client', req.params.id, { username: client.username, protocol: client.protocol }, req.ip || null);
    res.json({ message: 'Client deleted' });
});
exports.default = router;
//# sourceMappingURL=clients.js.map