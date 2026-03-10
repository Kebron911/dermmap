import express from 'express';
import pool from '../db/pool.js';
import { authenticateToken, authorizeRoles } from '../middleware/auth.js';

const router = express.Router();
router.use(authenticateToken);

// Ensure the settings table exists (idempotent)
async function ensureSettingsTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS clinic_settings (
      key   VARCHAR(120) PRIMARY KEY,
      value TEXT NOT NULL
    )
  `);
}

// GET /api/settings — return all settings as a flat object
router.get('/', async (req, res) => {
  try {
    await ensureSettingsTable();
    const result = await pool.query('SELECT key, value FROM clinic_settings');
    const settings = {};
    result.rows.forEach(({ key, value }) => {
      // Deserialise booleans and numbers stored as JSON strings
      try { settings[key] = JSON.parse(value); } catch { settings[key] = value; }
    });
    res.json(settings);
  } catch (err) {
    console.error('GET /api/settings error:', err);
    res.status(500).json({ error: 'Failed to load settings' });
  }
});

// PUT /api/settings — upsert all settings (admin only)
router.put('/', authorizeRoles('admin'), async (req, res) => {
  const body = req.body;
  if (typeof body !== 'object' || body === null) {
    return res.status(400).json({ error: 'Request body must be a JSON object' });
  }

  try {
    await ensureSettingsTable();
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      for (const [key, value] of Object.entries(body)) {
        // Sanitise key: only allow alphanumerics and underscores
        if (!/^[a-z_]{1,120}$/i.test(key)) continue;
        await client.query(
          `INSERT INTO clinic_settings (key, value)
           VALUES ($1, $2)
           ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`,
          [key, JSON.stringify(value)]
        );
      }
      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
    res.json({ success: true });
  } catch (err) {
    console.error('PUT /api/settings error:', err);
    res.status(500).json({ error: 'Failed to save settings' });
  }
});

export default router;
