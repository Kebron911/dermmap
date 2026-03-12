import { useState } from 'react';
import { AlertTriangle, GitMerge, Clock, User, Server, ChevronDown, ChevronUp, Check, X } from 'lucide-react';
import clsx from 'clsx';
import { format, parseISO } from 'date-fns';

export interface SyncConflict {
  id: string;
  entityType: 'patient' | 'visit' | 'lesion';
  entityId: string;
  entityLabel: string;
  field: string;
  localValue: string;
  serverValue: string;
  localTimestamp: string;
  serverTimestamp: string;
  localUser: string;
  serverUser: string;
}

interface ConflictResolutionModalProps {
  conflicts: SyncConflict[];
  onResolve: (resolutions: Record<string, 'local' | 'server'>) => void;
  onDismiss: () => void;
}

export function ConflictResolutionModal({ conflicts, onResolve, onDismiss }: ConflictResolutionModalProps) {
  const [resolutions, setResolutions] = useState<Record<string, 'local' | 'server'>>({});
  const [expanded, setExpanded] = useState<string | null>(conflicts[0]?.id ?? null);

  const allResolved = conflicts.every((c) => resolutions[c.id] !== undefined);

  function choose(conflictId: string, winner: 'local' | 'server') {
    setResolutions((prev) => ({ ...prev, [conflictId]: winner }));
  }

  function acceptAll(winner: 'local' | 'server') {
    const all: Record<string, 'local' | 'server'> = {};
    conflicts.forEach((c) => { all[c.id] = winner; });
    setResolutions(all);
  }

  function handleSubmit() {
    if (!allResolved) return;
    onResolve(resolutions);
  }

  const entityIcon: Record<string, string> = {
    patient: '👤',
    visit: '📋',
    lesion: '🔬',
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="bg-amber-50 border-b border-amber-200 rounded-t-2xl p-5 flex items-start gap-4">
          <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center shrink-0">
            <AlertTriangle size={20} className="text-amber-600" />
          </div>
          <div className="flex-1">
            <h2 className="font-bold text-slate-900 text-lg">Sync Conflicts Detected</h2>
            <p className="text-sm text-slate-600 mt-0.5">
              {conflicts.length} {conflicts.length === 1 ? 'record was' : 'records were'} modified both offline
              and on the server. Choose which version to keep for each conflict.
            </p>
          </div>
          <button onClick={onDismiss} className="text-slate-400 hover:text-slate-600 transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Bulk actions */}
        <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <span className="text-xs text-slate-500 font-medium">
            {Object.keys(resolutions).length} of {conflicts.length} resolved
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => acceptAll('local')}
              className="text-xs px-3 py-1.5 rounded-lg border border-teal-200 text-teal-700 bg-teal-50 hover:bg-teal-100 transition-colors font-medium"
            >
              Keep All Mine
            </button>
            <button
              onClick={() => acceptAll('server')}
              className="text-xs px-3 py-1.5 rounded-lg border border-blue-200 text-blue-700 bg-blue-50 hover:bg-blue-100 transition-colors font-medium"
            >
              Keep All Server
            </button>
          </div>
        </div>

        {/* Conflict list */}
        <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
          {conflicts.map((conflict) => {
            const chosen = resolutions[conflict.id];
            const isOpen = expanded === conflict.id;

            return (
              <div key={conflict.id} className="p-4">
                {/* Conflict header row */}
                <button
                  className="w-full flex items-center gap-3 text-left"
                  onClick={() => setExpanded(isOpen ? null : conflict.id)}
                >
                  <span className="text-xl">{entityIcon[conflict.entityType] ?? '📄'}</span>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-slate-900 text-sm truncate">{conflict.entityLabel}</div>
                    <div className="text-xs text-slate-500">
                      Field: <span className="font-mono text-slate-700">{conflict.field}</span>
                    </div>
                  </div>
                  {chosen ? (
                    <span className={clsx(
                      'text-xs px-2.5 py-1 rounded-full font-semibold',
                      chosen === 'local'
                        ? 'bg-teal-100 text-teal-700'
                        : 'bg-blue-100 text-blue-700'
                    )}>
                      {chosen === 'local' ? 'Kept Mine' : 'Kept Server'}
                    </span>
                  ) : (
                    <span className="text-xs px-2.5 py-1 rounded-full bg-amber-100 text-amber-700 font-semibold">
                      Needs decision
                    </span>
                  )}
                  {isOpen ? <ChevronUp size={16} className="text-slate-400 shrink-0" /> : <ChevronDown size={16} className="text-slate-400 shrink-0" />}
                </button>

                {/* Expanded detail */}
                {isOpen && (
                  <div className="mt-3 grid grid-cols-2 gap-3">
                    {/* Local version */}
                    <button
                      onClick={() => choose(conflict.id, 'local')}
                      className={clsx(
                        'text-left p-4 rounded-xl border-2 transition-all',
                        chosen === 'local'
                          ? 'border-teal-400 bg-teal-50'
                          : 'border-slate-200 bg-white hover:border-teal-200'
                      )}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <User size={13} className="text-teal-600" />
                        <span className="text-xs font-semibold text-teal-700">Your offline version</span>
                        {chosen === 'local' && <Check size={13} className="text-teal-600 ml-auto" />}
                      </div>
                      <div className="text-sm font-mono bg-teal-50/50 rounded p-2 mb-2 break-words">
                        {conflict.localValue}
                      </div>
                      <div className="flex items-center gap-1 text-xs text-slate-500">
                        <Clock size={11} />
                        {format(parseISO(conflict.localTimestamp), "MMM d 'at' h:mm a")}
                      </div>
                      <div className="text-xs text-slate-400 mt-0.5">by {conflict.localUser}</div>
                    </button>

                    {/* Server version */}
                    <button
                      onClick={() => choose(conflict.id, 'server')}
                      className={clsx(
                        'text-left p-4 rounded-xl border-2 transition-all',
                        chosen === 'server'
                          ? 'border-blue-400 bg-blue-50'
                          : 'border-slate-200 bg-white hover:border-blue-200'
                      )}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <Server size={13} className="text-blue-600" />
                        <span className="text-xs font-semibold text-blue-700">Server version</span>
                        {chosen === 'server' && <Check size={13} className="text-blue-600 ml-auto" />}
                      </div>
                      <div className="text-sm font-mono bg-blue-50/50 rounded p-2 mb-2 break-words">
                        {conflict.serverValue}
                      </div>
                      <div className="flex items-center gap-1 text-xs text-slate-500">
                        <Clock size={11} />
                        {format(parseISO(conflict.serverTimestamp), "MMM d 'at' h:mm a")}
                      </div>
                      <div className="text-xs text-slate-400 mt-0.5">by {conflict.serverUser}</div>
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="border-t border-slate-100 p-4 flex items-center justify-between bg-slate-50 rounded-b-2xl">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <GitMerge size={14} />
            All resolutions are saved to the audit log
          </div>
          <div className="flex gap-2">
            <button onClick={onDismiss} className="btn-secondary text-sm">
              Decide Later
            </button>
            <button
              onClick={handleSubmit}
              disabled={!allResolved}
              className={clsx(
                'btn-primary text-sm',
                !allResolved && 'opacity-40 cursor-not-allowed'
              )}
            >
              Apply {Object.keys(resolutions).length} Resolution{Object.keys(resolutions).length !== 1 ? 's' : ''}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
