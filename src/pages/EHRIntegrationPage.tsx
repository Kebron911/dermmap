import { useState, useEffect } from 'react';
import {
  Link, CheckCircle, XCircle, Clock, Settings, Zap, RefreshCw,
  ChevronRight, Info, Activity, Code2, ShieldCheck, ArrowRight,
  Wifi, AlertCircle, Download, Upload, Eye,
} from 'lucide-react';
import clsx from 'clsx';
import { format, subMinutes, subHours } from 'date-fns';

// ─── EHR system definitions ──────────────────────────────────────────────────

const EHR_SYSTEMS = [
  {
    id: 'modmed',
    name: 'Modernizing Medicine (EMA)',
    logo: '🩺',
    color: 'bg-blue-50 border-blue-200',
    status: 'connected',
    description: 'EMA derm-specific EHR — most common in dermatology practices',
    fhir: true,
    lastSync: subMinutes(new Date(), 4).toISOString(),
    syncStatus: 'success' as const,
    patientsSync: 247,
    recordsPushed: 1842,
  },
  {
    id: 'epic',
    name: 'Epic (MyChart / Hyperdrive)',
    logo: '⚕️',
    color: 'bg-red-50 border-red-200',
    status: 'coming_soon',
    description: 'Epic MyChart & Hyperdrive integration via FHIR R4',
    fhir: true,
    eta: 'Q2 2026',
  },
  {
    id: 'cerner',
    name: 'Cerner / Oracle Health',
    logo: '🏥',
    color: 'bg-orange-50 border-orange-200',
    status: 'coming_soon',
    description: 'Oracle Health CommunityWorks & Millennium platforms',
    fhir: true,
    eta: 'Q3 2026',
  },
  {
    id: 'athena',
    name: 'Athenahealth',
    logo: '💊',
    color: 'bg-green-50 border-green-200',
    status: 'coming_soon',
    description: 'athenaOne EHR platform',
    fhir: true,
    eta: 'Q4 2026',
  },
  {
    id: 'ecw',
    name: 'eClinicalWorks',
    logo: '📋',
    color: 'bg-purple-50 border-purple-200',
    status: 'coming_soon',
    description: 'eClinicalWorks 12 and cloud EHR',
    fhir: true,
    eta: 'Q1 2027',
  },
];

// ─── Simulated FHIR activity feed ────────────────────────────────────────────

function makeActivity(
  type: 'pull' | 'push' | 'error',
  resource: string,
  patient: string,
  minsAgo: number,
) {
  return { type, resource, patient, ts: subMinutes(new Date(), minsAgo).toISOString() };
}

const INITIAL_ACTIVITY = [
  makeActivity('pull', 'Patient', 'Chen, Margaret', 4),
  makeActivity('push', 'Observation', 'Chen, Margaret', 4),
  makeActivity('pull', 'Appointment', 'Thompson, David', 12),
  makeActivity('push', 'DocumentReference', 'Williams, Lisa', 31),
  makeActivity('pull', 'Patient', 'Kim, David', 45),
  makeActivity('push', 'Observation', 'Patel, Priya', 60),
  makeActivity('pull', 'Appointment', 'Harris, James', 90),
  makeActivity('push', 'DiagnosticReport', 'Chen, Margaret', 120),
  makeActivity('error', 'Observation', 'Lopez, Maria', 148),
  makeActivity('pull', 'Patient', 'Brown, Susan', 210),
];

