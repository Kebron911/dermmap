import { useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { MobileBottomNav } from './MobileBottomNav';
import { OfflineBanner } from './OfflineBanner';
import { useSessionTimeout, SessionTimeoutWarning } from '../ui/SessionTimeout';
import { useKeyboardShortcuts } from '../../hooks/useKeyboardShortcuts';
import { useAppStore } from '../../store/appStore';
import { config } from '../../config';

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const { logout } = useAppStore();
  const navigate = useNavigate();

  const handleTimeout = useCallback(() => {
    logout();
  }, [logout]);

  const { showWarning, remainingSec, resetTimers } = useSessionTimeout({
    onTimeout: handleTimeout,
  });

  const shortcuts = useMemo(() => ({
    'ctrl+shift+s': () => navigate('/schedule'),
    'ctrl+shift+p': () => navigate('/search'),
    'ctrl+shift+b': () => navigate('/bodymap'),
    'ctrl+shift+q': () => navigate('/queue'),
  }), [navigate]);

  useKeyboardShortcuts(shortcuts);

  return (
    <div className="flex h-[100dvh] overflow-hidden">
      {/* Session timeout warning */}
      {showWarning && (
        <SessionTimeoutWarning remainingSec={remainingSec} onExtend={resetTimers} />
      )}

      {/* Demo Banner */}
      {config.isDemo && (
        <div className="fixed top-0 inset-x-0 bg-amber-400 text-amber-950 text-center py-1 text-xs font-semibold tracking-wide z-50">
          DEMO — SYNTHETIC DATA — NOT FOR CLINICAL USE
        </div>
      )}

      {/* Sidebar — desktop only */}
      <div className={"hidden md:block shrink-0" + (config.isDemo ? " mt-7" : "")}>
        <Sidebar />
      </div>

      {/* Main Content */}
      <main className={"flex-1 overflow-y-auto pb-16 md:pb-0 bg-slate-50" + (config.isDemo ? " mt-7" : "")}>
        {children}
      </main>

      {/* Mobile bottom nav */}
      <MobileBottomNav />

      {/* Global offline banner */}
      <OfflineBanner />
    </div>
  );
}
