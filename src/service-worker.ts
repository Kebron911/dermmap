/// <reference lib="webworker" />

import { clientsClaim } from 'workbox-core';
import { precacheAndRoute } from 'workbox-precaching';
import { registerRoute } from 'workbox-routing';
import { CacheFirst } from 'workbox-strategies';
import { ExpirationPlugin } from 'workbox-expiration';

declare const self: ServiceWorkerGlobalScope;

clientsClaim();

// Precache all build assets
precacheAndRoute(self.__WB_MANIFEST);

// Cache only static non-PHI assets (images from /assets/ build output).
// Clinical photos are NOT cached — they may contain PHI.
registerRoute(
  ({ request, url }) =>
    request.destination === 'image' && url.pathname.startsWith('/assets/'),
  new CacheFirst({
    cacheName: 'static-images',
    plugins: [
      new ExpirationPlugin({
        maxEntries: 100,
        maxAgeSeconds: 7 * 24 * 60 * 60, // 7 days for UI assets only
      }),
    ],
  }),
);

// NOTE: /api/ responses are intentionally NOT cached by the service worker.
// PHI (patients, visits, lesions, photos) must never be stored in SW caches
// because SW caches survive logout and are not HIPAA-compliant for shared devices.

// Skip waiting and claim clients immediately
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }

  // Clear all SW caches on logout to remove any residual PHI.
  // Called by the store's logout() via navigator.serviceWorker.controller.postMessage().
  if (event.data && event.data.type === 'CLEAR_CACHES') {
    event.waitUntil(
      caches.keys().then(names => Promise.all(names.map(name => caches.delete(name))))
    );
  }
});

// Background sync for offline actions
self.addEventListener('sync', (event: any) => {
  if (event.tag === 'sync-queue') {
    event.waitUntil(syncOfflineQueue());
  }
});

async function syncOfflineQueue() {
  // Placeholder — in production, this would replay queued actions
  console.log('Background sync triggered');
}

export {};
