"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("../polyfill");
const dotenv_1 = require("dotenv");
const path_1 = require("path");
const typeorm_1 = require("typeorm");
const user_entity_1 = require("../entities/user.entity");
const device_entity_1 = require("../entities/device.entity");
const consent_request_entity_1 = require("../entities/consent-request.entity");
const audit_log_entity_1 = require("../entities/audit-log.entity");
const ble_device_entity_1 = require("../entities/ble-device.entity");
const ble_characteristic_entity_1 = require("../entities/ble-characteristic.entity");
const device_assignment_entity_1 = require("../entities/device-assignment.entity");
const ble_session_entity_1 = require("../sessions/entities/ble-session.entity");
const ble_event_audit_entity_1 = require("../ble-events/entities/ble-event-audit.entity");
const bcrypt = require("bcrypt");
(0, dotenv_1.config)({ path: (0, path_1.resolve)(__dirname, '../../.env') });
const AppDataSource = new typeorm_1.DataSource({
    type: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    username: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_NAME || 'ascent.en',
    entities: [
        user_entity_1.User,
        device_entity_1.Device,
        consent_request_entity_1.ConsentRequest,
        audit_log_entity_1.AuditLog,
        ble_device_entity_1.BleDevice,
        ble_characteristic_entity_1.BleCharacteristic,
        device_assignment_entity_1.DeviceAssignment,
        ble_session_entity_1.BleSession,
        ble_event_audit_entity_1.BleEventAudit,
    ],
    synchronize: true,
});
async function seed() {
    await AppDataSource.initialize();
    console.log('🌱 Seeding database...');
    const userRepo = AppDataSource.getRepository(user_entity_1.User);
    const deviceRepo = AppDataSource.getRepository(device_entity_1.Device);
    const consentRepo = AppDataSource.getRepository(consent_request_entity_1.ConsentRequest);
    const auditRepo = AppDataSource.getRepository(audit_log_entity_1.AuditLog);
    const bleDeviceRepo = AppDataSource.getRepository(ble_device_entity_1.BleDevice);
    const bleCharRepo = AppDataSource.getRepository(ble_characteristic_entity_1.BleCharacteristic);
    const assignRepo = AppDataSource.getRepository(device_assignment_entity_1.DeviceAssignment);
    const bleSessionRepo = AppDataSource.getRepository(ble_session_entity_1.BleSession);
    const bleEventRepo = AppDataSource.getRepository(ble_event_audit_entity_1.BleEventAudit);
    await AppDataSource.query('TRUNCATE TABLE ble_event_audit, ble_sessions, device_identity_snapshots, rtc_sync_events, tamper_events, device_assignments, ble_characteristics, ble_devices, audit_logs, consent_requests, devices, users RESTART IDENTITY CASCADE');
    const owner = userRepo.create({
        id: 'USR-001',
        email: 'owner1@dtii.in',
        name: 'Rajesh Kumar',
        role: 'owner',
        deviceId: 'DTI001',
        passwordHash: await bcrypt.hash('owner123', 10),
        pin: '12345678',
    });
    const operator1 = userRepo.create({
        id: 'USR-002',
        email: 'operator1@dtii.in',
        name: 'Amit Sharma',
        role: 'operator',
        deviceId: 'DTI001',
        passwordHash: await bcrypt.hash('op123', 10),
    });
    const owner2 = userRepo.create({
        id: 'USR-003',
        email: 'owner2@dtii.in',
        name: 'Tejaswee Jadhav',
        role: 'owner',
        deviceId: 'DTI002',
        passwordHash: await bcrypt.hash('owner123', 10),
        pin: '12345678',
    });
    const operator2 = userRepo.create({
        id: 'USR-004',
        email: 'operator2@dtii.in',
        name: 'Sanjay Mehta',
        role: 'operator',
        deviceId: 'DTI002',
        passwordHash: await bcrypt.hash('op123', 10),
    });
    const owner3 = userRepo.create({
        id: 'USR-005',
        email: 'owner3@dtii.in',
        name: 'Vikram Singh',
        role: 'owner',
        deviceId: 'DTI003',
        passwordHash: await bcrypt.hash('owner123', 10),
        pin: '12345678',
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
    const device = deviceRepo.create({
        deviceName: 'DTI001',
        macAddress: '4C:3A:9B:E8:1F:02',
        deviceType: 'BLE Simulator',
        isPaired: true,
        owner: owner,
    });
    await deviceRepo.save(device);
    const now = new Date();
    const seedSessionId = 'sess-seed-0001';
    const mkPacket = (p) => JSON.stringify({
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
        expiresAt: now.getTime() - 2 * 60 * 1000,
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
        expiresAt: now.getTime() - 14 * 60 * 1000,
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
    const seedSessionStart = new Date(now.getTime() - 60 * 60 * 1000);
    const seedSessionEnd = new Date(now.getTime() - 59 * 60 * 1000);
    await bleSessionRepo.save(bleSessionRepo.create({
        sessionId: seedSessionId,
        deviceId: 'DTI001',
        operatorId: operator1.id,
        ownerId: owner.id,
        fwVersion: '1.0.0',
        hwVersion: '1.2.0',
        macAddress: '4C:3A:9B:E8:1F:02',
        bleVersion: '5.0',
        tlsVersion: '1.3',
        state: 'SESSION_ENDING',
        startedAt: seedSessionStart,
        endedAt: seedSessionEnd,
        endedReason: 'COMPLETED',
    }));
    const auditTrail = [
        {
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
    const auditBaseTs = Date.now() - auditTrail.length * 1000;
    for (let i = 0; i < auditTrail.length; i++) {
        const e = auditTrail[i];
        e.recordedAt = new Date(auditBaseTs + i * 1000);
        await bleEventRepo.save(bleEventRepo.create(e));
    }
    await auditRepo.save([
        auditRepo.create({
            action: `Consent Approved — ${c3.title}`,
            type: 'approve',
            actorId: owner.id,
            actorRole: 'owner',
            actorName: owner.name,
            detail: 'Owner approved · Affix consent for BLE relay',
            consentRequest: c3,
            consentId: c3.consentId,
            txn: c3.txnRef,
            sessionId: c3.sessionId,
            deviceId: c3.deviceId,
        }),
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
    const dti001 = bleDeviceRepo.create({
        deviceId: 'DTI001',
        deviceName: 'Witness Device DTI001',
        macAddress: '4C:3A:9B:E8:1F:02',
        serviceUuid: '44540100-7C8E-4A91-B6F2-5D73E9C104AF',
        advertisementName: 'DTI001',
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
        owner: owner,
    });
    await bleDeviceRepo.save(dti001);
    const dti002 = bleDeviceRepo.create({
        deviceId: 'DTI002',
        deviceName: 'Witness Device DTI002',
        macAddress: '4C:3A:9B:E8:1F:03',
        serviceUuid: '44540100-7C8E-4A91-B6F2-5D73E9C104AF',
        advertisementName: 'DTI002',
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
    const dti003 = bleDeviceRepo.create({
        deviceId: 'DTI003',
        deviceName: 'Witness Device DTI003',
        macAddress: '4C:3A:9B:E8:1F:04',
        serviceUuid: '44540100-7C8E-4A91-B6F2-5D73E9C104AF',
        advertisementName: 'DTI003',
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
    const chars = [
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
        {
            name: 'consent_request',
            uuid: '44540301-7C8E-4A91-B6F2-5D73E9C104AF',
            shortCode: '0x0301',
            properties: 'WRITE',
            direction: 'app_to_firmware',
            purpose: 'App writes lean consent_request → firmware enters CONSENT_PENDING + 60s timer',
        },
        {
            name: 'consent_response',
            uuid: '44540302-7C8E-4A91-B6F2-5D73E9C104AF',
            shortCode: '0x0302',
            properties: 'WRITE',
            direction: 'app_to_firmware',
            purpose: 'App writes owner decision (approved+inject_pin | rejected); no JWT on BLE',
        },
        {
            name: 'consent_ack',
            uuid: '44540303-7C8E-4A91-B6F2-5D73E9C104AF',
            shortCode: '0x0303',
            properties: 'NOTIFY',
            direction: 'firmware_to_app',
            purpose: 'Firmware ACKs consent_response within 3 s of receipt',
        },
        {
            name: 'heartbeat',
            uuid: '44540401-7C8E-4A91-B6F2-5D73E9C104AF',
            shortCode: '0x0401',
            properties: 'NOTIFY',
            direction: 'firmware_to_app',
            purpose: 'Firmware sends heartbeat every 10 s; app resets the ~25 s stale-session timer',
        },
        {
            name: 'error',
            uuid: '44540501-7C8E-4A91-B6F2-5D73E9C104AF',
            shortCode: '0x0501',
            properties: 'NOTIFY',
            direction: 'firmware_to_app',
            purpose: 'Firmware reports error conditions and tamper events to app',
        },
        {
            name: 'hid_pin',
            uuid: '44540601-7C8E-4A91-B6F2-5D73E9C104AF',
            shortCode: '0x0601',
            properties: 'WRITE',
            direction: 'app_to_firmware',
            purpose: 'App sends HID PIN injection command to firmware after consent grant',
        },
        {
            name: 'hid_pin_inject_ack',
            uuid: '44540602-7C8E-4A91-B6F2-5D73E9C104AF',
            shortCode: '0x0602',
            properties: 'NOTIFY',
            direction: 'firmware_to_app',
            purpose: 'Firmware confirms HID PIN injection result (success or failure code)',
        },
    ];
    for (const device of [dti001, dti002, dti003]) {
        for (const c of chars) {
            const char = bleCharRepo.create({ ...c, bleDevice: device });
            await bleCharRepo.save(char);
        }
    }
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
    console.log('✅ BLE devices DTI001 + DTI002 + DTI003 seeded with 13 characteristics each');
    console.log('✅ Assignments: USR-002→DTI001, USR-004→DTI002, USR-006→DTI003');
    await AppDataSource.destroy();
}
seed().catch(console.error);
//# sourceMappingURL=seed.js.map