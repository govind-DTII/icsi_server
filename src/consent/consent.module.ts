import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConsentRequest } from '../entities/consent-request.entity';
import { User } from '../entities/user.entity';
import { BleDevice } from '../entities/ble-device.entity';
import { DeviceAssignment } from '../entities/device-assignment.entity';
import { AuditModule } from '../audit/audit.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { AuthModule } from '../auth/auth.module';
import { BleEventsModule } from '../ble-events/ble-events.module';
import { SessionsModule } from '../sessions/sessions.module';
import { ConsentService } from './consent.service';
import { ConsentController } from './consent.controller';
import { ConsentRequestController } from './consent-request.controller';
import { ConsentResponseController } from './consent-response.controller';

@Module({
  imports: [
    MulterModule.register({ dest: './uploads' }),
    TypeOrmModule.forFeature([
      ConsentRequest,
      User,
      BleDevice,
      DeviceAssignment,
    ]),
    AuditModule,
    NotificationsModule,
    AuthModule,
    BleEventsModule,
    SessionsModule,
  ],
  providers: [ConsentService],
  controllers: [
    ConsentController,
    ConsentRequestController,
    ConsentResponseController,
  ],
  exports: [ConsentService],
})
export class ConsentModule {}
