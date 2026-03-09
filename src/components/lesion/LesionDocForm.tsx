import { useState } from 'react';
import { X, Camera, CheckCircle, ChevronRight, Ruler, Clock, Check, ArrowLeft } from 'lucide-react';
import { Lesion, LesionAction, LesionColor, LesionShape, LesionBorder, LesionSymmetry, BiopsyResult } from '../../types';
import { useAppStore } from '../../store/appStore';
import clsx from 'clsx';

interface LesionDocFormProps {
  pendingCoords: { x: number; y: number };
  region: string;
  visitId: string;
  onClose: () => void;
  onSave: (lesion: Lesion) => void;
}

const sizeOptions = [1, 2, 3, 4, 5, 6];

const colorOptions: { value: LesionColor; label: string; swatch: string }[] = [
  { value: 'tan',         label: 'Tan',        swatch: '#D2B48C' },
  { value: 'brown',       label: 'Brown',      swatch: '#8B4513' },
  { value: 'dark_brown',  label: 'Dark Brown', swatch: '#3D1A00' },
  { value: 'black',       label: 'Black',      swatch: '#1A1A1A' },
  { value: 'red',         label: 'Red',        swatch: '#DC2626' },
  { value: 'pink',        label: 'Pink',       swatch: '#F9A8D4' },
  { value: 'multicolored',label: 'Multicolor', swatch: 'linear-gradient(135deg,#8B4513 0%,#DC2626 50%,#1A1A1A 100%)' },
];

const shapeOptions: { value: LesionShape; label: string; icon: string }[] = [
  { value: 'round',     label: 'Round',     icon: '●' },
  { value: 'oval',      label: 'Oval',      icon: '⬤' },
  { value: 'irregular', label: 'Irregular', icon: '◉' },
  { value: 'other',     label: 'Other',     icon: '◈' },
];

const actionOptions: { value: LesionAction; label: string; color: string }[] = [
  { value: 'monitor',           label: 'Monitor',           color: 'bg-blue-50 text-blue-700 border-blue-300' },
  { value: 'biopsy_scheduled',  label: 'Biopsy Scheduled',  color: 'bg-amber-50 text-amber-700 border-amber-300' },
  { value: 'biopsy_performed',  label: 'Biopsy Performed',  color: 'bg-violet-50 text-violet-700 border-violet-300' },
  { value: 'excision',          label: 'Excision',          color: 'bg-emerald-50 text-emerald-700 border-emerald-300' },
  { value: 'referral',          label: 'Referral',          color: 'bg-orange-50 text-orange-700 border-orange-300' },
  { value: 'no_action',         label: 'No Action',         color: 'bg-slate-50 text-slate-600 border-slate-300' },
];

const TOTAL_STEPS = 4;

