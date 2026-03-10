import { useState } from 'react';
import { X, FlaskConical, FileText, AlertCircle, CheckCircle } from 'lucide-react';
import { Lesion, BiopsyResult } from '../../types';
import clsx from 'clsx';

interface BiopsyResultModalProps {
  lesion: Lesion;
  onClose: () => void;
  onSave: (result: BiopsyResult, notes: string) => void;
}

const biopsyResultOptions: { value: BiopsyResult; label: string; color: string; icon: string }[] = [
  { value: 'benign', label: 'Benign', color: 'bg-emerald-50 text-emerald-700 border-emerald-300', icon: '✓' },
  { value: 'atypical', label: 'Atypical', color: 'bg-amber-50 text-amber-700 border-amber-300', icon: '⚠' },
  { value: 'malignant', label: 'Malignant', color: 'bg-red-50 text-red-700 border-red-300', icon: '✖' },
  { value: 'pending', label: 'Pending', color: 'bg-violet-50 text-violet-700 border-violet-300', icon: '⏳' },
  { value: 'na', label: 'Not Applicable', color: 'bg-slate-50 text-slate-600 border-slate-300', icon: '—' },
];

export function BiopsyResultModal({ lesion, onClose, onSave }: BiopsyResultModalProps) {
  const [result, setResult] = useState<BiopsyResult>(lesion.biopsy_result);
  const [pathologyNotes, setPathologyNotes] = useState(lesion.pathology_notes || '');
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => {
      onSave(result, pathologyNotes);
    }, 800);
  };

  if (saved) {
    return (
      <div className="fixed inset-0 bg-black/40 flex items-end md:items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl p-8 w-full md:max-w-md flex flex-col items-center gap-4 fade-in">
          <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center">
            <CheckCircle size={32} className="text-emerald-600" />
          </div>
          <h3 className="text-lg font-semibold text-slate-900">Results Updated</h3>
          <p className="text-sm text-slate-500 text-center">
            Biopsy result has been recorded
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="slide-up fixed inset-0 bg-black/50 flex items-end md:items-center justify-center z-50 p-4">
      <div className="bg-white rounded-t-2xl md:rounded-2xl w-full md:max-w-2xl max-h-[90dvh] flex flex-col">
        
        {/* Header */}
        <div className="bg-white border-b border-slate-100 px-5 pt-5 pb-4 rounded-t-2xl shrink-0">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 mb-0.5">
                <FlaskConical size={16} className="text-violet-600" />
                <span className="text-xs font-semibold text-violet-600 uppercase tracking-wide">
                  Biopsy Results
                </span>
              </div>
              <h3 className="font-bold text-slate-900 text-lg">Update Pathology</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                {lesion.body_region.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())} · {lesion.size_mm}mm
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-slate-100 text-slate-400 min-h-[44px] min-w-[44px] flex items-center justify-center"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Content — scrollable */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          
          {/* Result Selection */}
          <div>
            <label className="label mb-3">Biopsy Result</label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {biopsyResultOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => setResult(option.value)}
                  className={clsx(
                    'flex items-center gap-3 h-14 px-4 rounded-xl border-2 text-sm font-medium transition-all',
                    result === option.value
                      ? option.color + ' shadow-sm scale-[1.02]'
                      : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                  )}
                >
                  <span className="text-xl leading-none">{option.icon}</span>
                  <span className="flex-1 text-left">{option.label}</span>
                  {result === option.value && (
                    <CheckCircle size={16} className="shrink-0" />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Pathology Notes */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <FileText size={14} className="text-slate-500" />
              <label className="label mb-0">Pathology Notes</label>
            </div>
            <textarea
              value={pathologyNotes}
              onChange={(e) => setPathologyNotes(e.target.value)}
              placeholder="Enter pathology report details, diagnosis, recommendations..."
              className="input min-h-[140px] resize-y font-mono text-sm"
              rows={6}
            />
            <p className="text-xs text-slate-400 mt-1.5 flex items-center gap-1">
              <AlertCircle size={10} />
              Include diagnosis, margins, depth, histologic features
            </p>
          </div>

          {/* Current lesion info */}
          <div className="bg-slate-50 rounded-lg p-3 border border-slate-200">
            <div className="text-xs font-semibold text-slate-700 mb-2">Current Documentation</div>
            <div className="space-y-1 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Size:</span>
                <span className="font-medium text-slate-700">{lesion.size_mm || '—'}mm</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Color:</span>
                <span className="font-medium text-slate-700 capitalize">{lesion.color?.replace('_', ' ') || '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Action:</span>
                <span className="font-medium text-slate-700 capitalize">{lesion.action.replace(/_/g, ' ')}</span>
              </div>
              {lesion.clinical_notes && (
                <div className="mt-2 pt-2 border-t border-slate-200">
                  <span className="text-slate-500">Clinical Notes:</span>
                  <p className="text-slate-600 mt-1 leading-relaxed">{lesion.clinical_notes}</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-slate-100 p-4 bg-slate-50 rounded-b-2xl shrink-0">
          <div className="flex gap-2">
            <button onClick={onClose} className="btn-secondary justify-center" style={{ minWidth: '100px' }}>
              Cancel
            </button>
            <button onClick={handleSave} className="btn-primary flex-1 justify-center">
              <CheckCircle size={16} />
              Save Results
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
