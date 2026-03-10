import express from 'express';
import pool from '../db/pool.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();
router.use(authenticateToken);

// Get changes since timestamp (for pulling updates)
router.get('/changes', async (req, res) => {
  try {
    const { since, entity_type } = req.query;
    
    if (!since) {
      return res.status(400).json({ error: 'since timestamp required' });
    }
    
    let query = `
      SELECT entity_type, entity_id, operation, synced_at
      FROM sync_log
      WHERE synced_at > $1
    `;
    const params = [since];
    
    if (entity_type) {
      query += ` AND entity_type = $2`;
      params.push(entity_type);
    }
    
    query += ` ORDER BY synced_at ASC`;
    
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

// Push local changes (batch sync)
router.post('/push', async (req, res) => {
  const client = await pool.connect();
  
  try {
    const { changes } = req.body;
    
    if (!Array.isArray(changes)) {
      return res.status(400).json({ error: 'changes must be an array' });
    }
    
    await client.query('BEGIN');
    
    const results = [];
    const conflicts = [];
    
    for (const change of changes) {
      const { entity_type, entity_id, operation, data, client_timestamp } = change;
      
      try {
        let result;
        
        // Apply change based on operation
        switch (operation) {
          case 'create':
            result = await applyCreate(client, entity_type, data);
            break;
          case 'update':
            result = await applyUpdate(client, entity_type, entity_id, data);
            break;
          case 'delete':
            result = await applyDelete(client, entity_type, entity_id);
            break;
          default:
            throw new Error(`Unknown operation: ${operation}`);
        }
        
        // Log sync
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

// Helper functions for applying changes
async function applyCreate(client, entity_type, data) {
  switch (entity_type) {
    case 'visit':
      return await client.query(
        `INSERT INTO visits (visit_id, patient_id, visit_date, visit_type, status, chief_complaint, ma_id, ma_name, created_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
        [data.visit_id, data.patient_id, data.visit_date, data.visit_type, data.status, data.chief_complaint, data.ma_id, data.ma_name, data.created_by]
      );
    case 'lesion':
      return await client.query(
        `INSERT INTO lesions (lesion_id, visit_id, patient_id, body_location_x, body_location_y, body_region, body_view, size_mm, shape, color, border, symmetry, action, clinical_notes, created_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15) RETURNING *`,
        [data.lesion_id, data.visit_id, data.patient_id, data.body_location_x, data.body_location_y, data.body_region, data.body_view, data.size_mm, data.shape, data.color, data.border, data.symmetry, data.action, data.clinical_notes, data.created_by]
      );
    default:
      throw new Error(`Unknown entity type: ${entity_type}`);
  }
}

async function applyUpdate(client, entity_type, entity_id, data) {
  switch (entity_type) {
    case 'visit':
      return await client.query(
        `UPDATE visits SET status = $2, provider_id = $3, provider_name = $4, updated_at = CURRENT_TIMESTAMP
         WHERE visit_id = $1 RETURNING *`,
        [entity_id, data.status, data.provider_id, data.provider_name]
      );
    case 'lesion':
      return await client.query(
        `UPDATE lesions SET clinical_notes = $2, biopsy_result = $3, pathology_notes = $4, updated_at = CURRENT_TIMESTAMP
         WHERE lesion_id = $1 RETURNING *`,
        [entity_id, data.clinical_notes, data.biopsy_result, data.pathology_notes]
      );
    default:
      throw new Error(`Unknown entity type: ${entity_type}`);
  }
}

async function applyDelete(client, entity_type, entity_id) {
  const table = entity_type === 'visit' ? 'visits' : 
                entity_type === 'lesion' ? 'lesions' : 
                entity_type === 'photo' ? 'photos' : null;
  
  if (!table) {
    throw new Error(`Unknown entity type: ${entity_type}`);
  }
  
  const idColumn = `${entity_type}_id`;
  return await client.query(
    `DELETE FROM ${table} WHERE ${idColumn} = $1 RETURNING ${idColumn}`,
    [entity_id]
  );
}

export default router;
