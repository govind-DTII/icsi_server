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
exports.BleEventsService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const ble_event_audit_entity_1 = require("./entities/ble-event-audit.entity");
let BleEventsService = class BleEventsService {
    constructor(eventRepo) {
        this.eventRepo = eventRepo;
    }
    async recordEvent(dto) {
        const event = this.eventRepo.create({
            sessionId: dto.sessionId,
            consentId: dto.consentId,
            txn: dto.txn,
            eventType: dto.eventType,
            direction: dto.direction,
            payloadSummary: dto.payloadSummary,
            errorCode: dto.errorCode,
            retryCount: dto.retryCount,
            deviceId: dto.deviceId,
            actorId: dto.actorId,
        });
        return this.eventRepo.save(event);
    }
    async listBySession(sessionId, limit = 100) {
        return this.eventRepo.find({
            where: { sessionId },
            order: { id: 'ASC' },
            take: limit,
        });
    }
    async listErrors(since, limit = 100) {
        return this.eventRepo.find({
            where: {
                errorCode: (0, typeorm_2.Not)((0, typeorm_2.IsNull)()),
                recordedAt: (0, typeorm_2.MoreThanOrEqual)(since),
            },
            order: { recordedAt: 'DESC' },
            take: limit,
        });
    }
    async listAudit(limit = 50, sessionId) {
        const events = await this.eventRepo.find({
            where: sessionId ? { sessionId } : {},
            order: { id: 'DESC' },
            take: limit,
        });
        return events.map((e) => this.toAuditView(e));
    }
    toAuditView(e) {
        return {
            id: `ble-${e.id}`,
            action: this.humanizeEventType(e.eventType),
            detail: this.summarize(e),
            type: 'ble',
            actorId: e.actorId ?? 'SYSTEM',
            actorRole: 'device',
            createdAt: e.recordedAt.toISOString(),
        };
    }
    humanizeEventType(eventType) {
        return eventType
            .toLowerCase()
            .split('_')
            .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w))
            .join(' ');
    }
    summarize(e) {
        const parts = [];
        if (e.direction)
            parts.push(e.direction);
        if (e.errorCode)
            parts.push(`err ${e.errorCode}`);
        if (e.retryCount != null)
            parts.push(`retries ${e.retryCount}`);
        if (e.deviceId)
            parts.push(e.deviceId);
        if (e.txn)
            parts.push(`txn ${e.txn}`);
        return parts.join(' · ');
    }
};
exports.BleEventsService = BleEventsService;
exports.BleEventsService = BleEventsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(ble_event_audit_entity_1.BleEventAudit)),
    __metadata("design:paramtypes", [typeorm_2.Repository])
], BleEventsService);
//# sourceMappingURL=ble-events.service.js.map