/**
 * Integration tests for the auth routes.
 *
 * Database pool is mocked per-file via vi.mock (hoisted before all imports).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// --- Mock must be declared before any import that transitively loads pool ---
vi.mock('../db/pool.js', () => {
  const query = vi.fn();
  return {
    default: {
      query,
      connect: vi.fn().mockResolvedValue({ query, release: vi.fn() }),
    },
  };
});

import request from 'supertest';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import pool from '../db/pool.js';
import app from '../server.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function makeToken(payload = {}, opts = {}) {
  return jwt.sign(
    { id: 'user-1', email: 'test@example.com', role: 'provider', ...payload },
    process.env.JWT_SECRET,
    { algorithm: 'HS256', expiresIn: '1h', ...opts }
  );
}

// ---------------------------------------------------------------------------
// POST /api/auth/login
// ---------------------------------------------------------------------------
describe('POST /api/auth/login', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 400 when body is missing email or password', async () => {
    const res = await request(app).post('/api/auth/login').send({});
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  it('returns 401 when user is not found', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] });
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'unknown@example.com', password: 'pass' });
    expect(res.status).toBe(401);
  });

  it('returns 401 when password is incorrect', async () => {
    const hash = await bcrypt.hash('correct-password', 10);
    pool.query.mockResolvedValueOnce({
      rows: [{ id: 'u1', name: 'Test', email: 'test@example.com', role: 'ma', password_hash: hash }],
    });
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'test@example.com', password: 'wrong-password' });
    expect(res.status).toBe(401);
  });

  it('returns a JWT and user on successful login', async () => {
    const hash = await bcrypt.hash('correct-password', 10);
    pool.query.mockResolvedValueOnce({
      rows: [{ id: 'u1', name: 'Test User', email: 'test@example.com', role: 'ma', password_hash: hash }],
    });
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'test@example.com', password: 'correct-password' });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('token');
    expect(res.body.user).toMatchObject({ email: 'test@example.com', role: 'ma' });

    // Verify returned JWT uses HS256
    const payload = jwt.verify(res.body.token, process.env.JWT_SECRET, { algorithms: ['HS256'] });
    expect(payload).toHaveProperty('id', 'u1');
  });

  it('rejects tokens signed with alg:none', async () => {
    const header  = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url');
    const bodySeg = Buffer.from(JSON.stringify({ id: 'attacker', role: 'admin' })).toString('base64url');
    const noneToken = `${header}.${bodySeg}.`;

    const res = await request(app)
      .get('/api/auth/verify')
      .set('Authorization', `Bearer ${noneToken}`);
    expect(res.status).toBe(403);
  });
});

// ---------------------------------------------------------------------------
// POST /api/auth/register  (admin/manager gate)
// ---------------------------------------------------------------------------
describe('POST /api/auth/register', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 401 when called without a token', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'New', email: 'new@example.com', password: 'SecurePass123!', role: 'ma' });
    expect(res.status).toBe(401);
  });

  it('returns 403 when called by a non-admin/manager role', async () => {
    const token = makeToken({ role: 'ma' });
    const res = await request(app)
      .post('/api/auth/register')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'New', email: 'new@example.com', password: 'SecurePass123!', role: 'ma' });
    expect(res.status).toBe(403);
  });

  it('creates a user when called by a manager', async () => {
    const token = makeToken({ role: 'manager' });
    pool.query
      .mockResolvedValueOnce({ rows: [] })   // check existing user → none
      .mockResolvedValueOnce({ rows: [] });  // INSERT → success

    const res = await request(app)
      .post('/api/auth/register')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'New MA', email: 'new@example.com', password: 'SecurePass123!', role: 'ma' });
    expect(res.status).toBe(201);
    expect(res.body.user).toMatchObject({ email: 'new@example.com', role: 'ma' });
  });

  it('rejects passwords shorter than 12 characters', async () => {
    const token = makeToken({ role: 'manager' });
    const res = await request(app)
      .post('/api/auth/register')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'New', email: 'new@example.com', password: 'short', role: 'ma' });
    expect(res.status).toBe(400);
  });
});

// ---------------------------------------------------------------------------
// GET /api/auth/verify
// ---------------------------------------------------------------------------
describe('GET /api/auth/verify', () => {
  it('returns user info for a valid HS256 token', async () => {
    const token = makeToken();
    const res = await request(app)
      .get('/api/auth/verify')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('valid', true);
  });

  it('returns 401 when no token provided', async () => {
    const res = await request(app).get('/api/auth/verify');
    expect(res.status).toBe(401);
  });

  it('returns 403 for an expired token', async () => {
    const token = makeToken({}, { expiresIn: '-1s' });
    const res = await request(app)
      .get('/api/auth/verify')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(403);
  });
});


// ---------------------------------------------------------------------------
// POST /api/auth/login
// ---------------------------------------------------------------------------
describe('POST /api/auth/login', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 400 when body is missing email or password', async () => {
    const res = await request(app).post('/api/auth/login').send({});
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  it('returns 401 when user is not found', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] });
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'unknown@example.com', password: 'pass' });
    expect(res.status).toBe(401);
  });

  it('returns 401 when password is incorrect', async () => {
    const hash = await bcrypt.hash('correct-password', 10);
    pool.query.mockResolvedValueOnce({
      rows: [{ id: 'u1', name: 'Test', email: 'test@example.com', role: 'ma', password_hash: hash }],
    });
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'test@example.com', password: 'wrong-password' });
    expect(res.status).toBe(401);
  });

  it('returns a JWT and user on successful login', async () => {
    const hash = await bcrypt.hash('correct-password', 10);
    pool.query.mockResolvedValueOnce({
      rows: [{ id: 'u1', name: 'Test User', email: 'test@example.com', role: 'ma', password_hash: hash }],
    });
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'test@example.com', password: 'correct-password' });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('token');
    expect(res.body.user).toMatchObject({ email: 'test@example.com', role: 'ma' });

    // Verify the returned JWT is HS256 only
    const payload = jwt.verify(res.body.token, process.env.JWT_SECRET, { algorithms: ['HS256'] });
    expect(payload).toHaveProperty('id', 'u1');
  });

  it('rejects tokens signed with alg:none', async () => {
    // Craft a token without a signature
    const header  = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url');
    const bodySeg = Buffer.from(JSON.stringify({ id: 'attacker', role: 'admin' })).toString('base64url');
    const noneToken = `${header}.${bodySeg}.`;

    const res = await request(app)
      .get('/api/auth/verify')
      .set('Authorization', `Bearer ${noneToken}`);
    expect(res.status).toBe(403);
  });
});

// ---------------------------------------------------------------------------
// POST /api/auth/register  (admin/manager gate)
// ---------------------------------------------------------------------------
describe('POST /api/auth/register', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 401 when called without a token', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'New', email: 'new@example.com', password: 'SecurePass123!', role: 'ma' });
    expect(res.status).toBe(401);
  });

  it('returns 403 when called by a non-admin/manager role', async () => {
    const token = makeToken({ role: 'ma' });
    const res = await request(app)
      .post('/api/auth/register')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'New', email: 'new@example.com', password: 'SecurePass123!', role: 'ma' });
    expect(res.status).toBe(403);
  });

  it('creates a user when called by a manager', async () => {
    const token = makeToken({ role: 'manager' });
    pool.query
      .mockResolvedValueOnce({ rows: [] })         // check existing user → none
      .mockResolvedValueOnce({ rows: [] });          // INSERT → success

    const res = await request(app)
      .post('/api/auth/register')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'New MA', email: 'new@example.com', password: 'SecurePass123!', role: 'ma' });
    expect(res.status).toBe(201);
    expect(res.body.user).toMatchObject({ email: 'new@example.com', role: 'ma' });
  });

  it('rejects passwords shorter than 12 characters', async () => {
    const token = makeToken({ role: 'manager' });
    const res = await request(app)
      .post('/api/auth/register')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'New', email: 'new@example.com', password: 'short', role: 'ma' });
    expect(res.status).toBe(400);
  });
});

// ---------------------------------------------------------------------------
// GET /api/auth/verify
// ---------------------------------------------------------------------------
describe('GET /api/auth/verify', () => {
  it('returns user info for a valid HS256 token', async () => {
    const token = makeToken();
    const res = await request(app)
      .get('/api/auth/verify')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('valid', true);
  });

  it('returns 401 when no token provided', async () => {
    const res = await request(app).get('/api/auth/verify');
    expect(res.status).toBe(401);
  });

  it('returns 403 for an expired token', async () => {
    const token = makeToken({}, { expiresIn: '-1s' });
    const res = await request(app)
      .get('/api/auth/verify')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(403);
  });
});
