-- ============================================================
-- Ascent.EN · consent_requests.status spec values + users.pin
-- File   : migrations/003-consent-status-enum-and-pin.sql
-- Author : DTII / Ascent.EN backend
-- Safe   : idempotent — re-running this file is a no-op
-- Apply  : psql -d "ascent.en" -f migrations/003-consent-status-enum-and-pin.sql
-- ============================================================
--
-- A.6 — Spec § ARCHITECTURE (`consents.state`):
--   PENDING_OWNER_APPROVAL / APPROVED / REJECTED / EXPIRED / TAMPER_ABORTED
--
-- Pre-fix state:
--   consent_requests.status was a PG enum type with values
--   ('pending','new','approved','rejected','aborted'). The generic 'aborted'
--   was used for both tamper and operator-cancel — disambiguated by reason.
--
-- This migration:
--   1. Converts the column from the named enum type to VARCHAR(32),
--      sidestepping Postgres's enum-value-removal rigidity.
--   2. Translates existing values into the spec set. 'aborted' rows whose
--      abortedReason indicates tamper become TAMPER_ABORTED; rows with
--      REQUEST_EXPIRED become EXPIRED; everything else folds to REJECTED.
--   3. Adds a CHECK constraint enforcing the legal set.
--   4. Drops the now-unused PG enum type.
--
-- A.7 — Adds a cleartext `pin` column on users for the owner record
--   (Phase 1 accepted-risk; production should hash + secure-element).
--   Seeds '12345678' for owners that don't yet have a value.
-- ============================================================

BEGIN;

-- ── 1. consent_requests.status conversion ────────────────────────
-- Convert enum column to varchar so we can store new values freely.
-- USING cast preserves existing rows. The IF block handles re-runs.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
      FROM information_schema.columns
     WHERE table_name = 'consent_requests'
       AND column_name = 'status'
       AND udt_name LIKE '%enum%'
  ) THEN
    ALTER TABLE consent_requests
      ALTER COLUMN status DROP DEFAULT;
    ALTER TABLE consent_requests
      ALTER COLUMN status TYPE VARCHAR(32) USING status::text;
  END IF;
END$$;

-- Translate legacy lowercase values to the spec set.
UPDATE consent_requests SET status = 'PENDING_OWNER_APPROVAL'
 WHERE status IN ('pending', 'new');

UPDATE consent_requests SET status = 'APPROVED'
 WHERE status = 'approved';

UPDATE consent_requests SET status = 'EXPIRED'
 WHERE status = 'aborted'
   AND "aborted_reason" = 'REQUEST_EXPIRED';

UPDATE consent_requests SET status = 'TAMPER_ABORTED'
 WHERE status = 'aborted'
   AND "aborted_reason" IN ('TAMPER_DETECTED', 'TAMPER_ABORTED');

UPDATE consent_requests SET status = 'REJECTED'
 WHERE status IN ('rejected', 'aborted');

-- Default + NOT NULL for the new column.
ALTER TABLE consent_requests
  ALTER COLUMN status SET DEFAULT 'PENDING_OWNER_APPROVAL';

UPDATE consent_requests SET status = 'PENDING_OWNER_APPROVAL'
 WHERE status IS NULL;

ALTER TABLE consent_requests
  ALTER COLUMN status SET NOT NULL;

-- Enforce the legal set going forward.
ALTER TABLE consent_requests
  DROP CONSTRAINT IF EXISTS consent_requests_status_spec_check;
ALTER TABLE consent_requests
  ADD  CONSTRAINT  consent_requests_status_spec_check
  CHECK (status IN (
    'PENDING_OWNER_APPROVAL', 'APPROVED', 'REJECTED',
    'EXPIRED', 'TAMPER_ABORTED'
  ));

-- Drop the legacy enum type if nothing else uses it.
DROP TYPE IF EXISTS consent_requests_status_enum;

-- ── 2. users.pin column + owner seed ────────────────────────────
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS pin VARCHAR(16);

UPDATE users
   SET pin = '12345678'
 WHERE role = 'owner'
   AND pin IS NULL;

COMMIT;

-- To verify:
--   SELECT status, COUNT(*) FROM consent_requests GROUP BY status;
--   SELECT id, role, pin FROM users WHERE role = 'owner';
