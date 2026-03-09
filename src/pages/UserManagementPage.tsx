import { useState } from 'react';
import { Users, Plus, Edit2, Trash2, Key, Shield, Clock, CheckCircle, XCircle } from 'lucide-react';

const DEMO_USERS_LIST = [
  { id: 'dr-001', name: 'Dr. Sarah Mitchell', email: 'sarah.mitchell@dermclinic.com', role: 'provider', credentials: 'MD, FAAD', status: 'active', lastLogin: '2025-01-08T14:18:00Z', mfa: true },
  { id: 'dr-002', name: 'Dr. James Park', email: 'james.park@dermclinic.com', role: 'provider', credentials: 'MD', status: 'active', lastLogin: '2025-01-07T09:00:00Z', mfa: true },
  { id: 'dr-003', name: 'Dr. Amara Osei', email: 'amara.osei@dermclinic.com', role: 'provider', credentials: 'MD, PhD', status: 'active', lastLogin: '2025-01-06T11:30:00Z', mfa: true },
  { id: 'ma-001', name: 'Alex Johnson', email: 'alex.johnson@dermclinic.com', role: 'ma', credentials: 'CMA', status: 'active', lastLogin: '2025-01-08T14:02:00Z', mfa: true },
  { id: 'ma-002', name: 'Maria Santos', email: 'maria.santos@dermclinic.com', role: 'ma', credentials: 'CMA', status: 'active', lastLogin: '2025-01-08T08:45:00Z', mfa: true },
  { id: 'ma-003', name: 'Casey Rivera', email: 'casey.rivera@dermclinic.com', role: 'ma', credentials: 'MA', status: 'pending', lastLogin: null, mfa: false },
  { id: 'admin-001', name: 'Taylor Brooks', email: 'taylor.brooks@dermclinic.com', role: 'admin', credentials: 'Practice Manager', status: 'active', lastLogin: '2025-01-08T09:00:00Z', mfa: true },
];

const roleColors: Record<string, string> = {
  provider: 'bg-teal-50 text-teal-700 border-teal-200',
  ma: 'bg-sky-50 text-sky-700 border-sky-200',
  admin: 'bg-violet-50 text-violet-700 border-violet-200',
};

const roleLabels: Record<string, string> = {
  provider: 'Provider',
  ma: 'Medical Assistant',
  admin: 'Admin',
};

