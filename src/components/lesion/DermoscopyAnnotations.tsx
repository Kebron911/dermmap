import { useState } from 'react';
import { X, Plus, Tag, Eye, EyeOff, Trash2 } from 'lucide-react';
import { DermoscopyAnnotation, DermoscopyFeature } from '../../types';
import clsx from 'clsx';

interface DermoscopyAnnotationsProps {
  annotations: DermoscopyAnnotation[];
  onChange: (annotations: DermoscopyAnnotation[]) => void;
  readOnly?: boolean;
}

const FEATURE_OPTIONS: { value: DermoscopyFeature; label: string; color: string; description: string }[] = [
  { value: 'pigment_network',       label: 'Pigment Network',       color: '#8B4513', description: 'Typical uniform brown lines' },
  { value: 'atypical_network',      label: 'Atypical Network',      color: '#DC2626', description: 'Irregular, thickened, broken lines' },
  { value: 'blue_white_veil',       label: 'Blue-White Veil',       color: '#3B82F6', description: 'Confluent blue-gray to whitish area' },
  { value: 'regression_structures', label: 'Regression',            color: '#9CA3AF', description: 'White scar-like or peppering' },
  { value: 'dots_globules',         label: 'Dots / Globules',       color: '#F59E0B', description: 'Black/brown dots or round structures' },
  { value: 'streaks',               label: 'Streaks',               color: '#EF4444', description: 'Radial or pseudopod structures' },
  { value: 'blotch',                label: 'Blotch',                color: '#1F2937', description: 'Structureless black/brown area' },
  { value: 'vascular_pattern',      label: 'Vascular Pattern',      color: '#EC4899', description: 'Arborizing, dotted or linear vessels' },
  { value: 'structureless',         label: 'Structureless',         color: '#A78BFA', description: 'Homogeneous featureless area' },
  { value: 'crystalline_structures',label: 'Crystalline',           color: '#06B6D4', description: 'Shiny white lines (polarized)' },
];

function getFeatureInfo(feature: DermoscopyFeature) {
  return FEATURE_OPTIONS.find(f => f.value === feature) || FEATURE_OPTIONS[0];
}

