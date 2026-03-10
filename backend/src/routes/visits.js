import express from 'express';
import pool from '../db/pool.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();
router.use(authenticateToken);

// Get visit by ID
router.get('/:visitId', async (req, res) => {
  try {
    const { visitId } = req.params;
    
    const result = await pool.query(
      'SELECT * FROM visits WHERE visit_id = $1',
      [visitId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Visit not found' });
    }
    
    const visit = result.rows[0];
    
    // Get lesions
    const lesionsResult = await pool.query(
      'SELECT * FROM lesions WHERE visit_id = $1 ORDER BY created_at',
      [visitId]
    );
    
    visit.lesions = lesionsResult.rows;
    
    // Get photo URLs for each lesion
    for (const lesion of visit.lesions) {
      const photosResult = await pool.query(
        'SELECT photo_id FROM photos WHERE lesion_id = $1',
        [lesion.lesion_id]
      );
      lesion.photos = photosResult.rows.map(p => `/api/photos/${p.photo_id}`);
    }
    
    res.json(visit);
  } catch (error) {
    console.error('Error fetching visit:', error);
    res.status(500).json({ error: 'Failed to fetch visit' });
  }
});

// Create visit
router.post('/', async (req, res) => {
  try {
    const visit = req.body;
    
    const result = await pool.query(
      `INSERT INTO visits (
        visit_id, patient_id, visit_date, visit_type, status, chief_complaint,
        ma_id, ma_name, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *`,
      [
        visit.visit_id, visit.patient_id, visit.visit_date, visit.visit_type,
        visit.status, visit.chief_complaint, visit.ma_id, visit.ma_name, req.user.id
      ]
    );
    
    const newVisit = result.rows[0];
    newVisit.lesions = [];
    
    res.status(201).json(newVisit);
  } catch (error) {
    console.error('Error creating visit:', error);
    res.status(500).json({ error: 'Failed to create visit' });
  }
});

// Update visit
router.put('/:visitId', async (req, res) => {
  try {
    const { visitId } = req.params;
    const updates = req.body;
    
    const result = await pool.query(
      `UPDATE visits SET
        status = COALESCE($2, status),
        provider_id = COALESCE($3, provider_id),
        provider_name = COALESCE($4, provider_name),
        provider_attestation = COALESCE($5, provider_attestation),
        completed_at = CASE WHEN $2 IN ('signed', 'locked') THEN CURRENT_TIMESTAMP ELSE completed_at END,
        updated_at = CURRENT_TIMESTAMP
      WHERE visit_id = $1
      RETURNING *`,
      [visitId, updates.status, updates.provider_id, updates.provider_name, updates.provider_attestation]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Visit not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating visit:', error);
    res.status(500).json({ error: 'Failed to update visit' });
  }
});

// Delete visit
router.delete('/:visitId', async (req, res) => {
  try {
    const { visitId } = req.params;
    
    const result = await pool.query(
      'DELETE FROM visits WHERE visit_id = $1 RETURNING visit_id',
      [visitId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Visit not found' });
    }
    
    res.json({ message: 'Visit deleted', visit_id: visitId });
  } catch (error) {
    console.error('Error deleting visit:', error);
    res.status(500).json({ error: 'Failed to delete visit' });
  }
});

export default router;
