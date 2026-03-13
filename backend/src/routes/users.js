import express from 'express';
import bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';
import pool from '../db/pool.js';
import { authenticateToken, authorizeRoles } from '../middleware/auth.js';

const router = express.Router();

// All routes require authentication + manager/admin role (RBAC enforced at route level)
router.use(authenticateToken);
router.use(authorizeRoles('manager', 'admin'));

// GET /api/admin/users — list users scoped to the requester's clinic for managers
router.get('/', async (req, res) => {
  try {
    const isAdmin = req.user.role === 'admin';
    const params = isAdmin ? [] : [req.user.location_id || null];
    const result = await pool.query(
      isAdmin
        ? `SELECT id, name, email, role, credentials, status, last_login_at, created_at
           FROM users
           ORDER BY created_at DESC`
        : `SELECT id, name, email, role, credentials, status, last_login_at, created_at
           FROM users
           WHERE location_id = $1
           ORDER BY created_at DESC`,
      params
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// POST /api/admin/users — create a new user account
router.post('/', async (req, res) => {
  try {
    const { name, email, password, role, credentials } = req.body;

    if (!name || !email || !password || !role) {
      return res.status(400).json({ error: 'name, email, password, and role are required' });
    }

    const allowedRoles = ['ma', 'provider', 'manager'];
    if (!allowedRoles.includes(role)) {
      return res.status(400).json({ error: `Invalid role. Must be one of: ${allowedRoles.join(', ')}` });
    }

    if (password.length < 12) {
      return res.status(400).json({ error: 'Password must be at least 12 characters (HIPAA requirement)' });
    }

    const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'An account with this email already exists' });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const userId = randomUUID();

    const result = await pool.query(
      `INSERT INTO users (id, name, email, password_hash, role, credentials, status)
       VALUES ($1, $2, $3, $4, $5, $6, 'pending')
       RETURNING id, name, email, role, credentials, status, created_at`,
      [userId, name, email, passwordHash, role, credentials || null]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({ error: 'Failed to create user' });
  }
});

// PATCH /api/admin/users/:id — update name, role, credentials, or status
router.patch('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, role, credentials, status } = req.body;

    const updates = [];
    const values = [];
    let idx = 1;

    if (name !== undefined) { updates.push(`name = $${idx++}`); values.push(name); }
    if (role !== undefined) {
      const allowedRoles = ['ma', 'provider', 'manager'];
      if (!allowedRoles.includes(role)) {
        return res.status(400).json({ error: `Invalid role. Must be one of: ${allowedRoles.join(', ')}` });
      }
      updates.push(`role = $${idx++}`); values.push(role);
    }
    if (credentials !== undefined) { updates.push(`credentials = $${idx++}`); values.push(credentials); }
    if (status !== undefined) {
      const allowedStatuses = ['active', 'pending', 'inactive'];
      if (!allowedStatuses.includes(status)) {
        return res.status(400).json({ error: `Invalid status. Must be one of: ${allowedStatuses.join(', ')}` });
      }
      updates.push(`status = $${idx++}`); values.push(status);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(id);

    // Managers can only update users within their own clinic (Issue 17)
    const isAdmin = req.user.role === 'admin';
    const locationClause = isAdmin ? '' : ` AND location_id = $${idx + 1}`;
    const locationParam = isAdmin ? [] : [req.user.location_id || null];

    const result = await pool.query(
      `UPDATE users SET ${updates.join(', ')} WHERE id = $${idx}${locationClause} RETURNING id, name, email, role, credentials, status`,
      [...values, ...locationParam]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Issue 18: If the account was just deactivated, revoke all active sessions immediately
    if (status === 'inactive') {
      await pool.query(
        `UPDATE user_sessions SET revoked_at = CURRENT_TIMESTAMP
         WHERE user_id = $1 AND revoked_at IS NULL`,
        [id]
      );
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ error: 'Failed to update user' });
  }
});

// DELETE /api/admin/users/:id — soft-deactivate (never hard-delete for HIPAA audit trail)
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    if (id === req.user.id) {
      return res.status(400).json({ error: 'You cannot deactivate your own account' });
    }

    // Managers can only deactivate users within their own clinic (Issue 17)
    const isAdmin = req.user.role === 'admin';
    const whereClause = isAdmin
      ? `id = $1`
      : `id = $1 AND location_id = $2`;
    const params = isAdmin ? [id] : [id, req.user.location_id || null];

    const result = await pool.query(
      `UPDATE users SET status = 'inactive', updated_at = CURRENT_TIMESTAMP WHERE ${whereClause} RETURNING id`,
      params
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Issue 18: Revoke all active sessions so the deactivated user is logged out immediately
    await pool.query(
      `UPDATE user_sessions SET revoked_at = CURRENT_TIMESTAMP
       WHERE user_id = $1 AND revoked_at IS NULL`,
      [id]
    );

    res.json({ success: true });
  } catch (error) {
    console.error('Deactivate user error:', error);
    res.status(500).json({ error: 'Failed to deactivate user' });
  }
});

// POST /api/admin/users/:id/reset-password — admin-initiated credential reset
router.post('/:id/reset-password', async (req, res) => {
  try {
    const { id } = req.params;
    const { newPassword } = req.body;

    if (!newPassword || newPassword.length < 12) {
      return res.status(400).json({ error: 'New password must be at least 12 characters' });
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);

    const result = await pool.query(
      `UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING id`,
      [passwordHash, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ error: 'Failed to reset password' });
  }
});

export default router;
