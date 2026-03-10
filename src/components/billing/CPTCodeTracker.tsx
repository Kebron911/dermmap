import { useState, useMemo } from 'react';
import { Plus, X, DollarSign, Search, Check, Trash2 } from 'lucide-react';
import { CPT_CODES, getCPTByCategory, suggestCPTCodes, estimateVisitRevenue } from '../../data/cptCodes';
import { CPTCode } from '../../types';
import clsx from 'clsx';

interface CPTCodeTrackerProps {
  selectedCodes: string[];
  onChange: (codes: string[]) => void;
  /** Provide lesion data to get auto-suggestions */
  lesionContext?: {
    action: string;
    biopsy_result: string;
    size_mm: number | null;
    body_region: string;
    photos: { capture_type: string }[];
  };
}

const CATEGORIES: { id: CPTCode['category']; label: string }[] = [
  { id: 'evaluation', label: 'E&M' },
  { id: 'biopsy', label: 'Biopsy' },
  { id: 'excision', label: 'Excision' },
  { id: 'destruction', label: 'Destruction' },
  { id: 'repair', label: 'Repair' },
  { id: 'pathology', label: 'Pathology' },
  { id: 'photo', label: 'Photo' },
];

export function CPTCodeTracker({ selectedCodes, onChange, lesionContext }: CPTCodeTrackerProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<CPTCode['category'] | 'all'>('all');

  const suggestions = useMemo(() => {
    if (!lesionContext) return [];
    return suggestCPTCodes(lesionContext);
  }, [lesionContext]);

  const filteredCodes = useMemo(() => {
    let codes = activeCategory === 'all' ? CPT_CODES : getCPTByCategory(activeCategory);
    if (search.trim()) {
      const q = search.toLowerCase();
      codes = codes.filter(c =>
        c.code.includes(q) || c.description.toLowerCase().includes(q)
      );
    }
    return codes;
  }, [activeCategory, search]);

  const toggle = (code: string) => {
    if (selectedCodes.includes(code)) {
      onChange(selectedCodes.filter(c => c !== code));
    } else {
      onChange([...selectedCodes, code]);
    }
  };

  const revenue = estimateVisitRevenue(selectedCodes);

  const selectedDetails = selectedCodes.map(code => CPT_CODES.find(c => c.code === code)).filter(Boolean) as CPTCode[];

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
          <DollarSign size={14} className="text-emerald-500" />
          CPT Codes
          {selectedCodes.length > 0 && (
            <span className="bg-emerald-50 text-emerald-700 text-xs px-2 py-0.5 rounded-full font-bold">
              {selectedCodes.length}
            </span>
          )}
        </h4>
        <button
          onClick={() => setOpen(!open)}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-colors"
        >
          {open ? <X size={12} /> : <Plus size={12} />}
          {open ? 'Close' : 'Add Codes'}
        </button>
      </div>

      {/* Auto-suggestions */}
      {suggestions.length > 0 && !open && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-3">
          <div className="text-xs font-medium text-blue-700 mb-2">Suggested codes based on lesion:</div>
          <div className="flex flex-wrap gap-1.5">
            {suggestions.map(code => {
              const cpt = CPT_CODES.find(c => c.code === code);
              const isSelected = selectedCodes.includes(code);
              if (!cpt) return null;
              return (
                <button
                  key={code}
                  onClick={() => toggle(code)}
                  className={clsx(
                    'inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium border transition-all',
                    isSelected
                      ? 'bg-emerald-100 border-emerald-300 text-emerald-700'
                      : 'bg-white border-blue-200 text-blue-700 hover:border-blue-400'
                  )}
                >
                  {isSelected && <Check size={10} />}
                  {cpt.code}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Selected codes summary */}
      {selectedDetails.length > 0 && (
        <div className="space-y-1">
          {selectedDetails.map(cpt => (
            <div key={cpt.code} className="flex items-center gap-2 bg-slate-50 rounded-lg px-3 py-2">
              <span className="font-mono text-xs font-bold text-slate-800 w-12">{cpt.code}</span>
              <span className="text-xs text-slate-600 flex-1 truncate">{cpt.description}</span>
              {cpt.fee_estimate && (
                <span className="text-xs text-emerald-600 font-medium">${cpt.fee_estimate}</span>
              )}
              <button
                onClick={() => toggle(cpt.code)}
                className="p-1 text-slate-400 hover:text-red-500 rounded transition-colors"
              >
                <Trash2 size={12} />
              </button>
            </div>
          ))}
          <div className="flex justify-end px-3 pt-1">
            <span className="text-xs font-bold text-emerald-700">
              Est. Total: ${revenue.toLocaleString()}
            </span>
          </div>
        </div>
      )}

      {/* Code picker modal */}
      {open && (
        <div className="border border-slate-200 rounded-xl bg-white shadow-lg overflow-hidden">
          {/* Search */}
          <div className="p-3 border-b border-slate-100">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search by code or description..."
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-emerald-200"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>

          {/* Category tabs */}
          <div className="flex gap-1 px-3 py-2 border-b border-slate-100 overflow-x-auto">
            <button
              onClick={() => setActiveCategory('all')}
              className={clsx(
                'px-2.5 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition-colors',
                activeCategory === 'all' ? 'bg-emerald-100 text-emerald-700' : 'text-slate-500 hover:bg-slate-50'
              )}
            >
              All
            </button>
            {CATEGORIES.map(cat => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={clsx(
                  'px-2.5 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition-colors',
                  activeCategory === cat.id ? 'bg-emerald-100 text-emerald-700' : 'text-slate-500 hover:bg-slate-50'
                )}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Code list */}
          <div className="max-h-56 overflow-y-auto">
            {filteredCodes.map(cpt => {
              const isSelected = selectedCodes.includes(cpt.code);
              return (
                <button
                  key={cpt.code}
                  onClick={() => toggle(cpt.code)}
                  className={clsx(
                    'w-full flex items-center gap-3 px-4 py-2.5 text-left border-b border-slate-50 last:border-b-0 transition-colors',
                    isSelected ? 'bg-emerald-50' : 'hover:bg-slate-50'
                  )}
                >
                  <div className={clsx(
                    'w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-all',
                    isSelected ? 'bg-emerald-500 border-emerald-500' : 'border-slate-300'
                  )}>
                    {isSelected && <Check size={12} className="text-white" />}
                  </div>
                  <span className="font-mono text-xs font-bold text-slate-800 w-12 shrink-0">{cpt.code}</span>
                  <span className="text-xs text-slate-600 flex-1">{cpt.description}</span>
                  {cpt.fee_estimate && (
                    <span className="text-xs text-slate-400 shrink-0">${cpt.fee_estimate}</span>
                  )}
                </button>
              );
            })}
            {filteredCodes.length === 0 && (
              <div className="py-6 text-center text-xs text-slate-400">No matching codes found.</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
