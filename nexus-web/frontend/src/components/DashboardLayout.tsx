import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/lib/auth-context';
import AppSidebar from './AppSidebar';

/**
 * DashboardLayout — Layout principal avec sidebar + contenu
 * Corrigé pour utiliser les classes CSS du design system KATASHIE VPN (app-shell / sidebar / main-content)
 */
export default function DashboardLayout() {
  const { user, logout } = useAuth();
  const navigate   = useNavigate();
  const location   = useLocation();

  const currentPage = (() => {
    const p = location.pathname;
    if (p.includes('/admin/resellers'))   return 'resellers';
    if (p.includes('/admin/admins'))      return 'admins';
    if (p.includes('/admin/protocols'))   return 'protocols';
    if (p.includes('/admin/server'))      return 'servers';
    if (p.includes('/admin/appearance'))  return 'appearance';
    if (p.includes('/admin/settings'))    return 'settings';
    if (p.includes('/admin/accounts'))    return 'accounts';
    if (p.includes('/admin/create'))      return 'create';
    if (p.includes('/admin'))             return 'dashboard';
    if (p.includes('/reseller/create'))   return 'create';
    if (p.includes('/reseller/accounts')) return 'accounts';
    if (p.includes('/reseller'))          return 'dashboard';
    return 'dashboard';
  })();

  const handleNavigate = (page: string) => {
    const isAdmin = user?.role === 'admin' || user?.role === 'super_admin';
    const base    = isAdmin ? '/admin' : '/reseller';
    const routes: Record<string, string> = {
      dashboard:   base,
      accounts:    `${base}/accounts`,
      create:      `${base}/create`,
      monitoring:  '/admin/settings',
      servers:     '/admin/server',
      resellers:   '/admin/resellers',
      admins:      '/admin/admins',
      protocols:   '/admin/protocols',
      audit:       '/admin/settings',
      payment:     '/admin/settings',
      settings:    '/admin/settings',
      appearance:  '/admin/appearance',
    };
    navigate(routes[page] ?? base);
  };

  if (!user) return null;

  return (
    <div className="app-shell">
      <AppSidebar
        currentPage={currentPage}
        onNavigate={handleNavigate}
        role={user.role}
        username={user.username}
        onLogout={logout}
      />
      <div className="main-content">
        <Outlet />
      </div>
    </div>
  );
}
