import { useState } from 'react';
import {
  ArrowLeft, FileText, CheckCircle,
  Camera, ChevronRight, Info, Columns2, List
} from 'lucide-react';
import { useAppStore } from '../store/appStore';
import { BodyMapView } from '../components/bodymap/BodyMapView';
import { LesionDocForm } from '../components/lesion/LesionDocForm';
import { DocSpeedOverlay } from '../components/lesion/DocSpeedOverlay';
import { PhotoComparison } from '../components/lesion/PhotoComparison';
import { Lesion, Visit } from '../types';
import { format, parseISO, differenceInYears } from 'date-fns';
import { getLesionColor, getLesionLabel } from '../components/bodymap/BodyMapSVG';
import { exportVisitPDF } from '../utils/pdfExport';
import clsx from 'clsx';

export function BodyMapPage() {
  const {
    selectedPatient, currentVisit, currentUser,
    setCurrentPage, addLesionToVisit, startNewVisit,
    setCurrentVisit, startDocTimer, getDocTime,
  } = useAppStore();

  const [pendingLesion, setPendingLesion] = useState<{ x: number; y: number; region: string } | null>(null);
  const [selectedLesion, setSelectedLesion] = useState<Lesion | null>(null);
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

  const activeVisit = currentVisit || selectedPatient.visits.find((v) => v.status === 'in_progress');

  const handlePlaceLesion = (x: number, y: number, region: string) => {
    if (!activeVisit) {
      const visit = startNewVisit(selectedPatient);
      setCurrentVisit(visit);
    }
    startDocTimer();
    setPendingLesion({ x, y, region });
  };

  const handleSaveLesion = (lesion: Lesion) => {
    if (activeVisit) {
      addLesionToVisit(activeVisit.visit_id, lesion);
    }
    const elapsed = getDocTime();
    setLastDocTime(elapsed);
    setPendingLesion(null);
    setShowSpeedOverlay(true);
  };

  const handleExportPDF = async () => {
    if (!activeVisit && !selectedPatient.visits.length) return;
    const visit = activeVisit || selectedPatient.visits.at(-1)!;
    setExportingPDF(true);
    try {
      await exportVisitPDF(selectedPatient, visit);
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
                {selectedLesion.clinical_notes && (
                  <div className="mt-2 p-2 bg-white rounded-lg border border-slate-200">
                    <div className="text-xs text-slate-400 mb-1 flex items-center gap-1">
                      <Info size={10} />
                      Clinical Notes
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed">{selectedLesion.clinical_notes}</p>
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

      {/* Lesion documentation form */}
      {pendingLesion && activeVisit && (
        <LesionDocForm
          pendingCoords={pendingLesion}
          region={pendingLesion.region}
          visitId={activeVisit.visit_id}
          onClose={() => setPendingLesion(null)}
          onSave={handleSaveLesion}
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
    </div>
  );
}
