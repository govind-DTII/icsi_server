-- ============================================================
-- Ascent.EN · audit-coverage hardening (BLE protocol trail + governance parity)
-- File   : migrations/005-audit-coverage.sql
-- Author : DTII / Ascent.EN backend
-- Safe   : idempotent — re-running this file is a no-op
-- Apply  : psql -d "ascent.en" -f migrations/005-audit-coverage.sql
-- ============================================================
--
-- Brings the audit schema up to production-grade so a support engineer can
-- replay any session from logs alone. Adds:
--   ble_event_audit.retry_count   — BLE write attempts for retried ops (0302)
--   ble_event_audit.device_id     — indexed correlation key (was payload-only)
--   ble_event_audit.actor_id      — JWT user that reported an app-side event
-- And creates audit_logs as a real table (previously only a TypeORM entity,
-- materialised by `synchronize` in dev) so production no longer depends on
-- synchronize being on.
--
-- NOTE: ble_event_audit / audit_logs use snake_case for the columns below
-- (matching the entity @Column name:), so they are NOT double-quoted.
-- ============================================================

BEGIN;

-- ── 0. Honor migration 004's forward-reference (separate concern) ───
-- 004 promised "Migration 005 corrects existing rows to 512". The app requires
-- MTU 512 (session_announce JSON ~269 B; 247 truncates it). Reconcile any row
-- still carrying the erroneous 247. (ble_devices uses quoted camelCase columns.)
UPDATE ble_devices SET "maxPacketBytes" = 512 WHERE "maxPacketBytes" = 247;

-- ── 1. ble_event_audit: new first-class columns ────────────────────
ALTER TABLE ble_event_audit
  ADD COLUMN IF NOT EXISTS retry_count INTEGER,
  ADD COLUMN IF NOT EXISTS device_id   VARCHAR(32),
  ADD COLUMN IF NOT EXISTS actor_id    VARCHAR(36);

CREATE INDEX IF NOT EXISTS idx_ble_event_audit_device_id
  ON ble_event_audit (device_id);

-- ── 2. audit_logs: materialise as a real table (prod parity) ───────
-- Mirrors entities/audit-log.entity.ts. consent_request_id is the surrogate FK
-- to consent_requests; the consent_id/session_id/txn/device_id columns are the
-- denormalized business correlation keys that join to ble_event_audit.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'audit_logs_type_enum') THEN
    CREATE TYPE audit_logs_type_enum AS ENUM ('approve', 'reject', 'login', 'ble', 'system');
  END IF;
END$$;

CREATE TABLE IF NOT EXISTS audit_logs (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action              VARCHAR              NOT NULL,
  detail              TEXT,
  type                audit_logs_type_enum NOT NULL DEFAULT 'system',
  "actorId"           VARCHAR,
  "actorRole"         VARCHAR,
  consent_id          VARCHAR(64),
  txn                 VARCHAR(32),
  session_id          VARCHAR(64),
  device_id           VARCHAR(32),
  "consentRequestId"  UUID REFERENCES consent_requests(id),
  "createdAt"         TIMESTAMPTZ          NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_consent_id ON audit_logs (consent_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_session_id ON audit_logs (session_id);

COMMIT;

-- To verify:
--   \d ble_event_audit   -- shows retry_count, device_id, actor_id
--   \d audit_logs        -- table exists with enum type + indexes
