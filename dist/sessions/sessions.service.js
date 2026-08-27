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
var SessionsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.SessionsService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const crypto_1 = require("crypto");
const ble_session_entity_1 = require("./entities/ble-session.entity");
const device_identity_snapshot_entity_1 = require("./entities/device-identity-snapshot.entity");
const ble_events_service_1 = require("../ble-events/ble-events.service");
const logger_service_1 = require("../logging/logger.service");
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
let SessionsService = SessionsService_1 = class SessionsService {
    constructor(sessionRepo, snapshotRepo, bleEventsService, appLog, dataSource) {
        this.sessionRepo = sessionRepo;
        this.snapshotRepo = snapshotRepo;
        this.bleEventsService = bleEventsService;
        this.appLog = appLog;
        this.dataSource = dataSource;
        this.logger = new common_1.Logger(SessionsService_1.name);
    }
    async safeRecordEvent(dto) {
        try {
            await this.bleEventsService.recordEvent(dto);
        }
        catch (e) {
            this.appLog.error(`ble event record failed (${dto.eventType}): ${e}`, {
                service: 'sessions',
                eventType: 'BLE_EVENT_WRITE_FAILED',
            });
        }
    }
    async start(dto) {
        const existing = await this.sessionRepo.findOne({
            where: { sessionId: dto.sessionId },
        });
        if (existing && !existing.endedAt)
            return existing;
        const active = await this.getActiveByDevice(dto.deviceId);
        if (active && active.sessionId !== dto.sessionId) {
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
        const hasIdentity = !!(dto.macAddress ||
            dto.fwVersion ||
            dto.hwVersion ||
            dto.bleVersion ||
            dto.tlsVersion);
        let saved;
        try {
            saved = await this.dataSource.transaction(async (manager) => {
                const persisted = await manager.save(session);
                if (hasIdentity) {
                    await manager.save(this.snapshotRepo.create({
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
                return persisted;
            });
        }
        catch (e) {
            const raced = await this.sessionRepo.findOne({
                where: { sessionId: dto.sessionId },
            });
            if (raced)
                return raced;
            throw e;
        }
        this.appLog.log('session started', {
            service: 'sessions',
            eventType: 'SESSION_STARTED',
            sessionId: saved.sessionId,
            deviceId: saved.deviceId,
            actorId: dto.operatorId,
        });
        return saved;
    }
    async findBySessionId(sessionId) {
        const session = await this.sessionRepo.findOne({
            where: { sessionId },
            order: { startedAt: 'DESC' },
        });
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
        const fromState = currentState;
        session.state = dto.state;
        const updated = await this.sessionRepo.save(session);
        this.appLog.debug(`session state ${fromState} -> ${dto.state}`, {
            service: 'sessions',
            eventType: 'SESSION_STATE',
            sessionId: updated.sessionId,
            deviceId: updated.deviceId,
        });
        return updated;
    }
    async end(sessionId, dto) {
        const session = await this.findBySessionId(sessionId);
        if (session.endedAt)
            return session;
        session.endedAt = new Date();
        session.endedReason = dto.reason;
        session.state = session_dto_1.SessionState.SESSION_ENDING;
        const ended = await this.sessionRepo.save(session);
        await this.safeRecordEvent({
            eventType: 'SESSION_ENDED',
            direction: 'APP_TO_BE',
            sessionId: session.sessionId,
            payloadSummary: { device_id: session.deviceId, reason: dto.reason },
        });
        this.appLog.log(`session ended (${dto.reason})`, {
            service: 'sessions',
            eventType: 'SESSION_ENDED',
            sessionId: session.sessionId,
            deviceId: session.deviceId,
        });
        return ended;
    }
    async endAllActive(deviceId, reason, manager) {
        const requestId = (0, crypto_1.randomUUID)();
        const repo = manager ? manager.getRepository(ble_session_entity_1.BleSession) : this.sessionRepo;
        const result = await repo
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
        const affected = result.affected ?? 0;
        this.appLog.log(`ended ${affected} active session(s) (${reason})`, {
            requestId,
            service: 'sessions',
            eventType: 'SESSIONS_ENDED_BULK',
            deviceId,
        });
        return affected;
    }
};
exports.SessionsService = SessionsService;
exports.SessionsService = SessionsService = SessionsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(ble_session_entity_1.BleSession)),
    __param(1, (0, typeorm_1.InjectRepository)(device_identity_snapshot_entity_1.DeviceIdentitySnapshot)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        ble_events_service_1.BleEventsService,
        logger_service_1.LoggerService,
        typeorm_2.DataSource])
], SessionsService);
//# sourceMappingURL=sessions.service.js.map