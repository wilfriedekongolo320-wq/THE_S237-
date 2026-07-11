import { Request, Response, NextFunction } from 'express';
declare let JWT_SECRET: string;
export interface AuthRequest extends Request {
    admin?: {
        id: string;
        username: string;
        role: string;
    };
}
export declare function requireAuth(req: AuthRequest, res: Response, next: NextFunction): void;
export declare function requireAdmin(req: AuthRequest, res: Response, next: NextFunction): void;
export declare function requireSuperAdmin(req: AuthRequest, res: Response, next: NextFunction): void;
export { JWT_SECRET };
//# sourceMappingURL=auth.d.ts.map