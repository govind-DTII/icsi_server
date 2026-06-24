import { Repository } from 'typeorm';
import { RtcSyncEvent } from './entities/rtc-sync-event.entity';
import { RtcCorrectionDto } from './dto/log-rtc-correction.dto';
export declare class RtcSyncService {
    private rtcRepo;
    constructor(rtcRepo: Repository<RtcSyncEvent>);
    logCorrection(dto: RtcCorrectionDto): Promise<RtcSyncEvent>;
}
