import {
  Entity,
  Index,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
} from 'typeorm';
import { ConsentRequest } from './consent-request.entity';

@Entity('audit_logs')
export class AuditLog {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column() action: string;
  @Column({ nullable: true, type: 'text' }) detail: string;
  @Column({
    type: 'enum',
    enum: ['approve', 'reject', 'login', 'ble', 'system'],
    default: 'system',
  })
  type: string;
  @Column({ nullable: true }) actorId: string;
  @Column({ nullable: true }) actorRole: string;
  // Human-readable actor name (e.g. the approving owner), denormalized at write
  // time so the audit UI can show "Owner – <name>" without a user join.
  @Column({ nullable: true }) actorName: string;
  // Business correlation keys denormalized from the related consent (see
  // AuditService.log). These mirror ble_event_audit so the governance trail and
  // the protocol trail join on the SAME human ids (CST consent_id / session_id /
  // txn / DTI device_id) instead of only the surrogate consentRequestId UUID.
  @Index('idx_audit_logs_consent_id')
  @Column({ name: 'consent_id', length: 64, nullable: true })
  consentId: string;
  @Column({ length: 32, nullable: true }) txn: string;
  @Index('idx_audit_logs_session_id')
  @Column({ name: 'session_id', length: 64, nullable: true })
  sessionId: string;
  @Column({ name: 'device_id', length: 32, nullable: true })
  deviceId: string;
  // SER (Subscriber Evidence Record) fields — populated on consent-create rows
  // so the subscriber SER tab can list document name + timestamp and open a
  // detail view with hash + operator geo-tag without joining free-text detail.
  @Column({ name: 'document_name', length: 255, nullable: true })
  documentName: string | null;
  @Column({ name: 'attachment_hash', length: 80, nullable: true })
  attachmentHash: string | null;
  @Column({ name: 'file_url', type: 'text', nullable: true })
  fileUrl: string | null;
  @Column({ type: 'double precision', nullable: true })
  latitude: number | null;
  @Column({ type: 'double precision', nullable: true })
  longitude: number | null;
  @Column({
    name: 'location_accuracy',
    type: 'double precision',
    nullable: true,
  })
  locationAccuracy: number | null;
  @Column({ name: 'street', type: 'text', nullable: true })
  street: string | null;
  @Column({ name: 'city', length: 120, nullable: true })
  city: string | null;
  @Column({ name: 'state', length: 120, nullable: true })
  state: string | null;
  @Column({ name: 'postal_code', length: 32, nullable: true })
  postalCode: string | null;
  @ManyToOne(() => ConsentRequest, { nullable: true })
  consentRequest: ConsentRequest;
  // timestamptz for consistency with ble_event_audit.recorded_at and to avoid
  // the TZ-skew that a bare timestamp (no zone) introduces (see migration 006).
  @CreateDateColumn({ type: 'timestamptz' }) createdAt: Date;
}
