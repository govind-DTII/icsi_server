import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLog } from '../entities/audit-log.entity';
import { CreateAuditDto } from './create-audit.dto';

@Injectable()
export class AuditService {
  constructor(
    @InjectRepository(AuditLog) private auditRepo: Repository<AuditLog>,
  ) {}

  async log(dto: CreateAuditDto): Promise<AuditLog> {
    // Denormalize the business correlation keys from the related consent when
    // present, so audit_logs joins to ble_event_audit / consent_requests on the
    // same human ids (CST consent_id / session_id / txn / device_id). Explicit
    // dto fields win for entries that have no consent entity.
    const c = dto.consentRequest;
    const entry = this.auditRepo.create({
      ...dto,
      consentId: dto.consentId ?? c?.consentId ?? c?.id,
      txn: dto.txn ?? c?.txnRef,
      sessionId: dto.sessionId ?? c?.sessionId,
      deviceId: dto.deviceId ?? c?.deviceId,
    });
    return this.auditRepo.save(entry);
  }

  async findAll(
    userId: string,
    role: string,
    filter?: string,
    limit = 50,
  ): Promise<AuditLog[]> {
    const query = this.auditRepo
      .createQueryBuilder('log')
      .leftJoinAndSelect('log.consentRequest', 'consent')
      .orderBy('log.createdAt', 'DESC')
      .take(limit);

    if (filter && filter !== 'all') {
      if (filter === 'consent') {
        query.where('log.type IN (:...types)', {
          types: ['approve', 'reject'],
        });
      } else if (filter === 'ble') {
        query.where('log.type = :type', { type: 'ble' });
      } else if (filter === 'auth') {
        query.where('log.type = :type', { type: 'login' });
      } else if (filter === 'ser') {
        // Subscriber Evidence Records — consent-create rows with a document name.
        query.where('log.document_name IS NOT NULL');
      }
    }

    return query.getMany();
  }
}