export function LesionDocForm({ pendingCoords, region, visitId, onClose, onSave }: LesionDocFormProps) {
  const { currentUser, getDocTime } = useAppStore();
  const isProvider = currentUser?.role === 'provider';

  const [step, setStep] = useState(1);
  const [size, setSize] = useState<number | null>(null);
  const [sizeCustom, setSizeCustom] = useState('');
  const [shape, setShape] = useState<LesionShape | null>(null);
  const [color, setColor] = useState<LesionColor | null>(null);
  const [border, setBorder] = useState<LesionBorder>('not_assessed');
  const [symmetry, setSymmetry] = useState<LesionSymmetry>('not_assessed');
  const [action, setAction] = useState<LesionAction>('monitor');
  const [notes, setNotes] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [saved, setSaved] = useState(false);

  const regionLabel = region.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());

  const handleAddPhoto = () => {
    setPhotos((prev) => [...prev, `photo-${Date.now()}`]);
  };

  const handleSave = () => {
    const lesion: Lesion = {
      lesion_id: `l-${Date.now()}`,
      body_location_x: pendingCoords.x,
      body_location_y: pendingCoords.y,
      body_region: region as Lesion['body_region'],
      body_view: 'anterior',
      size_mm: size ?? (sizeCustom ? parseFloat(sizeCustom) : null),
      shape,
      color,
      border,
      symmetry,
      action,
      clinical_notes: notes,
      biopsy_result: 'na' as BiopsyResult,
      pathology_notes: '',
      created_at: new Date().toISOString(),
      created_by: currentUser?.name || 'Unknown',
      photos: photos.map((p, i) => ({
        photo_id: `ph-${p}`,
        url: `https://placehold.co/400x400/1a1a2e/white?text=Photo+${i + 1}`,
        capture_type: i % 2 === 0 ? 'clinical' : 'dermoscopic',
        captured_at: new Date().toISOString(),
        captured_by: currentUser?.name || 'Unknown',
      })),
      isNew: true,
    };
    setSaved(true);
    setTimeout(() => { onSave(lesion); }, 800);
  };

  if (saved) {
    return (
      <div className="slide-up fixed inset-0 bg-black/40 flex items-end md:items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl p-8 w-full md:max-w-md flex flex-col items-center gap-4">
          <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center">
            <CheckCircle size={32} className="text-emerald-600" />
          </div>
          <h3 className="text-lg font-semibold text-slate-900">Lesion Documented</h3>
          <p className="text-sm text-slate-500 text-center">
            Documentation time: <strong className="text-teal-600">{getDocTime()}s</strong>
          </p>
        </div>
      </div>
    );
  }

  // ── Step content ──────────────────────────────────────────────────────────

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <div className="p-5 space-y-4">
            <div>
              <h3 className="text-base font-semibold text-slate-900">Capture Photos</h3>
              <p className="text-xs text-slate-400 mt-0.5">Clinical + dermoscopic · tap to add</p>
            </div>

            {/* Thumbnails */}
            {photos.length > 0 && (
              <div className="flex gap-2 flex-wrap">
                {photos.map((_, i) => (
                  <div key={i} className="w-16 h-16 rounded-xl overflow-hidden border border-slate-200 relative shrink-0">
                    <div className="w-full h-full bg-gradient-to-br from-slate-700 to-slate-900 flex items-center justify-center">
                      <span className="text-xs text-white font-medium">#{i + 1}</span>
                    </div>
                    <div className="absolute bottom-0 inset-x-0 bg-black/50 text-white text-[9px] text-center py-0.5">
                      {i % 2 === 0 ? 'Clinical' : 'Derm.'}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Big capture button */}
            <button
              onClick={handleAddPhoto}
              className="w-full flex flex-col items-center justify-center gap-3 h-32 rounded-2xl border-2 border-dashed border-teal-300 bg-teal-50 text-teal-600 hover:border-teal-500 hover:bg-teal-100 active:bg-teal-200 transition-colors"
            >
              <Camera size={32} />
              <span className="text-sm font-semibold">Tap to Capture Photo</span>
            </button>

            {photos.length > 0 && (
              <p className="text-xs text-center text-slate-400">{photos.length} photo{photos.length !== 1 ? 's' : ''} captured</p>
            )}
          </div>
        );

      case 2:
        return (
          <div className="p-5 space-y-5">
            {/* Size */}
            <div>
              <h3 className="text-base font-semibold text-slate-900 mb-3">Size (mm)</h3>
              <div className="grid grid-cols-3 gap-2 mb-3">
                {sizeOptions.map((s) => (
                  <button
                    key={s}
                    onClick={() => { setSize(s); setSizeCustom(''); }}
                    className={clsx(
                      'h-14 rounded-xl border-2 text-lg font-bold transition-all',
                      size === s
                        ? 'bg-teal-600 text-white border-teal-600 shadow-md scale-[1.02]'
                        : 'bg-white text-slate-700 border-slate-200 hover:border-teal-300'
                    )}
                  >
                    {s}
                    <span className="text-xs font-normal ml-0.5">mm</span>
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <Ruler size={14} className="text-slate-400 shrink-0" />
                <input
                  type="number"
                  placeholder="Custom size (mm)"
                  className="input text-sm"
                  value={sizeCustom}
                  onChange={(e) => { setSizeCustom(e.target.value); setSize(null); }}
                />
              </div>
            </div>

            {/* Shape */}
            <div className="border-t border-slate-100 pt-4">
              <h3 className="text-base font-semibold text-slate-900 mb-3">Shape</h3>
              <div className="grid grid-cols-2 gap-2">
                {shapeOptions.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setShape(opt.value)}
                    className={clsx(
                      'h-14 rounded-xl border-2 flex flex-col items-center justify-center gap-0.5 transition-all',
                      shape === opt.value
                        ? 'bg-teal-600 text-white border-teal-600 shadow-md'
                        : 'bg-white text-slate-700 border-slate-200 hover:border-teal-300'
                    )}
                  >
                    <span className="text-xl leading-none">{opt.icon}</span>
                    <span className="text-xs font-semibold">{opt.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="p-5">
            <h3 className="text-base font-semibold text-slate-900 mb-3">Color</h3>
            <div className="grid grid-cols-2 gap-2">
              {colorOptions.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setColor(opt.value)}
                  className={clsx(
                    'flex items-center gap-3 h-14 px-4 rounded-xl border-2 text-sm font-medium transition-all',
                    color === opt.value
                      ? 'border-teal-500 ring-2 ring-teal-200 bg-teal-50 shadow-sm'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  )}
                >
                  <div
                    className="w-8 h-8 rounded-full border-2 border-white shadow-md shrink-0"
                    style={{
                      background: opt.swatch,
                      backgroundColor: opt.swatch.startsWith('linear') ? undefined : opt.swatch,
                    }}
                  />
                  <span className="text-slate-700">{opt.label}</span>
                  {color === opt.value && (
                    <Check size={15} className="text-teal-600 ml-auto shrink-0" />
                  )}
                </button>
              ))}
            </div>
          </div>
        );

      case 4:
        return (
          <div className="p-5 space-y-5">
            {/* Action */}
            <div>
              <h3 className="text-base font-semibold text-slate-900 mb-3">Clinical Action</h3>
              <div className="grid grid-cols-2 gap-2">
                {actionOptions.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setAction(opt.value)}
                    className={clsx(
                      'h-14 rounded-xl border-2 text-sm font-semibold transition-all flex items-center justify-center text-center px-2',
                      action === opt.value
                        ? opt.color + ' shadow-sm scale-[1.02]'
                        : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Border + Symmetry */}
            <div className="border-t border-slate-100 pt-4 space-y-3">
              {/* Border */}
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-slate-600 w-20 shrink-0">Border</span>
                <div className="flex gap-1.5 flex-1">
                  {(['regular', 'irregular', 'not_assessed'] as LesionBorder[]).map((v) => (
                    <button
                      key={v}
                      onClick={() => setBorder(v)}
                      className={clsx(
                        'flex-1 py-2 rounded-lg border text-xs font-medium transition-all min-h-[40px]',
                        border === v
                          ? 'bg-slate-800 text-white border-slate-800'
                          : 'bg-white text-slate-500 border-slate-200 hover:border-slate-400'
                      )}
                    >
                      {v === 'not_assessed' ? 'N/A' : v.charAt(0).toUpperCase() + v.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Symmetry */}
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-slate-600 w-20 shrink-0">Symmetry</span>
                <div className="flex gap-1.5 flex-1">
                  {(['symmetric', 'asymmetric', 'not_assessed'] as LesionSymmetry[]).map((v) => (
                    <button
                      key={v}
                      onClick={() => setSymmetry(v)}
                      className={clsx(
                        'flex-1 py-2 rounded-lg border text-xs font-medium transition-all min-h-[40px]',
                        symmetry === v
                          ? 'bg-slate-800 text-white border-slate-800'
                          : 'bg-white text-slate-500 border-slate-200 hover:border-slate-400'
                      )}
                    >
                      {v === 'not_assessed' ? 'N/A' : v === 'symmetric' ? 'Sym' : 'Asym'}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Notes — provider only */}
            {isProvider && (
              <div className="border-t border-slate-100 pt-4">
                <label className="label">Clinical Notes</label>
                <textarea
                  className="input resize-none text-sm"
                  rows={3}
                  placeholder="Add clinical assessment, differential, plan..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>
            )}
          </div>
        );
    }
  };

  // ── Step labels ────────────────────────────────────────────────────────────
  const stepLabels = ['Photos', 'Size & Shape', 'Color', 'Assessment'];

  return (
    <div className="slide-up fixed inset-0 bg-black/50 flex items-end md:items-center justify-center z-50">
      <div className="bg-white rounded-t-2xl md:rounded-2xl w-full md:max-w-lg max-h-[92dvh] flex flex-col">

        {/* Header */}
        <div className="bg-white border-b border-slate-100 px-5 pt-5 pb-4 rounded-t-2xl shrink-0">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-xs font-semibold text-teal-600 uppercase tracking-wide">
                  Step {step} of {TOTAL_STEPS}
                </span>
                <span className="text-xs text-slate-300">·</span>
                <span className="text-xs text-slate-400">{regionLabel}</span>
              </div>
              <h3 className="font-bold text-slate-900 text-lg">{stepLabels[step - 1]}</h3>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <div className="flex items-center gap-1 text-xs text-teal-600 font-medium bg-teal-50 px-2.5 py-1.5 rounded-lg">
                <Clock size={12} />
                <span>{getDocTime()}s</span>
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-lg hover:bg-slate-100 text-slate-400 min-h-[44px] min-w-[44px] flex items-center justify-center"
              >
                <X size={20} />
              </button>
            </div>
          </div>

          {/* Progress bar */}
          <div className="flex gap-1 mt-3">
            {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
              <div
                key={i}
                className={clsx(
                  'h-1.5 flex-1 rounded-full transition-all duration-300',
                  i + 1 <= step ? 'bg-teal-500' : 'bg-slate-200'
                )}
              />
            ))}
          </div>
        </div>

        {/* Step content — scrollable */}
        <div className="flex-1 overflow-y-auto">
          {renderStep()}
        </div>

        {/* Footer */}
        <div className="shrink-0 bg-white border-t border-slate-100 px-5 py-4">
          <div className="flex gap-3">
            {step > 1 ? (
              <button
                onClick={() => setStep((s) => s - 1)}
                className="btn-secondary justify-center gap-2 px-4"
                style={{ minWidth: '100px' }}
              >
                <ArrowLeft size={16} />
                Back
              </button>
            ) : (
              <button onClick={onClose} className="btn-secondary justify-center" style={{ minWidth: '100px' }}>
                Cancel
              </button>
            )}

            {step < TOTAL_STEPS ? (
              <button
                onClick={() => setStep((s) => s + 1)}
                className="btn-primary flex-1 justify-center"
              >
                Next
                <ChevronRight size={16} />
              </button>
            ) : (
              <button onClick={handleSave} className="btn-primary flex-1 justify-center">
                <CheckCircle size={16} />
                Save Lesion
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
