import jwt from 'jsonwebtoken';
import pool from '../db/pool.js';

// Async so we can hit the DB to check revocation status and user.status
export const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  let user;
  try {
    // Constrain to HS256 to prevent alg:none and algorithm-confusion attacks
    user = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] });
  } catch {
    return res.status(403).json({ error: 'Invalid or expired token' });
  }

  // Revocation + user-status check (Issue 2-D)
  // Tokens issued before the user_sessions table existed have no jti — fall through gracefully
  if (user.jti) {
    try {
      const result = await pool.query(
        `SELECT s.revoked_at, u.status
         FROM user_sessions s
         JOIN users u ON u.id = s.user_id
         WHERE s.jti = $1 AND s.expires_at > NOW()`,
        [user.jti]
      );
      if (
        result.rows.length === 0 ||        // session not found or expired
        result.rows[0].revoked_at !== null || // session was revoked (logout, rotation)
        result.rows[0].status === 'inactive'  // account deactivated (Issue 18)
      ) {
        return res.status(401).json({ error: 'Session invalid or expired' });
      }
    } catch (dbError) {
      console.error('Session validation DB error:', dbError);
      return res.status(500).json({ error: 'Authentication error' });
    }
  }

  req.user = user;
  next();
};

export const authorizeRoles = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    next();
  };
};
