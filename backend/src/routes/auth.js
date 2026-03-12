import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { randomUUID } from 'crypto';
import rateLimit from 'express-rate-limit';
import pool from '../db/pool.js';
import { authenticateToken, authorizeRoles } from '../middleware/auth.js';

const router = express.Router();

// Strict rate limiter for the login endpoint — brute-force protection
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,                   // 10 attempts per window per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many login attempts. Please try again in 15 minutes.' },
});

// Login
router.post('/login', loginLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }
    
    // Find user
    const result = await pool.query(
      'SELECT id, name, email, role, location_id, password_hash FROM users WHERE email = $1',
      [email]
    );
    
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    const user = result.rows[0];
    
    // Verify password
    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    // Generate JWT — explicitly HS256 to match the algorithm constraint in authenticateToken
    const token = jwt.sign(
      { 
        id: user.id,
        email: user.email,
        role: user.role,
        location_id: user.location_id || null,
      },
      process.env.JWT_SECRET,
      { algorithm: 'HS256', expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
    );
    
    // Return user data and token
    res.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        location_id: user.location_id || null,
      },
      token
    });
    
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Register — requires an authenticated admin/manager to create accounts.
// Self-registration is disabled to prevent unauthorised access to PHI.
router.post('/register', authenticateToken, authorizeRoles('admin', 'manager'), async (req, res) => {
  try {
    const { name, email, password, role, location_id } = req.body;
    
    if (!name || !email || !password || !role) {
      return res.status(400).json({ error: 'All fields required' });
    }
    
    if (password.length < 12) {
      return res.status(400).json({ error: 'Password must be at least 12 characters (HIPAA requirement)' });
    }
    
    if (!['ma', 'provider', 'manager'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }
    
    // Check if user exists
    const existingUser = await pool.query(
      'SELECT id FROM users WHERE email = $1',
      [email]
    );
    
    if (existingUser.rows.length > 0) {
      return res.status(409).json({ error: 'User already exists' });
    }
    
    // Hash password with cost factor 12 (HIPAA-grade)
    const hashedPassword = await bcrypt.hash(password, 12);
    
    // Generate cryptographically random user ID
    const userId = randomUUID();
    
    // Insert user
    await pool.query(
      'INSERT INTO users (id, name, email, password_hash, role, location_id) VALUES ($1, $2, $3, $4, $5, $6)',
      [userId, name, email, hashedPassword, role, location_id || req.user.location_id || null]
    );
    
    // Generate JWT with explicit HS256
    const token = jwt.sign(
      { id: userId, email, role, location_id: location_id || req.user.location_id || null },
      process.env.JWT_SECRET,
      { algorithm: 'HS256', expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
    );
    
    res.status(201).json({
      user: { id: userId, name, email, role, location_id: location_id || null },
      token
    });
    
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// Verify token (for frontend to check if token is still valid)
router.get('/verify', authenticateToken, (req, res) => {
  res.json({
    user: {
      id: req.user.id,
      email: req.user.email,
      role: req.user.role,
      location_id: req.user.location_id || null,
    },
    valid: true
  });
});

// Refresh token
router.post('/refresh', authenticateToken, (req, res) => {
  const token = jwt.sign(
    { 
      id: req.user.id,
      email: req.user.email,
      role: req.user.role,
      location_id: req.user.location_id || null,
    },
    process.env.JWT_SECRET,
    { algorithm: 'HS256', expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
  );
  
  res.json({ token });
});

export default router;
