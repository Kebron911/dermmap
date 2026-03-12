/**
 * POST /api/provision/clinic
 *
 * Unauthenticated endpoint — called during the public signup flow.
 * Creates a clinic_location row, an admin user, and a BAA record atomically.
 * Rate-limited aggressively to prevent abuse.
 *
 * HIPAA notes:
 *   - BAA acceptance (ip_address, user_agent, timestamp, agreement_version)
 *     is persisted to baa_records before any PHI access is granted.
 *   - The admin account starts in 'pending' status until email is verified
 *     (or until you integrate SendGrid/SES welcome-email verification).
 *   - No PHI is accepted or stored by this endpoint.
 *
 * DocuSign webhook:
 *   POST /api/provision/docusign-webhook
 *   Called by DocuSign when an envelope is completed. Updates baa_records
 *   with the envelope ID and activates the clinic.
 */

import express from 'express';
import bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';
import { body, validationResult } from 'express-validator';
import rateLimit from 'express-rate-limit';
import pool from '../db/pool.js';

const router = express.Router();

// Tight rate limit for unauthenticated provisioning — 5 signups per hour per IP
const provisionLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many signup attempts. Please try again later.' },
});

// DocuSign webhook can fire rapidly; separate, looser limit
const webhookLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
});

// BAA agreement version — bump this string whenever the agreement text changes
const BAA_VERSION = '1.0';

// ---------------------------------------------------------------------------
// Validation rules
// ---------------------------------------------------------------------------
const provisionRules = [
  body('clinic_name').isString().trim().isLength({ min: 2, max: 255 }),
  body('npi').isString().trim().matches(/^\d{10}$/).withMessage('NPI must be exactly 10 digits'),
  body('address_street').optional().isString().trim().isLength({ max: 255 }),
  body('address_city').optional().isString().trim().isLength({ max: 100 }),
  body('address_state').optional().isString().trim().isLength({ max: 50 }),
  body('address_zip').optional().isString().trim().isLength({ max: 20 }),
  body('phone').optional().isString().trim().isLength({ max: 30 }),
  body('clinic_email').optional().isEmail().normalizeEmail(),
  body('admin_name').isString().trim().isLength({ min: 2, max: 255 }),
  body('admin_email').isEmail().normalizeEmail(),
  body('admin_password')
    .isString()
    .isLength({ min: 12 })
    .withMessage('Password must be at least 12 characters (HIPAA requirement)'),
  body('baa_accepted')
    .isBoolean()
    .custom((val) => val === true)
    .withMessage('BAA must be accepted to create an account'),
  body('baa_signatory_name')
    .isString()
    .trim()
    .isLength({ min: 2, max: 255 })
    .withMessage('Signatory name is required'),
];

function validate(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(422).json({ error: 'Validation failed', details: errors.array() });
    return false;
  }
  return true;
}

