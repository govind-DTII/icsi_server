"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("../polyfill");
const typeorm_1 = require("typeorm");
const user_entity_1 = require("../entities/user.entity");
const device_entity_1 = require("../entities/device.entity");
const consent_request_entity_1 = require("../entities/consent-request.entity");
const audit_log_entity_1 = require("../entities/audit-log.entity");
const ble_device_entity_1 = require("../entities/ble-device.entity");
const ble_characteristic_entity_1 = require("../entities/ble-characteristic.entity");
const device_assignment_entity_1 = require("../entities/device-assignment.entity");
const bcrypt = require("bcrypt");
const AppDataSource = new typeorm_1.DataSource({
    type: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5433'),
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
    await AppDataSource.query('TRUNCATE TABLE device_assignments, ble_characteristics, ble_devices, audit_logs, consent_requests, devices, users RESTART IDENTITY CASCADE');
    const owner = userRepo.create({
        id: 'USR-001',
        email: 'owner@dtii.in',
        name: 'DTII Owner',
        role: 'owner',
        deviceId: 'DTI001',
        passwordHash: await bcrypt.hash('owner123', 10),
        pin: '12345678',
    });
    await userRepo.save(owner);
    const operator1 = userRepo.create({
        id: 'USR-002',
        email: 'operator@dtii.in',
        name: 'Op. Sharma',
        role: 'operator',
        deviceId: 'DTI001',
        passwordHash: await bcrypt.hash('op123', 10),
    });
    const operator2 = userRepo.create({
        id: 'USR-003',
        email: 'op.mehta@dtii.in',
        name: 'Op. Mehta',
        role: 'operator',
        deviceId: 'DTI001',
    });
    const operator3 = userRepo.create({
        id: 'USR-004',
        email: 'op.kulkarni@dtii.in',
        name: 'Op. Kulkarni',
        role: 'operator',
    });
    await userRepo.save([operator1, operator2, operator3]);
    const device = deviceRepo.create({
        deviceName: 'DTI001',
        macAddress: '4C:3A:9B:E8:1F:02',
        deviceType: 'BLE Simulator',
        isPaired: true,
        owner: owner,
    });
    await deviceRepo.save(device);
    const now = new Date();
    const c1 = consentRepo.create({
        txnRef: 'TXN-9F3A2C',
        title: 'Data Processing Agreement — Section 4B',
        status: 'EXPIRED',
        abortedReason: 'REQUEST_EXPIRED',
        scope: 'Read + Write',
        blePayload: '0x4A 9B E8 3D BF',
        delivery: 'FCM · BLE relay',
        owner: owner,
        operator: operator1,
        expiresAt: now.getTime() - 2 * 60 * 1000,
        createdAt: new Date(now.getTime() - 2 * 60 * 1000),
    });
    const c2 = consentRepo.create({
        txnRef: 'TXN-8B2E1A',
        title: 'API Gateway Access — Production Scope',
        status: 'EXPIRED',
        abortedReason: 'REQUEST_EXPIRED',
        scope: 'Read Only',
        blePayload: '0x3B 8A D7 2C AE',
        delivery: 'FCM · BLE relay',
        owner: owner,
        operator: operator2,
        expiresAt: now.getTime() - 14 * 60 * 1000,
        createdAt: new Date(now.getTime() - 14 * 60 * 1000),
    });
    const c3 = consentRepo.create({
        txnRef: 'TXN-7C4D9B',
        title: 'BLE Firmware Update Consent',
        status: 'APPROVED',
        scope: 'Write',
        blePayload: '0x1F 7C B3 9A 4E',
        delivery: 'FCM · BLE relay',
        owner: owner,
        operator: operator3,
        approvedAt: new Date(now.getTime() - 60 * 60 * 1000),
        createdAt: new Date(now.getTime() - 60 * 60 * 1000),
    });
    const c4 = consentRepo.create({
        txnRef: 'TXN-6E3A7F',
        title: 'Owner Profile Update Authorization',
        status: 'REJECTED',
        scope: 'Read + Write',
        blePayload: '0x2A 5D C8 1B 3F',
        delivery: 'FCM · BLE relay',
        owner: owner,
        operator: operator1,
        rejectedAt: new Date(now.getTime() - 2 * 60 * 60 * 1000),
        createdAt: new Date(now.getTime() - 2 * 60 * 60 * 1000),
    });
    await consentRepo.save([c1, c2, c3, c4]);
    await auditRepo.save([
        auditRepo.create({
            action: 'Consent Approved — TXN-7C4D9B',
            type: 'approve',
            actorId: owner.id,
            actorRole: 'owner',
            detail: 'BLE packet relayed to DTI001',
            consentRequest: c3,
        }),
        auditRepo.create({
            action: 'BLE packet relayed to Witness',
            type: 'ble',
            actorId: 'SYSTEM',
            actorRole: 'system',
            detail: '{"status":"approved","txn":"7C4D9B"}',
        }),
        auditRepo.create({
            action: 'Owner login — JWT issued',
            type: 'login',
            actorId: owner.id,
            actorRole: 'owner',
            detail: 'Auth API · demo one-tap',
        }),
        auditRepo.create({
            action: 'BLE pairing — DTI001',
            type: 'ble',
            actorId: operator1.id,
            actorRole: 'operator',
            detail: 'Device: DTI001 · RSSI −62 dBm',
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
        serviceUuid: 'ed0e0200-214f-48d3-a910-75dac43b1fc6',
        advertisementName: 'DTI001',
        bleVersion: '5.0',
        tlsVersion: '1.3',
        firmwareVersion: '1.0.0',
        isPaired: true,
        isActive: true,
        protocolVersion: '1.0',
        disconnectTimeoutSec: 90,
        heartbeatIntervalSec: 10,
        staleHeartbeatSec: 25,
        ackTimeoutSec: 10,
        maxAckRetries: 3,
        consentDecisionTimeoutSec: 60,
        consentExpiryMs: 300000,
        hidInjectWindowSec: 60,
        rtcDriftThresholdSec: 30,
        maxPacketBytes: 512,
        owner: owner,
    });
    await bleDeviceRepo.save(dti001);
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
            properties: 'TBC',
            direction: 'firmware_to_app',
            purpose: 'Firmware sends consent_req and consent_ack packets to app',
        },
        {
            name: 'consent_response',
            uuid: '44540302-7C8E-4A91-B6F2-5D73E9C104AF',
            shortCode: '0x0302',
            properties: 'WRITE',
            direction: 'app_to_firmware',
            purpose: 'App sends consent_response with JWT decision token to firmware',
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
            purpose: 'Firmware sends heartbeat every 10 s; app resets 5-min stale timer',
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
    for (const c of chars) {
        const char = bleCharRepo.create({ ...c, bleDevice: dti001 });
        await bleCharRepo.save(char);
    }
    const assignment = assignRepo.create({
        bleDevice: dti001,
        operator: operator1,
        isActive: true,
        assignedBy: owner.id,
    });
    await assignRepo.save(assignment);
    console.log('✅ Database seeded successfully!');
    console.log('   Owner: owner@dtii.in');
    console.log('   Operator: operator@dtii.in');
    console.log('   Device: DTI001 (paired, active)');
    console.log('   Consent requests: 4 (EXPIRED x2 / APPROVED / REJECTED)');
    console.log('✅ BLE device DTI001 seeded with 13 characteristics (v2.0 spec + 0602 HID ACK)');
    console.log('✅ Operator assigned to DTI001');
    await AppDataSource.destroy();
}
seed().catch(console.error);
//# sourceMappingURL=seed.js.map