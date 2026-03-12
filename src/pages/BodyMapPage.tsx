import { useState } from 'react';
import {
  ArrowLeft, FileText, CheckCircle,
  Camera, ChevronRight, Info, Columns2, List, AlertTriangle, Trash2, Edit, X, FlaskConical, FileCheck, XCircle
} from 'lucide-react';
import { useAppStore } from '../store/appStore';
import { BodyMapView } from '../components/bodymap/BodyMapView';
import { LesionDocForm } from '../components/lesion/LesionDocForm';
import { DocSpeedOverlay } from '../components/lesion/DocSpeedOverlay';
import { PhotoComparison } from '../components/lesion/PhotoComparison';
import { BiopsyResultModal } from '../components/lesion/BiopsyResultModal';
import { VisitSignOffModal } from '../components/visit/VisitSignOffModal';
import { Lesion, Visit, BiopsyResult, VisitStatus } from '../types';
import { format, parseISO, differenceInYears } from 'date-fns';
import { getLesionColor, getLesionLabel } from '../components/bodymap/BodyMapSVG';
import { exportVisitPDF, resolvePhotoDataUris } from '../utils/pdfExport';
import { auditLogger } from '../services/auditLogger';
import { riskColor } from '../utils/riskScoring';
import clsx from 'clsx';

