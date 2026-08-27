import { DataSource, Repository } from 'typeorm';
import { TamperEvent } from './entities/tamper-event.entity';
import { CreateTamperEventDto } from './dto/create-tamper-event.dto';
import { ConsentService } from '../consent/consent.service';
import { SessionsService } from '../sessions/sessions.service';
import { BleEventsService } from '../ble-events/ble-events.service';
import { LoggerService } from '../logging/logger.service';
export declare class TamperService {
    private tamperRepo;
    private readonly consentService;
    private readonly sessionsService;
    private readonly bleEventsService;
    private readonly appLog;
    private readonly dataSource;
    constructor(tamperRepo: Repository<TamperEvent>, consentService: ConsentService, sessionsService: SessionsService, bleEventsService: BleEventsService, appLog: LoggerService, dataSource: DataSource);
    log(dto: CreateTamperEventDto): Promise<TamperEvent>;
    findUnresolvedForDevice(deviceId: string): Promise<TamperEvent[]>;
    markResolved(id: string, notes?: string): Promise<TamperEvent>;
}
