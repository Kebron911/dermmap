import { logger } from './logger';
import type { Patient, AuditLogEntry } from '../types';

// ---------------------------------------------------------------------------
// Minimal IndexedDB wrapper — provides typed object‐stores for DermMap.
// Uses the raw IndexedDB API to keep the bundle dependency‐free.
// ---------------------------------------------------------------------------

const DB_NAME = 'dermmap';
const DB_VERSION = 1;

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const idb = request.result;
      if (!idb.objectStoreNames.contains('patients')) {
        idb.createObjectStore('patients', { keyPath: 'patient_id' });
      }
      if (!idb.objectStoreNames.contains('auditLog')) {
        const store = idb.createObjectStore('auditLog', { keyPath: 'log_id' });
        store.createIndex('timestamp', 'timestamp');
      }
      if (!idb.objectStoreNames.contains('syncQueue')) {
        idb.createObjectStore('syncQueue', { keyPath: 'id', autoIncrement: true });
      }
      if (!idb.objectStoreNames.contains('images')) {
        idb.createObjectStore('images', { keyPath: 'id' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => {
      logger.error('IndexedDB open failed', request.error);
      reject(request.error);
    };
  });
}

// Generic helpers ----------------------------------------------------------

function txGet<T>(storeName: string, key: string): Promise<T | undefined> {
  return open().then(
    idb =>
      new Promise((resolve, reject) => {
        const tx = idb.transaction(storeName, 'readonly');
        const store = tx.objectStore(storeName);
        const req = store.get(key);
        req.onsuccess = () => resolve(req.result as T | undefined);
        req.onerror = () => reject(req.error);
      }),
  );
}

function txGetAll<T>(storeName: string): Promise<T[]> {
  return open().then(
    idb =>
      new Promise((resolve, reject) => {
        const tx = idb.transaction(storeName, 'readonly');
        const store = tx.objectStore(storeName);
        const req = store.getAll();
        req.onsuccess = () => resolve(req.result as T[]);
        req.onerror = () => reject(req.error);
      }),
  );
}

function txPut<T>(storeName: string, value: T): Promise<void> {
  return open().then(
    idb =>
      new Promise((resolve, reject) => {
        const tx = idb.transaction(storeName, 'readwrite');
        const store = tx.objectStore(storeName);
        const req = store.put(value);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      }),
  );
}

function txDelete(storeName: string, key: string): Promise<void> {
  return open().then(
    idb =>
      new Promise((resolve, reject) => {
        const tx = idb.transaction(storeName, 'readwrite');
        const store = tx.objectStore(storeName);
        const req = store.delete(key);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      }),
  );
}

function txClear(storeName: string): Promise<void> {
  return open().then(
    idb =>
      new Promise((resolve, reject) => {
        const tx = idb.transaction(storeName, 'readwrite');
        const store = tx.objectStore(storeName);
        const req = store.clear();
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      }),
  );
}

// ---------------------------------------------------------------------------
// Exported typed facade
// ---------------------------------------------------------------------------

export const db = {
  patients: {
    get: (id: string) => txGet<Patient>('patients', id),
    getAll: () => txGetAll<Patient>('patients'),
    put: (patient: Patient) => txPut('patients', patient),
    delete: (id: string) => txDelete('patients', id),
    clear: () => txClear('patients'),
  },
  auditLog: {
    getAll: () => txGetAll<AuditLogEntry>('auditLog'),
    put: (entry: AuditLogEntry) => txPut('auditLog', entry),
    clear: () => txClear('auditLog'),
  },
  syncQueue: {
    getAll: () => txGetAll<{ id?: number; action: string; payload: unknown; createdAt: string }>('syncQueue'),
    put: (item: { action: string; payload: unknown; createdAt: string }) => txPut('syncQueue', item),
    delete: (id: string) => txDelete('syncQueue', id),
    clear: () => txClear('syncQueue'),
  },
  images: {
    get: (id: string) => txGet<{ id: string; blob: string; mimeType: string }>('images', id),
    put: (image: { id: string; blob: string; mimeType: string }) => txPut('images', image),
    delete: (id: string) => txDelete('images', id),
    clear: () => txClear('images'),
  },
};
