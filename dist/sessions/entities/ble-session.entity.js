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
exports.BleSession = void 0;
const typeorm_1 = require("typeorm");
let BleSession = class BleSession {
};
exports.BleSession = BleSession;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], BleSession.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'session_id', length: 64 }),
    __metadata("design:type", String)
], BleSession.prototype, "sessionId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'device_id', length: 32 }),
    __metadata("design:type", String)
], BleSession.prototype, "deviceId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'operator_id', length: 36 }),
    __metadata("design:type", String)
], BleSession.prototype, "operatorId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'owner_id', length: 36 }),
    __metadata("design:type", String)
], BleSession.prototype, "ownerId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'fw_version', length: 16, nullable: true }),
    __metadata("design:type", String)
], BleSession.prototype, "fwVersion", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'hw_version', length: 16, nullable: true }),
    __metadata("design:type", String)
], BleSession.prototype, "hwVersion", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'mac_address', length: 17, nullable: true }),
    __metadata("design:type", String)
], BleSession.prototype, "macAddress", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'ble_version', length: 16, nullable: true }),
    __metadata("design:type", String)
], BleSession.prototype, "bleVersion", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'tls_version', length: 16, nullable: true }),
    __metadata("design:type", String)
], BleSession.prototype, "tlsVersion", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 32, default: 'IDLE' }),
    __metadata("design:type", String)
], BleSession.prototype, "state", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'started_at', type: 'timestamptz', default: () => 'NOW()' }),
    __metadata("design:type", Date)
], BleSession.prototype, "startedAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'ended_at', type: 'timestamptz', nullable: true }),
    __metadata("design:type", Date)
], BleSession.prototype, "endedAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'ended_reason', length: 64, nullable: true }),
    __metadata("design:type", String)
], BleSession.prototype, "endedReason", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'created_at', type: 'timestamptz' }),
    __metadata("design:type", Date)
], BleSession.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)({ name: 'updated_at', type: 'timestamptz' }),
    __metadata("design:type", Date)
], BleSession.prototype, "updatedAt", void 0);
exports.BleSession = BleSession = __decorate([
    (0, typeorm_1.Index)('idx_ble_sessions_device_id', ['deviceId']),
    (0, typeorm_1.Index)('idx_ble_sessions_operator_id', ['operatorId']),
    (0, typeorm_1.Index)('idx_ble_sessions_active', ['state'], { where: '"ended_at" IS NULL' }),
    (0, typeorm_1.Index)('uq_ble_sessions_active_session_id', ['sessionId'], {
        unique: true,
        where: '"ended_at" IS NULL',
    }),
    (0, typeorm_1.Entity)('ble_sessions')
], BleSession);
//# sourceMappingURL=ble-session.entity.js.map