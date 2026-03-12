import { apiClient } from './apiClient';
import { indexedDBService } from './indexedDB';
import { Patient } from '../types';
import type { SyncConflict } from '../components/sync/ConflictResolutionModal';

// Injected lazily to avoid a circular import with the store.
let onConflictsDetected: ((conflicts: SyncConflict[]) => void) | null = null;

export function registerConflictHandler(handler: (conflicts: SyncConflict[]) => void) {
  onConflictsDetected = handler;
}

// Minimal logger — only writes to console in dev builds, silent in production.
const isDev = import.meta.env.DEV;
const log = {
  info:  (...a: unknown[]) => isDev && console.info(...a),
  warn:  (...a: unknown[]) => isDev && console.warn(...a),
  error: (...a: unknown[]) => isDev && console.error(...a),
};

class SyncService {
  private isSyncing = false;
  private syncInterval: number | null = null;
  private backendAvailable = true;
  private lastConnectionCheck = 0;
  private readonly CONNECTION_CHECK_INTERVAL = 300000; // 5 minutes

  async init(): Promise<void> {
    await indexedDBService.init();
    this.startPeriodicSync();
    window.addEventListener('online', () => this.handleOnline());
    window.addEventListener('offline', () => this.handleOffline());
  }

  private startPeriodicSync() {
    if (this.syncInterval) clearInterval(this.syncInterval);
    this.syncInterval = window.setInterval(() => {
      if (navigator.onLine) this.sync().catch(() => {});
    }, 30000);
  }

  private handleOnline() {
    log.info('SyncService: connection restored');
    this.sync().catch(() => {});
  }

  private handleOffline() {
    log.info('SyncService: offline — changes will queue');
  }

  async sync(): Promise<void> {
    if (this.isSyncing || !navigator.onLine) return;

    const now = Date.now();
    if (!this.backendAvailable && (now - this.lastConnectionCheck < this.CONNECTION_CHECK_INTERVAL)) {
      return;
    }

    try {
      this.isSyncing = true;
      await this.pushChanges();
      await this.pullChanges();
      if (!this.backendAvailable) log.info('SyncService: backend connection restored');
      this.backendAvailable = true;
      this.lastConnectionCheck = now;
    } catch (error) {
      this.lastConnectionCheck = now;
      const isConnectionError = error instanceof TypeError &&
        (error.message.includes('fetch failed') || error.message.includes('Failed to fetch'));
      if (isConnectionError) {
        if (this.backendAvailable) {
          log.warn('SyncService: backend unavailable — working offline');
          this.backendAvailable = false;
        }
      } else {
        log.error('SyncService: sync error', error);
      }
    } finally {
      this.isSyncing = false;
    }
  }

  private async pullChanges(): Promise<void> {
    const lastSync = await indexedDBService.getLastSyncTimestamp();
    const since = lastSync || new Date(0).toISOString();
    const { changes, timestamp } = await apiClient.getChanges(since);
    if (changes.length === 0) {
      await indexedDBService.setLastSyncTimestamp(timestamp);
      return;
    }
    log.info(`SyncService: pulling ${changes.length} change(s)`);
    for (const change of changes) await this.applyChange(change);
    await indexedDBService.setLastSyncTimestamp(timestamp);
  }

  private async pushChanges(): Promise<void> {
    const pendingChanges = await indexedDBService.getPendingChanges();
    if (pendingChanges.length === 0) return;
    log.info(`SyncService: pushing ${pendingChanges.length} change(s)`);

    const formattedChanges = pendingChanges.map((change) => ({
      entity_type: change.entity_type,
      entity_id: change.entity_id,
      operation: change.operation,
      data: change.data,
      client_timestamp: change.timestamp,
    }));

    const { results, conflicts } = await apiClient.pushChanges(formattedChanges);

    if (conflicts.length > 0) {
      log.warn(`SyncService: ${conflicts.length} conflict(s) detected`);
      const uiConflicts: SyncConflict[] = conflicts.map((c: any, i: number) => ({
        id: `conflict-${Date.now()}-${i}`,
        entityType: (c.entity_type ?? 'visit') as SyncConflict['entityType'],
        entityId: c.entity_id ?? '',
        entityLabel: c.label ?? `${c.entity_type ?? 'Record'} ${c.entity_id ?? ''}`,
        field: c.field ?? 'data',
        localValue: typeof c.local_value === 'object'
          ? JSON.stringify(c.local_value) : String(c.local_value ?? ''),
        serverValue: typeof c.server_value === 'object'
          ? JSON.stringify(c.server_value) : String(c.server_value ?? ''),
        localTimestamp: c.local_timestamp ?? new Date().toISOString(),
        serverTimestamp: c.server_timestamp ?? new Date().toISOString(),
        localUser: c.local_user ?? 'You (offline)',
        serverUser: c.server_user ?? 'Another user',
      }));
      if (onConflictsDetected) onConflictsDetected(uiConflicts);
    }

    if (results.length === pendingChanges.length && conflicts.length === 0) {
      await indexedDBService.clearPendingChanges();
    }
  }

  private async applyChange(change: {
    entity_type: string;
    entity_id: string;
    operation: string;
  }): Promise<void> {
    try {
      switch (change.entity_type) {
        case 'patient':
          if (change.operation !== 'delete') {
            const patient = await apiClient.getPatient(change.entity_id);
            await indexedDBService.savePatients([patient]);
          }
          // Deletion from IndexedDB is handled at the store level on next full load.
          break;

        case 'visit':
          if (change.operation !== 'delete') {
            const visit = await apiClient.getVisit(change.entity_id);
            await indexedDBService.saveVisits([visit]);
          }
          break;

        case 'lesion':
          // Lesions are embedded in visits — re-fetch the parent visit.
          if (change.operation !== 'delete' && (change as any).visit_id) {
            const visit = await apiClient.getVisit((change as any).visit_id);
            await indexedDBService.saveVisits([visit]);
          }
          break;
      }
    } catch (error) {
      log.error(`SyncService: failed to apply ${change.entity_type}:${change.entity_id}`, error);
    }
  }

  async queueChange(
    entityType: string,
    entityId: string,
    operation: 'create' | 'update' | 'delete',
    data?: any,
  ): Promise<void> {
    await indexedDBService.addPendingChange({
      entity_type: entityType,
      entity_id: entityId,
      operation,
      data,
      timestamp: new Date().toISOString(),
    });
    if (navigator.onLine) this.sync().catch(() => {});
  }

  async loadInitialData(): Promise<Patient[]> {
    try {
      const patients = await apiClient.getPatients();
      await indexedDBService.savePatients(patients);
      for (const patient of patients) {
        if (patient.visits) {
          await indexedDBService.saveVisits(patient.visits);
          for (const visit of patient.visits) {
            if (visit.lesions) await indexedDBService.saveLesions(visit.lesions);
          }
        }
      }
      await indexedDBService.setLastSyncTimestamp(new Date().toISOString());
      return patients;
    } catch (error) {
      if (!navigator.onLine) return await indexedDBService.getPatients();
      throw error;
    }
  }

  async clearLocalData(): Promise<void> {
    await indexedDBService.clearAll();
  }

  destroy() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
    window.removeEventListener('online', () => this.handleOnline());
    window.removeEventListener('offline', () => this.handleOffline());
  }
}

export const syncService = new SyncService();
export default syncService;
