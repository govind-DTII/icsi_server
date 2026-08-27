import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { createHash } from 'crypto';
import { createReadStream } from 'fs';
import { ConsentRequest } from '../entities/consent-request.entity';
import { User } from '../entities/user.entity';
import { BleDevice } from '../entities/ble-device.entity';
import { DeviceAssignment } from '../entities/device-assignment.entity';
import { AuditService } from '../audit/audit.service';
import { NotificationsService } from '../notifications/notifications.service';
import { BleEventsService } from '../ble-events/ble-events.service';
import { SessionsService } from '../sessions/sessions.service';
import { LoggerService } from '../logging/logger.service';

// The consent decision window is PURELY application behavior (not firmware-owned):
// it is the time the owner has to approve/reject before the request auto-expires.
// The window is priority-driven (a higher-priority request gets less time so it
// surfaces urgency to the owner) and the lengths are DB-configurable per device
// (ble_devices.consentDecisionNormalSec / consentDecisionHighSec). expires_at is
// set equal to the window. Only after an APPROVED decision does the app write the
// 0302 consent_response to firmware; firmware plays no part in this timeout.
// These constants are a last-resort fallback only when the device row is missing.
const FALLBACK_DECISION_NORMAL_MS = 120_000; // 2 min
const FALLBACK_DECISION_HIGH_MS = 60_000; // 1 min

// Spec §3.2 rejection reason codes — genuine rejections (audited as
// CONSENT_REJECTED), distinct from user-aborts (ABORTED_BY_USER/OWNER_ABORTED →
// CONSENT_ABORTED) and expiry/tamper.
const SPEC_REJECTION_REASONS = new Set([
  'OPERATOR_DECLINED',
  'INVALID_REQUEST',
  'ERR_DUPLICATE_TXN',
  'ERR_INVALID_PAYLOAD',
]);

// Resolve the decision-window length (ms) for a priority from a device's
// configured (seconds) values, falling back to the spec-anchored defaults.
function decisionTimeoutMsFor(
  priority?: string | null,
  device?: {
    consentDecisionNormalSec?: number;
    consentDecisionHighSec?: number;
  },
): number {
  const isHigh = priority?.toLowerCase() === 'high';
  const sec = isHigh
    ? device?.consentDecisionHighSec
    : device?.consentDecisionNormalSec;
  if (sec != null) return sec * 1000;
  return isHigh ? FALLBACK_DECISION_HIGH_MS : FALLBACK_DECISION_NORMAL_MS;
}

