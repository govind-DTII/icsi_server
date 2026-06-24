import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

// Captures the DEVICE_IDENTITY characteristic (char 0101) read at the start
// of each BLE session. Written once per session by SessionsService.start().
@Index('idx_device_identity_snapshots_session_id', ['sessionId'])
@Entity('device_identity_snapshots')
export class DeviceIdentitySnapshot {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'session_id', length: 64 })
  sessionId: string;

  @Column({ name: 'device_id', length: 32 })
  deviceId: string;

  @Column({ name: 'mac_address', length: 17, nullable: true })
  macAddress: string;

  @Column({ name: 'owner_id', length: 36, nullable: true })
  ownerId: string;

  @Column({ name: 'fw_version', length: 16, nullable: true })
  fwVersion: string;

  @Column({ name: 'hw_version', length: 16, nullable: true })
  hwVersion: string;

  @Column({ name: 'ble_version', length: 16, nullable: true })
  bleVersion: string;

  @Column({ name: 'tls_version', length: 16, nullable: true })
  tlsVersion: string;

  @Column({ name: 'recorded_at', type: 'timestamptz', default: () => 'NOW()' })
  recordedAt: Date;
}
