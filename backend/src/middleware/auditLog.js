import { randomUUID } from 'crypto';
import pool from '../db/pool.js';

/**
 * Writes a PHI-access audit record to the audit_logs table.
 * Never throws — a logging failure must not disrupt the clinical workflow.
 *
 * @param {object} opts
 * @param {string} opts.userId       - Authenticated user's id
 * @param {string} opts.userName     - Authenticated user's display name
 * @param {string} opts.userRole     - Authenticated user's role
 * @param {string} opts.action       - Action type, e.g. 'VIEW_PATIENT', 'CREATE_VISIT'
 * @param {string} opts.resourceType - Resource category, e.g. 'patient', 'visit'
 * @param {string} [opts.resourceId] - Primary key of the accessed resource (may be null for list queries)
 * @param {string} [opts.details]    - Optional free-text context
 * @param {string} [opts.ip]         - Client IP address
 */
export async function logAudit({ userId, userName, userRole, action, resourceType, resourceId, details, ip }) {
  try {
    await pool.query(
      `INSERT INTO audit_logs
         (log_id, user_id, user_name, user_role, action_type, resource_type, resource_id, details, ip_address)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        randomUUID(),
        userId   || null,
        userName || null,
        userRole || null,
        action,
        resourceType,
        resourceId || null,
        details    || null,
        ip         || null,
      ]
    );
  } catch (err) {
    console.error('[audit] Failed to write audit log:', err.message);
  }
}
