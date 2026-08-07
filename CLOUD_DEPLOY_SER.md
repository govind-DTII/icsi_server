# Cloud deploy handoff — SER (Subscriber Evidence Record) server changes

Share this with the **server / DevOps team** before deploying the Nest API to
`test.tbls.in` (or production). Mobile already targets
`https://test.tbls.in/dtii-api/api/v1` when `USE_LOCAL_SERVER = false`.

**Do not run `npm run seed` / `seed:fresh` on cloud.** Existing logins and
owner PINs must stay as they are today.

---

## 1. What changed (summary)

| Area | Change |
|------|--------|
| `consent_requests` | Store operator geo-tag + reverse-geocoded address at create time |
| `audit_logs` | SER columns: document name, hash, file URL, geo + address |
| `POST /api/v1/consent_request` | Accepts optional multipart fields for geo + address (backward compatible) |
| `GET /api/v1/audit?filter=ser` | Returns audit rows where `document_name IS NOT NULL` |
| Runtime | Safer multer reject, ensures `./uploads` exists, no process exit on stray async errors; `synchronize` stays **off** in production |

Existing consent create / approve / reject / BLE / FCM flows are unchanged.
Geo and SER fields are **optional** — old app builds that omit them still work.

---

## 2. Database migration (run once on cloud Postgres)

`NODE_ENV=production` keeps TypeORM `synchronize: false`. Apply this SQL
manually (or via your migration runner) **before** restarting the new build.

```sql
-- ── consent_requests: operator location evidence ───────────────────────────
ALTER TABLE consent_requests
  ADD COLUMN IF NOT EXISTS operator_latitude double precision,
  ADD COLUMN IF NOT EXISTS operator_longitude double precision,
  ADD COLUMN IF NOT EXISTS operator_location_accuracy double precision,
  ADD COLUMN IF NOT EXISTS operator_location_captured_at timestamptz,
  ADD COLUMN IF NOT EXISTS operator_street text,
  ADD COLUMN IF NOT EXISTS operator_city varchar(120),
  ADD COLUMN IF NOT EXISTS operator_state varchar(120),
  ADD COLUMN IF NOT EXISTS operator_postal_code varchar(32);

-- ── audit_logs: SER detail fields ──────────────────────────────────────────
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

-- Optional index for SER list queries
CREATE INDEX IF NOT EXISTS idx_audit_logs_document_name
  ON audit_logs (document_name)
  WHERE document_name IS NOT NULL;
```

Verify:

```sql
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name IN ('consent_requests', 'audit_logs')
  AND column_name LIKE '%latitude%'
     OR (table_name = 'audit_logs' AND column_name IN ('document_name','attachment_hash','file_url','street','city','state','postal_code'))
     OR (table_name = 'consent_requests' AND column_name LIKE 'operator_%')
ORDER BY table_name, column_name;
```

---

## 3. API contract changes

### `POST /api/v1/consent_request` (multipart/form-data)

Existing fields unchanged (`txn`, `device_id`, `title`, `document`, …).

**New optional fields** (all nullable; omit or empty = store null):

| Field | Type | Notes |
|-------|------|--------|
| `latitude` | number/string | Operator GPS latitude |
| `longitude` | number/string | Operator GPS longitude |
| `location_accuracy` | number/string | meters |
| `location_captured_at` | ISO-8601 string | when GPS was taken |
| `street` | string | reverse-geocoded |
| `city` | string | |
| `state` | string | |
| `postal_code` | string | |

Invalid numbers are coerced to `null` (no 400/500 from bad geo).

On create, the consent-create **audit** row also stores SER fields
(`document_name`, `attachment_hash`, `file_url`, lat/lng/accuracy, address).

### `GET /api/v1/audit?filter=ser`

Returns audit rows with `document_name IS NOT NULL` (newest first).
Other filters (`all`, `consent`, `ble`, `auth`) unchanged.

