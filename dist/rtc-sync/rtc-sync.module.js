"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RtcSyncModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const rtc_sync_event_entity_1 = require("./entities/rtc-sync-event.entity");
const rtc_sync_service_1 = require("./rtc-sync.service");
const rtc_sync_controller_1 = require("./rtc-sync.controller");
let RtcSyncModule = class RtcSyncModule {
};
exports.RtcSyncModule = RtcSyncModule;
exports.RtcSyncModule = RtcSyncModule = __decorate([
    (0, common_1.Module)({
        imports: [typeorm_1.TypeOrmModule.forFeature([rtc_sync_event_entity_1.RtcSyncEvent])],
        providers: [rtc_sync_service_1.RtcSyncService],
        controllers: [rtc_sync_controller_1.RtcSyncController],
        exports: [rtc_sync_service_1.RtcSyncService],
    })
], RtcSyncModule);
//# sourceMappingURL=rtc-sync.module.js.map