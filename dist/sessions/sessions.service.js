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
exports.SessionsService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const ble_session_entity_1 = require("./entities/ble-session.entity");
const device_identity_snapshot_entity_1 = require("./entities/device-identity-snapshot.entity");
const session_dto_1 = require("./dto/session.dto");
const TRANSITIONS = {
    [session_dto_1.SessionState.IDLE]: [
        session_dto_1.SessionState.CONSENT_REQUESTED,
        session_dto_1.SessionState.SESSION_ENDING,
    ],
    [session_dto_1.SessionState.CONSENT_REQUESTED]: [
        session_dto_1.SessionState.CONSENT_ACTIVE,
        session_dto_1.SessionState.IDLE,
        session_dto_1.SessionState.SESSION_ENDING,
    ],
    [session_dto_1.SessionState.CONSENT_ACTIVE]: [
        session_dto_1.SessionState.CONSENT_COMPLETED,
        session_dto_1.SessionState.SESSION_ENDING,
    ],
    [session_dto_1.SessionState.CONSENT_COMPLETED]: [
        session_dto_1.SessionState.IDLE,
        session_dto_1.SessionState.SESSION_ENDING,
    ],
    [session_dto_1.SessionState.SESSION_ENDING]: [],
};
let SessionsService = class SessionsService {
    constructor(sessionRepo, snapshotRepo) {
        this.sessionRepo = sessionRepo;
        this.snapshotRepo = snapshotRepo;
    }
    async start(dto) {
        const active = await this.getActiveByDevice(dto.deviceId);
        if (active) {
            await this.end(active.sessionId, { reason: session_dto_1.EndReason.DISCONNECTED });
        }
        const session = this.sessionRepo.create({
            sessionId: dto.sessionId,
            deviceId: dto.deviceId,
            operatorId: dto.operatorId,
            ownerId: dto.ownerId,
            fwVersion: dto.fwVersion,
            hwVersion: dto.hwVersion,
            macAddress: dto.macAddress,
            bleVersion: dto.bleVersion,
            tlsVersion: dto.tlsVersion,
            state: session_dto_1.SessionState.IDLE,
        });
        const saved = await this.sessionRepo.save(session);
        if (dto.macAddress ||
            dto.fwVersion ||
            dto.hwVersion ||
            dto.bleVersion ||
            dto.tlsVersion) {
            await this.snapshotRepo.save(this.snapshotRepo.create({
                sessionId: dto.sessionId,
                deviceId: dto.deviceId,
                macAddress: dto.macAddress,
                ownerId: dto.ownerId,
                fwVersion: dto.fwVersion,
                hwVersion: dto.hwVersion,
                bleVersion: dto.bleVersion,
                tlsVersion: dto.tlsVersion,
            }));
        }
        return saved;
    }
    async findBySessionId(sessionId) {
        const session = await this.sessionRepo.findOne({ where: { sessionId } });
        if (!session)
            throw new common_1.NotFoundException(`Session ${sessionId} not found`);
        return session;
    }
    async getActiveByDevice(deviceId) {
        return this.sessionRepo.findOne({
            where: { deviceId, endedAt: (0, typeorm_2.IsNull)() },
        });
    }
    async updateState(sessionId, dto) {
        const session = await this.findBySessionId(sessionId);
        if (session.endedAt) {
            throw new common_1.BadRequestException(`Session ${sessionId} is already ended`);
        }
        const currentState = session.state;
        const allowed = TRANSITIONS[currentState] ?? [];
        if (!allowed.includes(dto.state)) {
            throw new common_1.BadRequestException(`Invalid state transition: ${currentState} → ${dto.state}`);
        }
        session.state = dto.state;
        return this.sessionRepo.save(session);
    }
    async end(sessionId, dto) {
        const session = await this.findBySessionId(sessionId);
        if (session.endedAt)
            return session;
        session.endedAt = new Date();
        session.endedReason = dto.reason;
        session.state = session_dto_1.SessionState.SESSION_ENDING;
        return this.sessionRepo.save(session);
    }
    async endAllActive(deviceId, reason) {
        const result = await this.sessionRepo
            .createQueryBuilder()
            .update(ble_session_entity_1.BleSession)
            .set({
            endedAt: new Date(),
            endedReason: reason,
            state: session_dto_1.SessionState.SESSION_ENDING,
        })
            .where('"device_id" = :deviceId', { deviceId })
            .andWhere('"ended_at" IS NULL')
            .execute();
        return result.affected ?? 0;
    }
};
exports.SessionsService = SessionsService;
exports.SessionsService = SessionsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(ble_session_entity_1.BleSession)),
    __param(1, (0, typeorm_1.InjectRepository)(device_identity_snapshot_entity_1.DeviceIdentitySnapshot)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository])
], SessionsService);
//# sourceMappingURL=sessions.service.js.map