/**
 * AdminDashboard — Tableau de bord principal
 * BUG FIX: utilisait localStorage.getItem('token') directement au lieu de
 * la clé centralisée définie dans api.ts (getToken()).
 * Maintenant tous les appels passent par le module api.
 */
import { useState, useEffect } from 'react';
import { Users, Activity, Shield, TrendingUp, RefreshCw, QrCode } from 'lucide-react';
import { useI18n } from '../contexts/I18nContext';
import { ProtocolPieChart, BandwidthBarChart } from '../components/BandwidthChart';
import ExportButton from '../components/ExportButton';
import QRCodeModal from '../components/QRCodeModal';
import { api, getToken } from '@/lib/api';

interface Stats { total: number; active: number; expired: number; by_protocol: { protocol: string; n: number }[] }
interface Client { id: string; username: string; protocol: string; status: string; expires_at: string }

export default function AdminDashboard() {
  const { t } = useI18n();
  const [stats, setStats] = useState<Stats | null>(null);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [qrClient, setQrClient] = useState<Client | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const [statsData, clientsData] = await Promise.all([
        api.getStats(),
        api.listClients(),
      ]);
      setStats(statsData);
      setClients(Array.isArray(clientsData) ? clientsData : []);
    } catch (e) {
      console.error('[Dashboard] load error:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const expiringSoon = clients.filter(c => {
    if (c.status !== 'active' || !c.expires_at) return false;
    const exp = new Date(c.expires_at).getTime();
    const now = Date.now();
    return exp > now && exp - now < 2 * 24 * 60 * 60 * 1000;
  });

  const StatCard = ({ icon: Icon, label, value, color }: any) => (
    <div className="stat-card">
      <div className="stat-card-header">
        <div className="stat-icon" style={{ background: `${color}22`, color }}><Icon size={18} /></div>
        <span className="stat-label">{label}</span>
      </div>
      <div className="stat-value" style={{ color }}>{loading ? '—' : value}</div>
    </div>
  );

  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="page-title">{t('dashboard.title', 'Tableau de bord')}</h1>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <ExportButton type="clients" />
          <button className="btn btn-ghost btn-sm" onClick={load}><RefreshCw size={15} /></button>
        </div>
      </div>

      <div className="stats-grid">
        <StatCard icon={Users}      label={t('dashboard.total_accounts', 'Total comptes')} value={stats?.total ?? 0}       color="var(--blue)" />
        <StatCard icon={Activity}   label={t('dashboard.active', 'Actifs')}                value={stats?.active ?? 0}      color="var(--green)" />
        <StatCard icon={Shield}     label={t('dashboard.suspended', 'Suspendus')}          value={stats?.expired ?? 0}     color="var(--red)" />
        <StatCard icon={TrendingUp} label={t('dashboard.expiring_soon', 'Expirent bientôt')} value={expiringSoon.length}  color="var(--yellow)" />
      </div>

      <div style={{ display: 'grid', gap: '1.5rem', gridTemplateColumns: '1fr 1fr', marginBottom: '1.5rem' }}>
        <div className="card">
          <div className="card-header"><span className="card-title">{t('dashboard.by_protocol', 'Par protocole')}</span></div>
          <div className="card-body">
            {stats?.by_protocol?.length
              ? <ProtocolPieChart data={stats.by_protocol} />
              : <div className="empty-state" style={{ padding: '2rem' }}>Aucune donnée</div>}
          </div>
        </div>
        <div className="card">
          <div className="card-header">
            <span className="card-title">{t('dashboard.bandwidth', 'Utilisation')}</span>
            <ExportButton type="clients" />
          </div>
          <div className="card-body">
            <BandwidthBarChart data={[]} />
          </div>
        </div>
      </div>

      {expiringSoon.length > 0 && (
        <div className="card" style={{ marginBottom: '1.5rem' }}>
          <div className="card-header">
            <span className="card-title" style={{ color: 'var(--yellow)' }}>
              ⚠ {t('dashboard.expiring_soon', 'Expirent bientôt')} ({expiringSoon.length})
            </span>
          </div>
          <div className="table-container" style={{ border: 'none', borderRadius: 0 }}>
            <table className="table">
              <thead><tr>
                <th>{t('accounts.username', 'Utilisateur')}</th>
                <th>{t('accounts.protocol', 'Protocole')}</th>
                <th>{t('accounts.expires', 'Expire le')}</th>
                <th>{t('accounts.actions', 'Actions')}</th>
              </tr></thead>
              <tbody>{expiringSoon.map(c => (
                <tr key={c.id}>
                  <td><strong>{c.username}</strong></td>
                  <td><span className="badge">{c.protocol.toUpperCase()}</span></td>
                  <td style={{ color: 'var(--yellow)' }}>{c.expires_at}</td>
                  <td><button className="btn btn-ghost btn-sm" onClick={() => setQrClient(c)}><QrCode size={13} /> QR</button></td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        </div>
      )}

      <div className="card">
        <div className="card-header">
          <span className="card-title">Comptes récents</span>
          <ExportButton type="clients" />
        </div>
        <div className="table-container" style={{ border: 'none', borderRadius: 0 }}>
          <table className="table">
            <thead><tr>
              <th>{t('accounts.username', 'Utilisateur')}</th>
              <th>{t('accounts.protocol', 'Protocole')}</th>
              <th>{t('accounts.status', 'Statut')}</th>
              <th>{t('accounts.expires', 'Expire le')}</th>
              <th>{t('accounts.actions', 'Actions')}</th>
            </tr></thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} style={{ textAlign: 'center' }}><RefreshCw size={14} className="spin" /> Chargement...</td></tr>
              ) : clients.slice(0, 15).map(c => (
                <tr key={c.id}>
                  <td><strong>{c.username}</strong></td>
                  <td><span className="badge">{c.protocol.toUpperCase()}</span></td>
                  <td><span className={`badge badge-${c.status === 'active' ? 'online' : 'offline'}`}>{c.status}</span></td>
                  <td style={{ fontSize: '0.8rem' }}>{c.expires_at}</td>
                  <td>
                    <button className="btn btn-ghost btn-sm" onClick={() => setQrClient(c)} title="QR Code"><QrCode size={13} /></button>
                  </td>
                </tr>
              ))}
              {!loading && clients.length === 0 && (
                <tr><td colSpan={5} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>Aucun compte</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {qrClient && (
        <QRCodeModal clientId={qrClient.id} username={qrClient.username} protocol={qrClient.protocol} onClose={() => setQrClient(null)} />
      )}
    </div>
  );
}
