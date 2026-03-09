import { Workbox } from 'workbox-window';
import { logger } from './services/logger';

// ---------------------------------------------------------------------------
// Service Worker Registration — enables PWA features and offline support.
// ---------------------------------------------------------------------------

export function registerServiceWorker() {
  if ('serviceWorker' in navigator && import.meta.env.PROD) {
    const wb = new Workbox('/service-worker.js');

    wb.addEventListener('installed', (event) => {
      if (event.isUpdate) {
        logger.info('New service worker installed, reload to update');
        // Optionally show a "new version available" toast
        if (confirm('New version available! Reload to update?')) {
          window.location.reload();
        }
      }
    });

    wb.addEventListener('activated', () => {
      logger.info('Service worker activated');
    });

    wb.addEventListener('waiting', () => {
      logger.info('Service worker waiting');
      // Show update prompt
      if (confirm('New version ready! Update now?')) {
        wb.messageSkipWaiting();
        window.location.reload();
      }
    });

    wb.register().catch((err) => {
      logger.error('Service worker registration failed', err);
    });
  }
}
