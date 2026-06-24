import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RtcSyncEvent } from './entities/rtc-sync-event.entity';
import { RtcCorrectionDto } from './dto/log-rtc-correction.dto';
import { LoggerService } from '../logging/logger.service';

@Injectable()
export class RtcSyncService {
  constructor(
    @InjectRepository(RtcSyncEvent)
    private rtcRepo: Repository<RtcSyncEvent>,
    private readonly appLog: LoggerService,
  ) {}

  async logCorrection(dto: RtcCorrectionDto): Promise<RtcSyncEvent> {
    const driftMs = Math.abs(dto.newTimestampMs - dto.oldTimestampMs);
    const event = this.rtcRepo.create({
      deviceId: dto.deviceId,
      sessionId: dto.sessionId,
      operatorId: dto.operatorId,
      oldTimestampMs: dto.oldTimestampMs,
      newTimestampMs: dto.newTimestampMs,
      driftMs,
    });
    const saved = await this.rtcRepo.save(event);
    this.appLog.log(`rtc corrected (drift ${driftMs}ms)`, {
      service: 'rtc-sync',
      eventType: 'RTC_CORRECTED',
      deviceId: dto.deviceId,
      sessionId: dto.sessionId,
      actorId: dto.operatorId,
    });
    return saved;
  }
}
