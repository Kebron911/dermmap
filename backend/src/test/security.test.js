/**
 * Comprehensive Security Test Suite — DermMap
 *
 * Covers every security control implemented across the 33-issue remediation plan:
 *   Authentication (JWT HS256, alg:none, algorithm confusion, expiry, tampered payload)
 *   Session management (revocation, rotation, logout, deactivated user)
 *   MFA/TOTP (setup, verify, disable, login flow, no-secret in response)
 *   Account lockout (5 failures per-email)
 *   Password policy (HIPAA 12-char minimum)
 *   Password reset (anti-enumeration, token validation, session revocation)
 *   RBAC (role-gated registers, deletes, admin routes, settings)
 *   Location-tenancy (non-privileged patients/visits/lesions/photos cross-clinic)
 *   Input validation (patients, lesions, visits express-validator rules)
 *   Information disclosure prevention (generic errors, no mfa_secret/password_hash, no stack traces)
 *   Audit logging (PHI access logged, audit failure non-fatal)
 *   Sync route security (entity_type/operation allowlists, tenancy, auth)
 *   Photo security (MIME allowlist, Cache-Control: private, tenancy)
 *   Settings security (admin-only PUT, key sanitization vs SQL injection)
 *   User admin security (location scoping, deactivation session revoke, self-deactivation)
 *   Global controls (helmet, CORS, body size limit, health endpoint)
 *   Auth required on every PHI endpoint (25 endpoints checked)
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Pool mock must be hoisted before any import that loads pool transitively ──
vi.mock('../db/pool.js', () => {
  const query = vi.fn();
  return {
    default: {
      query,
      connect: vi.fn().mockResolvedValue({ query: vi.fn(), release: vi.fn() }),
    },
  };
});

vi.mock('../services/email.js', () => ({
  sendPasswordResetEmail: vi.fn().mockResolvedValue(undefined),
}));

// Disable all rate-limiters in tests — prevents 429 from contaminating assertions
vi.mock('express-rate-limit', () => ({ default: () => (_req, _res, next) => next() }));

import request from 'supertest';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import pool from '../db/pool.js';
import app from '../server.js';

// ── Helpers ──────────────────────────────────────────────────────────────────
const SECRET = process.env.JWT_SECRET;

function makeToken(payload = {}, opts = {}) {
  return jwt.sign(
    {
      id: 'user-1',
      email: 'test@example.com',
      name: 'Test User',
      role: 'provider',
      location_id: 'loc-1',
      jti: 'jti-default',
      ...payload,
    },
    SECRET,
    { algorithm: 'HS256', expiresIn: '1h', ...opts },
  );
}

const adminToken    = (o = {}) => makeToken({ id: 'admin-1',  role: 'admin',    location_id: null,    jti: 'jti-admin',   ...o });
const managerToken  = (o = {}) => makeToken({ id: 'mgr-1',    role: 'manager',  location_id: 'loc-1', jti: 'jti-mgr',     ...o });
const maToken       = (o = {}) => makeToken({ id: 'ma-1',     role: 'ma',       location_id: 'loc-1', jti: 'jti-ma',      ...o });
const providerToken = (o = {}) => makeToken({ id: 'prov-1',   role: 'provider', location_id: 'loc-1', jti: 'jti-prov',    ...o });

/**
 * Queues a successful session-check response (revoked_at=null, status=active).
 * Must be called once per authenticated request because authenticateToken does
 * a pool.query on the user_sessions+users join.
 */
function mockSessionValid() {
  pool.query.mockResolvedValueOnce({ rows: [{ revoked_at: null, status: 'active' }] });
}

// =============================================================================
// 1. JWT ALGORITHM SECURITY
// =============================================================================
describe('JWT Algorithm Security', () => {
  beforeEach(() => pool.query.mockReset());

  it('rejects alg:none tokens', async () => {
    const header = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url');
    const body   = Buffer.from(JSON.stringify({ id: 'hacker', role: 'admin' })).toString('base64url');
    const res = await request(app)
      .get('/api/auth/verify')
      .set('Authorization', `Bearer ${header}.${body}.`);
    expect(res.status).toBe(403);
  });

  it('rejects tokens claiming RS256 algorithm (algorithm confusion)', async () => {
    const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url');
    const body   = Buffer.from(JSON.stringify({ id: 'hacker', role: 'admin', exp: 9999999999 })).toString('base64url');
    const res = await request(app)
      .get('/api/auth/verify')
      .set('Authorization', `Bearer ${header}.${body}.invalidsig`);
    expect(res.status).toBe(403);
  });

  it('rejects tokens with tampered payload (signature mismatch)', async () => {
    const token = makeToken({ role: 'ma' });
    const parts = token.split('.');
    const decoded = JSON.parse(Buffer.from(parts[1], 'base64url').toString());
    decoded.role = 'admin';
    parts[1] = Buffer.from(JSON.stringify(decoded)).toString('base64url');
    const res = await request(app)
      .get('/api/auth/verify')
      .set('Authorization', `Bearer ${parts.join('.')}`);
    expect(res.status).toBe(403);
  });

  it('rejects expired tokens', async () => {
    const token = makeToken({}, { expiresIn: '-10s' });
    const res = await request(app)
      .get('/api/auth/verify')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(403);
  });

  it('rejects tokens signed with the wrong secret', async () => {
    const token = jwt.sign({ id: 'u', role: 'admin' }, 'totally-wrong-secret-xxxxxx', { algorithm: 'HS256' });
    const res = await request(app)
      .get('/api/auth/verify')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(403);
  });

  it('every issued token contains a jti claim', async () => {
    const hash = await bcrypt.hash('ValidPass1234!', 10);
    pool.query
      .mockResolvedValueOnce({
        rows: [{ id: 'u1', name: 'T', email: 't@e.com', role: 'ma',
                 password_hash: hash, mfa_enabled: false }],
      })
      .mockResolvedValueOnce({ rows: [] })  // UPDATE last_login_at
      .mockResolvedValueOnce({ rows: [] }); // INSERT user_sessions
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 't@e.com', password: 'ValidPass1234!' });
    expect(res.status).toBe(200);
    const decoded = jwt.verify(res.body.token, SECRET, { algorithms: ['HS256'] });
    expect(decoded).toHaveProperty('jti');
    expect(typeof decoded.jti).toBe('string');
    expect(decoded.jti.length).toBeGreaterThan(0);
  });
});

