import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Index('idx_ble_event_audit_session_id', ['sessionId'])
@Index('idx_ble_event_audit_consent_id', ['consentId'])
@Index('idx_ble_event_audit_device_id', ['deviceId'])
@Index('idx_ble_event_audit_recorded_at', ['recordedAt'])
@Index('idx_ble_event_audit_errors', ['errorCode'], {
  where: '"error_code" IS NOT NULL',
})
@Entity('ble_event_audit')
export class BleEventAudit {
  // BIGSERIAL in Postgres; TypeORM returns bigint PKs as strings
  @PrimaryGeneratedColumn('increment', { type: 'bigint' })
  id: string;

  @Column({ name: 'session_id', length: 64, nullable: true })
  sessionId: string;

  @Column({ name: 'consent_id', length: 64, nullable: true })
  consentId: string;

  @Column({ length: 32, nullable: true })
  txn: string;

  @Column({ name: 'event_type', length: 48 })
  eventType: string;

  @Column({ length: 16, nullable: true })
  direction: string;

  @Column({ name: 'payload_summary', type: 'jsonb', nullable: true })
  payloadSummary: Record<string, unknown>;

  // Holds either a spec §5 hex error byte ('0x0E') OR a textual termination
  // reason (REQUEST_EXPIRED=14, ABORTED_BY_USER=15, OPERATOR_DECLINED=17).
  // Was VARCHAR(8): textual reasons overflowed it, so the insert failed and
  // safeRecordEvent silently swallowed it — error_code was empty for every row.
  @Column({ name: 'error_code', length: 32, nullable: true })
  errorCode: string;

  // How many BLE write attempts a retried op took (e.g. the 0302 consent_response
  // retry loop). Varies per event and is not derivable — kept first-class so a
  // support engineer can see "decision undelivered after N writes" directly.
  @Column({ name: 'retry_count', type: 'int', nullable: true })
  retryCount: number;

  // The physical witness device the event belongs to. Indexed correlation/filter
  // key (the payload_summary.device_id is not queryable). VARCHAR(32) per DTI ids.
  @Column({ name: 'device_id', length: 32, nullable: true })
  deviceId: string;

  // The JWT user who reported this event (server-set from req.user, never client-
  // supplied). Attributes app-reported protocol events to an actor. UUID = 36.
  @Column({ name: 'actor_id', length: 36, nullable: true })
  actorId: string;

  // DB insert time (single server clock). The trail is ordered by `id`
  // (monotonic insert order), NOT by any device clock — phone/server skew would
  // scramble the interleaving of app vs backend events.
  @Column({ name: 'recorded_at', type: 'timestamptz', default: () => 'NOW()' })
  recordedAt: Date;
}
