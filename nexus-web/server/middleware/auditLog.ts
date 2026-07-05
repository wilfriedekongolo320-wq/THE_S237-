import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../db';

// BUG FIX: The previous INSERT used columns (admin_role, target, ip, status) which do NOT
// exist in the audit_logs table created by db.ts initSchema().
// db.ts creates: id, admin_id, admin_username, action, target_type, target_id, details,
// ip_address, created_at.
// This middleware now matches that schema exactly.

export function auditLog(action: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    const originalJson = res.json.bind(res);
    res.json = (body: unknown) => {
      try {
        const db = getDb();
        const admin = (req as any).admin;
        const statusCode = res.statusCode;
        const success = statusCode >= 200 && statusCode < 300;
        db.prepare(`
          INSERT INTO audit_logs (id, admin_id, admin_username, action, target_type, target_id, details, ip_address, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
        `).run(
          uuidv4(),
          admin?.id || null,
          admin?.username || 'anonymous',
          action,
          req.method,
          req.params?.id || req.path,
          JSON.stringify({
            path: req.path,
            params: req.params,
            body: sanitizeBody(req.body),
            status: success ? 'success' : 'failure',
            statusCode
          }),
          req.ip || req.socket?.remoteAddress || null
        );
      } catch (_) {}
      return originalJson(body);
    };
    next();
  };
}

function sanitizeBody(body: any): any {
  if (!body || typeof body !== 'object') return body;
  const safe = { ...body };
  for (const key of ['password', 'token', 'secret', 'jwt', 'password_hash']) {
    if (key in safe) safe[key] = '***';
  }
  return safe;
}

// BUG FIX: The old ensureAuditTable() created a conflicting table schema with different
// column names than db.ts's initSchema(). Since db.ts runs first, the IF NOT EXISTS
// made this a silent no-op, leaving the INSERT pointing to non-existent columns.
// The audit_logs table is now managed solely by db.ts initSchema() — no duplicate
// CREATE TABLE here.
export function ensureAuditTable(): void {
  // Table is created by db.ts initSchema() on first getDb() call.
  // This function is kept for API compatibility but no longer recreates the table.
  getDb(); // Ensure initSchema has run
}
