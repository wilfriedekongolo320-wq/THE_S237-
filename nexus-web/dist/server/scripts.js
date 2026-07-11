"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createSshAccount = createSshAccount;
exports.renewSshAccount = renewSshAccount;
exports.deleteSshAccount = deleteSshAccount;
exports.setSshAccountExpiry = setSshAccountExpiry;
exports.suspendSshAccount = suspendSshAccount;
exports.createXrayVmessAccount = createXrayVmessAccount;
exports.createXrayVlessAccount = createXrayVlessAccount;
exports.createXrayTrojanAccount = createXrayTrojanAccount;
exports.createXraySocksAccount = createXraySocksAccount;
exports.createZipVpnAccount = createZipVpnAccount;
exports.createSlowDnsAccount = createSlowDnsAccount;
exports.createUdpCustomAccount = createUdpCustomAccount;
const child_process_1 = require("child_process");
const crypto_1 = __importDefault(require("crypto"));
const fs_1 = __importDefault(require("fs"));
const XRAY_CONFIG = process.env.XRAY_CONFIG || '/etc/xray/config.json';
// ─── Input validation ─────────────────────────────────────────────────────────
/** Only allow safe alphanumeric + hyphen + underscore usernames (no shell metacharacters) */
const SAFE_USERNAME_RE = /^[a-zA-Z0-9_-]{1,32}$/;
function validateUsername(username) {
    if (!SAFE_USERNAME_RE.test(username)) {
        throw new Error(`Invalid username '${username}': only letters, digits, hyphens and underscores allowed (max 32 chars)`);
    }
}
function validateDays(days) {
    if (!Number.isInteger(days) || days < 1 || days > 3650) {
        throw new Error('days must be an integer between 1 and 3650');
    }
}
// Cache IP to avoid repeated network calls
let _cachedIp = '';
function getServerIp() {
    if (_cachedIp)
        return _cachedIp;
    // Use spawnSync with safe argument list — no shell interpolation
    const result = (0, child_process_1.spawnSync)('curl', ['-s4', '--max-time', '5', 'https://ipv4.icanhazip.com'], {
        encoding: 'utf8',
        timeout: 6000
    });
    _cachedIp = result.stdout?.trim() || 'unknown';
    return _cachedIp;
}
function getDomain() {
    try {
        if (fs_1.default.existsSync('/etc/xray/domain')) {
            return fs_1.default.readFileSync('/etc/xray/domain', 'utf8').trim();
        }
        if (fs_1.default.existsSync('/root/domain')) {
            return fs_1.default.readFileSync('/root/domain', 'utf8').trim();
        }
    }
    catch { }
    return getServerIp();
}
function getSlowDnsPub() {
    try {
        if (fs_1.default.existsSync('/etc/slowdns/server.pub')) {
            return fs_1.default.readFileSync('/etc/slowdns/server.pub', 'utf8').trim();
        }
    }
    catch { }
    return 'N/A';
}
function getSlowDnsNsDomain() {
    try {
        if (fs_1.default.existsSync('/etc/slowdns/nsdomain')) {
            return fs_1.default.readFileSync('/etc/slowdns/nsdomain', 'utf8').trim();
        }
    }
    catch { }
    return 'N/A';
}
function createSshAccount(username, password, days) {
    try {
        validateUsername(username);
        validateDays(days);
        // Check if user exists (safe: username is validated above)
        const check = (0, child_process_1.spawnSync)('id', [username], { encoding: 'utf8' });
        if (check.status === 0) {
            return { success: false, error: `User '${username}' already exists` };
        }
        // Create the user — use spawnSync for all external commands to avoid shell injection
        const expiryResult = (0, child_process_1.spawnSync)('date', ['-d', `${days} days`, '+%Y-%m-%d'], { encoding: 'utf8' });
        const expiry = expiryResult.stdout.trim();
        (0, child_process_1.spawnSync)('useradd', ['-e', expiry, '-s', '/bin/false', '-M', username], { encoding: 'utf8' });
        // Use chpasswd via stdin to avoid embedding credentials in command line
        (0, child_process_1.spawnSync)('chpasswd', [], { input: `${username}:${password}`, encoding: 'utf8' });
        const domain = getDomain();
        const myip = getServerIp();
        const pub = getSlowDnsPub();
        const dns = getSlowDnsNsDomain();
        const chageResult = (0, child_process_1.spawnSync)('chage', ['-l', username], { encoding: 'utf8' });
        const actualExpiry = chageResult.stdout
            .split('\n')
            .find(l => l.includes('Account expires'))
            ?.split(':')[1]?.trim() || expiry;
        return {
            success: true,
            data: {
                username,
                password,
                expiry: actualExpiry,
                host: myip,
                domain,
                ns_domain: dns,
                pub_key: pub,
                openssh_port: 22,
                dropbear_ports: '109, 143',
                stunnel_ports: '447, 777',
                ws_ntls_ports: '80, 8880',
                ws_tls_port: 443,
                udpgw_ports: '7100-7900',
                squid_ports: '3128, 8880',
                openvpn_ports: 'TCP 1194, SSL 2200, OHP 8000',
                slowdns_ports: '22,53,5300,80,443',
                udp_custom_link: `${domain}:1-65535@${username}:${password}`,
                openvpn_download: `https://${domain}:2081`,
                payload: `GET / HTTP/1.1[crlf]Host: ${domain}[crlf]Upgrade: websocket[crlf][crlf]`
            }
        };
    }
    catch (err) {
        return { success: false, error: String(err) };
    }
}
function renewSshAccount(username, days) {
    try {
        validateUsername(username);
        validateDays(days);
        const check = (0, child_process_1.spawnSync)('id', [username], { encoding: 'utf8' });
        if (check.status !== 0) {
            return { success: false, error: `User '${username}' not found` };
        }
        const expiryResult = (0, child_process_1.spawnSync)('date', ['-d', `${days} days`, '+%Y-%m-%d'], { encoding: 'utf8' });
        const expiry = expiryResult.stdout.trim();
        (0, child_process_1.spawnSync)('chage', ['-E', expiry, username], { encoding: 'utf8' });
        const chageResult = (0, child_process_1.spawnSync)('chage', ['-l', username], { encoding: 'utf8' });
        const actualExpiry = chageResult.stdout
            .split('\n')
            .find(l => l.includes('Account expires'))
            ?.split(':')[1]?.trim() || expiry;
        return { success: true, data: { username, expiry: actualExpiry } };
    }
    catch (err) {
        return { success: false, error: String(err) };
    }
}
function deleteSshAccount(username) {
    try {
        validateUsername(username);
        const check = (0, child_process_1.spawnSync)('id', [username], { encoding: 'utf8' });
        if (check.status !== 0) {
            return { success: false, error: `User '${username}' not found` };
        }
        (0, child_process_1.spawnSync)('userdel', ['--force', username], { encoding: 'utf8' });
        return { success: true, data: { username } };
    }
    catch (err) {
        return { success: false, error: String(err) };
    }
}
function setSshAccountExpiry(username, date) {
    try {
        validateUsername(username);
        if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
            throw new Error('Invalid date format, expected YYYY-MM-DD');
        }
        const check = (0, child_process_1.spawnSync)('id', [username], { encoding: 'utf8' });
        if (check.status !== 0) {
            return { success: false, error: `User '${username}' not found` };
        }
        const result = (0, child_process_1.spawnSync)('chage', ['-E', date, username], { encoding: 'utf8' });
        if (result.status !== 0) {
            return { success: false, error: `chage failed: ${result.stderr?.trim() || 'unknown error'}` };
        }
        return { success: true, data: { username, expiry: date } };
    }
    catch (err) {
        return { success: false, error: String(err) };
    }
}
function suspendSshAccount(username) {
    try {
        validateUsername(username);
        (0, child_process_1.spawnSync)('chage', ['-E', '0', username], { encoding: 'utf8' });
        return { success: true, data: { username, status: 'suspended' } };
    }
    catch (err) {
        return { success: false, error: String(err) };
    }
}
// ---------- Xray helpers ----------
function readXrayConfig() {
    if (!fs_1.default.existsSync(XRAY_CONFIG))
        return {};
    try {
        const raw = fs_1.default.readFileSync(XRAY_CONFIG, 'utf8');
        try {
            return JSON.parse(raw);
        }
        catch {
            // Compatibility: some legacy configs contain marker lines like "#vless" or "### user date"
            const cleaned = raw
                .split('\n')
                .filter(line => !line.trim().startsWith('#'))
                .join('\n');
            return JSON.parse(cleaned);
        }
    }
    catch {
        return {};
    }
}
function writeXrayConfig(cfg) {
    fs_1.default.writeFileSync(XRAY_CONFIG, JSON.stringify(cfg, null, 2));
    (0, child_process_1.spawnSync)('systemctl', ['restart', 'xray'], { encoding: 'utf8' });
}
function generateUUID() {
    return crypto_1.default.randomUUID();
}
function findInbounds(cfg, protocol) {
    const inbounds = cfg['inbounds'];
    if (!inbounds)
        return [];
    return inbounds.filter(i => i.protocol === protocol);
}
function saveAndRestartXray(cfg) {
    fs_1.default.writeFileSync(XRAY_CONFIG, JSON.stringify(cfg, null, 2));
    (0, child_process_1.spawnSync)('systemctl', ['restart', 'xray'], { encoding: 'utf8' });
}
function ensureEmailClient(inbound, client) {
    inbound.settings = inbound.settings || {};
    inbound.settings.clients = inbound.settings.clients || [];
    const exists = inbound.settings.clients.some(c => c.email === client.email);
    if (!exists) {
        const toInsert = { email: client.email };
        if (client.id)
            toInsert.id = client.id;
        if (client.flow)
            toInsert.flow = client.flow;
        if (client.password)
            toInsert.password = client.password;
        inbound.settings.clients.push(toInsert);
    }
}
function ensureSocksClient(inbound, username, password) {
    inbound.settings = inbound.settings || {};
    inbound.settings.accounts = inbound.settings.accounts || [];
    const acc = inbound.settings.accounts;
    const exists = acc.some(a => a.user === username);
    if (!exists) {
        acc.push({ user: username, pass: password, email: username });
    }
}
function createXrayVmessAccount(username, days) {
    try {
        validateUsername(username);
        validateDays(days);
        const cfg = readXrayConfig();
        const inbounds = findInbounds(cfg, 'vmess');
        if (!inbounds.length)
            return { success: false, error: 'VMess inbound not found in xray config' };
        const uuid = generateUUID();
        const expiryResult = (0, child_process_1.spawnSync)('date', ['-d', `${days} days`, '+%Y-%m-%d'], { encoding: 'utf8' });
        const expiry = expiryResult.stdout.trim();
        for (const inbound of inbounds) {
            ensureEmailClient(inbound, { id: uuid, email: username });
        }
        saveAndRestartXray(cfg);
        const domain = getDomain();
        const myip = getServerIp();
        return {
            success: true,
            data: {
                username,
                uuid,
                expiry,
                domain,
                host: myip,
                protocol: 'vmess',
                port: 443,
                network: 'ws',
                path: '/vmess',
                tls: 'tls'
            }
        };
    }
    catch (err) {
        return { success: false, error: String(err) };
    }
}
function createXrayVlessAccount(username, days) {
    try {
        validateUsername(username);
        validateDays(days);
        const cfg = readXrayConfig();
        const inbounds = findInbounds(cfg, 'vless');
        if (!inbounds.length)
            return { success: false, error: 'VLESS inbound not found in xray config' };
        const uuid = generateUUID();
        const expiryResult = (0, child_process_1.spawnSync)('date', ['-d', `${days} days`, '+%Y-%m-%d'], { encoding: 'utf8' });
        const expiry = expiryResult.stdout.trim();
        for (const inbound of inbounds) {
            const network = inbound.streamSettings?.network;
            const flow = network === 'grpc' ? undefined : 'xtls-rprx-vision';
            ensureEmailClient(inbound, { id: uuid, email: username, flow });
        }
        saveAndRestartXray(cfg);
        const domain = getDomain();
        const myip = getServerIp();
        return {
            success: true,
            data: {
                username,
                uuid,
                expiry,
                domain,
                host: myip,
                protocol: 'vless',
                port: 443,
                network: 'ws',
                path: '/vless',
                tls: 'tls'
            }
        };
    }
    catch (err) {
        return { success: false, error: String(err) };
    }
}
function createXrayTrojanAccount(username, password, days) {
    try {
        validateUsername(username);
        validateDays(days);
        const cfg = readXrayConfig();
        const inbounds = findInbounds(cfg, 'trojan');
        if (!inbounds.length)
            return { success: false, error: 'Trojan inbound not found in xray config' };
        const expiryResult = (0, child_process_1.spawnSync)('date', ['-d', `${days} days`, '+%Y-%m-%d'], { encoding: 'utf8' });
        const expiry = expiryResult.stdout.trim();
        for (const inbound of inbounds) {
            ensureEmailClient(inbound, { password, email: username });
        }
        saveAndRestartXray(cfg);
        const domain = getDomain();
        const myip = getServerIp();
        return {
            success: true,
            data: {
                username,
                password,
                expiry,
                domain,
                host: myip,
                protocol: 'trojan',
                port: 443
            }
        };
    }
    catch (err) {
        return { success: false, error: String(err) };
    }
}
function createXraySocksAccount(username, password, days) {
    try {
        validateUsername(username);
        validateDays(days);
        const cfg = readXrayConfig();
        const inbounds = findInbounds(cfg, 'shadowsocks');
        if (!inbounds.length)
            return { success: false, error: 'SOCKS/Shadowsocks inbound not found in xray config' };
        const expiryResult = (0, child_process_1.spawnSync)('date', ['-d', `${days} days`, '+%Y-%m-%d'], { encoding: 'utf8' });
        const expiry = expiryResult.stdout.trim();
        for (const inbound of inbounds) {
            // Some xray templates use clients(password), others accounts(user/pass)
            inbound.settings = inbound.settings || {};
            if (Array.isArray(inbound.settings.clients)) {
                const exists = inbound.settings.clients.some(c => c.email === username);
                if (!exists)
                    inbound.settings.clients.push({ password, email: username });
            }
            else {
                ensureSocksClient(inbound, username, password);
            }
        }
        saveAndRestartXray(cfg);
        const domain = getDomain();
        const myip = getServerIp();
        return {
            success: true,
            data: {
                username,
                password,
                expiry,
                domain,
                host: myip,
                protocol: 'socks',
                port: 443
            }
        };
    }
    catch (err) {
        return { success: false, error: String(err) };
    }
}
function createZipVpnAccount(username, password, days) {
    try {
        validateUsername(username);
        validateDays(days);
        // ZipVPN uses /etc/zivpn/users.db (username password expiry)
        const zivpnDb = '/etc/zivpn/users.db';
        const zvpnJson = '/etc/zivpn/zvpn.json';
        if (!fs_1.default.existsSync('/etc/zivpn')) {
            return { success: false, error: 'ZipVPN not installed' };
        }
        const expiryResult = (0, child_process_1.spawnSync)('date', ['-d', `${days} days`, '+%Y-%m-%d'], { encoding: 'utf8' });
        const expiry = expiryResult.stdout.trim();
        // Add to users.db
        fs_1.default.appendFileSync(zivpnDb, `${username} ${password} ${expiry}\n`);
        // Add to zvpn.json if it exists
        if (fs_1.default.existsSync(zvpnJson)) {
            try {
                const cfg = JSON.parse(fs_1.default.readFileSync(zvpnJson, 'utf8'));
                if (cfg.users && Array.isArray(cfg.users)) {
                    cfg.users.push({ user: username, pass: password, exp: expiry });
                    fs_1.default.writeFileSync(zvpnJson, JSON.stringify(cfg, null, 2));
                }
            }
            catch { }
        }
        (0, child_process_1.spawnSync)('systemctl', ['restart', 'zivpn'], { encoding: 'utf8' });
        const domain = getDomain();
        return {
            success: true,
            data: {
                username,
                password,
                expiry,
                domain,
                protocol: 'zipvpn'
            }
        };
    }
    catch (err) {
        return { success: false, error: String(err) };
    }
}
function createSlowDnsAccount(username, password, days) {
    try {
        // SlowDNS shares SSH credentials
        const result = createSshAccount(username, password, days);
        if (!result.success)
            return result;
        const pub = getSlowDnsPub();
        const dns = getSlowDnsNsDomain();
        return {
            success: true,
            data: {
                ...(result.data || {}),
                protocol: 'slowdns',
                pub_key: pub,
                ns_domain: dns,
                ports: '22,53,5300,80,443'
            }
        };
    }
    catch (err) {
        return { success: false, error: String(err) };
    }
}
function createUdpCustomAccount(username, password, days) {
    try {
        // UDPCustom uses SSH accounts
        const result = createSshAccount(username, password, days);
        if (!result.success)
            return result;
        const domain = getDomain();
        return {
            success: true,
            data: {
                ...(result.data || {}),
                protocol: 'udpcustom',
                udp_link: `${domain}:1-65535@${username}:${password}`
            }
        };
    }
    catch (err) {
        return { success: false, error: String(err) };
    }
}
//# sourceMappingURL=scripts.js.map