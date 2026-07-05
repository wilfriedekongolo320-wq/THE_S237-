/**
 * Export routes — CSV/JSON pour clients et audit logs
 * BUG FIX: Les colonnes data_limit, data_used, admin_role, ip, status
 * n'existent pas dans le schéma de db.ts — supprimées des requêtes.
 * Les colonnes correctes de audit_logs sont : admin_username, ip_address, action, target_type, target_id, details, created_at
 */
import { Router, Request, Response } from 'express';
import { getDb } from '../db';
import { requireAuth } from '../middleware/auth';

const router = Router();

function toCSV(rows: Record<string, any>[], columns: string[]): string {
  const escape = (v: any) => {
    if (v == null) return '';
    const s = String(v).replace(/"/g, '""');
    return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s}"` : s;
  };
  const header = columns.join(',');
  const body = rows.map(r => columns.map(c => escape(r[c])).join(',')).join('\n');
  return header + '\n' + body;
}

// Export clients as CSV
router.get('/clients/csv', requireAuth, (req: Request, res: Response) => {
  const db = getDb();
  const admin = (req as any).admin;

  // BUG FIX: Only query columns that exist in the clients table schema
  let clients: any[];
  if (admin.role === 'admin' || admin.role === 'super_admin') {
    clients = db.prepare(
      'SELECT username, protocol, status, expires_at, created_by, created_at FROM clients ORDER BY created_at DESC'
    ).all();
  } else {
    clients = db.prepare(
      'SELECT username, protocol, status, expires_at, created_by, created_at FROM clients WHERE created_by = ? ORDER BY created_at DESC'
    ).all(admin.id);
  }

  const columns = ['username', 'protocol', 'status', 'expires_at', 'created_by', 'created_at'];
  const csv = toCSV(clients as Record<string, any>[], columns);

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="katashie-clients-${new Date().toISOString().slice(0, 10)}.csv"`);
  res.send('\uFEFF' + csv);
});

// Export audit logs as CSV (admin only)
// BUG FIX: Previous version queried admin_role, ip, status — those columns don't exist.
// Correct columns: admin_username, action, target_type, target_id, ip_address, created_at
router.get('/audit/csv', requireAuth, (req: Request, res: Response) => {
  const db = getDb();
  const admin = (req as any).admin;
  if (admin.role !== 'admin' && admin.role !== 'super_admin') {
    return res.status(403).json({ error: 'Forbidden' });
  }

  const logs = db.prepare(
    'SELECT admin_username, action, target_type, target_id, ip_address, created_at FROM audit_logs ORDER BY created_at DESC LIMIT 5000'
  ).all();
  const columns = ['admin_username', 'action', 'target_type', 'target_id', 'ip_address', 'created_at'];
  const csv = toCSV(logs as Record<string, any>[], columns);

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="katashie-audit-${new Date().toISOString().slice(0, 10)}.csv"`);
  res.send('\uFEFF' + csv);
});

// Stats summary JSON
router.get('/stats/json', requireAuth, (req: Request, res: Response) => {
  const db = getDb();
  const admin = (req as any).admin;

  const isAdmin = admin.role === 'admin' || admin.role === 'super_admin';

  const total   = (db.prepare(`SELECT COUNT(*) as n FROM clients${isAdmin ? '' : ' WHERE created_by = ?'}`).get(...(isAdmin ? [] : [admin.id])) as any)?.n ?? 0;
  const active  = (db.prepare(`SELECT COUNT(*) as n FROM clients WHERE status = 'active'${isAdmin ? '' : ' AND created_by = ?'}`).get(...(isAdmin ? [] : [admin.id])) as any)?.n ?? 0;
  const expired = (db.prepare(`SELECT COUNT(*) as n FROM clients WHERE status != 'active'${isAdmin ? '' : ' AND created_by = ?'}`).get(...(isAdmin ? [] : [admin.id])) as any)?.n ?? 0;
  const byProtocol = db.prepare(
    `SELECT protocol, COUNT(*) as n FROM clients${isAdmin ? '' : ' WHERE created_by = ?'} GROUP BY protocol`
  ).all(...(isAdmin ? [] : [admin.id]));

  res.json({
    total,
    active,
    expired,
    by_protocol: byProtocol,
    generated_at: new Date().toISOString(),
  });
});

export default router;
