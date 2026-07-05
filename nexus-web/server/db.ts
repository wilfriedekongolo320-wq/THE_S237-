import Database from 'better-sqlite3';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import fs from 'fs';

// ─── BUG FIX: standardized to KATASHIE_DB_DIR (was NEXUS_DB_DIR → /etc/nexus-tunnel-web)
// docker-compose.yml now mounts the volume to /etc/katashie-web to match this default.
const DB_DIR  = process.env.KATASHIE_DB_DIR || process.env.NEXUS_DB_DIR || '/etc/katashie-web';
const DB_PATH = path.join(DB_DIR, 'katashie.db');

let db: Database.Database;

export function getDb(): Database.Database {
  if (!db) {
    fs.mkdirSync(DB_DIR, { recursive: true });
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    // Allow up to 10 s of retries when another writer holds the lock
    db.pragma('busy_timeout = 10000');
    db.pragma('synchronous = NORMAL');
    db.pragma('temp_store = MEMORY');
    initSchema();
  }
  return db;
}

function initSchema(): void {
  const database = db;

  database.exec(`
    CREATE TABLE IF NOT EXISTS admins (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'admin',
      status TEXT NOT NULL DEFAULT 'active',
      bouquet TEXT DEFAULT '[]',
      expiry_date TEXT,
      credits INTEGER DEFAULT 0,
      max_credits INTEGER DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS clients (
      id TEXT PRIMARY KEY,
      username TEXT NOT NULL,
      password TEXT NOT NULL,
      protocol TEXT NOT NULL,
      plan_id TEXT,
      expires_at TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'active',
      created_by TEXT,
      extra_data TEXT DEFAULT '{}',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(username, protocol)
    );

    CREATE TABLE IF NOT EXISTS plans (
      id TEXT PRIMARY KEY,
      name TEXT UNIQUE NOT NULL,
      description TEXT DEFAULT '',
      duration_days INTEGER NOT NULL DEFAULT 30,
      price REAL NOT NULL DEFAULT 0,
      protocols TEXT NOT NULL DEFAULT '["ssh"]',
      max_connections INTEGER NOT NULL DEFAULT 1,
      bandwidth_gb REAL DEFAULT NULL,
      status TEXT NOT NULL DEFAULT 'active',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS audit_logs (
      id TEXT PRIMARY KEY,
      admin_id TEXT,
      admin_username TEXT,
      action TEXT NOT NULL,
      target_type TEXT,
      target_id TEXT,
      details TEXT DEFAULT '{}',
      ip_address TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      admin_id TEXT NOT NULL,
      token TEXT UNIQUE NOT NULL,
      expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS servers (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      host TEXT NOT NULL,
      port INTEGER DEFAULT 22,
      ssh_user TEXT DEFAULT 'root',
      ssh_password TEXT,
      ssh_key TEXT,
      location TEXT,
      status TEXT DEFAULT 'unknown',
      cpu_usage REAL DEFAULT 0,
      memory_usage REAL DEFAULT 0,
      active_users INTEGER DEFAULT 0,
      last_check TEXT,
      created_by TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS payments (
      id TEXT PRIMARY KEY,
      reference TEXT UNIQUE NOT NULL,
      plan_id TEXT,
      phone TEXT NOT NULL,
      amount REAL NOT NULL,
      currency TEXT DEFAULT 'XAF',
      status TEXT DEFAULT 'pending',
      client_id TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_clients_created_by ON clients(created_by);
    CREATE INDEX IF NOT EXISTS idx_admins_role_status ON admins(role, status);
    CREATE INDEX IF NOT EXISTS idx_admins_role_status_expiry ON admins(role, status, expiry_date);
  `);

  // Migrations: add columns if they don't exist
  interface ColInfo { name: string }

  const adminCols = (database.prepare('PRAGMA table_info(admins)').all() as ColInfo[]).map(c => c.name);
  if (!adminCols.includes('bouquet'))       database.exec("ALTER TABLE admins ADD COLUMN bouquet TEXT DEFAULT '[]'");
  if (!adminCols.includes('expiry_date'))   database.exec('ALTER TABLE admins ADD COLUMN expiry_date TEXT');
  if (!adminCols.includes('credits'))       database.exec('ALTER TABLE admins ADD COLUMN credits INTEGER DEFAULT 0');
  if (!adminCols.includes('max_credits'))   database.exec('ALTER TABLE admins ADD COLUMN max_credits INTEGER DEFAULT 0');
  if (!adminCols.includes('suspended_at')) database.exec('ALTER TABLE admins ADD COLUMN suspended_at TEXT');

  database.exec('CREATE INDEX IF NOT EXISTS idx_admins_role_status_suspended ON admins(role, status, suspended_at)');
}

export function seedSuperAdmin(username: string, password: string): void {
  const database = getDb();
  const existing = database.prepare('SELECT id FROM admins WHERE role = ?').get('super_admin');
  if (!existing) {
    const hash = bcrypt.hashSync(password, 12);
    database.prepare(
      'INSERT INTO admins (id, username, password_hash, role, status) VALUES (?, ?, ?, ?, ?)'
    ).run(uuidv4(), username, hash, 'super_admin', 'active');
    console.log(`[DB] Super admin '${username}' created.`);
  }
}

export function logAction(
  adminId: string | null,
  adminUsername: string | null,
  action: string,
  targetType: string | null,
  targetId: string | null,
  details: Record<string, unknown>,
  ip: string | null
): void {
  const database = getDb();
  database.prepare(
    `INSERT INTO audit_logs (id, admin_id, admin_username, action, target_type, target_id, details, ip_address)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    uuidv4(),
    adminId,
    adminUsername,
    action,
    targetType,
    targetId,
    JSON.stringify(details),
    ip
  );
}
