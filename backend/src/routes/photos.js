import express from 'express';
import pool from '../db/pool.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Allowlist of accepted image MIME types — prevents stored XSS via Content-Type injection
const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
const DEFAULT_MIME = 'image/jpeg';

// Get photo (serves the binary data) — authentication required: photos are PHI
router.get('/:photoId', authenticateToken, async (req, res) => {
  try {
    const { photoId } = req.params;
    const isAdmin = ['admin', 'manager'].includes(req.user.role);

    // Join through lesion → visit → patient to enforce ownership/tenancy
    const result = await pool.query(
      `SELECT p.photo_data, p.mime_type
       FROM photos p
       JOIN lesions l ON l.lesion_id = p.lesion_id
       JOIN visits v ON v.visit_id = l.visit_id
       JOIN patients pt ON pt.patient_id = v.patient_id
       WHERE p.photo_id = $1
         AND ($2 OR pt.location_id = $3)`,
      [photoId, isAdmin, req.user.location_id || null]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Photo not found' });
    }
    
    const photo = result.rows[0];
    // Sanitize mime_type against allowlist before setting Content-Type header
    const safeMime = ALLOWED_MIME_TYPES.has(photo.mime_type) ? photo.mime_type : DEFAULT_MIME;
    res.setHeader('Content-Type', safeMime);
    // PHI — must not be cached by shared/public caches
    res.setHeader('Cache-Control', 'private, no-store');
    res.send(photo.photo_data);
    
  } catch (error) {
    console.error('Error fetching photo:', error);
    res.status(500).json({ error: 'Failed to fetch photo' });
  }
});

// Upload photo (requires authentication)
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { photo_id, lesion_id, visit_id, photo_data, photo_type, mime_type } = req.body;
    
    if (!photo_id || !lesion_id || !visit_id || !photo_data) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Validate MIME type against allowlist before persisting
    if (mime_type && !ALLOWED_MIME_TYPES.has(mime_type)) {
      return res.status(400).json({ error: `Invalid mime_type. Allowed: ${[...ALLOWED_MIME_TYPES].join(', ')}` });
    }
    const safeMime = ALLOWED_MIME_TYPES.has(mime_type) ? mime_type : DEFAULT_MIME;
    
    // Convert base64 to binary
    const buffer = Buffer.from(photo_data, 'base64');
    
    const result = await pool.query(
      `INSERT INTO photos (photo_id, lesion_id, visit_id, photo_data, photo_type, mime_type, file_size, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING photo_id, photo_type, mime_type, file_size, created_at`,
      [photo_id, lesion_id, visit_id, buffer, photo_type || 'clinical', safeMime, buffer.length, req.user.id]
    );
    
    res.status(201).json({
      ...result.rows[0],
      url: `/api/photos/${photo_id}`
    });
    
  } catch (error) {
    console.error('Error uploading photo:', error);
    res.status(500).json({ error: 'Failed to upload photo' });
  }
});

// Delete photo
router.delete('/:photoId', authenticateToken, async (req, res) => {
  try {
    const { photoId } = req.params;
    const isAdmin = ['admin', 'manager'].includes(req.user.role);

    // Enforce ownership: delete only if the photo belongs to the user's location
    const result = await pool.query(
      `DELETE FROM photos
       WHERE photo_id = $1
         AND EXISTS (
           SELECT 1 FROM lesions l
           JOIN visits v ON v.visit_id = l.visit_id
           JOIN patients pt ON pt.patient_id = v.patient_id
           WHERE l.lesion_id = photos.lesion_id
             AND ($2 OR pt.location_id = $3)
         )
       RETURNING photo_id`,
      [photoId, isAdmin, req.user.location_id || null]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Photo not found' });
    }
    
    res.json({ message: 'Photo deleted', photo_id: photoId });
  } catch (error) {
    console.error('Error deleting photo:', error);
    res.status(500).json({ error: 'Failed to delete photo' });
  }
});

export default router;
