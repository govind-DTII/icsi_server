"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RtcSyncService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const rtc_sync_event_entity_1 = require("./entities/rtc-sync-event.entity");
let RtcSyncService = class RtcSyncService {
    constructor(rtcRepo) {
        this.rtcRepo = rtcRepo;
    }
    async logCorrection(dto) {
        const event = this.rtcRepo.create({
            deviceId: dto.deviceId,
            sessionId: dto.sessionId,
            operatorId: dto.operatorId,
            oldTimestampMs: dto.oldTimestampMs,
            newTimestampMs: dto.newTimestampMs,
            driftMs: Math.abs(dto.newTimestampMs - dto.oldTimestampMs),
        });
        return this.rtcRepo.save(event);
    }
};
exports.RtcSyncService = RtcSyncService;
exports.RtcSyncService = RtcSyncService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(rtc_sync_event_entity_1.RtcSyncEvent)),
    __metadata("design:paramtypes", [typeorm_2.Repository])
], RtcSyncService);
//# sourceMappingURL=rtc-sync.service.js.map