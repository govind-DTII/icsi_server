# Local run — Ascert.EN Mob App Server

Use this when running the Nest API on your LAN machine and pointing the Flutter
app at it. Phone and PC must be on the **same Wi‑Fi**.

**Firebase / FCM is unchanged** — only the HTTP API base URL switches.

For **cloud deploy** of SER schema/API changes, see [`CLOUD_DEPLOY_SER.md`](./CLOUD_DEPLOY_SER.md).

## Switch local ↔ previous remote (mobile)

In `Ascert.EN_Phase1_Mob_App/lib/constants/app_constants.dart`:

```dart
const bool USE_LOCAL_SERVER = false;  // previous hosted API + credentials
// set to true only for local laptop API
```

| Mode | `USE_LOCAL_SERVER` | API |
|------|--------------------|-----|
| Previous remote (default) | `false` | `https://test.tbls.in/dtii-api/api/v1` |
| Local LAN | `true` | `http://192.168.100.26:3000/api/v1` |

After flipping the flag, rebuild/reinstall the app (`flutter run` or a new APK).

## Endpoints (this machine)

| Service | URL |
|---------|-----|
| API base | `http://192.168.100.26:3000/api/v1` |
| Swagger | `http://192.168.100.26:3000/api/docs` |
| Uploaded files | `http://192.168.100.26:3000/uploads/...` |

The server listens on `0.0.0.0:3000`. Allow inbound TCP **3000** in Windows Firewall if the phone cannot reach the API.

## Database

Create DB once:

```sql
CREATE DATABASE "ascent.en";
```

`.env` (copy from `.env.example`) must use your real Postgres password:

```env
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=<your-postgres-password>
DB_NAME=ascent.en
PORT=3000
JWT_SECRET=local-dev-secret-change-me
```

## Start sequence

```powershell
cd D:\TechBulls\Ascert.EN_Mob_App_Server-
copy .env.example .env
# edit .env → set DB_PASSWORD to your Postgres password
npm install --legacy-peer-deps
npm run seed
npm run start:dev
```

Then rebuild the phone app with `USE_LOCAL_SERVER = true`.

## Local seeded logins (`USE_LOCAL_SERVER = true` only)

| Role | Email | Password | Affix PIN |
|------|-------|----------|-----------|
| Subscriber (DTI001) | `owner1@dtii.in` | `owner123` | `11111111` |
| Operator (DTI001) | `operator1@dtii.in` | `op123` | — |
| Subscriber (DTI002) | `owner2@dtii.in` | `owner123` | `22222222` |
| Operator (DTI002) | `operator2@dtii.in` | `op123` | — |
| Subscriber (DTI003) | `owner3@dtii.in` | `owner123` | `33333333` |
| Operator (DTI003) | `operator3@dtii.in` | `op123` | — |

## Previous remote (`USE_LOCAL_SERVER = false`)

Uses `https://test.tbls.in/dtii-api/api/v1` and the **existing cloud accounts /
PINs** (whatever already works on that hosted server). Do **not** change
Firebase / `google-services.json`. Do **not** reseed the cloud database.
