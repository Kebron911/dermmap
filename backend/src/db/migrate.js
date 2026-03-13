/**
 * Programmatic migration runner — wraps node-pg-migrate.
 *
 * Usage (via npm scripts):
 *   npm run db:migrate          → apply all pending migrations
 *   npm run db:rollback         → roll back the last migration
 *   npm run db:rollback -- 3    → roll back the last 3 migrations
 *
 * DATABASE_URL env var is preferred. If absent, one is constructed from the
 * individual DB_HOST / DB_PORT / DB_NAME / DB_USER / DB_PASSWORD vars so
 * that existing .env files work without modification.
 */

import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const direction = process.argv[2] || 'up';
const count = process.argv[3] ? parseInt(process.argv[3], 10) : undefined;

// Prefer DATABASE_URL; fall back to constructing one from individual vars.
const databaseUrl = process.env.DATABASE_URL || (() => {
  const user   = encodeURIComponent(process.env.DB_USER     || 'postgres');
  const pass   = encodeURIComponent(process.env.DB_PASSWORD || '');
  const host   = process.env.DB_HOST || 'localhost';
  const port   = process.env.DB_PORT || '5432';
  const dbname = process.env.DB_NAME || 'dermmap';
  const ssl    = process.env.DB_SSL === 'true' ? '?sslmode=require' : '';
  return `postgres://${user}:${pass}@${host}:${port}/${dbname}${ssl}`;
})();

const migrationsDir = resolve(__dirname, '../../migrations');

let runner;
try {
  // node-pg-migrate v6+ default export is the runner function.
  // Using dynamic import handles both CJS interop and pure ESM packages.
  ({ default: runner } = await import('node-pg-migrate'));
} catch (err) {
  console.error('Failed to load node-pg-migrate:', err.message);
  process.exit(1);
}

try {
  const opts = {
    databaseUrl,
    dir: migrationsDir,
    direction,
    migrationsTable: 'pgmigrations',
    verbose: true,
  };
  if (count != null) opts.count = count;

  await runner(opts);
  console.log(`\n✓ Migrations [${direction}] complete`);
  process.exit(0);
} catch (err) {
  console.error('\nMigration error:', err.message);
  process.exit(1);
}
