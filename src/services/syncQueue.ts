import { config } from '../config';
import { logger } from './logger';
import { db } from './db';

// ---------------------------------------------------------------------------
// Sync Queue — queues mutations when offline and replays them when online.
// ---------------------------------------------------------------------------

interface QueueItem {
  id?: number;
  action: string;
  payload: unknown;
  createdAt: string;
}

async function enqueue(action: string, payload: unknown): Promise<void> {
  const item: QueueItem = {
    action,
    payload,
    createdAt: new Date().toISOString(),
  };
  await db.syncQueue.put(item);
  logger.info('Enqueued offline action', { action });
}

async function processQueue(): Promise<{ processed: number; failed: number }> {
  const items = await db.syncQueue.getAll();
  if (items.length === 0) return { processed: 0, failed: 0 };

  logger.info(`Processing sync queue (${items.length} items)`);
  let processed = 0;
  let failed = 0;

  for (const item of items) {
    try {
      // In production, dispatch each action to the corresponding API call.
      // For the demo we just log and clear.
      logger.debug('Syncing item', { action: item.action, id: item.id });
      if (item.id !== undefined) {
        await db.syncQueue.delete(String(item.id));
      }
      processed++;
    } catch (err) {
      logger.error('Sync failed for item', err, { action: item.action });
      failed++;
    }
  }

  return { processed, failed };
}

function startAutoSync(): () => void {
  if (!config.enableOfflineMode) return () => {};

  const handleOnline = () => {
    logger.info('Back online — processing sync queue');
    processQueue().then(result => {
      logger.info('Sync complete', result);
    });
  };

  window.addEventListener('online', handleOnline);

  // Also process queue immediately if online
  if (navigator.onLine) {
    processQueue();
  }

  return () => window.removeEventListener('online', handleOnline);
}

export const syncQueue = {
  enqueue,
  processQueue,
  startAutoSync,
  getPendingCount: async () => (await db.syncQueue.getAll()).length,
};
