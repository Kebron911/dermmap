import { Smartphone, X, Share, PlusSquare } from 'lucide-react';
import { usePWAInstall } from '../../hooks/usePWAInstall';

/**
 * Shows a native-style install banner:
 * • Android/Chrome: fires the browser Add to Home Screen prompt.
 * • iOS Safari: shows manual "Share → Add to Home Screen" instructions.
 *
 * Dismissed per session. Does not render once the app is installed.
 */
export function PWAInstallBanner() {
  const { showBanner, isIOS, triggerInstall, dismiss } = usePWAInstall();

  if (!showBanner) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 px-4 pb-4 md:bottom-6 md:left-auto md:right-6 md:w-96">
      <div className="bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden">
        {/* Teal accent top bar */}
        <div className="h-1 bg-gradient-to-r from-teal-500 to-teal-600" />

        <div className="p-5">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-teal-50 border border-teal-100 rounded-2xl flex items-center justify-center shrink-0">
              <Smartphone size={22} className="text-teal-600" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-slate-900">Install DermMap</div>
              <div className="text-sm text-slate-500 mt-0.5">
                {isIOS
                  ? 'Add to your Home Screen for the full clinical experience — works offline too.'
                  : 'Install the app for faster access, offline use, and a native clinical experience.'}
              </div>

              {isIOS ? (
                <div className="mt-3 bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-600 space-y-1.5">
                  <div className="flex items-center gap-2">
                    <Share size={13} className="text-slate-400 shrink-0" />
                    <span>Tap the <strong>Share</strong> button in Safari</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <PlusSquare size={13} className="text-slate-400 shrink-0" />
                    <span>Tap <strong>Add to Home Screen</strong></span>
                  </div>
                </div>
              ) : (
                <button
                  onClick={triggerInstall}
                  className="mt-3 w-full btn-primary justify-center text-sm"
                >
                  Add to Home Screen
                </button>
              )}
            </div>

            <button
              onClick={dismiss}
              className="text-slate-400 hover:text-slate-600 transition-colors shrink-0 -mr-1 -mt-1"
              aria-label="Dismiss install banner"
            >
              <X size={18} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
