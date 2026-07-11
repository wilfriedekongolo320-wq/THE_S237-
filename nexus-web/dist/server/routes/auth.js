"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const uuid_1 = require("uuid");
const db_1 = require("../db");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
const SESSION_HOURS = 24;
// POST /api/auth/login
router.post('/login', async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
        res.status(400).json({ error: 'Username and password required' });
        return;
    }
    const db = (0, db_1.getDb)();
    const admin = db.prepare('SELECT id, username, password_hash, role, status FROM admins WHERE username = ?').get(username);
    // Use async bcrypt.compare so the event loop is not blocked during heavy concurrent logins
    const passwordMatch = admin ? await bcryptjs_1.default.compare(password, admin.password_hash) : false;
    if (!admin || !passwordMatch) {
        res.status(401).json({ error: 'Identifiants invalides' });
        return;
    }
    if (admin.status !== 'active') {
        res.status(403).json({ error: 'Compte suspendu' });
        return;
    }
    // For resellers: also check server-side expiry (date manipulation protection)
    if (admin.role === 'reseller') {
        const expired = db.prepare("SELECT expiry_date IS NOT NULL AND expiry_date < date('now') as is_exp FROM admins WHERE id = ?").get(admin.id);
        if (expired?.is_exp) {
            res.status(403).json({ error: 'Compte revendeur expiré' });
            return;
        }
    }
    const expiresAt = new Date(Date.now() + SESSION_HOURS * 3600 * 1000);
    const token = jsonwebtoken_1.default.sign({ id: admin.id, username: admin.username, role: admin.role }, auth_1.JWT_SECRET, { expiresIn: `${SESSION_HOURS}h` });
    db.prepare('INSERT INTO sessions (id, admin_id, token, expires_at) VALUES (?, ?, ?, ?)').run((0, uuid_1.v4)(), admin.id, token, expiresAt.toISOString());
    (0, db_1.logAction)(admin.id, admin.username, 'LOGIN', null, null, {}, req.ip || null);
    res.json({
        token,
        admin: { id: admin.id, username: admin.username, role: admin.role }
    });
});
// POST /api/auth/logout
router.post('/logout', auth_1.requireAuth, (req, res) => {
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
        const token = authHeader.slice(7);
        const db = (0, db_1.getDb)();
        db.prepare('DELETE FROM sessions WHERE token = ?').run(token);
    }
    (0, db_1.logAction)(req.admin?.id || null, req.admin?.username || null, 'LOGOUT', null, null, {}, req.ip || null);
    res.json({ message: 'Logged out' });
});
// GET /api/auth/me
router.get('/me', auth_1.requireAuth, (req, res) => {
    const db = (0, db_1.getDb)();
    const admin = db.prepare('SELECT id, username, role, status, bouquet, expiry_date FROM admins WHERE id = ?').get(req.admin.id);
    if (!admin) {
        res.status(404).json({ error: 'Admin not found' });
        return;
    }
    // For resellers: enforce server-side expiry (in case scheduler hasn't run yet)
    if (admin.role === 'reseller' && admin.expiry_date) {
        const expired = db.prepare("SELECT expiry_date < date('now') as is_exp FROM admins WHERE id = ?").get(admin.id).is_exp;
        if (expired) {
            res.status(403).json({ error: 'Compte revendeur expiré' });
            return;
        }
    }
    // Calculate remaining days and remaining seconds from server time
    let remainingDays = null;
    let remainingSeconds = null;
    if (admin.expiry_date) {
        const row = db.prepare("SELECT CAST(JULIANDAY(?) - JULIANDAY(date('now')) AS INTEGER) as days, " +
            "CAST((JULIANDAY(? || ' 23:59:59') - JULIANDAY(datetime('now'))) * 86400 AS INTEGER) as secs").get(admin.expiry_date, admin.expiry_date);
        remainingDays = Math.max(0, row.days);
        remainingSeconds = Math.max(0, row.secs);
    }
    let bouquet = admin.bouquet;
    try {
        const parsed = typeof admin.bouquet === 'string' ? JSON.parse(admin.bouquet) : admin.bouquet;
        if (Array.isArray(parsed)) {
            bouquet = parsed.map((b) => {
                const protocolId = String(b?.protocolId || '').toLowerCase();
                const usedRow = db.prepare('SELECT COUNT(*) as c FROM clients WHERE created_by = ? AND protocol = ?')
                    .get(admin.id, protocolId);
                return {
                    protocolId,
                    maxAccounts: Number(b?.maxAccounts || 0),
                    usedAccounts: Number(usedRow?.c || 0),
                };
            });
        }
    }
    catch { }
    res.json({
        admin: {
            id: admin.id,
            username: admin.username,
            role: admin.role,
            status: admin.status,
            bouquet,
            expiry_date: admin.expiry_date,
            remaining_days: remainingDays,
            remaining_seconds: remainingSeconds,
        },
    });
});
// POST /api/auth/change-password
router.post('/change-password', auth_1.requireAuth, async (req, res) => {
    const { current_password, new_password, new_username } = req.body;
    if (!current_password || (!new_password && !new_username)) {
        res.status(400).json({ error: 'current_password and at least one of new_password or new_username required' });
        return;
    }
    const db = (0, db_1.getDb)();
    const admin = db.prepare('SELECT id, username, password_hash FROM admins WHERE id = ?').get(req.admin.id);
    const passwordMatch = admin ? await bcryptjs_1.default.compare(current_password, admin.password_hash) : false;
    if (!admin || !passwordMatch) {
        res.status(401).json({ error: 'Current password incorrect' });
        return;
    }
    const updates = [];
    const params = [];
    if (new_password) {
        if (new_password.length < 6) {
            res.status(400).json({ error: 'New password must be at least 6 characters' });
            return;
        }
        updates.push('password_hash = ?');
        params.push(await bcryptjs_1.default.hash(new_password, 12));
    }
    if (new_username) {
        const exists = db.prepare('SELECT id FROM admins WHERE username = ? AND id != ?').get(new_username, admin.id);
        if (exists) {
            res.status(409).json({ error: 'Username already taken' });
            return;
        }
        updates.push('username = ?');
        params.push(new_username);
    }
    updates.push("updated_at = datetime('now')");
    params.push(admin.id);
    db.prepare(`UPDATE admins SET ${updates.join(', ')} WHERE id = ?`).run(...params);
    (0, db_1.logAction)(req.admin.id, req.admin.username, 'CHANGE_CREDENTIALS', 'admin', admin.id, {}, req.ip || null);
    res.json({ message: 'Credentials updated successfully' });
});
exports.default = router;
//# sourceMappingURL=auth.js.map