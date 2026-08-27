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
exports.BleDevicesController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const ble_devices_service_1 = require("./ble-devices.service");
const jwt_auth_guard_1 = require("../auth/jwt-auth.guard");
const roles_guard_1 = require("../auth/roles.guard");
let BleDevicesController = class BleDevicesController {
    constructor(service) {
        this.service = service;
    }
    async findAll(req) {
        return this.service.findAllForOperator(req.user.userId);
    }
    async findOne(deviceId) {
        return this.service.findOne(deviceId);
    }
    async getConfig(deviceId, req) {
        return this.service.getConfigForOperator(deviceId, req.user.userId);
    }
    async updateStatus(deviceId, body) {
        return this.service.updateStatus(deviceId, body);
    }
    async assignOperator(deviceId, body, req) {
        return this.service.assignOperator(deviceId, body.operatorId, req.user.userId);
    }
    async removeOperator(deviceId, operatorId) {
        await this.service.removeOperator(deviceId, operatorId);
        return { removed: true };
    }
};
exports.BleDevicesController = BleDevicesController;
__decorate([
    (0, common_1.Get)(),
    (0, swagger_1.ApiOperation)({ summary: 'List active BLE devices for current operator' }),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], BleDevicesController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)(':deviceId'),
    (0, swagger_1.ApiOperation)({ summary: 'Get single device with all characteristics' }),
    __param(0, (0, common_1.Param)('deviceId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], BleDevicesController.prototype, "findOne", null);
__decorate([
    (0, common_1.Get)(':deviceId/config'),
    (0, swagger_1.ApiOperation)({ summary: 'Get compact BLE config for Flutter provider' }),
    __param(0, (0, common_1.Param)('deviceId')),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], BleDevicesController.prototype, "getConfig", null);
__decorate([
    (0, common_1.Patch)(':deviceId/status'),
    (0, swagger_1.ApiOperation)({ summary: 'Update device paired/rssi/battery status' }),
    __param(0, (0, common_1.Param)('deviceId')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], BleDevicesController.prototype, "updateStatus", null);
__decorate([
    (0, common_1.Post)(':deviceId/assign'),
    (0, roles_guard_1.Roles)('owner'),
    (0, swagger_1.ApiOperation)({ summary: 'Assign operator to device (Owner only)' }),
    __param(0, (0, common_1.Param)('deviceId')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], BleDevicesController.prototype, "assignOperator", null);
__decorate([
    (0, common_1.Delete)(':deviceId/assign/:operatorId'),
    (0, roles_guard_1.Roles)('owner'),
    (0, swagger_1.ApiOperation)({ summary: 'Remove operator assignment (Owner only)' }),
    __param(0, (0, common_1.Param)('deviceId')),
    __param(1, (0, common_1.Param)('operatorId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], BleDevicesController.prototype, "removeOperator", null);
exports.BleDevicesController = BleDevicesController = __decorate([
    (0, common_1.Controller)('ble-devices'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiTags)('BLE Devices'),
    __metadata("design:paramtypes", [ble_devices_service_1.BleDevicesService])
], BleDevicesController);
//# sourceMappingURL=ble-devices.controller.js.map