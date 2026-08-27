import './polyfill';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { existsSync, mkdirSync } from 'fs';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { LoggerService } from './logging/logger.service';
import { UPLOADS_DIR } from './uploads-path';

async function bootstrap() {
  // Ensure upload directory exists before Multer writes — missing folder
  // otherwise fails consent creates with opaque 500s on fresh cloud hosts.
  try {
    if (!existsSync(UPLOADS_DIR)) {
      mkdirSync(UPLOADS_DIR, { recursive: true });
    }
  } catch (e) {
    console.error('FATAL: cannot create uploads directory', UPLOADS_DIR, e);
    process.exit(1);
  }

  // Fail fast if critical env is missing — better than cryptic JWT 500s later.
  if (!process.env.JWT_SECRET?.trim()) {
    console.error('FATAL: JWT_SECRET is required');
    process.exit(1);
  }
  // Support Railway / standard Postgres env variables with fallbacks
  const dbHost = process.env.DB_HOST?.trim() || process.env.PGHOST?.trim();
  const dbUser = process.env.DB_USERNAME?.trim() || process.env.PGUSER?.trim();
  const dbPass = process.env.DB_PASSWORD?.trim() || process.env.PGPASSWORD?.trim();
  let dbName = process.env.DB_NAME?.trim() || process.env.PGDATABASE?.trim();

  if (dbName?.includes('/var/lib/postgresql') || dbName?.startsWith('/')) {
    dbName = process.env.PGDATABASE?.trim() || 'railway';
  }

  if (!dbHost || !dbUser || dbPass === undefined || !dbName) {
    console.error('FATAL: Database environment variables (DB_HOST/PGHOST, DB_USERNAME/PGUSER, DB_PASSWORD/PGPASSWORD, DB_NAME/PGDATABASE) are required');
    process.exit(1);
  }

  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  const appLog = app.get(LoggerService);

  // Log stray async failures; keep process up for orchestrated restart policies.
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
    // After an uncaught exception the process is undefined — exit so the
    // platform restarts a clean worker (preferred over continuing corrupted).
    setTimeout(() => process.exit(1), 250).unref?.();
  });

  app.use(helmet());
  app.enableCors({ origin: '*' });

  app.useStaticAssets(UPLOADS_DIR, {
    prefix: '/uploads',
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  app.setGlobalPrefix('api/v1');

  const config = new DocumentBuilder()
    .setTitle('Ascent.EN API')
    .setDescription('DTII Consent Management Platform — Phase 1 Demo')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT ?? 8080;
  await app.listen(port, '0.0.0.0');

  appLog.log(`API listening on port ${port}`, {
    service: 'bootstrap',
    eventType: 'SERVER_STARTED',
  });
  console.log(`✅ Ascent.EN API running on port ${port}`);
  console.log(`📚 Swagger docs: http://localhost:${port}/api/docs`);
  console.log(`📱 From phone use: http://192.168.x.x:${port}/api/v1`);
}

bootstrap().catch((err: Error) => {
  console.error('FATAL: Nest bootstrap failed', err?.stack ?? err);
  process.exit(1);
});
