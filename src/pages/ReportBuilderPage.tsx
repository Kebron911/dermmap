import { useState, useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, Legend, PieChart, Pie, Cell
} from 'recharts';
import {
  FileText, Download, Filter, Plus, X, Printer,
  ChevronDown, Table, BarChart3, PieChart as PieIcon
} from 'lucide-react';
import { useAppStore } from '../store/appStore';
import jsPDF from 'jspdf';
import clsx from 'clsx';

type ChartType = 'bar' | 'line' | 'pie' | 'table';
type MetricKey = 'visits' | 'lesions' | 'photos' | 'biopsies' | 'malignancies' | 'avg_doc_time';

interface ReportConfig {
  title: string;
  dateRange: { from: string; to: string };
  metrics: MetricKey[];
  groupBy: 'provider' | 'month' | 'location';
  chartType: ChartType;
}

const METRIC_OPTIONS: { id: MetricKey; label: string; color: string }[] = [
  { id: 'visits', label: 'Total Visits', color: '#0D9488' },
  { id: 'lesions', label: 'Lesions Documented', color: '#3B82F6' },
  { id: 'photos', label: 'Photos Captured', color: '#8B5CF6' },
  { id: 'biopsies', label: 'Biopsies Performed', color: '#F59E0B' },
  { id: 'malignancies', label: 'Malignancies Found', color: '#EF4444' },
  { id: 'avg_doc_time', label: 'Avg Doc Time (sec)', color: '#10B981' },
];

const COLORS = ['#0D9488', '#3B82F6', '#F59E0B', '#EF4444', '#10B981', '#8B5CF6', '#EC4899', '#06B6D4'];

