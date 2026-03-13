import express from 'express';
import { body, validationResult } from 'express-validator';
import pool from '../db/pool.js';
import { authenticateToken } from '../middleware/auth.js';
import { logAudit } from '../middleware/auditLog.js';

const router = express.Router();

// All routes require authentication
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

const FITZPATRICK_TYPES = ['I', 'II', 'III', 'IV', 'V', 'VI'];
const SEX_VALUES = ['male', 'female', 'other'];

const createPatientRules = [
  body('patient_id').isString().trim().notEmpty(),
  body('mrn').isString().trim().notEmpty().isLength({ max: 50 }),
  body('first_name').isString().trim().notEmpty().isLength({ max: 100 }),
  body('last_name').isString().trim().notEmpty().isLength({ max: 100 }),
  body('date_of_birth').isISO8601().withMessage('date_of_birth must be a valid date'),
  body('sex').isIn(SEX_VALUES),
  body('phone').optional({ nullable: true }).isString().isLength({ max: 20 }),
  body('email').optional({ nullable: true }).isEmail(),
  body('skin_type').optional({ nullable: true }).isIn(FITZPATRICK_TYPES),
  body('risk_score').optional({ nullable: true }).isInt({ min: 0, max: 100 }),
];

const updatePatientRules = [
  body('first_name').optional().isString().trim().notEmpty().isLength({ max: 100 }),
  body('last_name').optional().isString().trim().notEmpty().isLength({ max: 100 }),
  body('phone').optional({ nullable: true }).isString().isLength({ max: 20 }),
  body('email').optional({ nullable: true }).isEmail(),
  body('allergies').optional({ nullable: true }).isString().isLength({ max: 2000 }),
];

// Helper: returns true if role bypasses location checks
const isPrivileged = (role) => ['admin', 'manager'].includes(role);

