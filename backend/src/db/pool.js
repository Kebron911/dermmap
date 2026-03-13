import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

if (!process.env.DB_PASSWORD && process.env.NODE_ENV !== 'test') {
  console.error('FATAL: DB_PASSWORD environment variable is not set.');
  process.exit(1);
}

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'dermmap',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
  // SSL/TLS for ePHI in transit (HIPAA §164.312(e)(1)) — set DB_SSL=true in cloud deployments
  ssl: process.env.DB_SSL === 'true'
    ? { rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED !== 'false' }
    : false,
});

// Test connection
pool.on('connect', () => {
  console.log('✓ Database connected');
});

pool.on('error', (err) => {
  console.error('Database error:', err);
  process.exit(-1);
});

export default pool;
