-- ============================================================
-- Ascent.EN · ble_devices runtime-config columns (single source of truth)
-- File   : migrations/004-ble-device-runtime-config.sql
-- Author : DTII / Ascent.EN backend
-- Safe   : idempotent — re-running this file is a no-op
-- Apply  : psql -d "ascent.en" -f migrations/004-ble-device-runtime-config.sql
-- ============================================================
--
-- CLAUDE.md invariant 6 — no hardcoded config in code. The app already reads
-- device identity + GATT UUIDs from GET /ble-devices/:id/config; this adds the
-- BLE timeout/retry/heartbeat/protocol config so the Flutter protocol.dart
-- constants become fallback-only.
--
-- NOTE: ble_devices columns use TypeORM's default (camelCase) naming, so all
-- identifiers below are double-quoted to preserve case in Postgres.
--
-- Adds:
--   "protocolVersion"             ('1.0') — was hardcoded supportedProtocolVersion
--   "staleHeartbeatSec"           (25)    — app heartbeat watchdog threshold
--   "consentDecisionTimeoutSec"   (60)    — app-owned decision timer (Step 11)
--   "hidInjectWindowSec"          (60)    — Inject-PIN single-use window
--   "rtcDriftThresholdSec"        (30)    — RTC drift caution threshold
--
-- Reconciles drifted existing defaults to the spec values:
--   "heartbeatIntervalSec"  30 -> 10   (spec: heartbeat every 10 s)
--   "ackTimeoutSec"          3 -> 10   (spec: retry consent_response if no
--                                       ack in 10 s)
--   "maxPacketBytes"       512 -> 247  (app requests MTU 247)
--   "advertisementName"  'DT1001' -> 'DTI001' (typo fix; identity unchanged)
-- ============================================================

BEGIN;

-- ── 1. New config columns (with spec defaults) ──────────────────
ALTER TABLE ble_devices
  ADD COLUMN IF NOT EXISTS "protocolVersion"           VARCHAR(8)  NOT NULL DEFAULT '1.0',
  ADD COLUMN IF NOT EXISTS "staleHeartbeatSec"         INTEGER     NOT NULL DEFAULT 25,
  ADD COLUMN IF NOT EXISTS "consentDecisionTimeoutSec" INTEGER     NOT NULL DEFAULT 60,
  ADD COLUMN IF NOT EXISTS "hidInjectWindowSec"        INTEGER     NOT NULL DEFAULT 60,
  ADD COLUMN IF NOT EXISTS "rtcDriftThresholdSec"      INTEGER     NOT NULL DEFAULT 30;

-- ── 2. Reconcile drifted values on existing rows ────────────────
-- Only touch rows still carrying the old defaults, so any operator-tuned
-- value is preserved.
UPDATE ble_devices SET "heartbeatIntervalSec" = 10  WHERE "heartbeatIntervalSec" = 30;
UPDATE ble_devices SET "ackTimeoutSec"        = 10  WHERE "ackTimeoutSec"        = 3;
-- NOTE: maxPacketBytes was originally set to 247 here in error.
-- Spec requires MTU 512 (session_announce JSON is ~269 bytes; 247 truncates it).
-- Migration 005 corrects existing rows to 512. New rows default to 512 via seed.
-- UPDATE ble_devices SET "maxPacketBytes" = 247 WHERE "maxPacketBytes" = 512; -- REMOVED
UPDATE ble_devices SET "advertisementName"    = 'DTI001' WHERE "advertisementName" = 'DT1001';

COMMIT;

-- To verify:
--   SELECT "deviceId", "protocolVersion", "heartbeatIntervalSec",
--          "staleHeartbeatSec", "ackTimeoutSec", "maxAckRetries",
--          "consentDecisionTimeoutSec", "consentExpiryMs",
--          "hidInjectWindowSec", "rtcDriftThresholdSec", "maxPacketBytes"
--     FROM ble_devices;
