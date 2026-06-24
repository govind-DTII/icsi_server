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
}
export declare class BleEventsService {
    private eventRepo;
    constructor(eventRepo: Repository<BleEventAudit>);
    recordEvent(dto: RecordEventDto): Promise<BleEventAudit>;
    listBySession(sessionId: string, limit?: number): Promise<BleEventAudit[]>;
    listErrors(since: Date, limit?: number): Promise<BleEventAudit[]>;
}
