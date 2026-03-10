import { useState, useRef, useCallback } from 'react';
import {
  X, ChevronLeft, ChevronRight, Columns2, Layers, LayoutGrid,
  TrendingUp, TrendingDown, Minus, ZoomIn, ZoomOut, Info,
  Calendar, Camera, AlertCircle, CheckCircle
} from 'lucide-react';
import { Lesion, Visit } from '../../types';
import { format, parseISO } from 'date-fns';
import clsx from 'clsx';
import { useAppStore } from '../../store/appStore';
import jsPDF from 'jspdf';

interface PhotoComparisonProps {
  lesion: Lesion;
  allVisitLesions: { visit: Visit; lesion: Lesion }[];
  onClose: () => void;
}

type CompareMode = 'side-by-side' | 'overlay' | 'grid';

// Realistic dermoscopy image color palettes for placeholder generation
const LESION_GRADIENTS = [
  'from-stone-700 via-amber-900 to-stone-800',
  'from-amber-900 via-stone-800 to-brown-900',
  'from-slate-800 via-stone-700 to-slate-900',
  'from-zinc-800 via-stone-600 to-zinc-900',
  'from-stone-600 via-amber-800 to-stone-900',
];

function PhotoPlaceholder({
  index, captureType, date, size = 'large', url
}: {
  index: number; captureType: string; date: string; size?: 'large' | 'small'; url?: string;
}) {
  if (url) {
    return (
      <div className={clsx('relative flex-shrink-0 overflow-hidden', size === 'large' ? 'w-full h-full' : 'w-full h-full')}>
        <img src={url} alt={`${captureType} photo`} className="w-full h-full object-cover" />
        <div className="absolute top-2 left-2">
          <span className={clsx('text-xs font-bold px-2 py-0.5 rounded-full', captureType === 'dermoscopic' ? 'bg-violet-900/80 text-violet-200' : 'bg-black/60 text-white')}>
            {captureType === 'dermoscopic' ? 'Dermoscopic' : 'Clinical'}
          </span>
        </div>
        <div className="absolute bottom-2 right-2 text-xs text-white/60 font-mono bg-black/40 px-1.5 py-0.5 rounded">
          {format(parseISO(date), 'MM/dd/yy')}
        </div>
      </div>
    );
  }
  const gradients = [
    { bg: '#2D1B0E', spots: ['#8B4513', '#A0522D', '#4A2810', '#6B3A1F', '#3D1A00'] },
    { bg: '#1A0A00', spots: ['#5C2D0E', '#7A3B1A', '#3A1500', '#6B2F10', '#2D1000'] },
    { bg: '#0D0D0D', spots: ['#2D1B0E', '#3D2010', '#1A0A00', '#4A2810', '#0A0500'] },
    { bg: '#3D1A00', spots: ['#8B4513', '#5C2D0E', '#A0522D', '#2D1000', '#6B2510'] },
    { bg: '#1E1E1E', spots: ['#4A2810', '#6B3A1F', '#2D1B0E', '#8B4513', '#1A0A00'] },
  ];
  const palette = gradients[index % gradients.length];
  const isDermoscopic = captureType === 'dermoscopic';

  return (
    <div
      className={clsx(
        'relative flex-shrink-0 overflow-hidden',
        size === 'large' ? 'w-full h-full' : 'w-full h-full'
      )}
      style={{ backgroundColor: palette.bg }}
    >
      {/* Dermoscopic polarized light simulation */}
      {isDermoscopic && (
        <div className="absolute inset-0 rounded-full" style={{
          background: `radial-gradient(circle at 50% 50%, rgba(255,255,255,0.08) 0%, transparent 70%)`,
        }} />
      )}
      {/* Lesion structure */}
      <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full">
        <circle cx="50" cy="50" r="35" fill={palette.spots[0]} opacity="0.9" />
        <circle cx="50" cy="50" r="28" fill={palette.spots[1]} opacity="0.8" />
        <circle cx="48" cy="48" r="18" fill={palette.spots[2]} opacity="0.9" />
        {/* Irregular pigment network */}
        {palette.spots.map((color, i) => (
          <circle
            key={i}
            cx={40 + Math.sin(i * 1.2) * 12}
            cy={40 + Math.cos(i * 1.5) * 12}
            r={2 + i * 0.8}
            fill={color}
            opacity={0.7 - i * 0.1}
          />
        ))}
        {/* Regression area */}
        <circle cx="54" cy="46" r="8" fill="white" opacity="0.12" />
        {/* Scale reference dot */}
        {isDermoscopic && (
          <>
            <circle cx="85" cy="85" r="3" fill="white" opacity="0.8" />
            <text x="82" y="97" fontSize="4" fill="white" opacity="0.8">0.1mm</text>
          </>
        )}
      </svg>
      {/* Overlay labels */}
      <div className="absolute top-2 left-2">
        <span className={clsx(
          'text-xs font-bold px-2 py-0.5 rounded-full',
          isDermoscopic ? 'bg-violet-900/80 text-violet-200' : 'bg-black/60 text-white'
        )}>
          {isDermoscopic ? 'Dermoscopic' : 'Clinical'}
        </span>
      </div>
      <div className="absolute bottom-2 right-2 text-xs text-white/60 font-mono bg-black/40 px-1.5 py-0.5 rounded">
        {format(parseISO(date), 'MM/dd/yy')}
      </div>
    </div>
  );
}

