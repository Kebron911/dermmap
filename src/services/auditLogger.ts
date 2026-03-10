import { config } from '../config';
import { logger } from './logger';
import { db } from './db';
import { api } from './api';
import type { AuditLogEntry, UserRole } from '../types';

// ---------------------------------------------------------------------------
// Audit Logger — records user actions to IndexedDB (and console in dev).
// ---------------------------------------------------------------------------

let currentUser: { id: string; name: string; role: UserRole } | null = null;

export const auditLogger = {
  setUser(user: { id: string; name: string; role: UserRole } | null) {
    currentUser = user;
  },

  async log(
    actionType: AuditLogEntry['action_type'],
    resourceType: AuditLogEntry['resource_type'],
    resourceId: string,
    details: string,
  ): Promise<void> {
    if (!config.enableAuditLog) return;

    const entry: AuditLogEntry = {
      log_id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      timestamp: new Date().toISOString(),
      user_id: currentUser?.id ?? 'unknown',
      user_name: currentUser?.name ?? 'Unknown',
      user_role: currentUser?.role ?? 'ma',
      action_type: actionType,
      resource_type: resourceType,
      resource_id: resourceId,
      details,
      ip_address: '127.0.0.1', // placeholder — server would populate
      device_id: navigator.userAgent.slice(0, 50),
    };

    try {
      await db.auditLog.put(entry);
    } catch (err) {
      logger.error('Failed to write audit log to IndexedDB', err);
    }

    // In production mode, also persist to the backend (best-effort, non-blocking)
    if (!config.isDemo) {
      api.post('/audit-logs', {
        log_id: entry.log_id,
        timestamp: entry.timestamp,
        action_type: entry.action_type,
        resource_type: entry.resource_type,
        resource_id: entry.resource_id,
        details: entry.details,
        device_id: entry.device_id,
      }).catch((err) => logger.warn('Audit sync to backend failed', err));
    }

    logger.debug('Audit', {
      action: actionType,
      resource: `${resourceType}/${resourceId}`,
      details,
    });
  },

  async getRecentEntries(limit = 100): Promise<AuditLogEntry[]> {
    const all = await db.auditLog.getAll();
    return all
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, limit);
  },
};
