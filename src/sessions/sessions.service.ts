import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, IsNull, Repository } from 'typeorm';
import { randomUUID } from 'crypto';
import { BleSession } from './entities/ble-session.entity';
import { DeviceIdentitySnapshot } from './entities/device-identity-snapshot.entity';
import { BleEventsService } from '../ble-events/ble-events.service';
import { LoggerService } from '../logging/logger.service';
import {
  CreateSessionDto,
  EndReason,
  EndSessionDto,
  SessionState,
  UpdateSessionStateDto,
} from './dto/session.dto';

const TRANSITIONS: Record<SessionState, SessionState[]> = {
  [SessionState.IDLE]: [
    SessionState.CONSENT_REQUESTED,
    SessionState.SESSION_ENDING,
  ],
  [SessionState.CONSENT_REQUESTED]: [
    SessionState.CONSENT_ACTIVE,
    SessionState.IDLE,
    SessionState.SESSION_ENDING,
  ],
  [SessionState.CONSENT_ACTIVE]: [
    SessionState.CONSENT_COMPLETED,
    SessionState.SESSION_ENDING,
  ],
  [SessionState.CONSENT_COMPLETED]: [
    SessionState.IDLE,
    SessionState.SESSION_ENDING,
  ],
  [SessionState.SESSION_ENDING]: [],
};

@Injectable()
export class SessionsService {
  private readonly logger = new Logger(SessionsService.name);

  constructor(
    @InjectRepository(BleSession)
    private sessionRepo: Repository<BleSession>,
    @InjectRepository(DeviceIdentitySnapshot)
    private snapshotRepo: Repository<DeviceIdentitySnapshot>,
    private bleEventsService: BleEventsService,
    private readonly appLog: LoggerService,
    private readonly dataSource: DataSource,
  ) {}

  // Telemetry write must never fail a session operation (start/state/end).
  private async safeRecordEvent(
    dto: Parameters<BleEventsService['recordEvent']>[0],
  ): Promise<void> {
    try {
      await this.bleEventsService.recordEvent(dto);
    } catch (e) {
      this.appLog.error(`ble event record failed (${dto.eventType}): ${e}`, {
        service: 'sessions',
        eventType: 'BLE_EVENT_WRITE_FAILED',
      });
    }
  }

  async start(dto: CreateSessionDto): Promise<BleSession> {
    // Idempotent ONLY for a session that is still active. The app issues
    // POST /sessions/start more than once for the same handshake (a
    // fire-and-forget call in performHandshake plus the awaited registration
    // step), so a still-open row for this session_id means "same handshake" —
    // return it; do NOT end it and re-insert (that would log a spurious
    // SESSION_ENDED mid-session and violate the unique session_id constraint).
    //
    // BUT if the matching row has already ENDED, this is a genuinely new
    // connection that the firmware re-announced with the same (static,
    // non-rotating) session_id. Returning the dead row would silently re-attach
    // every reconnect to one stale session — the UAT bug where ~105 connections
    // collapsed to 4 ble_sessions rows. Fall through to create a fresh row.
    const existing = await this.sessionRepo.findOne({
      where: { sessionId: dto.sessionId },
    });
    if (existing && !existing.endedAt) return existing;

    // End any OTHER active session on this device (a genuinely stale prior
    // session) — but never the one we are about to create.
    const active = await this.getActiveByDevice(dto.deviceId);
    if (active && active.sessionId !== dto.sessionId) {
      await this.end(active.sessionId, { reason: EndReason.DISCONNECTED });
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
      state: SessionState.IDLE,
    });
    const hasIdentity = !!(
      dto.macAddress ||
      dto.fwVersion ||
      dto.hwVersion ||
      dto.bleVersion ||
      dto.tlsVersion
    );

