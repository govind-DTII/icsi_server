import { Repository } from 'typeorm';
import { BleSession } from './entities/ble-session.entity';
import { DeviceIdentitySnapshot } from './entities/device-identity-snapshot.entity';
import { CreateSessionDto, EndReason, EndSessionDto, UpdateSessionStateDto } from './dto/session.dto';
export declare class SessionsService {
    private sessionRepo;
    private snapshotRepo;
    constructor(sessionRepo: Repository<BleSession>, snapshotRepo: Repository<DeviceIdentitySnapshot>);
    start(dto: CreateSessionDto): Promise<BleSession>;
    findBySessionId(sessionId: string): Promise<BleSession>;
    getActiveByDevice(deviceId: string): Promise<BleSession | null>;
    updateState(sessionId: string, dto: UpdateSessionStateDto): Promise<BleSession>;
    end(sessionId: string, dto: EndSessionDto): Promise<BleSession>;
    endAllActive(deviceId: string, reason: EndReason): Promise<number>;
}
