-- ============================================================
-- Ascent.EN · SER (Subscriber Evidence Record) geo + document evidence
-- File   : migrations/007-ser-geo-evidence.sql
-- Author : DTII / Ascent.EN backend
-- Safe   : idempotent — ADD COLUMN IF NOT EXISTS / CREATE INDEX IF NOT EXISTS
-- Apply  : psql -d "ascent.en" -f migrations/007-ser-geo-evidence.sql
-- ============================================================
--
-- Adds operator geo-tag + reverse-geocoded address on consent_requests at
-- create time, and matching SER detail columns on audit_logs so the
-- subscriber SER tab can list document name + timestamp and open hash /
-- location without parsing free-text detail.
--
-- All new columns are nullable — old app builds that omit geo still work.
-- Do NOT run seed on cloud after applying this migration.
--
-- NOTE: snake_case column names match entity @Column({ name: ... }) so they
-- are NOT double-quoted (same convention as migration 005).
-- ============================================================

BEGIN;

-- ── 1. consent_requests: operator location evidence ───────────────
ALTER TABLE consent_requests
  ADD COLUMN IF NOT EXISTS operator_latitude double precision,
  ADD COLUMN IF NOT EXISTS operator_longitude double precision,
  ADD COLUMN IF NOT EXISTS operator_location_accuracy double precision,
  ADD COLUMN IF NOT EXISTS operator_location_captured_at timestamptz,
  ADD COLUMN IF NOT EXISTS operator_street text,
  ADD COLUMN IF NOT EXISTS operator_city varchar(120),
  ADD COLUMN IF NOT EXISTS operator_state varchar(120),
  ADD COLUMN IF NOT EXISTS operator_postal_code varchar(32);

-- ── 2. audit_logs: SER detail fields ─────────────────────────────
ALTER TABLE audit_logs
  ADD COLUMN IF NOT EXISTS document_name varchar(255),
  ADD COLUMN IF NOT EXISTS attachment_hash varchar(80),
  ADD COLUMN IF NOT EXISTS file_url text,
  ADD COLUMN IF NOT EXISTS latitude double precision,
  ADD COLUMN IF NOT EXISTS longitude double precision,
  ADD COLUMN IF NOT EXISTS location_accuracy double precision,
  ADD COLUMN IF NOT EXISTS street text,
  ADD COLUMN IF NOT EXISTS city varchar(120),
  ADD COLUMN IF NOT EXISTS state varchar(120),
  ADD COLUMN IF NOT EXISTS postal_code varchar(32);

-- ── 3. Index for GET /audit?filter=ser (document_name IS NOT NULL) ─
CREATE INDEX IF NOT EXISTS idx_audit_logs_document_name
  ON audit_logs (document_name)
  WHERE document_name IS NOT NULL;

COMMIT;

-- To verify:
--   SELECT table_name, column_name, data_type
--   FROM information_schema.columns
--   WHERE (table_name = 'consent_requests' AND column_name LIKE 'operator_%')
--      OR (table_name = 'audit_logs' AND column_name IN (
--           'document_name','attachment_hash','file_url',
--           'latitude','longitude','location_accuracy',
--           'street','city','state','postal_code'
--         ))
--   ORDER BY table_name, column_name;
--
-- Rollback (optional — only if you must drop SER columns):
--   ALTER TABLE consent_requests
--     DROP COLUMN IF EXISTS operator_latitude,
--     DROP COLUMN IF EXISTS operator_longitude,
--     DROP COLUMN IF EXISTS operator_location_accuracy,
--     DROP COLUMN IF EXISTS operator_location_captured_at,
--     DROP COLUMN IF EXISTS operator_street,
--     DROP COLUMN IF EXISTS operator_city,
--     DROP COLUMN IF EXISTS operator_state,
--     DROP COLUMN IF EXISTS operator_postal_code;
--   DROP INDEX IF EXISTS idx_audit_logs_document_name;
--   ALTER TABLE audit_logs
--     DROP COLUMN IF EXISTS document_name,
--     DROP COLUMN IF EXISTS attachment_hash,
--     DROP COLUMN IF EXISTS file_url,
--     DROP COLUMN IF EXISTS latitude,
--     DROP COLUMN IF EXISTS longitude,
--     DROP COLUMN IF EXISTS location_accuracy,
--     DROP COLUMN IF EXISTS street,
--     DROP COLUMN IF EXISTS city,
--     DROP COLUMN IF EXISTS state,
--     DROP COLUMN IF EXISTS postal_code;
