import { Module } from '@nestjs/common';
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AutoSeedService } from './database/auto-seed.service';
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
      useFactory: (config: ConfigService) => {
        let dbName = config.get('DB_NAME') || config.get('PGDATABASE') || 'railway';
        if (dbName.includes('/var/lib/postgresql') || dbName.startsWith('/')) {
          dbName = config.get('PGDATABASE') || 'railway';
        }
        return {
          type: 'postgres',
          host: config.get('DB_HOST') || config.get('PGHOST') || 'localhost',
          port: parseInt(config.get('DB_PORT') || config.get('PGPORT') || '5432'),
          username: config.get('DB_USERNAME') || config.get('PGUSER') || 'postgres',
          password: config.get('DB_PASSWORD') || config.get('PGPASSWORD') || '',
          database: dbName,
          autoLoadEntities: true,
          synchronize:
            config.get('DB_SYNCHRONIZE') === 'true' ||
            ((config.get('NODE_ENV') ?? 'development') !== 'production' &&
              config.get('DB_SYNCHRONIZE') !== 'false'),
          logging: config.get('NODE_ENV') === 'development',
          retryAttempts: 10,
          retryDelay: 3000,
          extra: {
            max: 20,
            idleTimeoutMillis: 30000,
            connectionTimeoutMillis: 10000,
          },
        };
      },
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
    AutoSeedService,
    { provide: APP_INTERCEPTOR, useClass: RequestLoggingInterceptor },
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
  ],
})
export class AppModule {}
