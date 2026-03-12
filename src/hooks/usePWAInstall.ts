import { useState, useEffect } from 'react';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
  prompt(): Promise<void>;
}

/**
 * Captures the browser's beforeinstallprompt event so we can show our own
 * install button at the right time (instead of the default browser mini-bar).
 *
 * Also detects whether the app is already running in standalone mode (installed).
 */
export function usePWAInstall() {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isDismissed, setIsDismissed] = useState(() =>
    sessionStorage.getItem('pwa-install-dismissed') === '1',
  );

  useEffect(() => {
    // Already running as installed PWA
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
      return;
    }
    // iOS Safari does not fire beforeinstallprompt; detect separately
    const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
    const isInStandaloneIOS = ('standalone' in window.navigator) && (window.navigator as any).standalone;
    if (isIOS && isInStandaloneIOS) {
      setIsInstalled(true);
      return;
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', handler);
    window.addEventListener('appinstalled', () => setIsInstalled(true));
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  async function triggerInstall() {
    if (!installPrompt) return;
    await installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    if (outcome === 'accepted') setIsInstalled(true);
    setInstallPrompt(null);
  }

  function dismiss() {
    sessionStorage.setItem('pwa-install-dismissed', '1');
    setIsDismissed(true);
  }

  const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
  const showBanner = !isInstalled && !isDismissed && (!!installPrompt || isIOS);

  return { showBanner, isInstalled, isIOS, triggerInstall, dismiss };
}