Consent GET responses should already expose attachment hash / location if the
mobile model maps the new entity columns (nullable-safe).

---

## 4. Deploy steps (cloud)

1. **Backup** Postgres (`consent_requests`, `audit_logs` at minimum).
2. Run the **SQL migration** above on the cloud DB.
3. Deploy the new Nest build (this repo’s `src/` changes).
4. Ensure env:
   - `NODE_ENV=production`
   - Existing `DB_*`, `JWT_SECRET`, FCM credentials — **unchanged**
   - Do **not** set `DB_SYNCHRONIZE=true` on cloud
5. Ensure process working directory has a writable `./uploads` folder (app
   creates it on boot if missing).
6. Restart the API process / container.
7. Smoke test (no seed):
   - `GET /api/v1` or Swagger `/api/docs` comes up
   - Login with an **existing** cloud user
   - Operator creates consent with document (geo optional)
   - Subscriber sees consent; SER list via `GET /audit?filter=ser` after create
8. Confirm old clients still create/approve without geo fields.

---

## 5. Stability notes (already in this branch)

- Global `AllExceptionsFilter` — unknown errors return generic 500; process stays up.
- `safeAudit` / `safeRecordEvent` — audit/BLE event write failures never fail consent.
- Multer `fileFilter` rejects bad extensions with `cb(null, false)` (no thrown Error).
- `unhandledRejection` / `uncaughtException` are logged; process is **not** exited.
- Bootstrap creates `uploads/` if missing; fatal only if Nest itself fails to start.

---

## 6. Credentials / seed policy

| Environment | Policy |
|-------------|--------|
| **Cloud** | Keep current users, passwords, and owner PINs. **Never** reseed. |
| **Local laptop only** | `npm run seed` uses demo emails `owner1@dtii.in` / `operator1@dtii.in` and PINs `11111111` / `22222222` / `33333333` per device pair. |

Mobile for cloud: `USE_LOCAL_SERVER = false` → `https://test.tbls.in/dtii-api/api/v1`.
Firebase / `google-services.json` must not be changed for this deploy.

---

## 7. Files touched (server)

- `src/entities/consent-request.entity.ts` — geo + address columns
- `src/entities/audit-log.entity.ts` — SER columns
- `src/consent/dto/create-consent-request.dto.ts` — optional geo/address DTO fields
- `src/consent/consent-request.controller.ts` — parse + pass geo fields
- `src/consent/consent.service.ts` — persist on create + SER audit row
- `src/audit/audit.service.ts` — `filter=ser`
- `src/audit/create-audit.dto.ts` — SER DTO fields
- `src/main.ts` — uploads dir + bootstrap safety
- `src/app.module.ts` — production synchronize guard

---

## 8. Rollback

1. Redeploy previous Nest build.
2. New columns may stay (nullable; harmless). To drop (optional):

```sql
ALTER TABLE consent_requests
  DROP COLUMN IF EXISTS operator_latitude,
  DROP COLUMN IF EXISTS operator_longitude,
  DROP COLUMN IF EXISTS operator_location_accuracy,
  DROP COLUMN IF EXISTS operator_location_captured_at,
  DROP COLUMN IF EXISTS operator_street,
  DROP COLUMN IF EXISTS operator_city,
  DROP COLUMN IF EXISTS operator_state,
  DROP COLUMN IF EXISTS operator_postal_code;

ALTER TABLE audit_logs
  DROP COLUMN IF EXISTS document_name,
  DROP COLUMN IF EXISTS attachment_hash,
  DROP COLUMN IF EXISTS file_url,
  DROP COLUMN IF EXISTS latitude,
  DROP COLUMN IF EXISTS longitude,
  DROP COLUMN IF EXISTS location_accuracy,
  DROP COLUMN IF EXISTS street,
  DROP COLUMN IF EXISTS city,
  DROP COLUMN IF EXISTS state,
  DROP COLUMN IF EXISTS postal_code;
```
