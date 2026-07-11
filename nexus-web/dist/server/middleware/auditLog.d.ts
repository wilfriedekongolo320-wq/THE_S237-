import { Request, Response, NextFunction } from 'express';
export declare function auditLog(action: string): (req: Request, res: Response, next: NextFunction) => void;
export declare function ensureAuditTable(): void;
//# sourceMappingURL=auditLog.d.ts.map