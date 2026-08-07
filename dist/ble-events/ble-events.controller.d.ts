import { BleEventsService } from './ble-events.service';
import { BleEventDto } from './dto/ble-event.dto';
interface AuthedRequest {
    user?: {
        userId?: string;
    };
}
export declare class BleEventsController {
    private readonly bleEventsService;
    constructor(bleEventsService: BleEventsService);
    record(dto: BleEventDto, req: AuthedRequest): Promise<{
        success: boolean;
        event: import("./entities/ble-event-audit.entity").BleEventAudit;
    }>;
    list(sessionId?: string, limit?: string): Promise<import("./ble-events.service").BleAuditView[]>;
}
export {};
