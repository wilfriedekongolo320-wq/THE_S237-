"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Campay Mobile Money Integration
 * Orange Money & MTN MoMo — Cameroun
 * Docs: https://www.campay.net/en/documentation/
 */
const express_1 = require("express");
const db_1 = require("../db");
const auth_1 = require("../middleware/auth");
const uuid_1 = require("uuid");
const crypto_1 = __importDefault(require("crypto"));
const router = (0, express_1.Router)();
const CAMPAY_BASE = 'https://www.campay.net/api';
const CAMPAY_APP_USERNAME = process.env.CAMPAY_APP_USERNAME || '';
const CAMPAY_APP_PASSWORD = process.env.CAMPAY_APP_PASSWORD || '';
function ensurePaymentTables() {
    const db = (0, db_1.getDb)();
    db.prepare(`
    CREATE TABLE IF NOT EXISTS payments (
      id TEXT PRIMARY KEY,
      reference TEXT UNIQUE,
      plan_id TEXT,
      phone TEXT NOT NULL,
      amount REAL NOT NULL,
      currency TEXT NOT NULL DEFAULT 'XAF',
      operator TEXT,
      status TEXT NOT NULL DEFAULT 'pending',
      campay_ref TEXT,
      client_id TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `).run();
}
async function campayToken() {
    const resp = await fetch(`${CAMPAY_BASE}/token/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: CAMPAY_APP_USERNAME, password: CAMPAY_APP_PASSWORD })
    });
    const data = await resp.json();
    if (!data.token)
        throw new Error('Campay auth failed: ' + JSON.stringify(data));
    return data.token;
}
// Initiate a Mobile Money payment
router.post('/initiate', async (req, res) => {
    ensurePaymentTables();
    const { phone, amount, plan_id, description } = req.body;
    if (!phone || !amount || !plan_id) {
        return res.status(400).json({ error: 'phone, amount, and plan_id are required' });
    }
    const db = (0, db_1.getDb)();
    const plan = db.prepare('SELECT * FROM plans WHERE id = ?').get(plan_id);
    if (!plan)
        return res.status(404).json({ error: 'Plan not found' });
    try {
        const token = await campayToken();
        const reference = (0, uuid_1.v4)();
        const externalRef = `KATASHIE-${reference.slice(0, 8).toUpperCase()}`;
        const campayResp = await fetch(`${CAMPAY_BASE}/collect/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Token ${token}` },
            body: JSON.stringify({
                amount: String(amount),
                currency: 'XAF',
                from: phone,
                description: description || `KATASHIE VPN — ${plan.name}`,
                external_reference: externalRef,
                redirect_url: process.env.CAMPAY_REDIRECT_URL || ''
            })
        });
        const campayData = await campayResp.json();
        const paymentId = (0, uuid_1.v4)();
        db.prepare(`
      INSERT INTO payments (id, reference, plan_id, phone, amount, currency, status, campay_ref, created_at)
      VALUES (?, ?, ?, ?, ?, 'XAF', 'pending', ?, datetime('now'))
    `).run(paymentId, externalRef, plan_id, phone, amount, campayData.reference || null);
        res.json({
            payment_id: paymentId,
            reference: externalRef,
            campay_reference: campayData.reference,
            ussd_code: campayData.ussd_code,
            operator: campayData.operator,
            status: 'pending'
        });
    }
    catch (err) {
        res.status(500).json({ error: err.message || 'Payment initiation failed' });
    }
});
// Check payment status
router.get('/status/:reference', async (req, res) => {
    ensurePaymentTables();
    const db = (0, db_1.getDb)();
    const payment = db.prepare('SELECT * FROM payments WHERE reference = ? OR campay_ref = ?')
        .get(req.params.reference, req.params.reference);
    if (!payment)
        return res.status(404).json({ error: 'Payment not found' });
    if (payment.status === 'successful' || payment.status === 'failed') {
        return res.json({ status: payment.status, client_id: payment.client_id });
    }
    try {
        const token = await campayToken();
        const campayResp = await fetch(`${CAMPAY_BASE}/transaction/${payment.campay_ref}/`, {
            headers: { Authorization: `Token ${token}` }
        });
        const data = await campayResp.json();
        if (data.status === 'SUCCESSFUL') {
            db.prepare("UPDATE payments SET status = 'successful', updated_at = datetime('now') WHERE id = ?").run(payment.id);
            await autoCreateAccount(db, payment);
            return res.json({ status: 'successful', client_id: payment.client_id });
        }
        else if (data.status === 'FAILED') {
            db.prepare("UPDATE payments SET status = 'failed', updated_at = datetime('now') WHERE id = ?").run(payment.id);
        }
        res.json({ status: data.status?.toLowerCase() || 'pending' });
    }
    catch (err) {
        res.json({ status: payment.status });
    }
});
// Campay webhook
router.post('/webhook', (req, res) => {
    ensurePaymentTables();
    const db = (0, db_1.getDb)();
    const { reference, status } = req.body;
    if (!reference)
        return res.sendStatus(400);
    const payment = db.prepare('SELECT * FROM payments WHERE campay_ref = ?').get(reference);
    if (!payment)
        return res.sendStatus(404);
    if (status === 'SUCCESSFUL' && payment.status !== 'successful') {
        db.prepare("UPDATE payments SET status = 'successful', updated_at = datetime('now') WHERE campay_ref = ?").run(reference);
        autoCreateAccount(db, payment).catch(console.error);
    }
    else if (status === 'FAILED') {
        db.prepare("UPDATE payments SET status = 'failed', updated_at = datetime('now') WHERE campay_ref = ?").run(reference);
    }
    res.sendStatus(200);
});
// BUG FIX: Previous version only allowed role === 'admin', blocking super_admin.
// List payments — both 'admin' and 'super_admin' are allowed.
router.get('/', auth_1.requireAuth, (req, res) => {
    ensurePaymentTables();
    const db = (0, db_1.getDb)();
    const admin = req.admin;
    if (admin.role !== 'admin' && admin.role !== 'super_admin') {
        return res.status(403).json({ error: 'Forbidden' });
    }
    const payments = db.prepare('SELECT id, reference, plan_id, phone, amount, currency, status, client_id, created_at FROM payments ORDER BY created_at DESC LIMIT 500').all();
    res.json(payments);
});
// BUG FIX: Previous version inserted into non-existent columns (data_limit, protocol singular)
// and omitted the required NOT NULL column 'password'.
// Fixed to match the exact clients table schema from db.ts:
//   id, username, password (NOT NULL), protocol (NOT NULL), plan_id, expires_at,
//   status, created_by, extra_data, created_at
async function autoCreateAccount(db, payment) {
    const plan = db.prepare('SELECT * FROM plans WHERE id = ?').get(payment.plan_id);
    if (!plan)
        return;
    // Pick the first protocol from the plan's protocols JSON array
    let protocol = 'ssh';
    try {
        const protocols = JSON.parse(plan.protocols || '["ssh"]');
        if (protocols.length > 0)
            protocol = protocols[0];
    }
    catch { }
    const username = `vpn_${payment.phone.replace(/[^0-9]/g, '').slice(-8)}_${Date.now().toString(36)}`;
    const password = crypto_1.default.randomBytes(6).toString('hex'); // 12-char random password
    const clientId = (0, uuid_1.v4)();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + (plan.duration_days || 30));
    db.prepare(`
    INSERT INTO clients (id, username, password, protocol, plan_id, status, expires_at, created_by, extra_data, created_at)
    VALUES (?, ?, ?, ?, ?, 'active', ?, 'payment', '{}', datetime('now'))
  `).run(clientId, username, password, protocol, payment.plan_id, expiresAt.toISOString().slice(0, 10));
    db.prepare("UPDATE payments SET client_id = ?, updated_at = datetime('now') WHERE id = ?").run(clientId, payment.id);
}
exports.default = router;
//# sourceMappingURL=payment.js.map