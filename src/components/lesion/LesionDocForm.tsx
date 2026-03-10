import { useState } from 'react';
import { X, Camera, CheckCircle, ChevronRight, Ruler, Clock, Check, ArrowLeft, Mic, FileText, AlertTriangle, DollarSign, Tag, TrendingUp, Edit } from 'lucide-react';
import { Lesion, LesionAction, LesionColor, LesionShape, LesionBorder, LesionSymmetry, BiopsyResult, DermoscopyAnnotation } from '../../types';
import { useAppStore } from '../../store/appStore';
import { VoiceInput } from '../ui/VoiceInput';
import { CameraCapture } from './CameraCapture';
import { CPTCodeTracker } from '../billing/CPTCodeTracker';
import { DermoscopyAnnotations } from './DermoscopyAnnotations';
import { CLINICAL_TEMPLATES, getTemplatesByCategory, searchTemplates } from '../../data/clinicalTemplates';
import { calculateRiskScore, riskColor, riskLabel, detectChanges } from '../../utils/riskScoring';
import clsx from 'clsx';

interface LesionDocFormProps {
  pendingCoords: { x: number; y: number };
  region: string;
  visitId: string;
  onClose: () => void;
  onSave: (lesion: Lesion) => void;
  priorLesion?: Lesion;  // For re-documentation workflow (creates NEW lesion with comparison)
  existingLesion?: Lesion;  // For editing existing lesion in current visit
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

const TOTAL_STEPS = 5;

export function LesionDocForm({ pendingCoords, region, visitId, onClose, onSave, priorLesion, existingLesion }: LesionDocFormProps) {
  const { currentUser, getDocTime } = useAppStore();
  const isProvider = currentUser?.role === 'provider';

  // Use existingLesion for editing, priorLesion for re-documentation
  const sourceLesion = existingLesion || priorLesion;

  const [step, setStep] = useState(1);
  const [size, setSize] = useState<number | null>(sourceLesion?.size_mm || null);
  const [sizeCustom, setSizeCustom] = useState('');
  const [shape, setShape] = useState<LesionShape | null>(sourceLesion?.shape || null);
  const [color, setColor] = useState<LesionColor | null>(sourceLesion?.color || null);
  const [border, setBorder] = useState<LesionBorder>(sourceLesion?.border || 'not_assessed');
  const [symmetry, setSymmetry] = useState<LesionSymmetry>(sourceLesion?.symmetry || 'not_assessed');
  const [action, setAction] = useState<LesionAction>(sourceLesion?.action || 'monitor');
  const [notes, setNotes] = useState(
    existingLesion ? existingLesion.clinical_notes :
    priorLesion ? `Follow-up of previous lesion.\n${priorLesion.clinical_notes || ''}` : ''
  );
  const [photos, setPhotos] = useState<string[]>(existingLesion?.photos.map(p => p.photo_id) || []);
  const [saved, setSaved] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [templateSearch, setTemplateSearch] = useState('');
  const [cptCodes, setCptCodes] = useState<string[]>(sourceLesion?.cpt_codes || []);
  const [dermAnnotations, setDermAnnotations] = useState<DermoscopyAnnotation[]>([]);

  const regionLabel = region.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());

  const handleAddPhoto = () => {
    setPhotos((prev) => [...prev, `photo-${Date.now()}`]);
  };

  const handleCameraCapture = (photo: { url: string; type: 'clinical' | 'dermoscopic' }) => {
    setPhotos((prev) => [...prev, `cam-${Date.now()}`]);
    setShowCamera(false);
  };

