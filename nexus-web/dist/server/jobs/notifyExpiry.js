"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.initNotifier = initNotifier;
exports.runExpiryNotifier = runExpiryNotifier;
exports.runCpuAlert = runCpuAlert;
/**
 * Job: Notification Telegram 24h avant expiry
 * Envoyer alertes CPU > 80%
 */
const db_1 = require("../db");
const https_1 = __importDefault(require("https"));
let BOT_TOKEN = '';
let ADMIN_CHAT_ID = '';
let lastCpuAlert = 0;
function initNotifier(token, chatId) {
    BOT_TOKEN = token;
    ADMIN_CHAT_ID = chatId;
}
async function sendTelegram(chatId, message) {
    if (!BOT_TOKEN)
        return;
    const body = JSON.stringify({ chat_id: chatId, text: message, parse_mode: 'HTML' });
    return new Promise((resolve) => {
        const req = https_1.default.request({
            hostname: 'api.telegram.org',
            path: `/bot${BOT_TOKEN}/sendMessage`,
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) }
        }, (res) => { res.resume(); resolve(); });
        req.on('error', () => resolve());
        req.write(body);
        req.end();
    });
}
async function runExpiryNotifier() {
    if (!BOT_TOKEN || !ADMIN_CHAT_ID)
        return;
    try {
        const db = (0, db_1.getDb)();
        // Clients expiring in exactly 24h (±15 min)
        const expiringSoon = db.prepare(`
      SELECT username, protocol, expires_at FROM clients
      WHERE status = 'active'
        AND expires_at BETWEEN date('now', '+23 hours') AND date('now', '+25 hours')
    `).all();
        for (const client of expiringSoon) {
            const msg = `⚠️ <b>KATASHIE VPN — Expiry Alert</b>\n\nCompte <code>${client.username}</code> (${client.protocol.toUpperCase()}) expire le <b>${client.expires_at}</b>.\n\nRenouvelez via le panneau ou le bot.`;
            await sendTelegram(ADMIN_CHAT_ID, msg);
        }
        // Resellers expiring in 24h
        const resellersSoon = db.prepare(`
      SELECT username, expiry_date FROM admins
      WHERE role = 'reseller' AND status = 'active'
        AND expiry_date BETWEEN date('now', '+23 hours') AND date('now', '+25 hours')
    `).all();
        for (const reseller of resellersSoon) {
            const msg = `🔔 <b>KATASHIE VPN — Revendeur</b>\n\nLe revendeur <code>${reseller.username}</code> expire le <b>${reseller.expiry_date}</b>.`;
            await sendTelegram(ADMIN_CHAT_ID, msg);
        }
    }
    catch (err) {
        console.error('[NOTIFY] Expiry notifier error:', err);
    }
}
async function runCpuAlert(cpuPercent) {
    if (!BOT_TOKEN || !ADMIN_CHAT_ID)
        return;
    const now = Date.now();
    if (cpuPercent < 80 || now - lastCpuAlert < 15 * 60 * 1000)
        return; // Max 1 alerte/15min
    lastCpuAlert = now;
    const msg = `🚨 <b>KATASHIE VPN — Alerte CPU</b>\n\nCPU à <b>${cpuPercent.toFixed(1)}%</b> — vérifiez le serveur !`;
    await sendTelegram(ADMIN_CHAT_ID, msg);
}
//# sourceMappingURL=notifyExpiry.js.map