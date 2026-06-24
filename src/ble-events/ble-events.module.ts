import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BleEventAudit } from './entities/ble-event-audit.entity';
import { BleEventsService } from './ble-events.service';
import { BleEventsController } from './ble-events.controller';

@Module({
  imports: [TypeOrmModule.forFeature([BleEventAudit])],
  providers: [BleEventsService],
  controllers: [BleEventsController],
  exports: [BleEventsService],
})
export class BleEventsModule {}
