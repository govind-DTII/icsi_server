import { Global, Module } from '@nestjs/common';
import { LoggerService } from './logger.service';

/**
 * Global so any NestJS service can inject LoggerService without importing this
 * module. ConfigModule is already registered globally in AppModule, so
 * LoggerService's ConfigService dependency resolves without an explicit import.
 */
@Global()
@Module({
  providers: [LoggerService],
  exports: [LoggerService],
})
export class LoggerModule {}
