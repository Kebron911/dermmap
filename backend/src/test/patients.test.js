/**
 * Integration tests for the patients routes.
 *
 * Verifies authentication gates, location tenancy isolation,
 * input validation, and basic CRUD behaviour.
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

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeToken(payload = {}) {
  return jwt.sign(
    { id: 'user-1', email: 'ma@example.com', role: 'ma', location_id: 'loc-001', ...payload },
    process.env.JWT_SECRET,
    { algorithm: 'HS256', expiresIn: '1h' },
  );
}

const VALID_PATIENT = {
  patient_id: 'p-new-001',
  mrn: 'MRN-NEW-001',
  first_name: 'Alice',
  last_name: 'Tester',
  date_of_birth: '1985-06-15',
  sex: 'female',
  skin_type: 'II',
};

// ---------------------------------------------------------------------------
// GET /api/patients — list
// ---------------------------------------------------------------------------

describe('GET /api/patients', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 401 when unauthenticated', async () => {
    const res = await request(app).get('/api/patients');
    expect(res.status).toBe(401);
  });

  it('returns 200 with empty array when no patients exist', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] });
    const token = makeToken();
    const res = await request(app)
      .get('/api/patients')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it('includes location_id filter in query for non-privileged users (MA)', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] });
    const token = makeToken({ role: 'ma', location_id: 'loc-001' });
    await request(app)
      .get('/api/patients')
      .set('Authorization', `Bearer ${token}`);
    // Verify the query was called with location_id as a parameter
    const [[sql, params]] = pool.query.mock.calls;
    expect(sql).toMatch(/location_id/i);
    expect(params).toContain('loc-001');
  });

  it('does NOT apply location filter for admin role', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] });
    const token = makeToken({ role: 'admin', location_id: 'loc-001' });
    await request(app)
      .get('/api/patients')
      .set('Authorization', `Bearer ${token}`);
    const [[sql]] = pool.query.mock.calls;
    // Admin skips the location filter — the WHERE clause resolves to $1=true
    expect(sql).not.toMatch(/location_id = \$2/);
  });

  it('applies search filter when ?search param is provided', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] });
    const token = makeToken();
    await request(app)
      .get('/api/patients?search=Smith')
      .set('Authorization', `Bearer ${token}`);
    const [[sql, params]] = pool.query.mock.calls;
    expect(sql).toMatch(/LIKE/i);
    expect(params).toContain('%Smith%');
  });
});

// ---------------------------------------------------------------------------
// POST /api/patients — create
// ---------------------------------------------------------------------------

describe('POST /api/patients', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 401 when unauthenticated', async () => {
    const res = await request(app).post('/api/patients').send(VALID_PATIENT);
    expect(res.status).toBe(401);
  });

  it('returns 422 when required fields are missing', async () => {
    const token = makeToken();
    const res = await request(app)
      .post('/api/patients')
      .set('Authorization', `Bearer ${token}`)
      .send({});
    expect(res.status).toBe(422);
    expect(res.body).toHaveProperty('error', 'Validation failed');
    expect(res.body.details).toBeInstanceOf(Array);
  });

  it('returns 422 when date_of_birth is not a valid ISO 8601 date', async () => {
    const token = makeToken();
    const res = await request(app)
      .post('/api/patients')
      .set('Authorization', `Bearer ${token}`)
      .send({ ...VALID_PATIENT, date_of_birth: 'not-a-date' });
    expect(res.status).toBe(422);
  });

  it('returns 422 when sex is not one of the allowed values', async () => {
    const token = makeToken();
    const res = await request(app)
      .post('/api/patients')
      .set('Authorization', `Bearer ${token}`)
      .send({ ...VALID_PATIENT, sex: 'unknown' });
    expect(res.status).toBe(422);
  });

  it('creates patient and returns 201 on valid input', async () => {
    const token = makeToken();
    pool.query.mockResolvedValueOnce({ rows: [VALID_PATIENT] });
    const res = await request(app)
      .post('/api/patients')
      .set('Authorization', `Bearer ${token}`)
      .send(VALID_PATIENT);
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ patient_id: 'p-new-001' });
  });
});

// ---------------------------------------------------------------------------
// PUT /api/patients/:patientId — update
// ---------------------------------------------------------------------------

describe('PUT /api/patients/:patientId', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 401 when unauthenticated', async () => {
    const res = await request(app).put('/api/patients/p-001').send({});
    expect(res.status).toBe(401);
  });

  it('returns 422 when email is malformed', async () => {
    const token = makeToken();
    const res = await request(app)
      .put('/api/patients/p-001')
      .set('Authorization', `Bearer ${token}`)
      .send({ email: 'not-an-email' });
    expect(res.status).toBe(422);
  });

  it('returns 404 when patient does not exist', async () => {
    const token = makeToken();
    pool.query.mockResolvedValueOnce({ rows: [] });
    const res = await request(app)
      .put('/api/patients/nonexistent')
      .set('Authorization', `Bearer ${token}`)
      .send({ first_name: 'Updated' });
    expect(res.status).toBe(404);
  });
});

// ---------------------------------------------------------------------------
// DELETE /api/patients/:patientId — admin/manager only
// ---------------------------------------------------------------------------

describe('DELETE /api/patients/:patientId', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 401 when unauthenticated', async () => {
    const res = await request(app).delete('/api/patients/p-001');
    expect(res.status).toBe(401);
  });

  it('returns 403 when called by an MA (not admin/manager)', async () => {
    const token = makeToken({ role: 'ma' });
    const res = await request(app)
      .delete('/api/patients/p-001')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(403);
  });

  it('returns 403 when called by a provider', async () => {
    const token = makeToken({ role: 'provider' });
    const res = await request(app)
      .delete('/api/patients/p-001')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(403);
  });

  it('returns 404 when admin tries to delete a non-existent patient', async () => {
    const token = makeToken({ role: 'admin' });
    pool.query.mockResolvedValueOnce({ rows: [] });
    const res = await request(app)
      .delete('/api/patients/nonexistent')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(404);
  });
});
