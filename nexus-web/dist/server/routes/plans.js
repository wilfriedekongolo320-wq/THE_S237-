"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const uuid_1 = require("uuid");
const db_1 = require("../db");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// GET /api/plans
router.get('/', auth_1.requireAuth, (_req, res) => {
    const db = (0, db_1.getDb)();
    const plans = db.prepare('SELECT * FROM plans ORDER BY created_at DESC').all();
    const parsed = plans.map(p => {
        try {
            p['protocols'] = JSON.parse(p['protocols']);
        }
        catch { }
        return p;
    });
    res.json(parsed);
});
// POST /api/plans (super_admin only)
router.post('/', auth_1.requireSuperAdmin, (req, res) => {
    const { name, description, duration_days, price, protocols, max_connections, bandwidth_gb } = req.body;
    if (!name || !duration_days) {
        res.status(400).json({ error: 'name and duration_days required' });
        return;
    }
    const db = (0, db_1.getDb)();
    const exists = db.prepare('SELECT id FROM plans WHERE name = ?').get(name);
    if (exists) {
        res.status(409).json({ error: 'Plan name already exists' });
        return;
    }
    const id = (0, uuid_1.v4)();
    db.prepare(`INSERT INTO plans (id, name, description, duration_days, price, protocols, max_connections, bandwidth_gb)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`).run(id, name, description || '', duration_days, price || 0, JSON.stringify(protocols || ['ssh']), max_connections || 1, bandwidth_gb ?? null);
    (0, db_1.logAction)(req.admin.id, req.admin.username, 'CREATE_PLAN', 'plan', id, { name }, req.ip || null);
    res.status(201).json({ id, name, duration_days, price });
});
// PUT /api/plans/:id (super_admin only)
router.put('/:id', auth_1.requireSuperAdmin, (req, res) => {
    const db = (0, db_1.getDb)();
    const plan = db.prepare('SELECT id FROM plans WHERE id = ?').get(req.params.id);
    if (!plan) {
        res.status(404).json({ error: 'Plan not found' });
        return;
    }
    const { name, description, duration_days, price, protocols, max_connections, bandwidth_gb, status } = req.body;
    const updates = [];
    const params = [];
    if (name !== undefined) {
        updates.push('name = ?');
        params.push(name);
    }
    if (description !== undefined) {
        updates.push('description = ?');
        params.push(description);
    }
    if (duration_days !== undefined) {
        updates.push('duration_days = ?');
        params.push(duration_days);
    }
    if (price !== undefined) {
        updates.push('price = ?');
        params.push(price);
    }
    if (protocols !== undefined) {
        updates.push('protocols = ?');
        params.push(JSON.stringify(protocols));
    }
    if (max_connections !== undefined) {
        updates.push('max_connections = ?');
        params.push(max_connections);
    }
    if (bandwidth_gb !== undefined) {
        updates.push('bandwidth_gb = ?');
        params.push(bandwidth_gb);
    }
    if (status !== undefined) {
        updates.push('status = ?');
        params.push(status);
    }
    if (updates.length === 0) {
        res.status(400).json({ error: 'No fields to update' });
        return;
    }
    updates.push("updated_at = datetime('now')");
    params.push(req.params.id);
    db.prepare(`UPDATE plans SET ${updates.join(', ')} WHERE id = ?`).run(...params);
    (0, db_1.logAction)(req.admin.id, req.admin.username, 'UPDATE_PLAN', 'plan', req.params.id, {}, req.ip || null);
    res.json({ message: 'Plan updated' });
});
// DELETE /api/plans/:id (super_admin only)
router.delete('/:id', auth_1.requireSuperAdmin, (req, res) => {
    const db = (0, db_1.getDb)();
    const plan = db.prepare('SELECT id FROM plans WHERE id = ?').get(req.params.id);
    if (!plan) {
        res.status(404).json({ error: 'Plan not found' });
        return;
    }
    db.prepare('DELETE FROM plans WHERE id = ?').run(req.params.id);
    (0, db_1.logAction)(req.admin.id, req.admin.username, 'DELETE_PLAN', 'plan', req.params.id, {}, req.ip || null);
    res.json({ message: 'Plan deleted' });
});
exports.default = router;
//# sourceMappingURL=plans.js.map