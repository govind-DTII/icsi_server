-- ============================================================
-- Ascent.EN · Advertised service UUID fix
-- File   : migrations/002-advertised-service-uuid.sql
-- Author : DTII / Ascent.EN backend
-- Safe   : idempotent — re-running this file is a no-op
-- Apply  : psql -d "ascent.en" -f migrations/002-advertised-service-uuid.sql
-- ============================================================
--
-- Spec Step 2 (BLE Discovery & Connect):
--   The ADVERTISED service UUID is `ed0e0200-214f-48d3-a910-75dac43b1fc6`.
--   This is intentionally NOT in the 4454XXXX-7C8E-4A91-B6F2-5D73E9C104AF
--   GATT service family (which is only seen later, during GATT discovery
--   in Step 4). The Flutter app's scan filter must match this UUID OR the
--   local name `DTI001` — not the 4454... GATT UUIDs.
--
-- Pre-fix state:
--   ble_devices.serviceUuid was seeded as 44540200-... (a GATT service UUID).
--   The scan filter would have either silently fallen back to name-only,
--   or — if a developer wired it up — never found the device.
--
-- This migration overwrites the value in any row that still holds the old
-- GATT-family default. Rows with the correct `ed0e02...` value or any other
-- custom value are left alone.
-- ============================================================

BEGIN;

UPDATE ble_devices
   SET "serviceUuid" = 'ed0e0200-214f-48d3-a910-75dac43b1fc6'
 WHERE "serviceUuid" ILIKE '44540200-%';

COMMIT;

-- To verify:
--   SELECT "deviceId", "serviceUuid" FROM ble_devices;
