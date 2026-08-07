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

`NODE_ENV=production` keeps TypeORM `synchronize: false`. Apply the numbered
migration file **before** restarting the new build:

| File | Purpose |
|------|---------|
| [`migrations/007-ser-geo-evidence.sql`](./migrations/007-ser-geo-evidence.sql) | Operator geo/address on `consent_requests` + SER columns on `audit_logs` |

```bash
psql -d "ascent.en" -f migrations/007-ser-geo-evidence.sql
```

Idempotent (`IF NOT EXISTS`). Verify steps and optional rollback SQL are in
the file header / footer comments.

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
2. Run `migrations/007-ser-geo-evidence.sql` on the cloud DB.
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

- `migrations/007-ser-geo-evidence.sql` — **DB script for cloud** (apply this)
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
2. New columns may stay (nullable; harmless). Optional DROP statements are in
   the footer comments of
   [`migrations/007-ser-geo-evidence.sql`](./migrations/007-ser-geo-evidence.sql).
