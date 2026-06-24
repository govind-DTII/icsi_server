-- ============================================================
-- Ascent.EN · BLE API Spec v2.0 Schema Migration
-- File   : migrations/001-v2-ble-spec-schema.sql
-- Author : DTII / Ascent.EN backend
-- Safe   : idempotent — re-running this file is a no-op
-- Apply  : psql -d "ascent.en" -f migrations/001-v2-ble-spec-schema.sql
-- ============================================================
--
-- NAMING STRATEGY NOTE
-- TypeORM DefaultNamingStrategy preserves property names verbatim
-- as column names (camelCase, double-quoted).  The five existing
-- TypeORM-managed tables (ble_devices, ble_characteristics,
-- consent_requests, …) therefore have columns like "deviceId",
-- "shortCode", "bleDeviceId", etc.
-- All five NEW tables in this migration are raw SQL and use
-- snake_case throughout (no TypeORM entity yet).
-- ============================================================

BEGIN;

-- ============================================================
-- EXTENSION — gen_random_uuid() built-in since PG 13;
--             pgcrypto provides it for PG 12 and earlier.
-- ============================================================
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- TABLE 1 · ble_sessions
--   Tracks one BLE session from session_announce → disconnect.
--   One row per physical connection attempt.
-- ============================================================
CREATE TABLE IF NOT EXISTS ble_sessions (
  id           UUID         NOT NULL DEFAULT gen_random_uuid(),
  session_id   VARCHAR(64)  NOT NULL,
  device_id    VARCHAR(32)  NOT NULL,
  operator_id  VARCHAR(32)  NOT NULL,
  owner_id     VARCHAR(32)  NOT NULL,
  fw_version   VARCHAR(16),
  hw_version   VARCHAR(16),
  mac_address  VARCHAR(17),
  ble_version  VARCHAR(16),
  tls_version  VARCHAR(16),
  state        VARCHAR(32)  NOT NULL DEFAULT 'IDLE',
  started_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  ended_at     TIMESTAMPTZ,
  ended_reason VARCHAR(64),
  created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  CONSTRAINT ble_sessions_pkey          PRIMARY KEY (id),
  CONSTRAINT ble_sessions_session_id_key UNIQUE      (session_id)
);

CREATE INDEX IF NOT EXISTS idx_ble_sessions_device_id
  ON ble_sessions (device_id);

CREATE INDEX IF NOT EXISTS idx_ble_sessions_operator_id
  ON ble_sessions (operator_id);

-- Partial index: fast lookup of all currently-open sessions
CREATE INDEX IF NOT EXISTS idx_ble_sessions_active
  ON ble_sessions (state)
  WHERE ended_at IS NULL;

