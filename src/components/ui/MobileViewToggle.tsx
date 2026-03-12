import { useState, useCallback } from 'react';
import { Smartphone, Monitor, X, RotateCcw } from 'lucide-react';
import clsx from 'clsx';

const PRESETS = [
  { label: 'iPhone 14', width: 390, height: 844 },
  { label: 'iPhone SE', width: 375, height: 667 },
  { label: 'Pixel 7', width: 412, height: 915 },
  { label: 'iPad Mini', width: 768, height: 1024 },
] as const;

export function MobileViewToggle() {
  const [active, setActive] = useState(false);
  const [preset, setPreset] = useState(0);
  const [open, setOpen] = useState(false);
  const [landscape, setLandscape] = useState(false);
  const [iframeKey, setIframeKey] = useState(0);

  const device = PRESETS[preset];
  const frameW = landscape ? device.height : device.width;
  const frameH = landscape ? device.width : device.height;

  const selectPreset = (i: number) => {
    setPreset(i);
    setActive(true);
    setOpen(false);
    setIframeKey(k => k + 1);
  };

  const exitPreview = useCallback(() => {
    setActive(false);
    setOpen(false);
  }, []);

  if (!active) {
    return (
      <div className="fixed bottom-4 right-4 z-[9999] flex flex-col items-end gap-2">
        {open && (
          <div className="bg-white border border-slate-200 rounded-xl shadow-2xl p-3 space-y-1 min-w-[180px]">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2 pb-1">
              Device Preview
            </div>
            {PRESETS.map((p, i) => (
              <button
                key={p.label}
                onClick={() => selectPreset(i)}
                className="w-full text-left px-3 py-2 rounded-lg text-sm hover:bg-slate-50 text-slate-600 flex items-center justify-between"
              >
                <span>{p.label}</span>
                <span className="text-xs text-slate-400">{p.width}&times;{p.height}</span>
              </button>
            ))}
          </div>
        )}
        <button
          onClick={() => setOpen(o => !o)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-full shadow-lg text-sm font-medium bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 transition-all"
          title="Toggle mobile device preview"
        >
          <Smartphone size={16} />
          Mobile Preview
        </button>
      </div>
    );
  }

  // Active: full-screen dark overlay with device frame + iframe
  return (
    <div className="fixed inset-0 z-[9998] bg-slate-900 flex flex-col items-center justify-center">
      {/* Top bar */}
      <div className="flex items-center gap-3 mb-4">
        {PRESETS.map((p, i) => (
          <button
            key={p.label}
            onClick={() => selectPreset(i)}
            className={clsx(
              'px-3 py-1.5 rounded-full text-xs font-medium transition-colors',
              preset === i
                ? 'bg-teal-500 text-white'
                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            )}
          >
            {p.label}
          </button>
        ))}
        <div className="w-px h-6 bg-slate-700 mx-1" />
        <button
          onClick={() => { setLandscape(l => !l); setIframeKey(k => k + 1); }}
          className="p-2 rounded-full bg-slate-700 text-slate-300 hover:bg-slate-600 transition-colors"
          title="Rotate device"
        >
          <RotateCcw size={14} />
        </button>
        <button
          onClick={exitPreview}
          className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-red-500/80 text-white text-xs font-medium hover:bg-red-500 transition-colors"
        >
          <X size={14} />
          Exit Preview
        </button>
        <span className="text-slate-500 text-xs ml-2">
          {frameW}&times;{frameH}
        </span>
      </div>

      {/* Device frame */}
      <div
        className="relative bg-black rounded-[40px] p-3 shadow-2xl shadow-black/50"
        style={{ width: frameW + 24, height: frameH + 24 }}
      >
        {/* Notch */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-28 h-6 bg-black rounded-b-2xl z-10" />
        {/* Screen */}
        <iframe
          key={iframeKey}
          src={window.location.href}
          className="w-full h-full rounded-[28px] bg-white"
          style={{ width: frameW, height: frameH, border: 'none' }}
          title={`${device.label} preview`}
        />
        {/* Home indicator */}
        <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 w-32 h-1 bg-slate-600 rounded-full" />
      </div>
    </div>
  );
}
