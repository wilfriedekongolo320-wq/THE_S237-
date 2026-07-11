"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const db_1 = require("../db");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// GET /api/logs
router.get('/', auth_1.requireAuth, (req, res) => {
    const db = (0, db_1.getDb)();
    const limit = Math.min(parseInt(String(req.query['limit'] || '100'), 10), 500);
    const offset = parseInt(String(req.query['offset'] || '0'), 10);
    const action = req.query['action'];
    const targetType = req.query['target_type'];
    let query = 'SELECT * FROM audit_logs';
    const conditions = [];
    const params = [];
    if (action) {
        conditions.push('action LIKE ?');
        params.push(`%${action}%`);
    }
    if (targetType) {
        conditions.push('target_type = ?');
        params.push(targetType);
    }
    if (conditions.length > 0) {
        query += ' WHERE ' + conditions.join(' AND ');
    }
    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);
    const logs = db.prepare(query).all(...params);
    const parsed = logs.map(l => {
        try {
            l['details'] = JSON.parse(l['details']);
        }
        catch { }
        return l;
    });
    const total = db.prepare('SELECT COUNT(*) as cnt FROM audit_logs').get().cnt;
    res.json({ total, limit, offset, logs: parsed });
});
// GET /api/logs/stats — summary statistics
router.get('/stats', auth_1.requireAuth, (_req, res) => {
    const db = (0, db_1.getDb)();
    const totalClients = db.prepare("SELECT COUNT(*) as cnt FROM clients").get().cnt;
    const activeClients = db.prepare("SELECT COUNT(*) as cnt FROM clients WHERE status = 'active'").get().cnt;
    const expiredClients = db.prepare("SELECT COUNT(*) as cnt FROM clients WHERE expires_at < date('now')").get().cnt;
    const totalAdmins = db.prepare("SELECT COUNT(*) as cnt FROM admins WHERE role IN ('admin', 'super_admin')").get().cnt;
    const totalResellers = db.prepare("SELECT COUNT(*) as cnt FROM admins WHERE role = 'reseller'").get().cnt;
    const activeResellers = db.prepare("SELECT COUNT(*) as cnt FROM admins WHERE role = 'reseller' AND status = 'active'").get().cnt;
    const suspendedResellers = db.prepare("SELECT COUNT(*) as cnt FROM admins WHERE role = 'reseller' AND status = 'suspended'").get().cnt;
    const totalPlans = db.prepare("SELECT COUNT(*) as cnt FROM plans").get().cnt;
    const recentActions = (db.prepare("SELECT action, COUNT(*) as cnt FROM audit_logs WHERE created_at > datetime('now', '-7 days') GROUP BY action ORDER BY cnt DESC LIMIT 10").all());
    const protocolStats = (db.prepare("SELECT protocol, COUNT(*) as cnt FROM clients GROUP BY protocol ORDER BY cnt DESC").all());
    res.json({
        clients: { total: totalClients, active: activeClients, expired: expiredClients },
        admins: { total: totalAdmins },
        resellers: { total: totalResellers, active: activeResellers, suspended: suspendedResellers },
        plans: { total: totalPlans },
        recent_actions: recentActions,
        protocol_stats: protocolStats,
    });
});
exports.default = router;
//# sourceMappingURL=logs.js.map