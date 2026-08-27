import { Repository } from 'typeorm';
import { AuditLog } from '../entities/audit-log.entity';
import { CreateAuditDto } from './create-audit.dto';
export declare class AuditService {
    private auditRepo;
    constructor(auditRepo: Repository<AuditLog>);
    log(dto: CreateAuditDto): Promise<AuditLog>;
    findAll(userId: string, role: string, filter?: string, limit?: number): Promise<AuditLog[]>;
}
