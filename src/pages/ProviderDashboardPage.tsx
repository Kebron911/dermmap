import { useMemo, useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, Legend
} from 'recharts';
import {
  TrendingUp, Clock, Users, Activity, Stethoscope, Award,
  ChevronDown, Calendar, Target, Zap
} from 'lucide-react';
import { useAppStore } from '../store/appStore';
import { ProviderPerformance, StaffScorecard } from '../types';
import clsx from 'clsx';

const COLORS = ['#0D9488', '#3B82F6', '#F59E0B', '#EF4444', '#10B981', '#8B5CF6'];

// Generate synthetic provider performance data from the patient store
function useProviderData() {
  const { patients } = useAppStore();

  return useMemo(() => {
    const providerMap = new Map<string, ProviderPerformance>();
    const staffMap = new Map<string, StaffScorecard>();
    let totalDocTime = 0;
    let totalVisits = 0;

    patients.forEach(patient => {
      patient.visits.forEach(visit => {
        // Provider metrics
        if (!providerMap.has(visit.provider_id)) {
          providerMap.set(visit.provider_id, {
            provider_id: visit.provider_id,
            provider_name: visit.provider_name,
            total_visits: 0,
            total_lesions: 0,
            total_photos: 0,
            avg_documentation_time_sec: 0,
            biopsies_performed: 0,
            malignancies_found: 0,
            biopsy_yield_pct: 0,
            patients_seen: 0,
            visits_per_day: 0,
          });
        }
        const prov = providerMap.get(visit.provider_id)!;
        prov.total_visits++;
        prov.total_lesions += visit.lesions.length;
        prov.total_photos += visit.lesions.reduce((s, l) => s + l.photos.length, 0);
        visit.lesions.forEach(l => {
          if (l.action === 'biopsy_performed') prov.biopsies_performed++;
          if (l.biopsy_result === 'malignant') prov.malignancies_found++;
        });
        prov.avg_documentation_time_sec = visit.documentation_time_sec || 8;
        totalDocTime += visit.documentation_time_sec || 8;
        totalVisits++;

        // Staff (MA) metrics
        if (!staffMap.has(visit.ma_id)) {
          staffMap.set(visit.ma_id, {
            user_id: visit.ma_id,
            user_name: visit.ma_name,
            role: 'ma',
            total_visits_documented: 0,
            total_photos_taken: 0,
            avg_documentation_time_sec: 0,
            completeness_pct: 0,
            photos_per_lesion: 0,
            visits_per_day: 0,
          });
        }
        const staff = staffMap.get(visit.ma_id)!;
        staff.total_visits_documented++;
        const photos = visit.lesions.reduce((s, l) => s + l.photos.length, 0);
        staff.total_photos_taken += photos;
      });
    });

    // Finalize calculated fields
    providerMap.forEach(p => {
      p.biopsy_yield_pct = p.biopsies_performed > 0 ? Math.round((p.malignancies_found / p.biopsies_performed) * 100) : 0;
      p.patients_seen = p.total_visits; // simplified
      p.visits_per_day = Math.round((p.total_visits / 30) * 10) / 10; // over ~30 days
    });

    staffMap.forEach(s => {
      s.photos_per_lesion = s.total_visits_documented > 0 ? Math.round((s.total_photos_taken / s.total_visits_documented) * 10) / 10 : 0;
      s.completeness_pct = Math.round(75 + Math.random() * 20); // synthetic
      s.avg_documentation_time_sec = Math.round(6 + Math.random() * 4);
      s.visits_per_day = Math.round((s.total_visits_documented / 30) * 10) / 10;
    });

    return {
      providers: Array.from(providerMap.values()),
      staff: Array.from(staffMap.values()),
      avgDocTime: totalVisits > 0 ? Math.round(totalDocTime / totalVisits) : 0,
    };
  }, [patients]);
}

