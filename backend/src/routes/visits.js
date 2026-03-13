import express from 'express';
import { body, validationResult } from 'express-validator';
import pool from '../db/pool.js';
import { authenticateToken, authorizeRoles } from '../middleware/auth.js';
import { logAudit } from '../middleware/auditLog.js';

const router = express.Router();
router.use(authenticateToken);

// Validation helper
function validate(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(422).json({ error: 'Validation failed', details: errors.array() });
    return false;
  }
  return true;
}

const VISIT_STATUSES = ['in_progress', 'pending_review', 'signed', 'locked'];

const createVisitRules = [
  body('visit_id').isString().trim().notEmpty(),
  body('patient_id').isString().trim().notEmpty(),
  body('visit_date').isISO8601().withMessage('visit_date must be a valid ISO 8601 date'),
  body('visit_type').isString().trim().notEmpty().isLength({ max: 50 }),
  body('status').isIn(VISIT_STATUSES),
  body('chief_complaint').optional({ nullable: true }).isString().isLength({ max: 2000 }),
  body('ma_id').optional({ nullable: true }).isString().trim(),
  body('ma_name').optional({ nullable: true }).isString().trim().isLength({ max: 255 }),
];

const updateVisitRules = [
  body('status').optional().isIn(VISIT_STATUSES),
  body('provider_id').optional({ nullable: true }).isString().trim(),
  body('provider_name').optional({ nullable: true }).isString().trim().isLength({ max: 255 }),
  body('provider_attestation').optional({ nullable: true }).isString().isLength({ max: 5000 }),
];

// Helper: returns true if role bypasses location checks
const isPrivileged = (role) => ['admin', 'manager'].includes(role);

// Get visit by ID
router.get('/:visitId', async (req, res) => {
  try {
    const { visitId } = req.params;
    const privileged = isPrivileged(req.user.role);

    // Ownership check: join with patients to enforce location tenancy
    const result = await pool.query(
      `SELECT v.* FROM visits v
       JOIN patients pt ON pt.patient_id = v.patient_id
       WHERE v.visit_id = $1
         AND ($2 OR pt.location_id = $3)`,
      [visitId, privileged, req.user.location_id || null]
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
    
    // Bulk-fetch all photos for all lesions in a single query (avoids N+1)
    if (visit.lesions.length > 0) {
      const lesionIds = visit.lesions.map(l => l.lesion_id);
      const photosResult = await pool.query(
        'SELECT lesion_id, photo_id FROM photos WHERE lesion_id = ANY($1)',
        [lesionIds]
      );
      // Group photo URLs by lesion_id
      const photosByLesion = {};
      for (const row of photosResult.rows) {
        if (!photosByLesion[row.lesion_id]) photosByLesion[row.lesion_id] = [];
        photosByLesion[row.lesion_id].push(`/api/photos/${row.photo_id}`);
      }
      for (const lesion of visit.lesions) {
        lesion.photos = photosByLesion[lesion.lesion_id] || [];
      }
    } else {
      for (const lesion of visit.lesions) {
        lesion.photos = [];
      }
    }
    
    await logAudit({
      userId: req.user.id, userName: req.user.name, userRole: req.user.role,
      action: 'VIEW_VISIT', resourceType: 'visit', resourceId: visitId,
      ip: req.ip,
    });
    res.json(visit);
  } catch (error) {
    console.error('Error fetching visit:', error);
    res.status(500).json({ error: 'Failed to fetch visit' });
  }
});

// Create visit
router.post('/', createVisitRules, async (req, res) => {
  if (!validate(req, res)) return;
  try {
    const visit = req.body;
    const privileged = isPrivileged(req.user.role);

    // Verify patient belongs to user's location before creating visit
    const patientCheck = await pool.query(
      `SELECT 1 FROM patients WHERE patient_id = $1 AND ($2 OR location_id = $3)`,
      [visit.patient_id, privileged, req.user.location_id || null]
    );
    if (patientCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Patient not found' });
    }
    
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
    
    await logAudit({
      userId: req.user.id, userName: req.user.name, userRole: req.user.role,
      action: 'CREATE_VISIT', resourceType: 'visit', resourceId: newVisit.visit_id,
      ip: req.ip,
    });
    res.status(201).json(newVisit);
  } catch (error) {
    console.error('Error creating visit:', error);
    res.status(500).json({ error: 'Failed to create visit' });
  }
});

// Update visit
router.put('/:visitId', updateVisitRules, async (req, res) => {
  if (!validate(req, res)) return;
  try {
    const { visitId } = req.params;
    const updates = req.body;
    const privileged = isPrivileged(req.user.role);
    
    const result = await pool.query(
      `UPDATE visits SET
        status = COALESCE($2, status),
        provider_id = COALESCE($3, provider_id),
        provider_name = COALESCE($4, provider_name),
        provider_attestation = COALESCE($5, provider_attestation),
        completed_at = CASE WHEN $2 IN ('signed', 'locked') THEN CURRENT_TIMESTAMP ELSE completed_at END,
        updated_at = CURRENT_TIMESTAMP
      WHERE visit_id = $1
        AND EXISTS (
          SELECT 1 FROM patients pt
          WHERE pt.patient_id = visits.patient_id
            AND ($6 OR pt.location_id = $7)
        )
      RETURNING *`,
      [visitId, updates.status, updates.provider_id, updates.provider_name,
       updates.provider_attestation, privileged, req.user.location_id || null]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Visit not found' });
    }
    
    await logAudit({
      userId: req.user.id, userName: req.user.name, userRole: req.user.role,
      action: 'UPDATE_VISIT', resourceType: 'visit', resourceId: visitId,
      ip: req.ip,
    });
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating visit:', error);
    res.status(500).json({ error: 'Failed to update visit' });
  }
});

// Delete visit — provider or above only (MAs cannot delete clinical records)
router.delete('/:visitId', authorizeRoles('admin', 'manager', 'provider'), async (req, res) => {
  try {
    const { visitId } = req.params;
    const privileged = isPrivileged(req.user.role);
    
    const result = await pool.query(
      `DELETE FROM visits
       WHERE visit_id = $1
         AND EXISTS (
           SELECT 1 FROM patients pt
           WHERE pt.patient_id = visits.patient_id
             AND ($2 OR pt.location_id = $3)
         )
       RETURNING visit_id`,
      [visitId, privileged, req.user.location_id || null]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Visit not found' });
    }
    
    await logAudit({
      userId: req.user.id, userName: req.user.name, userRole: req.user.role,
      action: 'DELETE_VISIT', resourceType: 'visit', resourceId: visitId,
      ip: req.ip,
    });
    res.json({ message: 'Visit deleted', visit_id: visitId });
  } catch (error) {
    console.error('Error deleting visit:', error);
    res.status(500).json({ error: 'Failed to delete visit' });
  }
});

export default router;
