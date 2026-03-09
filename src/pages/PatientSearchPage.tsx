import { useState } from 'react';
import { Search, ChevronRight, Calendar, MapPin, AlertCircle } from 'lucide-react';
import { useAppStore } from '../store/appStore';
import { Patient } from '../types';
import { format, differenceInYears, parseISO } from 'date-fns';
import clsx from 'clsx';

const skinTypeColors: Record<string, string> = {
  I: 'bg-orange-50 text-orange-700',
  II: 'bg-yellow-50 text-yellow-700',
  III: 'bg-amber-50 text-amber-700',
  IV: 'bg-orange-100 text-orange-800',
  V: 'bg-brown-100 text-stone-700',
  VI: 'bg-stone-100 text-stone-800',
};

function getAlertCount(patient: Patient): number {
  return patient.visits.reduce((total, visit) =>
    total + visit.lesions.filter((l) =>
      l.biopsy_result === 'malignant' || l.biopsy_result === 'atypical' || l.biopsy_result === 'pending'
    ).length, 0
  );
}

function getLesionCount(patient: Patient): number {
  const uniqueLesions = new Set(patient.visits.flatMap((v) => v.lesions.map((l) => l.lesion_id)));
  return uniqueLesions.size;
}

function PatientCard({ patient, onClick }: { patient: Patient; onClick: () => void }) {
  const age = differenceInYears(new Date(), parseISO(patient.date_of_birth));
  const alertCount = getAlertCount(patient);
  const lesionCount = getLesionCount(patient);
  const lastVisit = patient.visits.at(-1);
  const pendingReview = patient.visits.some((v) => v.status === 'pending_review');

  return (
    <button
      onClick={onClick}
      className="w-full text-left card p-4 hover:shadow-md hover:border-teal-200 transition-all group"
    >
      <div className="flex items-start gap-4">
        {/* Avatar */}
        <div className="w-11 h-11 bg-gradient-to-br from-teal-500 to-blue-600 rounded-full flex items-center justify-center text-white font-semibold text-sm shrink-0">
          {patient.first_name[0]}{patient.last_name[0]}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-slate-900">
              {patient.last_name}, {patient.first_name}
            </span>
            <span className="text-xs text-slate-400">{patient.mrn}</span>
            {alertCount > 0 && (
              <span className="flex items-center gap-1 bg-red-50 text-red-700 border border-red-200 text-xs px-2 py-0.5 rounded-full font-medium">
                <AlertCircle size={10} />
                {alertCount} alert{alertCount > 1 ? 's' : ''}
              </span>
            )}
            {pendingReview && (
              <span className="badge-amber">Pending Review</span>
            )}
          </div>
          <div className="flex items-center gap-3 mt-1">
            <span className="text-xs text-slate-500">
              DOB: {format(parseISO(patient.date_of_birth), 'MM/dd/yyyy')} · {age}y
            </span>
            <span className={clsx('text-xs px-1.5 py-0.5 rounded font-medium', skinTypeColors[patient.skin_type] || 'bg-slate-100 text-slate-600')}>
              Fitzpatrick {patient.skin_type}
            </span>
            <span className="text-xs text-slate-400 capitalize">{patient.gender}</span>
          </div>
          <div className="flex items-center gap-4 mt-2">
            <div className="flex items-center gap-1 text-xs text-slate-500">
              <MapPin size={11} />
              {lesionCount} lesion{lesionCount !== 1 ? 's' : ''} tracked
            </div>
            <div className="flex items-center gap-1 text-xs text-slate-500">
              <Calendar size={11} />
              {patient.visits.length} visit{patient.visits.length !== 1 ? 's' : ''}
            </div>
            {lastVisit && (
              <div className="text-xs text-slate-400">
                Last: {format(parseISO(lastVisit.visit_date), 'MMM d, yyyy')}
              </div>
            )}
          </div>
        </div>

        {/* Arrow */}
        <ChevronRight size={16} className="text-slate-300 group-hover:text-teal-500 transition-colors mt-1 shrink-0" />
      </div>
    </button>
  );
}

