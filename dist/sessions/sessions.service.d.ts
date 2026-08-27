import { DataSource, EntityManager, Repository } from 'typeorm';
import { BleSession } from './entities/ble-session.entity';
import { DeviceIdentitySnapshot } from './entities/device-identity-snapshot.entity';
import { BleEventsService } from '../ble-events/ble-events.service';
import { LoggerService } from '../logging/logger.service';
import { CreateSessionDto, EndReason, EndSessionDto, UpdateSessionStateDto } from './dto/session.dto';
export declare class SessionsService {
    private sessionRepo;
    private snapshotRepo;
    private bleEventsService;
    private readonly appLog;
    private readonly dataSource;
    private readonly logger;
    constructor(sessionRepo: Repository<BleSession>, snapshotRepo: Repository<DeviceIdentitySnapshot>, bleEventsService: BleEventsService, appLog: LoggerService, dataSource: DataSource);
    private safeRecordEvent;
    start(dto: CreateSessionDto): Promise<BleSession>;
    findBySessionId(sessionId: string): Promise<BleSession>;
    getActiveByDevice(deviceId: string): Promise<BleSession | null>;
    updateState(sessionId: string, dto: UpdateSessionStateDto): Promise<BleSession>;
    end(sessionId: string, dto: EndSessionDto): Promise<BleSession>;
    endAllActive(deviceId: string, reason: EndReason, manager?: EntityManager): Promise<number>;
}