export function DermoscopyAnnotations({ annotations, onChange, readOnly = false }: DermoscopyAnnotationsProps) {
  const [adding, setAdding] = useState(false);
  const [selectedFeature, setSelectedFeature] = useState<DermoscopyFeature | null>(null);
  const [showLabels, setShowLabels] = useState(true);
  const [noteText, setNoteText] = useState('');

  const handleImageClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (readOnly || !adding || !selectedFeature) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    const annotation: DermoscopyAnnotation = {
      feature: selectedFeature,
      x: Math.round(x * 10) / 10,
      y: Math.round(y * 10) / 10,
      notes: noteText || undefined,
    };
    onChange([...annotations, annotation]);
    setNoteText('');
  };

  const handleRemove = (index: number) => {
    onChange(annotations.filter((_, i) => i !== index));
  };

  // Count each feature
  const featureCounts = annotations.reduce<Record<string, number>>((acc, a) => {
    acc[a.feature] = (acc[a.feature] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
          <Tag size={14} className="text-violet-500" />
          Dermoscopic Features
        </h4>
        <div className="flex gap-1.5">
          <button
            onClick={() => setShowLabels(!showLabels)}
            className={clsx(
              'p-1.5 rounded-lg text-xs transition-colors',
              showLabels ? 'bg-violet-50 text-violet-600' : 'bg-slate-100 text-slate-400'
            )}
            title={showLabels ? 'Hide labels' : 'Show labels'}
          >
            {showLabels ? <Eye size={14} /> : <EyeOff size={14} />}
          </button>
          {!readOnly && (
            <button
              onClick={() => { setAdding(!adding); setSelectedFeature(null); }}
              className={clsx(
                'flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors',
                adding
                  ? 'bg-red-50 text-red-600 hover:bg-red-100'
                  : 'bg-violet-50 text-violet-600 hover:bg-violet-100'
              )}
            >
              {adding ? <X size={12} /> : <Plus size={12} />}
              {adding ? 'Cancel' : 'Annotate'}
            </button>
          )}
        </div>
      </div>

      {/* Annotation image area */}
      <div
        className={clsx(
          'relative aspect-square bg-slate-900 rounded-xl overflow-hidden',
          adding && selectedFeature ? 'cursor-crosshair' : 'cursor-default'
        )}
        onClick={handleImageClick}
      >
        {/* Placeholder dermoscopy image */}
        <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full">
          <circle cx="50" cy="50" r="40" fill="#2D1B0E" />
          <circle cx="50" cy="50" r="32" fill="#4A2810" opacity="0.8" />
          <circle cx="48" cy="48" r="20" fill="#3D1A00" opacity="0.7" />
          <circle cx="52" cy="46" r="10" fill="#1A0A00" opacity="0.6" />
          <circle cx="50" cy="50" r="40" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="0.5" />
        </svg>

        {/* Annotation markers */}
        {annotations.map((ann, i) => {
          const info = getFeatureInfo(ann.feature);
          return (
            <div
              key={i}
              className="absolute transform -translate-x-1/2 -translate-y-1/2 group z-10"
              style={{ left: `${ann.x}%`, top: `${ann.y}%` }}
            >
              <div
                className="w-4 h-4 rounded-full border-2 border-white shadow-lg"
                style={{ backgroundColor: info.color }}
              />
              {showLabels && (
                <div className="absolute left-5 top-1/2 -translate-y-1/2 bg-black/80 text-white text-[10px] px-1.5 py-0.5 rounded whitespace-nowrap pointer-events-none">
                  {info.label}
                </div>
              )}
              {!readOnly && (
                <button
                  onClick={(e) => { e.stopPropagation(); handleRemove(i); }}
                  className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-white hidden group-hover:flex items-center justify-center"
                >
                  <X size={8} />
                </button>
              )}
            </div>
          );
        })}

        {/* Adding hint */}
        {adding && selectedFeature && (
          <div className="absolute bottom-2 inset-x-2 bg-black/70 text-white text-xs text-center py-1.5 rounded-lg">
            Tap image to place <strong>{getFeatureInfo(selectedFeature).label}</strong> marker
          </div>
        )}
      </div>

      {/* Feature picker (when adding) */}
      {adding && (
        <div className="space-y-2">
          <label className="text-xs font-medium text-slate-500">Select feature type:</label>
          <div className="grid grid-cols-2 gap-1.5">
            {FEATURE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setSelectedFeature(opt.value)}
                className={clsx(
                  'flex items-center gap-2 px-2.5 py-2 rounded-lg border text-xs transition-all text-left',
                  selectedFeature === opt.value
                    ? 'border-violet-400 bg-violet-50 ring-1 ring-violet-200'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                )}
              >
                <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: opt.color }} />
                <div className="min-w-0">
                  <div className="font-medium text-slate-700 truncate">{opt.label}</div>
                </div>
              </button>
            ))}
          </div>
          {selectedFeature && (
            <input
              type="text"
              placeholder="Optional note for this marker..."
              className="input text-xs"
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
            />
          )}
        </div>
      )}

      {/* Feature summary list */}
      {annotations.length > 0 && !adding && (
        <div className="space-y-1">
          <label className="text-xs font-medium text-slate-500">Identified features:</label>
          {Object.entries(featureCounts).map(([feature, count]) => {
            const info = getFeatureInfo(feature as DermoscopyFeature);
            return (
              <div key={feature} className="flex items-center gap-2 px-2 py-1.5 bg-slate-50 rounded-lg text-xs">
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: info.color }} />
                <span className="font-medium text-slate-700 flex-1">{info.label}</span>
                <span className="text-slate-400">×{count}</span>
              </div>
            );
          })}
        </div>
      )}

      {annotations.length === 0 && !adding && (
        <p className="text-xs text-slate-400 italic text-center py-2">No dermoscopic features annotated yet.</p>
      )}
    </div>
  );
}