-- ============================================================
-- TABLE 2 · tamper_events
--   Recorded whenever firmware or app detects a tamper signal.
--   resolved = FALSE until an operator or admin clears the flag.
-- ============================================================
CREATE TABLE IF NOT EXISTS tamper_events (
  id          UUID        NOT NULL DEFAULT gen_random_uuid(),
  device_id   VARCHAR(32) NOT NULL,
  session_id  VARCHAR(64),
  consent_id  VARCHAR(64),
  detected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reported_by VARCHAR(32) NOT NULL
              CHECK (reported_by IN ('firmware', 'app')),
  resolved    BOOLEAN     NOT NULL DEFAULT FALSE,
  resolved_at TIMESTAMPTZ,
  notes       TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT tamper_events_pkey PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS idx_tamper_events_device_id
  ON tamper_events (device_id);

-- Partial index: keeps open-tamper dashboard queries fast
CREATE INDEX IF NOT EXISTS idx_tamper_events_unresolved
  ON tamper_events (device_id)
  WHERE resolved = FALSE;

-- ============================================================
-- TABLE 3 · rtc_sync_events
--   One row each time the app corrects the device clock.
--   drift_ms = new_timestamp_ms - old_timestamp_ms.
-- ============================================================
CREATE TABLE IF NOT EXISTS rtc_sync_events (
  id               UUID        NOT NULL DEFAULT gen_random_uuid(),
  device_id        VARCHAR(32) NOT NULL,
  session_id       VARCHAR(64),
  operator_id      VARCHAR(32) NOT NULL,
  old_timestamp_ms BIGINT      NOT NULL,
  new_timestamp_ms BIGINT      NOT NULL,
  drift_ms         BIGINT      NOT NULL,
  corrected_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT rtc_sync_events_pkey PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS idx_rtc_sync_events_device_id
  ON rtc_sync_events (device_id);

-- ============================================================
-- TABLE 4 · device_identity_snapshots
--   Captures what the DEVICE_IDENTITY characteristic reported
--   at the start of each session. FK cascades on session delete.
-- ============================================================
CREATE TABLE IF NOT EXISTS device_identity_snapshots (
  id          UUID        NOT NULL DEFAULT gen_random_uuid(),
  session_id  VARCHAR(64) NOT NULL,
  device_id   VARCHAR(32) NOT NULL,
  mac_address VARCHAR(17),
  owner_id    VARCHAR(32),
  fw_version  VARCHAR(16),
  hw_version  VARCHAR(16),
  ble_version VARCHAR(16),
  tls_version VARCHAR(16),
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT device_identity_snapshots_pkey PRIMARY KEY (id),
  CONSTRAINT device_identity_snapshots_session_fkey
    FOREIGN KEY (session_id)
    REFERENCES ble_sessions (session_id)
    ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_device_identity_snapshots_session_id
  ON device_identity_snapshots (session_id);

-- ============================================================
-- TABLE 5 · ble_event_audit
--   Append-only packet-level audit trail. BIGSERIAL PK for
--   strict insertion order. JSONB payload_summary keeps the
--   row narrow while preserving arbitrary packet fields.
-- ============================================================
CREATE TABLE IF NOT EXISTS ble_event_audit (
  id              BIGSERIAL   NOT NULL,
  session_id      VARCHAR(64),
  consent_id      VARCHAR(64),
  txn             VARCHAR(32),
  event_type      VARCHAR(48) NOT NULL,
  direction       VARCHAR(16),
  payload_summary JSONB,
  error_code      VARCHAR(8),
  recorded_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT ble_event_audit_pkey PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS idx_ble_event_audit_session_id
  ON ble_event_audit (session_id);

CREATE INDEX IF NOT EXISTS idx_ble_event_audit_consent_id
  ON ble_event_audit (consent_id);

-- DESC so newest events sort to the top without an explicit sort
CREATE INDEX IF NOT EXISTS idx_ble_event_audit_recorded_at
  ON ble_event_audit (recorded_at DESC);

-- Partial index: isolates error rows for alert queries
CREATE INDEX IF NOT EXISTS idx_ble_event_audit_errors
  ON ble_event_audit (error_code)
  WHERE error_code IS NOT NULL;

-- ============================================================
-- ALTER consent_requests — add v2.0 columns
--
-- IF NOT EXISTS silently skips any column that already exists,
-- so re-runs and partial prior migrations are safe.
--
-- Columns scope / file_url / file_name are already present in
-- the TypeORM entity (as "scope", "fileUrl", "fileName").
-- Adding them here as snake_case (consent_id, session_id, etc.)
-- keeps them clearly separate from the TypeORM-managed ones
-- until the entity is updated for v2.0.
--
-- priority: NOT NULL DEFAULT 'normal' — Postgres 11+ backfills
-- existing rows before enforcing the NOT NULL constraint, so
-- this is safe on a live table.
-- ============================================================
ALTER TABLE consent_requests
  ADD COLUMN IF NOT EXISTS consent_id     VARCHAR(64),
  ADD COLUMN IF NOT EXISTS txn            VARCHAR(32),
  ADD COLUMN IF NOT EXISTS session_id     VARCHAR(64),
  ADD COLUMN IF NOT EXISTS scope          VARCHAR(16),
  ADD COLUMN IF NOT EXISTS priority       VARCHAR(8)  NOT NULL DEFAULT 'normal',
  ADD COLUMN IF NOT EXISTS expires_at     TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS file_url       TEXT,
  ADD COLUMN IF NOT EXISTS file_name      VARCHAR(255),
  ADD COLUMN IF NOT EXISTS aborted_reason VARCHAR(64);

-- UNIQUE on consent_id — DO block guards against duplicate
-- constraint if the migration is re-run after a partial apply
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conname    = 'consent_requests_consent_id_key'
       AND conrelid   = 'consent_requests'::regclass
  ) THEN
    ALTER TABLE consent_requests
      ADD CONSTRAINT consent_requests_consent_id_key
      UNIQUE (consent_id);
  END IF;
END$$;

-- Partial indexes keep NULLs out of the index pages
CREATE INDEX IF NOT EXISTS idx_consent_requests_consent_id
  ON consent_requests (consent_id)
  WHERE consent_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_consent_requests_session_id
  ON consent_requests (session_id)
  WHERE session_id IS NOT NULL;

-- Named _v2 to avoid collision with any existing index on txn_ref
CREATE INDEX IF NOT EXISTS idx_consent_requests_txn_v2
  ON consent_requests (txn)
  WHERE txn IS NOT NULL;

-- ============================================================
-- UPDATE ble_characteristics — v1.x → v2.0 UUIDs
--
-- Step A: ensure uuid has a UNIQUE constraint so that
--         ON CONFLICT (uuid) works on re-run.
-- Step B: delete stale v1.x rows (ed0e0xxx series).
-- Step C: insert 12 v2.0 rows; ON CONFLICT is a no-op
--         if they were already inserted on a prior run.
--
-- UUID scheme   : 44540XXX-7C8E-4A91-B6F2-5D73E9C104AF
--   XXXX = 4-digit characteristic code (e.g. 0101, 0201 …)
--
-- Column name note (TypeORM DefaultNamingStrategy):
--   "name"       → ble_characteristics."name"
--   "shortCode"  → ble_characteristics."shortCode"
--   "isActive"   → ble_characteristics."isActive"
--   "bleDeviceId"→ ble_characteristics."bleDeviceId"  (FK)
-- If the project uses SnakeCaseNamingStrategy, remove the
-- double quotes from those four column names.
-- ============================================================

-- Step A · UNIQUE guard
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conname  = 'ble_characteristics_uuid_key'
       AND conrelid = 'ble_characteristics'::regclass
  ) THEN
    ALTER TABLE ble_characteristics
      ADD CONSTRAINT ble_characteristics_uuid_key UNIQUE (uuid);
  END IF;
END$$;

-- Step B · remove v1.x rows
-- The "uuid" column stores characteristic UUIDs (not service UUIDs).
-- v1.x values start with 'ed0e'; '0000DTII%' catches any alternate
-- format that may have been used in earlier prototypes.
DELETE FROM ble_characteristics
  WHERE uuid LIKE 'ed0e%'
     OR uuid LIKE '0000DTII%';

-- Step C · insert v2.0 rows
INSERT INTO ble_characteristics
  (id, "name", uuid, "shortCode", properties, direction, purpose, "isActive", "bleDeviceId")
VALUES

  -- ── Service 0100 · Device Information ────────────────────────
  ( gen_random_uuid(),
    'device_identity',
    '44540101-7C8E-4A91-B6F2-5D73E9C104AF',
    '0x0101', 'READ', 'firmware_to_app',
    'Device serial, firmware version, attestation key reference',
    TRUE,
    (SELECT id FROM ble_devices WHERE "deviceId" = 'DTI001' LIMIT 1) ),

  ( gen_random_uuid(),
    'device_status',
    '44540102-7C8E-4A91-B6F2-5D73E9C104AF',
    '0x0102', 'READ_NOTIFY', 'firmware_to_app',
    'Device state, session status, heartbeat, error notifications',
    TRUE,
    (SELECT id FROM ble_devices WHERE "deviceId" = 'DTI001' LIMIT 1) ),

  ( gen_random_uuid(),
    'rtc_sync',
    '44540103-7C8E-4A91-B6F2-5D73E9C104AF',
    '0x0103', 'READ_WRITE', 'bidirectional',
    'App reads device RTC; writes corrected UNIX-ms timestamp back',
    TRUE,
    (SELECT id FROM ble_devices WHERE "deviceId" = 'DTI001' LIMIT 1) ),

  -- ── Service 0200 · Session ────────────────────────────────────
  ( gen_random_uuid(),
    'session_announce',
    '44540201-7C8E-4A91-B6F2-5D73E9C104AF',
    '0x0201', 'NOTIFY', 'firmware_to_app',
    'Firmware notifies app of new BLE session on connect',
    TRUE,
    (SELECT id FROM ble_devices WHERE "deviceId" = 'DTI001' LIMIT 1) ),

  ( gen_random_uuid(),
    'session_ack',
    '44540202-7C8E-4A91-B6F2-5D73E9C104AF',
    '0x0202', 'WRITE', 'app_to_firmware',
    'App echoes session_id to acknowledge session_announce',
    TRUE,
    (SELECT id FROM ble_devices WHERE "deviceId" = 'DTI001' LIMIT 1) ),

  ( gen_random_uuid(),
    'session_confirm',
    '44540203-7C8E-4A91-B6F2-5D73E9C104AF',
    '0x0203', 'NOTIFY', 'firmware_to_app',
    'Firmware confirms session established or reports failure',
    TRUE,
    (SELECT id FROM ble_devices WHERE "deviceId" = 'DTI001' LIMIT 1) ),

  -- ── Service 0300 · Consent ────────────────────────────────────
  ( gen_random_uuid(),
    'consent_request',
    '44540301-7C8E-4A91-B6F2-5D73E9C104AF',
    '0x0301', 'TBC', 'firmware_to_app',
    'Firmware sends consent_req and consent_ack packets to app',
    TRUE,
    (SELECT id FROM ble_devices WHERE "deviceId" = 'DTI001' LIMIT 1) ),

  ( gen_random_uuid(),
    'consent_response',
    '44540302-7C8E-4A91-B6F2-5D73E9C104AF',
    '0x0302', 'WRITE', 'app_to_firmware',
    'App sends consent_response with JWT decision token to firmware',
    TRUE,
    (SELECT id FROM ble_devices WHERE "deviceId" = 'DTI001' LIMIT 1) ),

  ( gen_random_uuid(),
    'consent_ack',
    '44540303-7C8E-4A91-B6F2-5D73E9C104AF',
    '0x0303', 'NOTIFY', 'firmware_to_app',
    'Firmware ACKs consent_response within 3 s of receipt',
    TRUE,
    (SELECT id FROM ble_devices WHERE "deviceId" = 'DTI001' LIMIT 1) ),

  -- ── Service 0400 · Heartbeat ──────────────────────────────────
  ( gen_random_uuid(),
    'heartbeat',
    '44540401-7C8E-4A91-B6F2-5D73E9C104AF',
    '0x0401', 'NOTIFY', 'firmware_to_app',
    'Firmware sends heartbeat every 10 s; app resets 5-min stale timer',
    TRUE,
    (SELECT id FROM ble_devices WHERE "deviceId" = 'DTI001' LIMIT 1) ),

  -- ── Service 0500 · Error ──────────────────────────────────────
  ( gen_random_uuid(),
    'error',
    '44540501-7C8E-4A91-B6F2-5D73E9C104AF',
    '0x0501', 'NOTIFY', 'firmware_to_app',
    'Firmware reports error conditions and tamper events to app',
    TRUE,
    (SELECT id FROM ble_devices WHERE "deviceId" = 'DTI001' LIMIT 1) ),

  -- ── Service 0600 · HID Injection ──────────────────────────────
  ( gen_random_uuid(),
    'hid_pin',
    '44540601-7C8E-4A91-B6F2-5D73E9C104AF',
    '0x0601', 'WRITE', 'app_to_firmware',
    'App sends HID PIN injection command to firmware after consent grant',
    TRUE,
    (SELECT id FROM ble_devices WHERE "deviceId" = 'DTI001' LIMIT 1) )

ON CONFLICT (uuid) DO NOTHING;

COMMIT;

-- ============================================================
-- To apply:
--   psql -U postgres -d "ascent.en" \
--        -f backend/migrations/001-v2-ble-spec-schema.sql
--
-- To verify new tables:
--   \dt ble_sessions tamper_events rtc_sync_events \
--       device_identity_snapshots ble_event_audit
--
-- To verify new characteristics (12 rows expected):
--   SELECT name, uuid, "shortCode", properties
--     FROM ble_characteristics
--    ORDER BY uuid;
-- ============================================================
