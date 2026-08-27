import { AuditService } from './audit.service';
export declare class AuditController {
    private readonly auditService;
    constructor(auditService: AuditService);
    getAll(req: any, filter?: string, limit?: string): Promise<import("../entities/audit-log.entity").AuditLog[]>;
}
