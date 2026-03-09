import { useState } from 'react';
import { RotateCcw, Plus, ZoomIn, Info, MapPin } from 'lucide-react';
import { BodyMapSVG, getLesionColor, getLesionLabel } from './BodyMapSVG';
import { Lesion, BodyView, Visit } from '../../types';
import clsx from 'clsx';

interface BodyMapViewProps {
  visits: Visit[];
  currentVisit?: Visit | null;
  onPlaceLesion?: (x: number, y: number, region: string) => void;
  onLesionClick?: (lesion: Lesion) => void;
  interactive?: boolean;
  showLegend?: boolean;
}

const viewLabels: Record<BodyView, string> = {
  anterior: 'Front',
  posterior: 'Back',
  lateral_left: 'Left Side',
  lateral_right: 'Right Side',
  face_detail: 'Face',
  hands_detail: 'Hands',
  feet_detail: 'Feet',
};

const availableViews: BodyView[] = ['anterior', 'posterior'];

export function BodyMapView({
  visits,
  currentVisit,
  onPlaceLesion,
  onLesionClick,
  interactive = false,
  showLegend = true,
}: BodyMapViewProps) {
  const [activeView, setActiveView] = useState<BodyView>('anterior');
  const [placingMode, setPlacingMode] = useState(false);

  // Collect all lesions, marking current visit lesions
  const allLesions: Lesion[] = [];
  visits.forEach((visit) => {
    visit.lesions.forEach((lesion) => {
      const isCurrent = currentVisit && visit.visit_id === currentVisit.visit_id;
      allLesions.push({
        ...lesion,
        isNew: isCurrent ? true : lesion.isNew,
      });
    });
  });

  const handleBodyClick = (x: number, y: number, region: string) => {
    if (placingMode && onPlaceLesion) {
      onPlaceLesion(x, y, region);
      setPlacingMode(false);
    }
  };

  const legendItems = [
    { color: '#3B82F6', label: 'New / Active' },
    { color: '#6B7280', label: 'Monitoring' },
    { color: '#F59E0B', label: 'Atypical' },
    { color: '#EF4444', label: 'Malignant' },
    { color: '#10B981', label: 'Excised' },
    { color: '#8B5CF6', label: 'Biopsy Pending' },
  ];

  return (
    <div className="flex flex-col">
      {/* View Toggle + tools */}
      <div className="flex items-center justify-between mb-3 gap-2">
        {/* Front / Back toggle */}
        <div className="flex gap-1 bg-slate-100 p-1 rounded-xl">
          {availableViews.map((view) => (
            <button
              key={view}
              onClick={() => setActiveView(view)}
              className={clsx(
                'px-4 py-2 text-sm font-semibold rounded-lg transition-all min-h-[40px]',
                activeView === view
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              )}
            >
              {viewLabels[view]}
            </button>
          ))}
        </div>

        {/* Zoom / Reset — desktop only */}
        <div className="hidden sm:flex items-center gap-1">
          <button className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 min-h-[40px] min-w-[40px] flex items-center justify-center">
            <ZoomIn size={16} />
          </button>
          <button className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 min-h-[40px] min-w-[40px] flex items-center justify-center">
            <RotateCcw size={16} />
          </button>
        </div>
      </div>

      {/* Body Map canvas */}
      <div
        className="relative bg-slate-50 rounded-2xl border border-slate-100 overflow-hidden"
        style={{ minHeight: 'clamp(280px, 55vw, 520px)' }}
      >
        {/* Grid background */}
        <div
          className="absolute inset-0 opacity-30 pointer-events-none"
          style={{
            backgroundImage: `
              linear-gradient(rgba(148,163,184,0.3) 1px, transparent 1px),
              linear-gradient(90deg, rgba(148,163,184,0.3) 1px, transparent 1px)
            `,
            backgroundSize: '20px 20px',
          }}
        />

        {/* SVG */}
        <div className="flex items-center justify-center h-full py-4">
          <BodyMapSVG
            view={activeView}
            lesions={allLesions}
            onBodyClick={handleBodyClick}
            onLesionClick={onLesionClick}
            interactive={interactive && placingMode}
          />
        </div>

        {/* Placing mode instruction banner */}
        {placingMode && (
          <div className="absolute inset-x-3 top-3 flex items-center gap-2 bg-teal-600 text-white rounded-xl px-4 py-2.5 shadow-lg fade-in">
            <MapPin size={16} className="shrink-0 animate-pulse" />
            <span className="text-sm font-semibold">Tap the body to place lesion marker</span>
          </div>
        )}

        {/* Empty state guide */}
        {interactive && !placingMode && allLesions.length === 0 && (
          <div className="absolute inset-0 flex items-end justify-center pb-16 pointer-events-none fade-in">
            <div className="flex flex-col items-center gap-2 text-slate-400">
              <div className="w-px h-8 bg-slate-300" />
              <p className="text-xs font-medium">Tap "Add Lesion" below to begin</p>
            </div>
          </div>
        )}

        {/* View label */}
        <div className="absolute bottom-3 left-3 text-xs font-medium text-slate-400">
          {viewLabels[activeView]}
        </div>

        {/* Lesion count badge */}
        {allLesions.length > 0 && (
          <div className="absolute bottom-3 right-3 flex items-center gap-1.5 bg-white rounded-xl px-2.5 py-1.5 border border-slate-200 text-xs font-medium text-slate-600 shadow-sm">
            <div className="w-2 h-2 bg-blue-500 rounded-full" />
            {allLesions.length} lesion{allLesions.length !== 1 ? 's' : ''}
          </div>
        )}
      </div>

      {/* Add Lesion CTA — large, always visible */}
      {interactive && (
        <button
          onClick={() => setPlacingMode(!placingMode)}
          className={clsx(
            'mt-3 w-full flex items-center justify-center gap-2 py-4 rounded-xl font-bold text-base transition-all shadow-md',
            placingMode
              ? 'bg-teal-700 text-white ring-4 ring-teal-300/50'
              : 'bg-teal-600 hover:bg-teal-700 active:bg-teal-800 text-white'
          )}
        >
          <Plus size={20} />
          {placingMode ? 'Tap body to place…' : 'Add Lesion'}
        </button>
      )}

      {/* Legend */}
      {showLegend && (
        <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1.5">
          {legendItems.map((item) => (
            <div key={item.label} className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full border-2 border-white shadow-sm" style={{ backgroundColor: item.color }} />
              <span className="text-xs text-slate-500">{item.label}</span>
            </div>
          ))}
        </div>
      )}

      {/* ABCDE reminder */}
      {interactive && (
        <div className="mt-3 flex items-start gap-2 bg-blue-50 border border-blue-100 rounded-xl px-3 py-2.5">
          <Info size={13} className="text-blue-500 mt-0.5 shrink-0" />
          <p className="text-xs text-blue-700">
            <strong>ABCDE:</strong> Asymmetry · Border · Color · Diameter &gt;6mm · Evolving
          </p>
        </div>
      )}
    </div>
  );
}
