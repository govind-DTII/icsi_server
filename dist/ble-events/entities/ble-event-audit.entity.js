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
exports.BleEventAudit = void 0;
const typeorm_1 = require("typeorm");
let BleEventAudit = class BleEventAudit {
};
exports.BleEventAudit = BleEventAudit;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('increment', { type: 'bigint' }),
    __metadata("design:type", String)
], BleEventAudit.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'session_id', length: 64, nullable: true }),
    __metadata("design:type", String)
], BleEventAudit.prototype, "sessionId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'consent_id', length: 64, nullable: true }),
    __metadata("design:type", String)
], BleEventAudit.prototype, "consentId", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 32, nullable: true }),
    __metadata("design:type", String)
], BleEventAudit.prototype, "txn", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'event_type', length: 48 }),
    __metadata("design:type", String)
], BleEventAudit.prototype, "eventType", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 16, nullable: true }),
    __metadata("design:type", String)
], BleEventAudit.prototype, "direction", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'payload_summary', type: 'jsonb', nullable: true }),
    __metadata("design:type", Object)
], BleEventAudit.prototype, "payloadSummary", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'error_code', length: 32, nullable: true }),
    __metadata("design:type", String)
], BleEventAudit.prototype, "errorCode", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'retry_count', type: 'int', nullable: true }),
    __metadata("design:type", Number)
], BleEventAudit.prototype, "retryCount", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'device_id', length: 32, nullable: true }),
    __metadata("design:type", String)
], BleEventAudit.prototype, "deviceId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'actor_id', length: 36, nullable: true }),
    __metadata("design:type", String)
], BleEventAudit.prototype, "actorId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'recorded_at', type: 'timestamptz', default: () => 'NOW()' }),
    __metadata("design:type", Date)
], BleEventAudit.prototype, "recordedAt", void 0);
exports.BleEventAudit = BleEventAudit = __decorate([
    (0, typeorm_1.Index)('idx_ble_event_audit_session_id', ['sessionId']),
    (0, typeorm_1.Index)('idx_ble_event_audit_consent_id', ['consentId']),
    (0, typeorm_1.Index)('idx_ble_event_audit_device_id', ['deviceId']),
    (0, typeorm_1.Index)('idx_ble_event_audit_recorded_at', ['recordedAt']),
    (0, typeorm_1.Index)('idx_ble_event_audit_errors', ['errorCode'], {
        where: '"error_code" IS NOT NULL',
    }),
    (0, typeorm_1.Entity)('ble_event_audit')
], BleEventAudit);
//# sourceMappingURL=ble-event-audit.entity.js.map