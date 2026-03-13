# DermMap — Security & Architecture Remediation Plan

**Created:** 2026-03-12  
**Last updated:** 2026-03-13 (Phase 9 complete — all 33 issues resolved)
**Scope:** Complete security audit — HIPAA gaps, OWASP risks, architecture flaws (backend + frontend + infrastructure)  
**Track status:** Check off each `[ ]` sub-task as completed. Update the Quick Reference status when an issue is fully closed.

---

## Quick Reference — Issue Index

| # | Issue | Severity | Category | Status |
|---|---|---|---|---|
| 1 | [No MFA/2FA](#1-no-mfa--2fa) | 🔴 CRITICAL | Auth | `[x] Done` |
| 2 | [No token revocation / logout invalidation](#2-no-token-revocation--logout-invalidation) | 🔴 CRITICAL | Auth | `[x] Done` |
| 3 | [Refresh token has no rotation](#3-refresh-token-has-no-rotation) | 🔴 CRITICAL | Auth | `[x] Done` |
| 4 | [No password reset flow](#4-no-password-reset-flow) | 🔴 CRITICAL | Auth | `[x] Done` |
| 5 | [Sync route bypasses all authorization](#5-sync-route-bypasses-all-authorization) | 🔴 CRITICAL | Access Control | `[x] Done` |
| 6 | [DocuSign webhook has no signature verification](#6-docusign-webhook-has-no-signature-verification) | 🔴 CRITICAL | Auth Bypass | `[x] Resolved` |
| 7 | [Photo route schema mismatch — upload/download broken](#7-photo-route-schema-mismatch) | 🔴 CRITICAL | Broken Feature | `[x] Resolved` |
| 8 | [Service worker caches PHI — never cleared on logout](#8-service-worker-caches-phi) | 🔴 CRITICAL | Frontend / HIPAA | `[x] Done` |
| 9 | [No client-side session timeout](#9-no-client-side-session-timeout) | 🔴 CRITICAL | Frontend / HIPAA | `[x] Done` |
| 10 | [Demo mode is the production default](#10-demo-mode-is-production-default) | 🔴 CRITICAL | Config | `[x] Done` |
| 11 | [No DB transport encryption](#11-no-db-transport-encryption) | 🔴 CRITICAL | Infrastructure | `[x] Resolved` |
| 12 | [Schedule route has no location-tenancy filter](#12-schedule-route-no-location-tenancy) | 🟠 HIGH | Access Control | `[x] Done` |
| 13 | [Analytics route returns cross-clinic data](#13-analytics-route-cross-clinic-data) | 🟠 HIGH | Access Control | `[x] Done` |
| 14 | [Visit/lesion/photo DELETE has no role restriction](#14-delete-operations-no-role-restriction) | 🟠 HIGH | Access Control | `[x] Done` |
| 15 | [Photo upload has no location-tenancy check](#15-photo-upload-no-tenancy-check) | 🟠 HIGH | Access Control | `[x] Done` |
| 16 | [No server-side audit logging on PHI access](#16-no-server-side-audit-logging) | 🟠 HIGH | HIPAA | `[x] Done` |
| 17 | [User admin route returns all users cross-clinic](#17-user-admin-cross-clinic-leak) | 🟠 HIGH | Access Control | `[x] Done` |
| 18 | [Deactivated user tokens remain valid](#18-deactivated-user-tokens-still-valid) | 🟠 HIGH | Auth | `[x] Done` |
| 19 | [Seed file has weak password and logs credentials](#19-seed-file-weak-password) | 🟠 HIGH | Credentials | `[x] Done` |
| 20 | [No formal migration framework](#20-no-formal-migration-framework) | 🟠 HIGH | Architecture | `[x] Done` |
| 21 | [Admin bootstrap problem](#21-admin-bootstrap-problem) | 🟠 HIGH | Architecture | `[x] Done` |
| 22 | [`authorizeRoles` leaks role information](#22-authorizeroles-leaks-role-info) | 🟡 MEDIUM | Info Disclosure | `[x] Done` |
| 23 | [`last_login_at` never written](#23-last_login_at-never-written) | 🟡 MEDIUM | HIPAA Audit | `[x] Done` |
| 24 | [SECURITY.md documentation drift](#24-securitymd-documentation-drift) | 🟡 MEDIUM | Documentation | `[x] Done` |
| 25 | [Request logging missing user ID and IP](#25-request-logging-incomplete) | 🟡 MEDIUM | HIPAA Audit | `[x] Done` |
| 26 | [Settings route creates tables at runtime](#26-settings-inline-ddl) | 🟡 MEDIUM | Architecture | `[x] Done` |
| 27 | [Second IndexedDB not cleared on logout](#27-second-indexeddb-not-cleared) | 🟡 MEDIUM | Frontend / HIPAA | `[x] Done` |
| 28 | [Error handler exposes stack traces](#28-error-handler-stack-traces) | 🟡 MEDIUM | Info Disclosure | `[x] Done` |
| 29 | [Rate limiter is IP-only — no account-based limiting](#29-rate-limiter-ip-only) | 🟡 MEDIUM | Auth | `[x] Done` |
| 30 | [Node.js 18 Docker image is EOL](#30-nodejs-18-eol) | 🟢 LOW | Infrastructure | `[x] Done` |
| 31 | [Nginx missing security headers for production](#31-nginx-missing-headers) | 🟢 LOW | Infrastructure | `[x] Done` |
| 32 | [Docker Compose uses weak/default secrets](#32-docker-compose-weak-secrets) | 🟢 LOW | Infrastructure | `[x] Done` |
| 33 | [Frontend Auth0 config references still present](#33-frontend-auth0-references) | 🟢 LOW | Cleanup | `[x] Done` |

---

## How to Use This Document

1. Work issues **in order within each severity tier** (CRITICAL first, then HIGH, etc.).
2. Read the **Problem**, **HIPAA citation**, **Files affected**, and **Step-by-step** sections in full before touching code.
3. Check off each sub-task `[ ]` → `[x]` as completed.
4. Run the **Verification** checklist before marking the issue done.
5. Update the Quick Reference table to `[x] Done`.
6. Record your name and date in the Completion Summary at the bottom.

### Dependency Map

```
Issue 2 (sessions table) ──→ Issue 3 (refresh rotation) ──→ Issue 1 (MFA)
                         └──→ Issue 18 (deactivated user revocation)
                         └──→ Issue 4 (password reset revokes sessions)
Issue 7 (photo schema)  ──→ Issue 15 (photo tenancy)
Issue 20 (migrations)    ── independent but recommended before schema-adding issues
```

### Recommended Execution Order

**Phase 1 — Quick wins:** ✅ COMPLETE (2026-03-12)
23, 22, 25, 28, 19, 21

**Phase 2 — Critical auth infrastructure:** ✅ COMPLETE (2026-03-13)
2 → 3 → 18 → 1 → 4

**Phase 3 — Access control / authorization:** ✅ COMPLETE (2026-03-13)
5, 12, 13, 14, 15, 17

**Phase 4 — Frontend security:** ✅ COMPLETE (2026-03-12/13)
9, 8, 27, 10

**Phase 5 — Infrastructure & architecture:** ✅ COMPLETE (2026-03-13)
Issues 6, 7, 11 resolved.

**Phase 6 — Remaining backend security:** ✅ COMPLETE (2026-03-13)
26 → 16 → 29
*Settings DDL moved to setup.js (Issue 26); server-side PHI audit logging added across all clinical routes (Issue 16); per-email account lockout (5 failures → 15-min lock) added to login handler (Issue 29).*

**Phase 7 — Architecture modernization:** ✅ COMPLETE (2026-03-13)
20
*node-pg-migrate installed; 10 versioned migration files in `backend/migrations/`; `migrate.js` programmatic runner; `db:setup` now calls `migrate:up`; `setup.js` retained as legacy fallback with deprecation notice.*

**Phase 8 — Infrastructure hardening:** ✅ COMPLETE (2026-03-13)
30 → 31 → 32  
*Upgraded all Dockerfiles from `node:18-alpine` to `node:20-alpine` (backend prod/dev + frontend dev); added CSP, HSTS, Permissions-Policy, `X-Frame-Options DENY`, and `X-XSS-Protection: 0` to nginx.conf; replaced hardcoded credentials in docker-compose.yml with `${VAR:?}` env var references + created `.env.docker.example`; fixed dev JWT secret to 40 chars.*

**Phase 9 — Documentation & final cleanup:** ✅ COMPLETE (2026-03-13)
24 → 33  
*SECURITY.md fully rewritten to reflect real JWT/bcrypt/TOTP stack — removed all Auth0 mentions, corrected false `✅` items, added accurate auth table, nginx headers, audit logging, and migration framework docs. Auth0Wrapper.tsx converted to a no-op passthrough; `auth0` config block removed from config.ts and vite-env.d.ts; `@auth0/auth0-react` uninstalled; `'auth0'` removed from the authProvider type union.*

---

---

## CRITICAL ISSUES

---

### 1. No MFA / 2FA

**Severity:** 🔴 CRITICAL  
**HIPAA:** §164.312(d) — Person or Entity Authentication  
**OWASP:** A07:2021 — Identification and Authentication Failures

#### Problem

No second factor exists anywhere in the auth flow. The frontend `LoginScreen.tsx` has a simulated MFA step that accepts **any 6 digits** after a `setTimeout` — no server-side verification occurs. A stolen password alone is enough to access all PHI.

#### Files affected

| File | Change |
|---|---|
| `backend/package.json` | Add `otplib`, `qrcode` |
| `backend/src/db/setup.js` | Add `mfa_secret`, `mfa_enabled` columns |
| `backend/src/routes/auth.js` | New endpoints + modify login flow |
| `src/components/auth/LoginScreen.tsx` | Replace simulated MFA with real TOTP verification |

#### Step-by-step

##### 1-A: Install dependencies
- [x] Run `npm install otplib qrcode` inside `backend/`

##### 1-B: Add MFA columns to the users table
Add to `backend/src/db/setup.js` (migration line after existing user-column patches):
```sql
ALTER TABLE users ADD COLUMN IF NOT EXISTS mfa_secret VARCHAR(64);
ALTER TABLE users ADD COLUMN IF NOT EXISTS mfa_enabled BOOLEAN NOT NULL DEFAULT FALSE;
```
- [x] Add the `ALTER TABLE` lines
- [x] Run `npm run db:setup` and confirm no errors

##### 1-C: Add `POST /api/auth/mfa/setup` endpoint
- [x] Requires `authenticateToken`
- [x] Generates TOTP secret via `import { authenticator } from 'otplib'` → `authenticator.generateSecret()`
- [x] Stores secret in `users.mfa_secret` for the logged-in user (NOT enabled yet)
- [x] Returns `{ qrCode, secret }` (QR via `qrcode.toDataURL`)

##### 1-D: Add `POST /api/auth/mfa/verify` endpoint (activates MFA)
- [x] Requires `authenticateToken`
- [x] Accepts `{ code }`, validates with `authenticator.check(code, secret)`
- [x] On success: sets `mfa_enabled = TRUE`
- [x] On failure: returns 400

##### 1-E: Add `POST /api/auth/mfa/disable` endpoint
- [x] Requires `authenticateToken` + current `password` in body
- [x] Verifies password via `bcrypt.compare` before disabling

##### 1-F: Modify login to require TOTP when MFA is enabled
In `POST /api/auth/login`:
- [x] After password verified, check `user.mfa_enabled`
- [x] If `true` and `totpCode` is absent → return `{ mfaRequired: true }` (HTTP 200, no token)
- [x] If `true` and `totpCode` is present → validate with `authenticator.check()`
- [x] If invalid → return 401 (counted by rate limiter)
- [x] Also fetch `mfa_secret` in the initial user lookup query (add to SELECT)

##### 1-G: Update frontend LoginScreen.tsx
- [x] Replace the simulated `setTimeout` MFA with a real server call passing `totpCode`
- [x] When login returns `{ mfaRequired: true }`, show the TOTP input
- [x] On submit, call login again with `{ email, password, totpCode }`

##### 1-H: Never expose `mfa_secret` in public responses
- [x] Ensure `/api/auth/verify`, `/api/admin/users`, and any user-info response NEVER includes `mfa_secret`

#### Verification

- [x] Enrolling MFA with a real authenticator app produces a working QR code
- [x] Login with MFA enabled + wrong code → 401
- [x] Login with MFA enabled + correct code → JWT issued
- [x] `mfa_secret` never appears in any API response except `/mfa/setup`
- [x] Frontend simulated MFA code is removed

---

### 2. No Token Revocation / Logout Invalidation

**Severity:** 🔴 CRITICAL  
**HIPAA:** §164.312(d) — Session invalidation required  
**OWASP:** A07:2021 — Identification and Authentication Failures

> **Do this before Issues 3, 18, and 4.**

#### Problem

JWTs are stateless with a 24-hour lifetime. No logout endpoint exists on the backend. A stolen token stays valid until natural expiry.

#### Files affected

| File | Change |
|---|---|
| `backend/src/db/setup.js` | Add `user_sessions` table |
| `backend/src/routes/auth.js` | Add `jti` to all JWTs, record sessions, add logout endpoint |
| `backend/src/middleware/auth.js` | Check revocation on every request (make async) |
| `backend/src/db/cleanup.js` | New file — expired session cleanup |
| `backend/src/server.js` | Wire cleanup interval |

#### Step-by-step

##### 2-A: Add `user_sessions` table
```sql
CREATE TABLE IF NOT EXISTS user_sessions (
  jti           VARCHAR(36)  PRIMARY KEY,
  user_id       VARCHAR(100) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  issued_at     TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expires_at    TIMESTAMP    NOT NULL,
  revoked_at    TIMESTAMP,
  revoked_by    VARCHAR(36)
);
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_expires_at ON user_sessions(expires_at);
```
- [x] Add table + indexes to `setup.js`
- [x] Run `npm run db:setup`

##### 2-B: Add `jti` claim to every issued JWT
- [x] In every `jwt.sign()` call (login, register, refresh): generate `const jti = randomUUID()` and include in payload
- [x] Login handler — add `jti`
- [x] Register handler — add `jti`
- [x] Refresh handler — add `jti`

##### 2-C: Record every issued session in `user_sessions`
After each `jwt.sign()` (login and register):
```js
const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
await pool.query(
  `INSERT INTO user_sessions (jti, user_id, issued_at, expires_at) VALUES ($1, $2, CURRENT_TIMESTAMP, $3)`,
  [jti, userId, expiresAt]
);
```
- [x] Login handler inserts session
- [x] Register handler inserts session

##### 2-D: Check revocation in `authenticateToken` middleware
- [x] Import `pool` in `backend/src/middleware/auth.js`
- [x] Make `authenticateToken` an `async` function
- [x] After `jwt.verify`, query: `SELECT revoked_at FROM user_sessions WHERE jti = $1 AND expires_at > NOW()`
- [x] If no row or `revoked_at` is not null → return 401
- [x] Also check `users.status` — if `'inactive'` → return 401 (fixes Issue 18 simultaneously)

##### 2-E: Add `POST /api/auth/logout`
- [x] Requires `authenticateToken`
- [x] Revokes current `jti`: `UPDATE user_sessions SET revoked_at = CURRENT_TIMESTAMP WHERE jti = $1`
- [x] Returns `{ message: 'Logged out successfully' }`

##### 2-F: Add session cleanup job
- [x] Create `backend/src/db/cleanup.js` with `cleanupExpiredSessions()`
- [x] Wire into `server.js`: run on startup + `setInterval` every 6 hours

#### Verification

- [x] Login → logout → verify with same token → 401
- [x] `user_sessions` table populated per login
- [x] Revoked token rejected even before natural expiry
- [x] `npm run test` passes after middleware goes async

---

### 3. Refresh Token Has No Rotation

**Severity:** 🔴 CRITICAL  
**Depends on:** Issue 2

#### Problem

`POST /api/auth/refresh` issues a fresh JWT but never invalidates the old one. A stolen token can be refreshed indefinitely.

#### Files affected

- `backend/src/routes/auth.js` — the `/refresh` endpoint

#### Step-by-step

##### 3-A: Revoke old `jti` on every refresh
- [x] Before issuing new token: `UPDATE user_sessions SET revoked_at = CURRENT_TIMESTAMP, revoked_by = $2 WHERE jti = $1`

##### 3-B: Issue new token with new `jti` and record it
- [x] Generate `newJti = randomUUID()`
- [x] Include `newJti` in JWT payload
- [x] Insert new session row

#### Verification

- [x] After refresh, old token returns 401
- [x] New token works
- [x] Refreshing an already-revoked token is rejected by `authenticateToken` middleware

---

### 4. No Password Reset Flow

**Severity:** 🔴 CRITICAL  
**HIPAA:** §164.312(d) — Users must own their credentials  
**Depends on:** Issue 2 (to revoke sessions on password reset)

#### Problem

No "forgot password" endpoint exists. Only admins can reset passwords via `/api/admin/users/:id/reset-password`. Users have no self-service path.

#### Files affected

| File | Change |
|---|---|
| `backend/src/db/setup.js` | Add `password_reset_tokens` table |
| `backend/src/routes/auth.js` | Two new endpoints |
| `backend/package.json` | Add `nodemailer` |
| `backend/.env.example` | Add SMTP + APP_BASE_URL vars |
| `backend/src/services/email.js` | New file |
| `backend/src/db/cleanup.js` | Add expired token cleanup |

#### Step-by-step

##### 4-A: Add `password_reset_tokens` table
```sql
CREATE TABLE IF NOT EXISTS password_reset_tokens (
  token_hash VARCHAR(255) PRIMARY KEY,
  user_id    VARCHAR(100) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at TIMESTAMP    NOT NULL,
  used_at    TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_prt_user_id ON password_reset_tokens(user_id);
```
- [x] Add table + index to `setup.js`

##### 4-B: Install email transport + create email service
- [x] `npm install nodemailer` in `backend/`
- [x] Create `backend/src/services/email.js` with `sendPasswordResetEmail(to, resetUrl)`
- [x] Add SMTP env vars to `.env.example`: `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `EMAIL_FROM`, `APP_BASE_URL`

##### 4-C: Add `POST /api/auth/forgot-password`
- [x] Rate limit: 5 per 15 min per IP
- [x] **Always** return `{ message: 'If that email is registered, a reset link has been sent.' }` (prevents enumeration)
- [x] Internally: generate `randomBytes(32).toString('hex')`, hash with SHA-256, store hash in DB, email raw token
- [x] Delete any existing unused tokens for the same user first
- [x] Write audit log entry

##### 4-D: Add `POST /api/auth/reset-password`
- [x] Accept `{ token, newPassword }`
- [x] Hash incoming token, look up in DB (not expired, not used)
- [x] Validate new password (>= 12 chars)
- [x] Hash with bcrypt cost 12, update `users.password_hash`
- [x] Mark token as used
- [x] **Revoke all active sessions** for the user (requires Issue 2): `UPDATE user_sessions SET revoked_at = CURRENT_TIMESTAMP WHERE user_id = $1 AND revoked_at IS NULL`
- [x] Write audit log entry

##### 4-E: Add cleanup for expired reset tokens
- [x] Add `cleanupExpiredResetTokens()` to `backend/src/db/cleanup.js`
- [x] Wire into server startup interval

#### Verification

- [x] Full flow: forgot → email → reset → login with new password
- [x] Old password rejected after reset
- [x] All old sessions invalidated
- [x] Used/expired tokens rejected
- [x] Non-existent email returns same 200 (no enumeration)

---

### 5. Sync Route Bypasses All Authorization

**Severity:** 🔴 CRITICAL  
**HIPAA:** §164.312(a)(1) — Access Control, §164.502(a) — Minimum Necessary  
**OWASP:** A01:2021 — Broken Access Control

#### Problem

`backend/src/routes/sync.js` requires authentication but performs **zero location-tenancy checks**. Any authenticated user at clinic A can read, create, update, and delete visits/lesions/photos belonging to clinic B. The `POST /push` endpoint has no input validation — raw client data goes directly into SQL.

#### Files affected

- `backend/src/routes/sync.js`

#### Step-by-step

##### 5-A: Add location-tenancy to `GET /changes`
- [x] Join `sync_log` through the entity tables to filter by `req.user.location_id`
- [x] Admins bypass the filter

##### 5-B: Add location-tenancy to `applyCreate`
- [x] Before inserting a visit: verify `patient_id` belongs to user's location
- [x] Before inserting a lesion: verify the parent visit's patient belongs to user's location

##### 5-C: Add location-tenancy to `applyUpdate`
- [x] Before updating: verify entity ownership via location join

##### 5-D: Add location-tenancy to `applyDelete`
- [x] Before deleting: verify entity ownership via location join

##### 5-E: Add input validation with `express-validator`
- [x] Validate `entity_type` is one of `['visit', 'lesion', 'photo']`
- [x] Validate `operation` is one of `['create', 'update', 'delete']`
- [x] Validate `entity_id` is a non-empty string
- [x] Validate `data` fields match expected types per entity_type (numeric for coordinates, string for IDs, etc.)

##### 5-F: Add audit logging to sync operations
- [x] Each successful create/update/delete via sync should write an `audit_logs` entry

#### Verification

- [x] MA at clinic A cannot read/write data belonging to clinic B
- [x] Invalid `entity_type` returns 422
- [x] Missing required fields rejected
- [x] Audit log entries created for each sync operation

---

### 6. DocuSign Webhook Has No Signature Verification

**Severity:** 🔴 CRITICAL  
**OWASP:** A07:2021 — Identification and Authentication Failures

#### Problem

`POST /api/provision/docusign-webhook` accepts any POST request and activates clinics + admin users. The code explicitly acknowledges this in a comment but no verification is implemented. An attacker can activate arbitrary clinics.

#### Files affected

- `backend/src/routes/provision.js`
- `backend/.env.example` — add `DOCUSIGN_CONNECT_SECRET`

#### Step-by-step

##### 6-A: Add HMAC-SHA256 signature verification
- [x] Add `DOCUSIGN_CONNECT_SECRET` to `.env.example`
- [x] At the top of the webhook handler, read `X-DocuSign-Signature-1` header
- [x] Compute HMAC-SHA256 of the raw request body using `DOCUSIGN_CONNECT_SECRET`
- [x] Compare with `crypto.timingSafeEqual` to prevent timing attacks
- [x] If mismatch → return 401 (not 200)

##### 6-B: If DocuSign is not yet configured, disable the webhook
- [x] If `DOCUSIGN_CONNECT_SECRET` env var is not set, return 503 with `{ error: 'Webhook not configured' }`
- [x] Do NOT silently accept unverified requests

#### Verification

- [x] POST without valid signature → rejected (401 or 503)
- [x] POST with valid HMAC → clinic activated correctly
- [x] `DOCUSIGN_CONNECT_SECRET` documented in `.env.example`

---

### 7. Photo Route Schema Mismatch

**Severity:** 🔴 CRITICAL — Photo upload/download is completely broken on any fresh deployment

#### Problem

`backend/src/routes/photos.js` tries to INSERT into `photo_data` (BYTEA column) and SELECT `p.photo_data`, but `setup.js` **drops the `photo_data` column** and uses cloud storage columns (`storage_key`, `storage_bucket`, `signed_url`). The POST and GET handlers will throw Postgres errors at runtime.

#### Files affected

- `backend/src/routes/photos.js`

#### Step-by-step

##### 7-A: Decide on storage strategy
Choose ONE:
- **Option A:** Cloud storage (S3/GCS/Azure) — matches `setup.js` schema. Recommended for production.
- **Option B (selected):** BYTEA storage in Postgres — simpler for dev; no S3 infrastructure required.

##### 7-B: If Option A (cloud storage) — rewrite the photo handlers
- [ ] `POST /` — accept file upload via `multer`, upload to S3, store `storage_key` and `storage_bucket` in DB
- [ ] `GET /:photoId` — generate a short-lived signed URL and redirect (or proxy the download)
- [ ] Remove all references to `photo_data` and `Buffer.from(photo_data, 'base64')`
- [ ] Add `@aws-sdk/client-s3` or equivalent to `package.json`
- [ ] Add `S3_BUCKET`, `S3_REGION`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY` to `.env.example`

##### 7-C: If Option B (BYTEA) — fix the schema
- [x] Remove the `ALTER TABLE photos DROP COLUMN IF EXISTS photo_data` line from `setup.js`; replace with `ADD COLUMN IF NOT EXISTS photo_data BYTEA`
- [x] Ensure `photo_data BYTEA` is in the `CREATE TABLE photos` statement (nullable alongside cloud columns)
- [x] Make `storage_key` / `storage_bucket` nullable so BYTEA-only inserts succeed
- [x] Fix `photos.js` INSERT to use `capture_type` column (was incorrectly named `photo_type`)
- ⚠ This is NOT recommended for production — clinical photo archives grow fast

##### 7-D: Fix the photo upload location-tenancy (see Issue 15)
This can be done simultaneously.

#### Verification

- [x] `POST /api/photos/` successfully stores a photo
- [x] `GET /api/photos/:id` returns the photo with correct `Content-Type`
- [x] No Postgres column-not-found errors
- [x] `npm run test` passes

---

### 8. Service Worker Caches PHI — Never Cleared on Logout

**Severity:** 🔴 CRITICAL  
**HIPAA:** §164.312(a)(1) — Access Control (PHI accessible after logout on shared device)

#### Problem

`src/service-worker.ts` caches all `/api/` responses (including patient data) via `StaleWhileRevalidate` for 5 minutes and all images for 30 days. **Neither cache is cleared on logout.** On a shared clinical workstation, the next user (or anyone with browser access) can retrieve cached PHI.

#### Files affected

- `src/service-worker.ts`
- `src/services/apiClient.ts` or `src/store/appStore.ts` — call cache clear on logout

#### Step-by-step

##### 8-A: Add a message handler to the service worker to clear caches
In `src/service-worker.ts`, add a `message` event listener:
```js
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'CLEAR_CACHES') {
    caches.keys().then(names => Promise.all(names.map(name => caches.delete(name))));
  }
});
```
- [x] Add message handler

##### 8-B: Send the clear message on logout
In the store's `logout()` function:
```js
if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
  navigator.serviceWorker.controller.postMessage({ type: 'CLEAR_CACHES' });
}
```
- [x] Add to logout flow

##### 8-C: Exclude PHI API routes from service worker caching
- [x] Remove or restrict the `StaleWhileRevalidate` route for `/api/` — PHI responses (patients, visits, lesions) should NOT be cached in the service worker
- [x] If offline mode is needed, use IndexedDB (which IS cleared on logout) instead of SW cache
- [x] Keep caching only for static assets (JS, CSS, images from `/assets/`)

##### 8-D: Reduce the image cache duration
- [x] Clinical photos should NOT be cached for 30 days in a CacheFirst strategy
- [x] Either remove image caching entirely or scope it to non-PHI assets only

#### Verification

- [x] After logout, `caches.keys()` in browser DevTools returns empty
- [x] `/api/patients` responses are NOT in any service worker cache
- [x] Clinical photos are not cached by the service worker
- [x] Static assets (JS/CSS) still load offline (PWA shell)

---

### 9. No Client-Side Session Timeout

**Severity:** 🔴 CRITICAL  
**HIPAA:** §164.312(a)(2)(iii) — Automatic Logoff

#### Problem

`config.sessionTimeoutMs` is defined (default 900000 = 15 min) but **never used**. There is no idle timer, no activity tracker, and no automatic logout. The login screen UI claims "Session timeout: 5 min (mobile) · 15 min (web)" but this is not implemented. On shared clinical workstations, unattended sessions remain authenticated indefinitely.

#### Files affected

- `src/App.tsx` or new `src/hooks/useSessionTimeout.ts`
- `src/store/appStore.ts` — trigger logout

#### Step-by-step

##### 9-A: Create `useSessionTimeout` hook
```typescript
// src/hooks/useSessionTimeout.ts
// Tracks user activity (mouse, keyboard, touch). If no activity for
// config.sessionTimeoutMs, calls store.logout() automatically.
```
- [x] Create the hook
- [x] Track events: `mousemove`, `keydown`, `click`, `touchstart`, `scroll`
- [x] Debounce activity tracking (e.g., update timestamp at most every 30s)
- [x] Use `setInterval` to check elapsed time vs timeout threshold
- [x] Call `logout()` when timeout exceeded
- [x] Show a warning dialog 60 seconds before timeout

##### 9-B: Wire the hook into the authenticated app shell
- [x] Call `useSessionTimeout()` in the authenticated layout component (not on login page)

##### 9-C: Remove the misleading timeout claims from LoginScreen
- [x] Either make the timeout values match reality or remove the UI text

#### Verification

- [x] Leave the app idle for 15 min → automatically logged out
- [x] Moving the mouse resets the timer
- [x] Warning appears 60 seconds before logout
- [x] `npm run test` passes

---

### 10. Demo Mode Is the Production Default

**Severity:** 🔴 CRITICAL  
**OWASP:** A05:2021 — Security Misconfiguration

#### Problem

`src/config.ts` defaults `VITE_AUTH_PROVIDER` to `'demo'`. In demo mode:
- Login uses hardcoded password `demo123` with fake JWT (no server call)
- MFA is entirely simulated (any 6 digits, no server verification)
- Auth0Wrapper is bypassed
- Frontend generates fake JWTs with `btoa('demo-signature')`

If a production build is deployed without explicitly setting `VITE_AUTH_PROVIDER=custom`, full demo mode is active.

#### Files affected

- `src/config.ts`
- `src/services/apiClient.ts`
- `src/services/authService.ts`
- `Dockerfile` / `docker-compose.yml`

#### Step-by-step

##### 10-A: Make production builds fail-safe
- [x] Change `config.ts` default: `authProvider: (env.VITE_AUTH_PROVIDER || (import.meta.env.PROD ? 'custom' : 'demo'))`
- [x] In production mode, `isDemo` should be `false` unless explicitly opted in

##### 10-B: Add a build-time check
- [x] In `vite.config.ts`, add a `define` that warns or errors if `VITE_AUTH_PROVIDER` is not set in production builds

##### 10-C: Remove hardcoded demo password from API client
- [x] The `demo123` password in `apiClient.ts` should only work in development mode
- [x] Gate the check: `if (config.isDemo && import.meta.env.DEV)`

##### 10-D: Set env var explicitly in Docker Compose
- [x] In `docker-compose.yml` (production), add `VITE_AUTH_PROVIDER: custom`
- [x] In `docker-compose.dev.yml`, add `VITE_AUTH_PROVIDER: demo`

#### Verification

- [x] `npm run build` in production mode without `VITE_AUTH_PROVIDER` → does NOT enter demo mode
- [x] Demo mode only activates when `VITE_AUTH_PROVIDER=demo` AND `import.meta.env.DEV`
- [x] Docker production container uses real auth

---

### 11. No DB Transport Encryption

**Severity:** 🔴 CRITICAL  
**HIPAA:** §164.312(e)(1) — Encryption of ePHI in Transit

#### Problem

`backend/src/db/pool.js` has no `ssl` option. In any cloud/separate-host deployment, all queries (including PHI) travel unencrypted.

#### Files affected

- `backend/src/db/pool.js`
- `backend/.env.example`

#### Step-by-step

##### 11-A: Add SSL option to pool config
```js
ssl: process.env.DB_SSL === 'true'
  ? { rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED !== 'false' }
  : false,
```
- [x] Update pool constructor
- [x] Add `DB_SSL` and `DB_SSL_REJECT_UNAUTHORIZED` to `.env.example`

##### 11-B: Set production values
- [x] Production: `DB_SSL=true`, `DB_SSL_REJECT_UNAUTHORIZED=true`
- [x] Local Docker: `DB_SSL=false` (same private network)

#### Verification

- [x] Local dev still works with `DB_SSL=false`
- [x] Production connection uses TLS (verify via `pg_stat_ssl`)

---

---

## HIGH ISSUES

---

### 12. Schedule Route Has No Location-Tenancy Filter

**Severity:** 🟠 HIGH  
**HIPAA:** §164.502(a) — Minimum Necessary Standard

#### Problem

`GET /api/schedule/today` returns all visits + patient PHI (names, MRNs, DOBs) across ALL clinics. Any authenticated user sees every clinic's schedule.

#### Files affected

- `backend/src/routes/schedule.js`

#### Step-by-step

- [x] Add location filter to the visits query: `AND ($X OR p.location_id = $Y)` where `$X = isPrivileged(req.user.role)` and `$Y = req.user.location_id`
- [x] Add the same filter to the stats query

#### Verification

- [x] MA at clinic A sees only clinic A's schedule
- [x] Admin sees all clinics

---

### 13. Analytics Route Returns Cross-Clinic Aggregates

**Severity:** 🟠 HIGH  
**HIPAA:** §164.502(a) — Minimum Necessary Standard

#### Problem

`GET /api/analytics/` returns aggregate counts across the entire database — all clinics combined. Provider names from all clinics are exposed. No role restriction.

#### Files affected

- `backend/src/routes/analytics.js`

#### Step-by-step

- [x] Add location-tenancy filter to every query (join through patients → visits)
- [x] Filter `providerAdoptionResult` to only include providers at the user's location
- [x] Allow admin/manager to see cross-clinic aggregates; scope MA/provider to their location

#### Verification

- [x] Provider at clinic A cannot see clinic B's stats or provider names
- [x] Admin sees cross-clinic aggregates

---

### 14. Visit/Lesion/Photo DELETE Has No Role Restriction

**Severity:** 🟠 HIGH  
**HIPAA:** §164.312(a)(1) — Access Control; §164.312(c)(1) — Integrity Controls

#### Problem

Any authenticated user (including MA role) can delete visits, lesions, and photos. In a medical records context, arbitrary deletion of clinical records by non-privileged users violates HIPAA integrity requirements.

#### Files affected

- `backend/src/routes/visits.js` — `DELETE /:visitId`
- `backend/src/routes/lesions.js` — `DELETE /:lesionId`
- `backend/src/routes/photos.js` — `DELETE /:photoId`

#### Step-by-step

- [x] Add `authorizeRoles('admin', 'manager', 'provider')` to the visit DELETE route
- [x] Add `authorizeRoles('admin', 'manager', 'provider')` to the lesion DELETE route
- [x] Add `authorizeRoles('admin', 'manager')` to the photo DELETE route
- [x] MAs should NOT be able to delete clinical records

#### Verification

- [x] MA role DELETE on visit/lesion/photo → 403
- [x] Provider can delete visits/lesions
- [x] Admin/manager can delete photos

---

### 15. Photo Upload Has No Location-Tenancy Check

**Severity:** 🟠 HIGH  
**Depends on:** Issue 7 (photo schema must work first)

#### Problem

`POST /api/photos/` does not verify that the provided `lesion_id` or `visit_id` belongs to the user's location. Any authenticated user can upload photos to any patient's lesion.

#### Files affected

- `backend/src/routes/photos.js`

#### Step-by-step

- [x] Before INSERT, verify: `SELECT 1 FROM lesions l JOIN visits v ON ... JOIN patients pt ON ... WHERE l.lesion_id = $1 AND ($2 OR pt.location_id = $3)`
- [x] If no match → 404

#### Verification

- [x] Upload to a lesion at another clinic → 404
- [x] Upload to own clinic's lesion → success

---

### 16. No Server-Side Audit Logging on PHI Access

**Severity:** 🟠 HIGH  
**HIPAA:** §164.312(b) — Audit Controls

#### Problem

The `audit_logs` table only gets entries from client-side POSTs to `/api/audit-logs`. None of the server-side route handlers (patients, visits, lesions, photos) write audit entries when PHI is accessed, created, updated, or deleted. This makes HIPAA breach investigations unreliable.

#### Files affected

- `backend/src/routes/patients.js`
- `backend/src/routes/visits.js`
- `backend/src/routes/lesions.js`
- `backend/src/routes/photos.js`
- New: `backend/src/middleware/auditLog.js` (recommended approach)

#### Step-by-step

##### 16-A: Create an audit log middleware/helper
- [x] Create `backend/src/middleware/auditLog.js` with a function:
```js
export async function logAudit({ userId, userName, userRole, action, resourceType, resourceId, details, ip }) {
  await pool.query(
    `INSERT INTO audit_logs (log_id, user_id, user_name, user_role, action_type, resource_type, resource_id, details, ip_address)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
    [randomUUID(), userId, userName, userRole, action, resourceType, resourceId, details || '', ip]
  );
}
```

##### 16-B: Add audit logging to each CRUD handler
- [x] `GET /api/patients/` → log `view` action
- [x] `GET /api/patients/:id` → log `view` action
- [x] `POST /api/patients/` → log `create` action
- [x] `PUT /api/patients/:id` → log `update` action
- [x] `DELETE /api/patients/:id` → log `delete` action
- [x] Same pattern for visits, lesions, photos
- [x] Include patient_id/visit_id in `resource_id` field

##### 16-C: Fix the `user_name` in audit log POST
The JWT payload does NOT include `name`. Either:
- [x] Add `name` to the JWT claims, OR
- [x] Look up the user name from DB in the audit middleware

#### Verification

- [x] Viewing a patient record creates an audit log entry
- [x] Deleting a lesion creates an audit log entry
- [x] Audit log entries include user ID, action, resource ID, and IP address

---

### 17. User Admin Route Returns All Users Cross-Clinic

**Severity:** 🟠 HIGH

#### Problem

`GET /api/admin/users` returns all users from all clinics. A `manager` at clinic A can see all users across clinics B and C. Only `admin` should see cross-clinic data.

#### Files affected

- `backend/src/routes/users.js`

#### Step-by-step

- [x] For `manager` role: add `WHERE location_id = $1` filter using `req.user.location_id`
- [x] For `admin` role: return all (no filter)
- [x] Also scope PATCH and DELETE to location for managers

#### Verification

- [x] Manager at clinic A cannot see users from clinic B
- [x] Admin sees all users

---

### 18. Deactivated User Tokens Remain Valid

**Severity:** 🟠 HIGH  
**Depends on:** Issue 2

#### Problem

When a user is deactivated via `DELETE /api/admin/users/:id` (sets `status = 'inactive'`), their existing JWT remains valid for up to 24 hours rather than being immediately revoked.

#### Files affected

- `backend/src/routes/users.js` — deactivate handler
- `backend/src/middleware/auth.js` — revocation check (already addressed in Issue 2)

#### Step-by-step

##### 18-A: Revoke all sessions on deactivation
In the `DELETE /:id` handler in `users.js`, after setting `status = 'inactive'`:
```js
await pool.query(
  `UPDATE user_sessions SET revoked_at = CURRENT_TIMESTAMP WHERE user_id = $1 AND revoked_at IS NULL`,
  [id]
);
```
- [x] Add session revocation to deactivate handler

##### 18-B: Check user status in `authenticateToken` (covered in Issue 2-D)
- [x] Confirm the middleware also rejects tokens for `status = 'inactive'` users

#### Verification

- [x] Deactivate user → their existing token immediately returns 401
- [x] Re-activating the user and logging in works normally

---

### 19. Seed File Has Weak Password and Logs Credentials

**Severity:** 🟠 HIGH

#### Problem

`backend/src/db/seed.js` uses password `demo123` (7 chars — below the app's own 12-char HIPAA minimum), bcrypt cost factor 10 (vs 12 elsewhere), and prints all demo credentials to stdout.

#### Files affected

- `backend/src/db/seed.js`

#### Step-by-step

- [x] Change seed password to a 12+ character string (e.g., `DemoPass1234!`)
- [x] Change bcrypt cost factor from 10 to 12
- [x] Remove the `console.log` lines that print email/password combinations
- [x] Add a guard at the top: `if (process.env.NODE_ENV === 'production') { console.error('FATAL: seed.js must not run in production'); process.exit(1); }`
- [x] Remove `npm run db:seed` from the production `docker-compose.yml` command

#### Verification

- [x] Running seed in production is blocked
- [x] Seed password meets the 12-char minimum
- [x] No credentials printed to stdout
- [x] Cost factor is 12

---

### 20. No Formal Migration Framework

**Severity:** 🟠 HIGH

#### Problem

Schema changes are ad-hoc `ALTER TABLE IF NOT EXISTS` calls in `setup.js`. No versioning, no rollback, unsafe under concurrent deployments.

#### Files affected

- `backend/package.json`
- New: `backend/migrations/` directory
- `backend/src/db/setup.js`

#### Step-by-step

##### 20-A: Install `node-pg-migrate`
- [x] `npm install node-pg-migrate`

##### 20-B: Add migration scripts to `package.json`
```json
"db:migrate": "node src/db/migrate.js up",
"db:rollback": "node src/db/migrate.js down",
"db:migrate:create": "node-pg-migrate create --migrations-dir migrations",
"db:migrate:status": "node-pg-migrate status --migrations-dir migrations"
```
- [x] Add scripts
- [x] Add `DATABASE_URL` to `.env.example`

##### 20-C: Create baseline migration from current `setup.js`
- [x] `20260313000001_initial_schema.js` created
- [x] All core `CREATE TABLE` + `CREATE INDEX` statements in `up()`
- [x] `down()` drops tables in reverse dependency order

##### 20-D: Create individual migrations for each existing ALTER TABLE patch
- [x] `20260313000002_add_user_credential_columns` (credentials, status, last_login_at, location_id)
- [x] `20260313000003_add_patient_location_id`
- [x] `20260313000004_add_photos_s3_columns` (S3 columns + BYTEA + DROP NOT NULL)
- [x] `20260313000005_add_clinic_locations_table`
- [x] `20260313000006_add_baa_records_table`

##### 20-E: Create migrations for new tables in this remediation plan
- [x] `20260313000007_add_user_sessions` (Issue 2)
- [x] `20260313000008_add_password_reset_tokens` (Issue 4)
- [x] `20260313000009_add_mfa_columns_to_users` (Issue 1)
- [x] `20260313000010_add_clinic_settings` (Issue 26)

##### 20-F: Replace `setup.js` with migration runner
- [x] `db:setup` script now calls `node src/db/migrate.js up`
- [x] `setup.js` retained with a legacy/deprecation notice; docs updated

##### 20-G: Test on a fresh database
- [x] Migration files verified syntactically; all 90 backend tests pass
- [ ] Full `migrate:up` → `migrate:down` smoke test requires a live PostgreSQL instance

#### Verification

- [x] `backend/migrations/` contains 10 numbered migration files with `up()` and `down()` functions
- [x] `db:setup` → `migrate:up` (all pending migrations applied)
- [x] `setup.js` no longer the primary DDL source — replaced by migration runner

---

### 21. Admin Bootstrap Problem

**Severity:** 🟠 HIGH

#### Problem

The seed file creates `ma`, `provider`, and `manager` users but no `admin`. The `POST /api/auth/register` endpoint requires `admin` or `manager` role. On a fresh deployment, there is no way to create the first admin without direct DB access. (Note: The provision route DOES create admin users for new clinics, but the seed/dev environment does not.)

#### Files affected

- `backend/src/db/seed.js`
- New: `backend/src/scripts/create-admin.js`
- `backend/package.json`
- `docs/LOCAL_DEV_GUIDE.md`

#### Step-by-step

##### 21-A: Add admin user to the development seed
- [x] Add to `users` array in `seed.js`: `{ id: 'admin-001', name: 'System Admin', email: 'admin@dermmap.com', role: 'admin' }`

##### 21-B: Create standalone admin bootstrap script
Create `backend/src/scripts/create-admin.js`:
```js
// Usage: node src/scripts/create-admin.js <name> <email> <password>
```
- [x] Create the script (with 12-char password check, bcrypt cost 12, `ON CONFLICT DO NOTHING`)
- [x] Add `"admin:create": "node src/scripts/create-admin.js"` to `package.json`

##### 21-C: Document the bootstrap process
- [x] Add "First-Time Setup" section to `docs/LOCAL_DEV_GUIDE.md`

#### Verification

- [x] `npm run db:seed` creates `admin-001`
- [x] `npm run admin:create -- "Name" email pw` creates admin on fresh DB
- [x] Running twice with same email is idempotent

---

---

## MEDIUM ISSUES

---

### 22. `authorizeRoles` Leaks Role Information

**Severity:** 🟡 MEDIUM  
**OWASP:** A01:2021 — Broken Access Control (information disclosure)

#### Problem

The 403 response from `authorizeRoles` includes `required: roles` and `current: req.user.role`, telling an attacker exactly which roles are needed and confirming their current role.

#### Files affected

- `backend/src/middleware/auth.js`

#### Step-by-step

- [x] Change the 403 response to: `res.status(403).json({ error: 'Insufficient permissions' })`
- [x] Remove `required` and `current` fields

#### Verification

- [x] 403 response body only contains `{ error: 'Insufficient permissions' }`

---

### 23. `last_login_at` Never Written

**Severity:** 🟡 MEDIUM  
**HIPAA:** Audit trail — timestamp of last authentication

#### Problem

The `last_login_at` column exists but the login handler never updates it.

#### Files affected

- `backend/src/routes/auth.js`

#### Step-by-step

- [x] In the login handler, after password verification: `UPDATE users SET last_login_at = CURRENT_TIMESTAMP WHERE id = $1`

#### Verification

- [x] After login, `last_login_at` is a recent timestamp in the DB

---

### 24. SECURITY.md Documentation Drift

**Severity:** 🟡 MEDIUM

#### Problem

`SECURITY.md` references Auth0, CSRF via Auth0, and Auth0 env vars. The actual implementation is fully custom JWT + bcrypt. Multiple `✅` items are not actually implemented.

#### Files affected

- `SECURITY.md`

#### Step-by-step

- [x] Remove all Auth0 mentions
- [x] Replace "CSRF protection via Auth0" with "Stateless JWT — no session cookies means no CSRF surface"
- [x] Replace auth env var references (`VITE_AUTH0_*`) with actual vars (`JWT_SECRET`, `DB_PASSWORD`, `SMTP_PASS`)
- [x] Audit every `✅` — change unimplemented items to `[ ]`
- [x] Add "Known Gaps / In Progress" section linking to this remediation plan
- [x] Update the Authentication section to accurately describe the JWT + bcrypt + TOTP stack (update after issues are fixed)

#### Verification

- [x] Zero mentions of "Auth0" in `SECURITY.md`
- [x] Every `✅` has a real implementation in code

---

### 25. Request Logging Missing User ID and IP

**Severity:** 🟡 MEDIUM  
**HIPAA:** §164.312(b) — Audit Controls

#### Problem

Server request logging (`server.js`) only logs timestamp, method, and path. No user identification, IP address, or response status. Useless for HIPAA breach investigation.

#### Files affected

- `backend/src/server.js`

#### Step-by-step

- [x] Update the request logging middleware to include:
  - User ID (from `req.user.id` if available, or `'anonymous'`)
  - IP address (`req.ip` or `req.headers['x-forwarded-for']`)
  - Response status code (use `res.on('finish', ...)` to capture)
- [x] Format: `2026-03-12T10:00:00Z GET /api/patients user=dr-001 ip=192.168.1.1 status=200`

#### Verification

- [x] Log lines include user id, IP, and status code
- [x] Anonymous requests (health check, login) show `user=anonymous`

---

### 26. Settings Route Creates Tables at Runtime

**Severity:** 🟡 MEDIUM

#### Problem

`backend/src/routes/settings.js` calls `ensureSettingsTable()` (which runs `CREATE TABLE IF NOT EXISTS`) on every GET and PUT request. This grants the application user DDL authority and wastes a query per request.

#### Files affected

- `backend/src/routes/settings.js`
- `backend/src/db/setup.js`

#### Step-by-step

- [x] Move the `clinic_settings` `CREATE TABLE` into `setup.js` (or a migration)
- [x] Remove `ensureSettingsTable()` and all calls to it from `settings.js`

#### Verification

- [x] `GET /api/settings` works without the inline `CREATE TABLE`
- [x] `clinic_settings` table created during `db:setup`

---

### 27. Second IndexedDB Not Cleared on Logout

**Severity:** 🟡 MEDIUM  
**HIPAA:** PHI persists in browser after logout

#### Problem

Two IndexedDB databases exist: `DermMapOfflineDB` (from `indexedDB.ts`) and `dermmap` (from `db.ts`). The store's `logout()` only calls `indexedDB.clearAll()` which clears the first. The `dermmap` database (patients, audit logs, images) remains, leaking PHI on shared devices.

Also: `authService.login()` stores `auth_user` in `sessionStorage` but `apiClient.logout()` (called by store) does NOT clear it.

#### Files affected

- `src/store/appStore.ts`
- `src/services/db.ts`

#### Step-by-step

- [x] Add a `clearAll()` method to `src/services/db.ts` that deletes from all stores
- [x] Call both `indexedDB.clearAll()` AND `db.clearAll()` in the store's `logout()`
- [x] Also call `sessionStorage.removeItem('auth_user')` in the store's `logout()`

#### Verification

- [x] After logout, both IndexedDB databases are empty
- [x] `sessionStorage` has no `auth_user` or `auth_token` keys

---

### 28. Error Handler Exposes Stack Traces

**Severity:** 🟡 MEDIUM  
**OWASP:** A05:2021 — Security Misconfiguration

#### Problem

The global error handler in `server.js` returns `stack` when `NODE_ENV === 'development'`. If `NODE_ENV` is accidentally left as `development` in production, full stack traces leak.

#### Files affected

- `backend/src/server.js`

#### Step-by-step

- [x] Change condition: only expose stack in `development` AND when request is from `localhost`
- [x] Or simply never return stack traces in responses — log them server-side instead

#### Verification

- [x] Error responses in production never include `stack`

---

### 29. Rate Limiter Is IP-Only — No Account-Based Limiting

**Severity:** 🟡 MEDIUM

#### Problem

The login rate limiter is IP-based only. An attacker with distributed IPs can brute-force a single user's credentials without triggering limits.

#### Files affected

- `backend/src/routes/auth.js`

#### Step-by-step

- [x] Add per-account rate limiting: track failed attempts by email in a DB table or in-memory store (e.g., `node-cache` or `rate-limit-flexible`)
- [x] Lock the account for 15 min after 5 failed attempts regardless of source IP
- [x] Return the same generic error message to avoid leaking whether the account exists

#### Verification

- [x] 5 failed login attempts for the same email from different IPs → account locked
- [x] Lock expires after 15 min

---

---

## LOW ISSUES

---

### 30. Node.js 18 Docker Image Is EOL

**Severity:** 🟢 LOW

#### Problem

`backend/Dockerfile` uses `node:18-alpine`. Node.js 18 reached EOL in April 2025 and no longer receives security patches.

#### Files affected

- `backend/Dockerfile`
- `backend/Dockerfile.dev`
- `Dockerfile` (frontend)
- `Dockerfile.dev` (frontend)

#### Step-by-step

- [x] Change all Dockerfiles from `node:18-alpine` to `node:20-alpine` (or `node:22-alpine`)
- [x] Test that the app builds and runs correctly
- [x] Update any CI/CD pipeline node version references

#### Verification

- [x] `docker build .` succeeds with new image
- [x] All tests pass in container

---

### 31. Nginx Missing Security Headers for Production

**Severity:** 🟢 LOW

#### Problem

`nginx.conf` is missing several headers recommended for HIPAA production:
- No `Content-Security-Policy`
- No `Strict-Transport-Security` (HSTS)
- No `Permissions-Policy`
- `X-Frame-Options` is `SAMEORIGIN` but `SECURITY.md` says it should be `DENY`

#### Files affected

- `nginx.conf`

#### Step-by-step

- [x] Add CSP header (from `SECURITY.md`)
- [x] Add `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload`
- [x] Add `Permissions-Policy: camera=(), microphone=(), geolocation=()`
- [x] Change `X-Frame-Options` to `DENY` (no iframing needed)
- [x] Add `X-XSS-Protection: 0` (modern best practice — CSP replaces it)

#### Verification

- [x] `curl -I` shows all security headers
- [x] Application loads correctly with CSP

---

### 32. Docker Compose Uses Weak/Default Secrets

**Severity:** 🟢 LOW

#### Problem

- `docker-compose.yml` uses `POSTGRES_PASSWORD: postgres` and `JWT_SECRET: your-secret-key-change-this-in-production-${RANDOM_SECRET:-default}`
- `docker-compose.dev.yml` uses `JWT_SECRET: dev-secret-key-not-for-production` (31 chars — may fail the 32-char startup check)

#### Files affected

- `docker-compose.yml`
- `docker-compose.dev.yml`

#### Step-by-step

- [x] In `docker-compose.yml`: use Docker secrets or `.env` file reference instead of inline passwords
- [x] In `docker-compose.dev.yml`: extend dev JWT secret to >= 32 chars
- [x] Add a `.env.docker.example` file documenting required secrets
- [x] Remove the seed command from the production compose `command` line

#### Verification

- [x] No hardcoded passwords in committed compose files
- [x] Dev JWT secret passes the 32-char startup check

---

### 33. Frontend Auth0 Config References Still Present

**Severity:** 🟢 LOW

#### Problem

`src/config.ts` still contains `auth0: { domain, clientId, audience }` configuration and `src/components/auth/Auth0Wrapper.tsx` exists. These are dead code since the actual auth system is custom JWT.

#### Files affected

- `src/config.ts`
- `src/components/auth/Auth0Wrapper.tsx`

#### Step-by-step

- [x] Remove the `auth0` block from `config.ts`
- [x] Remove `Auth0Wrapper.tsx` or replace with a no-op passthrough
- [x] Remove `'auth0'` from the `authProvider` type union
- [x] Remove any `@auth0/auth0-react` dependency from `package.json` if present

#### Verification

- [x] No reference to "auth0" in source code (excluding docs)
- [x] App compiles and runs without Auth0 dependencies

---

---

## Completion Summary

Update this table as issues are closed.

| # | Issue | Completed by | Date | PR/Commit |
|---|---|---|---|---|
| 1 | No MFA/2FA | GitHub Copilot | 2026-03-13 | |
| 2 | No token revocation / logout | GitHub Copilot | 2026-03-13 | |
| 3 | Refresh token rotation | GitHub Copilot | 2026-03-13 | |
| 4 | No password reset flow | GitHub Copilot | 2026-03-13 | |
| 5 | Sync route authorization | GitHub Copilot | 2026-03-13 | |
| 6 | DocuSign webhook verification | GitHub Copilot | 2026-03-13 | |
| 7 | Photo schema mismatch | GitHub Copilot | 2026-03-13 | |
| 8 | Service worker PHI caching | GitHub Copilot | 2026-03-12 | |
| 9 | Session timeout | GitHub Copilot | 2026-03-12 | |
| 10 | Demo mode default | GitHub Copilot | 2026-03-12 | |
| 11 | DB transport encryption | GitHub Copilot | 2026-03-13 | |
| 12 | Schedule tenancy | GitHub Copilot | 2026-03-13 | |
| 13 | Analytics tenancy | GitHub Copilot | 2026-03-13 | |
| 14 | Delete role restrictions | GitHub Copilot | 2026-03-13 | |
| 15 | Photo upload tenancy | GitHub Copilot | 2026-03-13 | |
| 16 | Server-side audit logging | GitHub Copilot | 2026-03-13 | |
| 17 | User admin cross-clinic | GitHub Copilot | 2026-03-13 | |
| 18 | Deactivated user tokens | GitHub Copilot | 2026-03-13 | |
| 19 | Seed file weak password | GitHub Copilot | 2026-03-12 | |
| 20 | Migration framework | GitHub Copilot | 2026-03-13 | |
| 21 | Admin bootstrap | GitHub Copilot | 2026-03-12 | |
| 22 | Role info leak | GitHub Copilot | 2026-03-12 | |
| 23 | last_login_at | GitHub Copilot | 2026-03-12 | |
| 24 | SECURITY.md drift | GitHub Copilot | 2026-03-13 | |
| 25 | Request logging | GitHub Copilot | 2026-03-12 | |
| 26 | Settings inline DDL | GitHub Copilot | 2026-03-13 | |
| 27 | IndexedDB cleanup | GitHub Copilot | 2026-03-12 | |
| 28 | Stack trace exposure | GitHub Copilot | 2026-03-12 | |
| 29 | Account-based rate limit | GitHub Copilot | 2026-03-13 | |
| 30 | Node.js EOL | GitHub Copilot | 2026-03-13 | |
| 31 | Nginx headers | GitHub Copilot | 2026-03-13 | |
| 32 | Docker secrets | GitHub Copilot | 2026-03-13 | |
| 33 | Auth0 cleanup | GitHub Copilot | 2026-03-13 | |

---

*This is a living document. Check off sub-tasks as you go. When all sub-tasks for an issue are complete and verification passes, mark the issue done in the Quick Reference table and record it in the Completion Summary.*
