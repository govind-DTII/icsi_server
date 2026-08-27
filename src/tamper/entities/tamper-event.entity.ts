import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Index('idx_tamper_events_device_id', ['deviceId'])
@Index('idx_tamper_events_unresolved', ['deviceId'], {
  where: 'resolved = FALSE',
})
@Entity('tamper_events')
export class TamperEvent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'device_id', length: 32 })
  deviceId: string;

  @Column({ name: 'session_id', length: 64, nullable: true })
  sessionId: string;

  @Column({ name: 'consent_id', length: 64, nullable: true })
  consentId: string;

  @Column({ name: 'detected_at', type: 'timestamptz', default: () => 'NOW()' })
  detectedAt: Date;

  @Column({ name: 'reported_by', length: 32 })
  reportedBy: string;

  @Column({ default: false })
  resolved: boolean;

  @Column({ name: 'resolved_at', type: 'timestamptz', nullable: true })
  resolvedAt: Date;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
