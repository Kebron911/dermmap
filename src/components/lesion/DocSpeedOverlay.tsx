import { useState, useEffect } from 'react';
import { CheckCircle, ArrowRight, Zap, Clock, TrendingUp, X } from 'lucide-react';
import clsx from 'clsx';

interface DocSpeedOverlayProps {
  elapsedSeconds: number;
  lesionCount: number;
  photoCount: number;
  onDismiss: () => void;
  onAddAnother: () => void;
  onCompleteVisit: () => void;
}

const TRADITIONAL_TIME_MIN = 9; // minutes for traditional EHR
const TRADITIONAL_TIME_SEC = TRADITIONAL_TIME_MIN * 60;

function AnimatedNumber({ target, duration = 1000 }: { target: number; duration?: number }) {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    const steps = 30;
    const increment = target / steps;
    const interval = duration / steps;
    let step = 0;
    const timer = setInterval(() => {
      step++;
      setCurrent(Math.round(Math.min(increment * step, target)));
      if (step >= steps) clearInterval(timer);
    }, interval);
    return () => clearInterval(timer);
  }, [target, duration]);

  return <>{current}</>;
}

export function DocSpeedOverlay({
  elapsedSeconds,
  lesionCount,
  photoCount,
  onDismiss,
  onAddAnother,
  onCompleteVisit,
}: DocSpeedOverlayProps) {
  const [showDetails, setShowDetails] = useState(false);
  const timeSavedSec = Math.max(0, TRADITIONAL_TIME_SEC - elapsedSeconds);
  const timeSavedMin = Math.round(timeSavedSec / 60 * 10) / 10;
  const percentFaster = Math.round((1 - elapsedSeconds / TRADITIONAL_TIME_SEC) * 100);

  useEffect(() => {
    const t = setTimeout(() => setShowDetails(true), 600);
    return () => clearTimeout(t);
  }, []);

  // Color coding for the time
  const timeColor = elapsedSeconds <= 10 ? 'text-emerald-400' :
                    elapsedSeconds <= 20 ? 'text-teal-400' :
                    elapsedSeconds <= 45 ? 'text-amber-400' : 'text-orange-400';

  const timeLabel = elapsedSeconds <= 10 ? 'Lightning fast!' :
                    elapsedSeconds <= 20 ? 'Excellent!' :
                    elapsedSeconds <= 45 ? 'Well done!' : 'Completed';

  return (
    <div className="fixed inset-0 bg-slate-950/95 backdrop-blur-sm z-50 flex items-center justify-center p-6 fade-in">
      <div className="w-full max-w-lg">
        {/* Close */}
        <button
          onClick={onDismiss}
          className="absolute top-6 right-6 p-2 text-slate-500 hover:text-white transition-colors"
        >
          <X size={20} />
        </button>

        {/* Success icon */}
        <div className="flex justify-center mb-6">
          <div className="relative">
            <div className="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center">
              <CheckCircle size={40} className="text-emerald-400" />
            </div>
            <div className="absolute -top-1 -right-1 w-7 h-7 bg-teal-500 rounded-full flex items-center justify-center">
              <Zap size={14} className="text-white" />
            </div>
          </div>
        </div>

        {/* Lesion documented */}
        <div className="text-center mb-8">
          <p className="text-slate-400 text-sm mb-1">Lesion documented</p>
          <h2 className="text-white font-bold text-2xl">{timeLabel}</h2>
        </div>

        {/* BIG TIME NUMBER */}
        <div className="text-center mb-8">
          <div className="inline-flex items-end gap-3">
            <div className={clsx('font-black leading-none text-8xl md:text-[96px]', timeColor)}>
              <AnimatedNumber target={elapsedSeconds} duration={800} />
            </div>
            <div className="mb-2 md:mb-3">
              <div className="text-slate-300 text-xl md:text-2xl font-bold">sec</div>
              <div className="text-slate-500 text-xs">elapsed</div>
            </div>
          </div>
        </div>

        {/* Comparison cards */}
        {showDetails && (
          <div className="grid grid-cols-3 gap-2 mb-6 fade-in">
            {/* Time saved */}
            <div className="bg-slate-800/60 border border-slate-700 rounded-2xl p-4 text-center">
              <div className="text-2xl font-bold text-emerald-400 mb-1">
                ~{timeSavedMin}
                <span className="text-base font-semibold ml-0.5">min</span>
              </div>
              <div className="text-xs text-slate-400">saved vs. paper</div>
            </div>

            {/* Percent faster */}
            <div className="bg-teal-900/40 border border-teal-700/50 rounded-2xl p-4 text-center">
              <div className="text-2xl font-bold text-teal-300 mb-1">
                <AnimatedNumber target={percentFaster} duration={1000} />
                <span className="text-base font-semibold">%</span>
              </div>
              <div className="text-xs text-slate-400">faster than EHR</div>
            </div>

            {/* Photos */}
            <div className="bg-slate-800/60 border border-slate-700 rounded-2xl p-4 text-center">
              <div className="text-2xl font-bold text-blue-400 mb-1">{photoCount}</div>
              <div className="text-xs text-slate-400">photo{photoCount !== 1 ? 's' : ''} captured</div>
            </div>
          </div>
        )}

        {/* Traditional comparison bar */}
        {showDetails && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 mb-6 fade-in">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Documentation Time Comparison</span>
            </div>

            {/* DermMap bar */}
            <div className="mb-3">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-teal-500 rounded-full" />
                  <span className="text-xs font-semibold text-slate-300">DermMap</span>
                </div>
                <span className="text-xs font-bold text-teal-400">{elapsedSeconds}s</span>
              </div>
              <div className="h-5 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-teal-600 to-teal-400 rounded-full transition-all duration-1000 flex items-center justify-end pr-2"
                  style={{ width: `${Math.min(100, (elapsedSeconds / TRADITIONAL_TIME_SEC) * 100)}%` }}
                >
                </div>
              </div>
            </div>

            {/* Traditional bar */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-slate-600 rounded-full" />
                  <span className="text-xs text-slate-500">Traditional EHR</span>
                </div>
                <span className="text-xs text-slate-500">~{TRADITIONAL_TIME_MIN} min</span>
              </div>
              <div className="h-5 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-slate-700 rounded-full transition-all duration-1200 delay-200"
                  style={{ width: '100%' }}
                />
              </div>
            </div>
          </div>
        )}

        {/* Session total if multiple lesions */}
        {lesionCount > 1 && showDetails && (
          <div className="bg-teal-950/50 border border-teal-800/40 rounded-xl p-3 mb-5 text-center fade-in">
            <p className="text-xs text-teal-300">
              <strong>{lesionCount} lesions</strong> documented this visit ·{' '}
              <strong>~{Math.round(lesionCount * timeSavedMin * 10) / 10} min</strong> total time saved
            </p>
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={onCompleteVisit}
            className="flex items-center justify-center gap-2 bg-teal-600 hover:bg-teal-500 active:bg-teal-700 text-white font-bold py-4 rounded-xl transition-colors flex-1 text-base"
          >
            Complete Visit
            <ArrowRight size={18} />
          </button>
          <button
            onClick={onAddAnother}
            className="flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 active:bg-slate-900 text-white font-semibold py-3.5 rounded-xl transition-colors flex-1"
          >
            Add Another Lesion
          </button>
        </div>
      </div>
    </div>
  );
}
