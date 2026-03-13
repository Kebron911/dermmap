/**
 * Integration tests for the visits routes.
 *
 * Verifies that the N+1 fix works (single bulk photo query) and
 * that all routes require authentication.
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
// GET /api/visits/:visitId
// ---------------------------------------------------------------------------
describe('GET /api/visits/:visitId', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 401 when unauthenticated', async () => {
    const res = await request(app).get('/api/visits/v-1');
    expect(res.status).toBe(401);
  });

  it('returns 404 when visit does not exist', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] });
    const token = makeToken();
    const res = await request(app)
      .get('/api/visits/nonexistent')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(404);
  });

  it('returns visit with lesions and bulk-fetched photos (no N+1)', async () => {
    const token = makeToken();
    pool.query
      .mockResolvedValueOnce({ rows: [{ visit_id: 'v-1', status: 'in_progress' }] })
      .mockResolvedValueOnce({
        rows: [
          { lesion_id: 'l-1', visit_id: 'v-1' },
          { lesion_id: 'l-2', visit_id: 'v-1' },
        ],
      })
      .mockResolvedValueOnce({
        // Bulk photo query — both lesions' photos in one result set
        rows: [
          { lesion_id: 'l-1', photo_id: 'ph-1' },
          { lesion_id: 'l-1', photo_id: 'ph-2' },
          { lesion_id: 'l-2', photo_id: 'ph-3' },
        ],
      });

    const res = await request(app)
      .get('/api/visits/v-1')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.lesions).toHaveLength(2);
    expect(res.body.lesions[0].photos).toEqual(['/api/photos/ph-1', '/api/photos/ph-2']);
    expect(res.body.lesions[1].photos).toEqual(['/api/photos/ph-3']);

    // 4 DB queries: visit + lesions + bulk photos + audit log (was 3 before audit logging)
    expect(pool.query).toHaveBeenCalledTimes(4);
  });

  it('handles a visit with no lesions without querying photos', async () => {
    const token = makeToken();
    pool.query
      .mockResolvedValueOnce({ rows: [{ visit_id: 'v-empty', status: 'in_progress' }] })
      .mockResolvedValueOnce({ rows: [] });

    const res = await request(app)
      .get('/api/visits/v-empty')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.lesions).toHaveLength(0);
    // Only 3 queries: visit + lesions + audit log (no photo query needed when no lesions)
    expect(pool.query).toHaveBeenCalledTimes(3);
  });
});
