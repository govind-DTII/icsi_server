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
exports.BleCharacteristic = void 0;
const typeorm_1 = require("typeorm");
const ble_device_entity_1 = require("./ble-device.entity");
let BleCharacteristic = class BleCharacteristic {
};
exports.BleCharacteristic = BleCharacteristic;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], BleCharacteristic.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], BleCharacteristic.prototype, "name", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], BleCharacteristic.prototype, "uuid", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], BleCharacteristic.prototype, "shortCode", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], BleCharacteristic.prototype, "properties", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], BleCharacteristic.prototype, "direction", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], BleCharacteristic.prototype, "purpose", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: true }),
    __metadata("design:type", Boolean)
], BleCharacteristic.prototype, "isActive", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => ble_device_entity_1.BleDevice, (d) => d.characteristics),
    __metadata("design:type", ble_device_entity_1.BleDevice)
], BleCharacteristic.prototype, "bleDevice", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], BleCharacteristic.prototype, "createdAt", void 0);
exports.BleCharacteristic = BleCharacteristic = __decorate([
    (0, typeorm_1.Entity)('ble_characteristics')
], BleCharacteristic);
//# sourceMappingURL=ble-characteristic.entity.js.map