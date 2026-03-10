import { useMemo, useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
  PieChart, Pie, Cell
} from 'recharts';
import {
  Shield, TrendingUp, Camera, CheckCircle, AlertTriangle,
  Award, Target, Zap, FileText
} from 'lucide-react';
import { useAppStore } from '../store/appStore';
import { QualityMetrics } from '../types';
import clsx from 'clsx';

const COLORS = ['#0D9488', '#3B82F6', '#F59E0B', '#EF4444', '#10B981', '#8B5CF6'];

function useQualityMetrics(): QualityMetrics {
  const { patients } = useAppStore();

  return useMemo(() => {
    let totalBiopsies = 0;
    let malignancies = 0;
    let totalFields = 0;
    let filledFields = 0;
    let totalLesions = 0;
    let totalPhotos = 0;
    let dermoscopicPhotos = 0;
    let totalVisits = 0;
    let completedVisits = 0;

    patients.forEach(p => {
      p.visits.forEach(v => {
        totalVisits++;
        if (v.status === 'locked' || v.status === 'signed') completedVisits++;
        v.lesions.forEach(l => {
          totalLesions++;
          totalPhotos += l.photos.length;
          l.photos.forEach(ph => { if (ph.capture_type === 'dermoscopic') dermoscopicPhotos++; });
          if (l.action === 'biopsy_performed') totalBiopsies++;
          if (l.biopsy_result === 'malignant') malignancies++;

          // Completeness: count core fields
          const fields = ['size_mm', 'shape', 'color', 'border', 'symmetry', 'action'] as const;
          fields.forEach(f => {
            totalFields++;
            const val = l[f];
            if (val !== null && val !== undefined && val !== 'not_assessed') filledFields++;
          });
        });
      });
    });

    // Referral turnaround: avg days between consecutive visits for patients with referrals
    let refDays = 0, refCount = 0;
    patients.forEach(p => {
      const hasReferral = p.visits.some(v => v.lesions.some(l => l.action === 'referral'));
      if (hasReferral && p.visits.length >= 2) {
        const sorted = [...p.visits].sort((a, b) => a.visit_date.localeCompare(b.visit_date));
        for (let i = 1; i < sorted.length; i++) {
          const days = (new Date(sorted[i].visit_date).getTime() - new Date(sorted[i - 1].visit_date).getTime()) / 86400000;
          refDays += days;
          refCount++;
        }
      }
    });

    return {
      biopsy_yield: totalBiopsies > 0 ? Math.round((malignancies / totalBiopsies) * 100) : 0,
      documentation_completeness: totalFields > 0 ? Math.round((filledFields / totalFields) * 100) : 0,
      photo_quality_score: totalPhotos > 0 ? Math.round((dermoscopicPhotos / totalPhotos) * 5 * 10) / 10 : 0,
      avg_lesions_per_visit: totalVisits > 0 ? Math.round((totalLesions / totalVisits) * 10) / 10 : 0,
      follow_up_compliance: totalVisits > 0 ? Math.round((completedVisits / totalVisits) * 100) : 0,
      referral_turnaround_days: refCount > 0 ? Math.round((refDays / refCount) * 10) / 10 : 0,
    };
  }, [patients]);
}

function MetricGauge({ label, value, max, unit, color, benchmark }: {
  label: string; value: number; max: number; unit: string; color: string; benchmark?: number;
}) {
  const pct = Math.min(100, (value / max) * 100);
  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-semibold text-slate-700">{label}</span>
        {benchmark !== undefined && (
          <span className="text-xs text-slate-400">Benchmark: {benchmark}{unit}</span>
        )}
      </div>
      <div className="flex items-end gap-2 mb-2">
        <span className="text-3xl font-bold" style={{ color }}>{value}</span>
        <span className="text-sm text-slate-400 mb-1">{unit}</span>
      </div>
      <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
}

