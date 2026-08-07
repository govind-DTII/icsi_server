"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("./polyfill");
const core_1 = require("@nestjs/core");
const path_1 = require("path");
const app_module_1 = require("./app.module");
const common_1 = require("@nestjs/common");
const helmet_1 = require("helmet");
const swagger_1 = require("@nestjs/swagger");
const logger_service_1 = require("./logging/logger.service");
async function bootstrap() {
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
    });
    app.use((0, helmet_1.default)());
    app.enableCors({ origin: '*' });
    app.useStaticAssets((0, path_1.join)(process.cwd(), 'uploads'), {
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
bootstrap();
//# sourceMappingURL=main.js.map