    // Atomic: the session row and its identity snapshot commit together, so a
    // snapshot failure rolls back the session rather than leaving an orphan.
    let saved: BleSession;
    try {
      saved = await this.dataSource.transaction(async (manager) => {
        const persisted = await manager.save(session);
        if (hasIdentity) {
          await manager.save(
            this.snapshotRepo.create({
              sessionId: dto.sessionId,
              deviceId: dto.deviceId,
              macAddress: dto.macAddress,
              ownerId: dto.ownerId,
              fwVersion: dto.fwVersion,
              hwVersion: dto.hwVersion,
              bleVersion: dto.bleVersion,
              tlsVersion: dto.tlsVersion,
            }),
          );
        }
        return persisted;
      });
    } catch (e) {
      // Race: a concurrent /sessions/start with the same session_id inserted
      // first (unique-constraint violation rolls the transaction back). Treat as
      // idempotent — return the row that won.
      const raced = await this.sessionRepo.findOne({
        where: { sessionId: dto.sessionId },
      });
      if (raced) return raced;
      throw e;
    }

    // NOTE: no SESSION_ANNOUNCE audit event is recorded here. The session
    // registration is the ble_sessions row itself (saved above). SESSION_ANNOUNCE
    // in ble_event_audit is reserved for the firmware's actual 0201 announce,
    // recorded by the app (FW_TO_APP) — see mobile `_onSessionAnnounce`.
    this.appLog.log('session started', {
      service: 'sessions',
      eventType: 'SESSION_STARTED',
      sessionId: saved.sessionId,
      deviceId: saved.deviceId,
      actorId: dto.operatorId,
    });
    return saved;
  }

  async findBySessionId(sessionId: string): Promise<BleSession> {
    // A static firmware session_id can now have several ended history rows plus
    // at most one active row. Resolve to the most recent (active row wins, since
    // it has the latest started_at) so updateState/end act on the live session.
    const session = await this.sessionRepo.findOne({
      where: { sessionId },
      order: { startedAt: 'DESC' },
    });
    if (!session) throw new NotFoundException(`Session ${sessionId} not found`);
    return session;
  }

  async getActiveByDevice(deviceId: string): Promise<BleSession | null> {
    return this.sessionRepo.findOne({
      where: { deviceId, endedAt: IsNull() },
    });
  }

  async updateState(
    sessionId: string,
    dto: UpdateSessionStateDto,
  ): Promise<BleSession> {
    const session = await this.findBySessionId(sessionId);

    if (session.endedAt) {
      throw new BadRequestException(`Session ${sessionId} is already ended`);
    }

    const currentState = session.state as SessionState;
    const allowed = TRANSITIONS[currentState] ?? [];
    if (!allowed.includes(dto.state)) {
      throw new BadRequestException(
        `Invalid state transition: ${currentState} → ${dto.state}`,
      );
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

    // NOTE: no SESSION_STATE_<state> audit event is recorded. The app's
    // session-flow states (CONSENT_REQUESTED/ACTIVE/COMPLETED) are bookkeeping —
    // the backend CONSENT_REQUESTED and the consent events already cover the
    // flow. The ble_sessions.state column + transition validation above are kept.
    return updated;
  }

  async end(sessionId: string, dto: EndSessionDto): Promise<BleSession> {
    const session = await this.findBySessionId(sessionId);

    if (session.endedAt) return session;

    session.endedAt = new Date();
    session.endedReason = dto.reason;
    session.state = SessionState.SESSION_ENDING;
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

  async endAllActive(
    deviceId: string,
    reason: EndReason,
    // When supplied (e.g. the tamper cascade), the bulk update runs inside the
    // caller's transaction so it commits/rolls back with the other writes.
    manager?: EntityManager,
  ): Promise<number> {
    // Device-level cascade across N sessions — no single sessionId, so use a
    // requestId for this one bulk operation; deviceId is the correlation hook.
    const requestId = randomUUID();
    const repo = manager ? manager.getRepository(BleSession) : this.sessionRepo;
    const result = await repo
      .createQueryBuilder()
      .update(BleSession)
      .set({
        endedAt: new Date(),
        endedReason: reason,
        state: SessionState.SESSION_ENDING,
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
}