export function QualityMetricsPage() {
  const metrics = useQualityMetrics();
  const [period, setPeriod] = useState<'30d' | '90d' | '6m' | '1y'>('90d');

  // Radar data for quality spider chart
  const radarData = [
    { metric: 'Biopsy Yield', value: Math.min(100, metrics.biopsy_yield), fullMark: 100 },
    { metric: 'Doc Completeness', value: metrics.documentation_completeness, fullMark: 100 },
    { metric: 'Photo Quality', value: metrics.photo_quality_score * 20, fullMark: 100 },
    { metric: 'Follow-up Rate', value: metrics.follow_up_compliance, fullMark: 100 },
    { metric: 'Referral Speed', value: Math.max(0, 100 - metrics.referral_turnaround_days * 10), fullMark: 100 },
    { metric: 'Lesion Coverage', value: Math.min(100, metrics.avg_lesions_per_visit * 25), fullMark: 100 },
  ];

  // Trend data (synthetic)
  const trendData = [
    { month: 'Jan', yield: 28, completeness: 72, photoScore: 3.8 },
    { month: 'Feb', yield: 30, completeness: 75, photoScore: 4.0 },
    { month: 'Mar', yield: 27, completeness: 78, photoScore: 4.1 },
    { month: 'Apr', yield: 33, completeness: 80, photoScore: 4.2 },
    { month: 'May', yield: 32, completeness: 82, photoScore: 4.3 },
    { month: 'Jun', yield: metrics.biopsy_yield, completeness: metrics.documentation_completeness, photoScore: metrics.photo_quality_score },
  ];

  const outcomeData = [
    { name: 'Benign', value: 62 },
    { name: 'Atypical', value: 24 },
    { name: 'Malignant', value: 14 },
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Shield size={24} className="text-teal-600" />
            Quality Metrics
          </h1>
          <p className="text-slate-500 text-sm mt-1">Clinical quality indicators & practice benchmarks</p>
        </div>
        <div className="flex gap-1 bg-slate-100 p-1 rounded-xl">
          {(['30d', '90d', '6m', '1y'] as const).map(p => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={clsx(
                'px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                period === p ? 'bg-white text-teal-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              )}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* KPI gauges */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <MetricGauge
          label="Biopsy Yield"
          value={metrics.biopsy_yield}
          max={100}
          unit="%"
          color="#0D9488"
          benchmark={30}
        />
        <MetricGauge
          label="Documentation Completeness"
          value={metrics.documentation_completeness}
          max={100}
          unit="%"
          color="#3B82F6"
          benchmark={90}
        />
        <MetricGauge
          label="Follow-up Compliance"
          value={metrics.follow_up_compliance}
          max={100}
          unit="%"
          color="#10B981"
          benchmark={85}
        />
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <MetricGauge
          label="Photo Quality Score"
          value={metrics.photo_quality_score}
          max={5}
          unit="/5"
          color="#8B5CF6"
          benchmark={4.0}
        />
        <MetricGauge
          label="Avg Lesions Per Visit"
          value={metrics.avg_lesions_per_visit}
          max={10}
          unit=""
          color="#F59E0B"
        />
        <MetricGauge
          label="Referral Turnaround"
          value={metrics.referral_turnaround_days}
          max={14}
          unit=" days"
          color="#EF4444"
          benchmark={5}
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-3 gap-6 mb-6">
        {/* Radar chart */}
        <div className="card p-5">
          <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
            <Target size={16} className="text-teal-500" />
            Quality Radar
          </h3>
          <ResponsiveContainer width="100%" height={250}>
            <RadarChart data={radarData}>
              <PolarGrid stroke="#e2e8f0" />
              <PolarAngleAxis dataKey="metric" tick={{ fontSize: 9, fill: '#64748b' }} />
              <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
              <Radar name="Quality" dataKey="value" stroke="#0D9488" fill="#0D9488" fillOpacity={0.2} strokeWidth={2} />
            </RadarChart>
          </ResponsiveContainer>
        </div>

        {/* Biopsy outcomes */}
        <div className="card p-5">
          <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
            <FileText size={16} className="text-blue-500" />
            Biopsy Outcomes
          </h3>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={outcomeData}
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={80}
                paddingAngle={3}
                dataKey="value"
                nameKey="name"
              >
                {outcomeData.map((_, index) => (
                  <Cell key={index} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ background: '#1e293b', border: 'none', borderRadius: '8px', color: '#f1f5f9' }}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="space-y-1.5 mt-2">
            {outcomeData.map((item, i) => (
              <div key={item.name} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[i] }} />
                  <span className="text-slate-600">{item.name}</span>
                </div>
                <span className="font-semibold text-slate-800">{item.value}%</span>
              </div>
            ))}
          </div>
        </div>

        {/* Quality trend */}
        <div className="card p-5">
          <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
            <TrendingUp size={16} className="text-emerald-500" />
            Quality Trends
          </h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: '#1e293b', border: 'none', borderRadius: '8px', color: '#f1f5f9' }} />
              <Bar dataKey="yield" name="Biopsy Yield %" fill="#0D9488" radius={[4, 4, 0, 0]} />
              <Bar dataKey="completeness" name="Completeness %" fill="#3B82F6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Action items */}
      <div className="card p-5">
        <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
          <AlertTriangle size={16} className="text-amber-500" />
          Quality Improvement Opportunities
        </h3>
        <div className="space-y-2">
          {metrics.documentation_completeness < 90 && (
            <div className="flex items-center gap-3 p-3 bg-amber-50 border border-amber-200 rounded-xl">
              <AlertTriangle size={16} className="text-amber-500 shrink-0" />
              <div>
                <div className="text-sm font-medium text-amber-800">Documentation completeness below 90%</div>
                <div className="text-xs text-amber-600 mt-0.5">
                  Current: {metrics.documentation_completeness}% — Encourage MAs to fill all lesion fields (size, shape, color, border, symmetry)
                </div>
              </div>
            </div>
          )}
          {metrics.follow_up_compliance < 85 && (
            <div className="flex items-center gap-3 p-3 bg-amber-50 border border-amber-200 rounded-xl">
              <AlertTriangle size={16} className="text-amber-500 shrink-0" />
              <div>
                <div className="text-sm font-medium text-amber-800">Follow-up compliance needs improvement</div>
                <div className="text-xs text-amber-600 mt-0.5">
                  Current: {metrics.follow_up_compliance}% — Consider automated reminders for pending follow-ups
                </div>
              </div>
            </div>
          )}
          {metrics.biopsy_yield >= 25 && metrics.documentation_completeness >= 85 && (
            <div className="flex items-center gap-3 p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
              <CheckCircle size={16} className="text-emerald-500 shrink-0" />
              <div>
                <div className="text-sm font-medium text-emerald-800">Biopsy yield within benchmark range</div>
                <div className="text-xs text-emerald-600 mt-0.5">
                  Current: {metrics.biopsy_yield}% — Meets industry benchmark of 25-35%
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
