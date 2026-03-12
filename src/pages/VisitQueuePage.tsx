import { useState, useCallback } from 'react';
import { Clock, CheckCircle, AlertCircle, ChevronRight, Lock, Camera, User, FileText, Columns2, ArrowLeft } from 'lucide-react';
import { useAppStore } from '../store/appStore';
import { Visit, Patient, Lesion } from '../types';
import { format, parseISO } from 'date-fns';
import { getLesionColor, getLesionLabel } from '../components/bodymap/BodyMapSVG';
import { BodyMapSVG } from '../components/bodymap/BodyMapSVG';
import { PhotoComparison } from '../components/lesion/PhotoComparison';
import { exportVisitPDF } from '../utils/pdfExport';
import clsx from 'clsx';

interface VisitWithPatient { visit: Visit; patient: Patient }

export function VisitQueuePage() {
  const { patients, setSelectedPatient, setCurrentVisit, setCurrentPage, completeVisit, updateLesion } = useAppStore();
  const [activeVisit, setActiveVisitState] = useState<VisitWithPatient | null>(null);
  const [showComparison, setShowComparison] = useState(false);
  const [comparisonLesion, setComparisonLesion] = useState<Lesion | null>(null);
  const [exportingPDF, setExportingPDF] = useState(false);
  const [signingOff, setSigningOff] = useState(false);
  const [lesionNotes, setLesionNotes] = useState<Record<string, string>>({});

  // Collect pending_review visits
  const pendingVisits: VisitWithPatient[] = [];
  patients.forEach((patient) => {
    (patient.visits ?? []).forEach((visit) => {
      if (visit.status === 'pending_review') {
        pendingVisits.push({ visit, patient });
      }
    });
  });

  const handleSelectVisitWrapped = useCallback((vp: VisitWithPatient) => {
    setActiveVisitState(vp);
    setSelectedPatient(vp.patient);
    setCurrentVisit(vp.visit);
    // Pre-populate notes from existing clinical_notes
    const init: Record<string, string> = {};
    vp.visit.lesions.forEach(l => { if (l.clinical_notes) init[l.lesion_id] = l.clinical_notes; });
    setLesionNotes(init);
  }, [setSelectedPatient, setCurrentVisit]);

  const handleLesionNoteChange = (lesionId: string, value: string) => {
    setLesionNotes((prev) => ({ ...prev, [lesionId]: value }));
  };

  const handleSaveLesionNote = async (lesion: Lesion) => {
    if (!activeVisit) return;
    const updated = { ...lesion, clinical_notes: lesionNotes[lesion.lesion_id] ?? lesion.clinical_notes };
    await updateLesion(activeVisit.visit.visit_id, updated);
  };

  const handleSignOff = async () => {
    if (!activeVisit || signingOff) return;
    setSigningOff(true);
    try {
      // Save any unsaved clinical notes first
      await Promise.all(
        activeVisit.visit.lesions.map((lesion) => {
          const note = lesionNotes[lesion.lesion_id];
          if (note !== undefined && note !== lesion.clinical_notes) {
            return updateLesion(activeVisit.visit.visit_id, { ...lesion, clinical_notes: note });
          }
          return Promise.resolve();
        })
      );
      await completeVisit(activeVisit.visit.visit_id, 'locked', `Reviewed and approved by provider`);
      setActiveVisitState(null);
      setCurrentPage('queue');
    } finally {
      setSigningOff(false);
    }
  };

  const handleExportPDF = async () => {
    if (!activeVisit) return;
    setExportingPDF(true);
    try {
      await exportVisitPDF(activeVisit.patient, activeVisit.visit);
    } finally {
      setExportingPDF(false);
    }
  };

  const handleOpenComparison = (lesion: Lesion) => {
    setComparisonLesion(lesion);
    setShowComparison(true);
  };

  return (
    <>
    <div className="flex flex-col md:flex-row h-full overflow-hidden fade-in">
      {/* Visit Queue List — full width on mobile, fixed sidebar on desktop */}
      <div className={`w-full md:w-80 border-b md:border-b-0 md:border-r border-slate-200 bg-white flex flex-col shrink-0 ${activeVisit ? 'hidden md:flex' : 'flex'}`}>
        <div className="p-4 border-b border-slate-100">
          <h2 className="font-semibold text-slate-900">Visit Queue</h2>
          <p className="text-xs text-slate-500 mt-0.5">{pendingVisits.length} visits pending review</p>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {pendingVisits.map(({ visit, patient }) => {
            const isActive = activeVisit?.visit.visit_id === visit.visit_id;
            const alertLesions = visit.lesions.filter((l) =>
              l.biopsy_result === 'malignant' || l.biopsy_result === 'atypical' || l.action === 'biopsy_scheduled'
            );

            return (
              <button
                key={visit.visit_id}
                onClick={() => handleSelectVisitWrapped({ visit, patient })}
                className={clsx(
                  'w-full text-left p-3 rounded-xl border transition-all',
                  isActive
                    ? 'border-teal-300 bg-teal-50 shadow-sm'
                    : 'border-slate-200 hover:border-teal-200 hover:bg-slate-50'
                )}
              >
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 bg-gradient-to-br from-teal-500 to-blue-600 rounded-full flex items-center justify-center text-white text-xs font-semibold shrink-0">
                    {patient.first_name[0]}{patient.last_name[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm text-slate-900">
                      {patient.last_name}, {patient.first_name}
                    </div>
                    <div className="text-xs text-slate-400 mt-0.5">
                      {format(parseISO(visit.visit_date), 'MMM d')} · MA: {visit.ma_name}
                    </div>
                    <div className="flex items-center gap-2 mt-1.5">
                      <span className="text-xs text-slate-500">{visit.lesions.length} lesions</span>
                      {alertLesions.length > 0 && (
                        <span className="flex items-center gap-1 text-xs font-medium text-red-600">
                          <AlertCircle size={10} />
                          {alertLesions.length} flag{alertLesions.length > 1 ? 's' : ''}
                        </span>
                      )}
                    </div>
                  </div>
                  <ChevronRight size={14} className={isActive ? 'text-teal-500' : 'text-slate-300'} />
                </div>
              </button>
            );
          })}

          {pendingVisits.length === 0 && (
            <div className="text-center py-12">
              <CheckCircle size={32} className="text-emerald-500 mx-auto mb-2" />
              <p className="text-sm font-medium text-slate-600">All caught up!</p>
              <p className="text-xs text-slate-400 mt-1">No visits pending review</p>
            </div>
          )}
        </div>
      </div>

      {/* Visit Detail / Review */}
      <div className={`flex-1 overflow-y-auto ${activeVisit ? 'block' : 'hidden md:block'}`}>
        {activeVisit ? (
          <div className="p-4 md:p-6 max-w-4xl">
            {/* Mobile back button */}
            <button
              onClick={() => setActiveVisitState(null)}
              className="md:hidden flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 mb-4 -ml-1 py-1.5 px-2 rounded-lg hover:bg-slate-100 min-h-[40px]"
            >
              <ArrowLeft size={16} />
              Back to Queue
            </button>

            {/* Visit header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-teal-500 to-blue-600 rounded-full flex items-center justify-center text-white font-semibold">
                    {activeVisit.patient.first_name[0]}{activeVisit.patient.last_name[0]}
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-slate-900">
                      {activeVisit.patient.first_name} {activeVisit.patient.last_name}
                    </h2>
                    <div className="flex items-center gap-2 text-sm text-slate-500">
                      <span>{activeVisit.patient.mrn}</span>
                      <span>·</span>
                      <span>Visit: {format(parseISO(activeVisit.visit.visit_date), 'MMMM d, yyyy')}</span>
                      <span>·</span>
                      <span className="flex items-center gap-1">
                        <User size={12} />
                        MA: {activeVisit.visit.ma_name}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex gap-2 flex-wrap">
                <button
                  onClick={() => setCurrentPage('bodymap')}
                  className="btn-secondary text-sm"
                >
                  View Full Map
                </button>
                <button
                  onClick={handleExportPDF}
                  disabled={exportingPDF}
                  className="btn-secondary text-sm disabled:opacity-60"
                >
                  {exportingPDF ? (
                    <div className="w-3 h-3 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <FileText size={15} />
                  )}
                  {exportingPDF ? 'Generating...' : 'Export PDF'}
                </button>
                <button
                  onClick={handleSignOff}
                  disabled={signingOff}
                  className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white font-medium px-4 py-2 rounded-lg text-sm transition-colors"
                >
                  {signingOff ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Lock size={16} />}
                  {signingOff ? 'Signing...' : 'Sign & Lock Visit'}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
              {/* Body Map preview */}
              <div className="md:col-span-1 card p-4">
                <h3 className="text-sm font-semibold text-slate-700 mb-3">Body Map</h3>
                <div className="bg-slate-50 rounded-lg p-2">
                  <BodyMapSVG
                    view="anterior"
                    lesions={activeVisit.visit.lesions}
                    compact={true}
                  />
                </div>
                <div className="mt-3 flex items-center gap-2 text-xs text-slate-500">
                  <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                  {activeVisit.visit.lesions.length} lesion{activeVisit.visit.lesions.length !== 1 ? 's' : ''} documented
                </div>
              </div>

              {/* Lesion list */}
              <div className="md:col-span-2 space-y-3">
                <h3 className="text-sm font-semibold text-slate-700">
                  Documented Lesions ({activeVisit.visit.lesions.length})
                </h3>

                {activeVisit.visit.lesions.map((lesion, i) => {
                  const color = getLesionColor(lesion);
                  const label = getLesionLabel(lesion);

                  return (
                    <div key={lesion.lesion_id} className="card p-4">
                      <div className="flex items-start gap-3">
                        {/* Lesion number */}
                        <div
                          className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
                          style={{ backgroundColor: color }}
                        >
                          {i + 1}
                        </div>

                        <div className="flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-slate-900 text-sm capitalize">
                              {lesion.body_region.replace(/_/g, ' ')}
                            </span>
                            <span
                              className="text-xs px-2 py-0.5 rounded-full font-medium"
                              style={{ backgroundColor: color + '20', color }}
                            >
                              {label}
                            </span>
                          </div>

                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-3">
                            {[
                              { label: 'Size', value: lesion.size_mm ? `${lesion.size_mm}mm` : '—' },
                              { label: 'Color', value: lesion.color?.replace('_', ' ') || '—' },
                              { label: 'Shape', value: lesion.shape || '—' },
                              { label: 'Border', value: lesion.border.replace('_', ' ') },
                              { label: 'Symmetry', value: lesion.symmetry.replace('_', ' ') },
                              { label: 'Action', value: lesion.action.replace(/_/g, ' ') },
                            ].map((item) => (
                              <div key={item.label} className="bg-slate-50 rounded-lg px-3 py-2">
                                <div className="text-xs text-slate-400 mb-0.5">{item.label}</div>
                                <div className="text-xs font-semibold text-slate-700 capitalize">{item.value}</div>
                              </div>
                            ))}
                          </div>

                          {/* Photos */}
                          {lesion.photos.length > 0 && (
                            <div className="flex gap-2 mt-3">
                              {lesion.photos.map((photo, pi) => (
                                <div key={photo.photo_id} className="w-14 h-14 rounded-lg overflow-hidden bg-slate-200 border border-slate-200 relative">
                                  {photo.url
                                    ? <img src={photo.url} alt={photo.capture_type} className="w-full h-full object-cover" />
                                    : <div className="w-full h-full bg-gradient-to-br from-slate-700 to-slate-900 flex items-center justify-center"><Camera size={16} className="text-slate-400" /></div>
                                  }
                                  <div className="absolute bottom-0 inset-x-0 bg-black/50 text-white text-xs text-center py-0.5">
                                    {photo.capture_type === 'dermoscopic' ? 'Derm.' : 'Clin.'}
                                  </div>
                                </div>
                              ))}
                              <button className="w-14 h-14 rounded-lg border border-dashed border-slate-300 flex items-center justify-center text-xs text-slate-400 hover:border-teal-400 hover:text-teal-600 transition-colors">
                                <Camera size={16} />
                              </button>
                            </div>
                          )}

                          {/* Provider can add clinical notes */}
                          <div className="mt-3">
                            <label className="text-xs text-slate-400 block mb-1">Clinical Assessment (Provider)</label>
                            <textarea
                              className="w-full text-xs border border-slate-200 rounded-lg p-2 text-slate-700 placeholder-slate-300 focus:outline-none focus:ring-1 focus:ring-teal-400 resize-none"
                              rows={2}
                              placeholder="Add clinical notes, differential diagnosis, plan..."
                              value={lesionNotes[lesion.lesion_id] ?? (lesion.clinical_notes || '')}
                              onChange={(e) => handleLesionNoteChange(lesion.lesion_id, e.target.value)}
                              onBlur={() => handleSaveLesionNote(lesion)}
                            />
                          </div>
                          {lesion.photos.length > 0 && (
                            <button
                              onClick={() => handleOpenComparison(lesion)}
                              className="mt-2 flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                            >
                              <Columns2 size={13} />
                              Compare Photos Across Visits
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Sign off — desktop card */}
            <div className="mt-6 mb-4 hidden sm:block card p-4 bg-gradient-to-r from-emerald-50 to-teal-50 border-emerald-200">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h4 className="font-semibold text-slate-900 text-sm">Provider Sign-Off</h4>
                  <p className="text-xs text-slate-500 mt-0.5">
                    By signing, you certify that you have reviewed this visit documentation.
                    This action will lock the record and create an audit log entry.
                  </p>
                </div>
                <button
                  onClick={handleSignOff}
                  disabled={signingOff}
                  className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white font-medium px-5 py-2.5 rounded-xl text-sm transition-colors shadow-sm shrink-0"
                >
                  {signingOff ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <CheckCircle size={16} />}
                  {signingOff ? 'Signing...' : 'Sign & Lock'}
                </button>
              </div>
            </div>

            {/* Mobile spacer so content isn't hidden behind sticky bar */}
            <div className="h-24 sm:hidden" />
          </div>
        ) : (
          <div className="flex items-center justify-center h-full text-center p-12">
            <div>
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Clock size={24} className="text-slate-400" />
              </div>
              <h3 className="font-semibold text-slate-700 mb-2">Select a Visit to Review</h3>
              <p className="text-sm text-slate-400 max-w-xs">
                Choose a pending visit from the queue to review lesion documentation, add clinical notes, and sign off.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>

    {/* Mobile sticky sign-off bar */}
    {activeVisit && (
      <div className="sm:hidden fixed bottom-16 inset-x-0 px-4 pb-2 z-30">
        <button
          onClick={handleSignOff}
          disabled={signingOff}
          className="w-full flex items-center justify-center gap-3 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 disabled:opacity-60 text-white font-bold py-4 rounded-2xl text-base shadow-xl transition-colors"
        >
          {signingOff ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Lock size={18} />}
          {signingOff ? 'Signing...' : 'Sign & Lock Visit'}
        </button>
      </div>
    )}

    {/* Photo comparison modal */}
    {showComparison && comparisonLesion && activeVisit && (
      <PhotoComparison
        lesion={comparisonLesion}
        allVisitLesions={activeVisit.patient.visits
          .flatMap((v) =>
            v.lesions
              .filter((l) => l.body_region === comparisonLesion.body_region)
              .map((l) => ({ visit: v, lesion: l }))
          )
          .slice(0, 6)}
        onClose={() => setShowComparison(false)}
      />
    )}
  </>
  );
}
