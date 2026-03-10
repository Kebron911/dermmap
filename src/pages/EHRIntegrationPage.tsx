import { useState } from 'react';
import { Link, CheckCircle, XCircle, Clock, Settings, Zap, RefreshCw, ChevronRight, Info, Badge } from 'lucide-react';
import clsx from 'clsx';

const EHR_SYSTEMS = [
  {
    id: 'epic',
    name: 'Epic',
    logo: '⚕️',
    color: 'bg-red-50 border-red-200',
    activeColor: 'bg-red-600',
    status: 'coming_soon',
    description: 'Epic MyChart & Hyperdrive integration via FHIR R4',
    fhir: true,
  },
  {
    id: 'modmed',
    name: 'Modernizing Medicine (EMA)',
    logo: '🩺',
    color: 'bg-blue-50 border-blue-200',
    activeColor: 'bg-blue-600',
    status: 'configured',
    description: 'EMA derm-specific EHR — most common in dermatology practices',
    fhir: true,
    lastSync: null as string | null,
    syncStatus: 'success',
  },
  {
    id: 'cerner',
    name: 'Cerner / Oracle Health',
    logo: '🏥',
    color: 'bg-orange-50 border-orange-200',
    activeColor: 'bg-orange-600',
    status: 'coming_soon',
    description: 'Oracle Health CommunityWorks & Millennium platforms',
    fhir: true,
  },
  {
    id: 'athena',
    name: 'Athenahealth',
    logo: '💊',
    color: 'bg-green-50 border-green-200',
    activeColor: 'bg-green-600',
    status: 'coming_soon',
    description: 'athenaOne EHR platform',
    fhir: true,
  },
  {
    id: 'ecw',
    name: 'eClinicalWorks',
    logo: '📋',
    color: 'bg-purple-50 border-purple-200',
    activeColor: 'bg-purple-600',
    status: 'coming_soon',
    description: 'eClinicalWorks 12 and cloud EHR',
    fhir: true,
  },
];

