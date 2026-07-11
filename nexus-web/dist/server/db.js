"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDb = getDb;
exports.seedSuperAdmin = seedSuperAdmin;
exports.logAction = logAction;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const uuid_1 = require("uuid");
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
// Node 22 exposes the SQLite module as a built-in experimental API.
// Use a type-only import to avoid compile-time resolution issues on older toolchains.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { DatabaseSync } = require('node:sqlite');
// ─── BUG FIX: standardized to KATASHIE_DB_DIR (was NEXUS_DB_DIR → /etc/nexus-tunnel-web)
// docker-compose.yml now mounts the volume to /etc/katashie-web to match this default.
const DB_DIR = process.env.KATASHIE_DB_DIR || process.env.NEXUS_DB_DIR || '/etc/katashie-web';
const DB_PATH = path_1.default.join(DB_DIR, 'katashie.db');
class SqliteCompatDatabase {
    constructor(filePath) {
        this.connection = new DatabaseSync(filePath);
    }
    prepare(query) {
        return this.connection.prepare(query);
    }
    exec(query) {
        this.connection.exec(query);
    }
    pragma(command) {
        const normalized = command.trim().toLowerCase();
        const mapped = {
            'journal_mode = wal': 'PRAGMA journal_mode=WAL',
            'foreign_keys = on': 'PRAGMA foreign_keys=ON',
            'busy_timeout = 10000': 'PRAGMA busy_timeout=10000',
            'synchronous = normal': 'PRAGMA synchronous=NORMAL',
            'temp_store = memory': 'PRAGMA temp_store=MEMORY'
        };
        this.connection.exec(mapped[normalized] ?? `PRAGMA ${command}`);
    }
    close() {
        this.connection.close();
    }
}
let db;
function getDb() {
    if (!db) {
        fs_1.default.mkdirSync(DB_DIR, { recursive: true });
        db = new SqliteCompatDatabase(DB_PATH);
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
function initSchema() {
    const database = getDb();
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
    const adminCols = database.prepare('PRAGMA table_info(admins)').all().map(c => c.name);
    if (!adminCols.includes('bouquet'))
        database.exec("ALTER TABLE admins ADD COLUMN bouquet TEXT DEFAULT '[]'");
    if (!adminCols.includes('expiry_date'))
        database.exec('ALTER TABLE admins ADD COLUMN expiry_date TEXT');
    if (!adminCols.includes('credits'))
        database.exec('ALTER TABLE admins ADD COLUMN credits INTEGER DEFAULT 0');
    if (!adminCols.includes('max_credits'))
        database.exec('ALTER TABLE admins ADD COLUMN max_credits INTEGER DEFAULT 0');
    if (!adminCols.includes('suspended_at'))
        database.exec('ALTER TABLE admins ADD COLUMN suspended_at TEXT');
    database.exec('CREATE INDEX IF NOT EXISTS idx_admins_role_status_suspended ON admins(role, status, suspended_at)');
}
function seedSuperAdmin(username, password) {
    const database = getDb();
    const existing = database.prepare('SELECT id, username, role, status FROM admins WHERE username = ?').get(username);
    const hash = bcryptjs_1.default.hashSync(password, 12);
    if (!existing) {
        database.prepare('INSERT INTO admins (id, username, password_hash, role, status) VALUES (?, ?, ?, ?, ?)').run((0, uuid_1.v4)(), username, hash, 'super_admin', 'active');
        console.log(`[DB] Super admin '${username}' created.`);
        return;
    }
    database.prepare('UPDATE admins SET password_hash = ?, role = ?, status = ?, updated_at = datetime(\'now\') WHERE id = ?').run(hash, 'super_admin', 'active', existing.id);
    console.log(`[DB] Super admin '${username}' updated.`);
}
function logAction(adminId, adminUsername, action, targetType, targetId, details, ip) {
    const database = getDb();
    database.prepare(`INSERT INTO audit_logs (id, admin_id, admin_username, action, target_type, target_id, details, ip_address)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`).run((0, uuid_1.v4)(), adminId, adminUsername, action, targetType, targetId, JSON.stringify(details), ip);
}
//# sourceMappingURL=db.js.map