/**
 * Global test setup — set required env vars before any module is loaded.
 */

// Provide required env vars before server/pool modules are imported
process.env.JWT_SECRET = 'test-secret-key-for-vitest-only';
process.env.NODE_ENV = 'test';
