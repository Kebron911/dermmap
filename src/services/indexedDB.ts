import { Patient, Visit, Lesion } from '../types';

const DB_NAME = 'DermMapOfflineDB';
const DB_VERSION = 1;

class IndexedDBService {
  private db: IDBDatabase | null = null;

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Create object stores
        if (!db.objectStoreNames.contains('patients')) {
          db.createObjectStore('patients', { keyPath: 'patient_id' });
        }
        if (!db.objectStoreNames.contains('visits')) {
          const visitStore = db.createObjectStore('visits', { keyPath: 'visit_id' });
          visitStore.createIndex('patient_id', 'patient_id', { unique: false });
        }
        if (!db.objectStoreNames.contains('lesions')) {
          const lesionStore = db.createObjectStore('lesions', { keyPath: 'lesion_id' });
          lesionStore.createIndex('visit_id', 'visit_id', { unique: false });
        }
        if (!db.objectStoreNames.contains('photos')) {
          const photoStore = db.createObjectStore('photos', { keyPath: 'photo_id' });
          photoStore.createIndex('lesion_id', 'lesion_id', { unique: false });
        }
        if (!db.objectStoreNames.contains('pending_changes')) {
          db.createObjectStore('pending_changes', { keyPath: 'id', autoIncrement: true });
        }
        if (!db.objectStoreNames.contains('sync_metadata')) {
          db.createObjectStore('sync_metadata', { keyPath: 'key' });
        }
      };
    });
  }

  private getStore(storeName: string, mode: IDBTransactionMode = 'readonly'): IDBObjectStore {
    if (!this.db) throw new Error('Database not initialized');
    const transaction = this.db.transaction(storeName, mode);
    return transaction.objectStore(storeName);
  }

  // ---------- Patients ----------
  async savePatients(patients: Patient[]): Promise<void> {
    const store = this.getStore('patients', 'readwrite');
    for (const patient of patients) {
      store.put(patient);
    }
  }

  async getPatients(): Promise<Patient[]> {
    return new Promise((resolve, reject) => {
      const store = this.getStore('patients');
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async getPatient(patientId: string): Promise<Patient | undefined> {
    return new Promise((resolve, reject) => {
      const store = this.getStore('patients');
      const request = store.get(patientId);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  // ---------- Visits ----------
  async saveVisits(visits: Visit[]): Promise<void> {
    const store = this.getStore('visits', 'readwrite');
    for (const visit of visits) {
      store.put(visit);
    }
  }

  async getVisits(patientId?: string): Promise<Visit[]> {
    return new Promise((resolve, reject) => {
      const store = this.getStore('visits');
      
      if (patientId) {
        const index = store.index('patient_id');
        const request = index.getAll(patientId);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      } else {
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      }
    });
  }

  // ---------- Lesions ----------
  async saveLesions(lesions: Lesion[]): Promise<void> {
    const store = this.getStore('lesions', 'readwrite');
    for (const lesion of lesions) {
      store.put(lesion);
    }
  }

  async getLesions(visitId?: string): Promise<Lesion[]> {
    return new Promise((resolve, reject) => {
      const store = this.getStore('lesions');
      
      if (visitId) {
        const index = store.index('visit_id');
        const request = index.getAll(visitId);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      } else {
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      }
    });
  }

  // ---------- Photos ----------
  async savePhoto(photo: { photo_id: string; lesion_id: string; data: string }): Promise<void> {
    const store = this.getStore('photos', 'readwrite');
    store.put(photo);
  }

  async getPhoto(photoId: string): Promise<{ photo_id: string; data: string } | undefined> {
    return new Promise((resolve, reject) => {
      const store = this.getStore('photos');
      const request = store.get(photoId);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  // ---------- Pending Changes (for sync) ----------
  async addPendingChange(change: {
    entity_type: string;
    entity_id: string;
    operation: 'create' | 'update' | 'delete';
    data?: any;
    timestamp: string;
  }): Promise<void> {
    const store = this.getStore('pending_changes', 'readwrite');
    store.add(change);
  }

  async getPendingChanges(): Promise<Array<any>> {
    return new Promise((resolve, reject) => {
      const store = this.getStore('pending_changes');
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async clearPendingChanges(): Promise<void> {
    const store = this.getStore('pending_changes', 'readwrite');
    store.clear();
  }

  // ---------- Sync Metadata ----------
  async getLastSyncTimestamp(): Promise<string | null> {
    return new Promise((resolve, reject) => {
      const store = this.getStore('sync_metadata');
      const request = store.get('last_sync');
      request.onsuccess = () => resolve(request.result?.value || null);
      request.onerror = () => reject(request.error);
    });
  }

  async setLastSyncTimestamp(timestamp: string): Promise<void> {
    const store = this.getStore('sync_metadata', 'readwrite');
    store.put({ key: 'last_sync', value: timestamp });
  }

  // ---------- Clear All Data ----------
  async clearAll(): Promise<void> {
    if (!this.db) return;
    
    const stores = ['patients', 'visits', 'lesions', 'photos', 'pending_changes', 'sync_metadata'];
    for (const storeName of stores) {
      const store = this.getStore(storeName, 'readwrite');
      store.clear();
    }
  }
}

// Singleton instance
export const indexedDBService = new IndexedDBService();

export default indexedDBService;
