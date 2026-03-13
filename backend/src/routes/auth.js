import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { randomUUID, createHash } from 'crypto';
import rateLimit from 'express-rate-limit';
import { verify as totpVerify, generateSecret as totpGenerateSecret } from 'otplib';
import { generateTOTP } from '@otplib/uri';
import pool from '../db/pool.js';
import { authenticateToken, authorizeRoles } from '../middleware/auth.js';
import { sendPasswordResetEmail } from '../services/email.js';

const router = express.Router();

/** Returns the JWT expiry duration in milliseconds, matching process.env.JWT_EXPIRES_IN. */
function jwtExpiresInMs() {
  const raw = process.env.JWT_EXPIRES_IN || '24h';
  const unit = raw.slice(-1);
  const n = parseInt(raw, 10);
  if (unit === 'h') return n * 60 * 60 * 1000;
  if (unit === 'd') return n * 24 * 60 * 60 * 1000;
  if (unit === 'm') return n * 60 * 1000;
  return 24 * 60 * 60 * 1000; // fallback 24h
}

/** Signs a JWT with a fresh jti and records the session in user_sessions. */
async function issueToken(userId, payload) {
  const jti = randomUUID();
  const expiresAt = new Date(Date.now() + jwtExpiresInMs());
  const token = jwt.sign(
    { ...payload, jti },
    process.env.JWT_SECRET,
    { algorithm: 'HS256', expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
  );
  await pool.query(
    `INSERT INTO user_sessions (jti, user_id, issued_at, expires_at)
     VALUES ($1, $2, CURRENT_TIMESTAMP, $3)`,
    [jti, userId, expiresAt]
  );
  return token;
}

// Strict rate limiter for the login endpoint — brute-force protection
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,                   // 10 attempts per window per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many login attempts. Please try again in 15 minutes.' },
});

// Per-account lockout — Issue 29
// Tracks failed password attempts per email (independent of IP-based rate limiter above).
const loginAttempts = new Map(); // email → { count: number, lockedUntil: number }
const ACCOUNT_MAX_ATTEMPTS = 5;
const ACCOUNT_LOCKOUT_MS   = 15 * 60 * 1000; // 15 minutes

/** Increment failure counter for an email; lock account after ACCOUNT_MAX_ATTEMPTS. */
function recordFailedLogin(email) {
  const entry = loginAttempts.get(email) || { count: 0, lockedUntil: 0 };
  entry.count += 1;
  if (entry.count >= ACCOUNT_MAX_ATTEMPTS) {
    entry.lockedUntil = Date.now() + ACCOUNT_LOCKOUT_MS;
  }
  loginAttempts.set(email, entry);
}

/** Returns true if the account is currently locked. */
function isAccountLocked(email) {
  const entry = loginAttempts.get(email);
  if (!entry || !entry.lockedUntil) return false;
  if (Date.now() > entry.lockedUntil) {
    loginAttempts.delete(email); // lockout expired
    return false;
  }
  return true;
}

/** Clear the lockout state after a successful login. */
function clearFailedLogins(email) {
  loginAttempts.delete(email);
}

// Prune stale lockout entries every 30 minutes to avoid unbounded memory growth
setInterval(() => {
  const now = Date.now();
  for (const [email, entry] of loginAttempts) {
    if (entry.lockedUntil && now > entry.lockedUntil) {
      loginAttempts.delete(email);
    }
  }
}, 30 * 60 * 1000);

