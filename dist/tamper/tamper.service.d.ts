import { Repository } from 'typeorm';
import { TamperEvent } from './entities/tamper-event.entity';
import { CreateTamperEventDto } from './dto/create-tamper-event.dto';
import { ConsentService } from '../consent/consent.service';
import { SessionsService } from '../sessions/sessions.service';
import { BleEventsService } from '../ble-events/ble-events.service';
export declare class TamperService {
    private tamperRepo;
    private readonly consentService;
    private readonly sessionsService;
    private readonly bleEventsService;
    constructor(tamperRepo: Repository<TamperEvent>, consentService: ConsentService, sessionsService: SessionsService, bleEventsService: BleEventsService);
    log(dto: CreateTamperEventDto): Promise<TamperEvent>;
    findUnresolvedForDevice(deviceId: string): Promise<TamperEvent[]>;
    markResolved(id: string, notes?: string): Promise<TamperEvent>;
}
