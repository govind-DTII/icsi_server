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
var ConsentService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConsentService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const jwt_1 = require("@nestjs/jwt");
const crypto_1 = require("crypto");
const fs_1 = require("fs");
const consent_request_entity_1 = require("../entities/consent-request.entity");
const user_entity_1 = require("../entities/user.entity");
const ble_device_entity_1 = require("../entities/ble-device.entity");
const audit_service_1 = require("../audit/audit.service");
const notifications_service_1 = require("../notifications/notifications.service");
const ble_events_service_1 = require("../ble-events/ble-events.service");
const CONSENT_DECISION_TIMEOUT_MS = 60_000;
const CONSENT_EXPIRY_MS = 300_000;
let ConsentService = ConsentService_1 = class ConsentService {
    constructor(consentRepo, userRepo, bleDeviceRepo, auditService, notificationsService, bleEventsService, jwtService) {
        this.consentRepo = consentRepo;
        this.userRepo = userRepo;
        this.bleDeviceRepo = bleDeviceRepo;
        this.auditService = auditService;
        this.notificationsService = notificationsService;
        this.bleEventsService = bleEventsService;
        this.jwtService = jwtService;
        this.logger = new common_1.Logger(ConsentService_1.name);
        this._expiryInterval = null;
    }
    onModuleInit() {
        this._expiryInterval = setInterval(() => {
            this.expireStalePending().catch((e) => this.logger.error('expireStalePending failed', e));
        }, 60_000);
    }
    onModuleDestroy() {
        if (this._expiryInterval)
            clearInterval(this._expiryInterval);
    }
    async expireStalePending() {
        const nowMs = Date.now();
        const result = await this.consentRepo
            .createQueryBuilder()
            .update(consent_request_entity_1.ConsentRequest)
            .set({ status: 'EXPIRED', abortedReason: 'REQUEST_EXPIRED' })
            .where('status = :s', { s: 'PENDING_OWNER_APPROVAL' })
            .andWhere(new typeorm_2.Brackets((qb) => {
            qb.where('decision_deadline_ms IS NOT NULL AND decision_deadline_ms < :now', {
                now: nowMs,
            }).orWhere('decision_deadline_ms IS NULL AND expires_at IS NOT NULL AND expires_at < :now', { now: nowMs });
        }))
            .execute();
        const n = result.affected ?? 0;
        if (n > 0)
            this.logger.log(`Expired ${n} stale consent(s)`);
        return n;
    }
    async enforceDecisionWindow(consent, actorId) {
        if (consent.status !== 'PENDING_OWNER_APPROVAL' ||
            Date.now() <= this.decisionDeadlineEpoch(consent)) {
            return;
        }
        consent.status = 'EXPIRED';
        consent.abortedReason = 'REQUEST_EXPIRED';
        await this.consentRepo.save(consent);
        await this.auditService.log({
            action: `Consent expired (decision window) — ${consent.txnRef}`,
            type: 'system',
            actorId,
            actorRole: 'owner',
            detail: `${CONSENT_DECISION_TIMEOUT_MS / 1000}s decision window elapsed before a decision was recorded`,
            consentRequest: consent,
        });
    }
    stripUser(user) {
        if (!user)
            return null;
        const { passwordHash, fcmToken, apnsToken, ...safe } = user;
        return safe;
    }
    async findAll(userId, role) {
        const where = role === 'owner'
            ? { owner: { id: userId } }
            : { operator: { id: userId } };
        const consents = await this.consentRepo.find({
            where,
            relations: ['owner', 'operator'],
            order: { createdAt: 'DESC' },
        });
        return consents.map((consent) => ({
            ...consent,
            owner: this.stripUser(consent.owner),
            operator: this.stripUser(consent.operator),
            ...this.decisionTiming(consent),
        }));
    }
    async getConsentResponse(consentIdParam) {
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(consentIdParam);
        const consent = isUuid
            ? await this.consentRepo.findOne({
                where: { id: consentIdParam },
                relations: ['owner', 'operator'],
            })
            : await this.consentRepo.findOne({
                where: { consentId: consentIdParam },
                relations: ['owner', 'operator'],
            });
        if (!consent)
            throw new common_1.NotFoundException('Consent not found');
        const publicConsentId = consent.consentId ?? consent.id;
        if (consent.status === 'PENDING_OWNER_APPROVAL') {
            return {
                consent_id: publicConsentId,
                txn: consent.txnRef,
                decision: null,
                jwt_token: null,
                payload: null,
                reason: null,
                decided_at: null,
            };
        }
        const decision = consent.status === 'APPROVED' ? 'approved' : 'rejected';
        const jwtToken = this.jwtService.sign({
            consent_id: publicConsentId,
            txn: consent.txnRef,
            device_id: consent.sessionId ?? '',
            operator_id: consent.operator?.id ?? '',
            decision,
            iat: Math.floor(Date.now() / 1000),
        }, { expiresIn: '5m' });
        const payload = decision === 'approved' ? (consent.owner?.pin ?? null) : null;
        const reason = decision === 'rejected'
            ? (consent.abortedReason ?? 'OPERATOR_DECLINED')
            : null;
        const decidedAt = decision === 'approved'
            ? (consent.approvedAt?.getTime() ?? null)
            : (consent.rejectedAt?.getTime() ?? null);
        return {
            consent_id: publicConsentId,
            txn: consent.txnRef,
            decision,
            jwt_token: jwtToken,
            payload,
            reason,
            decided_at: decidedAt,
        };
    }
    async findById(idOrConsentId) {
        const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        const consent = await this.consentRepo.findOne({
            where: UUID_RE.test(idOrConsentId)
                ? { id: idOrConsentId }
                : { consentId: idOrConsentId },
            relations: ['owner', 'operator'],
        });
        if (!consent)
            throw new common_1.NotFoundException('Consent not found');
        return {
            ...consent,
            owner: this.stripUser(consent.owner),
            operator: this.stripUser(consent.operator),
            ...this.decisionTiming(consent),
        };
    }
    decisionTiming(consent) {
        return {
            decisionDeadlineMs: this.decisionDeadlineEpoch(consent),
            serverNowMs: Date.now(),
        };
    }
    decisionDeadlineEpoch(consent) {
        if (consent.decisionDeadlineMs != null) {
            return Number(consent.decisionDeadlineMs);
        }
        if (consent.expiresAt != null) {
            return (Number(consent.expiresAt) -
                CONSENT_EXPIRY_MS +
                CONSENT_DECISION_TIMEOUT_MS);
        }
        return consent.createdAt.getTime() + CONSENT_DECISION_TIMEOUT_MS;
    }
    async approve(consentId, actorId) {
        const consent = await this.consentRepo.findOne({
            where: { id: consentId },
            relations: ['owner', 'operator'],
        });
        if (!consent)
            throw new common_1.NotFoundException('Consent not found');
        await this.enforceDecisionWindow(consent, actorId);
        if (consent.status !== 'PENDING_OWNER_APPROVAL') {
            throw new common_1.BadRequestException(`Cannot approve: status is ${consent.status}`);
        }
        consent.status = 'APPROVED';
        consent.approvedAt = new Date();
        await this.consentRepo.save(consent);
        await this.auditService.log({
            action: `Consent Approved — ${consent.txnRef}`,
            type: 'approve',
            actorId,
            actorRole: 'owner',
            detail: `Payload: ${consent.blePayload}`,
            consentRequest: consent,
        });
        if (consent.operator?.fcmToken) {
            void this.notificationsService.sendConsentResponseReady(consent.operator.fcmToken, consent.consentId ?? consent.id, consent.txnRef, 'approved', consent.title);
        }
        await this.bleEventsService.recordEvent({
            eventType: 'CONSENT_APPROVED',
            direction: 'BE_TO_APP',
            consentId: consent.id,
            txn: consent.txnRef,
            payloadSummary: { decision: 'approved' },
        });
        await this.auditService.log({
            action: 'BLE approval packet relayed to Witness',
            type: 'ble',
            actorId: 'SYSTEM',
            actorRole: 'system',
            detail: JSON.stringify({
                cmd: 'approve',
                ref: consent.txnRef,
                status: 'approved',
                witness: 'DT1001',
            }),
            consentRequest: consent,
        });
        return {
            ...consent,
            owner: this.stripUser(consent.owner),
            operator: this.stripUser(consent.operator),
        };
    }
    async validateConsentParties(ownerId, operatorId, authUserId, deviceId) {
        let owner = null;
        if (ownerId) {
            owner = await this.userRepo.findOne({ where: { id: ownerId } });
        }
        if (!owner) {
            const device = await this.bleDeviceRepo.findOne({
                where: { deviceId, isActive: true },
                relations: ['owner'],
            });
            if (!device?.owner) {
                throw new common_1.NotFoundException(`Device owner not found for device_id=${deviceId}`);
            }
            owner = device.owner;
        }
        if (owner.role !== 'owner') {
            throw new common_1.BadRequestException(`owner_id=${owner.id} is not an owner (role=${owner.role})`);
        }
        if (!operatorId) {
            throw new common_1.BadRequestException('operator_id is required');
        }
        const operator = await this.userRepo.findOne({
            where: { id: operatorId },
        });
        if (!operator) {
            throw new common_1.NotFoundException(`Operator not found: operator_id=${operatorId}`);
        }
        if (operator.role !== 'operator') {
            throw new common_1.BadRequestException(`operator_id=${operator.id} is not an operator (role=${operator.role})`);
        }
        if (operator.id !== authUserId) {
            throw new common_1.ForbiddenException('operator_id does not match the authenticated user');
        }
        const hardPin = (process.env.PHASE1_HARDPIN ?? 'true') === 'true';
        if (hardPin && (owner.id !== 'USR-001' || operator.id !== 'USR-002')) {
            throw new common_1.BadRequestException(`Phase-1 hard-pin: expected owner=USR-001 operator=USR-002, ` +
                `got owner=${owner.id} operator=${operator.id}`);
        }
        return { owner, operator };
    }
    sha256File(filePath) {
        return new Promise((resolve, reject) => {
            const hash = (0, crypto_1.createHash)('sha256');
            (0, fs_1.createReadStream)(filePath)
                .on('error', reject)
                .on('data', (chunk) => hash.update(chunk))
                .on('end', () => resolve(hash.digest('hex')));
        });
    }
    async createConsentRequest(operatorId, body, file) {
        const { owner, operator } = await this.validateConsentParties(body.owner_id, body.operator_id, operatorId, body.device_id);
        const fileUrl = file ? `/uploads/${file.filename}` : null;
        const fileName = file ? file.originalname : null;
        const fileSize = file ? file.size : null;
        let serverHash = null;
        if (file) {
            try {
                const hex = await this.sha256File(file.path);
                serverHash = `SHA256:${hex}`;
                const appHex = (body.attachment_hash ?? '')
                    .replace(/^SHA256:/i, '')
                    .toLowerCase();
                if (appHex && appHex !== hex.toLowerCase()) {
                    this.logger.warn(`Attachment hash mismatch for ${body.txn}: ` +
                        `app=${appHex.slice(0, 12)}… server=${hex.slice(0, 12)}…`);
                }
            }
            catch (e) {
                this.logger.warn(`Could not compute server-side attachment hash: ${e}`);
            }
        }
        const attachmentName = body.attachment_name ?? fileName;
        const attachmentUrl = body.attachment_url ?? fileUrl;
        const attachmentHash = body.attachment_hash ?? serverHash;
        const consent = this.consentRepo.create({
            txnRef: body.txn,
            consentId: body.consent_id ?? null,
            title: body.title,
            description: body.description ?? null,
            scope: body.scope ?? 'READ_WRITE',
            fileUrl,
            fileName,
            fileSize,
            attachmentName,
            attachmentUrl,
            attachmentHash,
            blePayload: body.txn,
            priority: body.priority ?? 'normal',
            expiresAt: body.expires_at ?? null,
            decisionDeadlineMs: Date.now() + CONSENT_DECISION_TIMEOUT_MS,
            sessionId: body.session_id ?? null,
            status: 'PENDING_OWNER_APPROVAL',
            delivery: 'FCM · BLE relay',
            owner,
            operator,
        });
        await this.consentRepo.save(consent);
        await this.auditService.log({
            action: `Consent request created — ${body.txn}`,
            type: 'system',
            actorId: operatorId,
            actorRole: 'operator',
            detail: `Title: ${body.title} · File: ${attachmentName ?? 'none'}` +
                `${attachmentHash ? ` · ${attachmentHash}` : ''}`,
            consentRequest: consent,
        });
        await this.bleEventsService.recordEvent({
            eventType: 'CONSENT_REQUESTED',
            direction: 'APP_TO_BE',
            sessionId: body.session_id,
            consentId: body.consent_id,
            txn: body.txn,
            payloadSummary: {
                title: body.title,
                scope: body.scope,
                priority: body.priority ?? 'normal',
            },
        });
        if (owner.fcmToken) {
            void this.notificationsService.sendConsentRequest(owner.fcmToken, consent.id, body.title, body.txn, fileUrl, body.description);
        }
        return {
            status: 'created',
            message: 'Consent request created',
            consent_id: consent.consentId ?? consent.id,
            txn: consent.txnRef,
            state: consent.status,
            created_at: consent.createdAt.getTime(),
        };
    }
    async submitConsentResponse(actorId, body) {
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(body.consent_id);
        const consent = isUuid
            ? await this.consentRepo.findOne({ where: { id: body.consent_id } })
            : await this.consentRepo.findOne({
                where: { consentId: body.consent_id },
            });
        if (!consent)
            throw new common_1.NotFoundException('Consent not found');
        let updated;
        if (body.decision === 'approved') {
            updated = await this.approve(consent.id, actorId);
        }
        else if (body.decision === 'rejected') {
            updated = await this.reject(consent.id, actorId, body.reason);
        }
        else {
            throw new common_1.BadRequestException(`Invalid decision: ${body.decision}`);
        }
        const decidedAt = body.decision === 'approved'
            ? (updated.approvedAt?.getTime() ?? Date.now())
            : (updated.rejectedAt?.getTime() ?? Date.now());
        return {
            status: body.decision === 'approved' ? 'approved' : 'rejected',
            consent_id: updated.consentId ?? updated.id,
            decision: body.decision,
            decided_at: decidedAt,
        };
    }
    async markAborted(idOrConsentId, reason) {
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(idOrConsentId);
        let consent = null;
        if (isUuid) {
            consent = await this.consentRepo.findOne({
                where: { id: idOrConsentId },
            });
        }
        if (!consent) {
            consent = await this.consentRepo.findOne({
                where: { consentId: idOrConsentId },
            });
        }
        if (!consent) {
            consent = await this.consentRepo.findOne({
                where: { txnRef: idOrConsentId },
            });
        }
        if (!consent)
            return;
        if (['APPROVED', 'REJECTED', 'EXPIRED', 'TAMPER_ABORTED'].includes(consent.status)) {
            return;
        }
        if (reason === 'TAMPER_DETECTED' || reason === 'TAMPER_ABORTED') {
            consent.status = 'TAMPER_ABORTED';
        }
        else if (reason === 'REQUEST_EXPIRED') {
            consent.status = 'EXPIRED';
        }
        else {
            consent.status = 'REJECTED';
        }
        consent.abortedReason = reason;
        await this.consentRepo.save(consent);
    }
    async reject(consentId, actorId, reason = 'OPERATOR_DECLINED') {
        const consent = await this.consentRepo.findOne({
            where: { id: consentId },
            relations: ['owner', 'operator'],
        });
        if (!consent)
            throw new common_1.NotFoundException('Consent not found');
        await this.enforceDecisionWindow(consent, actorId);
        if (consent.status !== 'PENDING_OWNER_APPROVAL') {
            throw new common_1.BadRequestException(`Cannot reject: status is ${consent.status}`);
        }
        consent.status = 'REJECTED';
        consent.abortedReason = reason;
        consent.rejectedAt = new Date();
        await this.consentRepo.save(consent);
        await this.auditService.log({
            action: `Consent Rejected — ${consent.txnRef}`,
            type: 'reject',
            actorId,
            actorRole: 'owner',
            detail: `Rejection forwarded via API Gateway`,
            consentRequest: consent,
        });
        if (consent.operator?.fcmToken) {
            void this.notificationsService.sendConsentResponseReady(consent.operator.fcmToken, consent.consentId ?? consent.id, consent.txnRef, 'rejected', consent.title);
        }
        await this.bleEventsService.recordEvent({
            eventType: 'CONSENT_REJECTED',
            direction: 'BE_TO_APP',
            consentId: consent.id,
            txn: consent.txnRef,
            payloadSummary: { decision: 'rejected' },
        });
        return {
            ...consent,
            owner: this.stripUser(consent.owner),
            operator: this.stripUser(consent.operator),
        };
    }
};
exports.ConsentService = ConsentService;
exports.ConsentService = ConsentService = ConsentService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(consent_request_entity_1.ConsentRequest)),
    __param(1, (0, typeorm_1.InjectRepository)(user_entity_1.User)),
    __param(2, (0, typeorm_1.InjectRepository)(ble_device_entity_1.BleDevice)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        audit_service_1.AuditService,
        notifications_service_1.NotificationsService,
        ble_events_service_1.BleEventsService,
        jwt_1.JwtService])
], ConsentService);
//# sourceMappingURL=consent.service.js.map