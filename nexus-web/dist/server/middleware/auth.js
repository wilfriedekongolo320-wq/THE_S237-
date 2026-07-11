"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.JWT_SECRET = void 0;
exports.requireAuth = requireAuth;
exports.requireAdmin = requireAdmin;
exports.requireSuperAdmin = requireSuperAdmin;
const crypto_1 = __importDefault(require("crypto"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const db_1 = require("../db");
// Require a proper JWT secret — generate a random one if not provided (warn in logs)
const configuredJwtSecret = process.env.NEXUS_JWT_SECRET || process.env.KATASHIE_JWT_SECRET;
let JWT_SECRET;
if (configuredJwtSecret && configuredJwtSecret.length >= 32) {
    exports.JWT_SECRET = JWT_SECRET = configuredJwtSecret;
}
else {
    exports.JWT_SECRET = JWT_SECRET = crypto_1.default.randomBytes(48).toString('hex');
    console.warn('[AUTH] JWT secret not set or too short — using ephemeral random secret. Sessions will be invalidated on restart.');
}
function requireAuth(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
    }
    const token = authHeader.slice(7);
    try {
        const payload = jsonwebtoken_1.default.verify(token, JWT_SECRET);
        const db = (0, db_1.getDb)();
        const session = db.prepare("SELECT id FROM sessions WHERE token = ? AND expires_at > datetime('now')").get(token);
        if (!session) {
            res.status(401).json({ error: 'Session expired or invalid' });
            return;
        }
        const admin = db.prepare("SELECT id, username, role, status FROM admins WHERE id = ?").get(payload.id);
        if (!admin || admin.status !== 'active') {
            res.status(401).json({ error: 'Account inactive or not found' });
            return;
        }
        req.admin = { id: admin.id, username: admin.username, role: admin.role };
        next();
    }
    catch {
        res.status(401).json({ error: 'Invalid token' });
    }
}
// BUG FIX: requireAdmin was imported in servers.ts but was missing from this file.
// Added here to accept both 'admin' and 'super_admin' roles.
function requireAdmin(req, res, next) {
    requireAuth(req, res, () => {
        if (req.admin?.role !== 'admin' && req.admin?.role !== 'super_admin') {
            res.status(403).json({ error: 'Admin required' });
            return;
        }
        next();
    });
}
function requireSuperAdmin(req, res, next) {
    requireAuth(req, res, () => {
        if (req.admin?.role !== 'super_admin') {
            res.status(403).json({ error: 'Super admin required' });
            return;
        }
        next();
    });
}
//# sourceMappingURL=auth.js.map