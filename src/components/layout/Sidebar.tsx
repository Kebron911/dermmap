import {
  Calendar, Users, Search, Activity, Settings,
  LogOut, BarChart3, ClipboardList, Link, Shield,
  Stethoscope, ChevronRight
} from 'lucide-react';
import { useAppStore } from '../../store/appStore';
import { OfflineStatusDot } from './OfflineBanner';
import clsx from 'clsx';

interface NavItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  roles: string[];
  badge?: string;
}

const navItems: NavItem[] = [
  {
    id: 'schedule',
    label: "Today's Schedule",
    icon: <Calendar size={18} />,
    roles: ['ma', 'provider'],
  },
  {
    id: 'search',
    label: 'Patient Search',
    icon: <Search size={18} />,
    roles: ['ma', 'provider'],
  },
  {
    id: 'queue',
    label: 'Visit Queue',
    icon: <ClipboardList size={18} />,
    roles: ['provider'],
    badge: '3',
  },
  {
    id: 'analytics',
    label: 'Analytics',
    icon: <BarChart3 size={18} />,
    roles: ['admin', 'provider'],
  },
  {
    id: 'users',
    label: 'User Management',
    icon: <Users size={18} />,
    roles: ['admin'],
  },
  {
    id: 'audit',
    label: 'Audit Log',
    icon: <Shield size={18} />,
    roles: ['admin'],
  },
  {
    id: 'ehr',
    label: 'EHR Integration',
    icon: <Link size={18} />,
    roles: ['admin'],
  },
  {
    id: 'settings',
    label: 'Settings',
    icon: <Settings size={18} />,
    roles: ['admin', 'provider', 'ma'],
  },
];

export function Sidebar() {
  const { currentUser, logout, currentPage, setCurrentPage } = useAppStore();
  if (!currentUser) return null;

  const role = currentUser.role;
  const filteredNav = navItems.filter((item) => item.roles.includes(role));

  const roleLabel = {
    ma: 'Medical Assistant',
    provider: 'Provider',
    admin: 'Practice Manager',
  }[role];

  const roleColor = {
    ma: 'bg-sky-100 text-sky-700',
    provider: 'bg-teal-100 text-teal-700',
    admin: 'bg-violet-100 text-violet-700',
  }[role];

  return (
    <aside className="w-60 bg-white border-r border-slate-200 flex flex-col h-full shrink-0">
      {/* Logo */}
      <div className="p-5 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-teal-600 rounded-xl flex items-center justify-center shadow-sm">
            <Stethoscope size={18} className="text-white" />
          </div>
          <div>
            <div className="font-bold text-slate-900 text-sm leading-tight">DermMap</div>
            <div className="text-xs text-slate-400">v2.4.1</div>
          </div>
        </div>
      </div>

      {/* User info */}
      <div className="p-4 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-slate-200 rounded-full flex items-center justify-center text-sm font-semibold text-slate-600">
            {currentUser.name.split(' ').map((n) => n[0]).join('').slice(0, 2)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold text-slate-900 truncate">{currentUser.name}</div>
            <span className={`text-xs font-medium px-1.5 py-0.5 rounded-md ${roleColor}`}>
              {roleLabel}
            </span>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
        {filteredNav.map((item) => {
          const isActive = currentPage === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setCurrentPage(item.id)}
              className={clsx(
                'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-100',
                isActive
                  ? 'bg-teal-50 text-teal-700 shadow-sm'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              )}
            >
              <span className={isActive ? 'text-teal-600' : 'text-slate-400'}>
                {item.icon}
              </span>
              <span className="flex-1 text-left">{item.label}</span>
              {item.badge && (
                <span className="bg-red-500 text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center">
                  {item.badge}
                </span>
              )}
              {isActive && <ChevronRight size={14} className="text-teal-400" />}
            </button>
          );
        })}
      </nav>

      {/* Compliance indicator */}
      <div className="p-4 border-t border-slate-100">
        <OfflineStatusDot />
        <div className="flex items-center gap-2 text-xs text-slate-400 mb-1 mt-2">
          <Activity size={12} className="text-emerald-500" />
          <span className="text-emerald-600 font-medium">All Systems Operational</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-400 mb-3">
          <Shield size={12} className="text-teal-500" />
          <span className="text-teal-600 font-medium">HIPAA · AES-256 · BAA</span>
        </div>
        <button
          onClick={logout}
          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
        >
          <LogOut size={16} />
          Sign Out
        </button>
      </div>
    </aside>
  );
}
