import { useCallback, useEffect, useRef, useState } from 'react';
import { config } from '../config';
import { useAppStore } from '../store/appStore';

// Warn the user this many ms before logout so they can extend the session.
const WARN_BEFORE_MS = 60_000;

// How often the idle-check interval fires.
const CHECK_INTERVAL_MS = 10_000;

// Minimum time between activity-timestamp updates (debounce).
const ACTIVITY_DEBOUNCE_MS = 30_000;

export interface SessionTimeoutState {
  showWarning: boolean;
  secondsLeft: number;
  extendSession: () => void;
}

/**
 * Tracks user interaction events and automatically logs the user out after
 * config.sessionTimeoutMs of inactivity (HIPAA §164.312(a)(2)(iii)).
 *
 * Returns { showWarning, secondsLeft, extendSession } so the caller can
 * render a countdown warning before the session expires.
 */
export function useSessionTimeout(): SessionTimeoutState {
  const logout = useAppStore((s) => s.logout);
  const lastActivityRef = useRef(Date.now());
  const lastUpdateRef = useRef(Date.now());
  const [showWarning, setShowWarning] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(60);

  const extendSession = useCallback(() => {
    const now = Date.now();
    lastActivityRef.current = now;
    lastUpdateRef.current = now;
    setShowWarning(false);
  }, []);

  useEffect(() => {
    const recordActivity = () => {
      const now = Date.now();
      // Debounce: only update the timestamp at most every ACTIVITY_DEBOUNCE_MS
      if (now - lastUpdateRef.current >= ACTIVITY_DEBOUNCE_MS) {
        lastUpdateRef.current = now;
        lastActivityRef.current = now;
        setShowWarning(false);
      }
    };

    const EVENTS = ['mousemove', 'keydown', 'click', 'touchstart', 'scroll'] as const;
    for (const event of EVENTS) {
      window.addEventListener(event, recordActivity, { passive: true });
    }

    const interval = setInterval(() => {
      const idle = Date.now() - lastActivityRef.current;
      const timeoutMs = config.sessionTimeoutMs;

      if (idle >= timeoutMs) {
        logout();
      } else if (idle >= timeoutMs - WARN_BEFORE_MS) {
        const secs = Math.max(0, Math.round((timeoutMs - idle) / 1000));
        setShowWarning(true);
        setSecondsLeft(secs);
      } else {
        setShowWarning(false);
      }
    }, CHECK_INTERVAL_MS);

    return () => {
      for (const event of EVENTS) {
        window.removeEventListener(event, recordActivity);
      }
      clearInterval(interval);
    };
  }, [logout]);

  return { showWarning, secondsLeft, extendSession };
}
