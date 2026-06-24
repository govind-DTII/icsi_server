"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TamperModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const tamper_event_entity_1 = require("./entities/tamper-event.entity");
const tamper_service_1 = require("./tamper.service");
const tamper_controller_1 = require("./tamper.controller");
const consent_module_1 = require("../consent/consent.module");
const sessions_module_1 = require("../sessions/sessions.module");
const ble_events_module_1 = require("../ble-events/ble-events.module");
let TamperModule = class TamperModule {
};
exports.TamperModule = TamperModule;
exports.TamperModule = TamperModule = __decorate([
    (0, common_1.Module)({
        imports: [
            typeorm_1.TypeOrmModule.forFeature([tamper_event_entity_1.TamperEvent]),
            consent_module_1.ConsentModule,
            sessions_module_1.SessionsModule,
            ble_events_module_1.BleEventsModule,
        ],
        providers: [tamper_service_1.TamperService],
        controllers: [tamper_controller_1.TamperController],
        exports: [tamper_service_1.TamperService],
    })
], TamperModule);
//# sourceMappingURL=tamper.module.js.map