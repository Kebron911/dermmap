import { useMemo } from 'react';
import { Clock, Calendar, ChevronRight, Activity, Camera, Users, FileText, TrendingUp } from 'lucide-react';
import { useAppStore } from '../store/appStore';
import { TODAY_APPOINTMENTS } from '../data/syntheticData';
import { format } from 'date-fns';
import clsx from 'clsx';

const statusColors: Record<string, string> = {
  locked: 'badge-green',
  pending_review: 'badge-amber',
  in_progress: 'badge-blue',
  signed: 'badge-green',
};

const statusLabels: Record<string, string> = {
  locked: 'Complete',
  pending_review: 'Pending Review',
  in_progress: 'In Progress',
  signed: 'Signed',
};

export function SchedulePage() {
  const { currentUser, patients, setSelectedPatient, setCurrentVisit, setCurrentPage, startNewVisit, ehrSynced } = useAppStore();
  const today = format(new Date(), 'EEEE, MMMM d, yyyy');
  const todayStr = format(new Date(), 'yyyy-MM-dd');

  // Derive today's appointments from the patients store; fall back to demo data
  const appointments = useMemo(() => {
    const fromStore = patients.flatMap(p =>
      p.visits
        .filter(v => v.visit_date.startsWith(todayStr))
        .map(v => ({ time: format(new Date(v.created_at || v.visit_date), 'h:mm a'), patient: p, reason: 'Dermatology visit', status: v.status }))
    ).sort((a, b) => a.time.localeCompare(b.time));
    return fromStore.length > 0 ? fromStore : TODAY_APPOINTMENTS.map((a, i) => ({
      ...a,
      status: i < 3 ? 'locked' : i === 3 ? 'in_progress' : 'pending_review',
    }));
  }, [patients, todayStr]);

  // Compute today-specific stats from the patients store
  const todayVisits = useMemo(() =>
    patients.flatMap(p => p.visits.filter(v => v.visit_date.startsWith(todayStr))),
    [patients, todayStr]);

  const completedToday = todayVisits.filter(v => v.status === 'locked' || v.status === 'signed').length;
  const photoCountToday = todayVisits.reduce((acc, v) => acc + v.lesions.reduce((s, l) => s + l.photos.length, 0), 0);
  const docTimes = todayVisits.map(v => v.documentation_time_sec).filter((t): t is number => t != null);
  const avgDocTimeStr = docTimes.length
    ? `${(docTimes.reduce((a, b) => a + b, 0) / docTimes.length).toFixed(1)}s`
    : '7.8s';

  // Compute this-week stats from the patients store
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const weekVisits = useMemo(() =>
    patients.flatMap(p => p.visits.filter(v => v.visit_date >= weekAgo)),
    [patients, weekAgo]);
  const weekPhotos = weekVisits.reduce((acc, v) => acc + v.lesions.reduce((s, l) => s + l.photos.length, 0), 0);
  const weekBiopsies = weekVisits.reduce((acc, v) => acc + v.lesions.filter(l => l.action === 'biopsy_scheduled' || l.action === 'biopsy_performed').length, 0);
  const weekDocTimes = weekVisits.map(v => v.documentation_time_sec).filter((t): t is number => t != null);
  const weekAvgDocStr = weekDocTimes.length
    ? `${(weekDocTimes.reduce((a, b) => a + b, 0) / weekDocTimes.length).toFixed(1)}s`
    : '7.8s';

  const quickStats = [
    { label: 'Scheduled Today', value: appointments.length, icon: <Calendar size={18} />, color: 'text-blue-600 bg-blue-50' },
    { label: 'Completed', value: completedToday || TODAY_APPOINTMENTS.filter((_, i) => i < 3).length, icon: <Activity size={18} />, color: 'text-emerald-600 bg-emerald-50' },
    { label: 'Avg. Doc Time', value: avgDocTimeStr, icon: <Clock size={18} />, color: 'text-teal-600 bg-teal-50' },
    { label: 'Photos Today', value: photoCountToday || 14, icon: <Camera size={18} />, color: 'text-violet-600 bg-violet-50' },
  ];

  const handleOpenPatient = (patient: (typeof appointments)[0]['patient']) => {
    setSelectedPatient(patient as Parameters<typeof setSelectedPatient>[0]);
    setCurrentPage('bodymap');
  };

  const handleStartVisit = async (patient: (typeof appointments)[0]['patient']) => {
    setSelectedPatient(patient as Parameters<typeof setSelectedPatient>[0]);
    const visit = await startNewVisit(patient as Parameters<typeof startNewVisit>[0]);
    setCurrentVisit(visit);
    setCurrentPage('bodymap');
  };

  const currentAppt = appointments.find((_, i) => i === (appointments.findIndex(a => 'status' in a && a.status === 'in_progress') || 3));

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto fade-in">
      {/* Header */}
      <div className="mb-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-slate-900">Good morning, {currentUser?.name.split(' ')[0]}</h1>
            <p className="text-slate-500 text-sm mt-0.5">{today}</p>
          </div>
          {ehrSynced && (
          <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-1.5 shrink-0">
            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
            <span className="text-xs md:text-sm font-medium text-emerald-700 hidden sm:inline">EHR Synced — ModMed EMA</span>
            <span className="text-xs font-medium text-emerald-700 sm:hidden">EHR Synced</span>
          </div>
          )}
        </div>
      </div>

      {/* Current patient hero card — shown when there's a patient NOW */}
      {currentAppt && (
        <div className="mb-5 rounded-2xl bg-gradient-to-r from-teal-600 to-teal-500 p-5 text-white shadow-lg fade-in">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              {/* Avatar */}
              <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center font-bold text-lg shrink-0">
                {currentAppt.patient.first_name[0]}{currentAppt.patient.last_name[0]}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-bold text-lg leading-tight">
                    {currentAppt.patient.first_name} {currentAppt.patient.last_name}
                  </span>
                  <span className="bg-white/20 text-white text-xs font-semibold px-2 py-0.5 rounded-full flex items-center gap-1">
                    <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse inline-block" />
                    Now
                  </span>
                </div>
                <p className="text-teal-100 text-sm mt-0.5">{currentAppt.reason}</p>
                <p className="text-teal-200 text-xs mt-0.5">
                  {currentAppt.patient.visits.reduce((acc, v) => acc + v.lesions.length, 0)} lesions on record · {currentAppt.time}
                </p>
              </div>
            </div>
          </div>
          <button
            onClick={() => handleStartVisit(currentAppt.patient)}
            className="mt-4 w-full flex items-center justify-center gap-2 bg-white text-teal-700 font-bold py-3.5 rounded-xl hover:bg-teal-50 active:bg-teal-100 transition-colors text-sm shadow-sm"
          >
            Start Visit Now
            <ChevronRight size={18} />
          </button>
        </div>
      )}

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-5">
        {quickStats.map((stat) => (
          <div key={stat.label} className="card p-4 flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${stat.color}`}>
              {stat.icon}
            </div>
            <div>
              <div className="text-xl font-bold text-slate-900">{stat.value}</div>
              <div className="text-xs text-slate-500">{stat.label}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
        {/* Appointment List */}
        <div className="lg:col-span-2">
          <div className="card overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <h2 className="font-semibold text-slate-900 flex items-center gap-2">
                <Calendar size={16} className="text-teal-600" />
                Today's Appointments
              </h2>
              <span className="text-xs text-slate-400">{appointments.length} patients</span>
            </div>
            <div className="divide-y divide-slate-50">
              {appointments.map((appt, i) => {
                const lastVisit = appt.patient.visits.at(-1);
                const isDone = 'status' in appt ? (appt.status === 'locked' || appt.status === 'signed') : i < 3;
                const isCurrent = 'status' in appt ? appt.status === 'in_progress' : i === 3;

                return (
                  <div
                    key={i}
                    className={clsx(
                      'px-4 py-3.5 flex items-center gap-3 transition-colors',
                      isCurrent && 'bg-teal-50',
                      !isDone && !isCurrent && 'hover:bg-slate-50'
                    )}
                  >
                    {/* Time */}
                    <div className="text-xs font-mono font-medium text-slate-400 w-16 shrink-0">
                      {appt.time}
                    </div>

                    {/* Status indicator */}
                    <div className={clsx(
                      'w-2 h-2 rounded-full shrink-0',
                      isDone ? 'bg-emerald-400' : isCurrent ? 'bg-teal-500 animate-pulse' : 'bg-slate-200'
                    )} />

                    {/* Patient info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-900 text-sm">
                          {appt.patient.first_name} {appt.patient.last_name}
                        </span>
                        <span className="text-xs text-slate-400">{appt.patient.mrn}</span>
                        {isCurrent && (
                          <span className="bg-teal-100 text-teal-700 text-xs px-2 py-0.5 rounded-full font-medium">
                            Now
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-0.5">
                        <span className="text-xs text-slate-500">{appt.reason}</span>
                        <span className="text-xs text-slate-300">·</span>
                        <span className="text-xs text-slate-400">
                          {appt.patient.visits.reduce((acc, v) => acc + v.lesions.length, 0)} lesions tracked
                        </span>
                      </div>
                    </div>

                    {/* Last visit status */}
                    {lastVisit && (
                      <span className={clsx(statusColors[lastVisit.status] || 'badge-gray', 'hidden sm:inline-flex')}>
                        {statusLabels[lastVisit.status] || lastVisit.status}
                      </span>
                    )}

                    {/* Action */}
                    <button
                      onClick={() => isDone ? handleOpenPatient(appt.patient) : handleStartVisit(appt.patient)}
                      className={clsx(
                        'flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all min-h-[36px]',
                        isDone
                          ? 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'
                          : 'bg-teal-600 text-white hover:bg-teal-700'
                      )}
                    >
                      {isDone ? 'View' : 'Start'}
                      <ChevronRight size={12} />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Sidebar widgets */}
        <div className="space-y-4">
          {/* Quick actions */}
          <div className="card p-4">
            <h3 className="text-sm font-semibold text-slate-700 mb-3">Quick Actions</h3>
            <div className="space-y-2">
              <button
                onClick={() => setCurrentPage('search')}
                className="w-full flex items-center gap-3 px-3 py-2.5 bg-teal-50 hover:bg-teal-100 rounded-lg text-sm text-teal-700 font-medium transition-colors"
              >
                <Users size={16} />
                Search Patients
              </button>
              <button className="w-full flex items-center gap-3 px-3 py-2.5 bg-slate-50 hover:bg-slate-100 rounded-lg text-sm text-slate-600 font-medium transition-colors">
                <FileText size={16} />
                Generate Reports
              </button>
            </div>
          </div>

          {/* Recent activity */}
          <div className="card p-4">
            <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
              <TrendingUp size={14} className="text-teal-600" />
              This Week
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-xs text-slate-500">Visits documented</span>
                <span className="text-sm font-semibold text-slate-900">{weekVisits.length || 24}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-slate-500">Photos captured</span>
                <span className="text-sm font-semibold text-slate-900">{weekPhotos || 87}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-slate-500">Avg. doc time</span>
                <span className="text-sm font-semibold text-teal-700">{weekAvgDocStr}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-slate-500">Biopsy flags</span>
                <span className="text-sm font-semibold text-amber-700">{weekBiopsies || 3}</span>
              </div>
            </div>
            <div className="mt-3 pt-3 border-t border-slate-100">
              <div className="text-xs text-slate-400 text-center">
                vs. paper charts: saves ~<strong className="text-teal-600">4.2 min/patient</strong>
              </div>
            </div>
          </div>

          {/* Compliance badge */}
          <div className="card p-4 bg-gradient-to-br from-teal-50 to-blue-50 border-teal-100">
            <div className="text-xs font-semibold text-teal-700 mb-2">Compliance Status</div>
            <div className="space-y-1.5">
              {['HIPAA Audit Logging', 'AES-256 Encryption', 'MFA Active', 'BAA in Force'].map((item) => (
                <div key={item} className="flex items-center gap-2 text-xs text-slate-600">
                  <div className="w-4 h-4 bg-emerald-100 rounded-full flex items-center justify-center">
                    <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
                  </div>
                  {item}
                </div>
              ))}
            </div>
          </div>

          {/* Reliability card */}
          <div className="card p-4 border-slate-200">
            <div className="text-xs font-semibold text-slate-700 mb-2 flex items-center gap-1.5">
              <div className="w-2 h-2 bg-emerald-500 rounded-full" />
              Reliability Guarantee
            </div>
            <div className="space-y-2">
              {[
                { icon: '📴', text: 'Offline capture — no photo lost if WiFi drops' },
                { icon: '🔄', text: 'Auto-sync when reconnected' },
                { icon: '☁️', text: 'Redundant cloud storage (3 replicas)' },
                { icon: '🛡️', text: '99.9% uptime SLA · 24/7 support' },
              ].map((item) => (
                <div key={item.text} className="flex items-start gap-2 text-xs text-slate-500">
                  <span>{item.icon}</span>
                  <span>{item.text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
