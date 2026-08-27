-- =============================================================================
-- RCA fixes migration — 2026-06-15
-- Run manually in prod (dev uses TypeORM synchronize). Idempotent & transactional.
--   psql -h <host> -p 5433 -U postgres -d ascent.en -f 2026-06-15_rca_fixes.sql
--
-- RC#1  ble_sessions: a static, non-rotating firmware session_id collapsed every
--       reconnect into one row. Replace the plain UNIQUE(session_id) with a
--       PARTIAL unique index so only one *active* (ended_at IS NULL) session may
--       exist per id, while ended history rows may repeat it.
-- RC#3  ble_event_audit.error_code was VARCHAR(8); textual termination reasons
--       (REQUEST_EXPIRED=14, ABORTED_BY_USER=15, OPERATOR_DECLINED=17) overflowed
--       it, the insert failed, and the row was silently dropped — error_code was
--       empty for every row. Widen to VARCHAR(32).
-- =============================================================================

BEGIN;

-- --- RC#1 -------------------------------------------------------------------
-- Drop ANY unique constraint on ble_sessions(session_id) (prod auto-named it,
-- e.g. UQ_xxxx) — and any plain unique index, whatever it is called.
DO $$
DECLARE
  r RECORD;
BEGIN
  -- Unique CONSTRAINTS covering exactly (session_id)
  FOR r IN
    SELECT con.conname
    FROM pg_constraint con
    JOIN pg_attribute a
      ON a.attrelid = con.conrelid AND a.attnum = ANY (con.conkey)
    WHERE con.conrelid = 'ble_sessions'::regclass
      AND con.contype = 'u'
      AND a.attname = 'session_id'
    GROUP BY con.conname
    HAVING COUNT(*) = 1
  LOOP
    EXECUTE format('ALTER TABLE ble_sessions DROP CONSTRAINT %I', r.conname);
  END LOOP;

  -- Stand-alone unique INDEXES on (session_id) that are NOT our partial index
  -- and not backing a constraint.
  FOR r IN
    SELECT i.relname AS idxname
    FROM pg_index ix
    JOIN pg_class i ON i.oid = ix.indexrelid
    JOIN pg_class t ON t.oid = ix.indrelid
    WHERE t.relname = 'ble_sessions'
      AND ix.indisunique
      AND ix.indpred IS NULL                 -- non-partial only
      AND i.relname <> 'uq_ble_sessions_active_session_id'
      AND ix.indkey::text = (
        SELECT attnum::text FROM pg_attribute
        WHERE attrelid = 'ble_sessions'::regclass AND attname = 'session_id'
      )
  LOOP
    EXECUTE format('DROP INDEX IF EXISTS %I', r.idxname);
  END LOOP;
END $$;

-- Create the partial unique index (one active session per session_id).
CREATE UNIQUE INDEX IF NOT EXISTS uq_ble_sessions_active_session_id
  ON ble_sessions (session_id)
  WHERE ended_at IS NULL;

-- --- RC#3 -------------------------------------------------------------------
ALTER TABLE ble_event_audit
  ALTER COLUMN error_code TYPE VARCHAR(32);

COMMIT;
