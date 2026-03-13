import express from 'express';
import { body, validationResult } from 'express-validator';
import pool from '../db/pool.js';
import { authenticateToken, authorizeRoles } from '../middleware/auth.js';
import { logAudit } from '../middleware/auditLog.js';

const router = express.Router();
router.use(authenticateToken);

// Validation helper — returns 422 with structured errors if input is invalid
function validate(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(422).json({ error: 'Validation failed', details: errors.array() });
    return false;
  }
  return true;
}

const createLesionRules = [
  body('lesion_id').isString().trim().notEmpty(),
  body('visit_id').isString().trim().notEmpty(),
  body('patient_id').isString().trim().notEmpty(),
  body('body_location_x').isFloat({ min: 0, max: 100 }),
  body('body_location_y').isFloat({ min: 0, max: 100 }),
  body('size_mm').optional({ nullable: true }).isFloat({ min: 0, max: 500 }),
  body('action').optional({ nullable: true }).isIn(['monitor', 'biopsy_scheduled', 'biopsy_performed', 'excision', 'referral', 'no_action']),
  body('biopsy_result').optional({ nullable: true }).isIn(['benign', 'atypical', 'malignant', 'pending', 'na']),
];

const updateLesionRules = [
  body('size_mm').optional({ nullable: true }).isFloat({ min: 0, max: 500 }),
  body('action').optional({ nullable: true }).isIn(['monitor', 'biopsy_scheduled', 'biopsy_performed', 'excision', 'referral', 'no_action']),
  body('biopsy_result').optional({ nullable: true }).isIn(['benign', 'atypical', 'malignant', 'pending', 'na']),
  body('clinical_notes').optional({ nullable: true }).isString().isLength({ max: 5000 }),
  body('pathology_notes').optional({ nullable: true }).isString().isLength({ max: 5000 }),
];

// Helper: returns true if role bypasses location checks
const isPrivileged = (role) => ['admin', 'manager'].includes(role);

// Create lesion
router.post('/', createLesionRules, async (req, res) => {
  if (!validate(req, res)) return;
  try {
    const lesion = req.body;
    const privileged = isPrivileged(req.user.role);

    // Verify the parent visit's patient belongs to user's location
    const ownerCheck = await pool.query(
      `SELECT 1 FROM visits v
       JOIN patients pt ON pt.patient_id = v.patient_id
       WHERE v.visit_id = $1 AND ($2 OR pt.location_id = $3)`,
      [lesion.visit_id, privileged, req.user.location_id || null]
    );
    if (ownerCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Visit not found' });
    }
    
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
    
    await logAudit({
      userId: req.user.id, userName: req.user.name, userRole: req.user.role,
      action: 'CREATE_LESION', resourceType: 'lesion', resourceId: newLesion.lesion_id,
      ip: req.ip,
    });
    res.status(201).json(newLesion);
  } catch (error) {
    console.error('Error creating lesion:', error);
    res.status(500).json({ error: 'Failed to create lesion' });
  }
});

// Update lesion
router.put('/:lesionId', updateLesionRules, async (req, res) => {
  if (!validate(req, res)) return;
  try {
    const { lesionId } = req.params;
    const updates = req.body;
    const privileged = isPrivileged(req.user.role);
    
    // Ownership check: join through visit → patient
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
        AND EXISTS (
          SELECT 1 FROM visits v
          JOIN patients pt ON pt.patient_id = v.patient_id
          WHERE v.visit_id = lesions.visit_id
            AND ($11 OR pt.location_id = $12)
        )
      RETURNING *`,
      [
        lesionId, updates.size_mm, updates.shape, updates.color, updates.border,
        updates.symmetry, updates.action, updates.clinical_notes, updates.biopsy_result,
        updates.pathology_notes, privileged, req.user.location_id || null
      ]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Lesion not found' });
    }

    await logAudit({
      userId: req.user.id, userName: req.user.name, userRole: req.user.role,
      action: 'UPDATE_LESION', resourceType: 'lesion', resourceId: lesionId,
      ip: req.ip,
    });
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating lesion:', error);
    res.status(500).json({ error: 'Failed to update lesion' });
  }
});

// Delete lesion — provider or above only (MAs cannot delete clinical records)
router.delete('/:lesionId', authorizeRoles('admin', 'manager', 'provider'), async (req, res) => {
  try {
    const { lesionId } = req.params;
    const privileged = isPrivileged(req.user.role);
    
    // Ownership check: delete only if within user's location
    const result = await pool.query(
      `DELETE FROM lesions
       WHERE lesion_id = $1
         AND EXISTS (
           SELECT 1 FROM visits v
           JOIN patients pt ON pt.patient_id = v.patient_id
           WHERE v.visit_id = lesions.visit_id
             AND ($2 OR pt.location_id = $3)
         )
       RETURNING lesion_id`,
      [lesionId, privileged, req.user.location_id || null]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Lesion not found' });
    }

    await logAudit({
      userId: req.user.id, userName: req.user.name, userRole: req.user.role,
      action: 'DELETE_LESION', resourceType: 'lesion', resourceId: lesionId,
      ip: req.ip,
    });
    res.json({ message: 'Lesion deleted', lesion_id: lesionId });
  } catch (error) {
    console.error('Error deleting lesion:', error);
    res.status(500).json({ error: 'Failed to delete lesion' });
  }
});

export default router;