function SideBySideView({
  left, right, zoom
}: {
  left: { visit: Visit; lesion: Lesion; photoIdx: number };
  right: { visit: Visit; lesion: Lesion; photoIdx: number };
  zoom: number;
}) {
  const leftPhoto = left.lesion.photos[left.photoIdx];
  const rightPhoto = right.lesion.photos[right.photoIdx];
  return (
    <div className="flex gap-1 h-full">
      <div className="flex-1 flex flex-col gap-2">
        <div className="text-xs text-center font-semibold text-slate-400 uppercase tracking-wide">
          {format(parseISO(left.visit.visit_date), 'MMM d, yyyy')} — Earlier
        </div>
        <div className="flex-1 rounded-xl overflow-hidden border border-slate-700" style={{ transform: `scale(${zoom})`, transformOrigin: 'center' }}>
          <PhotoPlaceholder
            index={0}
            captureType={leftPhoto?.capture_type || 'clinical'}
            date={left.visit.visit_date}
            url={leftPhoto?.url}
          />
        </div>
        <div className="flex justify-center gap-2 text-xs text-slate-400">
          {left.lesion.size_mm && <span>{left.lesion.size_mm}mm</span>}
          {left.lesion.color && <span className="capitalize">{left.lesion.color.replace('_', ' ')}</span>}
        </div>
      </div>

      {/* Divider */}
      <div className="flex items-center">
        <div className="w-px h-full bg-slate-700" />
      </div>

      <div className="flex-1 flex flex-col gap-2">
        <div className="text-xs text-center font-semibold text-teal-400 uppercase tracking-wide">
          {format(parseISO(right.visit.visit_date), 'MMM d, yyyy')} — Latest
        </div>
        <div className="flex-1 rounded-xl overflow-hidden border border-teal-700/50" style={{ transform: `scale(${zoom})`, transformOrigin: 'center' }}>
          <PhotoPlaceholder
            index={2}
            captureType={rightPhoto?.capture_type || 'clinical'}
            date={right.visit.visit_date}
            url={rightPhoto?.url}
          />
        </div>
        <div className="flex justify-center gap-2 text-xs text-slate-400">
          {right.lesion.size_mm && <span>{right.lesion.size_mm}mm</span>}
          {right.lesion.color && <span className="capitalize">{right.lesion.color.replace('_', ' ')}</span>}
        </div>
      </div>
    </div>
  );
}

