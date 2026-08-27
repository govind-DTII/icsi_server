import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
} from 'typeorm';
import { User } from './user.entity';
import { BleCharacteristic } from './ble-characteristic.entity';
import { DeviceAssignment } from './device-assignment.entity';

@Entity('ble_devices')
export class BleDevice {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ unique: true }) deviceId: string;
  @Column() deviceName: string;
  @Column({ nullable: true }) macAddress: string;
  @Column() serviceUuid: string;
  @Column({ default: '5.0' }) bleVersion: string;
  @Column({ default: '1.3' }) tlsVersion: string;
  @Column({ nullable: true }) firmwareVersion: string;
  @Column({ default: 'DTI001' }) advertisementName: string;
  @Column({ default: false }) isPaired: boolean;
  @Column({ default: true }) isActive: boolean;
  @Column({ nullable: true }) lastSeenAt: Date;
  @Column({ nullable: true }) rssi: string;
  @Column({ nullable: true }) batteryPct: number;
  // ── Runtime config (single source of truth — the app reads these from
  // GET /ble-devices/:id/config; the Flutter constants are fallback-only).
  // Values anchored to the spec: heartbeat every 10 s, stale ~25 s, ack 10 s
  // ×3, MTU 247. The consent decision window is app behavior (not firmware-owned)
  // and priority-driven: normal 2 min, high 1 min. expires_at is set equal to it.
  @Column({ default: '1.0' }) protocolVersion: string;
  @Column({ default: 90 }) disconnectTimeoutSec: number;
  @Column({ default: 10 }) heartbeatIntervalSec: number;
  @Column({ default: 25 }) staleHeartbeatSec: number;
  @Column({ default: 10 }) ackTimeoutSec: number;
  @Column({ default: 3 }) maxAckRetries: number;
  @Column({ default: 120 }) consentDecisionNormalSec: number;
  @Column({ default: 60 }) consentDecisionHighSec: number;
  @Column({ default: 60 }) hidInjectWindowSec: number;
  @Column({ default: 30 }) rtcDriftThresholdSec: number;
  @Column({ default: 247 }) maxPacketBytes: number;
  @ManyToOne(() => User, { nullable: true }) owner: User;
  @OneToMany(() => BleCharacteristic, (c) => c.bleDevice)
  characteristics: BleCharacteristic[];
  @OneToMany(() => DeviceAssignment, (a) => a.bleDevice)
  assignments: DeviceAssignment[];
  @CreateDateColumn() createdAt: Date;
  @UpdateDateColumn() updatedAt: Date;
}