// Login
router.post('/login', loginLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    // Issue 29: check per-account lockout before hitting the DB
    if (isAccountLocked(email)) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    // Include mfa_secret + mfa_enabled for Issue 1 (MFA check)
    const result = await pool.query(
      'SELECT id, name, email, role, location_id, password_hash, mfa_enabled, mfa_secret FROM users WHERE email = $1 AND status = $2',
      [email, 'active']
    );
    
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    const user = result.rows[0];
    
    // Verify password
    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) {
      recordFailedLogin(email); // Issue 29: track per-email failures
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // MFA check — Issue 1 (TOTP)
    if (user.mfa_enabled) {
      const { totpCode } = req.body;
      if (!totpCode) {
        // Prompt client to supply TOTP code; no token issued yet
        return res.json({ mfaRequired: true });
      }
      // Verify TOTP code using otplib v13 API
      const { valid: totpValid } = await totpVerify({ token: totpCode, secret: user.mfa_secret });
      if (!totpValid) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }
    }
    
    // Update last_login_at timestamp (HIPAA audit trail — Issue 23)
    await pool.query('UPDATE users SET last_login_at = CURRENT_TIMESTAMP WHERE id = $1', [user.id]);

    // Issue 29: clear failed-login counter on successful authentication
    clearFailedLogins(email);
    
    // Issue JWT with jti + record session (Issue 2)
    const token = await issueToken(user.id, {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      location_id: user.location_id || null,
    });
    
    res.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        location_id: user.location_id || null,
      },
      token
    });
    
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Register — requires an authenticated admin/manager to create accounts.
// Self-registration is disabled to prevent unauthorised access to PHI.
router.post('/register', authenticateToken, authorizeRoles('admin', 'manager'), async (req, res) => {
  try {
    const { name, email, password, role, location_id } = req.body;
    
    if (!name || !email || !password || !role) {
      return res.status(400).json({ error: 'All fields required' });
    }
    
    if (password.length < 12) {
      return res.status(400).json({ error: 'Password must be at least 12 characters (HIPAA requirement)' });
    }
    
    if (!['ma', 'provider', 'manager'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }
    
    // Check if user exists
    const existingUser = await pool.query(
      'SELECT id FROM users WHERE email = $1',
      [email]
    );
    
    if (existingUser.rows.length > 0) {
      return res.status(409).json({ error: 'User already exists' });
    }
    
    // Hash password with cost factor 12 (HIPAA-grade)
    const hashedPassword = await bcrypt.hash(password, 12);
    const userId = randomUUID();
    
    await pool.query(
      'INSERT INTO users (id, name, email, password_hash, role, location_id) VALUES ($1, $2, $3, $4, $5, $6)',
      [userId, name, email, hashedPassword, role, location_id || req.user.location_id || null]
    );
    
    // Issue JWT with jti + record session (Issue 2)
    const token = await issueToken(userId, {
      id: userId, email, name, role,
      location_id: location_id || req.user.location_id || null,
    });
    
    res.status(201).json({
      user: { id: userId, name, email, role, location_id: location_id || null },
      token
    });
    
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// Verify token (for frontend to check if token is still valid)
// Note: authenticateToken middleware now checks revocation, so this is authoritative.
router.get('/verify', authenticateToken, (req, res) => {
  res.json({
    user: {
      id: req.user.id,
      email: req.user.email,
      role: req.user.role,
      location_id: req.user.location_id || null,
    },
    valid: true
  });
});

// Refresh token — Issue 3: revoke old jti, issue new one (rotation)
router.post('/refresh', authenticateToken, async (req, res) => {
  try {
    const oldJti = req.user.jti;

    // Revoke the old session (rotation — Issue 3)
    if (oldJti) {
      await pool.query(
        `UPDATE user_sessions SET revoked_at = CURRENT_TIMESTAMP, revoked_by = $2
         WHERE jti = $1`,
        [oldJti, oldJti]
      );
    }

    // Issue brand-new token with new jti and record it
    // Look up name in case it was absent from an older token
    const nameRow = await pool.query('SELECT name FROM users WHERE id = $1', [req.user.id]);
    const token = await issueToken(req.user.id, {
      id: req.user.id,
      email: req.user.email,
      name: nameRow.rows[0]?.name || req.user.name || null,
      role: req.user.role,
      location_id: req.user.location_id || null,
    });

    res.json({ token });
  } catch (error) {
    console.error('Refresh error:', error);
    res.status(500).json({ error: 'Token refresh failed' });
  }
});

// Logout — revoke current session (Issue 2-E)
router.post('/logout', authenticateToken, async (req, res) => {
  try {
    const jti = req.user.jti;
    if (jti) {
      await pool.query(
        `UPDATE user_sessions SET revoked_at = CURRENT_TIMESTAMP WHERE jti = $1`,
        [jti]
      );
    }
    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ error: 'Logout failed' });
  }
});

// ─── MFA Endpoints (Issue 1) ────────────────────────────────────────────────

// Setup MFA — generates a TOTP secret + QR code, does NOT enable MFA yet
router.post('/mfa/setup', authenticateToken, async (req, res) => {
  try {
    const QRCode = await import('qrcode');

    const secret = totpGenerateSecret();
    const otpauth = generateTOTP({ label: req.user.email, issuer: 'DermMap', secret });
    const qrCode = await QRCode.default.toDataURL(otpauth);

    // Store secret (not yet active — mfa_enabled stays false until /mfa/verify)
    await pool.query('UPDATE users SET mfa_secret = $1 WHERE id = $2', [secret, req.user.id]);

    // Never expose mfa_secret via this route — only the QR code + hint
    res.json({ qrCode });
  } catch (error) {
    console.error('MFA setup error:', error);
    res.status(500).json({ error: 'MFA setup failed' });
  }
});

// Verify MFA code — enables MFA on the account (Issue 1-D)
router.post('/mfa/verify', authenticateToken, async (req, res) => {
  try {
    const { code } = req.body;
    if (!code) return res.status(400).json({ error: 'TOTP code required' });

    const userResult = await pool.query('SELECT mfa_secret FROM users WHERE id = $1', [req.user.id]);
    const secret = userResult.rows[0]?.mfa_secret;
    if (!secret) return res.status(400).json({ error: 'MFA setup not initiated' });

    const { valid: codeValid } = await totpVerify({ token: code, secret });
    if (!codeValid) {
      return res.status(400).json({ error: 'Invalid TOTP code' });
    }

    await pool.query('UPDATE users SET mfa_enabled = TRUE WHERE id = $1', [req.user.id]);
    res.json({ message: 'MFA enabled successfully' });
  } catch (error) {
    console.error('MFA verify error:', error);
    res.status(500).json({ error: 'MFA verification failed' });
  }
});

// Disable MFA — requires current password confirmation (Issue 1-E)
router.post('/mfa/disable', authenticateToken, async (req, res) => {
  try {
    const { password } = req.body;
    if (!password) return res.status(400).json({ error: 'Current password required' });

    const userResult = await pool.query('SELECT password_hash FROM users WHERE id = $1', [req.user.id]);
    const validPassword = await bcrypt.compare(password, userResult.rows[0]?.password_hash);
    if (!validPassword) return res.status(401).json({ error: 'Invalid credentials' });

    await pool.query(
      'UPDATE users SET mfa_enabled = FALSE, mfa_secret = NULL WHERE id = $1',
      [req.user.id]
    );
    res.json({ message: 'MFA disabled' });
  } catch (error) {
    console.error('MFA disable error:', error);
    res.status(500).json({ error: 'MFA disable failed' });
  }
});

// ─── Password Reset Endpoints (Issue 4) ─────────────────────────────────────

// Rate-limiter specific to the password-reset request endpoint
const forgotPasswordLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many password reset requests. Please try again later.' },
});

