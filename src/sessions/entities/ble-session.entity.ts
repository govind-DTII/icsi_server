import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Index('idx_ble_sessions_device_id', ['deviceId'])
@Index('idx_ble_sessions_operator_id', ['operatorId'])
@Index('idx_ble_sessions_active', ['state'], { where: '"ended_at" IS NULL' })
// Only ONE *active* session may exist per session_id. The firmware reuses a
// static, non-rotating session_id across reconnects (UAT: DTI002 reused
// sess-000100 for 2 days), so a plain UNIQUE(session_id) collapsed every
// reconnect into one row. A partial unique index lets ended history rows repeat
// the same session_id while still forbidding two concurrently-open sessions.
@Index('uq_ble_sessions_active_session_id', ['sessionId'], {
  unique: true,
  where: '"ended_at" IS NULL',
})
@Entity('ble_sessions')
export class BleSession {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'session_id', length: 64 })
  sessionId: string;

  @Column({ name: 'device_id', length: 32 })
  deviceId: string;

  @Column({ name: 'operator_id', length: 36 })
  operatorId: string;

  @Column({ name: 'owner_id', length: 36 })
  ownerId: string;

  @Column({ name: 'fw_version', length: 16, nullable: true })
  fwVersion: string;

  @Column({ name: 'hw_version', length: 16, nullable: true })
  hwVersion: string;

  @Column({ name: 'mac_address', length: 17, nullable: true })
  macAddress: string;

  @Column({ name: 'ble_version', length: 16, nullable: true })
  bleVersion: string;

  @Column({ name: 'tls_version', length: 16, nullable: true })
  tlsVersion: string;

  // State machine values defined in SessionState enum (session.dto.ts)
  @Column({ length: 32, default: 'IDLE' })
  state: string;

  @Column({ name: 'started_at', type: 'timestamptz', default: () => 'NOW()' })
  startedAt: Date;

  @Column({ name: 'ended_at', type: 'timestamptz', nullable: true })
  endedAt: Date;

  @Column({ name: 'ended_reason', length: 64, nullable: true })
  endedReason: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
