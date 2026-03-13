/**
 * Migration 2: Add credential columns to users
 * Adds role-credential text, account status, last-login timestamp,
 * and multi-clinic location support to the users table.
 * All operations use IF NOT EXISTS / .catch so they are safe to replay.
 */

export const up = (pgm) => {
  pgm.sql(`ALTER TABLE users ADD COLUMN IF NOT EXISTS credentials    VARCHAR(100);`);
  pgm.sql(`ALTER TABLE users ADD COLUMN IF NOT EXISTS status         VARCHAR(20) NOT NULL DEFAULT 'active';`);
  pgm.sql(`ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login_at  TIMESTAMP;`);
  pgm.sql(`ALTER TABLE users ADD COLUMN IF NOT EXISTS location_id    VARCHAR(100);`);
};

export const down = (pgm) => {
  pgm.sql(`ALTER TABLE users DROP COLUMN IF EXISTS location_id;`);
  pgm.sql(`ALTER TABLE users DROP COLUMN IF EXISTS last_login_at;`);
  pgm.sql(`ALTER TABLE users DROP COLUMN IF EXISTS status;`);
  pgm.sql(`ALTER TABLE users DROP COLUMN IF EXISTS credentials;`);
};
