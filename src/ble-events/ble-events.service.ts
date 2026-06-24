import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, MoreThanOrEqual, Not, Repository } from 'typeorm';
import { BleEventAudit } from './entities/ble-event-audit.entity';

// Loose interface so internal callers (TamperService, BleService, etc.)
// don't have to import the class-validator DTO.
export interface RecordEventDto {
  eventType: string;
  direction?: string;
  sessionId?: string;
  consentId?: string;
  txn?: string;
  payloadSummary?: Record<string, unknown>;
  errorCode?: string;
  retryCount?: number;
  deviceId?: string;
  // Server-set from the JWT by the controller; internal callers may pass it too.
  actorId?: string;
}

@Injectable()
export class BleEventsService {
  constructor(
    @InjectRepository(BleEventAudit)
    private eventRepo: Repository<BleEventAudit>,
  ) {}

  async recordEvent(dto: RecordEventDto): Promise<BleEventAudit> {
    const event = this.eventRepo.create({
      sessionId: dto.sessionId,
      consentId: dto.consentId,
      txn: dto.txn,
      eventType: dto.eventType,
      direction: dto.direction,
      payloadSummary: dto.payloadSummary,
      errorCode: dto.errorCode,
      retryCount: dto.retryCount,
      deviceId: dto.deviceId,
      actorId: dto.actorId,
      // recorded_at defaults to the DB NOW() at insert (single server clock).
      // The trail is ordered by `id` (insertion order) — see listBySession.
    });
    return this.eventRepo.save(event);
  }

  async listBySession(
    sessionId: string,
    limit = 100,
  ): Promise<BleEventAudit[]> {
    return this.eventRepo.find({
      where: { sessionId },
      // Order by the monotonic insert id (single source of truth). recorded_at
      // is a single server clock too, but id is guaranteed monotonic and is the
      // canonical replay order. (Do NOT order by a device clock — phone/server
      // skew scrambles the interleaving of app vs backend events.)
      order: { id: 'ASC' },
      take: limit,
    });
  }

  async listErrors(since: Date, limit = 100): Promise<BleEventAudit[]> {
    return this.eventRepo.find({
      where: {
        errorCode: Not(IsNull()),
        recordedAt: MoreThanOrEqual(since),
      },
      order: { recordedAt: 'DESC' },
      take: limit,
    });
  }

  // Most-recent-first protocol trail, normalized to the same shape the mobile
  // AuditEntry expects (id/action/detail/type/actorId/actorRole/createdAt) so the
  // app's Audit screen can render BLE events alongside the governance audit_logs.
  // Ordered by the monotonic `id` (canonical insert order; NOT a device clock).
  async listAudit(limit = 50, sessionId?: string): Promise<BleAuditView[]> {
    const events = await this.eventRepo.find({
      where: sessionId ? { sessionId } : {},
      order: { id: 'DESC' },
      take: limit,
    });
    return events.map((e) => this.toAuditView(e));
  }

  private toAuditView(e: BleEventAudit): BleAuditView {
    return {
      // Prefix so the bigint PK never collides with an audit_logs UUID in the
      // merged client-side list.
      id: `ble-${e.id}`,
      action: this.humanizeEventType(e.eventType),
      detail: this.summarize(e),
      type: 'ble',
      actorId: e.actorId ?? 'SYSTEM',
      actorRole: 'device',
      createdAt: e.recordedAt.toISOString(),
    };
  }

  private humanizeEventType(eventType: string): string {
    // SESSION_ESTABLISHED -> "Session Established"
    return eventType
      .toLowerCase()
      .split('_')
      .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w))
      .join(' ');
  }

  private summarize(e: BleEventAudit): string {
    const parts: string[] = [];
    if (e.direction) parts.push(e.direction);
    if (e.errorCode) parts.push(`err ${e.errorCode}`);
    if (e.retryCount != null) parts.push(`retries ${e.retryCount}`);
    if (e.deviceId) parts.push(e.deviceId);
    if (e.txn) parts.push(`txn ${e.txn}`);
    return parts.join(' · ');
  }
}

export interface BleAuditView {
  id: string;
  action: string;
  detail: string;
  type: 'ble';
  actorId: string;
  actorRole: string;
  createdAt: string;
}