// =============================================================================
// 2. SESSION REVOCATION & TOKEN LIFECYCLE
// =============================================================================
describe('Session Revocation & Token Lifecycle', () => {
  beforeEach(() => pool.query.mockReset());

  it('rejects a token whose session row has been revoked', async () => {
    pool.query.mockResolvedValueOnce({ rows: [{ revoked_at: new Date(), status: 'active' }] });
    const res = await request(app)
      .get('/api/auth/verify')
      .set('Authorization', `Bearer ${makeToken()}`);
    expect(res.status).toBe(401);
  });

  it('rejects a token when no matching session row exists', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] });
    const res = await request(app)
      .get('/api/auth/verify')
      .set('Authorization', `Bearer ${makeToken()}`);
    expect(res.status).toBe(401);
  });

  it('rejects a token for a deactivated (inactive) user', async () => {
    pool.query.mockResolvedValueOnce({ rows: [{ revoked_at: null, status: 'inactive' }] });
    const res = await request(app)
      .get('/api/auth/verify')
      .set('Authorization', `Bearer ${makeToken()}`);
    expect(res.status).toBe(401);
  });

  it('POST /logout revokes the current session jti', async () => {
    mockSessionValid();
    pool.query.mockResolvedValueOnce({ rows: [] }); // UPDATE user_sessions SET revoked_at
    const token = makeToken({ jti: 'session-to-revoke' });
    const res = await request(app)
      .post('/api/auth/logout')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ message: 'Logged out successfully' });
    // Verify session revocation query ran with the correct jti
    const revokeCall = pool.query.mock.calls.find(c =>
      typeof c[0] === 'string' && c[0].includes('user_sessions') && c[0].includes('revoked_at'),
    );
    expect(revokeCall).toBeTruthy();
    expect(revokeCall[1]).toContain('session-to-revoke');
  });

  it('POST /refresh revokes the old jti and issues a new token with a different jti', async () => {
    mockSessionValid();
    pool.query
      .mockResolvedValueOnce({ rows: [] })                     // UPDATE revoke old jti
      .mockResolvedValueOnce({ rows: [{ name: 'Test' }] })    // SELECT name
      .mockResolvedValueOnce({ rows: [] });                    // INSERT new session
    const oldToken = makeToken({ jti: 'old-jti-12345' });
    const res = await request(app)
      .post('/api/auth/refresh')
      .set('Authorization', `Bearer ${oldToken}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('token');
    const newPayload = jwt.verify(res.body.token, SECRET, { algorithms: ['HS256'] });
    expect(newPayload.jti).toBeDefined();
    expect(newPayload.jti).not.toBe('old-jti-12345');
  });
});

// =============================================================================
// 3. MFA / TOTP SECURITY
// =============================================================================
describe('MFA / TOTP Security', () => {
  beforeEach(() => pool.query.mockReset());

  it('login returns mfaRequired:true when MFA is enabled and no totpCode supplied', async () => {
    const hash = await bcrypt.hash('ValidPass1234!', 10);
    pool.query.mockResolvedValueOnce({
      rows: [{ id: 'u1', name: 'MFA User', email: 'mfa@e.com', role: 'provider',
               password_hash: hash, mfa_enabled: true, mfa_secret: 'JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP' }],
    });
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'mfa@e.com', password: 'ValidPass1234!' });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ mfaRequired: true });
    expect(res.body).not.toHaveProperty('token');
  });

  it('login with MFA enabled + wrong totpCode returns 401 with no token', async () => {
    const hash = await bcrypt.hash('ValidPass1234!', 10);
    pool.query.mockResolvedValueOnce({
      rows: [{ id: 'u1', name: 'MFA User', email: 'mfa@e.com', role: 'provider',
               password_hash: hash, mfa_enabled: true, mfa_secret: 'JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP' }],
    });
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'mfa@e.com', password: 'ValidPass1234!', totpCode: '000000' });
    expect(res.status).toBe(401);
    expect(res.body).not.toHaveProperty('token');
  });

  it('POST /mfa/setup requires authentication (401 without token)', async () => {
    const res = await request(app).post('/api/auth/mfa/setup');
    expect(res.status).toBe(401);
  });

  it('POST /mfa/setup does not expose mfa_secret in response body', async () => {
    mockSessionValid();
    pool.query.mockResolvedValueOnce({ rows: [] }); // UPDATE users SET mfa_secret
    const res = await request(app)
      .post('/api/auth/mfa/setup')
      .set('Authorization', `Bearer ${makeToken()}`);
    // Only qrCode should be returned — never the raw secret
    const body = JSON.stringify(res.body);
    expect(body).not.toContain('"mfa_secret"');
    expect(body).not.toContain('"secret"');
  });

  it('POST /mfa/verify returns 400 when code is missing', async () => {
    mockSessionValid();
    const res = await request(app)
      .post('/api/auth/mfa/verify')
      .set('Authorization', `Bearer ${makeToken()}`)
      .send({});
    expect(res.status).toBe(400);
  });

  it('POST /mfa/verify rejects an invalid TOTP code', async () => {
    mockSessionValid();
    pool.query.mockResolvedValueOnce({ rows: [{ mfa_secret: 'JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP' }] });
    const res = await request(app)
      .post('/api/auth/mfa/verify')
      .set('Authorization', `Bearer ${makeToken()}`)
      .send({ code: '000000' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/invalid totp/i);
  });

  it('POST /mfa/disable returns 400 when password is missing', async () => {
    mockSessionValid();
    const res = await request(app)
      .post('/api/auth/mfa/disable')
      .set('Authorization', `Bearer ${makeToken()}`)
      .send({});
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/password/i);
  });

  it('POST /mfa/disable returns 401 when wrong password is supplied', async () => {
    mockSessionValid();
    const hash = await bcrypt.hash('CorrectPass1234!', 10);
    pool.query.mockResolvedValueOnce({ rows: [{ password_hash: hash }] });
    const res = await request(app)
      .post('/api/auth/mfa/disable')
      .set('Authorization', `Bearer ${makeToken()}`)
      .send({ password: 'WrongPass9999!' });
    expect(res.status).toBe(401);
  });
});

// =============================================================================
// 4. PASSWORD RESET SECURITY
// =============================================================================
describe('Password Reset Security', () => {
  beforeEach(() => pool.query.mockReset());

  it('forgot-password returns identical 200 response for existing and non-existing emails (no enumeration)', async () => {
    // Non-existing user
    pool.query.mockResolvedValueOnce({ rows: [] });
    const res1 = await request(app)
      .post('/api/auth/forgot-password')
      .send({ email: 'nonexistent@example.com' });

    // Existing user
    pool.query
      .mockResolvedValueOnce({ rows: [{ id: 'u1' }] })
      .mockResolvedValueOnce({ rows: [] }); // INSERT token
    const res2 = await request(app)
      .post('/api/auth/forgot-password')
      .send({ email: 'existing@example.com' });

    expect(res1.status).toBe(200);
    expect(res2.status).toBe(200);
    expect(res1.body.message).toBe(res2.body.message);
  });

  it('forgot-password returns 400 when email is missing', async () => {
    const res = await request(app)
      .post('/api/auth/forgot-password')
      .send({});
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/email/i);
  });

  it('reset-password returns 400 when token or newPassword is missing', async () => {
    const res = await request(app)
      .post('/api/auth/reset-password')
      .send({});
    expect(res.status).toBe(400);
  });

  it('reset-password enforces minimum 12-character password', async () => {
    const res = await request(app)
      .post('/api/auth/reset-password')
      .send({ token: 'some-token', newPassword: 'Short1!' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/12 characters/);
  });

  it('reset-password returns 400 for an invalid or expired token', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] }); // no matching token
    const res = await request(app)
      .post('/api/auth/reset-password')
      .send({ token: 'bad-token', newPassword: 'ValidNewPass1234!' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/invalid or expired/i);
  });

  it('reset-password revokes all user sessions after a successful password change', async () => {
    pool.query
      .mockResolvedValueOnce({ rows: [{ user_id: 'u1' }] }) // SELECT token
      .mockResolvedValueOnce({ rows: [] }) // BEGIN
      .mockResolvedValueOnce({ rows: [] }) // UPDATE users password
      .mockResolvedValueOnce({ rows: [] }) // UPDATE token used_at
      .mockResolvedValueOnce({ rows: [] }) // UPDATE user_sessions revoke
      .mockResolvedValueOnce({ rows: [] }); // COMMIT
    const res = await request(app)
      .post('/api/auth/reset-password')
      .send({ token: 'valid-token', newPassword: 'ValidNewPass1234!' });
    expect(res.status).toBe(200);
    const revokeCall = pool.query.mock.calls.find(c =>
      typeof c[0] === 'string' && c[0].includes('user_sessions') && c[0].includes('revoked_at'),
    );
    expect(revokeCall).toBeTruthy();
    expect(revokeCall[1]).toContain('u1');
  });
});

// =============================================================================
// 5. ROLE-BASED ACCESS CONTROL (RBAC)
// =============================================================================
describe('RBAC — Role-Based Access Control', () => {
  beforeEach(() => pool.query.mockReset());

  // ── Register role gates ──
  it('MA cannot register new users (403)', async () => {
    mockSessionValid();
    const res = await request(app)
      .post('/api/auth/register')
      .set('Authorization', `Bearer ${maToken()}`)
      .send({ name: 'N', email: 'n@e.com', password: 'SecurePass1234!', role: 'ma' });
    expect(res.status).toBe(403);
    expect(res.body).toEqual({ error: 'Insufficient permissions' });
  });

  it('provider cannot register new users (403)', async () => {
    mockSessionValid();
    const res = await request(app)
      .post('/api/auth/register')
      .set('Authorization', `Bearer ${providerToken()}`)
      .send({ name: 'N', email: 'n@e.com', password: 'SecurePass1234!', role: 'ma' });
    expect(res.status).toBe(403);
  });

  it('register rejects invalid role such as superadmin (400)', async () => {
    mockSessionValid();
    pool.query.mockResolvedValueOnce({ rows: [] }); // email duplicate check
    const res = await request(app)
      .post('/api/auth/register')
      .set('Authorization', `Bearer ${adminToken()}`)
      .send({ name: 'N', email: `unique${Date.now()}@e.com`, password: 'SecurePass1234!', role: 'superadmin' });
    expect(res.status).toBe(400);
  });

  // ── Visit DELETE RBAC ──
  it('MA cannot delete visits (403)', async () => {
    mockSessionValid();
    const res = await request(app)
      .delete('/api/visits/v1')
      .set('Authorization', `Bearer ${maToken()}`);
    expect(res.status).toBe(403);
  });

  it('provider IS allowed to delete visits (200)', async () => {
    mockSessionValid();
    pool.query
      .mockResolvedValueOnce({ rows: [{ visit_id: 'v1' }] }) // DELETE RETURNING
      .mockResolvedValueOnce({ rows: [] });                    // audit log
    const res = await request(app)
      .delete('/api/visits/v1')
      .set('Authorization', `Bearer ${providerToken()}`);
    expect(res.status).toBe(200);
  });

  // ── Lesion DELETE RBAC ──
  it('MA cannot delete lesions (403)', async () => {
    mockSessionValid();
    const res = await request(app)
      .delete('/api/lesions/l1')
      .set('Authorization', `Bearer ${maToken()}`);
    expect(res.status).toBe(403);
  });

  it('provider IS allowed to delete lesions (200)', async () => {
    mockSessionValid();
    pool.query
      .mockResolvedValueOnce({ rows: [{ lesion_id: 'l1' }] })
      .mockResolvedValueOnce({ rows: [] }); // audit
    const res = await request(app)
      .delete('/api/lesions/l1')
      .set('Authorization', `Bearer ${providerToken()}`);
    expect(res.status).toBe(200);
  });

  // ── Photo DELETE RBAC (admin/manager only) ──
  it('MA cannot delete photos (403)', async () => {
    mockSessionValid();
    const res = await request(app)
      .delete('/api/photos/p1')
      .set('Authorization', `Bearer ${maToken()}`);
    expect(res.status).toBe(403);
  });

  it('provider cannot delete photos — admin/manager only (403)', async () => {
    mockSessionValid();
    const res = await request(app)
      .delete('/api/photos/p1')
      .set('Authorization', `Bearer ${providerToken()}`);
    expect(res.status).toBe(403);
  });

  it('manager IS allowed to delete photos (200)', async () => {
    mockSessionValid();
    pool.query
      .mockResolvedValueOnce({ rows: [{ photo_id: 'p1' }] })
      .mockResolvedValueOnce({ rows: [] }); // audit
    const res = await request(app)
      .delete('/api/photos/p1')
      .set('Authorization', `Bearer ${managerToken()}`);
    expect(res.status).toBe(200);
  });

  // ── Patient DELETE RBAC (admin/manager only) ──
  it('MA cannot delete patients (403)', async () => {
    mockSessionValid();
    const res = await request(app)
      .delete('/api/patients/p1')
      .set('Authorization', `Bearer ${maToken()}`);
    expect(res.status).toBe(403);
  });

  it('provider cannot delete patients — admin/manager only (403)', async () => {
    mockSessionValid();
    const res = await request(app)
      .delete('/api/patients/p1')
      .set('Authorization', `Bearer ${providerToken()}`);
    expect(res.status).toBe(403);
  });

  // ── User admin access control ──
  it('MA cannot access GET /api/admin/users (403)', async () => {
    mockSessionValid();
    const res = await request(app)
      .get('/api/admin/users')
      .set('Authorization', `Bearer ${maToken()}`);
    expect(res.status).toBe(403);
  });

  it('provider cannot access GET /api/admin/users (403)', async () => {
    mockSessionValid();
    const res = await request(app)
      .get('/api/admin/users')
      .set('Authorization', `Bearer ${providerToken()}`);
    expect(res.status).toBe(403);
  });

  // ── Settings admin-only write ──
  it('manager cannot PUT /api/settings (403)', async () => {
    mockSessionValid();
    const res = await request(app)
      .put('/api/settings')
      .set('Authorization', `Bearer ${managerToken()}`)
      .send({ some_key: 'value' });
    expect(res.status).toBe(403);
  });

  it('admin IS allowed to PUT /api/settings (200)', async () => {
    mockSessionValid();
    const client = { query: vi.fn().mockResolvedValue({ rows: [] }), release: vi.fn() };
    pool.connect.mockResolvedValueOnce(client);
    const res = await request(app)
      .put('/api/settings')
      .set('Authorization', `Bearer ${adminToken()}`)
      .send({ hipaa_mode: true });
    expect(res.status).toBe(200);
  });

  it('authorizeRoles response does not disclose required roles or current role (Issue 22)', async () => {
    mockSessionValid();
    const res = await request(app)
      .delete('/api/photos/p1')
      .set('Authorization', `Bearer ${providerToken()}`);
    expect(res.status).toBe(403);
    expect(res.body).toEqual({ error: 'Insufficient permissions' });
    expect(res.body).not.toHaveProperty('required');
    expect(res.body).not.toHaveProperty('currentRole');
    expect(res.body).not.toHaveProperty('allowedRoles');
  });
});

// =============================================================================
// 6. LOCATION-TENANCY ENFORCEMENT
// =============================================================================
describe('Location-Tenancy Enforcement', () => {
  beforeEach(() => pool.query.mockReset());

  it('non-privileged user GET /patients query includes location_id filter', async () => {
    mockSessionValid();
    pool.query.mockResolvedValueOnce({ rows: [] }); // empty patients (early return)
    await request(app)
      .get('/api/patients')
      .set('Authorization', `Bearer ${maToken()}`);
    // call[0]=session, call[1]=patients query
    const sql = pool.query.mock.calls[1][0];
    expect(sql).toMatch(/AND\s+location_id\s*=\s*\$/);
  });

  it('admin GET /patients query does NOT include a location_id restriction', async () => {
    mockSessionValid();
    pool.query.mockResolvedValueOnce({ rows: [] });
    await request(app)
      .get('/api/patients')
      .set('Authorization', `Bearer ${adminToken()}`);
    const sql = pool.query.mock.calls[1][0];
    expect(sql).not.toMatch(/AND\s+location_id\s*=\s*\$/);
  });

  it('photo upload verifies lesion belongs to user clinic — rejects cross-clinic lesion (404)', async () => {
    mockSessionValid();
    pool.query.mockResolvedValueOnce({ rows: [] }); // tenancy check returns nothing
    const res = await request(app)
      .post('/api/photos')
      .set('Authorization', `Bearer ${maToken()}`)
      .send({
        photo_id: 'ph-1',
        lesion_id: 'foreign-lesion',
        visit_id: 'v-1',
        photo_data: Buffer.from('fake').toString('base64'),
      });
    expect(res.status).toBe(404);
  });

  it('visit creation rejects patient belonging to another clinic (404)', async () => {
    mockSessionValid();
    pool.query.mockResolvedValueOnce({ rows: [] }); // patient tenancy check fails
    const res = await request(app)
      .post('/api/visits')
      .set('Authorization', `Bearer ${providerToken()}`)
      .send({
        visit_id: 'v-new',
        patient_id: 'foreign-patient',
        visit_date: '2026-03-13',
        visit_type: 'follow-up',
        status: 'in_progress',
      });
    expect(res.status).toBe(404);
  });

  it('lesion creation rejects visit belonging to another clinic (404)', async () => {
    mockSessionValid();
    pool.query.mockResolvedValueOnce({ rows: [] }); // visit tenancy check fails
    const res = await request(app)
      .post('/api/lesions')
      .set('Authorization', `Bearer ${providerToken()}`)
      .send({
        lesion_id: 'l-new',
        visit_id: 'foreign-visit',
        patient_id: 'p1',
        body_location_x: 50,
        body_location_y: 50,
      });
    expect(res.status).toBe(404);
  });

  it('manager GET /admin/users query is scoped to their location_id', async () => {
    mockSessionValid();
    pool.query.mockResolvedValueOnce({ rows: [] });
    await request(app)
      .get('/api/admin/users')
      .set('Authorization', `Bearer ${managerToken()}`);
    const sql = pool.query.mock.calls[1][0];
    expect(sql).toContain('location_id');
  });

  it('admin GET /admin/users query returns all — no location_id restriction', async () => {
    mockSessionValid();
    pool.query.mockResolvedValueOnce({ rows: [] });
    await request(app)
      .get('/api/admin/users')
      .set('Authorization', `Bearer ${adminToken()}`);
    const sql = pool.query.mock.calls[1][0];
    expect(sql).not.toContain('location_id');
  });
});

// =============================================================================
// 7. ACCOUNT LOCKOUT — PER-EMAIL BRUTE-FORCE PROTECTION (Issue 29)
// =============================================================================
describe('Account Lockout — Per-Email Brute-Force Protection', () => {
  // Use a timestamp-based email to avoid cross-test interference with the in-memory Map
  const lockedEmail = `lockout-${Date.now()}@dermmap.test`;

  beforeEach(() => pool.query.mockReset());

  it('locks account after 5 failed login attempts — 6th attempt returns 401 even with correct password', async () => {
    const hash = await bcrypt.hash('RealPass123456!', 10);
    // Mock the user row for each of the 5 failed attempts
    for (let i = 0; i < 5; i++) {
      pool.query.mockResolvedValueOnce({
        rows: [{ id: 'lock-user', name: 'L', email: lockedEmail,
                 role: 'ma', password_hash: hash, mfa_enabled: false }],
      });
    }
    // 5 failed attempts with wrong password
    for (let i = 0; i < 5; i++) {
      await request(app)
        .post('/api/auth/login')
        .send({ email: lockedEmail, password: 'WrongPassword123!' });
    }
    // 6th attempt — account is now locked; returns 401 before DB query (no mock needed)
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: lockedEmail, password: 'RealPass123456!' });
    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Invalid credentials');
  });
});

// =============================================================================
// 8. PASSWORD POLICY (HIPAA 12-char minimum)
// =============================================================================
describe('Password Policy — HIPAA Minimum 12 Characters', () => {
  beforeEach(() => pool.query.mockReset());

  it('register rejects password shorter than 12 characters (400)', async () => {
    mockSessionValid();
    const res = await request(app)
      .post('/api/auth/register')
      .set('Authorization', `Bearer ${adminToken()}`)
      .send({ name: 'N', email: 'n@e.com', password: 'Short1!', role: 'ma' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/12 characters/);
  });

  it('reset-password rejects new password shorter than 12 characters (400)', async () => {
    const res = await request(app)
      .post('/api/auth/reset-password')
      .send({ token: 'tok', newPassword: 'Short1!' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/12 characters/);
  });

  it('admin-initiated user password reset rejects password shorter than 12 characters (400)', async () => {
    mockSessionValid();
    const res = await request(app)
      .post('/api/admin/users/u1/reset-password')
      .set('Authorization', `Bearer ${adminToken()}`)
      .send({ newPassword: 'Short1!' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/12 characters/);
  });
});

// =============================================================================
// 9. INFORMATION DISCLOSURE PREVENTION
// =============================================================================
describe('Information Disclosure Prevention', () => {
  beforeEach(() => pool.query.mockReset());

  it('wrong email and wrong password return identical error message (anti-enumeration)', async () => {
    // Wrong email — user not found
    pool.query.mockResolvedValueOnce({ rows: [] });
    const res1 = await request(app)
      .post('/api/auth/login')
      .send({ email: 'notfound@dermmap.test', password: 'ValidPass1234!' });

    // Correct email but wrong password
    const hash = await bcrypt.hash('ActualPass1234!', 10);
    pool.query.mockResolvedValueOnce({
      rows: [{ id: 'u1', name: 'T', email: 't@e.com', role: 'ma',
               password_hash: hash, mfa_enabled: false }],
    });
    const res2 = await request(app)
      .post('/api/auth/login')
      .send({ email: 't@e.com', password: 'WrongPassword123!' });

    expect(res1.status).toBe(401);
    expect(res2.status).toBe(401);
    expect(res1.body.error).toBe('Invalid credentials');
    expect(res2.body.error).toBe('Invalid credentials');
  });

  it('deactivated user login returns same error as wrong password — status=inactive not disclosed', async () => {
    // Login query filters by status='active' so inactive users yield rows:[]
    pool.query.mockResolvedValueOnce({ rows: [] });
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'inactive@dermmap.test', password: 'ValidPass1234!' });
    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Invalid credentials');
    expect(res.body).not.toHaveProperty('status');
  });

  it('GET /api/auth/verify response never contains mfa_secret or password_hash', async () => {
    mockSessionValid();
    const res = await request(app)
      .get('/api/auth/verify')
      .set('Authorization', `Bearer ${makeToken()}`);
    expect(res.status).toBe(200);
    const body = JSON.stringify(res.body);
    expect(body).not.toContain('mfa_secret');
    expect(body).not.toContain('password_hash');
  });

  it('login success response never contains password_hash or mfa_secret', async () => {
    const hash = await bcrypt.hash('ValidPass1234!', 10);
    pool.query
      .mockResolvedValueOnce({
        rows: [{ id: 'u1', name: 'T', email: 't@e.com', role: 'ma',
                 password_hash: hash, mfa_enabled: false, mfa_secret: 'SUPERSECRET' }],
      })
      .mockResolvedValueOnce({ rows: [] })  // UPDATE last_login_at
      .mockResolvedValueOnce({ rows: [] }); // INSERT session
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 't@e.com', password: 'ValidPass1234!' });
    expect(res.status).toBe(200);
    const body = JSON.stringify(res.body);
    expect(body).not.toContain('password_hash');
    expect(body).not.toContain('mfa_secret');
    expect(body).not.toContain('SUPERSECRET');
  });

  it('error handler never returns a stack trace in the response body (Issue 28)', async () => {
    // A 404 for an unknown route is handled by the 404 middleware
    const res = await request(app).get('/api/this-route-does-not-exist-xyzabc');
    expect(res.status).toBe(404);
    expect(res.body).not.toHaveProperty('stack');
    expect(res.body).toEqual({ error: 'Route not found' });
  });

  it('authorizeRoles 403 body contains only a generic error — no role information leaked', async () => {
    mockSessionValid();
    const res = await request(app)
      .put('/api/settings')
      .set('Authorization', `Bearer ${maToken()}`)
      .send({ key: 'val' });
    expect(res.status).toBe(403);
    expect(Object.keys(res.body)).toEqual(['error']);
    expect(res.body.error).toBe('Insufficient permissions');
  });

  it('provision success response does not contain admin_password or password_hash', async () => {
    pool.query
      .mockResolvedValueOnce({ rows: [] }) // NPI not taken
      .mockResolvedValueOnce({ rows: [] }); // email not taken
    const client = { query: vi.fn().mockResolvedValue({ rows: [] }), release: vi.fn() };
    pool.connect.mockResolvedValueOnce(client);

    const res = await request(app)
      .post('/api/provision/clinic')
      .send({
        clinic_name: 'Test Clinic',
        npi: '1234567890',
        admin_email: 'admin@test.com',
        admin_name: 'Admin',
        admin_password: 'SecurePass1234!',
        baa_accepted: true,
        baa_signatory_name: 'Admin Test',
      });

    // Whether 201 or 500, password must never appear
    const body = JSON.stringify(res.body);
    expect(body).not.toContain('SecurePass1234!');
    expect(body).not.toContain('password_hash');
    expect(body).not.toMatch(/\$2[ab]\$12\$/); // bcrypt hash prefix
  });
});

// =============================================================================
// 10. USER ADMIN SECURITY (Issues 17, 18)
// =============================================================================
describe('User Admin Security', () => {
  beforeEach(() => pool.query.mockReset());

  it('deactivating a user via DELETE revokes all their active sessions immediately (Issue 18)', async () => {
    mockSessionValid();
    pool.query
      .mockResolvedValueOnce({ rows: [{ id: 'target-user' }] }) // UPDATE users → inactive
      .mockResolvedValueOnce({ rows: [] });                      // UPDATE user_sessions revoke
    const res = await request(app)
      .delete('/api/admin/users/target-user')
      .set('Authorization', `Bearer ${adminToken()}`);
    expect(res.status).toBe(200);
    const revokeCall = pool.query.mock.calls.find(c =>
      typeof c[0] === 'string' && c[0].includes('UPDATE') && c[0].includes('user_sessions') && c[0].includes('user_id'),
    );
    expect(revokeCall).toBeTruthy();
    expect(revokeCall[1]).toContain('target-user');
  });

  it('an admin cannot deactivate their own account (self-deactivation prevention)', async () => {
    mockSessionValid();
    const res = await request(app)
      .delete('/api/admin/users/admin-1')
      .set('Authorization', `Bearer ${adminToken()}`); // adminToken has id:'admin-1'
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/cannot deactivate your own/i);
  });

  it('PATCH /admin/users rejects an invalid role value (400)', async () => {
    mockSessionValid();
    const res = await request(app)
      .patch('/api/admin/users/u1')
      .set('Authorization', `Bearer ${adminToken()}`)
      .send({ role: 'superadmin' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/invalid role/i);
  });

  it('PATCH /admin/users rejects an invalid status value (400)', async () => {
    mockSessionValid();
    const res = await request(app)
      .patch('/api/admin/users/u1')
      .set('Authorization', `Bearer ${adminToken()}`)
      .send({ status: 'banned' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/invalid status/i);
  });

  it('PATCH to status=inactive revokes all sessions for that user (Issue 18)', async () => {
    mockSessionValid();
    pool.query
      .mockResolvedValueOnce({
        rows: [{ id: 'u1', name: 'T', email: 't@e.com', role: 'ma', credentials: null, status: 'inactive' }],
      })
      .mockResolvedValueOnce({ rows: [] }); // UPDATE user_sessions
    const res = await request(app)
      .patch('/api/admin/users/u1')
      .set('Authorization', `Bearer ${adminToken()}`)
      .send({ status: 'inactive' });
    expect(res.status).toBe(200);
    const revokeCall = pool.query.mock.calls.find(c =>
      typeof c[0] === 'string' && c[0].includes('UPDATE') && c[0].includes('user_sessions') && c[0].includes('user_id'),
    );
    expect(revokeCall).toBeTruthy();
    expect(revokeCall[1]).toContain('u1');
  });

  it('POST /api/admin/users with duplicate email returns 409', async () => {
    mockSessionValid();
    pool.query
      .mockResolvedValueOnce({ rows: [{ id: 'existing' }] }); // email already exists
    const res = await request(app)
      .post('/api/admin/users')
      .set('Authorization', `Bearer ${adminToken()}`)
      .send({ name: 'Dup', email: 'dup@e.com', password: 'SecurePass1234!', role: 'ma' });
    expect(res.status).toBe(409);
  });

  it('POST /api/admin/users rejects invalid role (400)', async () => {
    mockSessionValid();
    const res = await request(app)
      .post('/api/admin/users')
      .set('Authorization', `Bearer ${adminToken()}`)
      .send({ name: 'N', email: 'n@e.com', password: 'SecurePass1234!', role: 'admin' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/invalid role/i);
  });

  it('POST /api/admin/users rejects password shorter than 12 chars (400)', async () => {
    mockSessionValid();
    const res = await request(app)
      .post('/api/admin/users')
      .set('Authorization', `Bearer ${adminToken()}`)
      .send({ name: 'N', email: 'n@e.com', password: 'Short1!', role: 'ma' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/12 characters/i);
  });
});

// =============================================================================
// 11. INPUT VALIDATION — PATIENTS
// =============================================================================
describe('Input Validation — Patients', () => {
  beforeEach(() => pool.query.mockReset());

  it('POST /api/patients rejects body with missing required fields (422)', async () => {
    mockSessionValid();
    const res = await request(app)
      .post('/api/patients')
      .set('Authorization', `Bearer ${providerToken()}`)
      .send({});
    expect(res.status).toBe(422);
  });

  it('POST /api/patients rejects an invalid date_of_birth format (422)', async () => {
    mockSessionValid();
    const res = await request(app)
      .post('/api/patients')
      .set('Authorization', `Bearer ${providerToken()}`)
      .send({
        patient_id: 'p1', mrn: 'MRN001', first_name: 'A', last_name: 'B',
        date_of_birth: 'not-a-date', sex: 'male',
      });
    expect(res.status).toBe(422);
  });

  it('POST /api/patients rejects an invalid sex enum value (422)', async () => {
    mockSessionValid();
    const res = await request(app)
      .post('/api/patients')
      .set('Authorization', `Bearer ${providerToken()}`)
      .send({
        patient_id: 'p1', mrn: 'MRN001', first_name: 'A', last_name: 'B',
        date_of_birth: '1990-01-01', sex: 'alien',
      });
    expect(res.status).toBe(422);
  });

  it('PUT /api/patients rejects a malformed email address (422)', async () => {
    mockSessionValid();
    const res = await request(app)
      .put('/api/patients/p1')
      .set('Authorization', `Bearer ${providerToken()}`)
      .send({ email: 'definitely-not-an-email' });
    expect(res.status).toBe(422);
  });
});

// =============================================================================
// 12. INPUT VALIDATION — LESIONS
// =============================================================================
describe('Input Validation — Lesions', () => {
  beforeEach(() => pool.query.mockReset());

  it('POST /api/lesions rejects coordinates outside 0-100 range (422)', async () => {
    mockSessionValid();
    const res = await request(app)
      .post('/api/lesions')
      .set('Authorization', `Bearer ${providerToken()}`)
      .send({
        lesion_id: 'l1', visit_id: 'v1', patient_id: 'p1',
        body_location_x: 150, body_location_y: 200,
      });
    expect(res.status).toBe(422);
  });

  it('POST /api/lesions rejects an invalid action enum value (422)', async () => {
    mockSessionValid();
    const res = await request(app)
      .post('/api/lesions')
      .set('Authorization', `Bearer ${providerToken()}`)
      .send({
        lesion_id: 'l1', visit_id: 'v1', patient_id: 'p1',
        body_location_x: 50, body_location_y: 50,
        action: 'drop_tables',
      });
    expect(res.status).toBe(422);
  });

  it('PUT /api/lesions rejects an invalid biopsy_result enum (422)', async () => {
    mockSessionValid();
    const res = await request(app)
      .put('/api/lesions/l1')
      .set('Authorization', `Bearer ${providerToken()}`)
      .send({ biopsy_result: 'definitely_cancer' });
    expect(res.status).toBe(422);
  });

  it('PUT /api/lesions rejects a non-numeric size_mm (422)', async () => {
    mockSessionValid();
    const res = await request(app)
      .put('/api/lesions/l1')
      .set('Authorization', `Bearer ${providerToken()}`)
      .send({ size_mm: 'twelve point five' });
    expect(res.status).toBe(422);
  });

  it('POST /api/lesions rejects size_mm outside 0-500 range (422)', async () => {
    mockSessionValid();
    const res = await request(app)
      .post('/api/lesions')
      .set('Authorization', `Bearer ${providerToken()}`)
      .send({
        lesion_id: 'l1', visit_id: 'v1', patient_id: 'p1',
        body_location_x: 50, body_location_y: 50,
        size_mm: 9999,
      });
    expect(res.status).toBe(422);
  });
});

// =============================================================================
// 13. INPUT VALIDATION — VISITS
// =============================================================================
describe('Input Validation — Visits', () => {
  beforeEach(() => pool.query.mockReset());

  it('POST /api/visits rejects an invalid status enum value (422)', async () => {
    mockSessionValid();
    const res = await request(app)
      .post('/api/visits')
      .set('Authorization', `Bearer ${providerToken()}`)
      .send({
        visit_id: 'v1', patient_id: 'p1',
        visit_date: '2026-03-13', visit_type: 'follow-up', status: 'hacked',
      });
    expect(res.status).toBe(422);
  });

  it('POST /api/visits rejects an invalid visit_date (422)', async () => {
    mockSessionValid();
    const res = await request(app)
      .post('/api/visits')
      .set('Authorization', `Bearer ${providerToken()}`)
      .send({
        visit_id: 'v1', patient_id: 'p1',
        visit_date: 'not-a-date', visit_type: 'follow-up', status: 'in_progress',
      });
    expect(res.status).toBe(422);
  });

  it('PUT /api/visits rejects an invalid status enum value (422)', async () => {
    mockSessionValid();
    const res = await request(app)
      .put('/api/visits/v1')
      .set('Authorization', `Bearer ${providerToken()}`)
      .send({ status: 'supercharged' });
    expect(res.status).toBe(422);
  });
});

// =============================================================================
// 14. SYNC ROUTE SECURITY (Issue 5)
// =============================================================================
describe('Sync Route Security', () => {
  beforeEach(() => pool.query.mockReset());

  it('GET /api/sync/changes requires authentication (401)', async () => {
    const res = await request(app).get('/api/sync/changes?since=2026-01-01');
    expect(res.status).toBe(401);
  });

  it('POST /api/sync/push requires authentication (401)', async () => {
    const res = await request(app).post('/api/sync/push').send({ changes: [] });
    expect(res.status).toBe(401);
  });

  it('GET /api/sync/changes requires the "since" query parameter (400)', async () => {
    mockSessionValid();
    const res = await request(app)
      .get('/api/sync/changes')
      .set('Authorization', `Bearer ${providerToken()}`);
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/since/i);
  });

  it('GET /api/sync/changes rejects invalid entity_type via allowlist (400)', async () => {
    mockSessionValid();
    const res = await request(app)
      .get('/api/sync/changes?since=2026-01-01&entity_type=users')
      .set('Authorization', `Bearer ${providerToken()}`);
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/entity_type/i);
  });

  it('GET /api/sync/changes returns 200 for a valid allowlisted entity_type', async () => {
    mockSessionValid();
    pool.query.mockResolvedValueOnce({ rows: [] }); // sync_log query
    const res = await request(app)
      .get('/api/sync/changes?since=2026-01-01&entity_type=visit')
      .set('Authorization', `Bearer ${providerToken()}`);
    expect(res.status).toBe(200);
  });

  it('POST /api/sync/push rejects changes that is not an array (400)', async () => {
    mockSessionValid();
    const res = await request(app)
      .post('/api/sync/push')
      .set('Authorization', `Bearer ${providerToken()}`)
      .send({ changes: 'not-an-array' });
    expect(res.status).toBe(400);
  });

  it('POST /api/sync/push records conflict for invalid entity_type in a change', async () => {
    mockSessionValid();
    const client = { query: vi.fn().mockResolvedValue({ rows: [] }), release: vi.fn() };
    pool.connect.mockResolvedValueOnce(client);
    const res = await request(app)
      .post('/api/sync/push')
      .set('Authorization', `Bearer ${providerToken()}`)
      .send({ changes: [{ entity_type: 'users', entity_id: 'x', operation: 'create', data: {} }] });
    expect(res.status).toBe(200);
    expect(res.body.conflicts).toHaveLength(1);
    expect(res.body.conflicts[0].error).toMatch(/invalid entity_type/i);
  });

  it('POST /api/sync/push records conflict for invalid operation in a change', async () => {
    mockSessionValid();
    const client = { query: vi.fn().mockResolvedValue({ rows: [] }), release: vi.fn() };
    pool.connect.mockResolvedValueOnce(client);
    const res = await request(app)
      .post('/api/sync/push')
      .set('Authorization', `Bearer ${providerToken()}`)
      .send({ changes: [{ entity_type: 'visit', entity_id: 'v1', operation: 'drop', data: {} }] });
    expect(res.status).toBe(200);
    expect(res.body.conflicts).toHaveLength(1);
    expect(res.body.conflicts[0].error).toMatch(/invalid operation/i);
  });

  it('POST /api/sync/push records conflict for empty entity_id', async () => {
    mockSessionValid();
    const client = { query: vi.fn().mockResolvedValue({ rows: [] }), release: vi.fn() };
    pool.connect.mockResolvedValueOnce(client);
    const res = await request(app)
      .post('/api/sync/push')
      .set('Authorization', `Bearer ${providerToken()}`)
      .send({ changes: [{ entity_type: 'visit', entity_id: '', operation: 'create', data: {} }] });
    expect(res.status).toBe(200);
    expect(res.body.conflicts).toHaveLength(1);
  });
});

// =============================================================================
// 15. PHOTO SECURITY
// =============================================================================
describe('Photo Security', () => {
  beforeEach(() => pool.query.mockReset());

  it('GET /api/photos/:id requires authentication (401)', async () => {
    const res = await request(app).get('/api/photos/p1');
    expect(res.status).toBe(401);
  });

  it('GET /api/photos/:id sets Cache-Control: private, no-store for PHI protection', async () => {
    mockSessionValid();
    pool.query
      .mockResolvedValueOnce({ rows: [{ photo_data: Buffer.from('fake'), mime_type: 'image/jpeg' }] })
      .mockResolvedValueOnce({ rows: [] }); // audit log
    const res = await request(app)
      .get('/api/photos/p1')
      .set('Authorization', `Bearer ${providerToken()}`);
    expect(res.status).toBe(200);
    expect(res.headers['cache-control']).toBe('private, no-store');
  });

  it('GET /api/photos/:id sanitizes a dangerous MIME type (text/html) to image/jpeg', async () => {
    mockSessionValid();
    pool.query
      .mockResolvedValueOnce({ rows: [{ photo_data: Buffer.from('fake'), mime_type: 'text/html' }] })
      .mockResolvedValueOnce({ rows: [] }); // audit
    const res = await request(app)
      .get('/api/photos/p1')
      .set('Authorization', `Bearer ${providerToken()}`);
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/image\/jpeg/);
  });

  it('GET /api/photos/:id sanitizes application/javascript MIME type to image/jpeg', async () => {
    mockSessionValid();
    pool.query
      .mockResolvedValueOnce({ rows: [{ photo_data: Buffer.from('x'), mime_type: 'application/javascript' }] })
      .mockResolvedValueOnce({ rows: [] });
    const res = await request(app)
      .get('/api/photos/p1')
      .set('Authorization', `Bearer ${providerToken()}`);
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/image\/jpeg/);
  });

  it('POST /api/photos rejects an unsupported MIME type (400)', async () => {
    mockSessionValid();
    const res = await request(app)
      .post('/api/photos')
      .set('Authorization', `Bearer ${providerToken()}`)
      .send({
        photo_id: 'ph1', lesion_id: 'l1', visit_id: 'v1',
        photo_data: Buffer.from('test').toString('base64'),
        mime_type: 'application/octet-stream',
      });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/invalid mime_type/i);
  });

  it('POST /api/photos rejects requests with missing required fields (400)', async () => {
    mockSessionValid();
    const res = await request(app)
      .post('/api/photos')
      .set('Authorization', `Bearer ${providerToken()}`)
      .send({});
    expect(res.status).toBe(400);
  });
});

// =============================================================================
// 16. AUDIT LOGGING — PHI ACCESS TRACKING (Issue 16)
// =============================================================================
describe('Audit Logging — PHI Access Tracking', () => {
  beforeEach(() => pool.query.mockReset());

  it('viewing a patient record creates an audit_logs entry with user_id', async () => {
    mockSessionValid();
    pool.query
      .mockResolvedValueOnce({ rows: [{ patient_id: 'p1', first_name: 'T', last_name: 'U', date_of_birth: '1990-01-01', sex: 'male' }] })
      .mockResolvedValueOnce({ rows: [] }) // visits bulk load
      .mockResolvedValueOnce({ rows: [] }); // audit INSERT
    await request(app)
      .get('/api/patients/p1')
      .set('Authorization', `Bearer ${providerToken()}`);
    const auditCall = pool.query.mock.calls.find(c =>
      typeof c[0] === 'string' && c[0].toLowerCase().includes('audit_logs'),
    );
    expect(auditCall).toBeTruthy();
    // user_id 'prov-1' should appear in the params
    expect(auditCall[1]).toEqual(expect.arrayContaining([expect.stringContaining('prov-1')]));
  });

  it('viewing a photo creates an audit_logs entry with the photo_id', async () => {
    mockSessionValid();
    pool.query
      .mockResolvedValueOnce({ rows: [{ photo_data: Buffer.from('x'), mime_type: 'image/png' }] })
      .mockResolvedValueOnce({ rows: [] }); // audit INSERT
    await request(app)
      .get('/api/photos/ph-audit-test')
      .set('Authorization', `Bearer ${providerToken()}`);
    const auditCall = pool.query.mock.calls.find(c =>
      typeof c[0] === 'string' && c[0].toLowerCase().includes('audit_logs'),
    );
    expect(auditCall).toBeTruthy();
    expect(auditCall[1]).toContain('ph-audit-test');
  });

  it('an audit log DB failure does NOT break the primary request (non-fatal)', async () => {
    mockSessionValid();
    pool.query
      .mockResolvedValueOnce({ rows: [{ patient_id: 'p1', first_name: 'T', last_name: 'U', date_of_birth: '1990-01-01', sex: 'male' }] })
      .mockResolvedValueOnce({ rows: [] })                          // visits
      .mockRejectedValueOnce(new Error('Audit DB connection lost')); // audit fails
    const res = await request(app)
      .get('/api/patients/p1')
      .set('Authorization', `Bearer ${providerToken()}`);
    // The patient data should still be returned despite audit failure
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('patient_id', 'p1');
  });
});

// =============================================================================
// 17. DOCTYPE WEBHOOK SECURITY (Issue 6)
// =============================================================================
describe('DocuSign Webhook Security', () => {
  beforeEach(() => pool.query.mockReset());

  it('rejects webhook requests with a missing X-DocuSign-Signature-1 header (401)', async () => {
    const res = await request(app)
      .post('/api/provision/docusign-webhook')
      .send({ event: 'envelope-completed' });
    expect(res.status).toBe(401);
  });

  it('rejects webhook requests with an invalid signature (401)', async () => {
    const res = await request(app)
      .post('/api/provision/docusign-webhook')
      .set('X-DocuSign-Signature-1', 'tampered-invalid-signature-xxxx')
      .send({ event: 'envelope-completed' });
    expect(res.status).toBe(401);
  });
});

// =============================================================================
// 18. SETTINGS KEY SANITIZATION (Issue 26)
// =============================================================================
describe('Settings Key Sanitization — SQL Injection Prevention', () => {
  beforeEach(() => pool.query.mockReset());

  it('PUT /settings silently ignores keys containing special characters', async () => {
    mockSessionValid();
    const client = { query: vi.fn().mockResolvedValue({ rows: [] }), release: vi.fn() };
    pool.connect.mockResolvedValueOnce(client);
    const res = await request(app)
      .put('/api/settings')
      .set('Authorization', `Bearer ${adminToken()}`)
      .send({
        valid_key: 'ok',
        "'; DROP TABLE clinic_settings--": 'attack',
        'key with spaces': 'skip',
        'ke$y': 'skip',
      });
    expect(res.status).toBe(200);
    // Only valid_key should have triggered an INSERT
    const inserts = client.query.mock.calls.filter(c =>
      typeof c[0] === 'string' && c[0].includes('INSERT'),
    );
    expect(inserts).toHaveLength(1);
    expect(inserts[0][1][0]).toBe('valid_key');
  });

  it('PUT /settings with only malformed keys still returns 200 (keys silently skipped)', async () => {
    mockSessionValid();
    const client = { query: vi.fn().mockResolvedValue({ rows: [] }), release: vi.fn() };
    pool.connect.mockResolvedValueOnce(client);
    const res = await request(app)
      .put('/api/settings')
      .set('Authorization', `Bearer ${adminToken()}`)
      .send({ '!!!bad!!!': 'evil' });
    expect(res.status).toBe(200);
    const inserts = client.query.mock.calls.filter(c =>
      typeof c[0] === 'string' && c[0].includes('INSERT'),
    );
    expect(inserts).toHaveLength(0);
  });
});

// =============================================================================
// 19. PROVISION ROUTE INPUT VALIDATION
// =============================================================================
describe('Provision Route Input Validation', () => {
  beforeEach(() => pool.query.mockReset());

  it('POST /api/provision/clinic rejects an empty request body (422)', async () => {
    const res = await request(app).post('/api/provision/clinic').send({});
    expect(res.status).toBe(422);
  });

  it('POST /api/provision/clinic rejects NPI with non-digit characters (422)', async () => {
    const res = await request(app).post('/api/provision/clinic').send({
      clinic_name: 'Test', npi: 'ABCDEFGHIJ', admin_email: 'a@b.com',
      admin_name: 'A', admin_password: 'SecurePass1234!',
      baa_accepted: true, baa_signatory_name: 'Test',
    });
    expect(res.status).toBe(422);
  });

  it('POST /api/provision/clinic rejects admin_password shorter than 12 characters (422)', async () => {
    const res = await request(app).post('/api/provision/clinic').send({
      clinic_name: 'Test', npi: '1234567890', admin_email: 'a@b.com',
      admin_name: 'A', admin_password: 'Short1!',
      baa_accepted: true, baa_signatory_name: 'Test',
    });
    expect(res.status).toBe(422);
  });

  it('POST /api/provision/clinic rejects baa_accepted=false (422)', async () => {
    const res = await request(app).post('/api/provision/clinic').send({
      clinic_name: 'Test', npi: '1234567890', admin_email: 'a@b.com',
      admin_name: 'A', admin_password: 'SecurePass1234!',
      baa_accepted: false, baa_signatory_name: 'Test',
    });
    expect(res.status).toBe(422);
  });

  it('POST /api/provision/clinic rejects missing clinic_name (422)', async () => {
    const res = await request(app).post('/api/provision/clinic').send({
      npi: '1234567890', admin_email: 'a@b.com',
      admin_name: 'A', admin_password: 'SecurePass1234!',
      baa_accepted: true, baa_signatory_name: 'Test',
    });
    expect(res.status).toBe(422);
  });
});

// =============================================================================
// 20. GLOBAL SECURITY CONTROLS
// =============================================================================
describe('Global Security Controls', () => {
  beforeEach(() => pool.query.mockReset());

  it('/health endpoint is publicly accessible without authentication', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('status', 'ok');
  });

  it('helmet security headers are present on all responses (x-content-type-options)', async () => {
    const res = await request(app).get('/health');
    expect(res.headers['x-content-type-options']).toBe('nosniff');
  });

  it('404 handler returns a JSON error body with no stack trace', async () => {
    const res = await request(app).get('/api/nonexistent-endpoint-xyz');
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: 'Route not found' });
    expect(res.body).not.toHaveProperty('stack');
  });

  it('request body larger than 10 MB is rejected with 413', async () => {
    const hugeBody = 'x'.repeat(11 * 1024 * 1024);
    const res = await request(app)
      .post('/api/auth/login')
      .set('Content-Type', 'application/json')
      .send(`{"email":"${hugeBody}","password":"test"}`);
    expect(res.status).toBe(413);
  });

  it('last_login_at is written to the database on every successful login (Issue 23)', async () => {
    const hash = await bcrypt.hash('ValidPass1234!', 10);
    pool.query
      .mockResolvedValueOnce({
        rows: [{ id: 'u1', name: 'T', email: 't@e.com', role: 'ma',
                 password_hash: hash, mfa_enabled: false }],
      })
      .mockResolvedValueOnce({ rows: [] })  // UPDATE last_login_at
      .mockResolvedValueOnce({ rows: [] }); // INSERT session
    await request(app).post('/api/auth/login').send({ email: 't@e.com', password: 'ValidPass1234!' });
    const lastLoginCall = pool.query.mock.calls.find(c =>
      typeof c[0] === 'string' && c[0].includes('last_login_at'),
    );
    expect(lastLoginCall).toBeTruthy();
    expect(lastLoginCall[1]).toContain('u1');
  });
});

// =============================================================================
// 21. AUTHENTICATION REQUIRED — ALL PHI ENDPOINTS
//     Every route that handles Protected Health Information (PHI) must return
//     401 when called without an Authorization header.
// =============================================================================
describe('Authentication Required — Every PHI Endpoint', () => {
  const phiEndpoints = [
    ['GET',    '/api/patients'],
    ['GET',    '/api/patients/p1'],
    ['POST',   '/api/patients'],
    ['PUT',    '/api/patients/p1'],
    ['DELETE', '/api/patients/p1'],
    ['GET',    '/api/visits/v1'],
    ['POST',   '/api/visits'],
    ['PUT',    '/api/visits/v1'],
    ['DELETE', '/api/visits/v1'],
    ['POST',   '/api/lesions'],
    ['PUT',    '/api/lesions/l1'],
    ['DELETE', '/api/lesions/l1'],
    ['GET',    '/api/photos/p1'],
    ['POST',   '/api/photos'],
    ['DELETE', '/api/photos/p1'],
    ['GET',    '/api/sync/changes?since=2026-01-01'],
    ['POST',   '/api/sync/push'],
    ['GET',    '/api/schedule/today'],
    ['GET',    '/api/analytics'],
    ['GET',    '/api/settings'],
    ['PUT',    '/api/settings'],
    ['GET',    '/api/admin/users'],
    ['POST',   '/api/admin/users'],
    ['PATCH',  '/api/admin/users/u1'],
    ['DELETE', '/api/admin/users/u1'],
  ];

  for (const [method, path] of phiEndpoints) {
    it(`${method} ${path} → 401 without Authorization header`, async () => {
      const res = await request(app)[method.toLowerCase()](path).send({});
      expect(res.status).toBe(401);
    });
  }
});
