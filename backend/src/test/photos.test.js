/**
 * Integration tests for the photos routes.
 *
 * Verifies the critical PHI-protection requirement: the GET endpoint
 * must require a valid authentication token.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

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
import jwt from 'jsonwebtoken';
import pool from '../db/pool.js';
import app from '../server.js';

function makeToken(payload = {}) {
  return jwt.sign(
    { id: 'user-1', email: 'test@example.com', role: 'provider', ...payload },
    process.env.JWT_SECRET,
    { algorithm: 'HS256', expiresIn: '1h' }
  );
}

// ---------------------------------------------------------------------------
// GET /api/photos/:photoId — PHI auth gate
// ---------------------------------------------------------------------------
describe('GET /api/photos/:photoId', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 401 when no token is provided', async () => {
    const res = await request(app).get('/api/photos/photo-123');
    expect(res.status).toBe(401);
  });

  it('returns 403 when an invalid token is provided', async () => {
    const res = await request(app)
      .get('/api/photos/photo-123')
      .set('Authorization', 'Bearer invalid.token.here');
    expect(res.status).toBe(403);
  });

  it('returns 404 when photo does not exist (authenticated)', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] });
    const token = makeToken();
    const res = await request(app)
      .get('/api/photos/nonexistent')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(404);
  });

  it('returns photo binary with private Cache-Control when authenticated', async () => {
    const fakeBuffer = Buffer.from('fake-image-data');
    pool.query.mockResolvedValueOnce({
      rows: [{ photo_data: fakeBuffer, mime_type: 'image/jpeg' }],
    });
    const token = makeToken();
    const res = await request(app)
      .get('/api/photos/photo-abc')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/image\/jpeg/);
    // PHI must never be cached by a shared/public cache
    expect(res.headers['cache-control']).toContain('private');
    expect(res.headers['cache-control']).toContain('no-store');
  });
});

// ---------------------------------------------------------------------------
// POST /api/photos — upload requires auth
// ---------------------------------------------------------------------------
describe('POST /api/photos', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 401 when no token is provided', async () => {
    const res = await request(app).post('/api/photos').send({});
    expect(res.status).toBe(401);
  });

  it('returns 400 when required fields are missing', async () => {
    const token = makeToken();
    const res = await request(app)
      .post('/api/photos')
      .set('Authorization', `Bearer ${token}`)
      .send({ photo_id: 'p1' }); // missing lesion_id, visit_id, photo_data
    expect(res.status).toBe(400);
  });
});


// ---------------------------------------------------------------------------
// GET /api/photos/:photoId — PHI auth gate
// ---------------------------------------------------------------------------
describe('GET /api/photos/:photoId', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 401 when no token is provided', async () => {
    const res = await request(app).get('/api/photos/photo-123');
    expect(res.status).toBe(401);
  });

  it('returns 403 when an invalid token is provided', async () => {
    const res = await request(app)
      .get('/api/photos/photo-123')
      .set('Authorization', 'Bearer invalid.token.here');
    expect(res.status).toBe(403);
  });

  it('returns 404 when photo does not exist (authenticated)', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] });
    const token = makeToken();
    const res = await request(app)
      .get('/api/photos/nonexistent')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(404);
  });

  it('returns photo binary with private Cache-Control when authenticated', async () => {
    const fakeBuffer = Buffer.from('fake-image-data');
    pool.query.mockResolvedValueOnce({
      rows: [{ photo_data: fakeBuffer, mime_type: 'image/jpeg' }],
    });
    const token = makeToken();
    const res = await request(app)
      .get('/api/photos/photo-abc')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/image\/jpeg/);
    // PHI must never be cached by a shared/public cache
    expect(res.headers['cache-control']).toContain('private');
    expect(res.headers['cache-control']).toContain('no-store');
  });
});

// ---------------------------------------------------------------------------
// POST /api/photos — upload requires auth
// ---------------------------------------------------------------------------
describe('POST /api/photos', () => {
  it('returns 401 when no token is provided', async () => {
    const res = await request(app).post('/api/photos').send({});
    expect(res.status).toBe(401);
  });

  it('returns 400 when required fields are missing', async () => {
    const token = makeToken();
    const res = await request(app)
      .post('/api/photos')
      .set('Authorization', `Bearer ${token}`)
      .send({ photo_id: 'p1' }); // missing lesion_id, visit_id, photo_data
    expect(res.status).toBe(400);
  });
});
