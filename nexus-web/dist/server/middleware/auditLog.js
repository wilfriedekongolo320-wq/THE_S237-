"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.auditLog = auditLog;
exports.ensureAuditTable = ensureAuditTable;
const uuid_1 = require("uuid");
const db_1 = require("../db");
// BUG FIX: The previous INSERT used columns (admin_role, target, ip, status) which do NOT
// exist in the audit_logs table created by db.ts initSchema().
// db.ts creates: id, admin_id, admin_username, action, target_type, target_id, details,
// ip_address, created_at.
// This middleware now matches that schema exactly.
function auditLog(action) {
    return (req, res, next) => {
        const originalJson = res.json.bind(res);
        res.json = (body) => {
            try {
                const db = (0, db_1.getDb)();
                const admin = req.admin;
                const statusCode = res.statusCode;
                const success = statusCode >= 200 && statusCode < 300;
                db.prepare(`
          INSERT INTO audit_logs (id, admin_id, admin_username, action, target_type, target_id, details, ip_address, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
        `).run((0, uuid_1.v4)(), admin?.id || null, admin?.username || 'anonymous', action, req.method, req.params?.id || req.path, JSON.stringify({
                    path: req.path,
                    params: req.params,
                    body: sanitizeBody(req.body),
                    status: success ? 'success' : 'failure',
                    statusCode
                }), req.ip || req.socket?.remoteAddress || null);
            }
            catch (_) { }
            return originalJson(body);
        };
        next();
    };
}
function sanitizeBody(body) {
    if (!body || typeof body !== 'object')
        return body;
    const safe = { ...body };
    for (const key of ['password', 'token', 'secret', 'jwt', 'password_hash']) {
        if (key in safe)
            safe[key] = '***';
    }
    return safe;
}
// BUG FIX: The old ensureAuditTable() created a conflicting table schema with different
// column names than db.ts's initSchema(). Since db.ts runs first, the IF NOT EXISTS
// made this a silent no-op, leaving the INSERT pointing to non-existent columns.
// The audit_logs table is now managed solely by db.ts initSchema() — no duplicate
// CREATE TABLE here.
function ensureAuditTable() {
    // Table is created by db.ts initSchema() on first getDb() call.
    // This function is kept for API compatibility but no longer recreates the table.
    (0, db_1.getDb)(); // Ensure initSchema has run
}
//# sourceMappingURL=auditLog.js.map