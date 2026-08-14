# Hents Hurga Cloudflare Worker

Cloudflare Worker API backed by D1 and Drizzle ORM.

## Local Runtime Secrets

Create `.dev.vars` from `.dev.vars.example`:

```bash
ACCESS_TOKEN_SECRET=replace-with-a-long-random-secret
SMS_PROVIDER=log
EXPOSE_OTP=true

# Optional for deterministic local testing. Remove it to use random OTP codes.
OTP_CODE=123456
```

For production, set the secret in Cloudflare:

```bash
npx wrangler secret put ACCESS_TOKEN_SECRET
```

## SMS OTP

Local development uses `SMS_PROVIDER=log`, which prints the OTP code in the
Worker console. Production can send real SMS through Infobip:

```bash
npx wrangler secret put SMS_PROVIDER
npx wrangler secret put INFOBIP_BASE_URL
npx wrangler secret put INFOBIP_API_KEY
npx wrangler secret put INFOBIP_SENDER
```

Use `infobip` as the `SMS_PROVIDER` value. The phone number entered in the app is
treated as an 8 digit Mongolian number and sent as `976XXXXXXXX` (Infobip
destinations must not contain the leading `+`).

If `SMS_PROVIDER` is not configured, `/api/auth/send-otp` fails instead of
pretending the message was sent.

Do not set `EXPOSE_OTP=true` in production. That option is only for local
development and testing.

Deploying the Worker requires an API token with Workers permissions, for example
`Workers Scripts:Edit`, plus access to this account. The D1-only token is enough
for Drizzle migrations, but not for Worker secrets or deploys.

## OTP security

- Resending a code is blocked for 60 seconds after the last send (`429`,
  `OTP_RESEND_TOO_SOON`).
- A code is invalidated after 5 wrong attempts (`429`, `OTP_TOO_MANY_ATTEMPTS`);
  the user must request a new code.
- Sending a new code consumes all previous unconsumed codes for that phone.

## API endpoints

```text
GET   /api/health                    health check (no auth)

POST  /api/auth/send-otp            send OTP to a phone number
POST  /api/auth/verify-otp          verify OTP and create a session
POST  /api/auth/refresh             rotate refresh token
GET   /api/auth/me                  current user
PATCH /api/auth/me                  update profile (name)

GET   /api/dashboard                farmer dashboard summary
GET   /api/reports/missing          missing livestock list

GET   /api/livestock                list my livestock (?search=, ?page=, ?limit=)
POST  /api/livestock                create livestock
GET   /api/livestock/:id            livestock detail
PATCH /api/livestock/:id            update livestock
DELETE /api/livestock/:id           delete livestock
PATCH /api/livestock/:id/status     set ACTIVE / MISSING / INACTIVE
GET   /api/livestock/:id/scans      RFID scan history

GET   /api/alerts                   my notifications
PATCH /api/alerts/read-all          mark all read
PATCH /api/alerts/:id/read          mark one read

POST  /api/devices/push-token       register Expo push token
POST  /api/devices/readers          register an RFID reader
POST  /api/scans                    ingest RFID scans (batch, device-facing)
GET   /api/scans                    recent scans with livestock info
POST  /api/uploads                  upload a livestock image

GET   /api/admin/statistics         system-wide stats (ADMIN only)
```

## RFID reader integration

The system supports two reader types:

- **HH100** (Android integrated reader, Impinj E710): use its HTTP POST mode to
  send scan events straight to `POST /api/scans`.
- **HL7202K8** (Bluetooth handheld, Indy R2000): pair it with a phone/tablet app
  over Bluetooth and have the app forward reads to `POST /api/scans`.

`POST /api/scans` takes an authenticated batch of scans:

```bash
curl -X POST $BASE/api/scans -H "$AUTH" -H 'Content-Type: application/json' -d '{
  "scans": [
    { "epc": "E280-1160B00010100254", "direction": "ENTER", "readerId": "hh100-01" },
    { "epc": "E280-1160B00010100277", "direction": "EXIT" }
  ]
}'
```