export function PatientSearchPage() {
  const { patients, setSelectedPatient, setCurrentPage, startNewVisit, setCurrentVisit, currentUser } = useAppStore();
  const [query, setQuery] = useState('');

  const filtered = query.trim()
    ? patients.filter((p) => {
        const q = query.toLowerCase();
        return (
          p.first_name.toLowerCase().includes(q) ||
          p.last_name.toLowerCase().includes(q) ||
          p.mrn.toLowerCase().includes(q) ||
          p.date_of_birth.includes(q)
        );
      })
    : patients;

  const handleSelect = (patient: Patient) => {
    setSelectedPatient(patient);
    setCurrentPage('bodymap');
  };

  const handleNewVisit = (patient: Patient) => {
    setSelectedPatient(patient);
    const visit = startNewVisit(patient);
    setCurrentVisit(visit);
    setCurrentPage('bodymap');
  };

  const recentPatients = patients.slice(0, 5);

  return (
    <div className="p-6 max-w-4xl mx-auto fade-in">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Patient Search</h1>
        <p className="text-slate-500 text-sm mt-1">Search by name, date of birth, or MRN</p>
      </div>

      {/* Search Bar */}
      <div className="relative mb-6">
        <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          className="w-full pl-11 pr-4 py-3.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent bg-white shadow-sm"
          placeholder="Search patients by name, DOB (MM/DD/YYYY), or MRN..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          autoFocus
        />
        {query && (
          <button
            onClick={() => setQuery('')}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
          >
            ✕
          </button>
        )}
      </div>

      {/* Results / Recent */}
      {query ? (
        <div>
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">
            {filtered.length} result{filtered.length !== 1 ? 's' : ''} for "{query}"
          </div>
          {filtered.length === 0 ? (
            <div className="card p-12 text-center">
              <div className="text-4xl mb-3">🔍</div>
              <p className="text-slate-600 font-medium">No patients found</p>
              <p className="text-slate-400 text-sm mt-1">Try a different name or MRN</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filtered.map((patient) => (
                <PatientCard key={patient.patient_id} patient={patient} onClick={() => handleSelect(patient)} />
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-6">
          <div className="col-span-2">
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">
              All Patients ({patients.length})
            </div>
            <div className="space-y-2">
              {patients.map((patient) => (
                <PatientCard key={patient.patient_id} patient={patient} onClick={() => handleSelect(patient)} />
              ))}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            <div className="card p-4">
              <h3 className="text-sm font-semibold text-slate-700 mb-3">Quick Filters</h3>
              <div className="space-y-2">
                {[
                  { label: 'Pending Review', count: patients.filter(p => p.visits.some(v => v.status === 'pending_review')).length, color: 'text-amber-600' },
                  { label: 'Active Alerts', count: patients.filter(p => getAlertCount(p) > 0).length, color: 'text-red-600' },
                  { label: 'New Patients', count: patients.filter(p => p.visits.length <= 1).length, color: 'text-blue-600' },
                ].map((filter) => (
                  <button key={filter.label} className="w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-slate-50 transition-colors">
                    <span className="text-xs text-slate-600">{filter.label}</span>
                    <span className={`text-xs font-bold ${filter.color}`}>{filter.count}</span>
                  </button>
                ))}
              </div>
            </div>

            {currentUser?.role === 'ma' && (
              <div className="card p-4 bg-gradient-to-br from-teal-50 to-blue-50 border-teal-100">
                <h3 className="text-sm font-semibold text-teal-800 mb-2">Demo Tip</h3>
                <p className="text-xs text-teal-700 leading-relaxed">
                  Select any patient to open their body map. Click "Add Lesion" to place a marker and document in under 10 seconds.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
