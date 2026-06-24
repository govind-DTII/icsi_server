import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  Check,
  Index,
} from 'typeorm';
import { User } from './user.entity';

// Spec § ARCHITECTURE (`consents.state`) — enforce the five legal values at
// the DB level. Declared via @Check (not a raw migration) so TypeORM
// `synchronize` manages it and will NOT drop it on the next boot. Mirrors the
// constraint in migration 003; same name so the two never collide.
@Entity('consent_requests')
@Check(
  'consent_requests_status_spec_check',
  `status IN ('PENDING_OWNER_APPROVAL','APPROVED','REJECTED','EXPIRED','TAMPER_ABORTED')`,
)
export class ConsentRequest {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ unique: true }) txnRef: string;
  @Column() title: string;
  // Spec § ARCHITECTURE (`consents.state`):
  //   PENDING_OWNER_APPROVAL / APPROVED / REJECTED / EXPIRED / TAMPER_ABORTED
  // Stored as VARCHAR rather than a PG enum type — Postgres makes enum value
  // changes awkward, and the CHECK constraint in migration 003 enforces the
  // legal set. Default is PENDING_OWNER_APPROVAL.
  @Column({
    type: 'varchar',
    length: 32,
    default: 'PENDING_OWNER_APPROVAL',
  })
  status: string;
  @Column({ nullable: true }) scope: string;
  @Column({ nullable: true }) blePayload: string;
  @Column({ nullable: true }) blePacketRaw: string;
  @Column({ nullable: true }) description: string;
  @Column({ nullable: true }) fileUrl: string;
  @Column({ nullable: true }) fileName: string;
  @Column({ nullable: true, type: 'integer' }) fileSize: number;
  // Spec §3.1 attachment fields — computed by the app before upload.
  @Column({ name: 'attachment_name', nullable: true, length: 255 })
  attachmentName: string;
  @Column({ name: 'attachment_url', nullable: true, type: 'text' })
  attachmentUrl: string;
  @Column({ name: 'attachment_hash', nullable: true, length: 80 })
  attachmentHash: string;
  @Column({ default: 'FCM · BLE relay' }) delivery: string;
  @Column({ name: 'consent_id', nullable: true, unique: true })
  consentId: string;
  @Column({ name: 'aborted_reason', nullable: true }) abortedReason: string;
  @Column({ nullable: true }) priority: string;
  @Column({ name: 'expires_at', nullable: true, type: 'bigint' })
  expiresAt: number;
  // Absolute epoch ms of the 60 s decision deadline, computed from the server's
  // Date.now() AT CREATION. Stored explicitly because `createdAt` is a
  // `timestamp without time zone` whose .getTime() is skewed by the server's
  // local timezone offset — unusable for cross-device timing. This column is
  // the single source of truth for the decision window. (bigint → read as
  // string; callers Number() it.)
  @Column({ name: 'decision_deadline_ms', nullable: true, type: 'bigint' })
  decisionDeadlineMs: number;
  @Column({ name: 'session_id', nullable: true }) sessionId: string;
  // Spec §3.1 device_id (e.g. DTI001) — persisted so the consent stays joinable
  // to its device after the request, and so the minted JWT carries the real
  // device_id rather than the session_id. length 32 mirrors ble_sessions.device_id.
  @Column({ name: 'device_id', nullable: true, length: 32 }) deviceId: string;
  @Column({ nullable: true }) approvedAt: Date;
  @Column({ nullable: true }) rejectedAt: Date;
  @ManyToOne(() => User) @Index() owner: User;
  @ManyToOne(() => User) @Index() operator: User;
  @CreateDateColumn() createdAt: Date;
  @UpdateDateColumn() updatedAt: Date;
}
