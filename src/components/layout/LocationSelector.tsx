import { useState } from 'react';
import { MapPin, Plus, Check, Building2, Phone, Clock, Users, Edit2, X } from 'lucide-react';
import { ClinicLocation } from '../../types';
import clsx from 'clsx';

interface LocationSelectorProps {
  locations: ClinicLocation[];
  selectedLocationId: string | null;
  onSelect: (locationId: string | null) => void;
  compact?: boolean;
}

// Default synthetic locations
export const CLINIC_LOCATIONS: ClinicLocation[] = [
  {
    location_id: 'loc-001',
    name: 'Main Clinic',
    address: '1234 Medical Plaza Dr, Suite 200',
    phone: '(555) 100-2000',
    timezone: 'America/Chicago',
    providers: ['dr-001', 'dr-002'],
    active: true,
  },
  {
    location_id: 'loc-002',
    name: 'West Office',
    address: '5678 Westlake Blvd, Suite 110',
    phone: '(555) 200-3000',
    timezone: 'America/Chicago',
    providers: ['dr-001'],
    active: true,
  },
  {
    location_id: 'loc-003',
    name: 'North Branch',
    address: '9012 North Creek Pkwy',
    phone: '(555) 300-4000',
    timezone: 'America/Chicago',
    providers: ['dr-002'],
    active: true,
  },
];

export function LocationSelector({ locations, selectedLocationId, onSelect, compact = false }: LocationSelectorProps) {
  const [open, setOpen] = useState(false);

  const selected = locations.find(l => l.location_id === selectedLocationId);

  if (compact) {
    return (
      <div className="relative">
        <button
          onClick={() => setOpen(!open)}
          className="flex items-center gap-2 px-3 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-sm transition-colors"
        >
          <MapPin size={14} className="text-teal-500" />
          <span className="font-medium text-slate-700 truncate max-w-[140px]">
            {selected?.name || 'All Locations'}
          </span>
        </button>

        {open && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
            <div className="absolute right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-50 min-w-[240px] overflow-hidden">
              <button
                onClick={() => { onSelect(null); setOpen(false); }}
                className={clsx(
                  'w-full flex items-center gap-3 px-4 py-3 text-sm transition-colors border-b border-slate-100',
                  !selectedLocationId ? 'bg-teal-50 text-teal-700' : 'hover:bg-slate-50 text-slate-600'
                )}
              >
                <Building2 size={14} />
                <span className="flex-1 text-left font-medium">All Locations</span>
                {!selectedLocationId && <Check size={14} className="text-teal-600" />}
              </button>
              {locations.filter(l => l.active).map(loc => (
                <button
                  key={loc.location_id}
                  onClick={() => { onSelect(loc.location_id); setOpen(false); }}
                  className={clsx(
                    'w-full flex items-center gap-3 px-4 py-3 text-sm transition-colors',
                    selectedLocationId === loc.location_id ? 'bg-teal-50 text-teal-700' : 'hover:bg-slate-50 text-slate-600'
                  )}
                >
                  <MapPin size={14} />
                  <div className="flex-1 text-left">
                    <div className="font-medium">{loc.name}</div>
                    <div className="text-xs text-slate-400">{loc.address}</div>
                  </div>
                  {selectedLocationId === loc.location_id && <Check size={14} className="text-teal-600" />}
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    );
  }

  // Full location management view
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
          <Building2 size={14} className="text-teal-500" />
          Clinic Locations
        </h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {locations.map(loc => (
          <div
            key={loc.location_id}
            className={clsx(
              'card p-4 cursor-pointer transition-all',
              selectedLocationId === loc.location_id
                ? 'ring-2 ring-teal-400 bg-teal-50'
                : 'hover:shadow-md'
            )}
            onClick={() => onSelect(loc.location_id === selectedLocationId ? null : loc.location_id)}
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className={clsx(
                  'w-8 h-8 rounded-lg flex items-center justify-center',
                  loc.active ? 'bg-teal-100 text-teal-600' : 'bg-slate-100 text-slate-400'
                )}>
                  <MapPin size={16} />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-slate-900">{loc.name}</h4>
                  <span className={clsx(
                    'text-[10px] font-bold px-1.5 py-0.5 rounded-full',
                    loc.active ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-400'
                  )}>
                    {loc.active ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>
              {selectedLocationId === loc.location_id && (
                <div className="w-5 h-5 bg-teal-500 rounded-full flex items-center justify-center">
                  <Check size={12} className="text-white" />
                </div>
              )}
            </div>

            <div className="space-y-1.5 text-xs text-slate-500">
              <div className="flex items-center gap-2">
                <MapPin size={11} className="shrink-0" />
                <span className="truncate">{loc.address}</span>
              </div>
              <div className="flex items-center gap-2">
                <Phone size={11} className="shrink-0" />
                <span>{loc.phone}</span>
              </div>
              <div className="flex items-center gap-2">
                <Users size={11} className="shrink-0" />
                <span>{loc.providers.length} provider{loc.providers.length !== 1 ? 's' : ''}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock size={11} className="shrink-0" />
                <span>{loc.timezone}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
