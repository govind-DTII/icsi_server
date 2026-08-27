"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConsentModule = void 0;
const common_1 = require("@nestjs/common");
const platform_express_1 = require("@nestjs/platform-express");
const typeorm_1 = require("@nestjs/typeorm");
const consent_request_entity_1 = require("../entities/consent-request.entity");
const user_entity_1 = require("../entities/user.entity");
const ble_device_entity_1 = require("../entities/ble-device.entity");
const device_assignment_entity_1 = require("../entities/device-assignment.entity");
const audit_module_1 = require("../audit/audit.module");
const notifications_module_1 = require("../notifications/notifications.module");
const auth_module_1 = require("../auth/auth.module");
const ble_events_module_1 = require("../ble-events/ble-events.module");
const sessions_module_1 = require("../sessions/sessions.module");
const consent_service_1 = require("./consent.service");
const consent_controller_1 = require("./consent.controller");
const consent_request_controller_1 = require("./consent-request.controller");
const consent_response_controller_1 = require("./consent-response.controller");
const uploads_path_1 = require("../uploads-path");
let ConsentModule = class ConsentModule {
};
exports.ConsentModule = ConsentModule;
exports.ConsentModule = ConsentModule = __decorate([
    (0, common_1.Module)({
        imports: [
            platform_express_1.MulterModule.register({ dest: uploads_path_1.UPLOADS_DIR }),
            typeorm_1.TypeOrmModule.forFeature([
                consent_request_entity_1.ConsentRequest,
                user_entity_1.User,
                ble_device_entity_1.BleDevice,
                device_assignment_entity_1.DeviceAssignment,
            ]),
            audit_module_1.AuditModule,
            notifications_module_1.NotificationsModule,
            auth_module_1.AuthModule,
            ble_events_module_1.BleEventsModule,
            sessions_module_1.SessionsModule,
        ],
        providers: [consent_service_1.ConsentService],
        controllers: [
            consent_controller_1.ConsentController,
            consent_request_controller_1.ConsentRequestController,
            consent_response_controller_1.ConsentResponseController,
        ],
        exports: [consent_service_1.ConsentService],
    })
], ConsentModule);
//# sourceMappingURL=consent.module.js.map