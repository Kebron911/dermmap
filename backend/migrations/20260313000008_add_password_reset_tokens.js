/**
 * Migration 8: Add password_reset_tokens table (Issue 4)
 * Stores SHA-256 hashed, single-use password reset tokens with expiry.
 * Tokens are never stored in plain text — the raw token is e-mailed once
 * and the hash is persisted here for verification.
 * HIPAA §164.312(d) — Person or Entity Authentication.
 */

export const up = (pgm) => {
  pgm.sql(`
    CREATE TABLE IF NOT EXISTS password_reset_tokens (
      token_hash VARCHAR(255) PRIMARY KEY,
      user_id    VARCHAR(100) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      expires_at TIMESTAMP    NOT NULL,
      used_at    TIMESTAMP
    );
  `);

  pgm.sql(`CREATE INDEX IF NOT EXISTS idx_prt_user_id ON password_reset_tokens(user_id);`);
};

export const down = (pgm) => {
  pgm.sql(`DROP TABLE IF EXISTS password_reset_tokens;`);
};
