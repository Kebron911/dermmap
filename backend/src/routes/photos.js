import express from 'express';
import pool from '../db/pool.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Get photo (serves the binary data)
router.get('/:photoId', async (req, res) => {
  try {
    const { photoId } = req.params;
    
    const result = await pool.query(
      'SELECT photo_data, mime_type FROM photos WHERE photo_id = $1',
      [photoId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Photo not found' });
    }
    
    const photo = result.rows[0];
    
    res.setHeader('Content-Type', photo.mime_type);
    res.setHeader('Cache-Control', 'public, max-age=31536000'); // Cache for 1 year
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
    
    // Convert base64 to binary
    const buffer = Buffer.from(photo_data, 'base64');
    
    const result = await pool.query(
      `INSERT INTO photos (photo_id, lesion_id, visit_id, photo_data, photo_type, mime_type, file_size, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING photo_id, photo_type, mime_type, file_size, created_at`,
      [photo_id, lesion_id, visit_id, buffer, photo_type || 'clinical', mime_type || 'image/jpeg', buffer.length, req.user.id]
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
    
    const result = await pool.query(
      'DELETE FROM photos WHERE photo_id = $1 RETURNING photo_id',
      [photoId]
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
