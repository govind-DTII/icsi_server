import { Repository } from 'typeorm';
import { BleEventAudit } from './entities/ble-event-audit.entity';
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
    actorId?: string;
}
export declare class BleEventsService {
    private eventRepo;
    constructor(eventRepo: Repository<BleEventAudit>);
    recordEvent(dto: RecordEventDto): Promise<BleEventAudit>;
    listBySession(sessionId: string, limit?: number): Promise<BleEventAudit[]>;
    listErrors(since: Date, limit?: number): Promise<BleEventAudit[]>;
    listAudit(limit?: number, sessionId?: string): Promise<BleAuditView[]>;
    private toAuditView;
    private humanizeEventType;
    private summarize;
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