- `epc` is required; `direction` is one of `ENTER | EXIT | UNKNOWN`
  (default `UNKNOWN`), `readerId` is optional, `scannedAt` is an optional ISO
  timestamp (defaults to now).
- EPCs are matched case-insensitively and stored uppercase.
- Scans whose EPC is registered to the user are linked to the livestock;
  unrecognized EPCs are still stored and reported back via `unknownEpcs`.
- `readerId` is created automatically on first use and attributed to the user.
  A reader id registered by another user is not reassigned (the scan is stored
  without a reader link).
- A batch is capped at 100 scans.

Register a reader explicitly to give it a display name:

```bash
curl -X POST $BASE/api/devices/readers -H "$AUTH" -H 'Content-Type: application/json' \
  -d '{"id":"hh100-01","name":"Хашаа 1 уншигч"}'
```

Registering the same id for another user returns `409 READER_ALREADY_REGISTERED`.

## Notes

- `GET /api/livestock` returns a plain array. Passing `?page=` or `?limit=`
  returns `{ items, total, page, limit, totalPages }` instead.
- Duplicate `earNumber` or `rfidEpc` for the same user returns `409`
  (`DUPLICATE_EAR_NUMBER` / `DUPLICATE_EPC`).
- MISSING/FOUND alerts are also delivered as push notifications to every
  registered Expo push token of the user (non-blocking, via `waitUntil`).
- Reusing a revoked/rotated refresh token revokes every session of that user
  (theft detection).

## Tests

Automated integration tests run the Worker in the workerd runtime with an
isolated local D1 database (migrations applied automatically):

```bash
npm run test        # run once
npm run test:watch  # watch mode
```

`worker/tests/api.test.ts` covers the auth flow (OTP + refresh rotation + theft
detection), livestock CRUD (including duplicate `409`s and pagination), status
alerts, push-token registration, RFID reader registration + scan ingestion and
the admin guard.

## Manual smoke test

Start the Worker locally (apply migrations to the local D1 database the first
time):

```bash
npx wrangler d1 migrations apply hents-hurag --local --config wrangler.toml
npm run worker:dev
```

Then exercise the API with curl. With `.dev.vars` containing `EXPOSE_OTP=true`
and `OTP_CODE=123456`, the OTP code is deterministic:

```bash
BASE=http://localhost:8787

# health (no auth)
curl $BASE/api/health

# auth flow — capture the access token
curl -X POST $BASE/api/auth/send-otp \
  -H 'Content-Type: application/json' -d '{"phoneNumber":"99112233"}'
curl -X POST $BASE/api/auth/verify-otp \
  -H 'Content-Type: application/json' -d '{"phoneNumber":"99112233","code":"123456"}'

TOKEN="<accessToken from the previous response>"
AUTH="Authorization: Bearer $TOKEN"

# livestock CRUD
curl -X POST $BASE/api/livestock -H "$AUTH" -H 'Content-Type: application/json' \
  -d '{"earNumber":"A-001","gender":"FEMALE","rfidEpc":"E280-001"}'
# repeat the same earNumber → expect 409 DUPLICATE_EAR_NUMBER
curl $BASE/api/livestock -H "$AUTH"

# status change → creates an alert
curl -X PATCH $BASE/api/livestock/<id>/status -H "$AUTH" \
  -H 'Content-Type: application/json' -d '{"status":"MISSING"}'
curl $BASE/api/alerts -H "$AUTH"

# refresh rotation
curl -X POST $BASE/api/auth/refresh -H 'Content-Type: application/json' \
  -d '{"refreshToken":"<refreshToken from verify-otp>"}'

# delete
curl -X DELETE $BASE/api/livestock/<id> -H "$AUTH"
```

## Database

Generate migrations:

```bash
npm run db:generate
```

Apply migrations to the remote D1 database:

```bash
npx wrangler d1 migrations apply hents-hurag --remote --config wrangler.toml
```

## Run

```bash
npm run worker:dev
```

Deploy:

```bash
npm run worker:deploy
```
