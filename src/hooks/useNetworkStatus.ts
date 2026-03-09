import { useState, useEffect } from 'react';

export interface NetworkStatus {
  isOnline: boolean;
  wasOffline: boolean;
  pendingSyncCount: number;
}

export function useNetworkStatus(): NetworkStatus {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [wasOffline, setWasOffline] = useState(false);
  const [pendingSyncCount, setPendingSyncCount] = useState(0);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setWasOffline(true);
      // Simulate syncing pending items
      const pending = pendingSyncCount;
      if (pending > 0) {
        setTimeout(() => {
          setPendingSyncCount(0);
          setWasOffline(false);
        }, 2000);
      } else {
        setTimeout(() => setWasOffline(false), 3000);
      }
    };

    const handleOffline = () => {
      setIsOnline(false);
      setWasOffline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [pendingSyncCount]);

  // Simulate 2 pending items in offline demo
  useEffect(() => {
    if (!isOnline) {
      setPendingSyncCount(2);
    }
  }, [isOnline]);

  return { isOnline, wasOffline, pendingSyncCount };
}