  const handleDeletePhoto = (index: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  const handleApplyTemplate = (text: string) => {
    setNotes((prev) => (prev ? prev + '\n' : '') + text);
    setShowTemplates(false);
  };

  // Calculate risk score preview
  const riskPreview = calculateRiskScore({
    symmetry,
    border,
    color,
    size_mm: size ?? (sizeCustom ? parseFloat(sizeCustom) : null),
    dermoscopy_features: dermAnnotations.map(a => a.feature),
  } as any);

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
        annotations: i % 2 === 1 ? dermAnnotations : undefined,
      })),
      isNew: true,
      risk_score: riskPreview,
      cpt_codes: cptCodes.length > 0 ? cptCodes : undefined,
      dermoscopy_features: dermAnnotations.length > 0 ? [...new Set(dermAnnotations.map(a => a.feature))] : undefined,
    };
    
    // If this is a re-documentation, calculate and attach change tracking
    if (priorLesion) {
      lesion.change_from_prior = detectChanges(lesion, priorLesion, visitId, priorLesion.created_at);
    }
    
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
                  <div key={i} className="w-16 h-16 rounded-xl overflow-hidden border border-slate-200 relative shrink-0 group">
                    <div className="w-full h-full bg-gradient-to-br from-slate-700 to-slate-900 flex items-center justify-center">
                      <span className="text-xs text-white font-medium">#{i + 1}</span>
                    </div>
                    <div className="absolute bottom-0 inset-x-0 bg-black/50 text-white text-[9px] text-center py-0.5">
                      {i % 2 === 0 ? 'Clinical' : 'Derm.'}
                    </div>
                    {/* Delete button */}
                    <button
                      onClick={() => handleDeletePhoto(i)}
                      className="absolute top-0.5 right-0.5 w-5 h-5 bg-red-600 hover:bg-red-700 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      type="button"
                    >
                      <X size={12} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Camera + upload buttons */}
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setShowCamera(true)}
                className="flex flex-col items-center justify-center gap-2 h-28 rounded-2xl border-2 border-dashed border-teal-300 bg-teal-50 text-teal-600 hover:border-teal-500 hover:bg-teal-100 active:bg-teal-200 transition-colors"
              >
                <Camera size={28} />
                <span className="text-xs font-semibold">Open Camera</span>
              </button>
              <button
                onClick={handleAddPhoto}
                className="flex flex-col items-center justify-center gap-2 h-28 rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 text-slate-500 hover:border-slate-400 hover:bg-slate-100 transition-colors"
              >
                <Camera size={28} />
                <span className="text-xs font-semibold">Upload File</span>
              </button>
            </div>

            {photos.length > 0 && (
              <p className="text-xs text-center text-slate-400">{photos.length} photo{photos.length !== 1 ? 's' : ''} captured</p>
            )}

            {/* Camera overlay */}
            {showCamera && (
              <CameraCapture
                onCapture={handleCameraCapture}
                onClose={() => setShowCamera(false)}
              />
            )}
          </div>
        );

      case 2:
        return (
          <div className="p-5 space-y-5">
            {/* Size */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-base font-semibold text-slate-900">Size (mm)</h3>
                {priorLesion?.size_mm && (
                  <span className="text-xs text-slate-500 flex items-center gap-1">
                    <TrendingUp size={12} />
                    Was {priorLesion.size_mm}mm
                  </span>
                )}
              </div>
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
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-base font-semibold text-slate-900">Shape</h3>
                {priorLesion?.shape && (
                  <span className="text-xs text-slate-500 flex items-center gap-1">
                    Was {priorLesion.shape}
                  </span>
                )}
              </div>
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
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-base font-semibold text-slate-900">Color</h3>
              {priorLesion?.color && (
                <span className="text-xs text-slate-500 flex items-center gap-1">
                  Was {priorLesion.color.replace(/_/g, ' ')}
                </span>
              )}
            </div>
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

            {/* Clinical Notes with voice input and templates */}
            <div className="border-t border-slate-100 pt-4">
              <div className="flex items-center justify-between mb-2">
                <label className="label mb-0">Clinical Notes</label>
                <div className="flex gap-1.5">
                  <button
                    onClick={() => setShowTemplates(!showTemplates)}
                    className={clsx(
                      'flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium transition-colors',
                      showTemplates ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                    )}
                  >
                    <FileText size={12} />
                    Templates
                  </button>
                </div>
              </div>

              {/* Template picker */}
              {showTemplates && (
                <div className="mb-3 border border-blue-200 rounded-xl bg-blue-50 p-3 space-y-2">
                  <input
                    type="text"
                    placeholder="Search templates..."
                    className="w-full px-3 py-1.5 bg-white border border-blue-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-200"
                    value={templateSearch}
                    onChange={(e) => setTemplateSearch(e.target.value)}
                  />
                  <div className="max-h-32 overflow-y-auto space-y-1">
                    {(templateSearch ? searchTemplates(templateSearch) : CLINICAL_TEMPLATES.slice(0, 8)).map(t => (
                      <button
                        key={t.id}
                        onClick={() => handleApplyTemplate(t.text)}
                        className="w-full text-left px-2.5 py-2 bg-white rounded-lg text-xs hover:bg-blue-100 transition-colors border border-blue-100"
                      >
                        <div className="font-medium text-slate-700">{t.name}</div>
                        <div className="text-slate-400 truncate mt-0.5">{t.text.slice(0, 60)}...</div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <VoiceInput
                onTranscript={(text) => setNotes((prev) => (prev ? prev + ' ' : '') + text)}
                placeholder="Add clinical assessment, differential, plan..."
                value={notes}
              />
            </div>

            {/* Risk score preview */}
            {riskPreview && (
              <div className={clsx(
                'border-t border-slate-100 pt-4'
              )}>
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle size={14} style={{ color: riskColor(riskPreview.level) }} />
                  <span className="text-sm font-semibold text-slate-700">Risk Assessment</span>
                </div>
                <div className={clsx(
                  'rounded-xl p-3 border',
                  riskPreview.level === 'very_high' ? 'bg-red-50 border-red-200' :
                  riskPreview.level === 'high' ? 'bg-orange-50 border-orange-200' :
                  riskPreview.level === 'moderate' ? 'bg-amber-50 border-amber-200' :
                  'bg-emerald-50 border-emerald-200'
                )}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold uppercase tracking-wide" style={{ color: riskColor(riskPreview.level) }}>
                      {riskLabel(riskPreview.level)} — Score {riskPreview.total}/10
                    </span>
                    {priorLesion?.risk_score && (
                      <span className={clsx(
                        'text-xs font-semibold flex items-center gap-1',
                        riskPreview.total > priorLesion.risk_score.total ? 'text-red-600' :
                        riskPreview.total < priorLesion.risk_score.total ? 'text-emerald-600' :
                        'text-slate-500'
                      )}>
                        {riskPreview.total > priorLesion.risk_score.total && '↑ Worsening'}
                        {riskPreview.total < priorLesion.risk_score.total && '↓ Improving'}
                        {riskPreview.total === priorLesion.risk_score.total && '→ Stable'}
                        <span className="text-slate-400">({priorLesion.risk_score.total}/10)</span>
                      </span>
                    )}
                  </div>
                  <div className="flex gap-2 text-xs">
                    <span className="bg-white px-2 py-0.5 rounded-full border">A:{riskPreview.asymmetry}</span>
                    <span className="bg-white px-2 py-0.5 rounded-full border">B:{riskPreview.border}</span>
                    <span className="bg-white px-2 py-0.5 rounded-full border">C:{riskPreview.color}</span>
                    <span className="bg-white px-2 py-0.5 rounded-full border">D:{riskPreview.diameter}</span>
                    <span className="bg-white px-2 py-0.5 rounded-full border">E:{riskPreview.evolution}</span>
                  </div>
                  <p className="text-xs text-slate-600 mt-2">{riskPreview.recommendation}</p>
                </div>
              </div>
            )}
          </div>
        );

      case 5:
        return (
          <div className="p-5 space-y-5">
            {/* CPT Codes */}
            {isProvider && (
              <CPTCodeTracker
                selectedCodes={cptCodes}
                onChange={setCptCodes}
                lesionContext={{
                  action,
                  biopsy_result: 'na',
                  size_mm: size ?? (sizeCustom ? parseFloat(sizeCustom) : null),
                  body_region: region,
                  photos: photos.map((_, i) => ({ capture_type: i % 2 === 0 ? 'clinical' : 'dermoscopic' })),
                }}
              />
            )}

            {/* Dermoscopy Annotations */}
            <DermoscopyAnnotations
              annotations={dermAnnotations}
              onChange={setDermAnnotations}
            />
          </div>
        );
    }
  };

  // ── Step labels ────────────────────────────────────────────────────────────
  const stepLabels = ['Photos', 'Size & Shape', 'Color', 'Assessment', 'Codes & Features'];

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

        {/* Re-documentation banner */}
        {priorLesion && !existingLesion && (
          <div className="bg-blue-50 border-b border-blue-200 px-5 py-3 flex items-center gap-2">
            <TrendingUp size={16} className="text-blue-600 shrink-0" />
            <div className="text-xs">
              <span className="font-semibold text-blue-900">Re-documenting lesion</span>
              <span className="text-blue-600 ml-1">
                · Last seen {new Date(priorLesion.created_at).toLocaleDateString()}
                {priorLesion.risk_score && (
                  <span className="ml-1">
                    · Prior risk: <span className={clsx('font-semibold', `text-${riskColor(priorLesion.risk_score.level)}-700`)}>{riskLabel(priorLesion.risk_score.level)}</span>
                  </span>
                )}
              </span>
            </div>
          </div>
        )}

        {/* Editing banner */}
        {existingLesion && (
          <div className="bg-amber-50 border-b border-amber-200 px-5 py-3 flex items-center gap-2">
            <Edit size={16} className="text-amber-600 shrink-0" />
            <div className="text-xs">
              <span className="font-semibold text-amber-900">Editing lesion</span>
              <span className="text-amber-600 ml-1">
                · Documented {new Date(existingLesion.created_at).toLocaleDateString()} by {existingLesion.created_by}
              </span>
            </div>
          </div>
        )}

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
