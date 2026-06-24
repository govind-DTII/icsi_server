import { BleEventsService } from './ble-events.service';
import { BleEventDto } from './dto/ble-event.dto';
export declare class BleEventsController {
    private readonly bleEventsService;
    constructor(bleEventsService: BleEventsService);
    record(dto: BleEventDto): Promise<{
        success: boolean;
        event: import("./entities/ble-event-audit.entity").BleEventAudit;
    }>;
}
