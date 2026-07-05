/**
 * API client for KATASHIE VPN backend
 *
 * BUG FIX: auth-context.tsx imports saveToken, clearToken, hasToken from this file,
 * but they were not exported → TypeScript build error.
 * BUG FIX: token key standardized to 'katashie_token' (was 'nexus_token' in getToken,
 * while AdminDashboard.tsx used 'token' directly — all now use this single key).
 */

const BASE_URL = '';  // same-origin

const TOKEN_KEY = 'katashie_token';

export function saveToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

export function hasToken(): boolean {
  return !!localStorage.getItem(TOKEN_KEY);
}

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

function authHeaders(): HeadersInit {
  const token = getToken();
  return token
    ? { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
    : { 'Content-Type': 'application/json' };
}

async function apiRequest<T>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${BASE_URL}/api${path}`, {
    method,
    headers: authHeaders(),
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error((err as any).error || `HTTP ${res.status}`);
  }
  return res.json();
}

export const api = {
  // Auth
  login: (username: string, password: string) =>
    apiRequest<{ token: string; admin: { id: string; username: string; role: string } }>(
      'POST', '/auth/login', { username, password }
    ),

  logout: () => apiRequest<void>('POST', '/auth/logout'),

  me: () =>
    apiRequest<{
      admin: {
        id: string;
        username: string;
        role: string;
        bouquet?: any;
        expiry_date?: string;
        remaining_days?: number;
        remaining_seconds?: number;
      };
    }>('GET', '/auth/me'),

  changePassword: (current_password: string, new_password?: string, new_username?: string) =>
    apiRequest<{ message: string }>('POST', '/auth/change-password', {
      current_password,
      new_password,
      new_username,
    }),

  // Admins
  listAdmins: () => apiRequest<any[]>('GET', '/admins'),
  createAdmin: (data: { username: string; password: string; role?: string }) =>
    apiRequest<any>('POST', '/admins', data),
  updateAdmin: (id: string, data: { username?: string; password?: string }) =>
    apiRequest<any>('PUT', `/admins/${id}`, data),
  suspendAdmin:  (id: string) => apiRequest<any>('POST',   `/admins/${id}/suspend`),
  activateAdmin: (id: string) => apiRequest<any>('POST',   `/admins/${id}/activate`),
  deleteAdmin:   (id: string) => apiRequest<any>('DELETE', `/admins/${id}`),
  promoteAdmin:  (id: string) => apiRequest<any>('POST',   `/admins/${id}/promote`),

  // Resellers
  listResellers: () => apiRequest<any[]>('GET', '/resellers'),
  createReseller: (data: {
    username: string; password: string; duration_days: number;
    bouquet: Array<{ protocolId: string; maxAccounts: number }>;
  }) => apiRequest<any>('POST', '/resellers', data),
  suspendReseller:  (id: string) => apiRequest<any>('POST',   `/resellers/${id}/suspend`),
  activateReseller: (id: string) => apiRequest<any>('POST',   `/resellers/${id}/activate`),
  updateReseller: (id: string, data: { bouquet?: any[]; duration_days?: number; password?: string }) =>
    apiRequest<any>('PUT', `/resellers/${id}`, data),
  deleteReseller: (id: string) => apiRequest<any>('DELETE', `/resellers/${id}`),

  // Clients (VPN accounts)
  listClients: (params?: { mine?: boolean; created_by?: string }) => {
    const qs = params
      ? '?' + new URLSearchParams(
          Object.entries(params)
            .filter(([, v]) => v != null)
            .map(([k, v]) => [k, String(v)])
        ).toString()
      : '';
    return apiRequest<any[]>('GET', `/clients${qs}`);
  },
  createClient:      (data: any) => apiRequest<any>('POST', '/clients', data),
  getClient:         (id: string) => apiRequest<any>('GET', `/clients/${id}`),
  renewClient:       (id: string, days: number) => apiRequest<any>('POST', `/clients/${id}/renew`, { days }),
  reduceClientDays:  (id: string, days: number) => apiRequest<any>('POST', `/clients/${id}/reduce-days`, { days }),
  suspendClient:     (id: string) => apiRequest<any>('POST',   `/clients/${id}/suspend`),
  deleteClient:      (id: string) => apiRequest<any>('DELETE', `/clients/${id}`),

  // Plans
  listPlans:   () => apiRequest<any[]>('GET', '/plans'),
  createPlan:  (data: any) => apiRequest<any>('POST', '/plans', data),
  updatePlan:  (id: string, data: any) => apiRequest<any>('PUT', `/plans/${id}`, data),
  deletePlan:  (id: string) => apiRequest<any>('DELETE', `/plans/${id}`),

  // Settings
  getSettings:    () => apiRequest<any>('GET', '/settings'),
  updateSettings: (data: any) => apiRequest<any>('PUT', '/settings', data),

  // Servers
  listServers:  () => apiRequest<any[]>('GET', '/servers'),
  createServer: (data: any) => apiRequest<any>('POST', '/servers', data),
  updateServer: (id: string, data: any) => apiRequest<any>('PUT', `/servers/${id}`, data),
  deleteServer: (id: string) => apiRequest<any>('DELETE', `/servers/${id}`),

  // Monitoring
  getMonitoringSnapshot: () => apiRequest<any>('GET', '/monitoring/snapshot'),

  // QR Code
  getQrCode: (clientId: string, format: 'png' | 'uri' = 'png') =>
    apiRequest<any>('GET', `/qrcode/${clientId}?format=${format}`),

  // Payments
  listPayments:   () => apiRequest<any[]>('GET', '/payment/list'),
  initiatePayment: (data: { phone: string; amount: number; plan_id: string }) =>
    apiRequest<any>('POST', '/payment/initiate', data),
  checkPayment:   (reference: string) => apiRequest<any>('GET', `/payment/status/${reference}`),

  // Audit logs
  listAuditLogs: () => apiRequest<any[]>('GET', '/auditlogs'),

  // Export
  exportClientsCSV: () => { window.open('/api/export/clients/csv', '_blank'); },
  exportAuditCSV:   () => { window.open('/api/export/audit/csv', '_blank'); },
  getStats:         () => apiRequest<any>('GET', '/export/stats/json'),

  // Server time
  getServerTime: () => apiRequest<{ unix: number; iso: string }>('GET', '/server-time'),
};
