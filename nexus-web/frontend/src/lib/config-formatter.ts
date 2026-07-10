import type { ProtocolType } from './types';

export function formatConfig(
  values: {
    username: string;
    password: string;
    expiryDate?: string;
    protocol: ProtocolType;
    [key: string]: unknown;
  },
  serverSettings: Record<string, string>
): string {
  const protocol = values.protocol?.toUpperCase() || 'UNKNOWN';
  const host = serverSettings.domain || serverSettings.ip || 'your-server';
  return [
    `# ${protocol} CONFIG`,
    `username=${values.username}`,
    `password=${values.password}`,
    `server=${host}`,
    `expiry=${values.expiryDate || 'N/A'}`,
    `protocol=${protocol}`,
  ].join('\n');
}
