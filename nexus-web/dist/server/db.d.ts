type StatementLike = {
    get(...params: unknown[]): unknown;
    all(...params: unknown[]): unknown[];
    run(...params: unknown[]): {
        changes: number;
        lastInsertRowid: number | bigint;
    };
};
type DbLike = {
    prepare(query: string): StatementLike;
    exec(query: string): void;
    pragma(command: string): void;
    close(): void;
};
export declare function getDb(): DbLike;
export declare function seedSuperAdmin(username: string, password: string): void;
export declare function logAction(adminId: string | null, adminUsername: string | null, action: string, targetType: string | null, targetId: string | null, details: Record<string, unknown>, ip: string | null): void;
export {};
//# sourceMappingURL=db.d.ts.map