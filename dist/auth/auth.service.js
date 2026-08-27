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
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const jwt_1 = require("@nestjs/jwt");
const config_1 = require("@nestjs/config");
const crypto_1 = require("crypto");
const bcrypt = require("bcrypt");
const user_entity_1 = require("../entities/user.entity");
const audit_service_1 = require("../audit/audit.service");
const logger_service_1 = require("../logging/logger.service");
let AuthService = class AuthService {
    constructor(userRepo, jwtService, config, auditService, appLog) {
        this.userRepo = userRepo;
        this.jwtService = jwtService;
        this.config = config;
        this.auditService = auditService;
        this.appLog = appLog;
    }
    async login(dto) {
        const requestId = (0, crypto_1.randomUUID)();
        let user;
        const isDemoMode = this.config.get('DEMO_MODE') === 'true';
        if (isDemoMode) {
            user = await this.userRepo.findOne({
                where: { role: dto.role },
                order: { id: 'ASC' },
            });
        }
        else {
            if (!dto.email || !dto.password) {
                throw new common_1.UnauthorizedException('Email and password required');
            }
            user = await this.userRepo.findOne({ where: { email: dto.email } });
            if (!user || !(await bcrypt.compare(dto.password, user.passwordHash))) {
                throw new common_1.UnauthorizedException('Invalid credentials');
            }
        }
        if (!user)
            throw new common_1.UnauthorizedException('User not found');
        try {
            await this.auditService.log({
                action: `${user.name} login — JWT issued`,
                type: 'login',
                actorId: user.id,
                actorRole: user.role,
                actorName: user.name,
                detail: `Auth API · ${isDemoMode ? 'demo one-tap' : 'email+password'}`,
            });
        }
        catch (e) {
            this.appLog.error(`login audit failed: ${e}`, {
                service: 'auth',
                eventType: 'AUDIT_WRITE_FAILED',
                actorId: user.id,
            });
        }
        this.appLog.log('user login', {
            requestId,
            service: 'auth',
            eventType: 'LOGIN',
            actorId: user.id,
        });
        const payload = {
            sub: user.id,
            email: user.email,
            role: user.role,
            deviceId: user.deviceId,
            name: user.name,
        };
        return {
            token: this.jwtService.sign(payload),
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                role: user.role,
                deviceId: user.deviceId,
            },
        };
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(user_entity_1.User)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        jwt_1.JwtService,
        config_1.ConfigService,
        audit_service_1.AuditService,
        logger_service_1.LoggerService])
], AuthService);
//# sourceMappingURL=auth.service.js.map