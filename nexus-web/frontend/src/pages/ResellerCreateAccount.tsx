import { useState } from 'react';
import { api } from '@/lib/api';
import { motion } from 'framer-motion';
import { UserPlus, Copy, Check, RefreshCw } from 'lucide-react';

// BUG FIX: This file was imported in App.tsx (used at both /admin/create and /reseller/create)
// but did not exist in the project — causing a build failure.
// Creates a VPN account by calling POST /api/clients.

interface CreatedAccount {
  id: string;
  username: string;
  password: string;
  protocol: string;
  expires_at: string;
  status: string;
}

export default function ResellerCreateAccount() {
  const [username, setUsername]     = useState('');
  const [password, setPassword]     = useState('');
  const [protocol, setProtocol]     = useState('ssh');
  const [duration, setDuration]     = useState('30');
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState('');
  const [created, setCreated]       = useState<CreatedAccount | null>(null);
  const [copied, setCopied]         = useState<string | null>(null);

  const protocols = ['ssh', 'vmess', 'vless', 'trojan', 'shadowsocks'];

  const generateUsername = () => {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    const rand = Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
    setUsername(`user_${rand}`);
  };

  const generatePassword = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789@#!';
    setPassword(Array.from({ length: 12 }, () => chars[Math.floor(Math.random() * chars.length)]).join(''));
  };

  const copyToClipboard = async (text: string, key: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setError("L'identifiant et le mot de passe sont requis.");
      return;
    }
    setLoading(true);
    setError('');
    setCreated(null);
    try {
      const result = await api.createClient({
        username: username.trim(),
        password: password.trim(),
        protocol,
        duration_days: parseInt(duration) || 30,
      });
      setCreated(result);
      setUsername('');
      setPassword('');
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la création du compte.');
    }
    setLoading(false);
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
        <h1 className="text-2xl font-display font-bold tracking-tight">
          <span className="text-gradient-primary">Créer un Compte VPN</span>
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Créez un nouveau compte pour un client
        </p>
      </motion.div>

      <motion.form
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        onSubmit={handleSubmit}
        className="glass-card p-6 space-y-5"
      >
        {/* Username */}
        <div className="space-y-1.5">
          <label className="text-xs uppercase tracking-widest text-muted-foreground font-semibold">
            Identifiant
          </label>
          <div className="flex gap-2">
            <input
              value={username}
              onChange={e => setUsername(e.target.value)}
              className="input-dark flex-1"
              placeholder="ex: user_abc123"
              required
            />
            <button type="button" onClick={generateUsername} className="btn-ghost px-3" title="Générer">
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Password */}
        <div className="space-y-1.5">
          <label className="text-xs uppercase tracking-widest text-muted-foreground font-semibold">
            Mot de passe
          </label>
          <div className="flex gap-2">
            <input
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="input-dark flex-1 font-mono"
              placeholder="Minimum 6 caractères"
              required
            />
            <button type="button" onClick={generatePassword} className="btn-ghost px-3" title="Générer">
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Protocol */}
        <div className="space-y-1.5">
          <label className="text-xs uppercase tracking-widest text-muted-foreground font-semibold">
            Protocole
          </label>
          <select value={protocol} onChange={e => setProtocol(e.target.value)} className="input-dark w-full">
            {protocols.map(p => (
              <option key={p} value={p}>{p.toUpperCase()}</option>
            ))}
          </select>
        </div>

        {/* Duration */}
        <div className="space-y-1.5">
          <label className="text-xs uppercase tracking-widest text-muted-foreground font-semibold">
            Durée
          </label>
          <select value={duration} onChange={e => setDuration(e.target.value)} className="input-dark w-full">
            <option value="1">1 Jour</option>
            <option value="7">7 Jours</option>
            <option value="15">15 Jours</option>
            <option value="30">30 Jours</option>
            <option value="60">60 Jours</option>
            <option value="90">90 Jours</option>
            <option value="180">6 Mois</option>
            <option value="365">1 An</option>
          </select>
        </div>

        {error && (
          <p className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-4 py-2">
            {error}
          </p>
        )}

        <button type="submit" disabled={loading} className="btn-primary w-full flex items-center justify-center gap-2">
          {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
          {loading ? 'Création en cours...' : 'Créer le compte'}
        </button>
      </motion.form>

      {/* Success card */}
      {created && (
        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          className="glass-card p-6 space-y-4 border border-success/30"
        >
          <h2 className="text-lg font-display font-bold text-success flex items-center gap-2">
            <Check className="w-5 h-5" />
            Compte créé avec succès !
          </h2>
          <div className="grid grid-cols-1 gap-3">
            {[
              { label: 'Identifiant', value: created.username },
              { label: 'Mot de passe', value: created.password },
              { label: 'Protocole',   value: created.protocol?.toUpperCase() },
              { label: 'Expiration',  value: created.expires_at },
            ].map(row => (
              <div key={row.label} className="flex items-center justify-between bg-secondary/20 rounded-lg px-4 py-3">
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground">{row.label}</p>
                  <p className="text-sm font-mono text-foreground font-semibold">{row.value}</p>
                </div>
                <button
                  onClick={() => copyToClipboard(row.value, row.label)}
                  className="p-1.5 rounded-lg hover:bg-accent/10 text-muted-foreground hover:text-accent transition-colors"
                >
                  {copied === row.label ? <Check className="w-4 h-4 text-success" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
}
