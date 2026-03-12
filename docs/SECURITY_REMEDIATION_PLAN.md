# DermMap — Security & Architecture Remediation Plan

**Created:** 2026-03-12  
**Last updated:** 2026-03-12  
**Scope:** Complete security audit — HIPAA gaps, OWASP risks, architecture flaws (backend + frontend + infrastructure)  
**Track status:** Check off each `[ ]` sub-task as completed. Update the Quick Reference status when an issue is fully closed.

---

## Quick Reference — Issue Index

| # | Issue | Severity | Category | Status |
|---|---|---|---|---|
| 1 | [No MFA/2FA](#1-no-mfa--2fa) | 🔴 CRITICAL | Auth | `[ ] Open` |
| 2 | [No token revocation / logout invalidation](#2-no-token-revocation--logout-invalidation) | 🔴 CRITICAL | Auth | `[ ] Open` |
| 3 | [Refresh token has no rotation](#3-refresh-token-has-no-rotation) | 🔴 CRITICAL | Auth | `[ ] Open` |
| 4 | [No password reset flow](#4-no-password-reset-flow) | 🔴 CRITICAL | Auth | `[ ] Open` |
| 5 | [Sync route bypasses all authorization](#5-sync-route-bypasses-all-authorization) | 🔴 CRITICAL | Access Control | `[ ] Open` |
| 6 | [DocuSign webhook has no signature verification](#6-docusign-webhook-has-no-signature-verification) | 🔴 CRITICAL | Auth Bypass | `[ ] Open` |
| 7 | [Photo route schema mismatch — upload/download broken](#7-photo-route-schema-mismatch) | 🔴 CRITICAL | Broken Feature | `[ ] Open` |
| 8 | [Service worker caches PHI — never cleared on logout](#8-service-worker-caches-phi) | 🔴 CRITICAL | Frontend / HIPAA | `[ ] Open` |
| 9 | [No client-side session timeout](#9-no-client-side-session-timeout) | 🔴 CRITICAL | Frontend / HIPAA | `[ ] Open` |
| 10 | [Demo mode is the production default](#10-demo-mode-is-production-default) | 🔴 CRITICAL | Config | `[ ] Open` |
| 11 | [No DB transport encryption](#11-no-db-transport-encryption) | 🔴 CRITICAL | Infrastructure | `[ ] Open` |
| 12 | [Schedule route has no location-tenancy filter](#12-schedule-route-no-location-tenancy) | 🟠 HIGH | Access Control | `[ ] Open` |
| 13 | [Analytics route returns cross-clinic data](#13-analytics-route-cross-clinic-data) | 🟠 HIGH | Access Control | `[ ] Open` |
| 14 | [Visit/lesion/photo DELETE has no role restriction](#14-delete-operations-no-role-restriction) | 🟠 HIGH | Access Control | `[ ] Open` |
| 15 | [Photo upload has no location-tenancy check](#15-photo-upload-no-tenancy-check) | 🟠 HIGH | Access Control | `[ ] Open` |
| 16 | [No server-side audit logging on PHI access](#16-no-server-side-audit-logging) | 🟠 HIGH | HIPAA | `[ ] Open` |
| 17 | [User admin route returns all users cross-clinic](#17-user-admin-cross-clinic-leak) | 🟠 HIGH | Access Control | `[ ] Open` |
| 18 | [Deactivated user tokens remain valid](#18-deactivated-user-tokens-still-valid) | 🟠 HIGH | Auth | `[ ] Open` |
| 19 | [Seed file has weak password and logs credentials](#19-seed-file-weak-password) | 🟠 HIGH | Credentials | `[ ] Open` |
| 20 | [No formal migration framework](#20-no-formal-migration-framework) | 🟠 HIGH | Architecture | `[ ] Open` |
| 21 | [Admin bootstrap problem](#21-admin-bootstrap-problem) | 🟠 HIGH | Architecture | `[ ] Open` |
| 22 | [`authorizeRoles` leaks role information](#22-authorizeroles-leaks-role-info) | 🟡 MEDIUM | Info Disclosure | `[ ] Open` |
| 23 | [`last_login_at` never written](#23-last_login_at-never-written) | 🟡 MEDIUM | HIPAA Audit | `[ ] Open` |
| 24 | [SECURITY.md documentation drift](#24-securitymd-documentation-drift) | 🟡 MEDIUM | Documentation | `[ ] Open` |
| 25 | [Request logging missing user ID and IP](#25-request-logging-incomplete) | 🟡 MEDIUM | HIPAA Audit | `[ ] Open` |
| 26 | [Settings route creates tables at runtime](#26-settings-inline-ddl) | 🟡 MEDIUM | Architecture | `[ ] Open` |
| 27 | [Second IndexedDB not cleared on logout](#27-second-indexeddb-not-cleared) | 🟡 MEDIUM | Frontend / HIPAA | `[ ] Open` |
| 28 | [Error handler exposes stack traces](#28-error-handler-stack-traces) | 🟡 MEDIUM | Info Disclosure | `[ ] Open` |
| 29 | [Rate limiter is IP-only — no account-based limiting](#29-rate-limiter-ip-only) | 🟡 MEDIUM | Auth | `[ ] Open` |
| 30 | [Node.js 18 Docker image is EOL](#30-nodejs-18-eol) | 🟢 LOW | Infrastructure | `[ ] Open` |
| 31 | [Nginx missing security headers for production](#31-nginx-missing-headers) | 🟢 LOW | Infrastructure | `[ ] Open` |
| 32 | [Docker Compose uses weak/default secrets](#32-docker-compose-weak-secrets) | 🟢 LOW | Infrastructure | `[ ] Open` |
| 33 | [Frontend Auth0 config references still present](#33-frontend-auth0-references) | 🟢 LOW | Cleanup | `[ ] Open` |

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

**Phase 1 — Quick wins (do these first, each < 30 min):**
23, 22, 25, 28, 19, 21

**Phase 2 — Critical auth infrastructure:**
2 → 3 → 18 → 1 → 4

**Phase 3 — Access control / authorization:**
5, 12, 13, 14, 15, 17

**Phase 4 — Frontend security:**
9, 8, 27, 10

**Phase 5 — Infrastructure & architecture:**
11, 7, 16, 6, 20, 26

**Phase 6 — Documentation & cleanup:**
24, 30, 31, 32, 33

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
- [ ] Run `npm install otplib qrcode` inside `backend/`

##### 1-B: Add MFA columns to the users table
Add to `backend/src/db/setup.js` (migration line after existing user-column patches):
```sql
ALTER TABLE users ADD COLUMN IF NOT EXISTS mfa_secret VARCHAR(64);
ALTER TABLE users ADD COLUMN IF NOT EXISTS mfa_enabled BOOLEAN NOT NULL DEFAULT FALSE;
```
- [ ] Add the `ALTER TABLE` lines
- [ ] Run `npm run db:setup` and confirm no errors

##### 1-C: Add `POST /api/auth/mfa/setup` endpoint
- [ ] Requires `authenticateToken`
- [ ] Generates TOTP secret via `import { authenticator } from 'otplib'` → `authenticator.generateSecret()`
- [ ] Stores secret in `users.mfa_secret` for the logged-in user (NOT enabled yet)
- [ ] Returns `{ qrCode, secret }` (QR via `qrcode.toDataURL`)

##### 1-D: Add `POST /api/auth/mfa/verify` endpoint (activates MFA)
- [ ] Requires `authenticateToken`
- [ ] Accepts `{ code }`, validates with `authenticator.check(code, secret)`
- [ ] On success: sets `mfa_enabled = TRUE`
- [ ] On failure: returns 400

##### 1-E: Add `POST /api/auth/mfa/disable` endpoint
- [ ] Requires `authenticateToken` + current `password` in body
- [ ] Verifies password via `bcrypt.compare` before disabling

##### 1-F: Modify login to require TOTP when MFA is enabled
In `POST /api/auth/login`:
- [ ] After password verified, check `user.mfa_enabled`
- [ ] If `true` and `totpCode` is absent → return `{ mfaRequired: true }` (HTTP 200, no token)
- [ ] If `true` and `totpCode` is present → validate with `authenticator.check()`
- [ ] If invalid → return 401 (counted by rate limiter)
- [ ] Also fetch `mfa_secret` in the initial user lookup query (add to SELECT)

##### 1-G: Update frontend LoginScreen.tsx
- [ ] Replace the simulated `setTimeout` MFA with a real server call passing `totpCode`
- [ ] When login returns `{ mfaRequired: true }`, show the TOTP input
- [ ] On submit, call login again with `{ email, password, totpCode }`

##### 1-H: Never expose `mfa_secret` in public responses
- [ ] Ensure `/api/auth/verify`, `/api/admin/users`, and any user-info response NEVER includes `mfa_secret`

#### Verification

- [ ] Enrolling MFA with a real authenticator app produces a working QR code
- [ ] Login with MFA enabled + wrong code → 401
- [ ] Login with MFA enabled + correct code → JWT issued
- [ ] `mfa_secret` never appears in any API response except `/mfa/setup`
- [ ] Frontend simulated MFA code is removed

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
- [ ] Add table + indexes to `setup.js`
- [ ] Run `npm run db:setup`

##### 2-B: Add `jti` claim to every issued JWT
- [ ] In every `jwt.sign()` call (login, register, refresh): generate `const jti = randomUUID()` and include in payload
- [ ] Login handler — add `jti`
- [ ] Register handler — add `jti`
- [ ] Refresh handler — add `jti`

##### 2-C: Record every issued session in `user_sessions`
After each `jwt.sign()` (login and register):
```js
const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
await pool.query(
  `INSERT INTO user_sessions (jti, user_id, issued_at, expires_at) VALUES ($1, $2, CURRENT_TIMESTAMP, $3)`,
  [jti, userId, expiresAt]
);
```
- [ ] Login handler inserts session
- [ ] Register handler inserts session

##### 2-D: Check revocation in `authenticateToken` middleware
- [ ] Import `pool` in `backend/src/middleware/auth.js`
- [ ] Make `authenticateToken` an `async` function
- [ ] After `jwt.verify`, query: `SELECT revoked_at FROM user_sessions WHERE jti = $1 AND expires_at > NOW()`
- [ ] If no row or `revoked_at` is not null → return 401
- [ ] Also check `users.status` — if `'inactive'` → return 401 (fixes Issue 18 simultaneously)

##### 2-E: Add `POST /api/auth/logout`
- [ ] Requires `authenticateToken`
- [ ] Revokes current `jti`: `UPDATE user_sessions SET revoked_at = CURRENT_TIMESTAMP WHERE jti = $1`
- [ ] Returns `{ message: 'Logged out successfully' }`

##### 2-F: Add session cleanup job
- [ ] Create `backend/src/db/cleanup.js` with `cleanupExpiredSessions()`
- [ ] Wire into `server.js`: run on startup + `setInterval` every 6 hours

#### Verification

- [ ] Login → logout → verify with same token → 401
- [ ] `user_sessions` table populated per login
- [ ] Revoked token rejected even before natural expiry
- [ ] `npm run test` passes after middleware goes async

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
- [ ] Before issuing new token: `UPDATE user_sessions SET revoked_at = CURRENT_TIMESTAMP, revoked_by = $2 WHERE jti = $1`

##### 3-B: Issue new token with new `jti` and record it
- [ ] Generate `newJti = randomUUID()`
- [ ] Include `newJti` in JWT payload
- [ ] Insert new session row

#### Verification

- [ ] After refresh, old token returns 401
- [ ] New token works
- [ ] Refreshing an already-revoked token is rejected by `authenticateToken` middleware

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
- [ ] Add table + index to `setup.js`

##### 4-B: Install email transport + create email service
- [ ] `npm install nodemailer` in `backend/`
- [ ] Create `backend/src/services/email.js` with `sendPasswordResetEmail(to, resetUrl)`
- [ ] Add SMTP env vars to `.env.example`: `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `EMAIL_FROM`, `APP_BASE_URL`

##### 4-C: Add `POST /api/auth/forgot-password`
- [ ] Rate limit: 5 per 15 min per IP
- [ ] **Always** return `{ message: 'If that email is registered, a reset link has been sent.' }` (prevents enumeration)
- [ ] Internally: generate `randomBytes(32).toString('hex')`, hash with SHA-256, store hash in DB, email raw token
- [ ] Delete any existing unused tokens for the same user first
- [ ] Write audit log entry

##### 4-D: Add `POST /api/auth/reset-password`
- [ ] Accept `{ token, newPassword }`
- [ ] Hash incoming token, look up in DB (not expired, not used)
- [ ] Validate new password (>= 12 chars)
- [ ] Hash with bcrypt cost 12, update `users.password_hash`
- [ ] Mark token as used
- [ ] **Revoke all active sessions** for the user (requires Issue 2): `UPDATE user_sessions SET revoked_at = CURRENT_TIMESTAMP WHERE user_id = $1 AND revoked_at IS NULL`
- [ ] Write audit log entry

##### 4-E: Add cleanup for expired reset tokens
- [ ] Add `cleanupExpiredResetTokens()` to `backend/src/db/cleanup.js`
- [ ] Wire into server startup interval

#### Verification

- [ ] Full flow: forgot → email → reset → login with new password
- [ ] Old password rejected after reset
- [ ] All old sessions invalidated
- [ ] Used/expired tokens rejected
- [ ] Non-existent email returns same 200 (no enumeration)

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
- [ ] Join `sync_log` through the entity tables to filter by `req.user.location_id`
- [ ] Admins bypass the filter

##### 5-B: Add location-tenancy to `applyCreate`
- [ ] Before inserting a visit: verify `patient_id` belongs to user's location
- [ ] Before inserting a lesion: verify the parent visit's patient belongs to user's location

##### 5-C: Add location-tenancy to `applyUpdate`
- [ ] Before updating: verify entity ownership via location join

##### 5-D: Add location-tenancy to `applyDelete`
- [ ] Before deleting: verify entity ownership via location join

##### 5-E: Add input validation with `express-validator`
- [ ] Validate `entity_type` is one of `['visit', 'lesion', 'photo']`
- [ ] Validate `operation` is one of `['create', 'update', 'delete']`
- [ ] Validate `entity_id` is a non-empty string
- [ ] Validate `data` fields match expected types per entity_type (numeric for coordinates, string for IDs, etc.)

##### 5-F: Add audit logging to sync operations
- [ ] Each successful create/update/delete via sync should write an `audit_logs` entry

#### Verification

- [ ] MA at clinic A cannot read/write data belonging to clinic B
- [ ] Invalid `entity_type` returns 422
- [ ] Missing required fields rejected
- [ ] Audit log entries created for each sync operation

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
- [ ] Add `DOCUSIGN_CONNECT_SECRET` to `.env.example`
- [ ] At the top of the webhook handler, read `X-DocuSign-Signature-1` header
- [ ] Compute HMAC-SHA256 of the raw request body using `DOCUSIGN_CONNECT_SECRET`
- [ ] Compare with `crypto.timingSafeEqual` to prevent timing attacks
- [ ] If mismatch → return 401 (not 200)

##### 6-B: If DocuSign is not yet configured, disable the webhook
- [ ] If `DOCUSIGN_CONNECT_SECRET` env var is not set, return 503 with `{ error: 'Webhook not configured' }`
- [ ] Do NOT silently accept unverified requests

#### Verification

- [ ] POST without valid signature → rejected (401 or 503)
- [ ] POST with valid HMAC → clinic activated correctly
- [ ] `DOCUSIGN_CONNECT_SECRET` documented in `.env.example`

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
- **Option B:** BYTEA storage in Postgres — simpler for dev but doesn't scale for clinical photos.

##### 7-B: If Option A (cloud storage) — rewrite the photo handlers
- [ ] `POST /` — accept file upload via `multer`, upload to S3, store `storage_key` and `storage_bucket` in DB
- [ ] `GET /:photoId` — generate a short-lived signed URL and redirect (or proxy the download)
- [ ] Remove all references to `photo_data` and `Buffer.from(photo_data, 'base64')`
- [ ] Add `@aws-sdk/client-s3` or equivalent to `package.json`
- [ ] Add `S3_BUCKET`, `S3_REGION`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY` to `.env.example`

##### 7-C: If Option B (BYTEA) — fix the schema
- [ ] Remove the `ALTER TABLE photos DROP COLUMN IF EXISTS photo_data` line from `setup.js`
- [ ] Ensure `photo_data BYTEA` is in the `CREATE TABLE photos` statement
- [ ] ⚠ This is NOT recommended for production — clinical photo archives grow fast

##### 7-D: Fix the photo upload location-tenancy (see Issue 15)
This can be done simultaneously.

#### Verification

- [ ] `POST /api/photos/` successfully stores a photo
- [ ] `GET /api/photos/:id` returns the photo with correct `Content-Type`
- [ ] No Postgres column-not-found errors
- [ ] `npm run test` passes

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
- [ ] Add message handler

##### 8-B: Send the clear message on logout
In the store's `logout()` function:
```js
if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
  navigator.serviceWorker.controller.postMessage({ type: 'CLEAR_CACHES' });
}
```
- [ ] Add to logout flow

##### 8-C: Exclude PHI API routes from service worker caching
- [ ] Remove or restrict the `StaleWhileRevalidate` route for `/api/` — PHI responses (patients, visits, lesions) should NOT be cached in the service worker
- [ ] If offline mode is needed, use IndexedDB (which IS cleared on logout) instead of SW cache
- [ ] Keep caching only for static assets (JS, CSS, images from `/assets/`)

##### 8-D: Reduce the image cache duration
- [ ] Clinical photos should NOT be cached for 30 days in a CacheFirst strategy
- [ ] Either remove image caching entirely or scope it to non-PHI assets only

#### Verification

- [ ] After logout, `caches.keys()` in browser DevTools returns empty
- [ ] `/api/patients` responses are NOT in any service worker cache
- [ ] Clinical photos are not cached by the service worker
- [ ] Static assets (JS/CSS) still load offline (PWA shell)

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
- [ ] Create the hook
- [ ] Track events: `mousemove`, `keydown`, `click`, `touchstart`, `scroll`
- [ ] Debounce activity tracking (e.g., update timestamp at most every 30s)
- [ ] Use `setInterval` to check elapsed time vs timeout threshold
- [ ] Call `logout()` when timeout exceeded
- [ ] Show a warning dialog 60 seconds before timeout

##### 9-B: Wire the hook into the authenticated app shell
- [ ] Call `useSessionTimeout()` in the authenticated layout component (not on login page)

##### 9-C: Remove the misleading timeout claims from LoginScreen
- [ ] Either make the timeout values match reality or remove the UI text

#### Verification

- [ ] Leave the app idle for 15 min → automatically logged out
- [ ] Moving the mouse resets the timer
- [ ] Warning appears 60 seconds before logout
- [ ] `npm run test` passes

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
- [ ] Change `config.ts` default: `authProvider: (env.VITE_AUTH_PROVIDER || (import.meta.env.PROD ? 'custom' : 'demo'))`
- [ ] In production mode, `isDemo` should be `false` unless explicitly opted in

##### 10-B: Add a build-time check
- [ ] In `vite.config.ts`, add a `define` that warns or errors if `VITE_AUTH_PROVIDER` is not set in production builds

##### 10-C: Remove hardcoded demo password from API client
- [ ] The `demo123` password in `apiClient.ts` should only work in development mode
- [ ] Gate the check: `if (config.isDemo && import.meta.env.DEV)`

##### 10-D: Set env var explicitly in Docker Compose
- [ ] In `docker-compose.yml` (production), add `VITE_AUTH_PROVIDER: custom`
- [ ] In `docker-compose.dev.yml`, add `VITE_AUTH_PROVIDER: demo`

#### Verification

- [ ] `npm run build` in production mode without `VITE_AUTH_PROVIDER` → does NOT enter demo mode
- [ ] Demo mode only activates when `VITE_AUTH_PROVIDER=demo` AND `import.meta.env.DEV`
- [ ] Docker production container uses real auth

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
- [ ] Update pool constructor
- [ ] Add `DB_SSL` and `DB_SSL_REJECT_UNAUTHORIZED` to `.env.example`

##### 11-B: Set production values
- [ ] Production: `DB_SSL=true`, `DB_SSL_REJECT_UNAUTHORIZED=true`
- [ ] Local Docker: `DB_SSL=false` (same private network)

#### Verification

- [ ] Local dev still works with `DB_SSL=false`
- [ ] Production connection uses TLS (verify via `pg_stat_ssl`)

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

- [ ] Add location filter to the visits query: `AND ($X OR p.location_id = $Y)` where `$X = isPrivileged(req.user.role)` and `$Y = req.user.location_id`
- [ ] Add the same filter to the stats query

#### Verification

- [ ] MA at clinic A sees only clinic A's schedule
- [ ] Admin sees all clinics

---

### 13. Analytics Route Returns Cross-Clinic Aggregates

**Severity:** 🟠 HIGH  
**HIPAA:** §164.502(a) — Minimum Necessary Standard

#### Problem

`GET /api/analytics/` returns aggregate counts across the entire database — all clinics combined. Provider names from all clinics are exposed. No role restriction.

#### Files affected

- `backend/src/routes/analytics.js`

#### Step-by-step

- [ ] Add location-tenancy filter to every query (join through patients → visits)
- [ ] Filter `providerAdoptionResult` to only include providers at the user's location
- [ ] Allow admin/manager to see cross-clinic aggregates; scope MA/provider to their location

#### Verification

- [ ] Provider at clinic A cannot see clinic B's stats or provider names
- [ ] Admin sees cross-clinic aggregates

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

- [ ] Add `authorizeRoles('admin', 'manager', 'provider')` to the visit DELETE route
- [ ] Add `authorizeRoles('admin', 'manager', 'provider')` to the lesion DELETE route
- [ ] Add `authorizeRoles('admin', 'manager')` to the photo DELETE route
- [ ] MAs should NOT be able to delete clinical records

#### Verification

- [ ] MA role DELETE on visit/lesion/photo → 403
- [ ] Provider can delete visits/lesions
- [ ] Admin/manager can delete photos

---

### 15. Photo Upload Has No Location-Tenancy Check

**Severity:** 🟠 HIGH  
**Depends on:** Issue 7 (photo schema must work first)

#### Problem

`POST /api/photos/` does not verify that the provided `lesion_id` or `visit_id` belongs to the user's location. Any authenticated user can upload photos to any patient's lesion.

#### Files affected

- `backend/src/routes/photos.js`

#### Step-by-step

- [ ] Before INSERT, verify: `SELECT 1 FROM lesions l JOIN visits v ON ... JOIN patients pt ON ... WHERE l.lesion_id = $1 AND ($2 OR pt.location_id = $3)`
- [ ] If no match → 404

#### Verification

- [ ] Upload to a lesion at another clinic → 404
- [ ] Upload to own clinic's lesion → success

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
- [ ] Create `backend/src/middleware/auditLog.js` with a function:
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
- [ ] `GET /api/patients/` → log `view` action
- [ ] `GET /api/patients/:id` → log `view` action
- [ ] `POST /api/patients/` → log `create` action
- [ ] `PUT /api/patients/:id` → log `update` action
- [ ] `DELETE /api/patients/:id` → log `delete` action
- [ ] Same pattern for visits, lesions, photos
- [ ] Include patient_id/visit_id in `resource_id` field

##### 16-C: Fix the `user_name` in audit log POST
The JWT payload does NOT include `name`. Either:
- [ ] Add `name` to the JWT claims, OR
- [ ] Look up the user name from DB in the audit middleware

#### Verification

- [ ] Viewing a patient record creates an audit log entry
- [ ] Deleting a lesion creates an audit log entry
- [ ] Audit log entries include user ID, action, resource ID, and IP address

---

### 17. User Admin Route Returns All Users Cross-Clinic

**Severity:** 🟠 HIGH

#### Problem

`GET /api/admin/users` returns all users from all clinics. A `manager` at clinic A can see all users across clinics B and C. Only `admin` should see cross-clinic data.

#### Files affected

- `backend/src/routes/users.js`

#### Step-by-step

- [ ] For `manager` role: add `WHERE location_id = $1` filter using `req.user.location_id`
- [ ] For `admin` role: return all (no filter)
- [ ] Also scope PATCH and DELETE to location for managers

#### Verification

- [ ] Manager at clinic A cannot see users from clinic B
- [ ] Admin sees all users

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
- [ ] Add session revocation to deactivate handler

##### 18-B: Check user status in `authenticateToken` (covered in Issue 2-D)
- [ ] Confirm the middleware also rejects tokens for `status = 'inactive'` users

#### Verification

- [ ] Deactivate user → their existing token immediately returns 401
- [ ] Re-activating the user and logging in works normally

---

### 19. Seed File Has Weak Password and Logs Credentials

**Severity:** 🟠 HIGH

#### Problem

`backend/src/db/seed.js` uses password `demo123` (7 chars — below the app's own 12-char HIPAA minimum), bcrypt cost factor 10 (vs 12 elsewhere), and prints all demo credentials to stdout.

#### Files affected

- `backend/src/db/seed.js`

#### Step-by-step

- [ ] Change seed password to a 12+ character string (e.g., `DemoPass1234!`)
- [ ] Change bcrypt cost factor from 10 to 12
- [ ] Remove the `console.log` lines that print email/password combinations
- [ ] Add a guard at the top: `if (process.env.NODE_ENV === 'production') { console.error('FATAL: seed.js must not run in production'); process.exit(1); }`
- [ ] Remove `npm run db:seed` from the production `docker-compose.yml` command

#### Verification

- [ ] Running seed in production is blocked
- [ ] Seed password meets the 12-char minimum
- [ ] No credentials printed to stdout
- [ ] Cost factor is 12

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
- [ ] `npm install node-pg-migrate`

##### 20-B: Add migration scripts to `package.json`
```json
"migrate:up": "node-pg-migrate up",
"migrate:down": "node-pg-migrate down",
"migrate:create": "node-pg-migrate create"
```
- [ ] Add scripts
- [ ] Add `DATABASE_URL` to `.env.example`

##### 20-C: Create baseline migration from current `setup.js`
- [ ] `npm run migrate:create -- initial_schema`
- [ ] Move all `CREATE TABLE` + `CREATE INDEX` into `up()`
- [ ] Write `down()` with `DROP TABLE` in reverse order

##### 20-D: Create individual migrations for each existing ALTER TABLE patch
- [ ] `add_user_credentials_column`
- [ ] `add_user_status_column`
- [ ] `add_user_location_id_column`
- [ ] `add_patient_location_id_column`
- [ ] `add_photos_s3_columns`
- [ ] `add_clinic_locations_table`
- [ ] `add_baa_records_table`

##### 20-E: Create migrations for new tables in this remediation plan
- [ ] `add_user_sessions_table` (Issue 2)
- [ ] `add_password_reset_tokens_table` (Issue 4)
- [ ] `add_mfa_columns_to_users` (Issue 1)

##### 20-F: Replace `setup.js` with migration runner
- [ ] Update `db:setup` script to `node-pg-migrate up`
- [ ] Update docs

##### 20-G: Test on a fresh database
- [ ] `migrate:up` from scratch → no errors
- [ ] `migrate:down` + `migrate:up` → same schema

#### Verification

- [ ] `migrate:status` shows all migrations as applied
- [ ] No `ALTER TABLE` remains in `setup.js`

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
- [ ] Add to `users` array in `seed.js`: `{ id: 'admin-001', name: 'System Admin', email: 'admin@dermmap.com', role: 'admin' }`

##### 21-B: Create standalone admin bootstrap script
Create `backend/src/scripts/create-admin.js`:
```js
// Usage: node src/scripts/create-admin.js <name> <email> <password>
```
- [ ] Create the script (with 12-char password check, bcrypt cost 12, `ON CONFLICT DO NOTHING`)
- [ ] Add `"admin:create": "node src/scripts/create-admin.js"` to `package.json`

##### 21-C: Document the bootstrap process
- [ ] Add "First-Time Setup" section to `docs/LOCAL_DEV_GUIDE.md`

#### Verification

- [ ] `npm run db:seed` creates `admin-001`
- [ ] `npm run admin:create -- "Name" email pw` creates admin on fresh DB
- [ ] Running twice with same email is idempotent

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

- [ ] Change the 403 response to: `res.status(403).json({ error: 'Insufficient permissions' })`
- [ ] Remove `required` and `current` fields

#### Verification

- [ ] 403 response body only contains `{ error: 'Insufficient permissions' }`

---

### 23. `last_login_at` Never Written

**Severity:** 🟡 MEDIUM  
**HIPAA:** Audit trail — timestamp of last authentication

#### Problem

The `last_login_at` column exists but the login handler never updates it.

#### Files affected

- `backend/src/routes/auth.js`

#### Step-by-step

- [ ] In the login handler, after password verification: `UPDATE users SET last_login_at = CURRENT_TIMESTAMP WHERE id = $1`

#### Verification

- [ ] After login, `last_login_at` is a recent timestamp in the DB

---

### 24. SECURITY.md Documentation Drift

**Severity:** 🟡 MEDIUM

#### Problem

`SECURITY.md` references Auth0, CSRF via Auth0, and Auth0 env vars. The actual implementation is fully custom JWT + bcrypt. Multiple `✅` items are not actually implemented.

#### Files affected

- `SECURITY.md`

#### Step-by-step

- [ ] Remove all Auth0 mentions
- [ ] Replace "CSRF protection via Auth0" with "Stateless JWT — no session cookies means no CSRF surface"
- [ ] Replace auth env var references (`VITE_AUTH0_*`) with actual vars (`JWT_SECRET`, `DB_PASSWORD`, `SMTP_PASS`)
- [ ] Audit every `✅` — change unimplemented items to `[ ]`
- [ ] Add "Known Gaps / In Progress" section linking to this remediation plan
- [ ] Update the Authentication section to accurately describe the JWT + bcrypt + TOTP stack (update after issues are fixed)

#### Verification

- [ ] Zero mentions of "Auth0" in `SECURITY.md`
- [ ] Every `✅` has a real implementation in code

---

### 25. Request Logging Missing User ID and IP

**Severity:** 🟡 MEDIUM  
**HIPAA:** §164.312(b) — Audit Controls

#### Problem

Server request logging (`server.js`) only logs timestamp, method, and path. No user identification, IP address, or response status. Useless for HIPAA breach investigation.

#### Files affected

- `backend/src/server.js`

#### Step-by-step

- [ ] Update the request logging middleware to include:
  - User ID (from `req.user.id` if available, or `'anonymous'`)
  - IP address (`req.ip` or `req.headers['x-forwarded-for']`)
  - Response status code (use `res.on('finish', ...)` to capture)
- [ ] Format: `2026-03-12T10:00:00Z GET /api/patients user=dr-001 ip=192.168.1.1 status=200`

#### Verification

- [ ] Log lines include user id, IP, and status code
- [ ] Anonymous requests (health check, login) show `user=anonymous`

---

### 26. Settings Route Creates Tables at Runtime

**Severity:** 🟡 MEDIUM

#### Problem

`backend/src/routes/settings.js` calls `ensureSettingsTable()` (which runs `CREATE TABLE IF NOT EXISTS`) on every GET and PUT request. This grants the application user DDL authority and wastes a query per request.

#### Files affected

- `backend/src/routes/settings.js`
- `backend/src/db/setup.js`

#### Step-by-step

- [ ] Move the `clinic_settings` `CREATE TABLE` into `setup.js` (or a migration)
- [ ] Remove `ensureSettingsTable()` and all calls to it from `settings.js`

#### Verification

- [ ] `GET /api/settings` works without the inline `CREATE TABLE`
- [ ] `clinic_settings` table created during `db:setup`

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

- [ ] Add a `clearAll()` method to `src/services/db.ts` that deletes from all stores
- [ ] Call both `indexedDB.clearAll()` AND `db.clearAll()` in the store's `logout()`
- [ ] Also call `sessionStorage.removeItem('auth_user')` in the store's `logout()`

#### Verification

- [ ] After logout, both IndexedDB databases are empty
- [ ] `sessionStorage` has no `auth_user` or `auth_token` keys

---

### 28. Error Handler Exposes Stack Traces

**Severity:** 🟡 MEDIUM  
**OWASP:** A05:2021 — Security Misconfiguration

#### Problem

The global error handler in `server.js` returns `stack` when `NODE_ENV === 'development'`. If `NODE_ENV` is accidentally left as `development` in production, full stack traces leak.

#### Files affected

- `backend/src/server.js`

#### Step-by-step

- [ ] Change condition: only expose stack in `development` AND when request is from `localhost`
- [ ] Or simply never return stack traces in responses — log them server-side instead

#### Verification

- [ ] Error responses in production never include `stack`

---

### 29. Rate Limiter Is IP-Only — No Account-Based Limiting

**Severity:** 🟡 MEDIUM

#### Problem

The login rate limiter is IP-based only. An attacker with distributed IPs can brute-force a single user's credentials without triggering limits.

#### Files affected

- `backend/src/routes/auth.js`

#### Step-by-step

- [ ] Add per-account rate limiting: track failed attempts by email in a DB table or in-memory store (e.g., `node-cache` or `rate-limit-flexible`)
- [ ] Lock the account for 15 min after 5 failed attempts regardless of source IP
- [ ] Return the same generic error message to avoid leaking whether the account exists

#### Verification

- [ ] 5 failed login attempts for the same email from different IPs → account locked
- [ ] Lock expires after 15 min

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

- [ ] Change all Dockerfiles from `node:18-alpine` to `node:20-alpine` (or `node:22-alpine`)
- [ ] Test that the app builds and runs correctly
- [ ] Update any CI/CD pipeline node version references

#### Verification

- [ ] `docker build .` succeeds with new image
- [ ] All tests pass in container

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

- [ ] Add CSP header (from `SECURITY.md`)
- [ ] Add `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload`
- [ ] Add `Permissions-Policy: camera=(), microphone=(), geolocation=()`
- [ ] Change `X-Frame-Options` to `DENY` (no iframing needed)
- [ ] Add `X-XSS-Protection: 0` (modern best practice — CSP replaces it)

#### Verification

- [ ] `curl -I` shows all security headers
- [ ] Application loads correctly with CSP

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

- [ ] In `docker-compose.yml`: use Docker secrets or `.env` file reference instead of inline passwords
- [ ] In `docker-compose.dev.yml`: extend dev JWT secret to >= 32 chars
- [ ] Add a `.env.docker.example` file documenting required secrets
- [ ] Remove the seed command from the production compose `command` line

#### Verification

- [ ] No hardcoded passwords in committed compose files
- [ ] Dev JWT secret passes the 32-char startup check

---

### 33. Frontend Auth0 Config References Still Present

**Severity:** 🟢 LOW

#### Problem

`src/config.ts` still contains `auth0: { domain, clientId, audience }` configuration and `src/components/auth/Auth0Wrapper.tsx` exists. These are dead code since the actual auth system is custom JWT.

#### Files affected

- `src/config.ts`
- `src/components/auth/Auth0Wrapper.tsx`

#### Step-by-step

- [ ] Remove the `auth0` block from `config.ts`
- [ ] Remove `Auth0Wrapper.tsx` or replace with a no-op passthrough
- [ ] Remove `'auth0'` from the `authProvider` type union
- [ ] Remove any `@auth0/auth0-react` dependency from `package.json` if present

#### Verification

- [ ] No reference to "auth0" in source code (excluding docs)
- [ ] App compiles and runs without Auth0 dependencies

---

---

## Completion Summary

Update this table as issues are closed.

| # | Issue | Completed by | Date | PR/Commit |
|---|---|---|---|---|
| 1 | No MFA/2FA | | | |
| 2 | No token revocation / logout | | | |
| 3 | Refresh token rotation | | | |
| 4 | No password reset flow | | | |
| 5 | Sync route authorization | | | |
| 6 | DocuSign webhook verification | | | |
| 7 | Photo schema mismatch | | | |
| 8 | Service worker PHI caching | | | |
| 9 | Session timeout | | | |
| 10 | Demo mode default | | | |
| 11 | DB transport encryption | | | |
| 12 | Schedule tenancy | | | |
| 13 | Analytics tenancy | | | |
| 14 | Delete role restrictions | | | |
| 15 | Photo upload tenancy | | | |
| 16 | Server-side audit logging | | | |
| 17 | User admin cross-clinic | | | |
| 18 | Deactivated user tokens | | | |
| 19 | Seed file weak password | | | |
| 20 | Migration framework | | | |
| 21 | Admin bootstrap | | | |
| 22 | Role info leak | | | |
| 23 | last_login_at | | | |
| 24 | SECURITY.md drift | | | |
| 25 | Request logging | | | |
| 26 | Settings inline DDL | | | |
| 27 | IndexedDB cleanup | | | |
| 28 | Stack trace exposure | | | |
| 29 | Account-based rate limit | | | |
| 30 | Node.js EOL | | | |
| 31 | Nginx headers | | | |
| 32 | Docker secrets | | | |
| 33 | Auth0 cleanup | | | |

---

*This is a living document. Check off sub-tasks as you go. When all sub-tasks for an issue are complete and verification passes, mark the issue done in the Quick Reference table and record it in the Completion Summary.*
