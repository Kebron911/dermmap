import { useEffect, useRef, useCallback, useState } from 'react';
import { config } from '../../config';
import { Clock } from 'lucide-react';

// ---------------------------------------------------------------------------
// Session timeout — shows a warning then auto-logs-out after inactivity.
// ---------------------------------------------------------------------------

interface UseSessionTimeoutOptions {
  timeoutMs?: number;
  warningMs?: number;    // how many ms before timeout to show warning
  onTimeout: () => void;
}

export function useSessionTimeout({
  timeoutMs = config.sessionTimeoutMs,
  warningMs = 120_000, // 2 min warning
  onTimeout,
}: UseSessionTimeoutOptions) {
  const [showWarning, setShowWarning] = useState(false);
  const [remainingSec, setRemainingSec] = useState(0);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>();
  const warningRef = useRef<ReturnType<typeof setTimeout>>();
  const countdownRef = useRef<ReturnType<typeof setInterval>>();
  const deadlineRef = useRef(Date.now() + timeoutMs);

  const resetTimers = useCallback(() => {
    setShowWarning(false);
    deadlineRef.current = Date.now() + timeoutMs;

    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (warningRef.current) clearTimeout(warningRef.current);
    if (countdownRef.current) clearInterval(countdownRef.current);

    warningRef.current = setTimeout(() => {
      setShowWarning(true);
      setRemainingSec(Math.round(warningMs / 1000));
      countdownRef.current = setInterval(() => {
        const left = Math.max(0, Math.round((deadlineRef.current - Date.now()) / 1000));
        setRemainingSec(left);
        if (left <= 0) clearInterval(countdownRef.current);
      }, 1000);
    }, timeoutMs - warningMs);

    timeoutRef.current = setTimeout(onTimeout, timeoutMs);
  }, [timeoutMs, warningMs, onTimeout]);

  useEffect(() => {
    const events = ['mousedown', 'keydown', 'touchstart', 'scroll'] as const;
    const handler = () => resetTimers();
    events.forEach(e => window.addEventListener(e, handler, { passive: true }));
    resetTimers();
    return () => {
      events.forEach(e => window.removeEventListener(e, handler));
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (warningRef.current) clearTimeout(warningRef.current);
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, [resetTimers]);

  return { showWarning, remainingSec, resetTimers };
}

// ---------------------------------------------------------------------------
// Warning banner component
// ---------------------------------------------------------------------------

export function SessionTimeoutWarning({
  remainingSec,
  onExtend,
}: {
  remainingSec: number;
  onExtend: () => void;
}) {
  const minutes = Math.floor(remainingSec / 60);
  const seconds = remainingSec % 60;

  return (
    <div className="fixed top-0 left-0 right-0 z-[200] bg-yellow-500 text-yellow-900 px-4 py-3 flex items-center justify-center gap-3 shadow-lg">
      <Clock className="w-5 h-5 flex-shrink-0" />
      <span className="text-sm font-medium">
        Session expires in {minutes}:{seconds.toString().padStart(2, '0')} —
      </span>
      <button
        onClick={onExtend}
        className="px-3 py-1 bg-yellow-900 text-yellow-100 rounded text-sm font-semibold hover:bg-yellow-800 transition-colors"
      >
        Stay Signed In
      </button>
    </div>
  );
}
