import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TamperEvent } from './entities/tamper-event.entity';
import { TamperService } from './tamper.service';
import { TamperController } from './tamper.controller';
import { ConsentModule } from '../consent/consent.module';
import { SessionsModule } from '../sessions/sessions.module';
import { BleEventsModule } from '../ble-events/ble-events.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([TamperEvent]),
    ConsentModule,
    SessionsModule,
    BleEventsModule,
  ],
  providers: [TamperService],
  controllers: [TamperController],
  exports: [TamperService],
})
export class TamperModule {}