// ---------------------------------------------------------------------------
// POST /api/provision/clinic
// ---------------------------------------------------------------------------
router.post('/clinic', provisionLimiter, provisionRules, async (req, res) => {
  if (!validate(req, res)) return;

  const {
    clinic_name, npi,
    address_street, address_city, address_state, address_zip,
    phone, clinic_email,
    admin_name, admin_email, admin_password,
    baa_signatory_name,
  } = req.body;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Reject duplicate NPI (one location per NPI for now)
    const dupNPI = await client.query(
      'SELECT location_id FROM clinic_locations WHERE npi = $1',
      [npi],
    );
    if (dupNPI.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: 'A clinic with this NPI is already registered.' });
    }

    // 2. Reject duplicate admin email
    const dupEmail = await client.query(
      'SELECT id FROM users WHERE email = $1',
      [admin_email],
    );
    if (dupEmail.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: 'An account with this email already exists.' });
    }

    // 3. Create clinic location (status = 'pending' until email verified)
    const locationId = randomUUID();
    await client.query(
      `INSERT INTO clinic_locations
         (location_id, name, npi, address_street, address_city, address_state,
          address_zip, phone, email, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'pending')`,
      [locationId, clinic_name, npi, address_street || null, address_city || null,
       address_state || null, address_zip || null, phone || null, clinic_email || null],
    );

    // 4. Create admin user (status = 'pending' — activated after email verification)
    const userId = randomUUID();
    const passwordHash = await bcrypt.hash(admin_password, 12);
    await client.query(
      `INSERT INTO users
         (id, name, email, password_hash, role, status, location_id)
       VALUES ($1,$2,$3,$4,'admin','pending',$5)`,
      [userId, admin_name, admin_email, passwordHash, locationId],
    );

    // 5. Record BAA acceptance — immutable audit trail required by HIPAA §164.308(b)
    const forwardedFor = req.headers['x-forwarded-for'];
    const ip = (typeof forwardedFor === 'string' ? forwardedFor : forwardedFor?.[0])
             ?.split(',')[0].trim()
             ?? req.socket.remoteAddress
             ?? 'unknown';
    await client.query(
      `INSERT INTO baa_records
         (location_id, admin_email, admin_name, agreement_version, ip_address,
          user_agent, signed_at)
       VALUES ($1,$2,$3,$4,$5,$6,NOW())`,
      [locationId, admin_email, baa_signatory_name, BAA_VERSION, ip,
       req.headers['user-agent']?.slice(0, 500) || null],
    );

    await client.query('COMMIT');

    // TODO: send welcome email with verification link (integrate SendGrid/SES here)
    // sendWelcomeEmail({ to: admin_email, name: admin_name, locationId });

    res.status(201).json({
      message: 'Clinic registered successfully. Check your email to activate your account.',
      location_id: locationId,
      // Do NOT return passwords or sensitive data
    });

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Provision clinic error:', err);
    res.status(500).json({ error: 'Registration failed. Please try again.' });
  } finally {
    client.release();
  }
});

// ---------------------------------------------------------------------------
// POST /api/provision/docusign-webhook
// Called by DocuSign Connect when an envelope status changes to "completed".
// Activates the clinic location and records the envelope ID on the BAA.
//
// In production, verify the DocuSign HMAC signature on the request header
// before trusting the payload:
//   X-DocuSign-Signature-1: <HMAC-SHA256 of body>
// Set DOCUSIGN_CONNECT_SECRET in env and verify before processing.
// ---------------------------------------------------------------------------
router.post('/docusign-webhook', webhookLimiter, async (req, res) => {
  // DocuSign sends XML or JSON depending on Connect config; we expect JSON here.
  const { status, envelopeId, customFields } = req.body ?? {};

  if (status !== 'completed' || !envelopeId) {
    // Acknowledge non-completed events (e.g. 'sent', 'delivered') without action
    return res.status(200).json({ received: true });
  }

  // customFields.location_id should be set when creating the DocuSign envelope
  const locationId = customFields?.location_id;
  if (!locationId) {
    return res.status(200).json({ received: true, warning: 'No location_id in customFields' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Attach envelope ID to BAA record
    await client.query(
      `UPDATE baa_records
         SET docusign_envelope_id = $1
       WHERE location_id = $2 AND docusign_envelope_id IS NULL`,
      [envelopeId, locationId],
    );

    // Activate clinic and admin user
    await client.query(
      `UPDATE clinic_locations
         SET status = 'active', activated_at = NOW()
       WHERE location_id = $1`,
      [locationId],
    );
    await client.query(
      `UPDATE users SET status = 'active'
       WHERE location_id = $1 AND role = 'admin'`,
      [locationId],
    );

    await client.query('COMMIT');
    res.status(200).json({ received: true });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('DocuSign webhook error:', err);
    // Always return 200 to DocuSign — it retries on non-2xx
    res.status(200).json({ received: true, error: 'Processing failed, will retry' });
  } finally {
    client.release();
  }
});

export default router;
