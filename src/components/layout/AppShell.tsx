import { useCallback, useMemo } from 'react';
import { Sidebar } from './Sidebar';
import { MobileBottomNav } from './MobileBottomNav';
import { OfflineBanner } from './OfflineBanner';
import { useSessionTimeout, SessionTimeoutWarning } from '../ui/SessionTimeout';
import { useKeyboardShortcuts } from '../../hooks/useKeyboardShortcuts';
import { useAppStore } from '../../store/appStore';

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const { logout, setCurrentPage } = useAppStore();

  const handleTimeout = useCallback(() => {
    logout();
  }, [logout]);

  const { showWarning, remainingSec, resetTimers } = useSessionTimeout({
    onTimeout: handleTimeout,
  });

  const shortcuts = useMemo(() => ({
    'ctrl+shift+s': () => setCurrentPage('schedule'),
    'ctrl+shift+p': () => setCurrentPage('search'),
    'ctrl+shift+b': () => setCurrentPage('bodymap'),
    'ctrl+shift+q': () => setCurrentPage('queue'),
  }), [setCurrentPage]);

  useKeyboardShortcuts(shortcuts);

  return (
    <div className="flex h-[100dvh] overflow-hidden">
      {/* Session timeout warning */}
      {showWarning && (
        <SessionTimeoutWarning remainingSec={remainingSec} onExtend={resetTimers} />
      )}

      {/* Demo Banner */}
      <div className="fixed top-0 inset-x-0 bg-amber-400 text-amber-950 text-center py-1 text-xs font-semibold tracking-wide z-50">
        DEMO — SYNTHETIC DATA — NOT FOR CLINICAL USE
      </div>

      {/* Sidebar — desktop only */}
      <div className="hidden md:block mt-7 shrink-0">
        <Sidebar />
      </div>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto mt-7 pb-16 md:pb-0 bg-slate-50">
        {children}
      </main>

      {/* Mobile bottom nav */}
      <MobileBottomNav />

      {/* Global offline banner */}
      <OfflineBanner />
    </div>
  );
}