function OverlayView({
  left, right, opacity, zoom
}: {
  left: { visit: Visit; lesion: Lesion; photoIdx: number };
  right: { visit: Visit; lesion: Lesion; photoIdx: number };
  opacity: number;
  zoom: number;
}) {
  const leftPhoto = left.lesion.photos[left.photoIdx];
  const rightPhoto = right.lesion.photos[right.photoIdx];
  return (
    <div className="flex flex-col items-center gap-3 h-full">
      <div className="flex-1 relative w-full rounded-xl overflow-hidden border border-slate-700">
        <div className="absolute inset-0" style={{ transform: `scale(${zoom})`, transformOrigin: 'center' }}>
          <PhotoPlaceholder index={0} captureType={leftPhoto?.capture_type || 'clinical'} date={left.visit.visit_date} url={leftPhoto?.url} />
        </div>
        <div className="absolute inset-0" style={{ opacity, transform: `scale(${zoom})`, transformOrigin: 'center' }}>
          <PhotoPlaceholder index={2} captureType={rightPhoto?.capture_type || 'clinical'} date={right.visit.visit_date} url={rightPhoto?.url} />
        </div>
        <div className="absolute top-3 inset-x-3 flex justify-between text-xs">
          <span className="bg-black/70 text-white px-2 py-1 rounded">{format(parseISO(left.visit.visit_date), 'MMM yyyy')}</span>
          <span className="bg-teal-900/70 text-teal-200 px-2 py-1 rounded">{format(parseISO(right.visit.visit_date), 'MMM yyyy')} ({Math.round(opacity * 100)}%)</span>
        </div>
      </div>
    </div>
  );
}

function GridView({ visits }: { visits: { visit: Visit; lesion: Lesion }[] }) {
  return (
    <div className="grid grid-cols-3 gap-3 h-full overflow-y-auto">
      {visits.map(({ visit, lesion }, i) => (
        <div key={visit.visit_id} className="flex flex-col gap-1">
          <div className="aspect-square rounded-xl overflow-hidden border border-slate-700">
            <PhotoPlaceholder
              index={i}
              captureType={lesion.photos[0]?.capture_type || 'clinical'}
              date={visit.visit_date}
              size="small"
              url={lesion.photos[0]?.url}
            />
          </div>
          <div className="text-xs text-center text-slate-400">
            {format(parseISO(visit.visit_date), 'MMM yyyy')}
          </div>
          {lesion.size_mm && (
            <div className="text-xs text-center font-medium text-slate-300">{lesion.size_mm}mm</div>
          )}
        </div>
      ))}
    </div>
  );
}

