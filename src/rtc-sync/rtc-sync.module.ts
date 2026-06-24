import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RtcSyncEvent } from './entities/rtc-sync-event.entity';
import { RtcSyncService } from './rtc-sync.service';
import { RtcSyncController } from './rtc-sync.controller';

@Module({
  imports: [TypeOrmModule.forFeature([RtcSyncEvent])],
  providers: [RtcSyncService],
  controllers: [RtcSyncController],
  exports: [RtcSyncService],
})
export class RtcSyncModule {}
