import express from 'express';
import pool from '../db/pool.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();
router.use(authenticateToken);

// Returns true if the role can see all locations' data
const isPrivileged = (role) => ['admin', 'manager'].includes(role);

// GET /api/schedule/today — today's visits with patient info and stats
router.get('/today', async (req, res) => {
  try {
    const privileged = isPrivileged(req.user.role);
    const locationId = req.user.location_id || null;

    // Filter visits to the user's clinic unless admin/manager
    const visitsResult = await pool.query(`
      SELECT
        v.visit_id,
        v.visit_date,
        v.status,
        v.chief_complaint,
        v.provider_id,
        v.provider_name,
        v.ma_id,
        v.ma_name,
        p.patient_id,
        p.first_name,
        p.last_name,
        p.mrn,
        p.date_of_birth,
        p.skin_type,
        (SELECT COUNT(*)::int FROM lesions l WHERE l.patient_id = p.patient_id) AS total_lesions,
        (SELECT MAX(v2.visit_date) FROM visits v2 WHERE v2.patient_id = p.patient_id AND v2.visit_id != v.visit_id) AS last_visit_date
      FROM visits v
      JOIN patients p ON v.patient_id = p.patient_id
      WHERE DATE(v.visit_date AT TIME ZONE 'UTC') = CURRENT_DATE
        AND ($1 OR p.location_id = $2)
      ORDER BY v.visit_date ASC
    `, [privileged, locationId]);

    // Aggregate stats scoped to the same location
    const statsResult = await pool.query(`
      SELECT
        COUNT(DISTINCT v.visit_id)::int AS scheduled,
        COUNT(DISTINCT CASE WHEN v.status IN ('locked', 'signed') THEN v.visit_id END)::int AS completed,
        COUNT(ph.photo_id)::int AS photos_today,
        COALESCE(AVG(EXTRACT(EPOCH FROM (v.completed_at - v.created_at)))
          FILTER (WHERE v.completed_at IS NOT NULL AND v.completed_at - v.created_at < interval '1 hour'), 0
        )::numeric(5,1) AS avg_doc_time_sec
      FROM visits v
      JOIN patients p ON v.patient_id = p.patient_id
      LEFT JOIN lesions l ON l.visit_id = v.visit_id
      LEFT JOIN photos ph ON ph.lesion_id = l.lesion_id AND DATE(ph.created_at AT TIME ZONE 'UTC') = CURRENT_DATE
      WHERE DATE(v.visit_date AT TIME ZONE 'UTC') = CURRENT_DATE
        AND ($1 OR p.location_id = $2)
    `, [privileged, locationId]);

    const stats = statsResult.rows[0];

    const appointments = visitsResult.rows.map((row) => ({
      visit_id: row.visit_id,
      time: new Date(row.visit_date).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
      reason: row.chief_complaint || 'Dermatology visit',
      status: row.status,
      patient: {
        patient_id: row.patient_id,
        first_name: row.first_name,
        last_name: row.last_name,
        mrn: row.mrn,
        date_of_birth: row.date_of_birth,
        skin_type: row.skin_type,
        total_lesions: row.total_lesions,
        last_visit_date: row.last_visit_date,
        // Stub visits array so downstream code doesn't break
        visits: [],
      },
    }));

    res.json({
      appointments,
      stats: {
        scheduled: stats.scheduled,
        completed: stats.completed,
        photos_today: stats.photos_today,
        avg_doc_time_sec: parseFloat(stats.avg_doc_time_sec) || 0,
      },
    });
  } catch (error) {
    console.error('Error fetching today schedule:', error);
    res.status(500).json({ error: 'Failed to fetch schedule' });
  }
});

export default router;
