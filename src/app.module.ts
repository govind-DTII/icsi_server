import { Module } from '@nestjs/common';
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { DevicesModule } from './devices/devices.module';
import { ConsentModule } from './consent/consent.module';
import { NotificationsModule } from './notifications/notifications.module';
import { AuditModule } from './audit/audit.module';
import { BleDevicesModule } from './ble-devices/ble-devices.module';
import { SessionsModule } from './sessions/sessions.module';
import { TamperModule } from './tamper/tamper.module';
import { BleEventsModule } from './ble-events/ble-events.module';
import { RtcSyncModule } from './rtc-sync/rtc-sync.module';
import { LoggerModule } from './logging/logger.module';
import { RequestLoggingInterceptor } from './logging/request-logging.interceptor';
import { AllExceptionsFilter } from './logging/all-exceptions.filter';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    LoggerModule,
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.get('DB_HOST'),
        port: parseInt(config.get('DB_PORT') ?? '5432'),
        username: config.get('DB_USERNAME'),
        password: config.get('DB_PASSWORD'),
        database: config.get('DB_NAME'),
        autoLoadEntities: true,
        // Never auto-alter schema in production — apply SQL from
        // CLOUD_DEPLOY_SER.md instead. Local/dev may synchronize.
        synchronize:
          (config.get('NODE_ENV') ?? 'development') !== 'production' &&
          config.get('DB_SYNCHRONIZE') !== 'false',
        logging: config.get('NODE_ENV') === 'development',
      }),
      inject: [ConfigService],
    }),
    AuthModule,
    UsersModule,
    DevicesModule,
    ConsentModule,
    NotificationsModule,
    AuditModule,
    BleDevicesModule,
    SessionsModule,
    TamperModule,
    BleEventsModule,
    RtcSyncModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    { provide: APP_INTERCEPTOR, useClass: RequestLoggingInterceptor },
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
  ],
})
export class AppModule {}