// Sample FHIR Observation resource (abbreviated)
const SAMPLE_FHIR_OBSERVATION = `{
  "resourceType": "Observation",
  "id": "dermmap-l-001-1-1",
  "status": "final",
  "category": [{
    "coding": [{
      "system": "http://terminology.hl7.org/CodeSystem/observation-category",
      "code": "exam",
      "display": "Exam"
    }]
  }],
  "code": {
    "coding": [{
      "system": "http://snomed.info/sct",
      "code": "400010006",
      "display": "Skin lesion"
    }]
  },
  "subject": {
    "reference": "Patient/MRN-204819",
    "display": "Chen, Margaret"
  },
  "effectiveDateTime": "2024-01-15T09:10:00Z",
  "performer": [{
    "reference": "Practitioner/dr-001",
    "display": "Dr. Sarah Mitchell"
  }],
  "component": [
    {
      "code": { "coding": [{ "code": "246116008",
        "display": "Lesion size", "system": "http://snomed.info/sct" }] },
      "valueQuantity": { "value": 6, "unit": "mm",
        "system": "http://unitsofmeasure.org", "code": "mm" }
    },
    {
      "code": { "coding": [{ "code": "246196000",
        "display": "Shape of lesion", "system": "http://snomed.info/sct" }] },
      "valueString": "irregular"
    },
    {
      "code": { "coding": [{ "code": "255438004",
        "display": "Color", "system": "http://snomed.info/sct" }] },
      "valueString": "dark brown"
    },
    {
      "code": { "coding": [{ "code": "255403003",
        "display": "ABCDE asymmetry", "system": "http://snomed.info/sct" }] },
      "valueBoolean": true
    }
  ],
  "extension": [{
    "url": "https://dermmap.io/fhir/StructureDefinition/lesion-body-location",
    "valueString": "chest (anterior)"
  }]
}`;

// ─── Component ────────────────────────────────────────────────────────────────

