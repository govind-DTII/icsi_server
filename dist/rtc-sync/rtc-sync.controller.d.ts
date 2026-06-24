import { RtcSyncService } from './rtc-sync.service';
import { RtcCorrectionDto } from './dto/log-rtc-correction.dto';
export declare class RtcSyncController {
    private readonly rtcSyncService;
    constructor(rtcSyncService: RtcSyncService);
    logCorrection(dto: RtcCorrectionDto): Promise<{
        success: boolean;
        event: import("./entities/rtc-sync-event.entity").RtcSyncEvent;
    }>;
}
