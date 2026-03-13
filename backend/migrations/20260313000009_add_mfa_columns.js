/**
 * Migration 9: Add MFA columns to users (Issue 1)
 * Enables TOTP-based multi-factor authentication.
 *   mfa_secret  — TOTP shared secret (stored encrypted at rest ideally)
 *   mfa_enabled — whether TOTP has been verified and is actively required
 * HIPAA §164.312(d) — Person or Entity Authentication.
 */

export const up = (pgm) => {
  pgm.sql(`ALTER TABLE users ADD COLUMN IF NOT EXISTS mfa_secret  VARCHAR(64);`);
  pgm.sql(`ALTER TABLE users ADD COLUMN IF NOT EXISTS mfa_enabled BOOLEAN NOT NULL DEFAULT FALSE;`);
};

export const down = (pgm) => {
  pgm.sql(`ALTER TABLE users DROP COLUMN IF EXISTS mfa_enabled;`);
  pgm.sql(`ALTER TABLE users DROP COLUMN IF EXISTS mfa_secret;`);
};