function ChangeIndicator({ earlier, later }: { earlier: Lesion; later: Lesion }) {
  const sizeChange = (later.size_mm || 0) - (earlier.size_mm || 0);
  const colorChanged = earlier.color !== later.color;
  const borderChanged = earlier.border !== later.border;

  const hasChanges = sizeChange !== 0 || colorChanged || borderChanged;
  const isConcerning = sizeChange > 1 || (colorChanged && later.color === 'dark_brown') || borderChanged;

  return (
    <div className={clsx(
      'rounded-xl p-4 border',
      isConcerning ? 'bg-red-950/40 border-red-800/50' :
      hasChanges ? 'bg-amber-950/40 border-amber-800/50' :
      'bg-emerald-950/40 border-emerald-800/50'
    )}>
      <div className="flex items-center gap-2 mb-3">
        {isConcerning ? (
          <AlertCircle size={16} className="text-red-400" />
        ) : hasChanges ? (
          <TrendingUp size={16} className="text-amber-400" />
        ) : (
          <CheckCircle size={16} className="text-emerald-400" />
        )}
        <span className={clsx(
          'text-sm font-bold',
          isConcerning ? 'text-red-300' : hasChanges ? 'text-amber-300' : 'text-emerald-300'
        )}>
          {isConcerning ? 'Changed — Review Recommended' :
           hasChanges ? 'Minor Changes Noted' : 'Unchanged'}
        </span>
      </div>

      <div className="space-y-1.5">
        {sizeChange !== 0 && (
          <div className="flex items-center gap-2 text-xs text-slate-300">
            {sizeChange > 0 ? <TrendingUp size={12} className="text-amber-400" /> : <TrendingDown size={12} className="text-emerald-400" />}
            <span>Size: {earlier.size_mm}mm → {later.size_mm}mm ({sizeChange > 0 ? '+' : ''}{sizeChange}mm)</span>
          </div>
        )}
        {colorChanged && (
          <div className="flex items-center gap-2 text-xs text-slate-300">
            <TrendingUp size={12} className="text-amber-400" />
            <span>Color: {earlier.color?.replace('_', ' ')} → {later.color?.replace('_', ' ')}</span>
          </div>
        )}
        {borderChanged && (
          <div className="flex items-center gap-2 text-xs text-slate-300">
            <AlertCircle size={12} className="text-red-400" />
            <span>Border: {earlier.border.replace('_', ' ')} → {later.border.replace('_', ' ')}</span>
          </div>
        )}
        {!hasChanges && (
          <div className="text-xs text-slate-400">No measurable changes from previous visit.</div>
        )}
      </div>
    </div>
  );
}