export function ReportBuilderPage() {
  const { patients } = useAppStore();

  const [config, setConfig] = useState<ReportConfig>({
    title: 'Practice Performance Report',
    dateRange: {
      from: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      to: new Date().toISOString().split('T')[0],
    },
    metrics: ['visits', 'lesions', 'photos'],
    groupBy: 'provider',
    chartType: 'bar',
  });

  const toggleMetric = (metric: MetricKey) => {
    setConfig(prev => ({
      ...prev,
      metrics: prev.metrics.includes(metric)
        ? prev.metrics.filter(m => m !== metric)
        : [...prev.metrics, metric],
    }));
  };

  // Generate report data from patients
  const reportData = useMemo(() => {
    if (config.groupBy === 'provider') {
      const map = new Map<string, Record<string, number>>();
      patients.forEach(p => {
        p.visits.forEach(v => {
          if (!map.has(v.provider_name)) {
            map.set(v.provider_name, {
              visits: 0, lesions: 0, photos: 0, biopsies: 0, malignancies: 0, avg_doc_time: 0,
            });
          }
          const row = map.get(v.provider_name)!;
          row.visits++;
          row.lesions += v.lesions.length;
          row.photos += v.lesions.reduce((s, l) => s + l.photos.length, 0);
          v.lesions.forEach(l => {
            if (l.action === 'biopsy_performed') row.biopsies++;
            if (l.biopsy_result === 'malignant') row.malignancies++;
          });
          row.avg_doc_time = v.documentation_time_sec || 8;
        });
      });
      return Array.from(map.entries()).map(([name, data]) => ({ name: name.replace('Dr. ', ''), ...data }));
    }

    if (config.groupBy === 'month') {
      const map = new Map<string, Record<string, number>>();
      patients.forEach(p => {
        p.visits.forEach(v => {
          const month = v.visit_date.slice(0, 7); // YYYY-MM
          if (!map.has(month)) {
            map.set(month, { visits: 0, lesions: 0, photos: 0, biopsies: 0, malignancies: 0, avg_doc_time: 0 });
          }
          const row = map.get(month)!;
          row.visits++;
          row.lesions += v.lesions.length;
          row.photos += v.lesions.reduce((s, l) => s + l.photos.length, 0);
          v.lesions.forEach(l => {
            if (l.action === 'biopsy_performed') row.biopsies++;
            if (l.biopsy_result === 'malignant') row.malignancies++;
          });
          row.avg_doc_time = v.documentation_time_sec || 8;
        });
      });
      return Array.from(map.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([month, data]) => ({ name: month, ...data }));
    }

    // location grouping — aggregate all patients into their location bucket (or 'All Locations')
    const map = new Map<string, Record<string, number>>();
    patients.forEach(p => {
      const locationName = (p as { location_id?: string }).location_id ?? 'All Locations';
      if (!map.has(locationName)) {
        map.set(locationName, { visits: 0, lesions: 0, photos: 0, biopsies: 0, malignancies: 0, avg_doc_time: 0 });
      }
      const row = map.get(locationName)!;
      p.visits.forEach(v => {
        row.visits++;
        row.lesions += v.lesions.length;
        row.photos += v.lesions.reduce((s, l) => s + l.photos.length, 0);
        v.lesions.forEach(l => {
          if (l.action === 'biopsy_performed') row.biopsies++;
          if (l.biopsy_result === 'malignant') row.malignancies++;
        });
        row.avg_doc_time = v.documentation_time_sec || 8;
      });
    });
    return Array.from(map.entries()).map(([name, data]) => ({ name, ...data }));
  }, [patients, config.groupBy]);

  const activeMetricColors = config.metrics.map(m => METRIC_OPTIONS.find(o => o.id === m)?.color || '#94a3b8');

  const handleExportCSV = () => {
    const headers = ['Name', ...config.metrics.map(m => METRIC_OPTIONS.find(o => o.id === m)?.label || m)];
    const rows = reportData.map(row => [
      row.name,
      ...config.metrics.map(m => String((row as unknown as Record<string, number>)[m] || 0)),
    ]);
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${config.title.replace(/\s+/g, '_')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportPDF = () => {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'letter' });
    const teal: [number, number, number] = [13, 148, 136];
    const dark: [number, number, number] = [15, 23, 42];
    const medium: [number, number, number] = [71, 85, 105];
    const border: [number, number, number] = [226, 232, 240];
    const white: [number, number, number] = [255, 255, 255];
    const MARGIN = 20;
    const W = 215.9 - MARGIN * 2;

    // Header bar
    doc.setFillColor(...teal);
    doc.rect(0, 0, 215.9, 20, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(...white);
    doc.text('DermMap', MARGIN, 13);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text('PRACTICE ANALYTICS REPORT', 215.9 - MARGIN, 13, { align: 'right' });

    let y = 28;

    // Title
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.setTextColor(...dark);
    doc.text(config.title, MARGIN, y);
    y += 7;

    // Subtitle
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(...medium);
    doc.text(
      `${config.dateRange.from} — ${config.dateRange.to}  ·  Grouped by ${config.groupBy}  ·  Generated ${new Date().toLocaleDateString()}`,
      MARGIN, y
    );
    y += 8;

    // Divider
    doc.setDrawColor(...border);
    doc.setLineWidth(0.4);
    doc.line(MARGIN, y, 215.9 - MARGIN, y);
    y += 8;

    // Summary totals row
    const metricLabels = config.metrics.map(m => METRIC_OPTIONS.find(o => o.id === m)?.label || m);
    const metricTotals = config.metrics.map(m =>
      m === 'avg_doc_time'
        ? Math.round(reportData.reduce((s, r) => s + ((r as unknown as Record<string, number>)[m] || 0), 0) / (reportData.length || 1))
        : reportData.reduce((s, r) => s + ((r as unknown as Record<string, number>)[m] || 0), 0)
    );

    const boxW = W / config.metrics.length;
    config.metrics.forEach((_, i) => {
      const bx = MARGIN + i * boxW;
      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(...border);
      doc.setLineWidth(0.3);
      doc.rect(bx, y, boxW, 16, 'FD');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.setTextColor(...teal);
      doc.text(String(metricTotals[i]), bx + boxW / 2, y + 9, { align: 'center' });
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.5);
      doc.setTextColor(...medium);
      doc.text(metricLabels[i], bx + boxW / 2, y + 14, { align: 'center' });
    });
    y += 22;

    // Section header
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(...dark);
    doc.text('Detailed Breakdown', MARGIN, y);
    doc.setFillColor(...teal);
    doc.rect(MARGIN, y + 1.5, 42, 0.7, 'F');
    y += 8;

    // Table header
    const cols = ['Name', ...metricLabels];
    const colW = [55, ...Array(config.metrics.length).fill((W - 55) / config.metrics.length)];
    doc.setFillColor(15, 23, 42);
    doc.rect(MARGIN, y, W, 7, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(...white);
    let cx = MARGIN;
    cols.forEach((col, i) => {
      doc.text(col.toUpperCase(), cx + (i === 0 ? 3 : colW[i] / 2), y + 4.8, { align: i === 0 ? 'left' : 'center' });
      cx += colW[i];
    });
    y += 7;

    // Table rows
    reportData.forEach((row, ri) => {
      if (y > 265) { doc.addPage(); y = 20; }
      doc.setFillColor(ri % 2 === 0 ? 255 : 248, ri % 2 === 0 ? 255 : 250, ri % 2 === 0 ? 255 : 252);
      doc.setDrawColor(...border);
      doc.setLineWidth(0.2);
      doc.rect(MARGIN, y, W, 8, 'FD');
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(...dark);
      cx = MARGIN;
      [row.name, ...config.metrics.map(m => String((row as unknown as Record<string, number>)[m] ?? 0))].forEach((val, i) => {
        doc.setFont('helvetica', i === 0 ? 'bold' : 'normal');
        doc.text(val, cx + (i === 0 ? 3 : colW[i] / 2), y + 5.5, { align: i === 0 ? 'left' : 'center' });
        cx += colW[i];
      });
      y += 8;
    });

    // Totals row
    doc.setFillColor(13, 148, 136);
    doc.rect(MARGIN, y, W, 8, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(...white);
    cx = MARGIN;
    ['Total', ...metricTotals.map(String)].forEach((val, i) => {
      doc.text(val, cx + (i === 0 ? 3 : colW[i] / 2), y + 5.5, { align: i === 0 ? 'left' : 'center' });
      cx += colW[i];
    });
    y += 12;

    // Footer
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(...medium);
    doc.text('CONFIDENTIAL — FOR INTERNAL USE ONLY', 215.9 / 2, 279.4 - 8, { align: 'center' });

    doc.save(`${config.title.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <FileText size={24} className="text-teal-600" />
            Report Builder
          </h1>
          <p className="text-slate-500 text-sm mt-1">Create custom reports with metrics, charts & export</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleExportCSV}
            className="btn-secondary text-sm"
          >
            <Download size={15} />
            Export CSV
          </button>
          <button
            onClick={handleExportPDF}
            className="btn-primary text-sm"
          >
            <FileText size={15} />
            Export PDF
          </button>
        </div>
      </div>

      {/* Config panel */}
      <div className="card p-5 mb-6">
        <div className="grid grid-cols-4 gap-4">
          {/* Title */}
          <div className="col-span-2">
            <label className="label">Report Title</label>
            <input
              type="text"
              className="input text-sm"
              value={config.title}
              onChange={(e) => setConfig(prev => ({ ...prev, title: e.target.value }))}
            />
          </div>

          {/* Date range */}
          <div>
            <label className="label">From</label>
            <input
              type="date"
              className="input text-sm"
              value={config.dateRange.from}
              onChange={(e) => setConfig(prev => ({ ...prev, dateRange: { ...prev.dateRange, from: e.target.value } }))}
            />
          </div>
          <div>
            <label className="label">To</label>
            <input
              type="date"
              className="input text-sm"
              value={config.dateRange.to}
              onChange={(e) => setConfig(prev => ({ ...prev, dateRange: { ...prev.dateRange, to: e.target.value } }))}
            />
          </div>
        </div>

        {/* Group by */}
        <div className="mt-4">
          <label className="label">Group By</label>
          <div className="flex gap-2">
            {(['provider', 'month', 'location'] as const).map(opt => (
              <button
                key={opt}
                onClick={() => setConfig(prev => ({ ...prev, groupBy: opt }))}
                className={clsx(
                  'px-4 py-2 rounded-lg text-sm font-medium border transition-all',
                  config.groupBy === opt
                    ? 'bg-teal-50 border-teal-300 text-teal-700'
                    : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'
                )}
              >
                {opt.charAt(0).toUpperCase() + opt.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Metrics */}
        <div className="mt-4">
          <label className="label">Metrics</label>
          <div className="flex flex-wrap gap-2">
            {METRIC_OPTIONS.map(opt => (
              <button
                key={opt.id}
                onClick={() => toggleMetric(opt.id)}
                className={clsx(
                  'inline-flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium border transition-all',
                  config.metrics.includes(opt.id)
                    ? 'border-teal-300 bg-teal-50 text-teal-700'
                    : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300'
                )}
              >
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: opt.color }} />
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Chart type */}
        <div className="mt-4">
          <label className="label">Visualization</label>
          <div className="flex gap-2">
            {([
              { id: 'bar' as ChartType, icon: <BarChart3 size={14} />, label: 'Bar Chart' },
              { id: 'line' as ChartType, icon: <BarChart3 size={14} />, label: 'Line Chart' },
              { id: 'pie' as ChartType, icon: <PieIcon size={14} />, label: 'Pie Chart' },
              { id: 'table' as ChartType, icon: <Table size={14} />, label: 'Table' },
            ]).map(opt => (
              <button
                key={opt.id}
                onClick={() => setConfig(prev => ({ ...prev, chartType: opt.id }))}
                className={clsx(
                  'flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium border transition-all',
                  config.chartType === opt.id
                    ? 'bg-teal-50 border-teal-300 text-teal-700'
                    : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'
                )}
              >
                {opt.icon}
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Report output */}
      <div className="card p-6" id="report-output">
        <h2 className="text-xl font-bold text-slate-900 mb-1">{config.title}</h2>
        <p className="text-sm text-slate-500 mb-6">
          {config.dateRange.from} to {config.dateRange.to} · Grouped by {config.groupBy}
        </p>

        {/* Bar chart */}
        {config.chartType === 'bar' && (
          <ResponsiveContainer width="100%" height={350}>
            <BarChart data={reportData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: '#1e293b', border: 'none', borderRadius: '8px', color: '#f1f5f9' }} />
              <Legend iconType="circle" iconSize={8} />
              {config.metrics.map((m, i) => (
                <Bar key={m} dataKey={m} name={METRIC_OPTIONS.find(o => o.id === m)?.label || m} fill={activeMetricColors[i]} radius={[4, 4, 0, 0]} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        )}

        {/* Line chart */}
        {config.chartType === 'line' && (
          <ResponsiveContainer width="100%" height={350}>
            <LineChart data={reportData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: '#1e293b', border: 'none', borderRadius: '8px', color: '#f1f5f9' }} />
              <Legend iconType="circle" iconSize={8} />
              {config.metrics.map((m, i) => (
                <Line key={m} dataKey={m} name={METRIC_OPTIONS.find(o => o.id === m)?.label || m} stroke={activeMetricColors[i]} strokeWidth={2.5} dot={{ fill: activeMetricColors[i], r: 4 }} />
              ))}
            </LineChart>
          </ResponsiveContainer>
        )}

        {/* Pie chart — use first metric */}
        {config.chartType === 'pie' && (
          <div className="flex items-center justify-center">
            <ResponsiveContainer width="100%" height={350}>
              <PieChart>
                <Pie
                  data={reportData.map(r => ({ name: r.name, value: (r as unknown as Record<string, number>)[config.metrics[0]] || 0 }))}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={120}
                  paddingAngle={3}
                  dataKey="value"
                  nameKey="name"
                  label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                >
                  {reportData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ background: '#1e293b', border: 'none', borderRadius: '8px', color: '#f1f5f9' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Table */}
        {config.chartType === 'table' && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">
                    {config.groupBy.charAt(0).toUpperCase() + config.groupBy.slice(1)}
                  </th>
                  {config.metrics.map(m => (
                    <th key={m} className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase">
                      {METRIC_OPTIONS.find(o => o.id === m)?.label || m}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {reportData.map((row, i) => (
                  <tr key={row.name} className={clsx('border-b border-slate-50', i % 2 === 0 ? 'bg-white' : 'bg-slate-50/50')}>
                    <td className="px-4 py-3 font-medium text-slate-900">{row.name}</td>
                    {config.metrics.map(m => (
                      <td key={m} className="px-4 py-3 text-right text-slate-600">
                        {(row as unknown as Record<string, number>)[m] ?? 0}
                      </td>
                    ))}
                  </tr>
                ))}
                {/* Totals */}
                <tr className="border-t-2 border-slate-200 bg-slate-50 font-bold">
                  <td className="px-4 py-3 text-slate-900">Total</td>
                  {config.metrics.map(m => (
                    <td key={m} className="px-4 py-3 text-right text-slate-900">
                      {m === 'avg_doc_time'
                        ? Math.round(reportData.reduce((s, r) => s + ((r as unknown as Record<string, number>)[m] || 0), 0) / (reportData.length || 1))
                        : reportData.reduce((s, r) => s + ((r as unknown as Record<string, number>)[m] || 0), 0)
                      }
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
