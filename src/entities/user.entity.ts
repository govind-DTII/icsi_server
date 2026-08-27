import {
  Entity,
  // PHASE 1 DEMO: PrimaryGeneratedColumn replaced by PrimaryColumn so the
  // seed can assign firmware-spec IDs (USR-001, USR-002 …).
  // When real nRF52840 hardware arrives and the firmware is provisioned with
  // real UUIDs, revert to:
  //   @PrimaryGeneratedColumn('uuid') id: string;
  // and remove the explicit id assignments from seed.ts.
  PrimaryGeneratedColumn, // kept for the revert comment above — unused below
  PrimaryColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

@Entity('users')
export class User {
  // PHASE 1 DEMO: ID is a short firmware-spec string (e.g. "USR-001").
  // Real firmware will use UUIDs — replace with @PrimaryGeneratedColumn('uuid').
  @PrimaryColumn({ type: 'varchar', length: 36 }) id: string;
  @Column({ unique: true }) email: string;
  @Column() name: string;
  @Column({ type: 'enum', enum: ['owner', 'operator'] }) role: string;
  @Column({ nullable: true }) deviceId: string;
  @Column({ nullable: true }) passwordHash: string;
  // Spec § ARCHITECTURE / PIN storage — the consent PIN is currently stored
  // against the owner record and fetched at approval. Cleartext for Phase 1
  // demo (PIN-over-BLE accepted risk); production should hash + use a
  // secure element. Only owner rows are expected to carry a value.
  @Column({ nullable: true }) pin: string;
  @Column({ nullable: true }) fcmToken: string;
  @Column({ nullable: true }) apnsToken: string;
  @Column({ default: 'android' }) platform: string;
  @Column({ default: true }) isActive: boolean;
  @CreateDateColumn() createdAt: Date;
}
