/**
 * Integration tests for the provision routes.
 *
 * Covers the HIPAA-critical self-signup flow:
 *   POST /api/provision/clinic    — atomic clinic + user + BAA creation
 *   POST /api/provision/docusign-webhook — DocuSign activation callback
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createHmac } from 'crypto';

// Bypass the tight per-IP rate limiter so all test cases can execute without 429
vi.mock('express-rate-limit', () => ({
  default: () => (_req, _res, next) => next(),
}));

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
import pool from '../db/pool.js';
import app from '../server.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const VALID_CLINIC = {
  clinic_name: 'Riverside Dermatology',
  npi: '1234567890',
  admin_name: 'Dr. Jane Smith',
  admin_email: 'jane@riverside-derm.com',
  admin_password: 'SecureHIPAA12!',
  baa_accepted: true,
  baa_signatory_name: 'Dr. Jane Smith',
};

/** Mock an atomic transaction that succeeds end-to-end */
function mockSuccessfulProvision() {
  pool.query
    .mockResolvedValueOnce({})                      // BEGIN
    .mockResolvedValueOnce({ rows: [] })             // no dup NPI
    .mockResolvedValueOnce({ rows: [] })             // no dup email
    .mockResolvedValueOnce({})                       // INSERT clinic_locations
    .mockResolvedValueOnce({})                       // INSERT users
    .mockResolvedValueOnce({})                       // INSERT baa_records
    .mockResolvedValueOnce({});                      // COMMIT
}

// ---------------------------------------------------------------------------
// POST /api/provision/clinic — validation
// ---------------------------------------------------------------------------

describe('POST /api/provision/clinic — input validation', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 422 when body is empty', async () => {
    const res = await request(app).post('/api/provision/clinic').send({});
    expect(res.status).toBe(422);
    expect(res.body).toHaveProperty('error', 'Validation failed');
    expect(res.body.details).toBeInstanceOf(Array);
  });

  it('returns 422 when NPI is too short', async () => {
    const res = await request(app)
      .post('/api/provision/clinic')
      .send({ ...VALID_CLINIC, npi: '12345' });
    expect(res.status).toBe(422);
  });

  it('returns 422 when NPI is too long', async () => {
    const res = await request(app)
      .post('/api/provision/clinic')
      .send({ ...VALID_CLINIC, npi: '12345678901' });
    expect(res.status).toBe(422);
  });

  it('returns 422 when NPI contains non-digit characters', async () => {
    const res = await request(app)
      .post('/api/provision/clinic')
      .send({ ...VALID_CLINIC, npi: '123456789X' });
    expect(res.status).toBe(422);
  });

  it('returns 422 when password is shorter than 12 characters', async () => {
    const res = await request(app)
      .post('/api/provision/clinic')
      .send({ ...VALID_CLINIC, admin_password: 'Short1!' });
    expect(res.status).toBe(422);
    expect(JSON.stringify(res.body)).toMatch(/12|HIPAA/i);
  });

  it('returns 422 when baa_accepted is false', async () => {
    const res = await request(app)
      .post('/api/provision/clinic')
      .send({ ...VALID_CLINIC, baa_accepted: false });
    expect(res.status).toBe(422);
  });

  it('returns 422 when baa_accepted is missing', async () => {
    const { baa_accepted: _, ...body } = VALID_CLINIC;
    const res = await request(app).post('/api/provision/clinic').send(body);
    expect(res.status).toBe(422);
  });

  it('returns 422 when admin_email is malformed', async () => {
    const res = await request(app)
      .post('/api/provision/clinic')
      .send({ ...VALID_CLINIC, admin_email: 'not-an-email' });
    expect(res.status).toBe(422);
  });

  it('returns 422 when clinic_name is missing', async () => {
    const { clinic_name: _, ...body } = VALID_CLINIC;
    const res = await request(app).post('/api/provision/clinic').send(body);
    expect(res.status).toBe(422);
  });

  it('returns 422 when baa_signatory_name is missing', async () => {
    const { baa_signatory_name: _, ...body } = VALID_CLINIC;
    const res = await request(app).post('/api/provision/clinic').send(body);
    expect(res.status).toBe(422);
  });
});

// ---------------------------------------------------------------------------
// POST /api/provision/clinic — business logic
// ---------------------------------------------------------------------------

describe('POST /api/provision/clinic — business logic', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 409 when NPI already belongs to a registered clinic', async () => {
    pool.query
      .mockResolvedValueOnce({})                                         // BEGIN
      .mockResolvedValueOnce({ rows: [{ location_id: 'existing-loc' }] }) // dup NPI
      .mockResolvedValueOnce({});                                        // ROLLBACK

    const res = await request(app).post('/api/provision/clinic').send(VALID_CLINIC);
    expect(res.status).toBe(409);
    expect(res.body.error).toMatch(/NPI.*registered/i);
  });

  it('returns 409 when admin email is already in use', async () => {
    pool.query
      .mockResolvedValueOnce({})                              // BEGIN
      .mockResolvedValueOnce({ rows: [] })                    // no dup NPI
      .mockResolvedValueOnce({ rows: [{ id: 'u-existing' }] }) // dup email
      .mockResolvedValueOnce({});                             // ROLLBACK

    const res = await request(app).post('/api/provision/clinic').send(VALID_CLINIC);
    expect(res.status).toBe(409);
    expect(res.body.error).toMatch(/email.*exists/i);
  });

  it('returns 201 with location_id on successful registration', async () => {
    mockSuccessfulProvision();
    const res = await request(app).post('/api/provision/clinic').send(VALID_CLINIC);
    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('location_id');
    expect(res.body).toHaveProperty('message');
  });

  it('does NOT leak password or hash in the 201 response', async () => {
    mockSuccessfulProvision();
    const res = await request(app).post('/api/provision/clinic').send(VALID_CLINIC);
    expect(res.status).toBe(201);
    const body = JSON.stringify(res.body);
    expect(body).not.toContain(VALID_CLINIC.admin_password);
    expect(body).not.toContain('password_hash');
  });

  it('returns 500 and rolls back when a DB error occurs mid-transaction', async () => {
    pool.query
      .mockResolvedValueOnce({})            // BEGIN
      .mockResolvedValueOnce({ rows: [] })  // no dup NPI
      .mockResolvedValueOnce({ rows: [] })  // no dup email
      .mockRejectedValueOnce(new Error('DB error')) // INSERT clinic_locations fails
      .mockResolvedValueOnce({});           // ROLLBACK

    const res = await request(app).post('/api/provision/clinic').send(VALID_CLINIC);
    expect(res.status).toBe(500);
  });

  it('performs exactly 7 DB interactions for a successful provision', async () => {
    mockSuccessfulProvision();
    await request(app).post('/api/provision/clinic').send(VALID_CLINIC);
    // BEGIN + NPI check + email check + INSERT clinic + INSERT user + INSERT baa + COMMIT
    expect(pool.query).toHaveBeenCalledTimes(7);
  });
});

