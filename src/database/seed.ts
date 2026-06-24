import '../polyfill';
import { DataSource } from 'typeorm';
import { User } from '../entities/user.entity';
import { Device } from '../entities/device.entity';
import { ConsentRequest } from '../entities/consent-request.entity';
import { AuditLog } from '../entities/audit-log.entity';
import { BleDevice } from '../entities/ble-device.entity';
import { BleCharacteristic } from '../entities/ble-characteristic.entity';
import { DeviceAssignment } from '../entities/device-assignment.entity';
import { BleSession } from '../sessions/entities/ble-session.entity';
import { BleEventAudit } from '../ble-events/entities/ble-event-audit.entity';
import * as bcrypt from 'bcrypt';

const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5433'),
  username: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME || 'ascent.en',
  entities: [
    User,
    Device,
    ConsentRequest,
    AuditLog,
    BleDevice,
    BleCharacteristic,
    DeviceAssignment,
    BleSession,
    BleEventAudit,
  ],
  synchronize: true,
});

async function seed() {
  await AppDataSource.initialize();
  console.log('🌱 Seeding database...');

  const userRepo = AppDataSource.getRepository(User);
  const deviceRepo = AppDataSource.getRepository(Device);
  const consentRepo = AppDataSource.getRepository(ConsentRequest);
  const auditRepo = AppDataSource.getRepository(AuditLog);
  const bleDeviceRepo = AppDataSource.getRepository(BleDevice);
  const bleCharRepo = AppDataSource.getRepository(BleCharacteristic);
  const assignRepo = AppDataSource.getRepository(DeviceAssignment);
  const bleSessionRepo = AppDataSource.getRepository(BleSession);
  const bleEventRepo = AppDataSource.getRepository(BleEventAudit);

  // Clear existing data (CASCADE handles FK order)
  await AppDataSource.query(
    'TRUNCATE TABLE ble_event_audit, ble_sessions, device_identity_snapshots, rtc_sync_events, tamper_events, device_assignments, ble_characteristics, ble_devices, audit_logs, consent_requests, devices, users RESTART IDENTITY CASCADE',
  );

  // ── Users ────────────────────────────────────────────────────────────────
  // PHASE 1 DEMO: IDs are fixed firmware-spec strings (USR-001 … USR-006).
  // The firmware hardcodes "USR-001" as owner_id and "USR-002" as operator_id
  // in characteristics 0101/0102 — so the DTI001 pair must stay USR-001/USR-002.
  // These IDs must match what is seeded here so backend FK lookups succeed.
  //
  // TODO (real firmware): When real nRF52840 arrives and is provisioned with
  // real UUIDs, do the following:
  //   1. Remove all explicit `id:` assignments below.
  //   2. Switch user.entity.ts back to @PrimaryGeneratedColumn('uuid').
  //   3. Run `npm run seed:fresh` — Postgres will auto-generate UUIDs.
  //   4. Re-enable the UUID guard in consent.service.ts (see comment there).

  // Spec A.7: PIN lives on the owner record and is fetched server-side at
  // consent approval. Cleartext is the Phase 1 accepted-risk.
  //
  // Three owner+operator pairs, one per device (USR-001..USR-006):
  //   DTI001 → owner USR-001, operator USR-002   (firmware-hardcoded pair)
  //   DTI002 → owner USR-003, operator USR-004
  //   DTI003 → owner USR-005, operator USR-006

  // ── DTI001 pair ────────────────────────────────────────────────────────────
  const owner = userRepo.create({
    id: 'USR-001', // matches firmware 0101/0102 owner_id
    email: 'owner1@dtii.in',
    name: 'Rajesh Kumar',
    role: 'owner',
    deviceId: 'DTI001',
    passwordHash: await bcrypt.hash('owner123', 10),
    pin: '11111111',
  });
  const operator1 = userRepo.create({
    id: 'USR-002', // matches firmware 0101/0102 operator_id
    email: 'operator1@dtii.in',
    name: 'Amit Sharma',
    role: 'operator',
    deviceId: 'DTI001',
    passwordHash: await bcrypt.hash('op123', 10),
  });

  // ── DTI002 pair ────────────────────────────────────────────────────────────
  const owner2 = userRepo.create({
    id: 'USR-003',
    email: 'owner2@dtii.in',
    name: 'Priya Nair',
    role: 'owner',
    deviceId: 'DTI002',
    passwordHash: await bcrypt.hash('owner123', 10),
    pin: '22222222',
  });
  const operator2 = userRepo.create({
    id: 'USR-004',
    email: 'operator2@dtii.in',
    name: 'Sanjay Mehta',
    role: 'operator',
    deviceId: 'DTI002',
    passwordHash: await bcrypt.hash('op123', 10),
  });

  // ── DTI003 pair ────────────────────────────────────────────────────────────
  const owner3 = userRepo.create({
    id: 'USR-005',
    email: 'owner3@dtii.in',
    name: 'Vikram Singh',
    role: 'owner',
    deviceId: 'DTI003',
    passwordHash: await bcrypt.hash('owner123', 10),
    pin: '33333333',
  });
  const operator3 = userRepo.create({
    id: 'USR-006',
    email: 'operator3@dtii.in',
    name: 'Neha Kulkarni',
    role: 'operator',
    deviceId: 'DTI003',
    passwordHash: await bcrypt.hash('op123', 10),
  });

  await userRepo.save([
    owner,
    operator1,
    owner2,
    operator2,
    owner3,
    operator3,
  ]);

  // Create Device DTI001
  const device = deviceRepo.create({
    deviceName: 'DTI001',
    macAddress: '4C:3A:9B:E8:1F:02',
    deviceType: 'BLE Simulator',
    isPaired: true,
    owner: owner,
  });
  await deviceRepo.save(device);

  // Seed consent requests (matching Flutter mock data)
  const now = new Date();

  // Seeded as EXPIRED — these are demo/reference records. Leaving them as
  // PENDING_OWNER_APPROVAL caused them to appear as live pending requests in
  // the owner's consent list indefinitely (no server-side expiry ran on them),
  // which led to owners approving the wrong consent and intermittent
  // "Request Expired" bugs on the operator side.
  // Historical demo session these reference (seeded as an ended session below)
  // so each consent's session_id resolves to a real ble_sessions row — same
  // correlation the live flow maintains (spec §3.1 consent_request fields).
  const seedSessionId = 'sess-seed-0001';
  // consent_id follows the spec CST-2026-xxxx format (§3.1). Seeding it means
  // events/JWT/responses for these rows are keyed by the human id, not the UUID.
  // Full §3.1 app-generated consent_request snapshot, stored in blePacketRaw
  // (replaces the old fake-hex `blePayload`). ts = expires_at - 300000 per spec.
  const mkPacket = (p: {
    txn: string;
    consentId: string;
    title: string;
    scope: string;
    expiresAt?: number;
    priority?: string;
  }): string =>
    JSON.stringify({
      version: '1.0',
      cmd: 'consent_request',
      txn: p.txn,
      ts: p.expiresAt ? p.expiresAt - 300000 : null,
      device_id: 'DTI001',
      consent_id: p.consentId,
      owner_id: owner.id,
      operator_id: operator1.id,
      title: p.title,
      scope: p.scope,
      expires_at: p.expiresAt ?? null,
      priority: p.priority ?? 'normal',
      attachment_name: null,
      attachment_url: null,
      attachment_hash: null,
    });

  const c1 = consentRepo.create({
    txnRef: 'TXN-9F3A2C',
    consentId: 'CST-2026-0001',
    deviceId: 'DTI001',
    sessionId: seedSessionId,
    title: 'Data Processing Agreement — Section 4B',
    status: 'EXPIRED',
    abortedReason: 'REQUEST_EXPIRED',
    scope: 'READ_WRITE',
    blePacketRaw: mkPacket({ txn: 'TXN-9F3A2C', consentId: 'CST-2026-0001', title: 'Data Processing Agreement — Section 4B', scope: 'READ_WRITE', expiresAt: now.getTime() - 2 * 60 * 1000 }),
    delivery: 'FCM · BLE relay',
    owner: owner,
    operator: operator1,
    expiresAt: now.getTime() - 2 * 60 * 1000, // already past
    createdAt: new Date(now.getTime() - 2 * 60 * 1000),
  });
  const c2 = consentRepo.create({
    txnRef: 'TXN-8B2E1A',
    consentId: 'CST-2026-0002',
    deviceId: 'DTI001',
    sessionId: seedSessionId,
    title: 'API Gateway Access — Production Scope',
    status: 'EXPIRED',
    abortedReason: 'REQUEST_EXPIRED',
    scope: 'READ',
    blePacketRaw: mkPacket({ txn: 'TXN-8B2E1A', consentId: 'CST-2026-0002', title: 'API Gateway Access — Production Scope', scope: 'READ', expiresAt: now.getTime() - 14 * 60 * 1000 }),
    delivery: 'FCM · BLE relay',
    owner: owner,
    operator: operator1,
    expiresAt: now.getTime() - 14 * 60 * 1000, // already past
    createdAt: new Date(now.getTime() - 14 * 60 * 1000),
  });
  const c3 = consentRepo.create({
    txnRef: 'TXN-7C4D9B',
    consentId: 'CST-2026-0003',
    deviceId: 'DTI001',
    sessionId: seedSessionId,
    title: 'BLE Firmware Update Consent',
    status: 'APPROVED',
    scope: 'WRITE',
    blePacketRaw: mkPacket({ txn: 'TXN-7C4D9B', consentId: 'CST-2026-0003', title: 'BLE Firmware Update Consent', scope: 'WRITE' }),
    delivery: 'FCM · BLE relay',
    owner: owner,
    operator: operator1,
    approvedAt: new Date(now.getTime() - 60 * 60 * 1000),
    createdAt: new Date(now.getTime() - 60 * 60 * 1000),
  });
  const c4 = consentRepo.create({
    txnRef: 'TXN-6E3A7F',
    consentId: 'CST-2026-0004',
    deviceId: 'DTI001',
    sessionId: seedSessionId,
    title: 'Owner Profile Update Authorization',
    status: 'REJECTED',
    abortedReason: 'OPERATOR_DECLINED',
    scope: 'READ_WRITE',
    blePacketRaw: mkPacket({ txn: 'TXN-6E3A7F', consentId: 'CST-2026-0004', title: 'Owner Profile Update Authorization', scope: 'READ_WRITE' }),
    delivery: 'FCM · BLE relay',
    owner: owner,
    operator: operator1,
    rejectedAt: new Date(now.getTime() - 2 * 60 * 60 * 1000),
    createdAt: new Date(now.getTime() - 2 * 60 * 60 * 1000),
  });
  await consentRepo.save([c1, c2, c3, c4]);

  // ── Backing BLE session + audit trail (A4) ────────────────────────────────
  // One ended demo session so the seeded consents' session_id resolves to a
  // real ble_sessions row, plus the protocol audit trail for the APPROVED
  // consent (c3) — keyed by the SAME session_id + CST consent_id the live flow
  // uses, so the seeded data is internally consistent end-to-end.
  const seedSessionStart = new Date(now.getTime() - 60 * 60 * 1000);
  const seedSessionEnd = new Date(now.getTime() - 59 * 60 * 1000);
  await bleSessionRepo.save(
    bleSessionRepo.create({
      sessionId: seedSessionId,
      deviceId: 'DTI001',
      operatorId: operator1.id, // USR-002
      ownerId: owner.id, // USR-001
      fwVersion: '1.0.0',
      hwVersion: '1.2.0',
      macAddress: '4C:3A:9B:E8:1F:02',
      bleVersion: '5.0',
      tlsVersion: '1.3',
      state: 'SESSION_ENDING',
      startedAt: seedSessionStart,
      endedAt: seedSessionEnd,
      endedReason: 'COMPLETED',
    }),
  );

  const auditTrail: Array<Partial<BleEventAudit>> = [
    {
      // FW→App 0201 announce (Spec §2.1) — recorded by the app. payload = spec
      // session_announce fields.
      eventType: 'SESSION_ANNOUNCE',
      direction: 'FW_TO_APP',
      sessionId: seedSessionId,
      deviceId: 'DTI001',
      actorId: operator1.id,
      payloadSummary: {
        version: '1.0',
        cmd: 'session_announce',
        txn: 'PAIR-SEED',
        device_id: 'DTI001',
        session_id: seedSessionId,
        protocol_version: '1.0',
        device_state: 'IDLE',
        mode: 'owner',
        firmware_version: '2.2.0',
        ble_version: '5.0',
        tls_version: '1.3',
        mac: '4C:3A:9B:E8:1F:02',
      },
    },
    {
      // FW→App handshake completion (Spec §2.3) — session is established.
      eventType: 'SESSION_ESTABLISHED',
      direction: 'FW_TO_APP',
      sessionId: seedSessionId,
      deviceId: 'DTI001',
      actorId: operator1.id,
      payloadSummary: {
        version: '1.0',
        cmd: 'session_confirm',
        txn: 'PAIR-SEED',
        device_id: 'DTI001',
        session_id: seedSessionId,
        status: 'established',
      },
    },
    {
      eventType: 'CONSENT_REQUESTED',
      direction: 'APP_TO_BE',
      sessionId: seedSessionId,
      consentId: c3.consentId,
      txn: c3.txnRef,
      payloadSummary: {
        title: c3.title,
        scope: c3.scope,
        priority: 'normal',
        device_id: 'DTI001',
      },
    },
    {
      eventType: 'CONSENT_APPROVED',
      direction: 'BE_TO_APP',
      sessionId: seedSessionId,
      consentId: c3.consentId,
      txn: c3.txnRef,
      payloadSummary: { decision: 'approved' },
    },
    {
      eventType: 'AFFIX_READY',
      direction: 'BE_TO_APP',
      sessionId: seedSessionId,
      consentId: c3.consentId,
      txn: c3.txnRef,
    },
    {
      // App→FW inject trigger (0601) — the "injection initiated" anchor between
      // AFFIX_READY (consent armed) and AFFIX_COMPLETED (firmware result). No PIN/JWT.
      eventType: 'AFFIX_INJECT_SENT',
      direction: 'APP_TO_FW',
      sessionId: seedSessionId,
      consentId: c3.consentId,
      txn: c3.txnRef,
      deviceId: 'DTI001',
      actorId: operator1.id,
      payloadSummary: { cmd: 'hid_pin_inject', action: 'inject' },
    },
    {
      eventType: 'AFFIX_COMPLETED',
      direction: 'FW_TO_APP',
      sessionId: seedSessionId,
      consentId: c3.consentId,
      txn: c3.txnRef,
      deviceId: 'DTI001',
      payloadSummary: { cmd: 'hid_pin_inject_ack', device_id: 'DTI001' },
    },
    {
      eventType: 'SESSION_ENDED',
      direction: 'APP_TO_BE',
      sessionId: seedSessionId,
      payloadSummary: { device_id: 'DTI001', reason: 'COMPLETED' },
    },
  ];
  // Stamp each row with an increasing recorded_at (1 s apart) so the demo trail
  // sorts in true event order — recorded_at is the event-time replay key, not the
  // insert time (rows are saved within the same millisecond otherwise).
  const auditBaseTs = Date.now() - auditTrail.length * 1000;
  for (let i = 0; i < auditTrail.length; i++) {
    const e = auditTrail[i];
    e.recordedAt = new Date(auditBaseTs + i * 1000);
    await bleEventRepo.save(bleEventRepo.create(e));
  }

  // Seed audit log
  await auditRepo.save([
    auditRepo.create({
      action: `Consent Approved — ${c3.title}`,
      type: 'approve',
      actorId: owner.id,
      actorRole: 'owner',
      actorName: owner.name,
      detail: 'Owner approved · Affix consent for BLE relay',
      consentRequest: c3,
      // Seed bypasses AuditService.log(), so set the correlation keys directly.
      consentId: c3.consentId,
      txn: c3.txnRef,
      sessionId: c3.sessionId,
      deviceId: c3.deviceId,
    }),
    // NOTE: No "BLE packet relayed to Witness" audit_logs row is seeded. The
    // backend never relays to firmware — the actual 0302 relay is the operator
    // app's GATT write, recorded as the CONSENT_RESPONSE_RELAYED protocol event
    // in ble_event_audit (direction APP_TO_FW), not in the governance trail.
    auditRepo.create({
      action: 'Owner login — JWT issued',
      type: 'login',
      actorId: owner.id,
      actorRole: 'owner',
      actorName: owner.name,
      detail: 'Auth API · demo one-tap',
    }),
    auditRepo.create({
      action: 'BLE pairing — DTI001',
      type: 'ble',
      actorId: operator1.id,
      actorRole: 'operator',
      detail: 'Device: DTI001 · RSSI −62 dBm',
      sessionId: seedSessionId,
      deviceId: 'DTI001',
    }),
    auditRepo.create({
      action: 'PostgreSQL schema initialised',
      type: 'system',
      actorId: 'SYSTEM',
      actorRole: 'system',
      detail: 'DB: ascent.en · seeded',
    }),
  ]);

  // Seed BLE device DTI001
  const dti001 = bleDeviceRepo.create({
    deviceId: 'DTI001',
    deviceName: 'Witness Device DTI001',
    macAddress: '4C:3A:9B:E8:1F:02', // MAC unchanged
    // Advertised service UUID the app scans for: the Device Information Service
    // (spec §1) — the real nRF52840 firmware advertises this 4454-family service
    // UUID. (44540101 is the Device Identity CHARACTERISTIC inside this service.)
    serviceUuid: '44540100-7C8E-4A91-B6F2-5D73E9C104AF',
    advertisementName: 'DTI001',
    bleVersion: '5.0',
    tlsVersion: '1.3',
    firmwareVersion: '1.0.0',
    // Honest initial state — nothing is paired at seed time. Runtime flips this
    // to true on a successful handshake via PATCH /ble-devices/:id/status.
    isPaired: false,
    isActive: true,
    // Runtime config — single source of truth for the app (spec-anchored).
    protocolVersion: '1.0',
    disconnectTimeoutSec: 90,
    heartbeatIntervalSec: 10, // spec: heartbeat every 10 s
    staleHeartbeatSec: 25, // spec: stale-session threshold ~25 s
    ackTimeoutSec: 10, // spec: retry consent_response if no ack in 10 s
    maxAckRetries: 3,
    consentDecisionNormalSec: 120, // app decision window — normal priority (2 min)
    consentDecisionHighSec: 60, // app decision window — high priority (1 min)
    hidInjectWindowSec: 60,
    rtcDriftThresholdSec: 30,
    maxPacketBytes: 512, // MTU 512 — session_announce is ~269 bytes; 247 truncates it
    owner: owner,
  });
  await bleDeviceRepo.save(dti001);

  // Second BLE device DTI002 — owned by owner2 (USR-003), operated by operator2
  // (USR-004). CRITICAL: unique deviceId AND unique advertisementName so the
  // app's scan (identify-by-advertised-name) and the 0101 device_id identity
  // check (ble_service.dart) never collide with DTI001. Runtime config mirrors
  // DTI001's spec-anchored defaults.
  const dti002 = bleDeviceRepo.create({
    deviceId: 'DTI002',
    deviceName: 'Witness Device DTI002',
    macAddress: '4C:3A:9B:E8:1F:03', // distinct MAC
    serviceUuid: '44540100-7C8E-4A91-B6F2-5D73E9C104AF',
    advertisementName: 'DTI002', // distinct advertised name — scan key
    bleVersion: '5.0',
    tlsVersion: '1.3',
    firmwareVersion: '1.0.0',
    isPaired: false,
    isActive: true,
    protocolVersion: '1.0',
    disconnectTimeoutSec: 90,
    heartbeatIntervalSec: 10,
    staleHeartbeatSec: 25,
    ackTimeoutSec: 10,
    maxAckRetries: 3,
    consentDecisionNormalSec: 120,
    consentDecisionHighSec: 60,
    hidInjectWindowSec: 60,
    rtcDriftThresholdSec: 30,
    maxPacketBytes: 512,
    owner: owner2,
  });
  await bleDeviceRepo.save(dti002);

  // Third BLE device DTI003 — owned by owner3 (USR-005), operated by operator3
  // (USR-006). Same uniqueness rule: distinct deviceId + advertisementName.
  const dti003 = bleDeviceRepo.create({
    deviceId: 'DTI003',
    deviceName: 'Witness Device DTI003',
    macAddress: '4C:3A:9B:E8:1F:04', // distinct MAC
    serviceUuid: '44540100-7C8E-4A91-B6F2-5D73E9C104AF',
    advertisementName: 'DTI003', // distinct advertised name — scan key
    bleVersion: '5.0',
    tlsVersion: '1.3',
    firmwareVersion: '1.0.0',
    isPaired: false,
    isActive: true,
    protocolVersion: '1.0',
    disconnectTimeoutSec: 90,
    heartbeatIntervalSec: 10,
    staleHeartbeatSec: 25,
    ackTimeoutSec: 10,
    maxAckRetries: 3,
    consentDecisionNormalSec: 120,
    consentDecisionHighSec: 60,
    hidInjectWindowSec: 60,
    rtcDriftThresholdSec: 30,
    maxPacketBytes: 512,
    owner: owner3,
  });
  await bleDeviceRepo.save(dti003);

  // Seed BLE characteristics — BLE API Spec v2.0
  // Base UUID: 44540XXX-7C8E-4A91-B6F2-5D73E9C104AF
  const chars = [
    // ── Service 0100 · Device Information ──────────────────────
    {
      name: 'device_identity',
      uuid: '44540101-7C8E-4A91-B6F2-5D73E9C104AF',
      shortCode: '0x0101',
      properties: 'READ',
      direction: 'firmware_to_app',
      purpose: 'Device serial, firmware version, attestation key reference',
    },
    {
      name: 'device_status',
      uuid: '44540102-7C8E-4A91-B6F2-5D73E9C104AF',
      shortCode: '0x0102',
      properties: 'READ_NOTIFY',
      direction: 'firmware_to_app',
      purpose: 'Device state, session status, heartbeat, error notifications',
    },
    {
      name: 'rtc_sync',
      uuid: '44540103-7C8E-4A91-B6F2-5D73E9C104AF',
      shortCode: '0x0103',
      properties: 'READ_WRITE',
      direction: 'bidirectional',
      purpose: 'App reads device RTC; writes corrected UNIX-ms timestamp back',
    },
    // ── Service 0200 · Session ──────────────────────────────────
    {
      name: 'session_announce',
      uuid: '44540201-7C8E-4A91-B6F2-5D73E9C104AF',
      shortCode: '0x0201',
      properties: 'NOTIFY',
      direction: 'firmware_to_app',
      purpose: 'Firmware notifies app of new BLE session on connect',
    },
    {
      name: 'session_ack',
      uuid: '44540202-7C8E-4A91-B6F2-5D73E9C104AF',
      shortCode: '0x0202',
      properties: 'WRITE',
      direction: 'app_to_firmware',
      purpose: 'App echoes session_id to acknowledge session_announce',
    },
    {
      name: 'session_confirm',
      uuid: '44540203-7C8E-4A91-B6F2-5D73E9C104AF',
      shortCode: '0x0203',
      properties: 'NOTIFY',
      direction: 'firmware_to_app',
      purpose: 'Firmware confirms session established or reports failure',
    },
    // ── Service 0300 · Consent ──────────────────────────────────
    {
      name: 'consent_request',
      uuid: '44540301-7C8E-4A91-B6F2-5D73E9C104AF',
      shortCode: '0x0301',
      // Spec §3.1: "App workflow only / Not sent by firmware". The app WRITES
      // the lean consent_request; firmware then enters CONSENT_PENDING and
      // starts the 60 s consent timer.
      properties: 'WRITE',
      direction: 'app_to_firmware',
      purpose:
        'App writes lean consent_request → firmware enters CONSENT_PENDING + 60s timer',
    },
    {
      name: 'consent_response',
      uuid: '44540302-7C8E-4A91-B6F2-5D73E9C104AF',
      shortCode: '0x0302',
      // Spec §3.2: "Write with response". Carries decision + inject_pin (approved)
      // or reason (rejected). No JWT on BLE in Phase 1.
      properties: 'WRITE',
      direction: 'app_to_firmware',
      purpose:
        'App writes owner decision (approved+inject_pin | rejected); no JWT on BLE',
    },
    {
      name: 'consent_ack',
      uuid: '44540303-7C8E-4A91-B6F2-5D73E9C104AF',
      shortCode: '0x0303',
      properties: 'NOTIFY',
      direction: 'firmware_to_app',
      purpose: 'Firmware ACKs consent_response within 3 s of receipt',
    },
    // ── Service 0400 · Heartbeat ────────────────────────────────
    {
      name: 'heartbeat',
      uuid: '44540401-7C8E-4A91-B6F2-5D73E9C104AF',
      shortCode: '0x0401',
      properties: 'NOTIFY',
      direction: 'firmware_to_app',
      purpose:
        'Firmware sends heartbeat every 10 s; app resets the ~25 s stale-session timer',
    },
    // ── Service 0500 · Error ────────────────────────────────────
    {
      name: 'error',
      uuid: '44540501-7C8E-4A91-B6F2-5D73E9C104AF',
      shortCode: '0x0501',
      properties: 'NOTIFY',
      direction: 'firmware_to_app',
      purpose: 'Firmware reports error conditions and tamper events to app',
    },
    // ── Service 0600 · HID Injection ────────────────────────────
    {
      name: 'hid_pin',
      uuid: '44540601-7C8E-4A91-B6F2-5D73E9C104AF',
      shortCode: '0x0601',
      properties: 'WRITE',
      direction: 'app_to_firmware',
      purpose:
        'App sends HID PIN injection command to firmware after consent grant',
    },
    // Spec §6.2 — firmware → app ACK after HID injection (success or failure)
    {
      name: 'hid_pin_inject_ack',
      uuid: '44540602-7C8E-4A91-B6F2-5D73E9C104AF',
      shortCode: '0x0602',
      properties: 'NOTIFY',
      direction: 'firmware_to_app',
      purpose:
        'Firmware confirms HID PIN injection result (success or failure code)',
    },
  ];
  // The GATT map is identical per device — seed the same 13 characteristics
  // against DTI001, DTI002 and DTI003.
  for (const device of [dti001, dti002, dti003]) {
    for (const c of chars) {
      const char = bleCharRepo.create({ ...c, bleDevice: device });
      await bleCharRepo.save(char);
    }
  }

  // One active assignment per operator (the no-device-picker mobile flow relies
  // on this): USR-002→DTI001, USR-004→DTI002, USR-006→DTI003.
  await assignRepo.save([
    assignRepo.create({
      bleDevice: dti001,
      operator: operator1,
      isActive: true,
      assignedBy: owner.id,
    }),
    assignRepo.create({
      bleDevice: dti002,
      operator: operator2,
      isActive: true,
      assignedBy: owner2.id,
    }),
    assignRepo.create({
      bleDevice: dti003,
      operator: operator3,
      isActive: true,
      assignedBy: owner3.id,
    }),
  ]);

  console.log('✅ Database seeded successfully!');
  console.log('   DTI001 → owner1@dtii.in / operator1@dtii.in (USR-001/USR-002)');
  console.log('   DTI002 → owner2@dtii.in / operator2@dtii.in (USR-003/USR-004)');
  console.log('   DTI003 → owner3@dtii.in / operator3@dtii.in (USR-005/USR-006)');
  console.log('   Consent requests: 4 (EXPIRED x2 / APPROVED / REJECTED)');
  console.log(
    '✅ BLE devices DTI001 + DTI002 + DTI003 seeded with 13 characteristics each',
  );
  console.log('✅ Assignments: USR-002→DTI001, USR-004→DTI002, USR-006→DTI003');
  await AppDataSource.destroy();
}

seed().catch(console.error);