export function EHRIntegrationPage() {
  const [activeEHR, setActiveEHR] = useState<string>('modmed');
  const [fhirEndpoint, setFhirEndpoint] = useState('https://fhir.modmed.com/v1/r4');
  const [apiKey, setApiKey] = useState('sk-ema-••••••••••••••••3f9a');
  const [activeTab, setActiveTab] = useState<'config' | 'fhir' | 'activity'>('config');
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncDone, setSyncDone] = useState(false);
  const [savedConfig, setSavedConfig] = useState(false);
  const [activity, setActivity] = useState(INITIAL_ACTIVITY);
  const [showFhirResource, setShowFhirResource] = useState(false);

  const selectedEHR = EHR_SYSTEMS.find((e) => e.id === activeEHR)!;

  // Simulate a sync run
  function runSync() {
    setIsSyncing(true);
    setSyncDone(false);
    setTimeout(() => {
      setActivity((prev) => [
        makeActivity('pull', 'Patient', 'New patient batch (12)', 0),
        makeActivity('push', 'Observation', 'Visit summary batch (8)', 0),
        ...prev,
      ]);
      setIsSyncing(false);
      setSyncDone(true);
      setTimeout(() => setSyncDone(false), 3000);
    }, 2200);
  }

  // Pulse a new activity item every ~20 s for demo realism
  useEffect(() => {
    const demos = [
      makeActivity('pull', 'Appointment', 'Martinez, Carlos', 0),
      makeActivity('push', 'Observation', 'Wilson, Rachel', 0),
      makeActivity('pull', 'Patient', 'Taylor, James', 0),
    ];
    let i = 0;
    const t = setInterval(() => {
      setActivity((prev) => [{ ...demos[i % demos.length], ts: new Date().toISOString() }, ...prev.slice(0, 14)]);
      i++;
    }, 20000);
    return () => clearInterval(t);
  }, []);

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
            Connect DermMap with your existing EHR via FHIR R4
          </p>
        </div>
        <div className="flex items-center gap-2 bg-teal-50 border border-teal-200 rounded-xl px-4 py-2">
          <div className="w-2 h-2 bg-teal-500 rounded-full animate-pulse" />
          <span className="text-sm font-medium text-teal-700">ModMed EMA Connected</span>
        </div>
      </div>

      {/* Works Alongside Banner */}
      <div className="card p-5 mb-6 bg-gradient-to-r from-teal-50 to-blue-50 border-teal-200">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 bg-teal-100 rounded-xl flex items-center justify-center text-2xl shrink-0">🔗</div>
          <div className="flex-1">
            <h2 className="font-semibold text-slate-900">Works Alongside Your EHR — Not Instead of It</h2>
            <p className="text-sm text-slate-600 mt-1">
              Patient demographics sync automatically, and visit summaries push back as FHIR Observation
              resources and PDF documents — readable in any EHR today.
            </p>
            <div className="flex flex-wrap gap-3 mt-3">
              <div className="flex items-center gap-1.5 text-xs font-medium text-teal-700 bg-teal-100 px-3 py-1.5 rounded-lg">
                <CheckCircle size={12} /> Same-day PDF export to any EHR
              </div>
              <div className="flex items-center gap-1.5 text-xs font-medium text-blue-700 bg-blue-100 px-3 py-1.5 rounded-lg">
                <Zap size={12} /> FHIR R4 Observation resources
              </div>
              <div className="flex items-center gap-1.5 text-xs font-medium text-violet-700 bg-violet-100 px-3 py-1.5 rounded-lg">
                <RefreshCw size={12} /> Real-time schedule sync
              </div>
              <div className="flex items-center gap-1.5 text-xs font-medium text-emerald-700 bg-emerald-100 px-3 py-1.5 rounded-lg">
                <ShieldCheck size={12} /> SMART on FHIR OAuth 2.0
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* EHR system list */}
        <div className="col-span-1 space-y-2">
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Supported Systems</h3>
          {EHR_SYSTEMS.map((ehr) => (
            <button
              key={ehr.id}
              onClick={() => setActiveEHR(ehr.id)}
              className={clsx(
                'w-full text-left p-3.5 rounded-xl border transition-all',
                activeEHR === ehr.id
                  ? 'border-teal-300 bg-white shadow-md'
                  : 'border-slate-200 bg-white hover:border-slate-300',
              )}
            >
              <div className="flex items-center gap-3">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-lg border ${ehr.color}`}>
                  {ehr.logo}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-slate-900 truncate">{ehr.name}</div>
                  <div className="mt-0.5">
                    {ehr.status === 'connected' ? (
                      <span className="flex items-center gap-1 text-xs text-emerald-600 font-medium">
                        <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                        Connected
                      </span>
                    ) : (
                      <span className="text-xs text-slate-400">{(ehr as any).eta ?? 'Coming Soon'}</span>
                    )}
                  </div>
                </div>
                {ehr.fhir && (
                  <span className="text-xs font-bold text-blue-600 bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded shrink-0">
                    FHIR
                  </span>
                )}
              </div>
            </button>
          ))}
        </div>

        {/* Detail panel */}
        <div className="col-span-2">
          {selectedEHR.status === 'connected' ? (
            <div className="card overflow-hidden">
              {/* Panel header */}
              <div className="flex items-center gap-4 p-5 border-b border-slate-100">
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-2xl border ${selectedEHR.color}`}>
                  {selectedEHR.logo}
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-slate-900">{selectedEHR.name}</h3>
                  <p className="text-xs text-slate-500">{selectedEHR.description}</p>
                </div>
                <button
                  onClick={runSync}
                  disabled={isSyncing}
                  className={clsx(
                    'flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg font-semibold transition-all',
                    syncDone
                      ? 'bg-emerald-500 text-white'
                      : 'bg-teal-600 hover:bg-teal-700 text-white',
                    isSyncing && 'opacity-60 cursor-not-allowed',
                  )}
                >
                  {syncDone ? (
                    <><CheckCircle size={13} /> Synced</>
                  ) : (
                    <><RefreshCw size={13} className={isSyncing ? 'animate-spin' : ''} />
                    {isSyncing ? 'Syncing…' : 'Sync Now'}</>
                  )}
                </button>
              </div>

              {/* Stat strip */}
              <div className="grid grid-cols-3 divide-x divide-slate-100 bg-slate-50 border-b border-slate-100">
                {[
                  { label: 'Patients synced', value: (selectedEHR as any).patientsSync, icon: <Wifi size={13} className="text-teal-500" /> },
                  { label: 'Records pushed', value: (selectedEHR as any).recordsPushed, icon: <Upload size={13} className="text-blue-500" /> },
                  { label: 'Last sync', value: format(new Date((selectedEHR as any).lastSync), "h:mm a"), icon: <Clock size={13} className="text-slate-400" /> },
                ].map((s) => (
                  <div key={s.label} className="py-3 px-5">
                    <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-0.5">
                      {s.icon} {s.label}
                    </div>
                    <div className="text-lg font-bold text-slate-900">{s.value}</div>
                  </div>
                ))}
              </div>

              {/* Tabs */}
              <div className="flex border-b border-slate-100">
                {([['config', 'Configuration'], ['fhir', 'FHIR Resources'], ['activity', 'Activity Feed']] as const).map(([tab, label]) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={clsx(
                      'px-5 py-3 text-sm font-medium border-b-2 transition-colors',
                      activeTab === tab
                        ? 'border-teal-500 text-teal-700'
                        : 'border-transparent text-slate-500 hover:text-slate-700',
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {/* Tab content */}
              <div className="p-5">
                {/* ── Configuration tab ── */}
                {activeTab === 'config' && (
                  <div className="space-y-5">
                    {/* Auth method */}
                    <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-center gap-3">
                      <ShieldCheck size={18} className="text-emerald-600 shrink-0" />
                      <div className="flex-1">
                        <div className="text-sm font-semibold text-emerald-800">Authenticated via SMART on FHIR</div>
                        <div className="text-xs text-emerald-600 mt-0.5">
                          OAuth 2.0 authorization code flow · Scopes: patient/*.read, observation.write, document.write
                        </div>
                      </div>
                      <button className="text-xs text-emerald-700 bg-emerald-100 hover:bg-emerald-200 px-3 py-1.5 rounded-lg font-medium transition-colors">
                        Re-authorize
                      </button>
                    </div>

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
                        <label className="label">API Key (read-only display)</label>
                        <input type="password" className="input text-sm font-mono" value={apiKey} readOnly />
                      </div>
                    </div>

                    {/* Data flow matrix */}
                    <div>
                      <h4 className="text-sm font-semibold text-slate-700 mb-3">Data Flow</h4>
                      <div className="space-y-2">
                        {[
                          { label: 'Patient demographics', resource: 'Patient', dir: '← Pull', on: true, detail: 'Daily at 6 AM' },
                          { label: "Today's appointments", resource: 'Appointment', dir: '← Pull', on: true, detail: 'Real-time webhook' },
                          { label: 'Lesion observations', resource: 'Observation', dir: '→ Push', on: true, detail: 'After provider sign-off' },
                          { label: 'Visit summary PDF', resource: 'DocumentReference', dir: '→ Push', on: true, detail: 'After provider sign-off' },
                          { label: 'Biopsy results', resource: 'DiagnosticReport', dir: '↔ Bi-dir', on: true, detail: 'Path lab webhook' },
                          { label: 'Photo attachments', resource: 'Binary + DocumentRef', dir: '→ Push', on: false, detail: 'Coming Q4 2026' },
                        ].map((item) => (
                          <div key={item.label} className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                            <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${item.on ? 'bg-emerald-100' : 'bg-slate-200'}`}>
                              {item.on
                                ? <CheckCircle size={12} className="text-emerald-600" />
                                : <Clock size={12} className="text-slate-400" />}
                            </div>
                            <span className="text-sm text-slate-700 flex-1">{item.label}</span>
                            <span className="text-xs font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded font-mono">{item.resource}</span>
                            <span className="text-xs font-mono font-semibold text-slate-500 w-16 text-center">{item.dir}</span>
                            <span className="text-xs text-slate-400 w-36 text-right">{item.detail}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <button
                      className="btn-primary w-full justify-center"
                      onClick={() => { setSavedConfig(true); setTimeout(() => setSavedConfig(false), 2500); }}
                    >
                      {savedConfig ? <><CheckCircle size={16} /> Configuration Saved</> : <>Save Configuration <ChevronRight size={16} /></>}
                    </button>
                  </div>
                )}

                {/* ── FHIR Resources tab ── */}
                {activeTab === 'fhir' && (
                  <div className="space-y-4">
                    <p className="text-sm text-slate-600">
                      DermMap maps every lesion to a FHIR R4 <strong>Observation</strong> resource using
                      SNOMED CT codes. Below is a live example from a recent visit.
                    </p>

                    <div className="grid grid-cols-3 gap-3">
                      {[
                        { resource: 'Patient', count: 247, color: 'bg-blue-50 border-blue-200 text-blue-700' },
                        { resource: 'Observation', count: 1842, color: 'bg-teal-50 border-teal-200 text-teal-700' },
                        { resource: 'DocumentReference', count: 318, color: 'bg-violet-50 border-violet-200 text-violet-700' },
                        { resource: 'Appointment', count: 512, color: 'bg-amber-50 border-amber-200 text-amber-700' },
                        { resource: 'DiagnosticReport', count: 104, color: 'bg-red-50 border-red-200 text-red-700' },
                        { resource: 'Binary (photos)', count: 936, color: 'bg-slate-100 border-slate-200 text-slate-600' },
                      ].map((r) => (
                        <div key={r.resource} className={`border rounded-xl p-3 text-center ${r.color}`}>
                          <div className="text-lg font-bold">{r.count.toLocaleString()}</div>
                          <div className="text-xs font-medium mt-0.5">{r.resource}</div>
                        </div>
                      ))}
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                          <Code2 size={14} />
                          Sample Observation Resource
                        </h4>
                        <button
                          onClick={() => setShowFhirResource((v) => !v)}
                          className="flex items-center gap-1 text-xs text-teal-600 hover:text-teal-800 font-medium"
                        >
                          <Eye size={13} />
                          {showFhirResource ? 'Hide' : 'View JSON'}
                        </button>
                      </div>
                      {showFhirResource && (
                        <pre className="bg-slate-900 text-emerald-300 rounded-xl p-4 text-xs overflow-x-auto leading-relaxed max-h-72 overflow-y-auto">
                          {SAMPLE_FHIR_OBSERVATION}
                        </pre>
                      )}
                      {!showFhirResource && (
                        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex items-center gap-3 text-sm text-slate-500 cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => setShowFhirResource(true)}>
                          <Code2 size={16} className="text-slate-400" />
                          Click to view the FHIR JSON for lesion l-001-1-1 (Chen, Margaret)
                          <ArrowRight size={14} className="ml-auto text-slate-400" />
                        </div>
                      )}
                    </div>

                    <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                      <div className="text-sm font-semibold text-blue-800 mb-1 flex items-center gap-2">
                        <Info size={14} /> Terminology bindings
                      </div>
                      <div className="text-xs text-blue-700 space-y-1">
                        <div>• Lesion type: <span className="font-mono">SNOMED CT 400010006</span> (skin lesion)</div>
                        <div>• Size: <span className="font-mono">SNOMED 246116008</span> + UCUM <span className="font-mono">mm</span></div>
                        <div>• Body site: <span className="font-mono">SNOMED 368209003</span> (right arm), etc.</div>
                        <div>• ABCDE criteria: DermMap extension on <span className="font-mono">Observation.component</span></div>
                      </div>
                    </div>
                  </div>
                )}

                {/* ── Activity Feed tab ── */}
                {activeTab === 'activity' && (
                  <div className="space-y-1 max-h-80 overflow-y-auto">
                    {activity.map((item, i) => (
                      <div key={i} className="flex items-center gap-3 py-2 px-3 rounded-lg hover:bg-slate-50 transition-colors">
                        <div className={clsx(
                          'w-6 h-6 rounded-full flex items-center justify-center shrink-0',
                          item.type === 'pull' ? 'bg-blue-100' : item.type === 'push' ? 'bg-teal-100' : 'bg-red-100',
                        )}>
                          {item.type === 'pull'
                            ? <Download size={12} className="text-blue-600" />
                            : item.type === 'push'
                              ? <Upload size={12} className="text-teal-600" />
                              : <AlertCircle size={12} className="text-red-500" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <span className="text-sm text-slate-700">
                            {item.type === 'pull' ? 'Pulled' : item.type === 'push' ? 'Pushed' : 'Error on'}{' '}
                            <span className="font-mono font-semibold text-slate-900">{item.resource}</span>
                          </span>
                          <span className="text-xs text-slate-500 ml-2 truncate">{item.patient}</span>
                        </div>
                        <span className="text-xs text-slate-400 shrink-0">
                          {format(new Date(item.ts), 'h:mm a')}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="card p-8 text-center">
              <div className="w-14 h-14 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl">
                {selectedEHR.logo}
              </div>
              <h4 className="font-bold text-slate-800 text-lg">{selectedEHR.name}</h4>
              <p className="text-sm text-slate-500 mt-2 max-w-sm mx-auto">{selectedEHR.description}</p>
              <p className="text-sm text-slate-500 mt-1">
                FHIR R4 architecture is ready — completing certification and partner testing.
              </p>
              <div className="mt-4 inline-flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-xl px-4 py-2 text-sm text-blue-700">
                <Clock size={14} />
                Expected {(selectedEHR as any).eta ?? 'TBD'}
              </div>
              <div className="mt-4">
                <button className="btn-secondary mx-auto">
                  Request Early Access
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
