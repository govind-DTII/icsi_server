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
const device_assignment_entity_1 = require("../entities/device-assignment.entity");
const audit_service_1 = require("../audit/audit.service");
const notifications_service_1 = require("../notifications/notifications.service");
const ble_events_service_1 = require("../ble-events/ble-events.service");
const sessions_service_1 = require("../sessions/sessions.service");
const logger_service_1 = require("../logging/logger.service");
const FALLBACK_DECISION_NORMAL_MS = 120_000;
const FALLBACK_DECISION_HIGH_MS = 60_000;
const SPEC_REJECTION_REASONS = new Set([
    'OPERATOR_DECLINED',
    'INVALID_REQUEST',
    'ERR_DUPLICATE_TXN',
    'ERR_INVALID_PAYLOAD',
]);
function decisionTimeoutMsFor(priority, device) {
    const isHigh = priority?.toLowerCase() === 'high';
    const sec = isHigh
        ? device?.consentDecisionHighSec
        : device?.consentDecisionNormalSec;
    if (sec != null)
        return sec * 1000;
    return isHigh ? FALLBACK_DECISION_HIGH_MS : FALLBACK_DECISION_NORMAL_MS;
}
let ConsentService = ConsentService_1 = class ConsentService {
    constructor(consentRepo, userRepo, bleDeviceRepo, assignRepo, auditService, notificationsService, bleEventsService, sessionsService, jwtService, appLog) {
        this.consentRepo = consentRepo;
        this.userRepo = userRepo;
        this.bleDeviceRepo = bleDeviceRepo;
        this.assignRepo = assignRepo;
        this.auditService = auditService;
        this.notificationsService = notificationsService;
        this.bleEventsService = bleEventsService;
        this.sessionsService = sessionsService;
        this.jwtService = jwtService;
        this.appLog = appLog;
        this.logger = new common_1.Logger(ConsentService_1.name);
        this._expiryInterval = null;
    }
    onModuleInit() {
        this._expiryInterval = setInterval(() => {
            this.expireStalePending().catch((e) => this.appLog.error(`expireStalePending failed: ${e?.stack ?? e}`, {
                service: 'consent',
                eventType: 'EXPIRY_SWEEP_FAILED',
            }));
        }, 60_000);
    }
    onModuleDestroy() {
        if (this._expiryInterval)
            clearInterval(this._expiryInterval);
    }
    publicConsentId(c) {
        return c.consentId ?? c.id;
    }
    async safeAudit(dto) {
        try {
            await this.auditService.log(dto);
        }
        catch (e) {
            this.appLog.error(`audit log failed (${dto.action}): ${e}`, {
                service: 'consent',
                eventType: 'AUDIT_WRITE_FAILED',
            });
        }
    }
    async safeRecordEvent(dto) {
        try {
            await this.bleEventsService.recordEvent(dto);
        }
        catch (e) {
            this.appLog.error(`ble event record failed (${dto.eventType}): ${e}`, {
                service: 'consent',
                eventType: 'BLE_EVENT_WRITE_FAILED',
            });
        }
    }
    logFcmDispatch(consent, target, send) {
        void send
            .then((delivered) => this.safeRecordEvent({
            eventType: 'FCM_PING_SENT',
            direction: 'BE_TO_APP',
            sessionId: consent.sessionId,
            consentId: this.publicConsentId(consent),
            txn: consent.txnRef,
            deviceId: consent.deviceId,
            payloadSummary: { channel: 'fcm', target, delivered },
        }))
            .catch((e) => this.appLog.warn(`fcm dispatch log failed: ${e}`, {
            service: 'consent',
        }));
    }
    async assertSessionConsistent(sessionId, deviceId) {
        if (!sessionId)
            return;
        let session = null;
        try {
            session = await this.sessionsService.findBySessionId(sessionId);
        }
        catch {
            this.logger.warn(`consent references session_id=${sessionId} with no ble_sessions row`);
            return;
        }
        if (deviceId && session.deviceId !== deviceId) {
            throw new common_1.BadRequestException(`device_id mismatch: consent device=${deviceId} ` +
                `but session ${sessionId} is on device=${session.deviceId}`);
        }
    }
    async recordConsentTerminal(consent, eventType, actorId, actorRole, action, detail) {
        await this.safeRecordEvent({
            eventType,
            direction: 'BE_TO_APP',
            sessionId: consent.sessionId,
            consentId: this.publicConsentId(consent),
            txn: consent.txnRef,
            errorCode: consent.abortedReason,
            payloadSummary: {
                status: consent.status,
                reason: consent.abortedReason,
                device_id: consent.deviceId,
            },
        });
        await this.safeAudit({
            action,
            type: 'system',
            actorId,
            actorRole,
            detail,
            consentRequest: consent,
        });
        this.appLog.log(`consent ${consent.status.toLowerCase()}`, {
            service: 'consent',
            eventType,
            actorId: actorId === 'SYSTEM' ? undefined : actorId,
            consentId: this.publicConsentId(consent),
            txnRef: consent.txnRef,
            sessionId: consent.sessionId,
            deviceId: consent.deviceId,
            errorCode: consent.abortedReason,
        });
    }
    async expireStalePending() {
        const nowMs = Date.now();
        const pending = await this.consentRepo.find({
            where: { status: 'PENDING_OWNER_APPROVAL' },
        });
        const expired = pending.filter((c) => nowMs > this.decisionDeadlineEpoch(c));
        for (const consent of expired) {
            consent.status = 'EXPIRED';
            consent.abortedReason = 'REQUEST_EXPIRED';
            await this.consentRepo.save(consent);
            await this.recordConsentTerminal(consent, 'CONSENT_EXPIRED', 'SYSTEM', 'system', `Consent expired (auto) — ${consent.txnRef}`, `${decisionTimeoutMsFor(consent.priority) / 1000}s decision window elapsed (background sweep)`);
        }
        const n = expired.length;
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
        await this.recordConsentTerminal(consent, 'CONSENT_EXPIRED', actorId, 'owner', `Consent expired (decision window) — ${consent.txnRef}`, `${decisionTimeoutMsFor(consent.priority) / 1000}s decision window elapsed before a decision was recorded`);
    }
    stripUser(user) {
        if (!user)
            return null;
        const { passwordHash, fcmToken, apnsToken, ...safe } = user;
        return safe;
    }
    assertCallerIsParty(consent, callerId) {
        if (!callerId)
            return;
        const ownerId = consent.owner?.id;
        const operatorId = consent.operator?.id;
        if (callerId !== ownerId && callerId !== operatorId) {
            throw new common_1.ForbiddenException('You are not a party to this consent');
        }
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
    async getConsentResponse(consentIdParam, callerId) {
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
        this.assertCallerIsParty(consent, callerId);
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
            device_id: consent.deviceId ?? '',
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
        this.appLog.log(`consent response fetched (${decision})`, {
            service: 'consent',
            eventType: 'CONSENT_RESPONSE_FETCHED',
            consentId: publicConsentId,
            txnRef: consent.txnRef,
            sessionId: consent.sessionId,
            deviceId: consent.deviceId,
        });
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
    async findById(idOrConsentId, callerId) {
        const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        const consent = await this.consentRepo.findOne({
            where: UUID_RE.test(idOrConsentId)
                ? { id: idOrConsentId }
                : { consentId: idOrConsentId },
            relations: ['owner', 'operator'],
        });
        if (!consent)
            throw new common_1.NotFoundException('Consent not found');
        this.assertCallerIsParty(consent, callerId);
        return {
            ...consent,
            owner: this.stripUser(consent.owner),
            operator: this.stripUser(consent.operator),
            ...this.decisionTiming(consent),
        };
    }
    async assertPartyById(idOrConsentId, callerId) {
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(idOrConsentId);
        const consent = await this.consentRepo.findOne({
            where: isUuid
                ? { id: idOrConsentId }
                : [{ consentId: idOrConsentId }, { txnRef: idOrConsentId }],
            relations: ['owner', 'operator'],
        });
        if (!consent)
            throw new common_1.NotFoundException('Consent not found');
        this.assertCallerIsParty(consent, callerId);
    }
    decisionTiming(consent) {
        return {
            decisionDeadlineMs: this.decisionDeadlineEpoch(consent),
            serverNowMs: Date.now(),
            createdAtMs: this.createdAtEpoch(consent),
        };
    }
    createdAtEpoch(consent) {
        return (consent.createdAt.getTime() -
            consent.createdAt.getTimezoneOffset() * 60_000);
    }
    decisionDeadlineEpoch(consent) {
        if (consent.decisionDeadlineMs != null) {
            return Number(consent.decisionDeadlineMs);
        }
        if (consent.expiresAt != null) {
            return Number(consent.expiresAt);
        }
        return consent.createdAt.getTime() + decisionTimeoutMsFor(consent.priority);
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
        await this.assertSessionConsistent(consent.sessionId, consent.deviceId);
        consent.status = 'APPROVED';
        consent.approvedAt = new Date();
        await this.consentRepo.save(consent);
        await this.safeAudit({
            action: `Consent Approved — ${consent.title}`,
            type: 'approve',
            actorId,
            actorRole: 'owner',
            actorName: consent.owner?.name,
            detail: `Approved — txn ${consent.txnRef}, scope ${consent.scope}`,
            consentRequest: consent,
        });
        if (consent.operator?.fcmToken) {
            this.logFcmDispatch(consent, 'operator', this.notificationsService.sendConsentResponseReady(consent.operator.fcmToken, consent.consentId ?? consent.id, consent.txnRef, 'approved', consent.title));
        }
        await this.safeRecordEvent({
            eventType: 'CONSENT_APPROVED',
            direction: 'BE_TO_APP',
            sessionId: consent.sessionId,
            consentId: this.publicConsentId(consent),
            txn: consent.txnRef,
            payloadSummary: { decision: 'approved' },
        });
        this.appLog.log('consent approved', {
            service: 'consent',
            eventType: 'CONSENT_APPROVED',
            actorId,
            consentId: this.publicConsentId(consent),
            txnRef: consent.txnRef,
            sessionId: consent.sessionId,
            deviceId: consent.deviceId,
        });
        return {
            ...consent,
            owner: this.stripUser(consent.owner),
            operator: this.stripUser(consent.operator),
        };
    }
    async validateConsentParties(ownerId, operatorId, authUserId, deviceId) {
        const device = await this.bleDeviceRepo.findOne({
            where: { deviceId, isActive: true },
            relations: ['owner'],
        });
        if (!device?.owner) {
            throw new common_1.NotFoundException(`Device owner not found for device_id=${deviceId}`);
        }
        const owner = device.owner;
        if (ownerId && ownerId !== owner.id) {
            throw new common_1.ForbiddenException(`owner_id=${ownerId} does not own device_id=${deviceId} ` +
                `(owner is ${owner.id})`);
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
        const assignment = await this.assignRepo.findOne({
            where: {
                bleDevice: { deviceId },
                operator: { id: operator.id },
                isActive: true,
            },
        });
        if (!assignment) {
            throw new common_1.ForbiddenException(`operator_id=${operator.id} is not assigned to device_id=${deviceId}`);
        }
        const hardPin = (process.env.PHASE1_HARDPIN ?? 'false') === 'true';
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
        await this.assertSessionConsistent(body.session_id, body.device_id);
        if (body.session_id) {
            const existingPending = await this.consentRepo.findOne({
                where: {
                    sessionId: body.session_id,
                    status: 'PENDING_OWNER_APPROVAL',
                },
            });
            if (existingPending) {
                throw new common_1.BadRequestException(`Session ${body.session_id} already has a pending consent ` +
                    `(${existingPending.consentId ?? existingPending.id}) — ` +
                    `resolve it before requesting another`);
            }
        }
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
        const operatorLatitude = typeof body.latitude === 'number' && Number.isFinite(body.latitude)
            ? body.latitude
            : null;
        const operatorLongitude = typeof body.longitude === 'number' && Number.isFinite(body.longitude)
            ? body.longitude
            : null;
        const operatorLocationAccuracy = typeof body.location_accuracy === 'number' &&
            Number.isFinite(body.location_accuracy)
            ? body.location_accuracy
            : null;
        let operatorLocationCapturedAt = null;
        if (body.location_captured_at) {
            const parsed = new Date(body.location_captured_at);
            if (!Number.isNaN(parsed.getTime())) {
                operatorLocationCapturedAt = parsed;
            }
        }
        else if (operatorLatitude != null && operatorLongitude != null) {
            operatorLocationCapturedAt = new Date();
        }
        const operatorStreet = typeof body.street === 'string' && body.street.trim()
            ? body.street.trim()
            : null;
        const operatorCity = typeof body.city === 'string' && body.city.trim()
            ? body.city.trim()
            : null;
        const operatorState = typeof body.state === 'string' && body.state.trim()
            ? body.state.trim()
            : null;
        const operatorPostalCode = typeof body.postal_code === 'string' && body.postal_code.trim()
            ? body.postal_code.trim()
            : null;
        const device = body.device_id
            ? await this.bleDeviceRepo.findOne({
                where: { deviceId: body.device_id },
            })
            : null;
        const blePacketRaw = JSON.stringify({
            version: '1.0',
            cmd: 'consent_request',
            txn: body.txn,
            ts: body.expires_at ? body.expires_at - 300000 : null,
            device_id: body.device_id ?? '',
            consent_id: body.consent_id ?? '',
            owner_id: owner?.id ?? '',
            operator_id: operator?.id ?? '',
            title: body.title,
            scope: body.scope ?? 'READ_WRITE',
            expires_at: body.expires_at ?? null,
            priority: body.priority ?? 'normal',
            attachment_name: attachmentName ?? null,
            attachment_url: attachmentUrl ?? null,
            attachment_hash: attachmentHash ?? null,
            operator_latitude: operatorLatitude,
            operator_longitude: operatorLongitude,
            operator_location_accuracy: operatorLocationAccuracy,
            operator_location_captured_at: operatorLocationCapturedAt
                ? operatorLocationCapturedAt.toISOString()
                : null,
            operator_street: operatorStreet,
            operator_city: operatorCity,
            operator_state: operatorState,
            operator_postal_code: operatorPostalCode,
        });
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
            operatorLatitude,
            operatorLongitude,
            operatorLocationAccuracy,
            operatorLocationCapturedAt,
            operatorStreet,
            operatorCity,
            operatorState,
            operatorPostalCode,
            blePacketRaw,
            priority: body.priority ?? 'normal',
            expiresAt: body.expires_at ?? null,
            decisionDeadlineMs: Date.now() + decisionTimeoutMsFor(body.priority ?? 'normal', device),
            sessionId: body.session_id ?? null,
            deviceId: body.device_id ?? null,
            status: 'PENDING_OWNER_APPROVAL',
            delivery: 'FCM · BLE relay',
            owner,
            operator,
        });
        await this.consentRepo.save(consent);
        await this.safeAudit({
            action: `Consent request created — ${body.txn}`,
            type: 'system',
            actorId: operatorId,
            actorRole: 'operator',
            actorName: operator?.name,
            detail: `Title: ${body.title} · File: ${attachmentName ?? 'none'}` +
                `${attachmentHash ? ` · ${attachmentHash}` : ''}` +
                (operatorLatitude != null && operatorLongitude != null
                    ? ` · Geo: ${operatorLatitude},${operatorLongitude}`
                    : ''),
            consentRequest: consent,
            documentName: attachmentName ?? fileName ?? body.title,
            attachmentHash: attachmentHash ?? null,
            fileUrl: fileUrl ?? attachmentUrl ?? null,
            latitude: operatorLatitude,
            longitude: operatorLongitude,
            locationAccuracy: operatorLocationAccuracy,
            street: operatorStreet,
            city: operatorCity,
            state: operatorState,
            postalCode: operatorPostalCode,
        });
        await this.safeRecordEvent({
            eventType: 'CONSENT_REQUESTED',
            direction: 'APP_TO_BE',
            sessionId: body.session_id,
            consentId: this.publicConsentId(consent),
            txn: body.txn,
            payloadSummary: {
                title: body.title,
                scope: body.scope,
                priority: body.priority ?? 'normal',
                device_id: body.device_id,
            },
        });
        this.appLog.log('consent request created', {
            service: 'consent',
            eventType: 'CONSENT_REQUESTED',
            actorId: operatorId,
            consentId: this.publicConsentId(consent),
            txnRef: body.txn,
            sessionId: body.session_id,
            deviceId: body.device_id,
        });
        if (owner.fcmToken) {
            this.logFcmDispatch(consent, 'owner', this.notificationsService.sendConsentRequest(owner.fcmToken, consent.consentId ?? consent.id, body.title, body.txn, fileUrl, body.description));
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
    async notifyHidInjectUsed(idOrConsentId, status, usedAtMs, callerId) {
        if (status !== 'success') {
            return { status: 'ignored' };
        }
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(idOrConsentId);
        const consent = await this.consentRepo.findOne({
            where: isUuid ? { id: idOrConsentId } : { consentId: idOrConsentId },
            relations: ['owner', 'operator'],
        });
        if (!consent)
            throw new common_1.NotFoundException('Consent not found');
        this.assertCallerIsParty(consent, callerId);
        const usedAt = usedAtMs ?? Date.now();
        if (consent.owner?.fcmToken) {
            this.logFcmDispatch(consent, 'owner', this.notificationsService.sendHidInjectSuccess(consent.owner.fcmToken, this.publicConsentId(consent), consent.txnRef, consent.operator?.name ?? 'operator', consent.title, usedAt));
        }
        this.appLog.log('hid pin injected — owner notified', {
            service: 'consent',
            eventType: 'HID_INJECT_OWNER_NOTIFIED',
            consentId: this.publicConsentId(consent),
            txnRef: consent.txnRef,
            sessionId: consent.sessionId,
            deviceId: consent.deviceId,
        });
        return { status: 'notified' };
    }
    async markAborted(idOrConsentId, reason, manager) {
        const repo = manager
            ? manager.getRepository(consent_request_entity_1.ConsentRequest)
            : this.consentRepo;
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(idOrConsentId);
        let consent = null;
        if (isUuid) {
            consent = await repo.findOne({
                where: { id: idOrConsentId },
            });
        }
        if (!consent) {
            consent = await repo.findOne({
                where: { consentId: idOrConsentId },
            });
        }
        if (!consent) {
            consent = await repo.findOne({
                where: { txnRef: idOrConsentId },
            });
        }
        if (!consent)
            return;
        if (['APPROVED', 'REJECTED', 'EXPIRED', 'TAMPER_ABORTED'].includes(consent.status)) {
            return;
        }
        let eventType;
        if (reason === 'TAMPER_DETECTED' || reason === 'TAMPER_ABORTED') {
            consent.status = 'TAMPER_ABORTED';
            eventType = 'CONSENT_TAMPER_ABORTED';
        }
        else if (reason === 'REQUEST_EXPIRED') {
            consent.status = 'EXPIRED';
            eventType = 'CONSENT_EXPIRED';
        }
        else if (SPEC_REJECTION_REASONS.has(reason)) {
            consent.status = 'REJECTED';
            eventType = 'CONSENT_REJECTED';
        }
        else {
            consent.status = 'REJECTED';
            eventType = 'CONSENT_ABORTED';
        }
        consent.abortedReason = reason;
        if (consent.status === 'REJECTED' && !consent.rejectedAt) {
            consent.rejectedAt = new Date();
        }
        await repo.save(consent);
        await this.recordConsentTerminal(consent, eventType, 'SYSTEM', 'system', `Consent ${consent.status.toLowerCase()} — ${consent.txnRef}`, `reason=${reason}`);
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
        await this.assertSessionConsistent(consent.sessionId, consent.deviceId);
        consent.status = 'REJECTED';
        consent.abortedReason = reason;
        consent.rejectedAt = new Date();
        await this.consentRepo.save(consent);
        await this.safeAudit({
            action: `Consent Rejected — ${consent.title}`,
            type: 'reject',
            actorId,
            actorRole: 'owner',
            actorName: consent.owner?.name,
            detail: `Rejection forwarded via API Gateway`,
            consentRequest: consent,
        });
        if (consent.operator?.fcmToken) {
            this.logFcmDispatch(consent, 'operator', this.notificationsService.sendConsentResponseReady(consent.operator.fcmToken, consent.consentId ?? consent.id, consent.txnRef, 'rejected', consent.title));
        }
        await this.safeRecordEvent({
            eventType: 'CONSENT_REJECTED',
            direction: 'BE_TO_APP',
            sessionId: consent.sessionId,
            consentId: this.publicConsentId(consent),
            txn: consent.txnRef,
            errorCode: reason,
            payloadSummary: { decision: 'rejected', reason },
        });
        this.appLog.log(`consent rejected (${reason})`, {
            service: 'consent',
            eventType: 'CONSENT_REJECTED',
            actorId,
            consentId: this.publicConsentId(consent),
            txnRef: consent.txnRef,
            sessionId: consent.sessionId,
            deviceId: consent.deviceId,
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
    __param(3, (0, typeorm_1.InjectRepository)(device_assignment_entity_1.DeviceAssignment)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        audit_service_1.AuditService,
        notifications_service_1.NotificationsService,
        ble_events_service_1.BleEventsService,
        sessions_service_1.SessionsService,
        jwt_1.JwtService,
        logger_service_1.LoggerService])
], ConsentService);
//# sourceMappingURL=consent.service.js.map