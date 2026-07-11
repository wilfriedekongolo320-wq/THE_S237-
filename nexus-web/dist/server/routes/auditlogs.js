"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const db_1 = require("../db");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// GET /api/audit-logs?page=1&limit=50&username=&action=&status=
router.get('/', auth_1.requireAuth, auth_1.requireAdmin, (req, res) => {
    const db = (0, db_1.getDb)();
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(200, parseInt(req.query.limit) || 50);
    const offset = (page - 1) * limit;
    const filters = [];
    const params = [];
    if (req.query.username) {
        filters.push('admin_username LIKE ?');
        params.push(`%${req.query.username}%`);
    }
    if (req.query.action) {
        filters.push('action LIKE ?');
        params.push(`%${req.query.action}%`);
    }
    // BUG FIX: audit_logs n'a pas de colonne "status" (voir server/db.ts) — le filtre
    // provoquait une erreur SQL "no such column: status". La colonne réelle
    // pour filtrer par type de cible est "target_type".
    if (req.query.target_type) {
        filters.push('target_type = ?');
        params.push(req.query.target_type);
    }
    const where = filters.length ? `WHERE ${filters.join(' AND ')}` : '';
    const total = db.prepare(`SELECT COUNT(*) as n FROM audit_logs ${where}`).get(...params)?.n || 0;
    const logs = db.prepare(`SELECT * FROM audit_logs ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`).all(...params, limit, offset);
    res.json({ logs, total, page, pages: Math.ceil(total / limit) });
});
// DELETE old audit logs (admin cleanup)
router.delete('/cleanup', auth_1.requireAuth, auth_1.requireAdmin, (req, res) => {
    const db = (0, db_1.getDb)();
    const days = parseInt(req.query.days) || 90;
    const result = db.prepare(`DELETE FROM audit_logs WHERE created_at < datetime('now', '-${days} days')`).run();
    res.json({ deleted: result.changes });
});
exports.default = router;
//# sourceMappingURL=auditlogs.js.map