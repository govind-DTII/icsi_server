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
exports.BleDevicesService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const ble_device_entity_1 = require("../entities/ble-device.entity");
const ble_characteristic_entity_1 = require("../entities/ble-characteristic.entity");
const device_assignment_entity_1 = require("../entities/device-assignment.entity");
const user_entity_1 = require("../entities/user.entity");
let BleDevicesService = class BleDevicesService {
    constructor(bleDeviceRepo, bleCharRepo, assignRepo, userRepo) {
        this.bleDeviceRepo = bleDeviceRepo;
        this.bleCharRepo = bleCharRepo;
        this.assignRepo = assignRepo;
        this.userRepo = userRepo;
    }
    async findAllForOperator(operatorId) {
        const assignments = await this.assignRepo.find({
            where: { operator: { id: operatorId }, isActive: true },
            relations: ['bleDevice', 'bleDevice.characteristics'],
        });
        return assignments.map((a) => a.bleDevice);
    }
    async findOne(deviceId) {
        const device = await this.bleDeviceRepo.findOne({
            where: { deviceId, isActive: true },
            relations: [
                'characteristics',
                'owner',
                'assignments',
                'assignments.operator',
            ],
        });
        if (!device)
            throw new common_1.NotFoundException(`Device ${deviceId} not found`);
        return device;
    }
    async getConfigForOperator(deviceId, operatorId) {
        const assignment = await this.assignRepo.findOne({
            where: {
                bleDevice: { deviceId },
                operator: { id: operatorId },
                isActive: true,
            },
            relations: [
                'bleDevice',
                'bleDevice.characteristics',
                'bleDevice.owner',
                'operator',
            ],
        });
        if (!assignment)
            throw new common_1.ForbiddenException(`No active assignment for device ${deviceId}`);
        const d = assignment.bleDevice;
        const charMap = {};
        for (const c of d.characteristics) {
            if (c.isActive)
                charMap[c.name] = c.uuid;
        }
        return {
            deviceId: d.deviceId,
            advertisementName: d.advertisementName,
            serviceUuid: d.serviceUuid,
            characteristics: charMap,
            protocolVersion: d.protocolVersion,
            bleVersion: d.bleVersion,
            tlsVersion: d.tlsVersion,
            timeouts: {
                disconnectSec: d.disconnectTimeoutSec,
                heartbeatSec: d.heartbeatIntervalSec,
                staleHeartbeatSec: d.staleHeartbeatSec,
                ackSec: d.ackTimeoutSec,
                maxRetries: d.maxAckRetries,
                consentDecisionSec: d.consentDecisionTimeoutSec,
                consentExpiryMs: d.consentExpiryMs,
                hidInjectWindowSec: d.hidInjectWindowSec,
                rtcDriftThresholdSec: d.rtcDriftThresholdSec,
                maxPacketBytes: d.maxPacketBytes,
            },
            ownerInfo: d.owner ? { id: d.owner.id, name: d.owner.name } : null,
            operatorInfo: {
                id: assignment.operator.id,
                name: assignment.operator.name,
            },
        };
    }
    async updateStatus(deviceId, status) {
        const device = await this.bleDeviceRepo.findOne({ where: { deviceId } });
        if (!device)
            throw new common_1.NotFoundException(`Device ${deviceId} not found`);
        if (status.isPaired !== undefined)
            device.isPaired = status.isPaired;
        if (status.rssi !== undefined)
            device.rssi = status.rssi;
        if (status.batteryPct !== undefined)
            device.batteryPct = status.batteryPct;
        device.lastSeenAt = new Date();
        return this.bleDeviceRepo.save(device);
    }
    async assignOperator(deviceId, operatorId, assignedBy) {
        const device = await this.bleDeviceRepo.findOne({ where: { deviceId } });
        if (!device)
            throw new common_1.NotFoundException(`Device ${deviceId} not found`);
        const operator = await this.userRepo.findOne({ where: { id: operatorId } });
        if (!operator)
            throw new common_1.NotFoundException('Operator not found');
        const existing = await this.assignRepo.findOne({
            where: {
                bleDevice: { deviceId },
                operator: { id: operatorId },
                isActive: true,
            },
            relations: ['bleDevice', 'operator'],
        });
        if (existing)
            return existing;
        const assignment = this.assignRepo.create({
            bleDevice: device,
            operator,
            isActive: true,
            assignedBy,
        });
        return this.assignRepo.save(assignment);
    }
    async removeOperator(deviceId, operatorId) {
        const assignment = await this.assignRepo.findOne({
            where: {
                bleDevice: { deviceId },
                operator: { id: operatorId },
                isActive: true,
            },
            relations: ['bleDevice', 'operator'],
        });
        if (!assignment)
            throw new common_1.NotFoundException('Assignment not found');
        assignment.isActive = false;
        await this.assignRepo.save(assignment);
    }
};
exports.BleDevicesService = BleDevicesService;
exports.BleDevicesService = BleDevicesService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(ble_device_entity_1.BleDevice)),
    __param(1, (0, typeorm_1.InjectRepository)(ble_characteristic_entity_1.BleCharacteristic)),
    __param(2, (0, typeorm_1.InjectRepository)(device_assignment_entity_1.DeviceAssignment)),
    __param(3, (0, typeorm_1.InjectRepository)(user_entity_1.User)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository])
], BleDevicesService);
//# sourceMappingURL=ble-devices.service.js.map