export function PhotoComparison({ lesion, allVisitLesions, onClose }: PhotoComparisonProps) {
  const [mode, setMode] = useState<CompareMode>('side-by-side');
  const [overlayOpacity, setOverlayOpacity] = useState(0.6);
  const [zoom, setZoom] = useState(1);
  const [leftIdx, setLeftIdx] = useState(0);
  const [rightIdx, setRightIdx] = useState(Math.max(allVisitLesions.length - 1, 0));
  const [addingToBiopsy, setAddingToBiopsy] = useState(false);
  const [exportingPDF, setExportingPDF] = useState(false);

  const { updateLesion } = useAppStore();

  const leftEntry = allVisitLesions[leftIdx];
  const rightEntry = allVisitLesions[rightIdx];

  if (!leftEntry || !rightEntry) return null;

  const handleAddToBiopsyQueue = async () => {
    if (addingToBiopsy) return;
    setAddingToBiopsy(true);
    try {
      const target = rightEntry;
      await updateLesion(target.visit.visit_id, { ...target.lesion, action: 'biopsy_scheduled' });
    } finally {
      setAddingToBiopsy(false);
    }
  };

  const handleExportComparisonPDF = () => {
    if (exportingPDF) return;
    setExportingPDF(true);
    try {
      const doc = new jsPDF();
      const pageW = doc.internal.pageSize.getWidth();
      let y = 20;

      doc.setFontSize(16);
      doc.setTextColor(15, 23, 42);
      doc.text('Lesion Comparison Report', pageW / 2, y, { align: 'center' });
      y += 10;

      doc.setFontSize(10);
      doc.setTextColor(71, 85, 105);
      doc.text(`Region: ${lesion.body_region.replace(/_/g, ' ')}`, 20, y);
      y += 6;
      doc.text(`Generated: ${format(new Date(), 'MMMM d, yyyy')}`, 20, y);
      y += 10;

      doc.setFontSize(11);
      doc.setTextColor(15, 23, 42);
      doc.text('Visit Timeline', 20, y);
      y += 6;

      allVisitLesions.forEach(({ visit, lesion: vl }, i) => {
        doc.setFontSize(9);
        doc.setTextColor(71, 85, 105);
        doc.text(
          `${i + 1}. ${format(parseISO(visit.visit_date), 'MMM d, yyyy')} — ` +
          `${vl.size_mm ? vl.size_mm + 'mm' : 'size N/A'} · ` +
          `${vl.color?.replace('_', ' ') ?? 'color N/A'} · ` +
          `${vl.action.replace(/_/g, ' ')}`,
          20, y
        );
        y += 6;
        if (y > 260) { doc.addPage(); y = 20; }
      });

      doc.save(`lesion-comparison-${lesion.body_region}-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
    } finally {
      setExportingPDF(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950 z-50 flex flex-col fade-in">
      {/* Header */}
      <div className="flex items-center gap-4 px-6 py-4 border-b border-slate-800 shrink-0">
        <button
          onClick={onClose}
          className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors"
        >
          <X size={20} />
        </button>

        <div>
          <h2 className="font-bold text-white text-lg">Lesion Comparison</h2>
          <p className="text-sm text-slate-400 capitalize">
            {lesion.body_region.replace(/_/g, ' ')} · {allVisitLesions.length} visits tracked
          </p>
        </div>

        {/* Mode Toggle */}
        <div className="flex gap-1 bg-slate-800 p-1 rounded-xl ml-auto">
          {[
            { id: 'side-by-side' as CompareMode, icon: <Columns2 size={16} />, label: 'Side by Side' },
            { id: 'overlay' as CompareMode, icon: <Layers size={16} />, label: 'Overlay' },
            { id: 'grid' as CompareMode, icon: <LayoutGrid size={16} />, label: 'All Visits' },
          ].map((m) => (
            <button
              key={m.id}
              onClick={() => setMode(m.id)}
              className={clsx(
                'flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all',
                mode === m.id ? 'bg-teal-600 text-white shadow' : 'text-slate-400 hover:text-white'
              )}
            >
              {m.icon}
              <span className="hidden sm:inline">{m.label}</span>
            </button>
          ))}
        </div>

        {/* Zoom */}
        <div className="flex items-center gap-2 bg-slate-800 rounded-xl px-3 py-2">
          <button onClick={() => setZoom(z => Math.max(0.5, z - 0.1))} className="text-slate-400 hover:text-white">
            <ZoomOut size={16} />
          </button>
          <span className="text-xs text-slate-300 w-10 text-center">{Math.round(zoom * 100)}%</span>
          <button onClick={() => setZoom(z => Math.min(2, z + 0.1))} className="text-slate-400 hover:text-white">
            <ZoomIn size={16} />
          </button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Main comparison area */}
        <div className="flex-1 flex flex-col p-6 overflow-hidden">
          {/* Overlay opacity control */}
          {mode === 'overlay' && (
            <div className="flex items-center gap-4 mb-4 bg-slate-800/50 rounded-xl px-4 py-3">
              <Layers size={16} className="text-teal-400" />
              <span className="text-sm text-slate-300">Overlay opacity:</span>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={overlayOpacity}
                onChange={(e) => setOverlayOpacity(parseFloat(e.target.value))}
                className="flex-1 accent-teal-500"
              />
              <span className="text-sm text-slate-400 w-10">{Math.round(overlayOpacity * 100)}%</span>
            </div>
          )}

          {/* Comparison view */}
          <div className="flex-1 overflow-hidden">
            {mode === 'side-by-side' && (
              <SideBySideView
                left={{ ...leftEntry, photoIdx: 0 }}
                right={{ ...rightEntry, photoIdx: 0 }}
                zoom={zoom}
              />
            )}
            {mode === 'overlay' && (
              <OverlayView
                left={{ ...leftEntry, photoIdx: 0 }}
                right={{ ...rightEntry, photoIdx: 0 }}
                opacity={overlayOpacity}
                zoom={zoom}
              />
            )}
            {mode === 'grid' && (
              <GridView visits={allVisitLesions} />
            )}
          </div>
        </div>

        {/* Right sidebar — visit selector + analysis */}
        <div className="w-72 border-l border-slate-800 flex flex-col overflow-hidden shrink-0">
          {/* Visit selectors for side-by-side */}
          {mode === 'side-by-side' && (
            <div className="p-4 border-b border-slate-800">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Compare Visits</p>

              <div className="space-y-2">
                <div>
                  <label className="text-xs text-slate-500 mb-1 block">Earlier Visit</label>
                  <select
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-1 focus:ring-teal-500"
                    value={leftIdx}
                    onChange={(e) => setLeftIdx(parseInt(e.target.value))}
                  >
                    {allVisitLesions.map((vl, i) => (
                      <option key={i} value={i}>
                        {format(parseISO(vl.visit.visit_date), 'MMM d, yyyy')}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-slate-500 mb-1 block">Later Visit</label>
                  <select
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-1 focus:ring-teal-500"
                    value={rightIdx}
                    onChange={(e) => setRightIdx(parseInt(e.target.value))}
                  >
                    {allVisitLesions.map((vl, i) => (
                      <option key={i} value={i}>
                        {format(parseISO(vl.visit.visit_date), 'MMM d, yyyy')}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Change Analysis */}
          <div className="p-4 border-b border-slate-800">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Change Analysis</p>
            {allVisitLesions.length >= 2 && (
              <ChangeIndicator
                earlier={allVisitLesions[leftIdx].lesion}
                later={allVisitLesions[rightIdx].lesion}
              />
            )}
          </div>

          {/* Visit Timeline */}
          <div className="flex-1 overflow-y-auto p-4">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Visit Timeline</p>
            <div className="space-y-2">
              {allVisitLesions.map(({ visit, lesion: vl }, i) => (
                <div
                  key={visit.visit_id}
                  className={clsx(
                    'p-3 rounded-xl border cursor-pointer transition-all',
                    (i === leftIdx || i === rightIdx)
                      ? 'border-teal-700 bg-teal-900/30'
                      : 'border-slate-800 hover:border-slate-700 bg-slate-900/30'
                  )}
                  onClick={() => {
                    if (mode === 'side-by-side') {
                      if (i < rightIdx) setLeftIdx(i);
                      else setRightIdx(i);
                    }
                  }}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-200">
                      {format(parseISO(visit.visit_date), 'MMM d, yyyy')}
                    </span>
                    <span className={clsx(
                      'text-xs px-2 py-0.5 rounded-full font-medium',
                      vl.biopsy_result === 'malignant' ? 'bg-red-900/50 text-red-300' :
                      vl.biopsy_result === 'atypical' ? 'bg-amber-900/50 text-amber-300' :
                      'bg-slate-800 text-slate-400'
                    )}>
                      {vl.biopsy_result === 'na' ? vl.action.replace(/_/g, ' ') : vl.biopsy_result}
                    </span>
                  </div>
                  <div className="flex gap-3 mt-1 text-xs text-slate-500">
                    {vl.size_mm && <span>{vl.size_mm}mm</span>}
                    {vl.color && <span className="capitalize">{vl.color.replace('_', ' ')}</span>}
                    <span className="flex items-center gap-1">
                      <Camera size={10} />
                      {vl.photos.length}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Provider actions */}
          <div className="p-4 border-t border-slate-800">
            <button
              onClick={handleAddToBiopsyQueue}
              disabled={addingToBiopsy || rightEntry.lesion.action === 'biopsy_scheduled'}
              className="w-full bg-teal-600 hover:bg-teal-700 disabled:opacity-60 text-white font-medium py-2.5 rounded-xl text-sm transition-colors mb-2"
            >
              {addingToBiopsy ? 'Adding...' : rightEntry.lesion.action === 'biopsy_scheduled' ? 'In Biopsy Queue' : 'Add to Biopsy Queue'}
            </button>
            <button
              onClick={handleExportComparisonPDF}
              disabled={exportingPDF}
              className="w-full bg-slate-800 hover:bg-slate-700 disabled:opacity-60 text-slate-300 font-medium py-2.5 rounded-xl text-sm transition-colors"
            >
              {exportingPDF ? 'Generating...' : 'Export Comparison PDF'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