export function BodyMapPage() {
  const {
    selectedPatient, currentVisit, currentUser,
    setCurrentPage, addLesionToVisit, startNewVisit,
    setCurrentVisit, startDocTimer, getDocTime,
    deleteLesion, updateLesion, completeVisit, deleteVisit,
  } = useAppStore();

  const [pendingLesion, setPendingLesion] = useState<{ x: number; y: number; region: string } | null>(null);
  const [redocumentLesion, setRedocumentLesion] = useState<Lesion | null>(null);
  const [selectedLesion, setSelectedLesion] = useState<Lesion | null>(null);
  const [editingLesion, setEditingLesion] = useState<Lesion | null>(null);
  const [deletingLesion, setDeletingLesion] = useState<Lesion | null>(null);
  const [biopsyUpdateLesion, setBiopsyUpdateLesion] = useState<Lesion | null>(null);
  const [showSignOffModal, setShowSignOffModal] = useState(false);
  const [showCancelVisitConfirm, setShowCancelVisitConfirm] = useState(false);
  const [visitComplete, setVisitComplete] = useState(false);
  const [showSpeedOverlay, setShowSpeedOverlay] = useState(false);
  const [lastDocTime, setLastDocTime] = useState(0);
  const [showComparison, setShowComparison] = useState(false);
  const [comparisonLesion, setComparisonLesion] = useState<Lesion | null>(null);
  const [exportingPDF, setExportingPDF] = useState(false);
  // Mobile: toggle between map view and lesion list
  const [mobileTab, setMobileTab] = useState<'map' | 'lesions'>('map');

  if (!selectedPatient) {
    return (
      <div className="p-6 text-center">
        <p className="text-slate-500">No patient selected.</p>
        <button onClick={() => setCurrentPage('search')} className="btn-primary mt-4">
          Select Patient
        </button>
      </div>
    );
  }

  const age = differenceInYears(new Date(), parseISO(selectedPatient.date_of_birth));
  const allLesions = selectedPatient.visits.flatMap((v) => v.lesions);
  const currentLesions = currentVisit?.lesions || [];
  const isMA = currentUser?.role === 'ma';
  const isProvider = currentUser?.role === 'provider';

  const activeVisit = currentVisit || selectedPatient.visits.find((v) => v.status === 'in_progress');

  const handlePlaceLesion = async (x: number, y: number, region: string) => {
    if (!activeVisit) {
      const visit = await startNewVisit(selectedPatient);
      setCurrentVisit(visit);
    }
    startDocTimer();
    setPendingLesion({ x, y, region });
  };

  const handleRedocumentLesion = async (lesion: Lesion) => {
    if (!activeVisit) {
      const visit = await startNewVisit(selectedPatient);
      setCurrentVisit(visit);
    }
    startDocTimer();
    setRedocumentLesion(lesion);
    setSelectedLesion(null);
  };

  const handleSaveLesion = (lesion: Lesion) => {
    if (activeVisit) {
      addLesionToVisit(activeVisit.visit_id, lesion);
    }
    const elapsed = getDocTime();
    setLastDocTime(elapsed);
    setPendingLesion(null);
    setRedocumentLesion(null);
    setShowSpeedOverlay(true);
  };

  const handleDeleteLesion = () => {
    if (!deletingLesion || !activeVisit) return;
    deleteLesion(activeVisit.visit_id, deletingLesion.lesion_id);
    setDeletingLesion(null);
    setSelectedLesion(null);
  };

  const handleUpdateBiopsyResult = (result: BiopsyResult, pathologyNotes: string) => {
    if (!biopsyUpdateLesion) return;
    
    const visitId = selectedPatient.visits.find(v => 
      v.lesions.some(l => l.lesion_id === biopsyUpdateLesion.lesion_id)
    )?.visit_id;
    
    if (visitId) {
      const updatedLesion = {
        ...biopsyUpdateLesion,
        biopsy_result: result,
        pathology_notes: pathologyNotes,
      };
      updateLesion(visitId, updatedLesion);
    }
    
    setBiopsyUpdateLesion(null);
    setSelectedLesion(null);
  };

  const handleVisitSignOff = (status: VisitStatus, attestation: string) => {
    if (!activeVisit) return;
    completeVisit(activeVisit.visit_id, status, attestation || undefined);
    setShowSignOffModal(false);
  };

  const handleCancelVisit = () => {
    if (!activeVisit) return;
    deleteVisit(activeVisit.visit_id);
    setCurrentVisit(null);
    setShowCancelVisitConfirm(false);
    setCurrentPage('schedule');
  };

  const handleExportPDF = async () => {
    if (!activeVisit && !selectedPatient.visits.length) return;
    const visit = activeVisit || selectedPatient.visits.at(-1)!;
    setExportingPDF(true);
    try {
      const token = sessionStorage.getItem('auth_token') ?? '';
      const photoDataMap = await resolvePhotoDataUris(visit, token);
      await exportVisitPDF(selectedPatient, visit, undefined, photoDataMap);
      auditLogger.log(
        'export',
        'visit',
        visit.visit_id,
        `Clinical PDF exported for patient ${selectedPatient.patient_id} — ${visit.lesions.length} lesion(s)`,
      );
    } finally {
      setExportingPDF(false);
    }
  };

  const handleOpenComparison = (lesion: Lesion) => {
    setComparisonLesion(lesion);
    setShowComparison(true);
  };

  const getVisitLesionsForComparison = (lesion: Lesion) => {
    const result: { visit: Visit; lesion: Lesion }[] = [];
    selectedPatient.visits.forEach((visit) => {
      const match = visit.lesions.find((l) =>
        l.body_region === lesion.body_region || l.lesion_id === lesion.lesion_id
      );
      if (match) result.push({ visit, lesion: match });
    });
    return result.length > 0 ? result : [{ visit: selectedPatient.visits[0], lesion }];
  };

  if (visitComplete) {
    const totalPhotos = currentLesions.reduce((acc, l) => acc + l.photos.length, 0);
    const flagged = currentLesions.filter((l) =>
      l.action === 'biopsy_scheduled' || l.action === 'biopsy_performed'
    ).length;

    return (
      <div className="p-4 md:p-6 max-w-2xl mx-auto fade-in">
        <div className="card p-6 md:p-8 text-center">
          <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle size={32} className="text-emerald-600" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">Visit Complete</h2>
          <p className="text-slate-500 text-sm mb-6">
            {selectedPatient.first_name} {selectedPatient.last_name} — {format(new Date(), 'MMMM d, yyyy')}
          </p>

          <div className="grid grid-cols-3 gap-3 mb-6">
            <div className="bg-slate-50 rounded-xl p-3 md:p-4">
              <div className="text-xl md:text-2xl font-bold text-slate-900">{currentLesions.length}</div>
              <div className="text-xs text-slate-500 mt-1">Lesions</div>
            </div>
            <div className="bg-slate-50 rounded-xl p-3 md:p-4">
              <div className="text-xl md:text-2xl font-bold text-slate-900">{totalPhotos}</div>
              <div className="text-xs text-slate-500 mt-1">Photos</div>
            </div>
            <div className="bg-slate-50 rounded-xl p-3 md:p-4">
              <div className="text-xl md:text-2xl font-bold text-amber-600">{flagged}</div>
              <div className="text-xs text-slate-500 mt-1">Flagged</div>
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 mb-6 text-sm text-blue-700">
            Visit sent to <strong>{activeVisit?.provider_name || 'provider'}</strong> for review.
          </div>

          <div className="flex gap-3">
            <button onClick={() => setCurrentPage('schedule')} className="btn-secondary flex-1 justify-center">
              <ArrowLeft size={16} />
              Schedule
            </button>
            <button
              onClick={handleExportPDF}
              disabled={exportingPDF}
              className="btn-primary flex-1 justify-center disabled:opacity-60"
            >
              {exportingPDF ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <FileText size={16} />
              )}
              {exportingPDF ? 'Generating...' : 'PDF'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="bg-white border-b border-slate-100 px-4 py-3 flex items-center gap-3 shrink-0">
        <button
          onClick={() => setCurrentPage('schedule')}
          className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition-colors min-h-[40px] min-w-[40px] flex items-center justify-center"
        >
          <ArrowLeft size={18} />
        </button>

        <div className="flex items-center gap-2.5 flex-1 min-w-0">
          <div className="w-9 h-9 bg-gradient-to-br from-teal-500 to-blue-600 rounded-full flex items-center justify-center text-white font-semibold text-sm shrink-0">
            {selectedPatient.first_name[0]}{selectedPatient.last_name[0]}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-slate-900 text-sm truncate">
                {selectedPatient.first_name} {selectedPatient.last_name}
              </span>
              <span className="text-xs text-slate-400 shrink-0">{selectedPatient.mrn}</span>
            </div>
            {/* Full info — desktop only */}
            <div className="hidden md:flex items-center gap-3 text-xs text-slate-500">
              <span>DOB: {format(parseISO(selectedPatient.date_of_birth), 'MM/dd/yyyy')} · {age}y</span>
              <span>Fitzpatrick {selectedPatient.skin_type}</span>
              <span className="capitalize">{selectedPatient.gender}</span>
              <span>{allLesions.length} lesions tracked</span>
            </div>
            {/* Compact info — mobile */}
            <div className="flex md:hidden items-center gap-2 text-xs text-slate-400">
              <span>{age}y · FP{selectedPatient.skin_type}</span>
              <span>·</span>
              <span>{allLesions.length} lesions</span>
            </div>
          </div>
        </div>

        {/* Visit status — desktop */}
        {activeVisit && (
          <div className="hidden md:flex items-center gap-2">
            <div className="flex items-center gap-1.5 bg-teal-50 border border-teal-200 text-teal-700 text-xs px-3 py-1.5 rounded-lg font-medium">
              <div className="w-1.5 h-1.5 bg-teal-500 rounded-full animate-pulse" />
              Visit in Progress
            </div>
            <span className="text-xs text-slate-400">{currentLesions.length} lesion{currentLesions.length !== 1 ? 's' : ''}</span>
          </div>
        )}

        <div className="flex gap-2 shrink-0">
          <button
            onClick={handleExportPDF}
            disabled={exportingPDF}
            className="hidden sm:flex btn-secondary text-xs py-1.5 disabled:opacity-60"
          >
            {exportingPDF ? (
              <div className="w-3 h-3 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
            ) : (
              <FileText size={14} />
            )}
            <span className="hidden md:inline">{exportingPDF ? 'Generating...' : 'Export PDF'}</span>
          </button>
          {activeVisit && isProvider && (
            <button
              onClick={() => setShowSignOffModal(true)}
              className={clsx(
                "hidden sm:flex text-xs py-1.5 items-center gap-1.5 px-3 rounded-lg font-medium transition-colors",
                activeVisit.status === 'signed' || activeVisit.status === 'locked'
                  ? "bg-emerald-50 text-emerald-700 border border-emerald-300 hover:bg-emerald-100"
                  : activeVisit.status === 'pending_review'
                  ? "bg-amber-50 text-amber-700 border border-amber-300 hover:bg-amber-100"
                  : "bg-blue-50 text-blue-700 border border-blue-300 hover:bg-blue-100"
              )}
            >
              <FileCheck size={14} />
              <span className="hidden md:inline capitalize">{activeVisit.status.replace('_', ' ')}</span>
            </button>
          )}
          {isMA && activeVisit && (
            <button
              onClick={() => setVisitComplete(true)}
              disabled={currentLesions.length === 0}
              className="btn-primary text-xs py-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <CheckCircle size={14} />
              <span className="hidden sm:inline">Complete Visit</span>
              <span className="sm:hidden">Done</span>
            </button>
          )}
          {activeVisit && activeVisit.status === 'in_progress' && (
            <button
              onClick={() => setShowCancelVisitConfirm(true)}
              className="text-xs py-1.5 px-3 text-red-600 hover:bg-red-50 rounded-lg font-medium transition-colors border border-red-200 hover:border-red-300"
              title="Cancel this visit"
            >
              <XCircle size={14} className="sm:hidden" />
              <span className="hidden sm:inline">Cancel Visit</span>
            </button>
          )}
        </div>
      </div>

      {/* Mobile tab bar */}
      <div className="md:hidden flex border-b border-slate-100 bg-white shrink-0">
        <button
          onClick={() => setMobileTab('map')}
          className={clsx(
            'flex-1 py-2.5 text-sm font-medium transition-colors flex items-center justify-center gap-2',
            mobileTab === 'map'
              ? 'text-teal-600 border-b-2 border-teal-500'
              : 'text-slate-400'
          )}
        >
          Body Map
        </button>
        <button
          onClick={() => setMobileTab('lesions')}
          className={clsx(
            'flex-1 py-2.5 text-sm font-medium transition-colors flex items-center justify-center gap-2',
            mobileTab === 'lesions'
              ? 'text-teal-600 border-b-2 border-teal-500'
              : 'text-slate-400'
          )}
        >
          <List size={15} />
          Lesions
          {allLesions.length > 0 && (
            <span className="bg-slate-200 text-slate-600 text-xs font-bold px-1.5 py-0.5 rounded-full">
              {allLesions.length}
            </span>
          )}
        </button>
      </div>

      {/* Main content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Body Map — full width on mobile when map tab active */}
        <div className={clsx(
          'flex-1 overflow-y-auto min-w-0',
          'md:block',
          mobileTab === 'map' ? 'block' : 'hidden md:block'
        )}>
          <div className="p-3 md:p-6">
            <BodyMapView
              visits={selectedPatient.visits}
              currentVisit={activeVisit}
              onPlaceLesion={handlePlaceLesion}
              onLesionClick={setSelectedLesion}
              interactive={!!activeVisit}
              showLegend={true}
            />
          </div>
        </div>

        {/* Right Panel — desktop always visible, mobile only on lesions tab */}
        <div className={clsx(
          'border-l border-slate-100 bg-white flex flex-col overflow-hidden',
          'w-full md:w-80 md:shrink-0',
          mobileTab === 'lesions' ? 'flex' : 'hidden md:flex'
        )}>
          <div className="px-4 py-3 border-b border-slate-100">
            <h3 className="text-sm font-semibold text-slate-900">Lesion History</h3>
            <p className="text-xs text-slate-400 mt-0.5">{allLesions.length} total across {selectedPatient.visits.length} visits</p>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-1">
            {selectedPatient.visits.map((visit) => (
              <div key={visit.visit_id}>
                <div className="flex items-center gap-2 px-2 py-1.5 mb-1">
                  <div className="w-px h-3 bg-slate-200" />
                  <span className="text-xs font-medium text-slate-500">
                    {format(parseISO(visit.visit_date), 'MMM d, yyyy')}
                  </span>
                  <span className={clsx(
                    'text-xs px-1.5 py-0.5 rounded-full font-medium',
                    visit.status === 'locked' ? 'bg-emerald-50 text-emerald-600' :
                    visit.status === 'pending_review' ? 'bg-amber-50 text-amber-600' :
                    'bg-blue-50 text-blue-600'
                  )}>
                    {visit.status === 'locked' ? 'Locked' : visit.status === 'pending_review' ? 'Pending' : 'Active'}
                  </span>
                </div>
                {visit.provider_attestation && (
                  <div className="mx-2 mb-2 px-2.5 py-2 bg-blue-50 border border-blue-100 rounded-lg">
                    <div className="text-[10px] font-semibold text-blue-500 uppercase tracking-wide mb-0.5">Provider Notes</div>
                    <p className="text-xs text-slate-700 leading-relaxed line-clamp-3">{visit.provider_attestation}</p>
                  </div>
                )}

                {visit.lesions.length === 0 ? (
                  <div className="px-3 py-2 text-xs text-slate-400 italic">No lesions documented</div>
                ) : (
                  visit.lesions.map((lesion) => {
                    const color = getLesionColor(lesion);
                    const label = getLesionLabel(lesion);
                    const isSelected = selectedLesion?.lesion_id === lesion.lesion_id;

                    return (
                      <button
                        key={lesion.lesion_id}
                        onClick={() => setSelectedLesion(isSelected ? null : lesion)}
                        className={clsx(
                          'w-full text-left px-3 py-3 rounded-lg transition-all min-h-[48px]',
                          isSelected ? 'bg-teal-50 border border-teal-200' : 'hover:bg-slate-50 border border-transparent'
                        )}
                      >
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full shrink-0 border-2 border-white shadow-sm" style={{ backgroundColor: color }} />
                          <span className="text-sm font-medium text-slate-700 truncate flex-1">
                            {lesion.body_region.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
                          </span>
                          <span className="text-xs" style={{ color }}>{label}</span>
                        </div>
                        <div className="flex items-center gap-3 mt-1 pl-5">
                          {lesion.size_mm && <span className="text-xs text-slate-400">{lesion.size_mm}mm</span>}
                          {lesion.color && <span className="text-xs text-slate-400 capitalize">{lesion.color.replace('_', ' ')}</span>}
                          <div className="flex items-center gap-1 text-xs text-slate-400">
                            <Camera size={10} />
                            {lesion.photos.length}
                          </div>
                          {lesion.risk_score && (
                            <span
                              className="inline-flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                              style={{
                                color: riskColor(lesion.risk_score.level),
                                backgroundColor: riskColor(lesion.risk_score.level) + '18',
                              }}
                            >
                              <AlertTriangle size={8} />
                              {lesion.risk_score.total}/10
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            ))}
          </div>

          {/* Selected lesion detail */}
          {selectedLesion && (
            <div className="border-t border-slate-200 p-4 bg-slate-50">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-xs font-semibold text-slate-700 uppercase tracking-wide">Lesion Detail</h4>
                <button
                  onClick={() => setSelectedLesion(null)}
                  className="text-slate-400 hover:text-slate-600 text-xs w-7 h-7 flex items-center justify-center rounded-lg hover:bg-slate-200"
                >
                  ✕
                </button>
              </div>
              <div className="space-y-2">
                {[
                  { label: 'Region', value: selectedLesion.body_region.replace(/_/g, ' ') },
                  { label: 'Size', value: selectedLesion.size_mm ? `${selectedLesion.size_mm}mm` : 'Not assessed' },
                  { label: 'Color', value: selectedLesion.color?.replace('_', ' ') || 'Not assessed' },
                  { label: 'Border', value: selectedLesion.border.replace('_', ' ') },
                  { label: 'Symmetry', value: selectedLesion.symmetry.replace('_', ' ') },
                  { label: 'Action', value: selectedLesion.action.replace(/_/g, ' ') },
                  { label: 'Result', value: selectedLesion.biopsy_result.replace('_', ' ') },
                ].map((item) => (
                  <div key={item.label} className="flex justify-between text-xs">
                    <span className="text-slate-500 capitalize">{item.label}</span>
                    <span className="font-medium text-slate-700 capitalize">{item.value}</span>
                  </div>
                ))}
                {/* Risk score badge */}
                {selectedLesion.risk_score && (
                  <div className="flex justify-between text-xs items-center">
                    <span className="text-slate-500">Risk Score</span>
                    <span
                      className="inline-flex items-center gap-1 font-bold px-2 py-0.5 rounded-full text-xs"
                      style={{
                        color: riskColor(selectedLesion.risk_score.level),
                        backgroundColor: riskColor(selectedLesion.risk_score.level) + '18',
                      }}
                    >
                      <AlertTriangle size={10} />
                      {selectedLesion.risk_score.total}/10 — {selectedLesion.risk_score.level.replace('_', ' ')}
                    </span>
                  </div>
                )}
                {/* CPT codes */}
                {selectedLesion.cpt_codes && selectedLesion.cpt_codes.length > 0 && (
                  <div className="flex justify-between text-xs items-center">
                    <span className="text-slate-500">CPT Codes</span>
                    <span className="text-xs font-mono text-emerald-600 font-medium">{selectedLesion.cpt_codes.join(', ')}</span>
                  </div>
                )}
                {selectedLesion.clinical_notes && (
                  <div className="mt-2 p-2 bg-white rounded-lg border border-slate-200">
                    <div className="text-xs text-slate-400 mb-1 flex items-center gap-1">
                      <Info size={10} />
                      Clinical Notes
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed">{selectedLesion.clinical_notes}</p>
                  </div>
                )}
                {/* Update Biopsy Result button */}
                {(selectedLesion.action === 'biopsy_scheduled' || 
                  selectedLesion.action === 'biopsy_performed' || 
                  selectedLesion.biopsy_result !== 'na') && (
                  <button
                    onClick={() => setBiopsyUpdateLesion(selectedLesion)}
                    className="w-full mt-2 flex items-center justify-center gap-1.5 py-2.5 bg-violet-600 hover:bg-violet-700 rounded-lg text-xs font-medium text-white transition-colors min-h-[40px]"
                  >
                    <FlaskConical size={12} />
                    Update Biopsy Result
                    <ChevronRight size={12} />
                  </button>
                )}
                {/* Re-document button - only show if there's an active visit and this lesion is from a prior visit */}
                {activeVisit && !currentLesions.some(l => l.lesion_id === selectedLesion.lesion_id) && (
                  <button
                    onClick={() => handleRedocumentLesion(selectedLesion)}
                    className="w-full mt-2 flex items-center justify-center gap-1.5 py-2.5 bg-teal-600 hover:bg-teal-700 rounded-lg text-xs font-medium text-white transition-colors min-h-[40px]"
                  >
                    <Camera size={12} />
                    Re-document This Visit
                    <ChevronRight size={12} />
                  </button>
                )}
                {/* Edit and Delete buttons - only for current visit lesions */}
                {activeVisit && currentLesions.some(l => l.lesion_id === selectedLesion.lesion_id) && (
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    <button
                      onClick={() => setEditingLesion(selectedLesion)}
                      className="flex items-center justify-center gap-1.5 py-2.5 bg-blue-600 hover:bg-blue-700 rounded-lg text-xs font-medium text-white transition-colors min-h-[40px]"
                    >
                      <Edit size={12} />
                      Edit
                    </button>
                    <button
                      onClick={() => setDeletingLesion(selectedLesion)}
                      className="flex items-center justify-center gap-1.5 py-2.5 bg-red-600 hover:bg-red-700 rounded-lg text-xs font-medium text-white transition-colors min-h-[40px]"
                    >
                      <Trash2 size={12} />
                      Delete
                    </button>
                  </div>
                )}
                <button
                  onClick={() => handleOpenComparison(selectedLesion)}
                  className="w-full mt-2 flex items-center justify-center gap-1.5 py-2.5 bg-slate-800 hover:bg-slate-700 rounded-lg text-xs font-medium text-white transition-colors min-h-[40px]"
                >
                  <Columns2 size={12} />
                  Compare Photos
                  <ChevronRight size={12} />
                </button>
                {selectedLesion.photos.length > 0 && (
                  <button
                    onClick={handleExportPDF}
                    className="w-full flex items-center justify-center gap-1.5 py-2.5 bg-teal-50 hover:bg-teal-100 rounded-lg text-xs font-medium text-teal-700 transition-colors min-h-[40px]"
                  >
                    <FileText size={12} />
                    Export Visit PDF
                    <ChevronRight size={12} />
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Lesion documentation form - new lesion */}
      {pendingLesion && activeVisit && !redocumentLesion && (
        <LesionDocForm
          pendingCoords={pendingLesion}
          region={pendingLesion.region}
          visitId={activeVisit.visit_id}
          onClose={() => setPendingLesion(null)}
          onSave={handleSaveLesion}
        />
      )}

      {/* Lesion documentation form - re-document existing */}
      {redocumentLesion && activeVisit && (
        <LesionDocForm
          pendingCoords={{ x: redocumentLesion.body_location_x, y: redocumentLesion.body_location_y }}
          region={redocumentLesion.body_region}
          visitId={activeVisit.visit_id}
          onClose={() => setRedocumentLesion(null)}
          onSave={handleSaveLesion}
          priorLesion={redocumentLesion}
        />
      )}

      {/* Documentation speed overlay */}
      {showSpeedOverlay && (
        <DocSpeedOverlay
          elapsedSeconds={lastDocTime}
          lesionCount={currentLesions.length}
          photoCount={currentLesions.reduce((acc, l) => acc + l.photos.length, 0)}
          onDismiss={() => setShowSpeedOverlay(false)}
          onAddAnother={() => setShowSpeedOverlay(false)}
          onCompleteVisit={() => { setShowSpeedOverlay(false); setVisitComplete(true); }}
        />
      )}

      {/* Photo comparison tool */}
      {showComparison && comparisonLesion && (
        <PhotoComparison
          lesion={comparisonLesion}
          allVisitLesions={getVisitLesionsForComparison(comparisonLesion)}
          onClose={() => setShowComparison(false)}
        />
      )}

      {/* Delete confirmation modal */}
      {deletingLesion && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center shrink-0">
                <Trash2 size={24} className="text-red-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-slate-900">Delete Lesion?</h3>
                <p className="text-sm text-slate-500">This action cannot be undone</p>
              </div>
            </div>
            <div className="bg-slate-50 rounded-lg p-3 mb-4 text-sm">
              <div className="flex justify-between mb-1">
                <span className="text-slate-500">Region:</span>
                <span className="font-medium text-slate-700 capitalize">{deletingLesion.body_region.replace(/_/g, ' ')}</span>
              </div>
              {deletingLesion.size_mm && (
                <div className="flex justify-between mb-1">
                  <span className="text-slate-500">Size:</span>
                  <span className="font-medium text-slate-700">{deletingLesion.size_mm}mm</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-slate-500">Photos:</span>
                <span className="font-medium text-slate-700">{deletingLesion.photos.length}</span>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setDeletingLesion(null)}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteLesion}
                className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors"
              >
                Delete Lesion
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit lesion form */}
      {editingLesion && activeVisit && (
        <LesionDocForm
          pendingCoords={{ x: editingLesion.body_location_x, y: editingLesion.body_location_y }}
          region={editingLesion.body_region}
          visitId={activeVisit.visit_id}
          onClose={() => setEditingLesion(null)}
          onSave={(updatedLesion) => {
            updateLesion(activeVisit.visit_id, { ...updatedLesion, lesion_id: editingLesion.lesion_id });
            setEditingLesion(null);
            setSelectedLesion(null);
          }}
          existingLesion={editingLesion}
        />
      )}

      {/* Biopsy result update modal */}
      {biopsyUpdateLesion && (
        <BiopsyResultModal
          lesion={biopsyUpdateLesion}
          onClose={() => setBiopsyUpdateLesion(null)}
          onSave={handleUpdateBiopsyResult}
        />
      )}

      {/* Visit sign-off modal */}
      {showSignOffModal && activeVisit && (
        <VisitSignOffModal
          visit={activeVisit}
          patientName={`${selectedPatient.first_name} ${selectedPatient.last_name}`}
          onClose={() => setShowSignOffModal(false)}
          onSignOff={handleVisitSignOff}
        />
      )}

      {/* Cancel visit confirmation */}
      {showCancelVisitConfirm && activeVisit && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center shrink-0">
                <XCircle size={24} className="text-red-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-slate-900">Cancel Visit?</h3>
                <p className="text-sm text-slate-500">This will delete the entire visit</p>
              </div>
            </div>
            
            {currentLesions.length > 0 ? (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
                <div className="flex items-start gap-2">
                  <AlertTriangle size={16} className="text-red-600 shrink-0 mt-0.5" />
                  <div className="text-sm text-red-900">
                    <div className="font-semibold mb-1">Warning: Data will be lost</div>
                    <div className="text-xs">
                      This visit has <span className="font-bold">{currentLesions.length} documented lesion{currentLesions.length !== 1 ? 's' : ''}</span> with{' '}
                      <span className="font-bold">{currentLesions.reduce((acc, l) => acc + l.photos.length, 0)} photo{currentLesions.reduce((acc, l) => acc + l.photos.length, 0) !== 1 ? 's' : ''}</span>.
                      All documentation will be permanently deleted.
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-slate-50 rounded-lg p-3 mb-4 text-sm text-slate-600">
                This visit has no documented lesions yet.
              </div>
            )}

            <div className="flex gap-2">
              <button
                onClick={() => setShowCancelVisitConfirm(false)}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium transition-colors"
              >
                Keep Visit
              </button>
              <button
                onClick={handleCancelVisit}
                className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors"
              >
                Cancel Visit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
