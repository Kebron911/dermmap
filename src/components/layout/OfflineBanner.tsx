import { Wifi, WifiOff, RefreshCw, CheckCircle, Shield, CloudOff } from 'lucide-react';
import { useNetworkStatus } from '../../hooks/useNetworkStatus';
import clsx from 'clsx';

export function OfflineBanner() {
  const { isOnline, wasOffline, pendingSyncCount } = useNetworkStatus();

  if (isOnline && !wasOffline) return null;

  if (wasOffline && isOnline) {
    return (
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 fade-in">
        <div className="flex items-center gap-3 bg-emerald-900 border border-emerald-600 text-white rounded-2xl px-5 py-3 shadow-2xl">
          <CheckCircle size={18} className="text-emerald-400 shrink-0" />
          <div>
            <div className="text-sm font-semibold">Back online — syncing data</div>
            <div className="text-xs text-emerald-300">All offline captures are uploading securely</div>
          </div>
          <div className="w-4 h-4 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin ml-2" />
        </div>
      </div>
    );
  }

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 fade-in">
      <div className="flex items-center gap-3 bg-slate-900 border border-amber-600/60 text-white rounded-2xl px-5 py-3 shadow-2xl max-w-sm">
        <div className="w-10 h-10 bg-amber-500/20 rounded-xl flex items-center justify-center shrink-0">
          <CloudOff size={20} className="text-amber-400" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-bold text-amber-300">Offline Mode Active</div>
          <div className="text-xs text-slate-300 leading-relaxed">
            Photos and data saved locally · Will sync when reconnected
          </div>
          {pendingSyncCount > 0 && (
            <div className="flex items-center gap-1.5 mt-1">
              <div className="w-1.5 h-1.5 bg-amber-400 rounded-full" />
              <span className="text-xs text-amber-300 font-medium">
                {pendingSyncCount} visit{pendingSyncCount > 1 ? 's' : ''} pending sync
              </span>
            </div>
          )}
        </div>
        <div className="shrink-0">
          <Shield size={16} className="text-teal-400" />
        </div>
      </div>
    </div>
  );
}

// Compact inline version for the sidebar
export function OfflineStatusDot() {
  const { isOnline, pendingSyncCount } = useNetworkStatus();

  return (
    <div className={clsx(
      'flex items-center gap-2 text-xs px-3 py-2 rounded-lg',
      isOnline ? 'text-emerald-600' : 'text-amber-600 bg-amber-50'
    )}>
      {isOnline ? (
        <>
          <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
          <span className="font-medium">Online · Encrypted sync</span>
        </>
      ) : (
        <>
          <CloudOff size={13} />
          <span className="font-medium">Offline mode</span>
          {pendingSyncCount > 0 && (
            <span className="bg-amber-200 text-amber-800 text-xs px-1.5 py-0.5 rounded-full font-bold ml-auto">
              {pendingSyncCount}
            </span>
          )}
        </>
      )}
    </div>
  );
}