@Injectable()
export class ConsentService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ConsentService.name);
  private _expiryInterval: ReturnType<typeof setInterval> | null = null;

  constructor(
    @InjectRepository(ConsentRequest)
    private consentRepo: Repository<ConsentRequest>,
    @InjectRepository(User) private userRepo: Repository<User>,
    @InjectRepository(BleDevice) private bleDeviceRepo: Repository<BleDevice>,
    @InjectRepository(DeviceAssignment)
    private assignRepo: Repository<DeviceAssignment>,
    private auditService: AuditService,
    private notificationsService: NotificationsService,
    private bleEventsService: BleEventsService,
    private sessionsService: SessionsService,
    private jwtService: JwtService,
    private readonly appLog: LoggerService,
  ) {}

  // Run every 60 s: mark every PENDING_OWNER_APPROVAL consent whose
  // expires_at has passed as EXPIRED. This is the server-side authority
  // for expiry — the client-side 60 s timer is the UX trigger, but if the
  // client abort call fails or the app is killed, this ensures the DB is
  // eventually consistent.
  onModuleInit() {
    this._expiryInterval = setInterval(() => {
      this.expireStalePending().catch((e) =>
        this.appLog.error(`expireStalePending failed: ${e?.stack ?? e}`, {
          service: 'consent',
          eventType: 'EXPIRY_SWEEP_FAILED',
        }),
      );
    }, 60_000);
  }

  onModuleDestroy() {
    if (this._expiryInterval) clearInterval(this._expiryInterval);
  }

  // The single canonical consent identifier used across every audit/event row,
  // the minted JWT, and the FCM ping: the app-generated human id (CST-…) when
  // present, else the DB UUID. Using this everywhere keeps CONSENT_REQUESTED,
  // CONSENT_APPROVED and CONSENT_REJECTED joinable on one consent_id.
  private publicConsentId(c: ConsentRequest): string {
    return c.consentId ?? c.id;
  }

  // Telemetry writes (audit_logs + ble_event_audit) must never fail the
  // user-facing consent operation. Wrap both so a logging error is recorded
  // and swallowed instead of propagating a 500 to the operator/owner.
  private async safeAudit(
    dto: Parameters<AuditService['log']>[0],
  ): Promise<void> {
    try {
      await this.auditService.log(dto);
    } catch (e) {
      this.appLog.error(`audit log failed (${dto.action}): ${e}`, {
        service: 'consent',
        eventType: 'AUDIT_WRITE_FAILED',
      });
    }
  }

  private async safeRecordEvent(
    dto: Parameters<BleEventsService['recordEvent']>[0],
  ): Promise<void> {
    try {
      await this.bleEventsService.recordEvent(dto);
    } catch (e) {
      this.appLog.error(`ble event record failed (${dto.eventType}): ${e}`, {
        service: 'consent',
        eventType: 'BLE_EVENT_WRITE_FAILED',
      });
    }
  }

  // Records that a wake-up FCM ping was dispatched (Spec Step 16) as an
  // FCM_PING_SENT protocol event. NEVER carries the PIN or JWT — those are
  // fetched over TLS via GET /consent_response (#6). The `delivered` flag
  // captures whether FCM accepted the send, so "owner/operator never got
  // notified" is debuggable. Fire-and-forget: chained off the send promise so
  // notification logging never blocks the consent decision.
  private logFcmDispatch(
    consent: ConsentRequest,
    target: 'owner' | 'operator',
    send: Promise<boolean>,
  ): void {
    void send
      .then((delivered) =>
        this.safeRecordEvent({
          eventType: 'FCM_PING_SENT',
          direction: 'BE_TO_APP',
          sessionId: consent.sessionId,
          consentId: this.publicConsentId(consent),
          txn: consent.txnRef,
          deviceId: consent.deviceId,
          payloadSummary: { channel: 'fcm', target, delivered },
        }),
      )
      .catch((e) =>
        this.appLog.warn(`fcm dispatch log failed: ${e}`, {
          service: 'consent',
        }),
      );
  }

  // Referential guard: a consent must belong to a BLE session on the SAME
  // device. Enforces "this consent is for this device/session" without coupling
  // to liveness — the backend's `ended_at` is NOT a reliable proxy for the
  // operator's live BLE link: SessionsService.start() ends the prior active
  // session on every (re)connect, so by the time the owner approves (async, via
  // FCM) the consent's original session often reads as ended even though the
  // operator is still connected. Liveness at inject time is firmware-enforced
  // (spec §6.2 rejects HID inject when the session/consent is inactive), so we
  // only block on a genuine device mismatch here. A missing session row (backend
  // registration failed / offline) is tolerated per the CLAUDE.md invariant.
  private async assertSessionConsistent(
    sessionId: string | null | undefined,
    deviceId: string | null | undefined,
  ): Promise<void> {
    if (!sessionId) return; // nothing to correlate against (legacy path)
    let session: { deviceId: string } | null = null;
    try {
      session = await this.sessionsService.findBySessionId(sessionId);
    } catch {
      this.logger.warn(
        `consent references session_id=${sessionId} with no ble_sessions row`,
      );
      return;
    }
    if (deviceId && session.deviceId !== deviceId) {
      throw new BadRequestException(
        `device_id mismatch: consent device=${deviceId} ` +
          `but session ${sessionId} is on device=${session.deviceId}`,
      );
    }
  }

  // Records a consent's TERMINAL transition (expired / tamper-aborted / aborted)
  // to BOTH audit tables in lock-step, so ble_event_audit and audit_logs stay in
  // sync and every consent that has a CONSENT_REQUESTED row also has a matching
  // terminal row. Used by all non-approve/reject terminal paths.
  private async recordConsentTerminal(
    consent: ConsentRequest,
    eventType: string,
    actorId: string,
    actorRole: string,
    action: string,
    detail?: string,
  ): Promise<void> {
    await this.safeRecordEvent({
      eventType,
      direction: 'BE_TO_APP',
      sessionId: consent.sessionId,
      consentId: this.publicConsentId(consent),
      txn: consent.txnRef,
      // Abnormal-termination reason belongs in the dedicated errorCode column
      // (was only ever written to the app-log, leaving error_code null for every
      // CONSENT_EXPIRED/ABORTED/TAMPER_ABORTED row in the UAT export).
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

    // App-log the abnormal terminal transition. `actorId` is only a real user on
    // the decision-window path; the auto sweep / cascade pass 'SYSTEM', which we
    // omit rather than log as a human actor (constraint #5). The reason code is
    // an abnormal-termination code → errorCode.
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

  async expireStalePending(): Promise<number> {
    const nowMs = Date.now();
    // Expire once the absolute decision deadline (decision_deadline_ms, server
    // epoch at creation) has passed — keeps the DB status in step with
    // firmware/operator at ~60 s. We deliberately do NOT compare against
    // `createdAt` here: it is `timestamp without time zone` and its epoch is
    // skewed by the server TZ, which previously expired fresh consents
    // instantly. Legacy rows (no decision_deadline_ms) fall back to the 5-min
    // `expires_at`. (approve()/reject() enforce the same deadline in real time.)
    // Fetch the candidates (not a blind bulk UPDATE) so each expiry records a
    // CONSENT_EXPIRED event + audit log — otherwise an auto-expired consent
    // would have a CONSENT_REQUESTED row with no terminal row, leaving
    // ble_event_audit / audit_logs out of sync with the consent's real state.
    const pending = await this.consentRepo.find({
      where: { status: 'PENDING_OWNER_APPROVAL' },
    });
    const expired = pending.filter(
      (c) => nowMs > this.decisionDeadlineEpoch(c),
    );
    for (const consent of expired) {
      consent.status = 'EXPIRED';
      consent.abortedReason = 'REQUEST_EXPIRED';
      await this.consentRepo.save(consent);
      await this.recordConsentTerminal(
        consent,
        'CONSENT_EXPIRED',
        'SYSTEM',
        'system',
        `Consent expired (auto) — ${consent.txnRef}`,
        `${decisionTimeoutMsFor(consent.priority) / 1000}s decision window elapsed (background sweep)`,
      );
    }
    const n = expired.length;
    if (n > 0) this.logger.log(`Expired ${n} stale consent(s)`);
    return n;
  }

  // Real-time authority for the 60 s decision window. Called at the top of
  // approve()/reject(): if a still-pending consent's window has elapsed, flip
  // it to EXPIRED and persist before the status check rejects the late
  // decision. This is what guarantees the owner cannot approve a consent that
  // firmware/operator have already expired, regardless of either phone's clock.
  private async enforceDecisionWindow(
    consent: ConsentRequest,
    actorId: string,
  ): Promise<void> {
    if (
      consent.status !== 'PENDING_OWNER_APPROVAL' ||
      Date.now() <= this.decisionDeadlineEpoch(consent)
    ) {
      return;
    }
    consent.status = 'EXPIRED';
    consent.abortedReason = 'REQUEST_EXPIRED';
    await this.consentRepo.save(consent);
    await this.recordConsentTerminal(
      consent,
      'CONSENT_EXPIRED',
      actorId,
      'owner',
      `Consent expired (decision window) — ${consent.txnRef}`,
      `${decisionTimeoutMsFor(consent.priority) / 1000}s decision window elapsed before a decision was recorded`,
    );
  }

  private stripUser(user: any): any {
    if (!user) return null;
    const { passwordHash, fcmToken, apnsToken, ...safe } = user;
    return safe;
  }

  // Per-party data isolation: only the consent's owner or operator may read or
  // act on it. Invisible with a single operator, a real leak with many (e.g.
  // getConsentResponse returns the JWT + PIN). callerId is the authenticated
  // user id; pass undefined to skip (internal/system callers).
  private assertCallerIsParty(
    consent: { owner?: { id?: string }; operator?: { id?: string } },
    callerId: string | undefined,
  ): void {
    if (!callerId) return;
    const ownerId = consent.owner?.id;
    const operatorId = consent.operator?.id;
    if (callerId !== ownerId && callerId !== operatorId) {
      throw new ForbiddenException('You are not a party to this consent');
    }
  }

  async findAll(userId: string, role: string): Promise<any[]> {
    const where =
      role === 'owner'
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

  // Spec Step 16 — operator app calls GET /consent_response/:consentId
  // after the consent_response_ready FCM ping. Returns the JWT (minted on
  // demand) and the PIN (looked up at decision time) for approved requests;
  // for pending requests returns nulls so the operator app can poll.
  async getConsentResponse(
    consentIdParam: string,
    callerId?: string,
  ): Promise<{
    consent_id: string;
    txn: string;
    decision: string | null;
    jwt_token: string | null;
    payload: string | null;
    reason: string | null;
    decided_at: number | null;
  }> {
    const isUuid =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        consentIdParam,
      );
    const consent = isUuid
      ? await this.consentRepo.findOne({
          where: { id: consentIdParam },
          relations: ['owner', 'operator'],
        })
      : await this.consentRepo.findOne({
          where: { consentId: consentIdParam },
          relations: ['owner', 'operator'],
        });
    if (!consent) throw new NotFoundException('Consent not found');
    // Returns JWT + PIN for approved consents — strictly party-only.
    this.assertCallerIsParty(consent, callerId);

    const publicConsentId = consent.consentId ?? consent.id;

    // Pending → polling fallback: nulls everywhere, app keeps polling.
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

    // Mint JWT on demand. Spec Step 17 includes jwt_token on BOTH
    // approve and reject — firmware validates it either way (ERR_TOKEN_VERIFY).
    const jwtToken = this.jwtService.sign(
      {
        consent_id: publicConsentId,
        txn: consent.txnRef,
        device_id: consent.deviceId ?? '',
        operator_id: consent.operator?.id ?? '',
        decision,
        iat: Math.floor(Date.now() / 1000),
      },
      { expiresIn: '5m' },
    );

    // Spec § ARCHITECTURE — PIN is fetched from owner's DB record at
    // approval (A.7). Cleartext for Phase 1 demo (accepted-risk).
    const payload =
      decision === 'approved' ? (consent.owner?.pin ?? null) : null;

    const reason =
      decision === 'rejected'
        ? (consent.abortedReason ?? 'OPERATOR_DECLINED')
        : null;

    const decidedAt =
      decision === 'approved'
        ? (consent.approvedAt?.getTime() ?? null)
        : (consent.rejectedAt?.getTime() ?? null);

    // Operator fetched the decided response (Step 16). References only — the
    // minted JWT and the PIN (`payload`) are deliberately NOT logged.
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

  async findById(idOrConsentId: string, callerId?: string): Promise<any> {
    // Accept both the DB UUID and the human-readable CST- consent_id.
    const UUID_RE =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const consent = await this.consentRepo.findOne({
      where: UUID_RE.test(idOrConsentId)
        ? { id: idOrConsentId }
        : { consentId: idOrConsentId },
      relations: ['owner', 'operator'],
    });
    if (!consent) throw new NotFoundException('Consent not found');
    this.assertCallerIsParty(consent, callerId);
    return {
      ...consent,
      owner: this.stripUser(consent.owner),
      operator: this.stripUser(consent.operator),
      ...this.decisionTiming(consent),
    };
  }

  // Party guard for action endpoints (abort) whose underlying service method is
  // reused internally without a caller (e.g. the tamper cascade calls
  // markAborted with no callerId). The controller calls this first.
  async assertPartyById(
    idOrConsentId: string,
    callerId: string,
  ): Promise<void> {
    const isUuid =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        idOrConsentId,
      );
    const consent = await this.consentRepo.findOne({
      where: isUuid
        ? { id: idOrConsentId }
        : [{ consentId: idOrConsentId }, { txnRef: idOrConsentId }],
      relations: ['owner', 'operator'],
    });
    if (!consent) throw new NotFoundException('Consent not found');
    this.assertCallerIsParty(consent, callerId);
  }

  // The authoritative 60 s decision window expressed in the SERVER's clock, plus
  // the server's current time. The app converts these into its own clock using
  // the skew measured at fetch time, so the countdown is immune to phone/server
  // clock and timezone differences (createdAt is `timestamp without time zone`,
  // which otherwise drifts the deadline into the past on a phone in another TZ).
  private decisionTiming(consent: ConsentRequest): {
    decisionDeadlineMs: number;
    serverNowMs: number;
    createdAtMs: number;
  } {
    return {
      decisionDeadlineMs: this.decisionDeadlineEpoch(consent),
      serverNowMs: Date.now(),
      createdAtMs: this.createdAtEpoch(consent),
    };
  }

  // TZ-safe absolute epoch (ms) of consent creation. The column is `timestamp
  // without time zone` storing a UTC wall-clock, but pg parses it back as
  // Node-local time, so `createdAt.getTime()` (and its re-serialized ISO string)
  // is skewed by the server's local offset — the app's "x ago" label then
  // drifts by that offset (~5.5h on an IST server). Reversing the local offset
  // reconstructs the original UTC wall-clock as a true epoch, exactly matching
  // the stored value regardless of any Node/DB clock skew.
  private createdAtEpoch(consent: ConsentRequest): number {
    return (
      consent.createdAt.getTime() -
      consent.createdAt.getTimezoneOffset() * 60_000
    );
  }

  // The absolute epoch (ms) of the decision deadline. Uses the stored
  // decision_deadline_ms (bigint → string, so Number() it). The app now sets
  // `expires_at` equal to the priority-driven decision window (high 1 min /
  // normal 2 min), so for rows lacking decision_deadline_ms it IS the deadline.
  // If that's also missing, fall back to createdAt + the priority window.
  private decisionDeadlineEpoch(consent: ConsentRequest): number {
    if (consent.decisionDeadlineMs != null) {
      return Number(consent.decisionDeadlineMs);
    }
    if (consent.expiresAt != null) {
      return Number(consent.expiresAt);
    }
    return consent.createdAt.getTime() + decisionTimeoutMsFor(consent.priority);
  }

  async approve(consentId: string, actorId: string): Promise<ConsentRequest> {
    // Use the repo directly (not findById) so operator.fcmToken survives —
    // findById's stripUser() wipes it, which would silently mask the FCM ping.
    const consent = await this.consentRepo.findOne({
      where: { id: consentId },
      relations: ['owner', 'operator'],
    });
    if (!consent) throw new NotFoundException('Consent not found');
    // Refuse a late approval once the 60 s firmware-owned window has elapsed,
    // flipping the consent to EXPIRED first so the status check below reports it.
    await this.enforceDecisionWindow(consent, actorId);
    if (consent.status !== 'PENDING_OWNER_APPROVAL') {
      throw new BadRequestException(
        `Cannot approve: status is ${consent.status}`,
      );
    }
    // Approve only a consent whose session is on the matching device (B2).
    // Liveness is intentionally NOT gated here — see assertSessionConsistent.
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
      // Spec Step 16 — wake-up ping only. JWT and PIN are never in FCM;
      // operator app fetches them via GET /consent_response/:consentId.
      this.logFcmDispatch(
        consent,
        'operator',
        this.notificationsService.sendConsentResponseReady(
          consent.operator.fcmToken,
          consent.consentId ?? consent.id,
          consent.txnRef,
          'approved',
          consent.title,
        ),
      );
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

    // NOTE: We deliberately do NOT write a "BLE packet relayed to Witness"
    // audit_logs row here. At this point (owner approval, Step 16) the backend
    // has only approved the consent and armed the PIN — nothing has been
    // relayed over BLE yet, and the backend never talks to firmware directly.
    // The approval is already audited above ("Consent Approved — txnRef"), and
    // PIN readiness is captured by the HID_READY event. The actual relay is the
    // operator app's 0302 GATT write, recorded as the CONSENT_RESPONSE_RELAYED
    // ble_event_audit event (direction APP_TO_FW) from the device side.

    return {
      ...consent,
      owner: this.stripUser(consent.owner),
      operator: this.stripUser(consent.operator),
    };
  }

  // Legacy `createFromBle` removed — superseded by `createConsentRequest`
  // (Spec Step 14). The old method hardcoded `deviceId: 'DTI001'` for the
  // owner lookup; the new method resolves it from `body.device_id`.

  // Spec Step 14 — POST /consent_request. Multipart body with snake_case
  // field names, document file under `document`. Returns the spec response
  // shape.
  // Resolve and validate the consent parties (owner + operator).
  //
  // Phase-1 rules:
  //  1. Owner: resolve body.owner_id (else fall back to the device's owner row);
  //     must have role 'owner'.
  //  2. Operator: body.operator_id must exist and have role 'operator'.
  //  3. Auth binding: the operator must be the authenticated caller (JWT user).
  //  4. Hard-pin (PHASE1_HARDPIN=true, default): owner must be USR-001 and
  //     operator must be USR-002. The seed satisfies this, so the happy flow
  //     passes; set PHASE1_HARDPIN=false to relax to existence+role only.
  private async validateConsentParties(
    ownerId: string | undefined,
    operatorId: string | undefined,
    authUserId: string,
    deviceId: string,
  ): Promise<{ owner: User; operator: User }> {
    // ── Owner ────────────────────────────────────────────────────────────────
    // The owner is authoritative from the device's `owner` row. A supplied
    // owner_id must match it (each device has exactly one owner) — never trust
    // a client-supplied owner that doesn't own the device.
    const device = await this.bleDeviceRepo.findOne({
      where: { deviceId, isActive: true },
      relations: ['owner'],
    });
    if (!device?.owner) {
      throw new NotFoundException(
        `Device owner not found for device_id=${deviceId}`,
      );
    }
    const owner: User = device.owner;
    if (ownerId && ownerId !== owner.id) {
      throw new ForbiddenException(
        `owner_id=${ownerId} does not own device_id=${deviceId} ` +
          `(owner is ${owner.id})`,
      );
    }
    if (owner.role !== 'owner') {
      throw new BadRequestException(
        `owner_id=${owner.id} is not an owner (role=${owner.role})`,
      );
    }

    // ── Operator ───────────────────────────────────────────────────────────
    if (!operatorId) {
      throw new BadRequestException('operator_id is required');
    }
    const operator = await this.userRepo.findOne({
      where: { id: operatorId },
    });
    if (!operator) {
      throw new NotFoundException(
        `Operator not found: operator_id=${operatorId}`,
      );
    }
    if (operator.role !== 'operator') {
      throw new BadRequestException(
        `operator_id=${operator.id} is not an operator (role=${operator.role})`,
      );
    }

    // ── Auth binding ─────────────────────────────────────────────────────────
    // The operator submitting the request must be the authenticated caller.
    if (operator.id !== authUserId) {
      throw new ForbiddenException(
        'operator_id does not match the authenticated user',
      );
    }

    // ── Assignment authorization (multi-device) ───────────────────────────────
    // The operator must hold an active device_assignments row for this device.
    // This replaces the Phase-1 USR-001/USR-002 hard-pin: any valid owner /
    // assigned-operator / device triple is allowed. Same query shape as
    // BleDevicesService.getConfigForOperator.
    const assignment = await this.assignRepo.findOne({
      where: {
        bleDevice: { deviceId },
        operator: { id: operator.id },
        isActive: true,
      },
    });
    if (!assignment) {
      throw new ForbiddenException(
        `operator_id=${operator.id} is not assigned to device_id=${deviceId}`,
      );
    }

    // ── Phase-1 hard-pin (optional extra guard, default off) ──────────────────
    const hardPin = (process.env.PHASE1_HARDPIN ?? 'false') === 'true';
    if (hardPin && (owner.id !== 'USR-001' || operator.id !== 'USR-002')) {
      throw new BadRequestException(
        `Phase-1 hard-pin: expected owner=USR-001 operator=USR-002, ` +
          `got owner=${owner.id} operator=${operator.id}`,
      );
    }

    return { owner, operator };
  }

  // Streams the uploaded file through SHA256 (non-blocking) and returns the
  // lower-case hex digest. Used to verify the app-generated attachment_hash.
  private sha256File(filePath: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const hash = createHash('sha256');
      createReadStream(filePath)
        .on('error', reject)
        .on('data', (chunk) => hash.update(chunk))
        .on('end', () => resolve(hash.digest('hex')));
    });
  }

  async createConsentRequest(
    operatorId: string,
    body: {
      txn: string;
      consent_id?: string;
      device_id: string;
      owner_id?: string;
      operator_id?: string;
      title: string;
      description?: string;
      scope?: string;
      priority?: string;
      expires_at?: number;
      session_id?: string;
      attachment_name?: string;
      attachment_url?: string;
      attachment_hash?: string;
      latitude?: number | null;
      longitude?: number | null;
      location_accuracy?: number | null;
      location_captured_at?: string | null;
      street?: string | null;
      city?: string | null;
      state?: string | null;
      postal_code?: string | null;
    },
    file?: Express.Multer.File,
  ): Promise<{
    status: string;
    message: string;
    consent_id: string;
    txn: string;
    state: string;
    created_at: number;
  }> {
    // ── Party validation (owner + operator) ──────────────────────────────────
    // Resolves and validates the consent parties before persisting. See
    // validateConsentParties() for the full Phase-1 rule set.
    const { owner, operator } = await this.validateConsentParties(
      body.owner_id,
      body.operator_id,
      operatorId,
      body.device_id,
    );

    // ── Session ↔ device consistency (B1) ────────────────────────────────────
    // The request must be filed against the session on this device, and that
    // session must not already carry a pending consent.
    await this.assertSessionConsistent(body.session_id, body.device_id);
    if (body.session_id) {
      const existingPending = await this.consentRepo.findOne({
        where: {
          sessionId: body.session_id,
          status: 'PENDING_OWNER_APPROVAL',
        },
      });
      if (existingPending) {
        throw new BadRequestException(
          `Session ${body.session_id} already has a pending consent ` +
            `(${existingPending.consentId ?? existingPending.id}) — ` +
            `resolve it before requesting another`,
        );
      }
    }

    const fileUrl = file ? `/uploads/${file.filename}` : null;
    const fileName = file ? file.originalname : null;
    const fileSize = file ? file.size : null;

    // Spec §3.1 — the attachment_hash is APP-GENERATED and authoritative. We
    // re-compute the SHA256 server-side only as a safety net: stored as the
    // fallback when the app omits it, and compared (on digest bytes — prefix and
    // hex-case normalized) to log a tamper/mismatch without failing the request.
    let serverHash: string | null = null;
    if (file) {
      try {
        const hex = await this.sha256File(file.path);
        serverHash = `SHA256:${hex}`;
        const appHex = (body.attachment_hash ?? '')
          .replace(/^SHA256:/i, '')
          .toLowerCase();
        if (appHex && appHex !== hex.toLowerCase()) {
          this.logger.warn(
            `Attachment hash mismatch for ${body.txn}: ` +
              `app=${appHex.slice(0, 12)}… server=${hex.slice(0, 12)}…`,
          );
        }
      } catch (e) {
        this.logger.warn(`Could not compute server-side attachment hash: ${e}`);
      }
    }

    const attachmentName = body.attachment_name ?? fileName;
    const attachmentUrl = body.attachment_url ?? fileUrl;
    const attachmentHash = body.attachment_hash ?? serverHash;

    const operatorLatitude =
      typeof body.latitude === 'number' && Number.isFinite(body.latitude)
        ? body.latitude
        : null;
    const operatorLongitude =
      typeof body.longitude === 'number' && Number.isFinite(body.longitude)
        ? body.longitude
        : null;
    const operatorLocationAccuracy =
      typeof body.location_accuracy === 'number' &&
      Number.isFinite(body.location_accuracy)
        ? body.location_accuracy
        : null;
    let operatorLocationCapturedAt: Date | null = null;
    if (body.location_captured_at) {
      const parsed = new Date(body.location_captured_at);
      if (!Number.isNaN(parsed.getTime())) {
        operatorLocationCapturedAt = parsed;
      }
    } else if (operatorLatitude != null && operatorLongitude != null) {
      operatorLocationCapturedAt = new Date();
    }

    const operatorStreet =
      typeof body.street === 'string' && body.street.trim()
        ? body.street.trim()
        : null;
    const operatorCity =
      typeof body.city === 'string' && body.city.trim()
        ? body.city.trim()
        : null;
    const operatorState =
      typeof body.state === 'string' && body.state.trim()
        ? body.state.trim()
        : null;
    const operatorPostalCode =
      typeof body.postal_code === 'string' && body.postal_code.trim()
        ? body.postal_code.trim()
        : null;

    // Decision-window lengths are DB-configured per device; load the row so the
    // priority-driven deadline uses the device's values (falls back to defaults
    // if the device_id is unknown).
    const device = body.device_id
      ? await this.bleDeviceRepo.findOne({
          where: { deviceId: body.device_id },
        })
      : null;

    // Auditable snapshot of the full §3.1 app-generated consent_request (the
    // complete form with title + attachments — an app-workflow audit record, NOT
    // an on-wire BLE packet; 0301 is app-workflow-only). Stored in blePacketRaw
    // (was always null before). ts = expires_at - 300000 per §3.1.
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
      // Spec §3.1 attachment metadata.
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
      // Full §3.1 app-generated request snapshot (was: blePayload misused to
      // hold the bare txn, which only duplicated txnRef).
      blePacketRaw,
      priority: body.priority ?? 'normal',
      expiresAt: body.expires_at ?? null,
      // Authoritative decision deadline as an absolute epoch (server clock at
      // creation) — TZ-safe, unlike createdAt. Window length is priority-driven
      // and DB-configured per device. All decision-window checks use this value.
      decisionDeadlineMs:
        Date.now() + decisionTimeoutMsFor(body.priority ?? 'normal', device),
      sessionId: body.session_id ?? null,
      deviceId: body.device_id ?? null,
      status: 'PENDING_OWNER_APPROVAL',
      delivery: 'FCM · BLE relay',
      owner,
      // operator is the validated User entity from validateConsentParties().
      operator,
    });
    await this.consentRepo.save(consent);

    await this.safeAudit({
      action: `Consent request created — ${body.txn}`,
      type: 'system',
      actorId: operatorId,
      actorRole: 'operator',
      actorName: operator?.name,
      detail:
        `Title: ${body.title} · File: ${attachmentName ?? 'none'}` +
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
      this.logFcmDispatch(
        consent,
        'owner',
        this.notificationsService.sendConsentRequest(
          owner.fcmToken,
          consent.consentId ?? consent.id,
          body.title,
          body.txn,
          fileUrl,
          body.description,
        ),
      );
    }

    return {
      status: 'created',
      message: 'Consent request created',
      consent_id: consent.consentId ?? consent.id,
      txn: consent.txnRef,
      state: consent.status, // PENDING_OWNER_APPROVAL after #9
      created_at: consent.createdAt.getTime(),
    };
  }

  // Spec Step 16 — POST /consent_response. Persists owner decision, then
  // delegates to approve/reject which mint the JWT and trigger the
  // consent_response_ready FCM ping (no jwt/pin in FCM — see #1 fix).
  async submitConsentResponse(
    actorId: string,
    body: { consent_id: string; decision: string; reason?: string },
  ): Promise<{
    status: string;
    consent_id: string;
    decision: string;
    decided_at: number;
  }> {
    const isUuid =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        body.consent_id,
      );
    const consent = isUuid
      ? await this.consentRepo.findOne({ where: { id: body.consent_id } })
      : await this.consentRepo.findOne({
          where: { consentId: body.consent_id },
        });
    if (!consent) throw new NotFoundException('Consent not found');

    let updated: ConsentRequest;
    if (body.decision === 'approved') {
      updated = await this.approve(consent.id, actorId);
    } else if (body.decision === 'rejected') {
      // Persist the owner's reason (default OWNER_REJECTED) so the GET response
      // and relayed 0302 reason are accurate.
      updated = await this.reject(consent.id, actorId, body.reason);
    } else {
      throw new BadRequestException(`Invalid decision: ${body.decision}`);
    }

    const decidedAt =
      body.decision === 'approved'
        ? (updated.approvedAt?.getTime() ?? Date.now())
        : (updated.rejectedAt?.getTime() ?? Date.now());

    return {
      status: body.decision === 'approved' ? 'approved' : 'rejected',
      consent_id: updated.consentId ?? updated.id,
      decision: body.decision,
      decided_at: decidedAt,
    };
  }

  // Spec §6.2 — the operator app reports a successful HID PIN injection
  // (firmware's hid_pin_inject_ack, status=success) here. The backend pings the
  // OWNER (subscriber) that their PIN was used, naming the operator, the
  // document and the time. Fired ONLY on success; no-op on any other status so
  // a failure produces no owner notification. Best-effort — never throws back
  // to the operator app (the inject already completed on the wire).
  async notifyHidInjectUsed(
    idOrConsentId: string,
    status: string,
    usedAtMs?: number,
    callerId?: string,
  ): Promise<{ status: string }> {
    if (status !== 'success') {
      return { status: 'ignored' };
    }
    const isUuid =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        idOrConsentId,
      );
    const consent = await this.consentRepo.findOne({
      where: isUuid ? { id: idOrConsentId } : { consentId: idOrConsentId },
      relations: ['owner', 'operator'],
    });
    if (!consent) throw new NotFoundException('Consent not found');
    this.assertCallerIsParty(consent, callerId);

    const usedAt = usedAtMs ?? Date.now();

    if (consent.owner?.fcmToken) {
      this.logFcmDispatch(
        consent,
        'owner',
        this.notificationsService.sendHidInjectSuccess(
          consent.owner.fcmToken,
          this.publicConsentId(consent),
          consent.txnRef,
          consent.operator?.name ?? 'operator',
          consent.title,
          usedAt,
        ),
      );
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

  async markAborted(
    idOrConsentId: string,
    reason: string,
    // When supplied (the tamper cascade), the consent state-change save runs
    // inside the caller's transaction so it commits/rolls back atomically with
    // the tamper event and session-end writes. The mirrored audit/event writes
    // (recordConsentTerminal) stay best-effort, per the existing design.
    manager?: EntityManager,
  ): Promise<void> {
    const repo = manager
      ? manager.getRepository(ConsentRequest)
      : this.consentRepo;
    const isUuid =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        idOrConsentId,
      );
    let consent: ConsentRequest | null = null;
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
    if (!consent) return;

    // Idempotent — already in a terminal state means do nothing.
    if (
      ['APPROVED', 'REJECTED', 'EXPIRED', 'TAMPER_ABORTED'].includes(
        consent.status,
      )
    ) {
      return;
    }

    // Dispatch by reason to the right spec state.
    let eventType: string;
    if (reason === 'TAMPER_DETECTED' || reason === 'TAMPER_ABORTED') {
      consent.status = 'TAMPER_ABORTED';
      eventType = 'CONSENT_TAMPER_ABORTED';
    } else if (reason === 'REQUEST_EXPIRED') {
      consent.status = 'EXPIRED';
      eventType = 'CONSENT_EXPIRED';
    } else if (SPEC_REJECTION_REASONS.has(reason)) {
      // Spec §3.2 rejection reason codes (OPERATOR_DECLINED, INVALID_REQUEST,
      // ERR_DUPLICATE_TXN, ERR_INVALID_PAYLOAD) are genuine *rejections*, not
      // out-of-band aborts — so the audit event is CONSENT_REJECTED. An
      // operator-initiated cancel arrives here as OPERATOR_DECLINED.
      consent.status = 'REJECTED';
      eventType = 'CONSENT_REJECTED';
    } else {
      // OWNER_ABORTED / ABORTED_BY_USER / any other → terminal REJECTED (abort).
      consent.status = 'REJECTED';
      eventType = 'CONSENT_ABORTED';
    }
    consent.abortedReason = reason;
    // Stamp a terminal timestamp so an aborted/expired consent isn't left with a
    // null rejectedAt (UAT: ABORTED_BY_USER rows were status=REJECTED with no
    // rejectedAt). REJECTED → rejectedAt; the expiry/tamper paths leave it null
    // (they're tracked by abortedReason + status).
    if (consent.status === 'REJECTED' && !consent.rejectedAt) {
      consent.rejectedAt = new Date();
    }
    await repo.save(consent);
    // Mirror the terminal transition to both audit tables (was silent before).
    await this.recordConsentTerminal(
      consent,
      eventType,
      'SYSTEM',
      'system',
      `Consent ${consent.status.toLowerCase()} — ${consent.txnRef}`,
      `reason=${reason}`,
    );
  }

  async reject(
    consentId: string,
    actorId: string,
    // Spec §3.2 rejection reason codes: OPERATOR_DECLINED = owner/operator manually rejected.
    reason = 'OPERATOR_DECLINED',
  ): Promise<ConsentRequest> {
    const consent = await this.consentRepo.findOne({
      where: { id: consentId },
      relations: ['owner', 'operator'],
    });
    if (!consent) throw new NotFoundException('Consent not found');
    await this.enforceDecisionWindow(consent, actorId);
    if (consent.status !== 'PENDING_OWNER_APPROVAL') {
      throw new BadRequestException(
        `Cannot reject: status is ${consent.status}`,
      );
    }
    // Device must still match; a rejection is valid even if the link dropped.
    await this.assertSessionConsistent(consent.sessionId, consent.deviceId);

    consent.status = 'REJECTED';
    // Persist the owner's rejection reason (Spec Step 17 reason codes) so the
    // operator's GET /consent_response — and the 0302 reason it relays — reflect
    // the actual reason instead of a generic fallback.
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
      this.logFcmDispatch(
        consent,
        'operator',
        this.notificationsService.sendConsentResponseReady(
          consent.operator.fcmToken,
          consent.consentId ?? consent.id,
          consent.txnRef,
          'rejected',
          consent.title,
        ),
      );
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
}
