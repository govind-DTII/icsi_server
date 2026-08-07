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
exports.BleDevice = void 0;
const typeorm_1 = require("typeorm");
const user_entity_1 = require("./user.entity");
const ble_characteristic_entity_1 = require("./ble-characteristic.entity");
const device_assignment_entity_1 = require("./device-assignment.entity");
let BleDevice = class BleDevice {
};
exports.BleDevice = BleDevice;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], BleDevice.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ unique: true }),
    __metadata("design:type", String)
], BleDevice.prototype, "deviceId", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], BleDevice.prototype, "deviceName", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], BleDevice.prototype, "macAddress", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], BleDevice.prototype, "serviceUuid", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: '5.0' }),
    __metadata("design:type", String)
], BleDevice.prototype, "bleVersion", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: '1.3' }),
    __metadata("design:type", String)
], BleDevice.prototype, "tlsVersion", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], BleDevice.prototype, "firmwareVersion", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: 'DTI001' }),
    __metadata("design:type", String)
], BleDevice.prototype, "advertisementName", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: false }),
    __metadata("design:type", Boolean)
], BleDevice.prototype, "isPaired", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: true }),
    __metadata("design:type", Boolean)
], BleDevice.prototype, "isActive", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", Date)
], BleDevice.prototype, "lastSeenAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], BleDevice.prototype, "rssi", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", Number)
], BleDevice.prototype, "batteryPct", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: '1.0' }),
    __metadata("design:type", String)
], BleDevice.prototype, "protocolVersion", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: 90 }),
    __metadata("design:type", Number)
], BleDevice.prototype, "disconnectTimeoutSec", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: 10 }),
    __metadata("design:type", Number)
], BleDevice.prototype, "heartbeatIntervalSec", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: 25 }),
    __metadata("design:type", Number)
], BleDevice.prototype, "staleHeartbeatSec", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: 10 }),
    __metadata("design:type", Number)
], BleDevice.prototype, "ackTimeoutSec", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: 3 }),
    __metadata("design:type", Number)
], BleDevice.prototype, "maxAckRetries", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: 120 }),
    __metadata("design:type", Number)
], BleDevice.prototype, "consentDecisionNormalSec", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: 60 }),
    __metadata("design:type", Number)
], BleDevice.prototype, "consentDecisionHighSec", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: 60 }),
    __metadata("design:type", Number)
], BleDevice.prototype, "hidInjectWindowSec", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: 30 }),
    __metadata("design:type", Number)
], BleDevice.prototype, "rtcDriftThresholdSec", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: 247 }),
    __metadata("design:type", Number)
], BleDevice.prototype, "maxPacketBytes", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => user_entity_1.User, { nullable: true }),
    __metadata("design:type", user_entity_1.User)
], BleDevice.prototype, "owner", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => ble_characteristic_entity_1.BleCharacteristic, (c) => c.bleDevice),
    __metadata("design:type", Array)
], BleDevice.prototype, "characteristics", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => device_assignment_entity_1.DeviceAssignment, (a) => a.bleDevice),
    __metadata("design:type", Array)
], BleDevice.prototype, "assignments", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], BleDevice.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)(),
    __metadata("design:type", Date)
], BleDevice.prototype, "updatedAt", void 0);
exports.BleDevice = BleDevice = __decorate([
    (0, typeorm_1.Entity)('ble_devices')
], BleDevice);
//# sourceMappingURL=ble-device.entity.js.map