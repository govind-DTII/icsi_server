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
Object.defineProperty(exports, "__esModule", { value: true });
exports.RtcSyncEvent = void 0;
const typeorm_1 = require("typeorm");
let RtcSyncEvent = class RtcSyncEvent {
};
exports.RtcSyncEvent = RtcSyncEvent;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], RtcSyncEvent.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'device_id', length: 32 }),
    __metadata("design:type", String)
], RtcSyncEvent.prototype, "deviceId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'session_id', length: 64, nullable: true }),
    __metadata("design:type", String)
], RtcSyncEvent.prototype, "sessionId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'operator_id', length: 36 }),
    __metadata("design:type", String)
], RtcSyncEvent.prototype, "operatorId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'old_timestamp_ms', type: 'bigint' }),
    __metadata("design:type", Number)
], RtcSyncEvent.prototype, "oldTimestampMs", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'new_timestamp_ms', type: 'bigint' }),
    __metadata("design:type", Number)
], RtcSyncEvent.prototype, "newTimestampMs", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'drift_ms', type: 'bigint' }),
    __metadata("design:type", Number)
], RtcSyncEvent.prototype, "driftMs", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'corrected_at', type: 'timestamptz', default: () => 'NOW()' }),
    __metadata("design:type", Date)
], RtcSyncEvent.prototype, "correctedAt", void 0);
exports.RtcSyncEvent = RtcSyncEvent = __decorate([
    (0, typeorm_1.Index)('idx_rtc_sync_events_device_id', ['deviceId']),
    (0, typeorm_1.Entity)('rtc_sync_events')
], RtcSyncEvent);
//# sourceMappingURL=rtc-sync-event.entity.js.map