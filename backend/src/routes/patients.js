import express from 'express';
import pool from '../db/pool.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// Get all patients (with pagination and search), including nested visits → lesions → photos
router.get('/', async (req, res) => {
  try {
    const { search, limit = 50, offset = 0 } = req.query;
    
    let query = `
      SELECT * FROM patients 
      WHERE 1=1
    `;
    const params = [];
    
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

    res.json(patients);
  } catch (error) {
    console.error('Error fetching patients:', error);
    res.status(500).json({ error: 'Failed to fetch patients' });
  }
});

// Get patient by ID (with visits and lesions)
router.get('/:patientId', async (req, res) => {
  try {
    const { patientId } = req.params;
    
    // Get patient
    const patientResult = await pool.query(
      'SELECT * FROM patients WHERE patient_id = $1',
      [patientId]
    );
    
    if (patientResult.rows.length === 0) {
      return res.status(404).json({ error: 'Patient not found' });
    }
    
    const patient = patientResult.rows[0];
    
    // Get visits
    const visitsResult = await pool.query(
      'SELECT * FROM visits WHERE patient_id = $1 ORDER BY visit_date DESC',
      [patientId]
    );
    
    // Get lesions for each visit
    patient.visits = [];
    for (const visit of visitsResult.rows) {
      const lesionsResult = await pool.query(
        'SELECT * FROM lesions WHERE visit_id = $1 ORDER BY created_at',
        [visit.visit_id]
      );
      
      visit.lesions = lesionsResult.rows;
      
      // Get photo metadata for each lesion (not the actual BLOB data)
      for (const lesion of visit.lesions) {
        const photosResult = await pool.query(
          `SELECT photo_id, photo_type AS capture_type, mime_type, file_size,
                  created_at AS captured_at, created_by AS captured_by
           FROM photos WHERE lesion_id = $1`,
          [lesion.lesion_id]
        );
        lesion.photos = photosResult.rows.map(p => ({
          ...p,
          url: `/api/photos/${p.photo_id}`,
        }));
      }
      
      patient.visits.push(visit);
    }
    
    res.json(patient);
  } catch (error) {
    console.error('Error fetching patient:', error);
    res.status(500).json({ error: 'Failed to fetch patient' });
  }
});

// Create patient
router.post('/', async (req, res) => {
  try {
    const patient = req.body;
    
    const result = await pool.query(
      `INSERT INTO patients (
        patient_id, mrn, first_name, last_name, date_of_birth, sex, phone, email,
        skin_type, allergies, skin_cancer_history, family_history, risk_score, tags
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      RETURNING *`,
      [
        patient.patient_id, patient.mrn, patient.first_name, patient.last_name,
        patient.date_of_birth, patient.sex, patient.phone, patient.email,
        patient.skin_type, patient.allergies, patient.skin_cancer_history,
        patient.family_history, patient.risk_score, patient.tags || []
      ]
    );
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating patient:', error);
    res.status(500).json({ error: 'Failed to create patient' });
  }
});

// Update patient
router.put('/:patientId', async (req, res) => {
  try {
    const { patientId } = req.params;
    const updates = req.body;
    
    const result = await pool.query(
      `UPDATE patients SET
        first_name = COALESCE($2, first_name),
        last_name = COALESCE($3, last_name),
        phone = COALESCE($4, phone),
        email = COALESCE($5, email),
        allergies = COALESCE($6, allergies),
        updated_at = CURRENT_TIMESTAMP
      WHERE patient_id = $1
      RETURNING *`,
      [patientId, updates.first_name, updates.last_name, updates.phone, updates.email, updates.allergies]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Patient not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating patient:', error);
    res.status(500).json({ error: 'Failed to update patient' });
  }
});

// Delete patient
router.delete('/:patientId', async (req, res) => {
  try {
    const { patientId } = req.params;
    
    const result = await pool.query(
      'DELETE FROM patients WHERE patient_id = $1 RETURNING patient_id',
      [patientId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Patient not found' });
    }
    
    res.json({ message: 'Patient deleted', patient_id: patientId });
  } catch (error) {
    console.error('Error deleting patient:', error);
    res.status(500).json({ error: 'Failed to delete patient' });
  }
});

export default router;
