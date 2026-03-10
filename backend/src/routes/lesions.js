import express from 'express';
import pool from '../db/pool.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();
router.use(authenticateToken);

// Create lesion
router.post('/', async (req, res) => {
  try {
    const lesion = req.body;
    
    const result = await pool.query(
      `INSERT INTO lesions (
        lesion_id, visit_id, patient_id, body_location_x, body_location_y, body_region,
        body_view, size_mm, shape, color, border, symmetry, action, clinical_notes,
        biopsy_result, pathology_notes, created_by, previous_lesion_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
      RETURNING *`,
      [
        lesion.lesion_id, lesion.visit_id, lesion.patient_id, lesion.body_location_x,
        lesion.body_location_y, lesion.body_region, lesion.body_view, lesion.size_mm,
        lesion.shape, lesion.color, lesion.border, lesion.symmetry, lesion.action,
        lesion.clinical_notes, lesion.biopsy_result || 'na', lesion.pathology_notes || '',
        req.user.id, lesion.previous_lesion_id || null
      ]
    );
    
    const newLesion = result.rows[0];
    newLesion.photos = [];
    
    res.status(201).json(newLesion);
  } catch (error) {
    console.error('Error creating lesion:', error);
    res.status(500).json({ error: 'Failed to create lesion' });
  }
});

// Update lesion
router.put('/:lesionId', async (req, res) => {
  try {
    const { lesionId } = req.params;
    const updates = req.body;
    
    const result = await pool.query(
      `UPDATE lesions SET
        size_mm = COALESCE($2, size_mm),
        shape = COALESCE($3, shape),
        color = COALESCE($4, color),
        border = COALESCE($5, border),
        symmetry = COALESCE($6, symmetry),
        action = COALESCE($7, action),
        clinical_notes = COALESCE($8, clinical_notes),
        biopsy_result = COALESCE($9, biopsy_result),
        pathology_notes = COALESCE($10, pathology_notes),
        updated_at = CURRENT_TIMESTAMP
      WHERE lesion_id = $1
      RETURNING *`,
      [
        lesionId, updates.size_mm, updates.shape, updates.color, updates.border,
        updates.symmetry, updates.action, updates.clinical_notes, updates.biopsy_result,
        updates.pathology_notes
      ]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Lesion not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating lesion:', error);
    res.status(500).json({ error: 'Failed to update lesion' });
  }
});

// Delete lesion
router.delete('/:lesionId', async (req, res) => {
  try {
    const { lesionId } = req.params;
    
    const result = await pool.query(
      'DELETE FROM lesions WHERE lesion_id = $1 RETURNING lesion_id',
      [lesionId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Lesion not found' });
    }
    
    res.json({ message: 'Lesion deleted', lesion_id: lesionId });
  } catch (error) {
    console.error('Error deleting lesion:', error);
    res.status(500).json({ error: 'Failed to delete lesion' });
  }
});

export default router;
