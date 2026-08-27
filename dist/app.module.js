"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const core_1 = require("@nestjs/core");
const config_1 = require("@nestjs/config");
const typeorm_1 = require("@nestjs/typeorm");
const app_controller_1 = require("./app.controller");
const app_service_1 = require("./app.service");
const auth_module_1 = require("./auth/auth.module");
const users_module_1 = require("./users/users.module");
const devices_module_1 = require("./devices/devices.module");
const consent_module_1 = require("./consent/consent.module");
const notifications_module_1 = require("./notifications/notifications.module");
const audit_module_1 = require("./audit/audit.module");
const ble_devices_module_1 = require("./ble-devices/ble-devices.module");
const sessions_module_1 = require("./sessions/sessions.module");
const tamper_module_1 = require("./tamper/tamper.module");
const ble_events_module_1 = require("./ble-events/ble-events.module");
const rtc_sync_module_1 = require("./rtc-sync/rtc-sync.module");
const logger_module_1 = require("./logging/logger.module");
const request_logging_interceptor_1 = require("./logging/request-logging.interceptor");
const all_exceptions_filter_1 = require("./logging/all-exceptions.filter");
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            config_1.ConfigModule.forRoot({ isGlobal: true }),
            logger_module_1.LoggerModule,
            typeorm_1.TypeOrmModule.forRootAsync({
                imports: [config_1.ConfigModule],
                useFactory: (config) => ({
                    type: 'postgres',
                    host: config.get('DB_HOST'),
                    port: parseInt(config.get('DB_PORT') ?? '5432'),
                    username: config.get('DB_USERNAME'),
                    password: config.get('DB_PASSWORD'),
                    database: config.get('DB_NAME'),
                    autoLoadEntities: true,
                    synchronize: (config.get('NODE_ENV') ?? 'development') !== 'production' &&
                        config.get('DB_SYNCHRONIZE') !== 'false',
                    logging: config.get('NODE_ENV') === 'development',
                    retryAttempts: 10,
                    retryDelay: 3000,
                    extra: {
                        max: 20,
                        idleTimeoutMillis: 30000,
                        connectionTimeoutMillis: 10000,
                    },
                }),
                inject: [config_1.ConfigService],
            }),
            auth_module_1.AuthModule,
            users_module_1.UsersModule,
            devices_module_1.DevicesModule,
            consent_module_1.ConsentModule,
            notifications_module_1.NotificationsModule,
            audit_module_1.AuditModule,
            ble_devices_module_1.BleDevicesModule,
            sessions_module_1.SessionsModule,
            tamper_module_1.TamperModule,
            ble_events_module_1.BleEventsModule,
            rtc_sync_module_1.RtcSyncModule,
        ],
        controllers: [app_controller_1.AppController],
        providers: [
            app_service_1.AppService,
            { provide: core_1.APP_INTERCEPTOR, useClass: request_logging_interceptor_1.RequestLoggingInterceptor },
            { provide: core_1.APP_FILTER, useClass: all_exceptions_filter_1.AllExceptionsFilter },
        ],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map