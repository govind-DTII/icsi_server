"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BleEventsModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const ble_event_audit_entity_1 = require("./entities/ble-event-audit.entity");
const ble_events_service_1 = require("./ble-events.service");
const ble_events_controller_1 = require("./ble-events.controller");
let BleEventsModule = class BleEventsModule {
};
exports.BleEventsModule = BleEventsModule;
exports.BleEventsModule = BleEventsModule = __decorate([
    (0, common_1.Module)({
        imports: [typeorm_1.TypeOrmModule.forFeature([ble_event_audit_entity_1.BleEventAudit])],
        providers: [ble_events_service_1.BleEventsService],
        controllers: [ble_events_controller_1.BleEventsController],
        exports: [ble_events_service_1.BleEventsService],
    })
], BleEventsModule);
//# sourceMappingURL=ble-events.module.js.map