-- ============================================================
-- Ascent.EN · audit timestamp consistency
-- File   : migrations/006-timestamp-consistency.sql
-- Author : DTII / Ascent.EN backend
-- Safe   : idempotent — guarded by the current column type
-- Apply  : psql -d "ascent.en" -f migrations/006-timestamp-consistency.sql
-- ============================================================
--
-- audit_logs.createdAt was created as `timestamp without time zone` (TypeORM
-- `synchronize` materialised it from the bare @CreateDateColumn() before
-- migration 005's timestamptz CREATE could apply). That is (a) inconsistent with
-- ble_event_audit.recorded_at / ble_sessions.* / tamper_events.* which are all
-- timestamptz, and (b) the same TZ-skew hazard flagged for createdAt elsewhere.
--
-- Convert it in place, interpreting the existing naive values as UTC (the app
-- and backend write UTC). Existing rows are preserved.
--
-- NOTE: consent_requests.* tz-naive columns are deliberately NOT touched here —
-- they feed timing/expiry logic and are handled in a separate task.
-- ============================================================

BEGIN;

DO $$
BEGIN
  IF (
    SELECT data_type FROM information_schema.columns
    WHERE table_name = 'audit_logs' AND column_name = 'createdAt'
  ) = 'timestamp without time zone' THEN
    ALTER TABLE audit_logs
      ALTER COLUMN "createdAt" TYPE timestamptz
      USING "createdAt" AT TIME ZONE 'UTC';
  END IF;
END $$;

COMMIT;

-- To verify:
--   SELECT data_type FROM information_schema.columns
--     WHERE table_name='audit_logs' AND column_name='createdAt';
--   -- expect: timestamp with time zone
