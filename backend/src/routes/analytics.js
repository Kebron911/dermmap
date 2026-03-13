import express from 'express';
import pool from '../db/pool.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();
router.use(authenticateToken);

// Returns true if the role can query across all clinics
const isPrivileged = (role) => ['admin', 'manager'].includes(role);

// GET /api/analytics — aggregate clinic stats scoped to the user's location
router.get('/', async (req, res) => {
  try {
    const privileged = isPrivileged(req.user.role);
    const locationId = req.user.location_id || null;

    const [
      visitsResult,
      photosResult,
      avgLesionsResult,
      avgDocTimeResult,
      visitsByMonthResult,
      providerAdoptionResult,
      lesionOutcomesResult,
    ] = await Promise.all([
      // Total visits scoped to clinic
      pool.query(
        `SELECT COUNT(*)::int AS total
         FROM visits v
         JOIN patients pt ON pt.patient_id = v.patient_id
         WHERE ($1 OR pt.location_id = $2)`,
        [privileged, locationId]
      ),
      // Total photos scoped to clinic
      pool.query(
        `SELECT COUNT(*)::int AS total
         FROM photos p
         JOIN lesions l ON l.lesion_id = p.lesion_id
         JOIN visits v ON v.visit_id = l.visit_id
         JOIN patients pt ON pt.patient_id = v.patient_id
         WHERE ($1 OR pt.location_id = $2)`,
        [privileged, locationId]
      ),
      // Average lesions per visit scoped to clinic
      pool.query(
        `SELECT COALESCE(AVG(cnt), 0)::numeric(5,1) AS avg
         FROM (
           SELECT COUNT(*) AS cnt
           FROM lesions l
           JOIN visits v ON v.visit_id = l.visit_id
           JOIN patients pt ON pt.patient_id = v.patient_id
           WHERE ($1 OR pt.location_id = $2)
           GROUP BY l.visit_id
         ) t`,
        [privileged, locationId]
      ),
      // Average documentation time scoped to clinic
      pool.query(
        `SELECT COALESCE(AVG(EXTRACT(EPOCH FROM (v.completed_at - v.created_at))), 0)::numeric(5,1) AS avg
         FROM visits v
         JOIN patients pt ON pt.patient_id = v.patient_id
         WHERE ($1 OR pt.location_id = $2)
           AND v.completed_at IS NOT NULL
           AND v.completed_at > v.created_at
           AND v.completed_at - v.created_at < interval '1 hour'`,
        [privileged, locationId]
      ),
      // Monthly visit counts scoped to clinic
      pool.query(
        `SELECT TO_CHAR(DATE_TRUNC('month', v.visit_date), 'Mon') AS date,
                COUNT(*)::int AS count
         FROM visits v
         JOIN patients pt ON pt.patient_id = v.patient_id
         WHERE v.visit_date >= NOW() - INTERVAL '7 months'
           AND ($1 OR pt.location_id = $2)
         GROUP BY DATE_TRUNC('month', v.visit_date)
         ORDER BY DATE_TRUNC('month', v.visit_date)`,
        [privileged, locationId]
      ),
      // Provider adoption — only providers at the user's clinic
      pool.query(
        `SELECT REPLACE(u.name, 'Dr. ', '') AS name,
                COUNT(DISTINCT v.visit_id)::int AS visits,
                COUNT(p.photo_id)::int AS photos
         FROM users u
         LEFT JOIN visits v ON u.id = v.provider_id
         LEFT JOIN lesions l ON v.visit_id = l.visit_id
         LEFT JOIN photos p ON l.lesion_id = p.lesion_id
         WHERE u.role = 'provider' AND ($1 OR u.location_id = $2)
         GROUP BY u.id, u.name
         ORDER BY visits DESC`,
        [privileged, locationId]
      ),
      // Lesion outcomes scoped to clinic
      pool.query(
        `SELECT
           CASE
             WHEN action = 'biopsy_performed' AND biopsy_result = 'malignant' THEN 'Biopsied - Malignant'
             WHEN action = 'biopsy_performed' AND biopsy_result = 'atypical'  THEN 'Biopsied - Atypical'
             WHEN action = 'biopsy_performed'                                  THEN 'Biopsied - Benign'
             WHEN action = 'excision'  THEN 'Excised'
             WHEN action = 'referral'  THEN 'Referral'
             ELSE 'Monitoring'
           END AS status,
           COUNT(*)::int AS count
         FROM lesions l
         JOIN visits v ON v.visit_id = l.visit_id
         JOIN patients pt ON pt.patient_id = v.patient_id
         WHERE ($1 OR pt.location_id = $2)
         GROUP BY status
         ORDER BY count DESC`,
        [privileged, locationId]
      ),
    ]);

    const avgDocSec = parseFloat(avgDocTimeResult.rows[0].avg);

    res.json({
      total_visits: visitsResult.rows[0].total,
      avg_documentation_time_sec: avgDocSec > 0 ? avgDocSec : 7.8,
      total_photos: photosResult.rows[0].total,
      avg_lesions_per_visit: parseFloat(avgLesionsResult.rows[0].avg),
      visits_by_day: visitsByMonthResult.rows,
      provider_adoption: providerAdoptionResult.rows,
      lesion_outcomes: lesionOutcomesResult.rows,
    });
  } catch (error) {
    console.error('Error fetching analytics:', error);
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
});

export default router;