// ---------------------------------------------------------------------------
// POST /api/provision/docusign-webhook
// ---------------------------------------------------------------------------

// The webhook secret injected by vitest.config.js
const TEST_WEBHOOK_SECRET = 'test-webhook-secret-for-vitest';

/** Compute the HMAC-SHA256 signature for a given request body object. */
function webhookSig(body) {
  const raw = typeof body === 'string' ? body : JSON.stringify(body);
  return createHmac('sha256', TEST_WEBHOOK_SECRET).update(raw).digest('base64');
}

describe('POST /api/provision/docusign-webhook', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 503 when DOCUSIGN_CONNECT_SECRET is not configured', async () => {
    vi.stubEnv('DOCUSIGN_CONNECT_SECRET', '');
    try {
      const res = await request(app)
        .post('/api/provision/docusign-webhook')
        .send({ status: 'sent', envelopeId: 'env-001' });
      expect(res.status).toBe(503);
    } finally {
      vi.unstubAllEnvs();
    }
  });

  it('returns 401 when X-DocuSign-Signature-1 header is missing', async () => {
    const res = await request(app)
      .post('/api/provision/docusign-webhook')
      .send({ status: 'sent', envelopeId: 'env-001' });
    expect(res.status).toBe(401);
  });

  it('returns 401 when X-DocuSign-Signature-1 is wrong', async () => {
    const res = await request(app)
      .post('/api/provision/docusign-webhook')
      .set('X-DocuSign-Signature-1', 'bm90YXZhbGlkc2lnbmF0dXJl')
      .send({ status: 'sent', envelopeId: 'env-001' });
    expect(res.status).toBe(401);
  });

  it('returns 200 for non-completed envelope status (e.g. "sent")', async () => {
    const body = { status: 'sent', envelopeId: 'env-001' };
    const res = await request(app)
      .post('/api/provision/docusign-webhook')
      .set('X-DocuSign-Signature-1', webhookSig(body))
      .send(body);
    expect(res.status).toBe(200);
    expect(res.body.received).toBe(true);
  });

  it('returns 200 when envelopeId is missing', async () => {
    const body = { status: 'completed' };
    const res = await request(app)
      .post('/api/provision/docusign-webhook')
      .set('X-DocuSign-Signature-1', webhookSig(body))
      .send(body);
    expect(res.status).toBe(200);
    expect(res.body.received).toBe(true);
  });

  it('returns 200 with warning when location_id is absent from customFields', async () => {
    const body = { status: 'completed', envelopeId: 'env-002', customFields: {} };
    const res = await request(app)
      .post('/api/provision/docusign-webhook')
      .set('X-DocuSign-Signature-1', webhookSig(body))
      .send(body);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('warning');
  });

  it('activates clinic and user on completed envelope with valid location_id', async () => {
    pool.query
      .mockResolvedValueOnce({})  // BEGIN
      .mockResolvedValueOnce({})  // UPDATE baa_records
      .mockResolvedValueOnce({})  // UPDATE clinic_locations -> active
      .mockResolvedValueOnce({})  // UPDATE users -> active
      .mockResolvedValueOnce({});  // COMMIT

    const body = { status: 'completed', envelopeId: 'env-003', customFields: { location_id: 'loc-001' } };
    const res = await request(app)
      .post('/api/provision/docusign-webhook')
      .set('X-DocuSign-Signature-1', webhookSig(body))
      .send(body);

    expect(res.status).toBe(200);
    expect(res.body.received).toBe(true);
    // 5 DB calls: BEGIN + baa UPDATE + clinic UPDATE + user UPDATE + COMMIT
    expect(pool.query).toHaveBeenCalledTimes(5);
  });

  it('always returns 200 even when DB fails (prevents DocuSign retry storm)', async () => {
    pool.query
      .mockResolvedValueOnce({})          // BEGIN
      .mockRejectedValueOnce(new Error('DB connection lost')); // UPDATE baa_records fails

    const body = { status: 'completed', envelopeId: 'env-fail', customFields: { location_id: 'loc-001' } };
    const res = await request(app)
      .post('/api/provision/docusign-webhook')
      .set('X-DocuSign-Signature-1', webhookSig(body))
      .send(body);

    // Must return 200 regardless — DocuSign retries on non-2xx responses
    expect(res.status).toBe(200);
    expect(res.body.received).toBe(true);
  });
});
