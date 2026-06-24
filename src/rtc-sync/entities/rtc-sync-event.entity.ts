import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Index('idx_rtc_sync_events_device_id', ['deviceId'])
@Entity('rtc_sync_events')
export class RtcSyncEvent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'device_id', length: 32 })
  deviceId: string;

  @Column({ name: 'session_id', length: 64, nullable: true })
  sessionId: string;

  @Column({ name: 'operator_id', length: 36 })
  operatorId: string;

  // bigint columns: stored as BIGINT in Postgres, returned as string by TypeORM
  @Column({ name: 'old_timestamp_ms', type: 'bigint' })
  oldTimestampMs: number;

  @Column({ name: 'new_timestamp_ms', type: 'bigint' })
  newTimestampMs: number;

  @Column({ name: 'drift_ms', type: 'bigint' })
  driftMs: number;

  @Column({ name: 'corrected_at', type: 'timestamptz', default: () => 'NOW()' })
  correctedAt: Date;
}
