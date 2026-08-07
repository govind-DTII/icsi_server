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
exports.AuditService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const audit_log_entity_1 = require("../entities/audit-log.entity");
let AuditService = class AuditService {
    constructor(auditRepo) {
        this.auditRepo = auditRepo;
    }
    async log(dto) {
        const c = dto.consentRequest;
        const entry = this.auditRepo.create({
            ...dto,
            consentId: dto.consentId ?? c?.consentId ?? c?.id,
            txn: dto.txn ?? c?.txnRef,
            sessionId: dto.sessionId ?? c?.sessionId,
            deviceId: dto.deviceId ?? c?.deviceId,
        });
        return this.auditRepo.save(entry);
    }
    async findAll(userId, role, filter, limit = 50) {
        const query = this.auditRepo
            .createQueryBuilder('log')
            .leftJoinAndSelect('log.consentRequest', 'consent')
            .orderBy('log.createdAt', 'DESC')
            .take(limit);
        if (filter && filter !== 'all') {
            if (filter === 'consent') {
                query.where('log.type IN (:...types)', {
                    types: ['approve', 'reject'],
                });
            }
            else if (filter === 'ble') {
                query.where('log.type = :type', { type: 'ble' });
            }
            else if (filter === 'auth') {
                query.where('log.type = :type', { type: 'login' });
            }
            else if (filter === 'ser') {
                query.where('log.document_name IS NOT NULL');
            }
        }
        return query.getMany();
    }
};
exports.AuditService = AuditService;
exports.AuditService = AuditService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(audit_log_entity_1.AuditLog)),
    __metadata("design:paramtypes", [typeorm_2.Repository])
], AuditService);
//# sourceMappingURL=audit.service.js.map