// Get all patients (with pagination and search), including nested visits → lesions → photos
router.get('/', async (req, res) => {
  try {
    const { search, limit = 50, offset = 0 } = req.query;
    const privileged = isPrivileged(req.user.role);
    
    let query = `SELECT * FROM patients WHERE 1=1`;
    const params = [];
    
    // Location tenancy filter: non-privileged users only see their location's patients
    if (!privileged) {
      query += ` AND location_id = $${params.length + 1}`;
      params.push(req.user.location_id || null);
    }
    
    if (search) {
      query += ` AND (
        LOWER(first_name) LIKE LOWER($${params.length + 1}) OR
        LOWER(last_name) LIKE LOWER($${params.length + 1}) OR
        LOWER(mrn) LIKE LOWER($${params.length + 1})
      )`;
      params.push(`%${search}%`);
    }
    
    query += ` ORDER BY last_name, first_name LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);
    
    const result = await pool.query(query, params);
    const patients = result.rows;

    if (patients.length === 0) return res.json([]);

    const patientIds = patients.map(p => p.patient_id);

    // Bulk load visits, lesions, and photo metadata in 3 queries (no N+1)
    const visitsResult = await pool.query(
      'SELECT * FROM visits WHERE patient_id = ANY($1) ORDER BY visit_date DESC',
      [patientIds]
    );

    const visitIds = visitsResult.rows.map(v => v.visit_id);

    let lesionsResult = { rows: [] };
    let photosResult = { rows: [] };

    if (visitIds.length > 0) {
      [lesionsResult, photosResult] = await Promise.all([
        pool.query(
          'SELECT * FROM lesions WHERE visit_id = ANY($1) ORDER BY created_at',
          [visitIds]
        ),
        pool.query(
          `SELECT photo_id, lesion_id,
                  photo_type AS capture_type,
                  created_at AS captured_at,
                  created_by AS captured_by
           FROM photos WHERE visit_id = ANY($1)`,
          [visitIds]
        ),
      ]);
    }

    // Assemble nested structure: photos → lesions → visits → patients
    const photosByLesion = {};
    photosResult.rows.forEach(ph => {
      const photoObj = { ...ph, url: `/api/photos/${ph.photo_id}` };
      (photosByLesion[ph.lesion_id] = photosByLesion[ph.lesion_id] || []).push(photoObj);
    });

    const lesionsByVisit = {};
    lesionsResult.rows.forEach(l => {
      l.photos = photosByLesion[l.lesion_id] || [];
      (lesionsByVisit[l.visit_id] = lesionsByVisit[l.visit_id] || []).push(l);
    });

    const visitsByPatient = {};
    visitsResult.rows.forEach(v => {
      v.lesions = lesionsByVisit[v.visit_id] || [];
      (visitsByPatient[v.patient_id] = visitsByPatient[v.patient_id] || []).push(v);
    });

    patients.forEach(p => {
      p.visits = visitsByPatient[p.patient_id] || [];
    });

    await logAudit({
      userId: req.user.id, userName: req.user.name, userRole: req.user.role,
      action: 'VIEW_PATIENTS', resourceType: 'patient', resourceId: null,
      details: search ? `search=${search}` : null,
      ip: req.ip,
    });
    res.json(patients);
  } catch (error) {
    console.error('Error fetching patients:', error);
    res.status(500).json({ error: 'Failed to fetch patients' });
  }
});

// Get patient by ID (with visits and lesions — bulk-fetched to avoid N+1)
router.get('/:patientId', async (req, res) => {
  try {
    const { patientId } = req.params;
    const privileged = isPrivileged(req.user.role);

    // Ownership check on lookup
    const patientQuery = privileged
      ? 'SELECT * FROM patients WHERE patient_id = $1'
      : 'SELECT * FROM patients WHERE patient_id = $1 AND location_id = $2';
    const patientParams = privileged
      ? [patientId]
      : [patientId, req.user.location_id || null];

    const patientResult = await pool.query(patientQuery, patientParams);
    
    if (patientResult.rows.length === 0) {
      return res.status(404).json({ error: 'Patient not found' });
    }
    
    const patient = patientResult.rows[0];
    
    // Bulk-load visits, lesions, and photos in 3 queries (no N+1)
    const visitsResult = await pool.query(
      'SELECT * FROM visits WHERE patient_id = $1 ORDER BY visit_date DESC',
      [patientId]
    );
    
    const visitIds = visitsResult.rows.map(v => v.visit_id);

    let lesionsResult = { rows: [] };
    let photosResult = { rows: [] };

    if (visitIds.length > 0) {
      [lesionsResult, photosResult] = await Promise.all([
        pool.query(
          'SELECT * FROM lesions WHERE visit_id = ANY($1) ORDER BY created_at',
          [visitIds]
        ),
        pool.query(
          `SELECT photo_id, lesion_id,
                  photo_type AS capture_type, mime_type, file_size,
                  created_at AS captured_at, created_by AS captured_by
           FROM photos WHERE visit_id = ANY($1)`,
          [visitIds]
        ),
      ]);
    }

    const photosByLesion = {};
    photosResult.rows.forEach(p => {
      const obj = { ...p, url: `/api/photos/${p.photo_id}` };
      (photosByLesion[p.lesion_id] = photosByLesion[p.lesion_id] || []).push(obj);
    });

    const lesionsByVisit = {};
    lesionsResult.rows.forEach(l => {
      l.photos = photosByLesion[l.lesion_id] || [];
      (lesionsByVisit[l.visit_id] = lesionsByVisit[l.visit_id] || []).push(l);
    });

    patient.visits = visitsResult.rows.map(v => {
      v.lesions = lesionsByVisit[v.visit_id] || [];
      return v;
    });
    
    await logAudit({
      userId: req.user.id, userName: req.user.name, userRole: req.user.role,
      action: 'VIEW_PATIENT', resourceType: 'patient', resourceId: patientId,
      ip: req.ip,
    });
    res.json(patient);
  } catch (error) {
    console.error('Error fetching patient:', error);
    res.status(500).json({ error: 'Failed to fetch patient' });
  }
});

// Create patient
router.post('/', createPatientRules, async (req, res) => {
  if (!validate(req, res)) return;
  try {
    const patient = req.body;
    // New patients inherit the creating user's location unless admin overrides
    const locationId = patient.location_id || req.user.location_id || null;
    
    const result = await pool.query(
      `INSERT INTO patients (
        patient_id, mrn, first_name, last_name, date_of_birth, sex, phone, email,
        skin_type, allergies, skin_cancer_history, family_history, risk_score, tags, location_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      RETURNING *`,
      [
        patient.patient_id, patient.mrn, patient.first_name, patient.last_name,
        patient.date_of_birth, patient.sex, patient.phone, patient.email,
        patient.skin_type, patient.allergies, patient.skin_cancer_history,
        patient.family_history, patient.risk_score, patient.tags || [], locationId
      ]
    );
    
    await logAudit({
      userId: req.user.id, userName: req.user.name, userRole: req.user.role,
      action: 'CREATE_PATIENT', resourceType: 'patient',
      resourceId: result.rows[0].patient_id,
      ip: req.ip,
    });
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating patient:', error);
    res.status(500).json({ error: 'Failed to create patient' });
  }
});

// Update patient
router.put('/:patientId', updatePatientRules, async (req, res) => {
  if (!validate(req, res)) return;
  try {
    const { patientId } = req.params;
    const updates = req.body;
    const privileged = isPrivileged(req.user.role);
    
    const result = await pool.query(
      `UPDATE patients SET
        first_name = COALESCE($2, first_name),
        last_name = COALESCE($3, last_name),
        phone = COALESCE($4, phone),
        email = COALESCE($5, email),
        allergies = COALESCE($6, allergies),
        updated_at = CURRENT_TIMESTAMP
      WHERE patient_id = $1
        AND ($7 OR location_id = $8)
      RETURNING *`,
      [patientId, updates.first_name, updates.last_name, updates.phone,
       updates.email, updates.allergies, privileged, req.user.location_id || null]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Patient not found' });
    }
    
    await logAudit({
      userId: req.user.id, userName: req.user.name, userRole: req.user.role,
      action: 'UPDATE_PATIENT', resourceType: 'patient', resourceId: patientId,
      ip: req.ip,
    });
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating patient:', error);
    res.status(500).json({ error: 'Failed to update patient' });
  }
});

// Delete patient — admin/manager only
router.delete('/:patientId', async (req, res) => {
  if (!isPrivileged(req.user.role)) {
    return res.status(403).json({ error: 'Insufficient permissions' });
  }
  try {
    const { patientId } = req.params;
    
    const result = await pool.query(
      `DELETE FROM patients WHERE patient_id = $1 RETURNING patient_id`,
      [patientId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Patient not found' });
    }
    
    await logAudit({
      userId: req.user.id, userName: req.user.name, userRole: req.user.role,
      action: 'DELETE_PATIENT', resourceType: 'patient', resourceId: patientId,
      ip: req.ip,
    });
    res.json({ message: 'Patient deleted', patient_id: patientId });
  } catch (error) {
    console.error('Error deleting patient:', error);
    res.status(500).json({ error: 'Failed to delete patient' });
  }
});

export default router;
