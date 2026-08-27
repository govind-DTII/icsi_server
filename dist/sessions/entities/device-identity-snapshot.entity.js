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
exports.DeviceIdentitySnapshot = void 0;
const typeorm_1 = require("typeorm");
let DeviceIdentitySnapshot = class DeviceIdentitySnapshot {
};
exports.DeviceIdentitySnapshot = DeviceIdentitySnapshot;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], DeviceIdentitySnapshot.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'session_id', length: 64 }),
    __metadata("design:type", String)
], DeviceIdentitySnapshot.prototype, "sessionId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'device_id', length: 32 }),
    __metadata("design:type", String)
], DeviceIdentitySnapshot.prototype, "deviceId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'mac_address', length: 17, nullable: true }),
    __metadata("design:type", String)
], DeviceIdentitySnapshot.prototype, "macAddress", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'owner_id', length: 36, nullable: true }),
    __metadata("design:type", String)
], DeviceIdentitySnapshot.prototype, "ownerId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'fw_version', length: 16, nullable: true }),
    __metadata("design:type", String)
], DeviceIdentitySnapshot.prototype, "fwVersion", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'hw_version', length: 16, nullable: true }),
    __metadata("design:type", String)
], DeviceIdentitySnapshot.prototype, "hwVersion", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'ble_version', length: 16, nullable: true }),
    __metadata("design:type", String)
], DeviceIdentitySnapshot.prototype, "bleVersion", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'tls_version', length: 16, nullable: true }),
    __metadata("design:type", String)
], DeviceIdentitySnapshot.prototype, "tlsVersion", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'recorded_at', type: 'timestamptz', default: () => 'NOW()' }),
    __metadata("design:type", Date)
], DeviceIdentitySnapshot.prototype, "recordedAt", void 0);
exports.DeviceIdentitySnapshot = DeviceIdentitySnapshot = __decorate([
    (0, typeorm_1.Index)('idx_device_identity_snapshots_session_id', ['sessionId']),
    (0, typeorm_1.Entity)('device_identity_snapshots')
], DeviceIdentitySnapshot);
//# sourceMappingURL=device-identity-snapshot.entity.js.map