// POST /forgot-password — public; always returns 200 to prevent email enumeration
router.post('/forgot-password', forgotPasswordLimiter, async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email required' });

    const result = await pool.query(
      `SELECT id FROM users WHERE email = $1 AND status = 'active'`,
      [email]
    );

    if (result.rows.length > 0) {
      const userId = result.rows[0].id;

      // Generate a URL-safe random token and hash it for storage
      const rawToken = randomUUID();
      const tokenHash = createHash('sha256').update(rawToken).digest('hex');
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

      await pool.query(
        `INSERT INTO password_reset_tokens (token_hash, user_id, expires_at)
         VALUES ($1, $2, $3)`,
        [tokenHash, userId, expiresAt]
      );

      // Send the raw (unhashed) token in the email link — only the hash is stored
      await sendPasswordResetEmail(email, rawToken);
    }

    // Always respond the same way to prevent email enumeration (Issue 4-B)
    res.json({ message: 'If an account with that email exists, a reset link has been sent.' });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ error: 'Password reset request failed' });
  }
});

// POST /reset-password — public; consumes the one-time token
router.post('/reset-password', async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    if (!token || !newPassword) {
      return res.status(400).json({ error: 'Token and new password are required' });
    }
    if (newPassword.length < 12) {
      return res.status(400).json({ error: 'Password must be at least 12 characters (HIPAA requirement)' });
    }

    const tokenHash = createHash('sha256').update(token).digest('hex');

    const result = await pool.query(
      `SELECT user_id FROM password_reset_tokens
       WHERE token_hash = $1 AND expires_at > NOW() AND used_at IS NULL`,
      [tokenHash]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({ error: 'Invalid or expired reset token' });
    }

    const userId = result.rows[0].user_id;
    const hashedPassword = await bcrypt.hash(newPassword, 12);

    // Update password and mark token as used in a single transaction
    await pool.query('BEGIN');
    await pool.query(
      'UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [hashedPassword, userId]
    );
    await pool.query(
      'UPDATE password_reset_tokens SET used_at = CURRENT_TIMESTAMP WHERE token_hash = $1',
      [tokenHash]
    );
    // Revoke all existing sessions — user must log in fresh with the new password
    await pool.query(
      `UPDATE user_sessions SET revoked_at = CURRENT_TIMESTAMP
       WHERE user_id = $1 AND revoked_at IS NULL`,
      [userId]
    );
    await pool.query('COMMIT');

    res.json({ message: 'Password updated successfully. Please log in with your new password.' });
  } catch (error) {
    await pool.query('ROLLBACK').catch(() => {});
    console.error('Reset password error:', error);
    res.status(500).json({ error: 'Password reset failed' });
  }
});

export default router;
