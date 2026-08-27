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
exports.DevicesService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const device_entity_1 = require("../entities/device.entity");
const user_entity_1 = require("../entities/user.entity");
let DevicesService = class DevicesService {
    constructor(deviceRepo, userRepo) {
        this.deviceRepo = deviceRepo;
        this.userRepo = userRepo;
    }
    async register(userId, dto) {
        const user = await this.userRepo.findOne({ where: { id: userId } });
        if (!user)
            throw new common_1.NotFoundException('User not found');
        if (dto.fcmToken)
            user.fcmToken = dto.fcmToken;
        if (dto.apnsToken)
            user.apnsToken = dto.apnsToken;
        user.platform = dto.platform;
        await this.userRepo.save(user);
        const device = await this.deviceRepo.findOne({
            where: { owner: { id: userId }, deviceName: user.deviceId ?? 'DT1001' },
            relations: ['owner'],
        });
        return {
            deviceId: user.deviceId ?? device?.deviceName ?? 'DT1001',
            registered: true,
            platform: dto.platform,
        };
    }
    async findByOwner(userId) {
        const devices = await this.deviceRepo.find({
            where: { owner: { id: userId } },
            relations: ['owner'],
        });
        return devices.map((d) => {
            if (d.owner) {
                const { passwordHash, ...safeOwner } = d.owner;
                d.owner = safeOwner;
            }
            return d;
        });
    }
};
exports.DevicesService = DevicesService;
exports.DevicesService = DevicesService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(device_entity_1.Device)),
    __param(1, (0, typeorm_1.InjectRepository)(user_entity_1.User)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository])
], DevicesService);
//# sourceMappingURL=devices.service.js.map