export function UserManagementPage() {
  const [showAddUser, setShowAddUser] = useState(false);

  return (
    <div className="p-6 max-w-6xl mx-auto fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Users size={22} className="text-teal-600" />
            User Management
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Manage clinician accounts, roles, and access permissions
          </p>
        </div>
        <button
          onClick={() => setShowAddUser(true)}
          className="btn-primary"
        >
          <Plus size={16} />
          Add User
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total Users', value: DEMO_USERS_LIST.length, icon: <Users size={16} />, color: 'text-teal-600 bg-teal-50' },
          { label: 'Active', value: DEMO_USERS_LIST.filter(u => u.status === 'active').length, icon: <CheckCircle size={16} />, color: 'text-emerald-600 bg-emerald-50' },
          { label: 'MFA Enabled', value: DEMO_USERS_LIST.filter(u => u.mfa).length, icon: <Shield size={16} />, color: 'text-blue-600 bg-blue-50' },
          { label: 'Pending Setup', value: DEMO_USERS_LIST.filter(u => u.status === 'pending').length, icon: <Clock size={16} />, color: 'text-amber-600 bg-amber-50' },
        ].map((stat) => (
          <div key={stat.label} className="card p-4 flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${stat.color}`}>{stat.icon}</div>
            <div>
              <div className="text-2xl font-bold text-slate-900">{stat.value}</div>
              <div className="text-xs text-slate-500">{stat.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* User Table */}
      <div className="card overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100">
          <h2 className="font-semibold text-slate-900">All Users</h2>
        </div>
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50">
              {['User', 'Role', 'Status', 'MFA', 'Last Login', 'Actions'].map((h) => (
                <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {DEMO_USERS_LIST.map((user) => (
              <tr key={user.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-5 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-gradient-to-br from-teal-500 to-blue-600 rounded-full flex items-center justify-center text-white text-xs font-semibold">
                      {user.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-slate-900">{user.name}</div>
                      <div className="text-xs text-slate-400">{user.email}</div>
                    </div>
                  </div>
                </td>
                <td className="px-5 py-4">
                  <div className="flex flex-col gap-1">
                    <span className={`inline-flex text-xs font-medium px-2 py-0.5 rounded-full border w-fit ${roleColors[user.role]}`}>
                      {roleLabels[user.role]}
                    </span>
                    {user.credentials && (
                      <span className="text-xs text-slate-400">{user.credentials}</span>
                    )}
                  </div>
                </td>
                <td className="px-5 py-4">
                  {user.status === 'active' ? (
                    <span className="flex items-center gap-1.5 text-xs font-medium text-emerald-700">
                      <div className="w-2 h-2 bg-emerald-400 rounded-full" />
                      Active
                    </span>
                  ) : (
                    <span className="flex items-center gap-1.5 text-xs font-medium text-amber-700">
                      <div className="w-2 h-2 bg-amber-400 rounded-full animate-pulse" />
                      Pending Setup
                    </span>
                  )}
                </td>
                <td className="px-5 py-4">
                  {user.mfa ? (
                    <span className="flex items-center gap-1.5 text-xs text-emerald-600">
                      <CheckCircle size={14} />
                      Enabled
                    </span>
                  ) : (
                    <span className="flex items-center gap-1.5 text-xs text-red-500">
                      <XCircle size={14} />
                      Required
                    </span>
                  )}
                </td>
                <td className="px-5 py-4 text-xs text-slate-500">
                  {user.lastLogin
                    ? new Date(user.lastLogin).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
                    : <span className="text-slate-300">Never</span>
                  }
                </td>
                <td className="px-5 py-4">
                  <div className="flex items-center gap-1">
                    <button className="p-1.5 hover:bg-blue-50 rounded-lg text-slate-400 hover:text-blue-600 transition-colors" title="Edit user">
                      <Edit2 size={14} />
                    </button>
                    <button className="p-1.5 hover:bg-amber-50 rounded-lg text-slate-400 hover:text-amber-600 transition-colors" title="Reset credentials">
                      <Key size={14} />
                    </button>
                    <button className="p-1.5 hover:bg-red-50 rounded-lg text-slate-400 hover:text-red-600 transition-colors" title="Deactivate user">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Security Policy */}
      <div className="mt-4 card p-4 bg-slate-50">
        <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
          <Shield size={14} className="text-teal-600" />
          Password & Security Policy
        </h3>
        <div className="grid grid-cols-3 gap-4 text-xs text-slate-600">
          <div className="flex items-start gap-2">
            <CheckCircle size={12} className="text-emerald-500 mt-0.5 shrink-0" />
            <span>Minimum 12 characters, mixed case, number, symbol required</span>
          </div>
          <div className="flex items-start gap-2">
            <CheckCircle size={12} className="text-emerald-500 mt-0.5 shrink-0" />
            <span>MFA mandatory for all users — HIPAA requirement</span>
          </div>
          <div className="flex items-start gap-2">
            <CheckCircle size={12} className="text-emerald-500 mt-0.5 shrink-0" />
            <span>Account locked after 5 failed login attempts</span>
          </div>
          <div className="flex items-start gap-2">
            <CheckCircle size={12} className="text-emerald-500 mt-0.5 shrink-0" />
            <span>Session timeout: 5 min (mobile), 15 min (web)</span>
          </div>
          <div className="flex items-start gap-2">
            <CheckCircle size={12} className="text-emerald-500 mt-0.5 shrink-0" />
            <span>No shared logins — individual accounts only</span>
          </div>
          <div className="flex items-start gap-2">
            <CheckCircle size={12} className="text-emerald-500 mt-0.5 shrink-0" />
            <span>All login events logged in immutable audit trail</span>
          </div>
        </div>
      </div>
    </div>
  );
}
