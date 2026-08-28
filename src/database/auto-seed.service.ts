import { Injectable, OnApplicationBootstrap } from '@nestjs/common';
import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from '../entities/user.entity';
import { Device } from '../entities/device.entity';
import { ConsentRequest } from '../entities/consent-request.entity';
import { AuditLog } from '../entities/audit-log.entity';
import { BleDevice } from '../entities/ble-device.entity';
import { BleCharacteristic } from '../entities/ble-characteristic.entity';
import { DeviceAssignment } from '../entities/device-assignment.entity';
import { BleSession } from '../sessions/entities/ble-session.entity';
import { BleEventAudit } from '../ble-events/entities/ble-event-audit.entity';
import { LoggerService } from '../logging/logger.service';

@Injectable()
export class AutoSeedService implements OnApplicationBootstrap {
  constructor(
    private readonly dataSource: DataSource,
    private readonly appLog: LoggerService,
  ) {}

  async onApplicationBootstrap() {
    try {
      this.appLog.log('Checking database schema and seed status...', {
        service: 'seed',
      });

      // Synchronize database schema automatically if tables are missing
      await this.dataSource.synchronize();

      const userRepo = this.dataSource.getRepository(User);
      const count = await userRepo.count();

      if (count === 0) {
        this.appLog.log('🌱 Database has no users — auto-seeding demo data...', {
          service: 'seed',
        });
        await this.runSeedData();
        console.log('✅ Auto-seed completed successfully!');
      } else {
        console.log(`✅ Database already contains ${count} users.`);
      }
    } catch (err) {
      console.error('⚠️ Auto-seed bootstrap failed:', (err as Error)?.message ?? err);
    }
  }

  async runSeedData(): Promise<void> {
    const userRepo = this.dataSource.getRepository(User);
    const deviceRepo = this.dataSource.getRepository(Device);
    const consentRepo = this.dataSource.getRepository(ConsentRequest);
    const auditRepo = this.dataSource.getRepository(AuditLog);
    const bleDeviceRepo = this.dataSource.getRepository(BleDevice);
    const bleCharRepo = this.dataSource.getRepository(BleCharacteristic);
    const assignRepo = this.dataSource.getRepository(DeviceAssignment);
    const bleSessionRepo = this.dataSource.getRepository(BleSession);
    const bleEventRepo = this.dataSource.getRepository(BleEventAudit);

    const owner = userRepo.create({
      id: 'USR-001',
      email: 'owner1@dtii.in',
      name: 'Rajesh Kumar',
      role: 'owner',
      deviceId: 'DTI001',
      passwordHash: await bcrypt.hash('owner123', 10),
      pin: '11111111',
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

    await userRepo.save([owner, operator1, owner2, operator2, owner3, operator3]);

    const device = deviceRepo.create({
      deviceName: 'DTI001',
      macAddress: '4C:3A:9B:E8:1F:02',
      deviceType: 'BLE Simulator',
      isPaired: true,
      owner: owner,
    });
    await deviceRepo.save(device);

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
      { name: 'device_identity', uuid: '44540101-7C8E-4A91-B6F2-5D73E9C104AF', shortCode: '0x0101', properties: 'READ', direction: 'firmware_to_app', purpose: 'Device serial, firmware version, attestation key reference' },
      { name: 'device_status', uuid: '44540102-7C8E-4A91-B6F2-5D73E9C104AF', shortCode: '0x0102', properties: 'READ_NOTIFY', direction: 'firmware_to_app', purpose: 'Device state, session status, heartbeat, error notifications' },
      { name: 'rtc_sync', uuid: '44540103-7C8E-4A91-B6F2-5D73E9C104AF', shortCode: '0x0103', properties: 'READ_WRITE', direction: 'bidirectional', purpose: 'App reads device RTC; writes corrected UNIX-ms timestamp back' },
      { name: 'session_announce', uuid: '44540201-7C8E-4A91-B6F2-5D73E9C104AF', shortCode: '0x0201', properties: 'NOTIFY', direction: 'firmware_to_app', purpose: 'Firmware notifies app of new BLE session on connect' },
      { name: 'session_ack', uuid: '44540202-7C8E-4A91-B6F2-5D73E9C104AF', shortCode: '0x0202', properties: 'WRITE', direction: 'app_to_firmware', purpose: 'App echoes session_id to acknowledge session_announce' },
      { name: 'session_confirm', uuid: '44540203-7C8E-4A91-B6F2-5D73E9C104AF', shortCode: '0x0203', properties: 'NOTIFY', direction: 'firmware_to_app', purpose: 'Firmware confirms session established or reports failure' },
      { name: 'consent_request', uuid: '44540301-7C8E-4A91-B6F2-5D73E9C104AF', shortCode: '0x0301', properties: 'WRITE', direction: 'app_to_firmware', purpose: 'App writes lean consent_request → firmware enters CONSENT_PENDING + 60s timer' },
      { name: 'consent_response', uuid: '44540302-7C8E-4A91-B6F2-5D73E9C104AF', shortCode: '0x0302', properties: 'WRITE', direction: 'app_to_firmware', purpose: 'App writes owner decision (approved+inject_pin | rejected); no JWT on BLE' },
      { name: 'consent_ack', uuid: '44540303-7C8E-4A91-B6F2-5D73E9C104AF', shortCode: '0x0303', properties: 'NOTIFY', direction: 'firmware_to_app', purpose: 'Firmware ACKs consent_response within 3 s of receipt' },
      { name: 'heartbeat', uuid: '44540401-7C8E-4A91-B6F2-5D73E9C104AF', shortCode: '0x0401', properties: 'NOTIFY', direction: 'firmware_to_app', purpose: 'Firmware sends heartbeat every 10 s; app resets stale-session timer' },
      { name: 'error', uuid: '44540501-7C8E-4A91-B6F2-5D73E9C104AF', shortCode: '0x0501', properties: 'NOTIFY', direction: 'firmware_to_app', purpose: 'Firmware reports error conditions and tamper events to app' },
      { name: 'hid_pin', uuid: '44540601-7C8E-4A91-B6F2-5D73E9C104AF', shortCode: '0x0601', properties: 'WRITE', direction: 'app_to_firmware', purpose: 'App sends HID PIN injection command to firmware after consent grant' },
      { name: 'hid_pin_inject_ack', uuid: '44540602-7C8E-4A91-B6F2-5D73E9C104AF', shortCode: '0x0602', properties: 'NOTIFY', direction: 'firmware_to_app', purpose: 'Firmware confirms HID PIN injection result' },
    ];

    for (const dev of [dti001, dti002, dti003]) {
      for (const c of chars) {
        await bleCharRepo.save(bleCharRepo.create({ ...c, bleDevice: dev }));
      }
    }

    await assignRepo.save([
      assignRepo.create({ bleDevice: dti001, operator: operator1, isActive: true, assignedBy: owner.id }),
      assignRepo.create({ bleDevice: dti002, operator: operator2, isActive: true, assignedBy: owner2.id }),
      assignRepo.create({ bleDevice: dti003, operator: operator3, isActive: true, assignedBy: owner3.id }),
    ]);
  }
}
