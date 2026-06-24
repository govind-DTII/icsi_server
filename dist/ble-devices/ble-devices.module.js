"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BleDevicesModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const ble_device_entity_1 = require("../entities/ble-device.entity");
const ble_characteristic_entity_1 = require("../entities/ble-characteristic.entity");
const device_assignment_entity_1 = require("../entities/device-assignment.entity");
const user_entity_1 = require("../entities/user.entity");
const ble_devices_service_1 = require("./ble-devices.service");
const ble_devices_controller_1 = require("./ble-devices.controller");
let BleDevicesModule = class BleDevicesModule {
};
exports.BleDevicesModule = BleDevicesModule;
exports.BleDevicesModule = BleDevicesModule = __decorate([
    (0, common_1.Module)({
        imports: [
            typeorm_1.TypeOrmModule.forFeature([
                ble_device_entity_1.BleDevice,
                ble_characteristic_entity_1.BleCharacteristic,
                device_assignment_entity_1.DeviceAssignment,
                user_entity_1.User,
            ]),
        ],
        providers: [ble_devices_service_1.BleDevicesService],
        controllers: [ble_devices_controller_1.BleDevicesController],
        exports: [ble_devices_service_1.BleDevicesService],
    })
], BleDevicesModule);
//# sourceMappingURL=ble-devices.module.js.map