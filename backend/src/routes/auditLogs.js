import express from 'express';
import pool from '../db/pool.js';
import { authenticateToken, authorizeRoles } from '../middleware/auth.js';

const router = express.Router();
router.use(authenticateToken);

// GET /api/audit-logs — paginated, filterable audit log
// Accessible by admin and manager roles only
router.get('/', authorizeRoles('admin', 'manager'), async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(500, Math.max(1, parseInt(req.query.limit) || 100));
    const offset = (page - 1) * limit;
    const { action, role, search } = req.query;

    const conditions = [];
    const params = [];

    if (action && action !== 'all') {
      params.push(action);
      conditions.push(`action_type = $${params.length}`);
    }
    if (role && role !== 'all') {
      params.push(role);
      conditions.push(`user_role = $${params.length}`);
    }
    if (search && search.trim()) {
      params.push(`%${search.trim()}%`);
      const idx = params.length;
      conditions.push(`(user_name ILIKE $${idx} OR details ILIKE $${idx} OR resource_type ILIKE $${idx} OR resource_id ILIKE $${idx})`);
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const [logsResult, countResult] = await Promise.all([
      pool.query(
        `SELECT * FROM audit_logs ${where} ORDER BY timestamp DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
        [...params, limit, offset],
      ),
      pool.query(`SELECT COUNT(*)::int AS total FROM audit_logs ${where}`, params),
    ]);

    res.json({
      entries: logsResult.rows,
      total: countResult.rows[0].total,
      page,
      limit,
    });
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    res.status(500).json({ error: 'Failed to fetch audit logs' });
  }
});

// POST /api/audit-logs — write a single audit log entry
router.post('/', async (req, res) => {
  try {
    const { log_id, timestamp, action_type, resource_type, resource_id, details, device_id } = req.body;

    if (!log_id || !action_type || !resource_type || !resource_id) {
      return res.status(400).json({ error: 'Missing required fields: log_id, action_type, resource_type, resource_id' });
    }

    await pool.query(
      `INSERT INTO audit_logs
         (log_id, timestamp, user_id, user_name, user_role, action_type, resource_type, resource_id, details, ip_address, device_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       ON CONFLICT (log_id) DO NOTHING`,
      [
        log_id,
        timestamp || new Date().toISOString(),
        req.user.id,
        req.user.name || req.user.id,
        req.user.role,
        action_type,
        resource_type,
        resource_id,
        details || '',
        req.ip || '127.0.0.1',
        device_id || '',
      ],
    );

    res.status(201).json({ success: true });
  } catch (error) {
    console.error('Error writing audit log:', error);
    res.status(500).json({ error: 'Failed to write audit log' });
  }
});

export default router;
