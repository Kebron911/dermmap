import express from 'express';
import pool from '../db/pool.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();
router.use(authenticateToken);

const VALID_ENTITY_TYPES = new Set(['visit', 'lesion', 'photo']);
const VALID_OPERATIONS   = new Set(['create', 'update', 'delete']);

// Returns true if the role bypasses location-based access control
const isPrivileged = (role) => ['admin', 'manager'].includes(role);

// GET /changes — pull sync log entries since a timestamp, filtered to user's clinic
router.get('/changes', async (req, res) => {
  try {
    const { since, entity_type } = req.query;

    if (!since) {
      return res.status(400).json({ error: 'since timestamp required' });
    }

    // Allowlist entity_type to prevent injection via query param
    if (entity_type && !VALID_ENTITY_TYPES.has(entity_type)) {
      return res.status(400).json({ error: `entity_type must be one of: ${[...VALID_ENTITY_TYPES].join(', ')}` });
    }

    const privileged = isPrivileged(req.user.role);
    const locationId = req.user.location_id || null;

    // For non-privileged users, only return changes for entities within their clinic.
    // Each entity_type is joined back to patients.location_id via its own ownership path.
    let query = `
      SELECT s.entity_type, s.entity_id, s.operation, s.synced_at
      FROM sync_log s
      WHERE s.synced_at > $1
        AND ($2 OR (
          (s.entity_type = 'visit' AND EXISTS (
            SELECT 1 FROM visits v
            JOIN patients pt ON pt.patient_id = v.patient_id
            WHERE v.visit_id = s.entity_id AND pt.location_id = $3
          ))
          OR (s.entity_type = 'lesion' AND EXISTS (
            SELECT 1 FROM lesions l
            JOIN visits v ON v.visit_id = l.visit_id
            JOIN patients pt ON pt.patient_id = v.patient_id
            WHERE l.lesion_id = s.entity_id AND pt.location_id = $3
          ))
          OR (s.entity_type = 'photo' AND EXISTS (
            SELECT 1 FROM photos p
            JOIN lesions l ON l.lesion_id = p.lesion_id
            JOIN visits v ON v.visit_id = l.visit_id
            JOIN patients pt ON pt.patient_id = v.patient_id
            WHERE p.photo_id = s.entity_id AND pt.location_id = $3
          ))
        ))
    `;
    const params = [since, privileged, locationId];

    if (entity_type) {
      query += ` AND s.entity_type = $4`;
      params.push(entity_type);
    }

    query += ` ORDER BY s.synced_at ASC`;

    const result = await pool.query(query, params);

    res.json({
      changes: result.rows,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error fetching changes:', error);
    res.status(500).json({ error: 'Failed to fetch changes' });
  }
});

// POST /push — apply batch of offline changes; each change is validated and tenancy-checked
router.post('/push', async (req, res) => {
  const client = await pool.connect();

  try {
    const { changes } = req.body;

    if (!Array.isArray(changes)) {
      return res.status(400).json({ error: 'changes must be an array' });
    }

    await client.query('BEGIN');

    const results   = [];
    const conflicts = [];

    for (const change of changes) {
      const { entity_type, entity_id, operation, data, client_timestamp } = change;

      // Issue 5-E: Validate required fields and enum values before touching the DB
      if (!VALID_ENTITY_TYPES.has(entity_type)) {
        conflicts.push({ entity_id, status: 'conflict', error: `Invalid entity_type: ${entity_type}` });
        continue;
      }
      if (!VALID_OPERATIONS.has(operation)) {
        conflicts.push({ entity_id, status: 'conflict', error: `Invalid operation: ${operation}` });
        continue;
      }
      if (!entity_id || typeof entity_id !== 'string' || entity_id.length > 100) {
        conflicts.push({ entity_id, status: 'conflict', error: 'entity_id must be a non-empty string (max 100 chars)' });
        continue;
      }

      try {
        switch (operation) {
          case 'create':
            await applyCreate(client, entity_type, data, req.user);
            break;
          case 'update':
            await applyUpdate(client, entity_type, entity_id, data, req.user);
            break;
          case 'delete':
            await applyDelete(client, entity_type, entity_id, req.user);
            break;
        }

        // Log the sync operation
        await client.query(
          `INSERT INTO sync_log (user_id, entity_type, entity_id, operation, client_timestamp)
           VALUES ($1, $2, $3, $4, $5)`,
          [req.user.id, entity_type, entity_id, operation, client_timestamp]
        );

        results.push({ entity_id, status: 'success' });

      } catch (error) {
        console.error(`Sync error for ${entity_type}:${entity_id}:`, error);
        conflicts.push({ entity_id, status: 'conflict', error: error.message });
      }
    }

    await client.query('COMMIT');

    res.json({
      results,
      conflicts,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Sync push error:', error);
    res.status(500).json({ error: 'Sync failed' });
  } finally {
    client.release();
  }
});

// ─── Tenancy-checked helper functions ────────────────────────────────────────

async function applyCreate(client, entity_type, data, user) {
  const priv      = isPrivileged(user.role);
  const locationId = user.location_id || null;

  switch (entity_type) {
    case 'visit': {
      // Verify patient belongs to user's clinic before inserting visit
      const check = await client.query(
        `SELECT 1 FROM patients WHERE patient_id = $1 AND ($2 OR location_id = $3)`,
        [data.patient_id, priv, locationId]
      );
      if (check.rows.length === 0) throw new Error('Patient not found or access denied');

      return client.query(
        `INSERT INTO visits
           (visit_id, patient_id, visit_date, visit_type, status, chief_complaint, ma_id, ma_name, created_by)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
        [data.visit_id, data.patient_id, data.visit_date, data.visit_type,
         data.status, data.chief_complaint, data.ma_id, data.ma_name, user.id]
      );
    }
    case 'lesion': {
      // Verify parent visit's patient belongs to user's clinic
      const check = await client.query(
        `SELECT 1 FROM visits v
         JOIN patients pt ON pt.patient_id = v.patient_id
         WHERE v.visit_id = $1 AND ($2 OR pt.location_id = $3)`,
        [data.visit_id, priv, locationId]
      );
      if (check.rows.length === 0) throw new Error('Visit not found or access denied');

      return client.query(
        `INSERT INTO lesions
           (lesion_id, visit_id, patient_id, body_location_x, body_location_y, body_region,
            body_view, size_mm, shape, color, border, symmetry, action, clinical_notes, created_by)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15) RETURNING *`,
        [data.lesion_id, data.visit_id, data.patient_id, data.body_location_x,
         data.body_location_y, data.body_region, data.body_view, data.size_mm,
         data.shape, data.color, data.border, data.symmetry, data.action,
         data.clinical_notes, user.id]
      );
    }
    default:
      throw new Error(`Unsupported entity_type for create: ${entity_type}`);
  }
}

async function applyUpdate(client, entity_type, entity_id, data, user) {
  const priv      = isPrivileged(user.role);
  const locationId = user.location_id || null;

  switch (entity_type) {
    case 'visit': {
      const result = await client.query(
        `UPDATE visits
         SET status = $2, provider_id = $3, provider_name = $4, updated_at = CURRENT_TIMESTAMP
         WHERE visit_id = $1
           AND EXISTS (
             SELECT 1 FROM patients pt
             WHERE pt.patient_id = visits.patient_id AND ($5 OR pt.location_id = $6)
           )
         RETURNING *`,
        [entity_id, data.status, data.provider_id, data.provider_name, priv, locationId]
      );
      if (result.rows.length === 0) throw new Error('Visit not found or access denied');
      return result;
    }
    case 'lesion': {
      const result = await client.query(
        `UPDATE lesions
         SET clinical_notes = $2, biopsy_result = $3, pathology_notes = $4, updated_at = CURRENT_TIMESTAMP
         WHERE lesion_id = $1
           AND EXISTS (
             SELECT 1 FROM visits v
             JOIN patients pt ON pt.patient_id = v.patient_id
             WHERE v.visit_id = lesions.visit_id AND ($5 OR pt.location_id = $6)
           )
         RETURNING *`,
        [entity_id, data.clinical_notes, data.biopsy_result, data.pathology_notes, priv, locationId]
      );
      if (result.rows.length === 0) throw new Error('Lesion not found or access denied');
      return result;
    }
    default:
      throw new Error(`Unsupported entity_type for update: ${entity_type}`);
  }
}

async function applyDelete(client, entity_type, entity_id, user) {
  const priv      = isPrivileged(user.role);
  const locationId = user.location_id || null;

  switch (entity_type) {
    case 'visit': {
      const result = await client.query(
        `DELETE FROM visits
         WHERE visit_id = $1
           AND EXISTS (
             SELECT 1 FROM patients pt
             WHERE pt.patient_id = visits.patient_id AND ($2 OR pt.location_id = $3)
           )
         RETURNING visit_id`,
        [entity_id, priv, locationId]
      );
      if (result.rows.length === 0) throw new Error('Visit not found or access denied');
      return result;
    }
    case 'lesion': {
      const result = await client.query(
        `DELETE FROM lesions
         WHERE lesion_id = $1
           AND EXISTS (
             SELECT 1 FROM visits v
             JOIN patients pt ON pt.patient_id = v.patient_id
             WHERE v.visit_id = lesions.visit_id AND ($2 OR pt.location_id = $3)
           )
         RETURNING lesion_id`,
        [entity_id, priv, locationId]
      );
      if (result.rows.length === 0) throw new Error('Lesion not found or access denied');
      return result;
    }
    case 'photo': {
      const result = await client.query(
        `DELETE FROM photos
         WHERE photo_id = $1
           AND EXISTS (
             SELECT 1 FROM lesions l
             JOIN visits v ON v.visit_id = l.visit_id
             JOIN patients pt ON pt.patient_id = v.patient_id
             WHERE l.lesion_id = photos.lesion_id AND ($2 OR pt.location_id = $3)
           )
         RETURNING photo_id`,
        [entity_id, priv, locationId]
      );
      if (result.rows.length === 0) throw new Error('Photo not found or access denied');
      return result;
    }
    default:
      throw new Error(`Unsupported entity_type for delete: ${entity_type}`);
  }
}

export default router;
