/**
 * Integration tests for the lesions routes.
 *
 * Verifies authentication requirements and input validation
 * (express-validator rules applied to POST/PUT).
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
    { id: 'user-1', email: 'provider@example.com', role: 'provider', ...payload },
    process.env.JWT_SECRET,
    { algorithm: 'HS256', expiresIn: '1h' }
  );
}

// ---------------------------------------------------------------------------
// POST /api/lesions — create with validation
// ---------------------------------------------------------------------------
describe('POST /api/lesions', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 401 when unauthenticated', async () => {
    const res = await request(app).post('/api/lesions').send({});
    expect(res.status).toBe(401);
  });

  it('returns 422 when required fields are missing', async () => {
    const token = makeToken();
    const res = await request(app)
      .post('/api/lesions')
      .set('Authorization', `Bearer ${token}`)
      .send({});
    expect(res.status).toBe(422);
    expect(res.body).toHaveProperty('error', 'Validation failed');
    expect(res.body.details).toBeInstanceOf(Array);
  });

  it('returns 422 when coordinates are out of range', async () => {
    const token = makeToken();
    const res = await request(app)
      .post('/api/lesions')
      .set('Authorization', `Bearer ${token}`)
      .send({
        lesion_id: 'l-1',
        visit_id: 'v-1',
        patient_id: 'p-1',
        body_location_x: 150, // out of 0–100 range
        body_location_y: 50,
      });
    expect(res.status).toBe(422);
  });

  it('returns 422 when action enum is invalid', async () => {
    const token = makeToken();
    const res = await request(app)
      .post('/api/lesions')
      .set('Authorization', `Bearer ${token}`)
      .send({
        lesion_id: 'l-1',
        visit_id: 'v-1',
        patient_id: 'p-1',
        body_location_x: 50,
        body_location_y: 50,
        action: 'not_a_valid_action',
      });
    expect(res.status).toBe(422);
  });

  it('creates lesion when valid data is provided', async () => {
    const token = makeToken();
    const fakeLesion = {
      lesion_id: 'l-1', visit_id: 'v-1', patient_id: 'p-1',
      body_location_x: 50, body_location_y: 45,
      body_region: 'trunk', body_view: 'anterior',
      size_mm: 5, action: 'monitor', biopsy_result: 'na',
      clinical_notes: '', pathology_notes: '',
    };
    // ownership check query, then INSERT
    pool.query.mockResolvedValueOnce({ rows: [{ visit_id: 'v-1' }] });
    pool.query.mockResolvedValueOnce({ rows: [fakeLesion] });

    const res = await request(app)
      .post('/api/lesions')
      .set('Authorization', `Bearer ${token}`)
      .send(fakeLesion);
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ lesion_id: 'l-1', photos: [] });
  });
});

// ---------------------------------------------------------------------------
// PUT /api/lesions/:id — update with validation
// ---------------------------------------------------------------------------
describe('PUT /api/lesions/:lesionId', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 401 when unauthenticated', async () => {
    const res = await request(app).put('/api/lesions/l-1').send({});
    expect(res.status).toBe(401);
  });

  it('returns 422 when size_mm is a string', async () => {
    const token = makeToken();
    const res = await request(app)
      .put('/api/lesions/l-1')
      .set('Authorization', `Bearer ${token}`)
      .send({ size_mm: 'abc' });
    expect(res.status).toBe(422);
  });

  it('returns 422 when biopsy_result is an unknown enum value', async () => {
    const token = makeToken();
    const res = await request(app)
      .put('/api/lesions/l-1')
      .set('Authorization', `Bearer ${token}`)
      .send({ biopsy_result: 'unknown_value' });
    expect(res.status).toBe(422);
  });

  it('updates lesion with valid data', async () => {
    const token = makeToken();
    const updated = { lesion_id: 'l-1', size_mm: 8, biopsy_result: 'benign' };
    pool.query.mockResolvedValueOnce({ rows: [updated] });

    const res = await request(app)
      .put('/api/lesions/l-1')
      .set('Authorization', `Bearer ${token}`)
      .send({ size_mm: 8, biopsy_result: 'benign' });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ size_mm: 8 });
  });
});

