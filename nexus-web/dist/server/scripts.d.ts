export interface AccountResult {
    success: boolean;
    data?: Record<string, string | number>;
    error?: string;
    raw?: string;
}
export declare function createSshAccount(username: string, password: string, days: number): AccountResult;
export declare function renewSshAccount(username: string, days: number): AccountResult;
export declare function deleteSshAccount(username: string): AccountResult;
export declare function setSshAccountExpiry(username: string, date: string): AccountResult;
export declare function suspendSshAccount(username: string): AccountResult;
export declare function createXrayVmessAccount(username: string, days: number): AccountResult;
export declare function createXrayVlessAccount(username: string, days: number): AccountResult;
export declare function createXrayTrojanAccount(username: string, password: string, days: number): AccountResult;
export declare function createXraySocksAccount(username: string, password: string, days: number): AccountResult;
export declare function createZipVpnAccount(username: string, password: string, days: number): AccountResult;
export declare function createSlowDnsAccount(username: string, password: string, days: number): AccountResult;
export declare function createUdpCustomAccount(username: string, password: string, days: number): AccountResult;
//# sourceMappingURL=scripts.d.ts.map