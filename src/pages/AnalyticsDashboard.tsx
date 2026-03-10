import { useState, useEffect } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, Legend, AreaChart, Area
} from 'recharts';
import { TrendingUp, Clock, Camera, Users, Activity, Download, FileText, BarChart3 } from 'lucide-react';
import { CLINIC_STATS } from '../data/syntheticData';
import { config } from '../config';
import { api } from '../services/api';
import type { ClinicStats } from '../types';

const COLORS = ['#0D9488', '#3B82F6', '#F59E0B', '#EF4444', '#10B981', '#8B5CF6'];

const roiData = [
  { providers: 1, timeSaved: 62, costSaved: 8400 },
  { providers: 2, timeSaved: 124, costSaved: 16800 },
  { providers: 3, timeSaved: 186, costSaved: 25200 },
  { providers: 5, timeSaved: 310, costSaved: 42000 },
  { providers: 10, timeSaved: 620, costSaved: 84000 },
];

export function AnalyticsDashboard() {
  const [stats, setStats] = useState<ClinicStats>(CLINIC_STATS);
  const [loading, setLoading] = useState(!config.isDemo);

  useEffect(() => {
    if (config.isDemo) return; // demo mode: use CLINIC_STATS as-is
    api.get<ClinicStats>('/analytics')
      .then(data => setStats(data))
      .catch(() => { /* keep CLINIC_STATS fallback */ })
      .finally(() => setLoading(false));
  }, []);

  const metricCards = [
    {
      label: 'Total Visits Documented',
      value: stats.total_visits.toLocaleString(),
      icon: <Activity size={20} />,
      color: 'text-teal-600 bg-teal-50',
      change: '+18.4%',
      changeColor: 'text-emerald-600',
    },
    {
      label: 'Avg. Documentation Time',
      value: `${stats.avg_documentation_time_sec}s`,
      icon: <Clock size={20} />,
      color: 'text-blue-600 bg-blue-50',
      change: 'vs. 8-12 min paper',
      changeColor: 'text-blue-600',
    },
    {
      label: 'Total Photos Captured',
      value: stats.total_photos.toLocaleString(),
      icon: <Camera size={20} />,
      color: 'text-violet-600 bg-violet-50',
      change: '+24.1%',
      changeColor: 'text-emerald-600',
    },
    {
      label: 'Avg. Lesions / Visit',
      value: stats.avg_lesions_per_visit.toString(),
      icon: <Users size={20} />,
      color: 'text-amber-600 bg-amber-50',
      change: '4.1 avg industry: 2.8',
      changeColor: 'text-amber-600',
    },
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <BarChart3 size={24} className="text-teal-600" />
            Analytics Dashboard
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            {loading ? 'Loading live data…' : 'Comprehensive practice performance metrics — last 6 months'}
          </p>
        </div>
        <div className="flex gap-2">
          <button className="btn-secondary text-sm">
            <Download size={15} />
            Export CSV
          </button>
          <button className="btn-primary text-sm">
            <FileText size={15} />
            Generate Report
          </button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {metricCards.map((card) => (
          <div key={card.label} className="card p-5">
            <div className="flex items-center justify-between mb-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${card.color}`}>
                {card.icon}
              </div>
              <span className={`text-xs font-medium ${card.changeColor}`}>{card.change}</span>
            </div>
            <div className="text-2xl font-bold text-slate-900">{card.value}</div>
            <div className="text-xs text-slate-500 mt-1">{card.label}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-6 mb-6">
        {/* Visits Over Time */}
        <div className="col-span-2 card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-slate-900">Visit Volume by Month</h3>
            <div className="flex items-center gap-1 text-xs text-emerald-600 font-medium bg-emerald-50 px-2 py-1 rounded-lg">
              <TrendingUp size={12} />
              +23.4% YoY
            </div>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={stats.visits_by_day}>
              <defs>
                <linearGradient id="visitGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#0D9488" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#0D9488" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ background: '#1e293b', border: 'none', borderRadius: '8px', color: '#f1f5f9' }}
                labelStyle={{ color: '#94a3b8' }}
              />
              <Area type="monotone" dataKey="count" stroke="#0D9488" strokeWidth={2.5} fill="url(#visitGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Lesion Outcomes */}
        <div className="card p-5">
          <h3 className="font-semibold text-slate-900 mb-4">Lesion Outcomes</h3>
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie
                data={stats.lesion_outcomes}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={80}
                paddingAngle={2}
                dataKey="count"
                nameKey="status"
              >
                {stats.lesion_outcomes.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ background: '#1e293b', border: 'none', borderRadius: '8px', color: '#f1f5f9' }}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="space-y-1.5 mt-2">
            {stats.lesion_outcomes.map((item, i) => (
              <div key={item.status} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                  <span className="text-slate-600">{item.status}</span>
                </div>
                <span className="font-semibold text-slate-800">{item.count.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6 mb-6">
        {/* Provider Adoption */}
        <div className="card p-5">
          <h3 className="font-semibold text-slate-900 mb-4">Provider Adoption</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={stats.provider_adoption} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
              <XAxis type="number" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <YAxis dataKey="name" type="category" width={90} tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ background: '#1e293b', border: 'none', borderRadius: '8px', color: '#f1f5f9' }}
              />
              <Legend iconType="circle" iconSize={8} />
              <Bar dataKey="visits" name="Visits" fill="#0D9488" radius={[0, 4, 4, 0]} />
              <Bar dataKey="photos" name="Photos" fill="#3B82F6" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* ROI Calculator */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-slate-900">ROI Projection</h3>
            <span className="badge-green">Interactive</span>
          </div>
          <div className="bg-gradient-to-br from-teal-50 to-blue-50 rounded-xl p-4 mb-4">
            <div className="text-center">
              <div className="text-3xl font-bold text-teal-700">$25,200</div>
              <div className="text-xs text-slate-500 mt-1">Estimated annual value — 3 providers</div>
            </div>
            <div className="grid grid-cols-2 gap-3 mt-4">
              <div className="bg-white rounded-lg p-3 text-center">
                <div className="text-lg font-bold text-slate-900">186 hrs</div>
                <div className="text-xs text-slate-500">Time saved / year</div>
              </div>
              <div className="bg-white rounded-lg p-3 text-center">
                <div className="text-lg font-bold text-slate-900">~28 days</div>
                <div className="text-xs text-slate-500">Equivalent MA time</div>
              </div>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={120}>
            <LineChart data={roiData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="providers" label={{ value: 'Providers', position: 'insideBottom', offset: -2, fontSize: 10 }} tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
              <Tooltip
                contentStyle={{ background: '#1e293b', border: 'none', borderRadius: '8px', color: '#f1f5f9' }}
                formatter={(v: number) => [`$${v.toLocaleString()}`, 'Annual Value']}
              />
              <Line type="monotone" dataKey="costSaved" stroke="#0D9488" strokeWidth={2.5} dot={{ fill: '#0D9488', r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Documentation time comparison */}
      <div className="card p-5">
        <h3 className="font-semibold text-slate-900 mb-4">Documentation Time Comparison</h3>
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center p-6 bg-slate-50 rounded-xl">
            <div className="text-4xl font-bold text-slate-300 mb-2">8-12 min</div>
            <div className="text-sm font-medium text-slate-500">Traditional EHR</div>
            <div className="text-xs text-slate-400 mt-1">Manual entry, no photo integration</div>
          </div>
          <div className="relative text-center p-6 bg-teal-600 rounded-xl text-white shadow-lg">
            <div className="absolute -top-2 inset-x-0 flex justify-center">
              <span className="bg-amber-400 text-amber-900 text-xs font-bold px-3 py-0.5 rounded-full">DermMap</span>
            </div>
            <div className="text-4xl font-bold mb-2">7.8s</div>
            <div className="text-sm font-medium text-teal-100">Average Documentation</div>
            <div className="text-xs text-teal-300 mt-1">Photo + structured data + body map</div>
          </div>
          <div className="text-center p-6 bg-slate-50 rounded-xl">
            <div className="text-4xl font-bold text-emerald-600 mb-2">98%</div>
            <div className="text-sm font-medium text-slate-500">Time Reduction</div>
            <div className="text-xs text-slate-400 mt-1">vs. traditional workflow</div>
          </div>
        </div>
      </div>
    </div>
  );
}
