import { apiClient } from './apiClient';
import { indexedDBService } from './indexedDB';
import { Patient } from '../types';

class SyncService {
  private isSyncing = false;
  private syncInterval: number | null = null;
  private backendAvailable = true;
  private lastConnectionCheck = 0;
  private readonly CONNECTION_CHECK_INTERVAL = 300000; // 5 minutes

  // Initialize sync service
  async init(): Promise<void> {
    await indexedDBService.init();
    
    // Set up periodic sync (every 30 seconds when online)
    this.startPeriodicSync();
    
    // Listen for online/offline events
    window.addEventListener('online', () => this.handleOnline());
    window.addEventListener('offline', () => this.handleOffline());
  }

  private startPeriodicSync() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }
    
    this.syncInterval = window.setInterval(() => {
      if (navigator.onLine) {
        this.sync().catch(console.error);
      }
    }, 30000); // 30 seconds
  }

  private handleOnline() {
    console.log('✓ Connection restored - syncing...');
    this.sync().catch(console.error);
  }

  private handleOffline() {
    console.log('⚠ Connection lost - working offline');
  }

  // Full sync: pull server changes + push local changes
  async sync(): Promise<void> {
    if (this.isSyncing || !navigator.onLine) {
      return;
    }

    // If backend is unavailable, only retry after CONNECTION_CHECK_INTERVAL
    const now = Date.now();
    if (!this.backendAvailable && (now - this.lastConnectionCheck < this.CONNECTION_CHECK_INTERVAL)) {
      return; // Silently skip - we know backend is down
    }

    try {
      this.isSyncing = true;
      
      // Only log when backend might be back up
      if (!this.backendAvailable) {
        console.log('Checking if backend is available...');
      }

      // 1. Push pending local changes first
      await this.pushChanges();

      // 2. Pull server changes
      await this.pullChanges();

      // Success! Mark backend as available
      if (!this.backendAvailable) {
        console.log('✓ Backend connection restored');
      }
      this.backendAvailable = true;
      this.lastConnectionCheck = now;
      
    } catch (error) {
      this.lastConnectionCheck = now;
      
      // Check if it's a connection error
      const isConnectionError = error instanceof TypeError && 
        (error.message.includes('fetch failed') || error.message.includes('Failed to fetch'));
      
      if (isConnectionError) {
        if (this.backendAvailable) {
          // First time detecting backend is down
          console.warn('⚠️ Backend API unavailable - working in offline mode. Will retry in 5 minutes.');
          this.backendAvailable = false;
        }
        // Don't spam console with repeated errors
      } else {
        // Other errors should still be logged
        console.error('Sync failed:', error);
      }
    } finally {
      this.isSyncing = false;
    }
  }

  // Pull changes from server
  private async pullChanges(): Promise<void> {
    const lastSync = await indexedDBService.getLastSyncTimestamp();
    const since = lastSync || new Date(0).toISOString(); // Beginning of time if never synced

    const { changes, timestamp } = await apiClient.getChanges(since);

    if (changes.length === 0) {
      await indexedDBService.setLastSyncTimestamp(timestamp);
      return;
    }

    console.log(`Pulling ${changes.length} changes from server...`);

    // Apply changes locally
    for (const change of changes) {
      await this.applyChange(change);
    }

    // Update last sync timestamp
    await indexedDBService.setLastSyncTimestamp(timestamp);
  }

  // Push local changes to server
  private async pushChanges(): Promise<void> {
    const pendingChanges = await indexedDBService.getPendingChanges();

    if (pendingChanges.length === 0) {
      return;
    }

    console.log(`Pushing ${pendingChanges.length} changes to server...`);

    // Format changes for API
    const formattedChanges = pendingChanges.map((change) => ({
      entity_type: change.entity_type,
      entity_id: change.entity_id,
      operation: change.operation,
      data: change.data,
      client_timestamp: change.timestamp,
    }));

    const { results, conflicts } = await apiClient.pushChanges(formattedChanges);

    // Log conflicts
    if (conflicts.length > 0) {
      console.warn('Sync conflicts:', conflicts);
      // TODO: Implement conflict resolution UI
    }

    // Clear successfully synced changes
    if (results.length === pendingChanges.length && conflicts.length === 0) {
      await indexedDBService.clearPendingChanges();
    }
  }

  // Apply a single change locally
  private async applyChange(change: {
    entity_type: string;
    entity_id: string;
    operation: string;
  }): Promise<void> {
    try {
      switch (change.entity_type) {
        case 'patient':
          if (change.operation === 'delete') {
            // Remove from IndexedDB
            // TODO: Implement patient deletion in IndexedDB
          } else {
            // Fetch updated patient and store locally
            const patient = await apiClient.getPatient(change.entity_id);
            await indexedDBService.savePatients([patient]);
          }
          break;

        case 'visit':
          if (change.operation === 'delete') {
            // Remove from IndexedDB
            // TODO: Implement visit deletion in IndexedDB
          } else {
            // Fetch updated visit and store locally
            const visit = await apiClient.getVisit(change.entity_id);
            await indexedDBService.saveVisits([visit]);
          }
          break;

        case 'lesion':
          // Lesions are embedded in visits, so re-fetch the visit
          // TODO: Implement lesion-specific updates
          break;
      }
    } catch (error) {
      console.error(`Failed to apply change for ${change.entity_type}:${change.entity_id}:`, error);
    }
  }

  // Queue a change for sync
  async queueChange(
    entityType: string,
    entityId: string,
    operation: 'create' | 'update' | 'delete',
    data?: any
  ): Promise<void> {
    await indexedDBService.addPendingChange({
      entity_type: entityType,
      entity_id: entityId,
      operation,
      data,
      timestamp: new Date().toISOString(),
    });

    // Try to sync immediately if online
    if (navigator.onLine) {
      this.sync().catch(console.error);
    }
  }

  // Load all data from server (initial load)
  async loadInitialData(): Promise<Patient[]> {
    try {
      console.log('Loading initial data from server...');
      const patients = await apiClient.getPatients();
      
      // Cache in IndexedDB
      await indexedDBService.savePatients(patients);
      
      // Cache visits and lesions (they're embedded in patient objects)
      for (const patient of patients) {
        if (patient.visits) {
          await indexedDBService.saveVisits(patient.visits);
          
          for (const visit of patient.visits) {
            if (visit.lesions) {
              await indexedDBService.saveLesions(visit.lesions);
            }
          }
        }
      }
      
      await indexedDBService.setLastSyncTimestamp(new Date().toISOString());
      
      console.log('✓ Initial data loaded');
      return patients;
    } catch (error) {
      console.error('Failed to load initial data:', error);
      
      // Fall back to IndexedDB if offline
      if (!navigator.onLine) {
        console.log('Loading from offline cache...');
        return await indexedDBService.getPatients();
      }
      
      throw error;
    }
  }

  // Clear all local data
  async clearLocalData(): Promise<void> {
    await indexedDBService.clearAll();
  }

  // Stop sync service
  destroy() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
    window.removeEventListener('online', () => this.handleOnline());
    window.removeEventListener('offline', () => this.handleOffline());
  }
}

// Singleton instance
export const syncService = new SyncService();

export default syncService;
