import pool from './pool.js';

/**
 * Removes expired, unrevoked sessions from user_sessions.
 * Called at startup and every 6 hours to keep the table small.
 */
export async function cleanupExpiredSessions() {
  const result = await pool.query(
    `DELETE FROM user_sessions WHERE expires_at < NOW()`
  );
  console.log(`[cleanup] Removed ${result.rowCount} expired session(s)`);
}

/**
 * Removes expired, unused password-reset tokens.
 * Tokens that were already used (used_at IS NOT NULL) can also be pruned.
 */
export async function cleanupExpiredResetTokens() {
  const result = await pool.query(
    `DELETE FROM password_reset_tokens
     WHERE expires_at < NOW() OR used_at IS NOT NULL`
  );
  console.log(`[cleanup] Removed ${result.rowCount} expired/used reset token(s)`);
}
