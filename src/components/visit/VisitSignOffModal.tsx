import { useState } from 'react';
import { X, CheckCircle, FileCheck, AlertTriangle, Clock } from 'lucide-react';
import { Visit, VisitStatus } from '../../types';
import clsx from 'clsx';

interface VisitSignOffModalProps {
  visit: Visit;
  patientName: string;
  onClose: () => void;
  onSignOff: (status: VisitStatus, attestation: string) => void;
}

const statusOptions: { value: VisitStatus; label: string; description: string; color: string; icon: JSX.Element }[] = [
  { 
    value: 'in_progress', 
    label: 'In Progress', 
    description: 'Continue documenting lesions',
    color: 'bg-blue-50 text-blue-700 border-blue-300', 
    icon: <Clock size={16} />
  },
  { 
    value: 'pending_review', 
    label: 'Pending Review', 
    description: 'Ready for provider attestation',
    color: 'bg-amber-50 text-amber-700 border-amber-300', 
    icon: <AlertTriangle size={16} />
  },
  { 
    value: 'signed', 
    label: 'Signed & Complete', 
    description: 'Provider has reviewed and signed',
    color: 'bg-emerald-50 text-emerald-700 border-emerald-300', 
    icon: <CheckCircle size={16} />
  },
  { 
    value: 'locked', 
    label: 'Locked & Finalized', 
    description: 'No further edits allowed',
    color: 'bg-slate-50 text-slate-700 border-slate-400', 
    icon: <FileCheck size={16} />
  },
];

export function VisitSignOffModal({ visit, patientName, onClose, onSignOff }: VisitSignOffModalProps) {
  const [selectedStatus, setSelectedStatus] = useState<VisitStatus>(visit.status);
  const [attestation, setAttestation] = useState('');
  const [saved, setSaved] = useState(false);

  const requiresAttestation = selectedStatus === 'signed' || selectedStatus === 'locked';
  const canSave = !requiresAttestation || attestation.trim().length > 0;

  const handleSignOff = () => {
    if (!canSave) return;
    setSaved(true);
    setTimeout(() => {
      onSignOff(selectedStatus, attestation.trim());
    }, 800);
  };

  if (saved) {
    return (
      <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl p-8 w-full md:max-w-md flex flex-col items-center gap-4 fade-in">
          <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center">
            <CheckCircle size={32} className="text-emerald-600" />
          </div>
          <h3 className="text-lg font-semibold text-slate-900">Visit Updated</h3>
          <p className="text-sm text-slate-500 text-center">
            Status changed to <span className="font-semibold">{statusOptions.find(o => o.value === selectedStatus)?.label}</span>
          </p>
        </div>
      </div>
   );
  }

  return (
    <div className="slide-up fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full md:max-w-2xl max-h-[90dvh] flex flex-col">
        
        {/* Header */}
        <div className="bg-white border-b border-slate-100 px-5 pt-5 pb-4 rounded-t-2xl shrink-0">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 mb-0.5">
                <FileCheck size={16} className="text-teal-600" />
                <span className="text-xs font-semibold text-teal-600 uppercase tracking-wide">
                  Visit Sign-Off
                </span>
              </div>
              <h3 className="font-bold text-slate-900 text-lg">Complete Documentation</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                {patientName} · {visit.visit_date} · {visit.lesions.length} lesion{visit.lesions.length !== 1 ? 's' : ''}
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

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          
          {/* Visit Summary */}
          <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
            <div className="text-xs font-semibold text-slate-700 mb-3">Visit Summary</div>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-slate-500">Lesions Documented:</span>
                <div className="font-semibold text-slate-900 mt-0.5">{visit.lesions.length}</div>
              </div>
              <div>
                <span className="text-slate-500">Photos Captured:</span>
                <div className="font-semibold text-slate-900 mt-0.5">
                  {visit.lesions.reduce((acc, l) => acc + l.photos.length, 0)}
                </div>
              </div>
              <div>
                <span className="text-slate-500">Biopsies Scheduled:</span>
                <div className="font-semibold text-slate-900 mt-0.5">
                  {visit.lesions.filter(l => l.action === 'biopsy_scheduled' || l.action === 'biopsy_performed').length}
                </div>
              </div>
              <div>
                <span className="text-slate-500">Documented By:</span>
                <div className="font-semibold text-slate-900 mt-0.5">{visit.ma_name}</div>
              </div>
            </div>
          </div>

          {/* Status Selection */}
          <div>
            <label className="label mb-3">Visit Status</label>
            <div className="space-y-2">
              {statusOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => setSelectedStatus(option.value)}
                  className={clsx(
                    'w-full flex items-start gap-3 p-3 rounded-xl border-2 transition-all text-left',
                    selectedStatus === option.value
                      ? option.color + ' shadow-sm'
                      : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                  )}
                >
                  <div className="shrink-0 mt-0.5">
                    {option.icon}
                  </div>
                  <div className="flex-1">
                    <div className="font-semibold text-sm">{option.label}</div>
                    <div className="text-xs opacity-75 mt-0.5">{option.description}</div>
                  </div>
                  {selectedStatus === option.value && (
                    <CheckCircle size={16} className="shrink-0 mt-0.5" />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Provider Notes — always visible for providers */}
          <div>
            <label className="label mb-2">
              Provider Notes
              {requiresAttestation && <span className="text-red-500 ml-1">*</span>}
            </label>
            <textarea
              value={attestation}
              onChange={(e) => setAttestation(e.target.value)}
              placeholder="Clinical assessment, plan, and provider attestation..."
              className="input min-h-[100px] resize-y text-sm"
              rows={4}
            />
            {requiresAttestation && (
              <p className="text-xs text-slate-400 mt-1.5 flex items-center gap-1">
                <AlertTriangle size={10} />
                Required for signed/locked visits
              </p>
            )}
          </div>

          {/* Warning */}
          {selectedStatus === 'locked' && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-start gap-2">
              <AlertTriangle size={16} className="text-amber-600 shrink-0 mt-0.5" />
              <div className="text-xs text-amber-900">
                <div className="font-semibold mb-1">Locking this visit will:</div>
                <ul className="list-disc list-inside space-y-0.5 opacity-90">
                  <li>Prevent any further edits to lesion documentation</li>
                  <li>Freeze all photos and clinical notes</li>
                  <li>Trigger final billing and reporting workflows</li>
                </ul>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-slate-100 p-4 bg-slate-50 rounded-b-2xl shrink-0">
          <div className="flex gap-2">
            <button onClick={onClose} className="btn-secondary justify-center" style={{ minWidth: '100px' }}>
              Cancel
            </button>
            <button 
              onClick={handleSignOff} 
              disabled={!canSave}
              className={clsx(
                "btn-primary flex-1 justify-center",
                !canSave && "opacity-50 cursor-not-allowed"
              )}
            >
              <CheckCircle size={16} />
              Update Status
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
