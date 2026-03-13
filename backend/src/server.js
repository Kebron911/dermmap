import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.js';
import patientRoutes from './routes/patients.js';
import visitRoutes from './routes/visits.js';
import lesionRoutes from './routes/lesions.js';
import photoRoutes from './routes/photos.js';
import syncRoutes from './routes/sync.js';
import userAdminRoutes from './routes/users.js';
import analyticsRoutes from './routes/analytics.js';
import auditLogRoutes from './routes/auditLogs.js';
import scheduleRoutes from './routes/schedule.js';
import settingsRoutes from './routes/settings.js';
import provisionRoutes from './routes/provision.js';
import { cleanupExpiredSessions, cleanupExpiredResetTokens } from './db/cleanup.js';

dotenv.config();

// Fail fast if critical secrets are missing (skip in test where vitest.config.js injects them)
if (process.env.NODE_ENV !== 'test') {
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
    console.error('FATAL: JWT_SECRET must be set and at least 32 characters long.');
    process.exit(1);
  }
}

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" } // Allow cross-origin for photos
}));
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  credentials: true
}));
app.use(compression());
app.use(express.json({
  limit: '10mb',
  // Capture raw body bytes so the DocuSign webhook handler can verify the
  // HMAC-SHA256 signature over the exact bytes received (Issue 6).
  verify: (req, _res, buf) => { req.rawBody = buf; },
})); // For photo uploads and DocuSign webhook signature verification
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Global rate limiter — 300 requests per minute per IP
app.use(rateLimit({
  windowMs: 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Please slow down.' },
}));

// Request logging middleware — includes user, IP, and status (HIPAA audit — Issue 25)
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const userId = req.user?.id || 'anonymous';
    const ip = req.ip || req.headers['x-forwarded-for'] || 'unknown';
    const duration = Date.now() - start;
    console.log(`${new Date().toISOString()} ${req.method} ${req.path} user=${userId} ip=${ip} status=${res.statusCode} ${duration}ms`);
  });
  next();
});

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/patients', patientRoutes);
app.use('/api/visits', visitRoutes);
app.use('/api/lesions', lesionRoutes);
app.use('/api/photos', photoRoutes);
app.use('/api/sync', syncRoutes);
app.use('/api/admin/users', userAdminRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/audit-logs', auditLogRoutes);
app.use('/api/schedule', scheduleRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/provision', provisionRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Error handling middleware — stack traces logged server-side only, never in responses (Issue 28)
app.use((err, req, res, next) => {
  console.error('Error:', err.stack || err);
  
  res.status(err.status || 500).json({
    error: err.status && err.status < 500 ? err.message : 'Internal server error',
  });
});

// Start server only when not running under test
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`\n✓ DermMap API Server running on port ${PORT}`);
    console.log(`  Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`  Health check: http://localhost:${PORT}/health\n`);
  });

  // Run cleanup immediately on startup, then every 6 hours
  const SIX_HOURS_MS = 6 * 60 * 60 * 1000;
  cleanupExpiredSessions().catch(err => console.error('[cleanup] Error cleaning sessions:', err));
  cleanupExpiredResetTokens().catch(err => console.error('[cleanup] Error cleaning reset tokens:', err));
  setInterval(() => {
    cleanupExpiredSessions().catch(err => console.error('[cleanup] Error cleaning sessions:', err));
    cleanupExpiredResetTokens().catch(err => console.error('[cleanup] Error cleaning reset tokens:', err));
  }, SIX_HOURS_MS);
}

export default app;
