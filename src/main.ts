import './polyfill';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { LoggerService } from './logging/logger.service';

async function bootstrap() {
  // Ensure upload directory exists before Multer writes — missing folder
  // otherwise fails consent creates with opaque 500s on fresh cloud hosts.
  const uploadsDir = join(process.cwd(), 'uploads');
  if (!existsSync(uploadsDir)) {
    mkdirSync(uploadsDir, { recursive: true });
  }

  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Resolve the structured logger so startup + process-level errors land in the
  // same production log file as request/exception logs.
  const appLog = app.get(LoggerService);

  // Last-resort safety net: async errors thrown outside the Nest HTTP pipeline
  // (stray rejections, timers, event handlers) would otherwise vanish or crash
  // the process silently. Log them structurally so production can triage them.
  // Do NOT process.exit — keep the API process up for cloud health checks.
  process.on('unhandledRejection', (reason: unknown) => {
    const err = reason as Error;
    appLog.error(
      `unhandledRejection: ${err?.message ?? reason}\n${err?.stack ?? ''}`,
      { service: 'process', eventType: 'UNHANDLED_REJECTION' },
    );
  });
  process.on('uncaughtException', (err: Error) => {
    appLog.error(`uncaughtException: ${err?.message}\n${err?.stack ?? ''}`, {
      service: 'process',
      eventType: 'UNCAUGHT_EXCEPTION',
    });
  });

  // Security — TLS 1.3 enforced at infrastructure level
  app.use(helmet());
  app.enableCors({ origin: '*' }); // restrict in production

  // Serve uploaded files as static
  app.useStaticAssets(uploadsDir, {
    prefix: '/uploads',
  });

  // Validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  // Global API prefix
  app.setGlobalPrefix('api/v1');

  // Swagger documentation
  const config = new DocumentBuilder()
    .setTitle('Ascent.EN API')
    .setDescription('DTII Consent Management Platform — Phase 1 Demo')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT ?? 3000;
  await app.listen(port, '0.0.0.0');

  appLog.log(`API listening on port ${port}`, {
    service: 'bootstrap',
    eventType: 'SERVER_STARTED',
  });
  // Human-friendly console hints for local dev (URLs only, no app data).
  console.log(`✅ Ascent.EN API running on port ${port}`);
  console.log(`📚 Swagger docs: http://localhost:${port}/api/docs`);
  console.log(`📱 From phone use: http://192.168.x.x:${port}/api/v1`);
}

bootstrap().catch((err: Error) => {
  // Startup failures must be visible; exit so the process manager can restart.
  console.error('FATAL: Nest bootstrap failed', err?.stack ?? err);
  process.exit(1);
});
