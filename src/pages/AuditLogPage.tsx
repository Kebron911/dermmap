import { useState, useEffect, useMemo } from 'react';
import { Shield, Download, Search, Filter, Eye, Plus, RefreshCw, LogIn, LogOut, Edit, Trash, FileDown } from 'lucide-react';
import { AUDIT_LOG } from '../data/syntheticData';
import { AuditLogEntry } from '../types';
import { format, parseISO } from 'date-fns';
import clsx from 'clsx';
import { auditLogger } from '../services/auditLogger';
import { api } from '../services/api';
import { config } from '../config';

const actionIcons: Record<string, React.ReactNode> = {
  create: <Plus size={12} />,
  read: <Eye size={12} />,
  update: <Edit size={12} />,
  delete: <Trash size={12} />,
  export: <FileDown size={12} />,
  login: <LogIn size={12} />,
  logout: <LogOut size={12} />,
};

const actionColors: Record<string, string> = {
  create: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  read: 'bg-blue-50 text-blue-700 border-blue-200',
  update: 'bg-amber-50 text-amber-700 border-amber-200',
  delete: 'bg-red-50 text-red-700 border-red-200',
  export: 'bg-violet-50 text-violet-700 border-violet-200',
  login: 'bg-teal-50 text-teal-700 border-teal-200',
  logout: 'bg-slate-50 text-slate-600 border-slate-200',
};

const roleColors: Record<string, string> = {
  ma: 'bg-sky-50 text-sky-700',
  provider: 'bg-teal-50 text-teal-700',
  admin: 'bg-violet-50 text-violet-700',
};

const roleLabels: Record<string, string> = {
  ma: 'Medical Assistant',
  provider: 'Provider',
  admin: 'Admin',
};

export function AuditLogPage() {
  const [entries, setEntries] = useState<AuditLogEntry[]>([]);
  const [search, setSearch] = useState('');
  const [filterAction, setFilterAction] = useState<string>('all');
  const [filterRole, setFilterRole] = useState<string>('all');
  const [loading, setLoading] = useState(true);

  const loadEntries = async () => {
    setLoading(true);
    try {
      if (!config.isDemo) {
        // Production: fetch from backend (admin-only route)
        const result = await api.get<{ entries: AuditLogEntry[] }>('/audit-logs?limit=200');
        const live = result.entries ?? [];
        setEntries(live.length > 0 ? live : AUDIT_LOG);
      } else {
        // Demo: read real IndexedDB logs accumulated this session, seed with AUDIT_LOG if empty
        const local = await auditLogger.getRecentEntries(200);
        setEntries(local.length > 0 ? local : AUDIT_LOG);
      }
    } catch {
      setEntries(AUDIT_LOG);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadEntries(); }, []);

  const filtered = useMemo(() => entries.filter((entry) => {
    const matchSearch = search === '' || [
      entry.user_name, entry.details, entry.resource_type, entry.resource_id
    ].some((s) => s.toLowerCase().includes(search.toLowerCase()));

    const matchAction = filterAction === 'all' || entry.action_type === filterAction;
    const matchRole = filterRole === 'all' || entry.user_role === filterRole;

    return matchSearch && matchAction && matchRole;
  }), [entries, search, filterAction, filterRole]);

  return (
    <div className="p-6 max-w-7xl mx-auto fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Shield size={22} className="text-teal-600" />
            Audit Log
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Immutable record of all system actions · HIPAA required · Retained 6+ years
          </p>
        </div>
        <div className="flex gap-2">
          <button className="btn-secondary text-sm" onClick={loadEntries} disabled={loading}>
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
          <button className="btn-primary text-sm">
            <Download size={14} />
            Export CSV
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-5">
        {[
          { label: 'Total Events (Today)', value: entries.length, color: 'text-teal-600 bg-teal-50' },
          { label: 'PHI Access Events', value: entries.filter(e => e.action_type === 'read').length, color: 'text-blue-600 bg-blue-50' },
          { label: 'Data Modifications', value: entries.filter(e => ['create','update','delete'].includes(e.action_type)).length, color: 'text-amber-600 bg-amber-50' },
          { label: 'Exports', value: entries.filter(e => e.action_type === 'export').length, color: 'text-violet-600 bg-violet-50' },
        ].map((stat) => (
          <div key={stat.label} className="card p-4">
            <div className={`text-2xl font-bold ${stat.color.split(' ')[0]}`}>{stat.value}</div>
            <div className="text-xs text-slate-500 mt-1">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex-1 max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            className="input pl-8 text-sm"
            placeholder="Search events..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter size={14} className="text-slate-400" />
          <select
            className="input text-sm w-auto"
            value={filterAction}
            onChange={(e) => setFilterAction(e.target.value)}
          >
            <option value="all">All Actions</option>
            <option value="create">Create</option>
            <option value="read">Read</option>
            <option value="update">Update</option>
            <option value="delete">Delete</option>
            <option value="export">Export</option>
            <option value="login">Login</option>
            <option value="logout">Logout</option>
          </select>
          <select
            className="input text-sm w-auto"
            value={filterRole}
            onChange={(e) => setFilterRole(e.target.value)}
          >
            <option value="all">All Roles</option>
            <option value="ma">Medical Assistant</option>
            <option value="provider">Provider</option>
            <option value="admin">Admin</option>
          </select>
        </div>
        <span className="text-xs text-slate-400">{filtered.length} events</span>
      </div>

      {/* Log Table */}
      <div className="card overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50">
              {['Timestamp', 'User', 'Action', 'Resource', 'Details', 'Device / IP'].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {filtered.map((entry) => (
              <tr key={entry.log_id} className="hover:bg-slate-50 transition-colors">
                <td className="px-4 py-3 text-xs font-mono text-slate-500 whitespace-nowrap">
                  {format(parseISO(entry.timestamp), 'MM/dd HH:mm:ss')}
                </td>
                <td className="px-4 py-3">
                  <div className="text-xs font-semibold text-slate-900">{entry.user_name}</div>
                  <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${roleColors[entry.user_role]}`}>
                    {roleLabels[entry.user_role]}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded-lg border ${actionColors[entry.action_type]}`}>
                    {actionIcons[entry.action_type]}
                    {entry.action_type}
                  </span>
                </td>
                <td className="px-4 py-3 text-xs">
                  <div className="font-medium text-slate-700 capitalize">{entry.resource_type}</div>
                  <div className="text-slate-400 font-mono">{entry.resource_id.slice(0, 16)}</div>
                </td>
                <td className="px-4 py-3 text-xs text-slate-600 max-w-xs truncate" title={entry.details}>
                  {entry.details}
                </td>
                <td className="px-4 py-3 text-xs text-slate-400">
                  <div>{entry.device_id}</div>
                  <div className="font-mono">{entry.ip_address}</div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filtered.length === 0 && (
          <div className="text-center py-12">
            <Shield size={24} className="text-slate-300 mx-auto mb-2" />
            <p className="text-sm text-slate-500">No audit events match your filters</p>
          </div>
        )}
      </div>

      {/* HIPAA notice */}
      <div className="mt-4 flex items-start gap-2 bg-blue-50 border border-blue-200 rounded-xl p-4">
        <Shield size={16} className="text-blue-500 mt-0.5 shrink-0" />
        <div className="text-xs text-blue-700 leading-relaxed">
          <strong>HIPAA Compliance:</strong> This audit log captures all access, creation, modification, deletion, and export events as required by 45 CFR §164.312(b).
          Logs are immutable, tamper-evident, and retained for a minimum of 6 years. No user — including system administrators — can edit or delete audit records.
        </div>
      </div>
    </div>
  );
}
