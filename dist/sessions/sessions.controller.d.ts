import { SessionsService } from './sessions.service';
import { CreateSessionDto, EndSessionDto, UpdateSessionStateDto } from './dto/session.dto';
export declare class SessionsController {
    private readonly sessionsService;
    constructor(sessionsService: SessionsService);
    start(dto: CreateSessionDto): Promise<{
        success: boolean;
        session: import("./entities/ble-session.entity").BleSession;
    }>;
    getBySessionId(sessionId: string): Promise<{
        success: boolean;
        session: import("./entities/ble-session.entity").BleSession;
    }>;
    updateState(sessionId: string, dto: UpdateSessionStateDto): Promise<{
        success: boolean;
        session: import("./entities/ble-session.entity").BleSession;
    }>;
    end(sessionId: string, dto: EndSessionDto): Promise<{
        success: boolean;
        session: import("./entities/ble-session.entity").BleSession;
    }>;
}
