import type { Protocol, SiteSettings } from './types';

export const protocols: Protocol[] = [
  {
    id: 'ssh',
    name: 'SSH',
    description: 'Accès SSH sécurisé',
    icon: '🔐',
    isEnabled: true,
    ports: [{ service: 'SSH', transport: 'TCP', tls: '22', ntls: '22' }],
  },
  {
    id: 'vmess',
    name: 'VMess',
    description: 'Proxy VMess',
    icon: '🧩',
    isEnabled: true,
    ports: [{ service: 'VMess', transport: 'WS', tls: '443', ntls: '80' }],
  },
  {
    id: 'vless',
    name: 'VLESS',
    description: 'Proxy VLESS',
    icon: '⚡',
    isEnabled: true,
    ports: [{ service: 'VLESS', transport: 'WS', tls: '443', ntls: '80' }],
  },
  {
    id: 'trojan',
    name: 'Trojan',
    description: 'Proxy Trojan',
    icon: '🛡️',
    isEnabled: true,
    ports: [{ service: 'Trojan', transport: 'WS', tls: '443', ntls: '80' }],
  },
];

export const defaultSiteSettings: SiteSettings = {
  siteName: 'KATASHIE VPN',
  sitePort: 2087,
  primaryColor: '#2563eb',
  accentColor: '#38bdf8',
  logoText: 'KATASHIE',
  footerText: '© 2026 KATASHIE VPN',
  maintenanceMode: false,
  registrationEnabled: true,
  maxResellersPerAdmin: 5,
  defaultResellerDuration: 30,
  telegramBot: '',
  telegramChannel: '',
};
