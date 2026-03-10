import { useState, useEffect, useCallback } from 'react';
import { Users, Plus, Edit2, Trash2, Key, Shield, Clock, CheckCircle, XCircle, Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import { api } from '../services/api';

interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: string;
  credentials: string | null;
  status: string;
  last_login_at: string | null;
  mfa?: boolean;
}

const FALLBACK_USERS: AdminUser[] = [
  { id: 'dr-001', name: 'Dr. Sarah Mitchell', email: 'sarah.mitchell@dermclinic.com', role: 'provider', credentials: 'MD, FAAD', status: 'active', last_login_at: '2025-01-08T14:18:00Z', mfa: true },
  { id: 'dr-002', name: 'Dr. James Park', email: 'james.park@dermclinic.com', role: 'provider', credentials: 'MD', status: 'active', last_login_at: '2025-01-07T09:00:00Z', mfa: true },
  { id: 'dr-003', name: 'Dr. Amara Osei', email: 'amara.osei@dermclinic.com', role: 'provider', credentials: 'MD, PhD', status: 'active', last_login_at: '2025-01-06T11:30:00Z', mfa: true },
  { id: 'ma-001', name: 'Alex Johnson', email: 'alex.johnson@dermclinic.com', role: 'ma', credentials: 'CMA', status: 'active', last_login_at: '2025-01-08T14:02:00Z', mfa: true },
  { id: 'ma-002', name: 'Maria Santos', email: 'maria.santos@dermclinic.com', role: 'ma', credentials: 'CMA', status: 'active', last_login_at: '2025-01-08T08:45:00Z', mfa: true },
  { id: 'ma-003', name: 'Casey Rivera', email: 'casey.rivera@dermclinic.com', role: 'ma', credentials: 'MA', status: 'pending', last_login_at: null, mfa: false },
  { id: 'admin-001', name: 'Taylor Brooks', email: 'taylor.brooks@dermclinic.com', role: 'manager', credentials: 'Practice Manager', status: 'active', last_login_at: '2025-01-08T09:00:00Z', mfa: true },
];

const roleColors: Record<string, string> = {
  provider: 'bg-teal-50 text-teal-700 border-teal-200',
  ma: 'bg-sky-50 text-sky-700 border-sky-200',
  manager: 'bg-violet-50 text-violet-700 border-violet-200',
};

const roleLabels: Record<string, string> = {
  provider: 'Provider',
  ma: 'Medical Assistant',
  manager: 'Practice Manager',
};

const emptyForm = { name: '', email: '', password: '', role: 'ma', credentials: '' };