export function ProviderDashboardPage() {
  const data = useProviderData();
  const [view, setView] = useState<'providers' | 'staff'>('providers');

  // Chart data for provider comparison
  const providerChartData = data.providers.map(p => ({
    name: p.provider_name.replace('Dr. ', ''),
    visits: p.total_visits,
    lesions: p.total_lesions,
    photos: p.total_photos,
    biopsies: p.biopsies_performed,
  }));

  const biopsyYieldData = data.providers.map(p => ({
    name: p.provider_name.replace('Dr. ', ''),
    yield: p.biopsy_yield_pct,
    biopsies: p.biopsies_performed,
    malignancies: p.malignancies_found,
  }));

  return (
    <div className="p-6 max-w-7xl mx-auto fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Stethoscope size={24} className="text-teal-600" />
            Provider Dashboard
          </h1>
          <p className="text-slate-500 text-sm mt-1">Performance metrics & staff scorecards</p>
        </div>
        <div className="flex gap-1 bg-slate-100 p-1 rounded-xl">
          <button
            onClick={() => setView('providers')}
            className={clsx(
              'px-4 py-2 rounded-lg text-sm font-medium transition-all',
              view === 'providers' ? 'bg-white text-teal-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            )}
          >
            <div className="flex items-center gap-2">
              <Stethoscope size={14} />
              Providers
            </div>
          </button>
          <button
            onClick={() => setView('staff')}
            className={clsx(
              'px-4 py-2 rounded-lg text-sm font-medium transition-all',
              view === 'staff' ? 'bg-white text-teal-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            )}
          >
            <div className="flex items-center gap-2">
              <Users size={14} />
              Staff Scorecards
            </div>
          </button>
        </div>
      </div>

      {view === 'providers' ? (
        <>
          {/* Provider KPI cards */}
          <div className="grid grid-cols-4 gap-4 mb-6">
            {data.providers.slice(0, 4).map((p) => (
              <div key={p.provider_id} className="card p-5">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-teal-500 to-blue-600 rounded-full flex items-center justify-center text-white font-bold text-sm">
                    {p.provider_name.split(' ').map(w => w[0]).join('').slice(0, 2)}
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-slate-900 truncate">{p.provider_name}</div>
                    <div className="text-xs text-slate-400">{p.visits_per_day} visits/day</div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-slate-50 rounded-lg p-2 text-center">
                    <div className="text-lg font-bold text-slate-900">{p.total_visits}</div>
                    <div className="text-[10px] text-slate-500">Visits</div>
                  </div>
                  <div className="bg-slate-50 rounded-lg p-2 text-center">
                    <div className="text-lg font-bold text-slate-900">{p.total_lesions}</div>
                    <div className="text-[10px] text-slate-500">Lesions</div>
                  </div>
                  <div className="bg-slate-50 rounded-lg p-2 text-center">
                    <div className="text-lg font-bold text-slate-900">{p.biopsies_performed}</div>
                    <div className="text-[10px] text-slate-500">Biopsies</div>
                  </div>
                  <div className="bg-slate-50 rounded-lg p-2 text-center">
                    <div className="text-lg font-bold text-emerald-600">{p.biopsy_yield_pct}%</div>
                    <div className="text-[10px] text-slate-500">Yield</div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Charts row */}
          <div className="grid grid-cols-2 gap-6 mb-6">
            <div className="card p-5">
              <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
                <Activity size={16} className="text-teal-500" />
                Provider Volume Comparison
              </h3>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={providerChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ background: '#1e293b', border: 'none', borderRadius: '8px', color: '#f1f5f9' }} />
                  <Legend iconType="circle" iconSize={8} />
                  <Bar dataKey="visits" name="Visits" fill="#0D9488" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="lesions" name="Lesions" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="photos" name="Photos" fill="#8B5CF6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="card p-5">
              <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
                <Target size={16} className="text-amber-500" />
                Biopsy Yield by Provider
              </h3>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={biopsyYieldData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                  <XAxis type="number" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
                  <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ background: '#1e293b', border: 'none', borderRadius: '8px', color: '#f1f5f9' }} formatter={(v: number) => [`${v}%`, 'Biopsy Yield']} />
                  <Bar dataKey="yield" fill="#F59E0B" radius={[0, 4, 4, 0]} barSize={24} />
                </BarChart>
              </ResponsiveContainer>
              <div className="mt-3 text-xs text-slate-400 text-center">
                Industry benchmark: 25-35% biopsy-to-malignancy yield
              </div>
            </div>
          </div>

          {/* Provider detail table */}
          <div className="card overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100">
              <h3 className="font-semibold text-slate-900">Detailed Provider Metrics</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50">
                    <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Provider</th>
                    <th className="text-right px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Visits</th>
                    <th className="text-right px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Lesions</th>
                    <th className="text-right px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Photos</th>
                    <th className="text-right px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Biopsies</th>
                    <th className="text-right px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Malignancies</th>
                    <th className="text-right px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Yield %</th>
                    <th className="text-right px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Visits/Day</th>
                  </tr>
                </thead>
                <tbody>
                  {data.providers.map((p, i) => (
                    <tr key={p.provider_id} className={clsx('border-b border-slate-50', i % 2 === 0 ? 'bg-white' : 'bg-slate-50/50')}>
                      <td className="px-5 py-3 font-medium text-slate-900">{p.provider_name}</td>
                      <td className="px-5 py-3 text-right text-slate-600">{p.total_visits}</td>
                      <td className="px-5 py-3 text-right text-slate-600">{p.total_lesions}</td>
                      <td className="px-5 py-3 text-right text-slate-600">{p.total_photos}</td>
                      <td className="px-5 py-3 text-right text-slate-600">{p.biopsies_performed}</td>
                      <td className="px-5 py-3 text-right text-slate-600">{p.malignancies_found}</td>
                      <td className="px-5 py-3 text-right">
                        <span className={clsx(
                          'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold',
                          p.biopsy_yield_pct >= 30 ? 'bg-emerald-50 text-emerald-700' :
                          p.biopsy_yield_pct >= 20 ? 'bg-amber-50 text-amber-700' :
                          'bg-red-50 text-red-700'
                        )}>
                          {p.biopsy_yield_pct}%
                        </span>
                      </td>
                      <td className="px-5 py-3 text-right text-slate-600">{p.visits_per_day}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        // ── Staff Scorecards ─────────────────────────────────────
        <>
          <div className="grid grid-cols-3 gap-4 mb-6">
            {data.staff.map((s) => (
              <div key={s.user_id} className="card p-5">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-sky-100 rounded-full flex items-center justify-center text-sky-700 font-bold text-sm">
                    {s.user_name.split(' ').map(w => w[0]).join('').slice(0, 2)}
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-slate-900">{s.user_name}</div>
                    <span className="text-xs text-sky-600 font-medium bg-sky-50 px-1.5 py-0.5 rounded">Medical Assistant</span>
                  </div>
                </div>

                <div className="space-y-3">
                  {/* Completeness */}
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-slate-500">Documentation Completeness</span>
                      <span className="font-bold text-slate-700">{s.completeness_pct}%</span>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={clsx(
                          'h-full rounded-full transition-all',
                          s.completeness_pct >= 90 ? 'bg-emerald-500' :
                          s.completeness_pct >= 75 ? 'bg-amber-500' : 'bg-red-500'
                        )}
                        style={{ width: `${s.completeness_pct}%` }}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-slate-50 rounded-lg p-2.5 text-center">
                      <div className="text-lg font-bold text-slate-900">{s.total_visits_documented}</div>
                      <div className="text-[10px] text-slate-500">Visits Documented</div>
                    </div>
                    <div className="bg-slate-50 rounded-lg p-2.5 text-center">
                      <div className="text-lg font-bold text-slate-900">{s.total_photos_taken}</div>
                      <div className="text-[10px] text-slate-500">Photos Taken</div>
                    </div>
                    <div className="bg-slate-50 rounded-lg p-2.5 text-center">
                      <div className="text-lg font-bold text-slate-900">{s.photos_per_lesion}</div>
                      <div className="text-[10px] text-slate-500">Photos / Lesion</div>
                    </div>
                    <div className="bg-slate-50 rounded-lg p-2.5 text-center">
                      <div className="text-lg font-bold text-teal-600">{s.avg_documentation_time_sec}s</div>
                      <div className="text-[10px] text-slate-500">Avg Doc Time</div>
                    </div>
                  </div>

                  {/* Performance badges */}
                  <div className="flex gap-1.5 pt-1">
                    {s.completeness_pct >= 90 && (
                      <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 text-[10px] font-bold px-2 py-1 rounded-full">
                        <Award size={10} /> Top Documenter
                      </span>
                    )}
                    {s.photos_per_lesion >= 4 && (
                      <span className="inline-flex items-center gap-1 bg-violet-50 text-violet-700 text-[10px] font-bold px-2 py-1 rounded-full">
                        <Zap size={10} /> Photo Pro
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Staff comparison chart */}
          <div className="card p-5">
            <h3 className="font-semibold text-slate-900 mb-4">Staff Performance Comparison</h3>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={data.staff.map(s => ({
                name: s.user_name.split(' ')[0],
                visits: s.total_visits_documented,
                photos: s.total_photos_taken,
                completeness: s.completeness_pct,
              }))}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ background: '#1e293b', border: 'none', borderRadius: '8px', color: '#f1f5f9' }} />
                <Legend iconType="circle" iconSize={8} />
                <Bar dataKey="visits" name="Visits Doc'd" fill="#0EA5E9" radius={[4, 4, 0, 0]} />
                <Bar dataKey="photos" name="Photos Taken" fill="#8B5CF6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </>
      )}
    </div>
  );
}
