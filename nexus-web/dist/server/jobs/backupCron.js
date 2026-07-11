"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.runBackup = runBackup;
exports.scheduleDailyBackup = scheduleDailyBackup;
/**
 * Backup automatique SQLite → S3 / Backblaze B2
 * BUG FIX: ancienne version pointait sur '/etc/katashie-tunnel-web/data.db'
 * qui ne correspondait ni au volume Docker ni au chemin db.ts.
 * Standardisé avec KATASHIE_DB_DIR pour cohérence totale.
 */
const child_process_1 = require("child_process");
const util_1 = require("util");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const execAsync = (0, util_1.promisify)(child_process_1.exec);
const DB_DIR = process.env.KATASHIE_DB_DIR || process.env.NEXUS_DB_DIR || '/etc/katashie-web';
const DB_PATH = path_1.default.join(DB_DIR, 'katashie.db');
const BACKUP_DIR = process.env.KATASHIE_BACKUP_DIR || '/tmp/katashie_backups';
const S3_BUCKET = process.env.BACKUP_S3_BUCKET || '';
const S3_ENDPOINT = process.env.BACKUP_S3_ENDPOINT || '';
const S3_ACCESS_KEY = process.env.BACKUP_S3_ACCESS_KEY || '';
const S3_SECRET_KEY = process.env.BACKUP_S3_SECRET_KEY || '';
const S3_REGION = process.env.BACKUP_S3_REGION || 'us-east-1';
async function runBackup() {
    try {
        if (!fs_1.default.existsSync(DB_PATH)) {
            return { success: false, error: `DB not found at expected path: ${DB_PATH}` };
        }
        fs_1.default.mkdirSync(BACKUP_DIR, { recursive: true });
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const backupFile = path_1.default.join(BACKUP_DIR, `katashie-backup-${timestamp}.db`);
        // SQLite online backup (safe for WAL mode)
        await execAsync(`sqlite3 "${DB_PATH}" ".backup '${backupFile}'"`);
        // Compress
        const gzFile = backupFile + '.gz';
        await execAsync(`gzip -9 "${backupFile}"`);
        // Upload to S3/Backblaze if configured
        if (S3_BUCKET && S3_ACCESS_KEY) {
            const s3Key = `backups/${path_1.default.basename(gzFile)}`;
            const endpoint = S3_ENDPOINT ? `--endpoint-url "${S3_ENDPOINT}"` : '';
            process.env.AWS_ACCESS_KEY_ID = S3_ACCESS_KEY;
            process.env.AWS_SECRET_ACCESS_KEY = S3_SECRET_KEY;
            await execAsync(`aws s3 cp "${gzFile}" "s3://${S3_BUCKET}/${s3Key}" --region ${S3_REGION} ${endpoint}`);
            fs_1.default.unlinkSync(gzFile);
        }
        // Keep only last 7 local backups
        const files = fs_1.default.readdirSync(BACKUP_DIR)
            .filter(f => f.startsWith('katashie-backup-') && f.endsWith('.gz'))
            .map(f => ({ name: f, mtime: fs_1.default.statSync(path_1.default.join(BACKUP_DIR, f)).mtime }))
            .sort((a, b) => b.mtime.getTime() - a.mtime.getTime());
        for (const old of files.slice(7)) {
            fs_1.default.unlinkSync(path_1.default.join(BACKUP_DIR, old.name));
        }
        const result = S3_BUCKET && S3_ACCESS_KEY
            ? `s3://${S3_BUCKET}/backups/${path_1.default.basename(gzFile)}`
            : gzFile;
        console.log(`[BACKUP] Completed: ${result}`);
        return { success: true, file: result };
    }
    catch (err) {
        console.error('[BACKUP] Failed:', err.message);
        return { success: false, error: err.message };
    }
}
function scheduleDailyBackup() {
    function msUntil2AM() {
        const now = new Date();
        const next2AM = new Date(now);
        next2AM.setHours(2, 0, 0, 0);
        if (next2AM <= now)
            next2AM.setDate(next2AM.getDate() + 1);
        return next2AM.getTime() - now.getTime();
    }
    setTimeout(() => {
        runBackup().catch(console.error);
        setInterval(() => runBackup().catch(console.error), 24 * 60 * 60 * 1000);
    }, msUntil2AM());
    console.log(`[BACKUP] Scheduled daily at 02:00 (next in ${Math.round(msUntil2AM() / 60000)} min)`);
}
//# sourceMappingURL=backupCron.js.map