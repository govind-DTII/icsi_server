"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("./polyfill");
const core_1 = require("@nestjs/core");
const fs_1 = require("fs");
const app_module_1 = require("./app.module");
const common_1 = require("@nestjs/common");
const helmet_1 = require("helmet");
const swagger_1 = require("@nestjs/swagger");
const logger_service_1 = require("./logging/logger.service");
const uploads_path_1 = require("./uploads-path");
async function bootstrap() {
    try {
        if (!(0, fs_1.existsSync)(uploads_path_1.UPLOADS_DIR)) {
            (0, fs_1.mkdirSync)(uploads_path_1.UPLOADS_DIR, { recursive: true });
        }
    }
    catch (e) {
        console.error('FATAL: cannot create uploads directory', uploads_path_1.UPLOADS_DIR, e);
        process.exit(1);
    }
    if (!process.env.JWT_SECRET?.trim()) {
        console.error('FATAL: JWT_SECRET is required');
        process.exit(1);
    }
    for (const key of ['DB_HOST', 'DB_USERNAME', 'DB_PASSWORD', 'DB_NAME']) {
        if (!process.env[key]?.trim()) {
            console.error(`FATAL: ${key} is required`);
            process.exit(1);
        }
    }
    const app = await core_1.NestFactory.create(app_module_1.AppModule);
    const appLog = app.get(logger_service_1.LoggerService);
    process.on('unhandledRejection', (reason) => {
        const err = reason;
        appLog.error(`unhandledRejection: ${err?.message ?? reason}\n${err?.stack ?? ''}`, { service: 'process', eventType: 'UNHANDLED_REJECTION' });
    });
    process.on('uncaughtException', (err) => {
        appLog.error(`uncaughtException: ${err?.message}\n${err?.stack ?? ''}`, {
            service: 'process',
            eventType: 'UNCAUGHT_EXCEPTION',
        });
        setTimeout(() => process.exit(1), 250).unref?.();
    });
    app.use((0, helmet_1.default)());
    app.enableCors({ origin: '*' });
    app.useStaticAssets(uploads_path_1.UPLOADS_DIR, {
        prefix: '/uploads',
    });
    app.useGlobalPipes(new common_1.ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
    }));
    app.setGlobalPrefix('api/v1');
    const config = new swagger_1.DocumentBuilder()
        .setTitle('Ascent.EN API')
        .setDescription('DTII Consent Management Platform — Phase 1 Demo')
        .setVersion('1.0')
        .addBearerAuth()
        .build();
    const document = swagger_1.SwaggerModule.createDocument(app, config);
    swagger_1.SwaggerModule.setup('api/docs', app, document);
    const port = process.env.PORT ?? 3000;
    await app.listen(port, '0.0.0.0');
    appLog.log(`API listening on port ${port}`, {
        service: 'bootstrap',
        eventType: 'SERVER_STARTED',
    });
    console.log(`✅ Ascent.EN API running on port ${port}`);
    console.log(`📚 Swagger docs: http://localhost:${port}/api/docs`);
    console.log(`📱 From phone use: http://192.168.x.x:${port}/api/v1`);
}
bootstrap().catch((err) => {
    console.error('FATAL: Nest bootstrap failed', err?.stack ?? err);
    process.exit(1);
});
//# sourceMappingURL=main.js.map