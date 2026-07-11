"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const db_1 = require("../db");
const auth_1 = require("../middleware/auth");
const uuid_1 = require("uuid");
const router = (0, express_1.Router)();
function ensureServersTable() {
    const db = (0, db_1.getDb)();
    db.prepare(`
    CREATE TABLE IF NOT EXISTS servers (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      host TEXT NOT NULL,
      port INTEGER NOT NULL DEFAULT 22,
      ssh_user TEXT NOT NULL DEFAULT 'root',
      ssh_password TEXT,
      ssh_key TEXT,
      location TEXT,
      status TEXT NOT NULL DEFAULT 'unknown',
      last_check TEXT,
      cpu_usage REAL DEFAULT 0,
      memory_usage REAL DEFAULT 0,
      active_users INTEGER DEFAULT 0,
      created_by TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `).run();
}
// List all servers
router.get('/', auth_1.requireAuth, auth_1.requireAdmin, (_req, res) => {
    ensureServersTable();
    const db = (0, db_1.getDb)();
    const servers = db.prepare('SELECT id, name, host, port, ssh_user, location, status, last_check, cpu_usage, memory_usage, active_users, created_at FROM servers ORDER BY created_at DESC').all();
    res.json(servers);
});
// Get single server
router.get('/:id', auth_1.requireAuth, auth_1.requireAdmin, (req, res) => {
    ensureServersTable();
    const db = (0, db_1.getDb)();
    const server = db.prepare('SELECT id, name, host, port, ssh_user, location, status, last_check, cpu_usage, memory_usage, active_users, created_at FROM servers WHERE id = ?').get(req.params.id);
    if (!server)
        return res.status(404).json({ error: 'Server not found' });
    res.json(server);
});
// Add server
router.post('/', auth_1.requireAuth, auth_1.requireAdmin, (req, res) => {
    ensureServersTable();
    const { name, host, port = 22, ssh_user = 'root', ssh_password, ssh_key, location } = req.body;
    if (!name || !host)
        return res.status(400).json({ error: 'name and host are required' });
    const db = (0, db_1.getDb)();
    const admin = req.admin;
    const id = (0, uuid_1.v4)();
    db.prepare(`
    INSERT INTO servers (id, name, host, port, ssh_user, ssh_password, ssh_key, location, created_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, name, host, port, ssh_user, ssh_password || null, ssh_key || null, location || null, admin.id);
    res.status(201).json({ id, name, host, port, ssh_user, location, status: 'unknown' });
});
// Update server
router.put('/:id', auth_1.requireAuth, auth_1.requireAdmin, (req, res) => {
    ensureServersTable();
    const { name, host, port, ssh_user, ssh_password, ssh_key, location } = req.body;
    const db = (0, db_1.getDb)();
    db.prepare(`
    UPDATE servers SET name = COALESCE(?, name), host = COALESCE(?, host), port = COALESCE(?, port),
    ssh_user = COALESCE(?, ssh_user), ssh_password = COALESCE(?, ssh_password),
    ssh_key = COALESCE(?, ssh_key), location = COALESCE(?, location), updated_at = datetime('now')
    WHERE id = ?
  `).run(name, host, port, ssh_user, ssh_password, ssh_key, location, req.params.id);
    res.json({ success: true });
});
// Delete server
router.delete('/:id', auth_1.requireAuth, auth_1.requireAdmin, (req, res) => {
    ensureServersTable();
    const db = (0, db_1.getDb)();
    db.prepare('DELETE FROM servers WHERE id = ?').run(req.params.id);
    res.json({ success: true });
});
// Update server status (called by monitoring jobs)
router.post('/:id/status', auth_1.requireAuth, auth_1.requireAdmin, (req, res) => {
    ensureServersTable();
    const { status, cpu_usage, memory_usage, active_users } = req.body;
    const db = (0, db_1.getDb)();
    db.prepare(`
    UPDATE servers SET status = ?, cpu_usage = ?, memory_usage = ?, active_users = ?,
    last_check = datetime('now'), updated_at = datetime('now') WHERE id = ?
  `).run(status || 'unknown', cpu_usage || 0, memory_usage || 0, active_users || 0, req.params.id);
    res.json({ success: true });
});
exports.default = router;
//# sourceMappingURL=servers.js.map