export function UserManagementPage() {
  const [users, setUsers] = useState<AdminUser[]>(FALLBACK_USERS);
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const [showAddUser, setShowAddUser] = useState(false);
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null);
  const [deactivatingId, setDeactivatingId] = useState<string | null>(null);
  const [resetPasswordId, setResetPasswordId] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [addForm, setAddForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setApiError(null);
    try {
      const data = await api.get<AdminUser[]>('/api/admin/users');
      setUsers(data);
    } catch {
      setApiError('Could not reach API — showing demo data.');
      setUsers(FALLBACK_USERS);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const handleAddUser = async () => {
    if (!addForm.name || !addForm.email || !addForm.password) return;
    setSaving(true);
    try {
      const created = await api.post<AdminUser>('/api/admin/users', addForm);
      setUsers(prev => [created, ...prev]);
      setShowAddUser(false);
      setAddForm(emptyForm);
      showToast(`${created.name} added successfully.`);
    } catch (e: unknown) {
      showToast((e as Error).message || 'Failed to create user.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleEditSave = async () => {
    if (!editingUser) return;
    setSaving(true);
    try {
      const updated = await api.patch<AdminUser>(`/api/admin/users/${editingUser.id}`, {
        name: editingUser.name,
        role: editingUser.role,
        credentials: editingUser.credentials,
      });
      setUsers(prev => prev.map(u => u.id === updated.id ? { ...u, ...updated } : u));
      setEditingUser(null);
      showToast('User updated.');
    } catch (e: unknown) {
      showToast((e as Error).message || 'Failed to update user.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDeactivate = async (id: string) => {
    setSaving(true);
    try {
      await api.delete(`/api/admin/users/${id}`);
      setUsers(prev => prev.map(u => u.id === id ? { ...u, status: 'inactive' } : u));
      setDeactivatingId(null);
      showToast('User deactivated.');
    } catch (e: unknown) {
      showToast((e as Error).message || 'Failed to deactivate user.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleResetPassword = async () => {
    if (!resetPasswordId || newPassword.length < 12) return;
    setSaving(true);
    try {
      await api.post(`/api/admin/users/${resetPasswordId}/reset-password`, { newPassword });
      setResetPasswordId(null);
      setNewPassword('');
      showToast('Password reset successfully.');
    } catch (e: unknown) {
      showToast((e as Error).message || 'Failed to reset password.', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto fade-in">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-sm font-medium fade-in ${toast.type === 'success' ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'}`}>
          {toast.type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
          {toast.msg}
        </div>
      )}

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
        <div className="flex gap-2">
          <button onClick={fetchUsers} className="btn-secondary text-sm" title="Refresh">
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
          <button onClick={() => setShowAddUser(true)} className="btn-primary">
            <Plus size={16} />
            Add User
          </button>
        </div>
      </div>

      {/* API warning banner */}
      {apiError && (
        <div className="mb-4 flex items-center gap-2 bg-amber-50 border border-amber-200 text-amber-800 text-sm px-4 py-3 rounded-xl">
          <AlertCircle size={16} className="shrink-0" />
          {apiError}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total Users', value: users.length, icon: <Users size={16} />, color: 'text-teal-600 bg-teal-50' },
          { label: 'Active', value: users.filter(u => u.status === 'active').length, icon: <CheckCircle size={16} />, color: 'text-emerald-600 bg-emerald-50' },
          { label: 'MFA Enabled', value: users.filter(u => u.mfa !== false).length, icon: <Shield size={16} />, color: 'text-blue-600 bg-blue-50' },
          { label: 'Pending Setup', value: users.filter(u => u.status === 'pending').length, icon: <Clock size={16} />, color: 'text-amber-600 bg-amber-50' },
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
        {loading ? (
          <div className="flex items-center justify-center py-16 text-slate-400">
            <Loader2 size={24} className="animate-spin mr-2" /> Loading users…
          </div>
        ) : (
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50">
              {['User', 'Role', 'Status', 'MFA', 'Last Login', 'Actions'].map((h) => (
                <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {users.map((user) => (
              <tr key={user.id} className={`hover:bg-slate-50 transition-colors ${user.status === 'inactive' ? 'opacity-50' : ''}`}>
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
                    <span className={`inline-flex text-xs font-medium px-2 py-0.5 rounded-full border w-fit ${roleColors[user.role] || 'bg-slate-50 text-slate-600 border-slate-200'}`}>
                      {roleLabels[user.role] || user.role}
                    </span>
                    {user.credentials && (
                      <span className="text-xs text-slate-400">{user.credentials}</span>
                    )}
                  </div>
                </td>
                <td className="px-5 py-4">
                  {user.status === 'active' ? (
                    <span className="flex items-center gap-1.5 text-xs font-medium text-emerald-700">
                      <div className="w-2 h-2 bg-emerald-400 rounded-full" />Active
                    </span>
                  ) : user.status === 'pending' ? (
                    <span className="flex items-center gap-1.5 text-xs font-medium text-amber-700">
                      <div className="w-2 h-2 bg-amber-400 rounded-full animate-pulse" />Pending Setup
                    </span>
                  ) : (
                    <span className="flex items-center gap-1.5 text-xs font-medium text-slate-400">
                      <div className="w-2 h-2 bg-slate-300 rounded-full" />Inactive
                    </span>
                  )}
                </td>
                <td className="px-5 py-4">
                  {user.mfa !== false ? (
                    <span className="flex items-center gap-1.5 text-xs text-emerald-600"><CheckCircle size={14} />Enabled</span>
                  ) : (
                    <span className="flex items-center gap-1.5 text-xs text-red-500"><XCircle size={14} />Required</span>
                  )}
                </td>
                <td className="px-5 py-4 text-xs text-slate-500">
                  {user.last_login_at
                    ? new Date(user.last_login_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
                    : <span className="text-slate-300">Never</span>}
                </td>
                <td className="px-5 py-4">
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setEditingUser({ ...user })}
                      className="p-1.5 hover:bg-blue-50 rounded-lg text-slate-400 hover:text-blue-600 transition-colors"
                      title="Edit user"
                    >
                      <Edit2 size={14} />
                    </button>
                    <button
                      onClick={() => { setResetPasswordId(user.id); setNewPassword(''); }}
                      className="p-1.5 hover:bg-amber-50 rounded-lg text-slate-400 hover:text-amber-600 transition-colors"
                      title="Reset credentials"
                    >
                      <Key size={14} />
                    </button>
                    {user.status !== 'inactive' && (
                      <button
                        onClick={() => setDeactivatingId(user.id)}
                        className="p-1.5 hover:bg-red-50 rounded-lg text-slate-400 hover:text-red-600 transition-colors"
                        title="Deactivate user"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        )}
      </div>

      {/* Security Policy */}
      <div className="mt-4 card p-4 bg-slate-50">
        <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
          <Shield size={14} className="text-teal-600" />
          Password & Security Policy
        </h3>
        <div className="grid grid-cols-3 gap-4 text-xs text-slate-600">
          {[
            'Minimum 12 characters, mixed case, number, symbol required',
            'MFA mandatory for all users — HIPAA requirement',
            'Account locked after 5 failed login attempts',
            'Session timeout: 5 min (mobile), 15 min (web)',
            'No shared logins — individual accounts only',
            'All login events logged in immutable audit trail',
          ].map(txt => (
            <div key={txt} className="flex items-start gap-2">
              <CheckCircle size={12} className="text-emerald-500 mt-0.5 shrink-0" />
              <span>{txt}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Add User Modal */}
      {showAddUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6">
            <h3 className="font-bold text-slate-900 text-lg mb-4 flex items-center gap-2">
              <Plus size={18} className="text-teal-600" /> Add New User
            </h3>
            <div className="space-y-3">
              <div>
                <label className="label">Full Name</label>
                <input className="input text-sm" value={addForm.name} onChange={e => setAddForm(p => ({ ...p, name: e.target.value }))} placeholder="Dr. Jane Smith" />
              </div>
              <div>
                <label className="label">Email</label>
                <input className="input text-sm" type="email" value={addForm.email} onChange={e => setAddForm(p => ({ ...p, email: e.target.value }))} placeholder="jane.smith@clinic.com" />
              </div>
              <div>
                <label className="label">Role</label>
                <select className="input text-sm" value={addForm.role} onChange={e => setAddForm(p => ({ ...p, role: e.target.value }))}>
                  <option value="ma">Medical Assistant</option>
                  <option value="provider">Provider</option>
                  <option value="manager">Practice Manager</option>
                </select>
              </div>
              <div>
                <label className="label">Credentials (optional)</label>
                <input className="input text-sm" value={addForm.credentials} onChange={e => setAddForm(p => ({ ...p, credentials: e.target.value }))} placeholder="MD, FAAD" />
              </div>
              <div>
                <label className="label">Temporary Password</label>
                <input className="input text-sm" type="password" value={addForm.password} onChange={e => setAddForm(p => ({ ...p, password: e.target.value }))} placeholder="Min 12 characters" />
                {addForm.password.length > 0 && addForm.password.length < 12 && (
                  <p className="text-xs text-red-500 mt-1">Password must be at least 12 characters</p>
                )}
              </div>
            </div>
            <div className="flex gap-2 mt-5">
              <button onClick={() => { setShowAddUser(false); setAddForm(emptyForm); }} className="btn-secondary flex-1 justify-center">Cancel</button>
              <button
                onClick={handleAddUser}
                disabled={saving || !addForm.name || !addForm.email || addForm.password.length < 12}
                className="btn-primary flex-1 justify-center disabled:opacity-50"
              >
                {saving ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                {saving ? 'Adding…' : 'Add User'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {editingUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6">
            <h3 className="font-bold text-slate-900 text-lg mb-4 flex items-center gap-2">
              <Edit2 size={18} className="text-blue-600" /> Edit User
            </h3>
            <div className="space-y-3">
              <div>
                <label className="label">Full Name</label>
                <input className="input text-sm" value={editingUser.name} onChange={e => setEditingUser(p => p ? { ...p, name: e.target.value } : p)} />
              </div>
              <div>
                <label className="label">Role</label>
                <select className="input text-sm" value={editingUser.role} onChange={e => setEditingUser(p => p ? { ...p, role: e.target.value } : p)}>
                  <option value="ma">Medical Assistant</option>
                  <option value="provider">Provider</option>
                  <option value="manager">Practice Manager</option>
                </select>
              </div>
              <div>
                <label className="label">Credentials</label>
                <input className="input text-sm" value={editingUser.credentials || ''} onChange={e => setEditingUser(p => p ? { ...p, credentials: e.target.value } : p)} />
              </div>
            </div>
            <div className="flex gap-2 mt-5">
              <button onClick={() => setEditingUser(null)} className="btn-secondary flex-1 justify-center">Cancel</button>
              <button onClick={handleEditSave} disabled={saving} className="btn-primary flex-1 justify-center disabled:opacity-50">
                {saving ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle size={14} />}
                {saving ? 'Saving…' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Deactivate Confirm */}
      {deactivatingId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6 text-center">
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <Trash2 size={22} className="text-red-600" />
            </div>
            <h3 className="font-bold text-slate-900 mb-2">Deactivate User?</h3>
            <p className="text-sm text-slate-500 mb-5">This will revoke their access. The account is not deleted — the audit trail is preserved per HIPAA requirements.</p>
            <div className="flex gap-2">
              <button onClick={() => setDeactivatingId(null)} className="btn-secondary flex-1 justify-center">Cancel</button>
              <button onClick={() => handleDeactivate(deactivatingId)} disabled={saving} className="flex-1 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium text-sm disabled:opacity-50">
                {saving ? 'Deactivating…' : 'Deactivate'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reset Password Modal */}
      {resetPasswordId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6">
            <h3 className="font-bold text-slate-900 text-lg mb-4 flex items-center gap-2">
              <Key size={18} className="text-amber-600" /> Reset Password
            </h3>
            <div>
              <label className="label">New Password</label>
              <input className="input text-sm" type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="Min 12 characters" />
              {newPassword.length > 0 && newPassword.length < 12 && (
                <p className="text-xs text-red-500 mt-1">Password must be at least 12 characters</p>
              )}
            </div>
            <div className="flex gap-2 mt-5">
              <button onClick={() => setResetPasswordId(null)} className="btn-secondary flex-1 justify-center">Cancel</button>
              <button onClick={handleResetPassword} disabled={saving || newPassword.length < 12} className="btn-primary flex-1 justify-center disabled:opacity-50">
                {saving ? 'Resetting…' : 'Reset Password'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

