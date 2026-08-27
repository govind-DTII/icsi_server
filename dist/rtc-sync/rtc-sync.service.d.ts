import { Repository } from 'typeorm';
import { RtcSyncEvent } from './entities/rtc-sync-event.entity';
import { RtcCorrectionDto } from './dto/log-rtc-correction.dto';
import { LoggerService } from '../logging/logger.service';
export declare class RtcSyncService {
    private rtcRepo;
    private readonly appLog;
    constructor(rtcRepo: Repository<RtcSyncEvent>, appLog: LoggerService);
    logCorrection(dto: RtcCorrectionDto): Promise<RtcSyncEvent>;
}
