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
exports.TamperService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const tamper_event_entity_1 = require("./entities/tamper-event.entity");
const consent_service_1 = require("../consent/consent.service");
const sessions_service_1 = require("../sessions/sessions.service");
const session_dto_1 = require("../sessions/dto/session.dto");
const ble_events_service_1 = require("../ble-events/ble-events.service");
let TamperService = class TamperService {
    constructor(tamperRepo, consentService, sessionsService, bleEventsService) {
        this.tamperRepo = tamperRepo;
        this.consentService = consentService;
        this.sessionsService = sessionsService;
        this.bleEventsService = bleEventsService;
    }
    async log(dto) {
        const event = this.tamperRepo.create({
            deviceId: dto.deviceId,
            sessionId: dto.sessionId,
            consentId: dto.consentId,
            detectedAt: new Date(dto.detectedAt),
            reportedBy: dto.reportedBy,
            notes: dto.notes,
        });
        await this.tamperRepo.save(event);
        if (dto.consentId) {
            await this.consentService.markAborted(dto.consentId, 'TAMPER_DETECTED');
        }
        await this.sessionsService.endAllActive(dto.deviceId, session_dto_1.EndReason.TAMPER);
        await this.bleEventsService.recordEvent({
            eventType: 'TAMPER_DETECTED',
            direction: 'FW_TO_APP',
            sessionId: dto.sessionId,
            consentId: dto.consentId,
            payloadSummary: { reportedBy: dto.reportedBy },
        });
        return event;
    }
    async findUnresolvedForDevice(deviceId) {
        return this.tamperRepo.find({
            where: { deviceId, resolved: false },
            order: { detectedAt: 'DESC' },
        });
    }
    async markResolved(id, notes) {
        const event = await this.tamperRepo.findOne({ where: { id } });
        if (!event)
            throw new common_1.NotFoundException(`Tamper event ${id} not found`);
        event.resolved = true;
        event.resolvedAt = new Date();
        if (notes !== undefined)
            event.notes = notes;
        return this.tamperRepo.save(event);
    }
};
exports.TamperService = TamperService;
exports.TamperService = TamperService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(tamper_event_entity_1.TamperEvent)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        consent_service_1.ConsentService,
        sessions_service_1.SessionsService,
        ble_events_service_1.BleEventsService])
], TamperService);
//# sourceMappingURL=tamper.service.js.map