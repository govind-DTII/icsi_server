import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BleSession } from './entities/ble-session.entity';
import { DeviceIdentitySnapshot } from './entities/device-identity-snapshot.entity';
import { SessionsService } from './sessions.service';
import { SessionsController } from './sessions.controller';
import { BleEventsModule } from '../ble-events/ble-events.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([BleSession, DeviceIdentitySnapshot]),
    BleEventsModule,
  ],
  providers: [SessionsService],
  controllers: [SessionsController],
  exports: [SessionsService],
})
export class SessionsModule {}
