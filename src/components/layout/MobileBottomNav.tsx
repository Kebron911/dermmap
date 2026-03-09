import {
  Calendar, Search, ClipboardList, BarChart3,
  Users, Shield, Settings, Link,
} from 'lucide-react';
import { useAppStore } from '../../store/appStore';
import clsx from 'clsx';

interface NavItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  roles: string[];
  badge?: string;
}

const navItems: NavItem[] = [
  { id: 'schedule', label: 'Schedule', icon: <Calendar size={22} />, roles: ['ma', 'provider'] },
  { id: 'search',   label: 'Patients', icon: <Search size={22} />,   roles: ['ma', 'provider'] },
  { id: 'queue',    label: 'Queue',    icon: <ClipboardList size={22} />, roles: ['provider'], badge: '3' },
  { id: 'analytics',label: 'Analytics',icon: <BarChart3 size={22} />, roles: ['admin', 'provider'] },
  { id: 'users',    label: 'Users',    icon: <Users size={22} />,    roles: ['admin'] },
  { id: 'audit',    label: 'Audit',    icon: <Shield size={22} />,   roles: ['admin'] },
  { id: 'ehr',      label: 'EHR',      icon: <Link size={22} />,     roles: ['admin'] },
  { id: 'settings', label: 'Settings', icon: <Settings size={22} />, roles: ['admin', 'provider', 'ma'] },
];

export function MobileBottomNav() {
  const { currentUser, currentPage, setCurrentPage } = useAppStore();
  if (!currentUser) return null;

  const role = currentUser.role;
  const filtered = navItems.filter((item) => item.roles.includes(role)).slice(0, 5);

  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 bg-white border-t border-slate-200 z-40 flex safe-area-pb">
      {filtered.map((item) => {
        const isActive = currentPage === item.id;
        return (
          <button
            key={item.id}
            onClick={() => setCurrentPage(item.id)}
            className={clsx(
              'flex-1 flex flex-col items-center justify-center pt-2 pb-3 gap-0.5 relative transition-colors',
              isActive ? 'text-teal-600' : 'text-slate-400'
            )}
          >
            {item.icon}
            <span className="text-[10px] font-medium leading-tight">{item.label}</span>
            {item.badge && (
              <span className="absolute top-1.5 right-1/4 bg-red-500 text-white text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                {item.badge}
              </span>
            )}
            {isActive && (
              <span className="absolute top-0 inset-x-3 h-0.5 bg-teal-500 rounded-b-full" />
            )}
          </button>
        );
      })}
    </nav>
  );
}
