/**
 * Migration 7: Add user_sessions table (Issue 2)
 * Tracks every issued JWT by its jti (JWT ID) to support server-side
 * token revocation on logout, password change, and account deactivation.
 * HIPAA §164.312(a)(2)(iii) — Automatic Logoff / Session Termination.
 */

export const up = (pgm) => {
  pgm.sql(`
    CREATE TABLE IF NOT EXISTS user_sessions (
      jti        VARCHAR(36)  PRIMARY KEY,
      user_id    VARCHAR(100) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      issued_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
      expires_at TIMESTAMP    NOT NULL,
      revoked_at TIMESTAMP,
      revoked_by VARCHAR(36)
    );
  `);

  pgm.sql(`CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id    ON user_sessions(user_id);`);
  pgm.sql(`CREATE INDEX IF NOT EXISTS idx_user_sessions_expires_at ON user_sessions(expires_at);`);
};

export const down = (pgm) => {
  pgm.sql(`DROP TABLE IF EXISTS user_sessions;`);
};