export function EHRIntegrationPage() {
  const [activeEHR, setActiveEHR] = useState<string | null>('modmed');
  const [fhirEndpoint, setFhirEndpoint] = useState('https://fhir.modmed.com/v1/r4');
  const [apiKey, setApiKey] = useState('');

  const selectedEHR = EHR_SYSTEMS.find((e) => e.id === activeEHR);

  return (
    <div className="p-6 max-w-6xl mx-auto fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Link size={22} className="text-teal-600" />
            EHR Integration
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Connect DermMap with your existing EHR system
          </p>
        </div>
        <div className="flex items-center gap-2 bg-teal-50 border border-teal-200 rounded-xl px-4 py-2">
          <div className="w-2 h-2 bg-teal-500 rounded-full animate-pulse" />
          <span className="text-sm font-medium text-teal-700">ModMed EMA Connected</span>
        </div>
      </div>

      {/* "Works Alongside" Banner */}
      <div className="card p-5 mb-6 bg-gradient-to-r from-teal-50 to-blue-50 border-teal-200">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 bg-teal-100 rounded-xl flex items-center justify-center text-2xl shrink-0">
            🔗
          </div>
          <div>
            <h2 className="font-semibold text-slate-900">Works Alongside Your EHR — Not Instead of It</h2>
            <p className="text-sm text-slate-600 mt-1">
              DermMap complements your existing EHR workflow. Patient demographics sync automatically,
              and visit summaries push back as professional PDF documents — readable in any EHR system today,
              with discrete FHIR data exchange for supported systems.
            </p>
            <div className="flex flex-wrap gap-3 mt-3">
              <div className="flex items-center gap-1.5 text-xs font-medium text-teal-700 bg-teal-100 px-3 py-1.5 rounded-lg">
                <CheckCircle size={12} />
                Same-day PDF export to any EHR
              </div>
              <div className="flex items-center gap-1.5 text-xs font-medium text-blue-700 bg-blue-100 px-3 py-1.5 rounded-lg">
                <Zap size={12} />
                FHIR R4 for supported systems
              </div>
              <div className="flex items-center gap-1.5 text-xs font-medium text-violet-700 bg-violet-100 px-3 py-1.5 rounded-lg">
                <RefreshCw size={12} />
                Auto-sync appointment schedule
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* EHR System List */}
        <div className="col-span-1 space-y-3">
          <h3 className="text-sm font-semibold text-slate-700 mb-2">Supported Systems</h3>
          {EHR_SYSTEMS.map((ehr) => (
            <button
              key={ehr.id}
              onClick={() => setActiveEHR(ehr.id)}
              className={clsx(
                'w-full text-left p-4 rounded-xl border transition-all',
                activeEHR === ehr.id
                  ? 'border-teal-300 bg-white shadow-md'
                  : 'border-slate-200 bg-white hover:border-slate-300'
              )}
            >
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl border ${ehr.color}`}>
                  {ehr.logo}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-slate-900 truncate">{ehr.name}</div>
                  <div className="mt-1">
                    {ehr.status === 'configured' ? (
                      <span className="flex items-center gap-1 text-xs text-emerald-600 font-medium">
                        <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                        Connected
                      </span>
                    ) : (
                      <span className="text-xs text-slate-400">Coming Soon</span>
                    )}
                  </div>
                </div>
                {ehr.fhir && (
                  <span className="text-xs font-bold text-blue-600 bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded">
                    FHIR
                  </span>
                )}
              </div>
            </button>
          ))}
        </div>

        {/* EHR Configuration Panel */}
        <div className="col-span-2">
          {selectedEHR ? (
            <div className="card p-6 space-y-5">
              {/* Header */}
              <div className="flex items-center gap-4 pb-4 border-b border-slate-100">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl border ${selectedEHR.color}`}>
                  {selectedEHR.logo}
                </div>
                <div>
                  <h3 className="font-bold text-slate-900">{selectedEHR.name}</h3>
                  <p className="text-sm text-slate-500">{selectedEHR.description}</p>
                </div>
                {selectedEHR.id === 'modmed' && (
                  <div className="ml-auto bg-gradient-to-r from-blue-500 to-blue-700 text-white text-xs font-bold px-3 py-1.5 rounded-xl">
                    ✦ ModMed Recommended
                  </div>
                )}
              </div>

              {selectedEHR.status === 'configured' ? (
                <>
                  {/* Sync Status */}
                  <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center">
                          <CheckCircle size={20} className="text-emerald-600" />
                        </div>
                        <div>
                          <div className="font-semibold text-emerald-800">Connected & Syncing</div>
                          <div className="text-xs text-emerald-600 mt-0.5">
                            {selectedEHR.lastSync
                              ? `Last synced: ${new Date(selectedEHR.lastSync).toLocaleString()}`
                              : 'Not yet synced — click Sync Now'}
                          </div>
                        </div>
                      </div>
                      <button className="flex items-center gap-1.5 text-xs text-emerald-700 bg-emerald-100 hover:bg-emerald-200 px-3 py-1.5 rounded-lg transition-colors font-medium">
                        <RefreshCw size={12} />
                        Sync Now
                      </button>
                    </div>
                  </div>

                  {/* FHIR Configuration */}
                  <div>
                    <h4 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                      <Settings size={14} />
                      FHIR R4 Configuration
                    </h4>
                    <div className="space-y-3">
                      <div>
                        <label className="label">FHIR R4 Base URL</label>
                        <input
                          type="text"
                          className="input text-sm font-mono"
                          value={fhirEndpoint}
                          onChange={(e) => setFhirEndpoint(e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="label">API Key</label>
                        <input
                          type="password"
                          className="input text-sm font-mono"
                          value={apiKey}
                          onChange={(e) => setApiKey(e.target.value)}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Data Flow */}
                  <div>
                    <h4 className="text-sm font-semibold text-slate-700 mb-3">Data Flow</h4>
                    <div className="space-y-2">
                      {[
                        { label: 'Patient demographics sync', direction: '← Pull', status: true, detail: 'From EHR to DermMap daily' },
                        { label: "Today's appointments sync", direction: '← Pull', status: true, detail: 'Real-time schedule updates' },
                        { label: 'Visit summary PDF push', direction: '→ Push', status: true, detail: 'Sent after visit sign-off' },
                        { label: 'Lesion FHIR resources', direction: '↔ Bi-dir', status: true, detail: 'Observation resources via FHIR R4' },
                        { label: 'Photo attachments (DocumentReference)', direction: '→ Push', status: false, detail: 'Coming Q2 2025' },
                      ].map((item) => (
                        <div key={item.label} className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                          <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${item.status ? 'bg-emerald-100' : 'bg-slate-200'}`}>
                            {item.status ? (
                              <CheckCircle size={12} className="text-emerald-600" />
                            ) : (
                              <Clock size={12} className="text-slate-400" />
                            )}
                          </div>
                          <span className="text-sm text-slate-700 flex-1">{item.label}</span>
                          <span className="text-xs font-mono font-medium text-slate-500">{item.direction}</span>
                          <span className="text-xs text-slate-400">{item.detail}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <button className="btn-primary w-full justify-center">
                    Save Configuration
                    <ChevronRight size={16} />
                  </button>
                </>
              ) : (
                <div className="text-center py-8">
                  <div className="w-14 h-14 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Clock size={24} className="text-slate-400" />
                  </div>
                  <h4 className="font-semibold text-slate-700">Coming Soon</h4>
                  <p className="text-sm text-slate-500 mt-2 max-w-sm mx-auto">
                    {selectedEHR.name} integration is on our roadmap. FHIR R4 architecture is ready —
                    we're completing certification and testing.
                  </p>
                  <div className="mt-4 inline-flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-xl px-4 py-2 text-sm text-blue-700">
                    <Info size={14} />
                    Expected Q3 2025
                  </div>
                  <button className="btn-secondary mt-4 mx-auto">
                    Request Early Access
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="card p-12 text-center">
              <Link size={32} className="text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500">Select an EHR system to configure</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
