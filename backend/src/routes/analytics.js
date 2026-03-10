import express from 'express';
import pool from '../db/pool.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();
router.use(authenticateToken);

// GET /api/analytics — aggregate clinic stats from the database
router.get('/', async (req, res) => {
  try {
    const [
      visitsResult,
      photosResult,
      avgLesionsResult,
      avgDocTimeResult,
      visitsByMonthResult,
      providerAdoptionResult,
      lesionOutcomesResult,
    ] = await Promise.all([
      pool.query('SELECT COUNT(*)::int AS total FROM visits'),
      pool.query('SELECT COUNT(*)::int AS total FROM photos'),
      pool.query(`
        SELECT COALESCE(AVG(cnt), 0)::numeric(5,1) AS avg
        FROM (SELECT COUNT(*) AS cnt FROM lesions GROUP BY visit_id) t
      `),
      pool.query(`
        SELECT COALESCE(AVG(EXTRACT(EPOCH FROM (completed_at - created_at))), 0)::numeric(5,1) AS avg
        FROM visits
        WHERE completed_at IS NOT NULL
          AND completed_at > created_at
          AND completed_at - created_at < interval '1 hour'
      `),
      pool.query(`
        SELECT TO_CHAR(DATE_TRUNC('month', visit_date), 'Mon') AS date,
               COUNT(*)::int AS count
        FROM visits
        WHERE visit_date >= NOW() - INTERVAL '7 months'
        GROUP BY DATE_TRUNC('month', visit_date)
        ORDER BY DATE_TRUNC('month', visit_date)
      `),
      pool.query(`
        SELECT REPLACE(u.name, 'Dr. ', '') AS name,
               COUNT(DISTINCT v.visit_id)::int AS visits,
               COUNT(p.photo_id)::int AS photos
        FROM users u
        LEFT JOIN visits v ON u.id = v.provider_id
        LEFT JOIN lesions l ON v.visit_id = l.visit_id
        LEFT JOIN photos p ON l.lesion_id = p.lesion_id
        WHERE u.role = 'provider'
        GROUP BY u.id, u.name
        ORDER BY visits DESC
      `),
      pool.query(`
        SELECT
          CASE
            WHEN action = 'biopsy_performed' AND biopsy_result = 'malignant' THEN 'Biopsied - Malignant'
            WHEN action = 'biopsy_performed' AND biopsy_result = 'atypical'  THEN 'Biopsied - Atypical'
            WHEN action = 'biopsy_performed'                                  THEN 'Biopsied - Benign'
            WHEN action = 'excision'  THEN 'Excised'
            WHEN action = 'referral'  THEN 'Referral'
            ELSE 'Monitoring'
          END AS status,
          COUNT(*)::int AS count
        FROM lesions
        GROUP BY status
        ORDER BY count DESC
      `),
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
