import { useState, useEffect, useCallback } from 'react';
import { Settings, Bell, Shield, Palette, Camera, Database, CheckCircle, AlertCircle } from 'lucide-react';
import { api } from '../services/api';

const SKIN_TONES = ['#FDDCB5', '#F5C9A0', '#D4A574', '#A0714F', '#7B4F2E', '#3D1A00'];

interface ClinicSettings {
  clinic_name: string;
  logo_url: string;
  show_clinic_name_on_maps: boolean;
  default_body_view: 'anterior' | 'posterior';
  skin_tone: string;
  photo_auto_capture: boolean;
  photo_ruler_overlay: boolean;
  photo_dermoscopy_detection: boolean;
  photo_strip_exif: boolean;
  photo_require_per_lesion: boolean;
  notif_pending_review: boolean;
  notif_biopsy_result: boolean;
  notif_schedule_sync: boolean;
  notif_session_timeout: boolean;
  mobile_timeout_minutes: number;
  web_timeout_minutes: number;
}

const DEFAULTS: ClinicSettings = {
  clinic_name: '',
  logo_url: '',
  show_clinic_name_on_maps: true,
  default_body_view: 'anterior',
  skin_tone: '#F5C9A0',
  photo_auto_capture: false,
  photo_ruler_overlay: true,
  photo_dermoscopy_detection: true,
  photo_strip_exif: true,
  photo_require_per_lesion: false,
  notif_pending_review: true,
  notif_biopsy_result: true,
  notif_schedule_sync: false,
  notif_session_timeout: true,
  mobile_timeout_minutes: 5,
  web_timeout_minutes: 15,
};

function Toggle({ on, onChange }: { on: boolean; onChange: () => void }) {
  return (
    <button
      type="button"
      onClick={onChange}
      className={`w-10 h-6 rounded-full relative transition-colors focus:outline-none focus:ring-2 focus:ring-teal-400 focus:ring-offset-1 ${on ? 'bg-teal-600' : 'bg-slate-300'}`}
      aria-pressed={on}
    >
      <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all ${on ? 'right-1' : 'left-1'}`} />
    </button>
  );
}

export function SettingsPage() {
  const [settings, setSettings] = useState<ClinicSettings>(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saved' | 'error'>('idle');

  useEffect(() => {
    api.get<ClinicSettings>('/api/settings')
      .then((data) => setSettings({ ...DEFAULTS, ...data }))
      .catch(() => { /* use defaults if API unavailable */ })
      .finally(() => setLoading(false));
  }, []);

  const set = useCallback(<K extends keyof ClinicSettings>(key: K, value: ClinicSettings[K]) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
    setSaveStatus('idle');
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.put('/api/settings', settings);
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } catch {
      setSaveStatus('error');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setSettings(DEFAULTS);
    setSaveStatus('idle');
  };

  if (loading) {
    return (
      <div className="p-6 max-w-3xl mx-auto">
        <div className="flex items-center gap-2 text-slate-400">
          <div className="w-4 h-4 border-2 border-teal-400 border-t-transparent rounded-full animate-spin" />
          Loading settings…
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-3xl mx-auto fade-in">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <Settings size={22} className="text-teal-600" />
          Settings
        </h1>
        <p className="text-slate-500 text-sm mt-1">Configure DermMap for your practice workflow</p>
      </div>

      <div className="space-y-4">
        {/* Clinic Branding */}
        <div className="card p-5">
          <div className="flex items-center gap-3 mb-4">
            <Palette size={18} className="text-teal-600" />
            <h3 className="font-semibold text-slate-900">Clinic Branding</h3>
          </div>
          <div className="space-y-4">
            <div>
              <label className="label">Clinic Name</label>
              <input
                className="input"
                value={settings.clinic_name}
                onChange={(e) => set('clinic_name', e.target.value)}
                placeholder="Your clinic name"
              />
            </div>
            <div>
              <label className="label">PDF Header / Logo URL</label>
              <input
                className="input"
                value={settings.logo_url}
                onChange={(e) => set('logo_url', e.target.value)}
                placeholder="https://yourclinic.com/logo.png"
              />
            </div>
            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
              <span className="text-sm text-slate-700">Show clinic name on body maps</span>
              <Toggle on={settings.show_clinic_name_on_maps} onChange={() => set('show_clinic_name_on_maps', !settings.show_clinic_name_on_maps)} />
            </div>
          </div>
        </div>

        {/* Body Map Defaults */}
        <div className="card p-5">
          <div className="flex items-center gap-3 mb-4">
            <Database size={18} className="text-teal-600" />
            <h3 className="font-semibold text-slate-900">Body Map Defaults</h3>
          </div>
          <div className="space-y-3">
            <div>
              <label className="label">Default Opening View</label>
              <select
                className="input"
                value={settings.default_body_view}
                onChange={(e) => set('default_body_view', e.target.value as ClinicSettings['default_body_view'])}
              >
                <option value="anterior">Anterior (Front)</option>
                <option value="posterior">Posterior (Back)</option>
              </select>
            </div>
            <div>
              <label className="label">Default Skin Tone (Diagram)</label>
              <div className="flex gap-2">
                {SKIN_TONES.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => set('skin_tone', color)}
                    className="w-8 h-8 rounded-full border-2 hover:scale-110 transition-transform"
                    style={{ backgroundColor: color, borderColor: settings.skin_tone === color ? '#0D9488' : 'white' }}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Photo Settings */}
        <div className="card p-5">
          <div className="flex items-center gap-3 mb-4">
            <Camera size={18} className="text-teal-600" />
            <h3 className="font-semibold text-slate-900">Photo Capture Settings</h3>
          </div>
          <div className="space-y-3">
            {([
              { label: 'Auto-capture when stable', key: 'photo_auto_capture' as const },
              { label: 'Show ruler overlay by default', key: 'photo_ruler_overlay' as const },
              { label: 'Dermoscopy mode detection', key: 'photo_dermoscopy_detection' as const },
              { label: 'Strip EXIF data from photos', key: 'photo_strip_exif' as const, required: true },
              { label: 'Require at least 1 photo per lesion', key: 'photo_require_per_lesion' as const },
            ] as const).map((item) => (
              <div key={item.key} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                <div>
                  <span className="text-sm text-slate-700">{item.label}</span>
                  {'required' in item && item.required && (
                    <span className="ml-2 text-xs text-red-600 font-medium">(Required — HIPAA)</span>
                  )}
                </div>
                <Toggle
                  on={settings[item.key]}
                  onChange={() => {
                    if ('required' in item && item.required) return; // lock required toggles
                    set(item.key, !settings[item.key]);
                  }}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Notifications */}
        <div className="card p-5">
          <div className="flex items-center gap-3 mb-4">
            <Bell size={18} className="text-teal-600" />
            <h3 className="font-semibold text-slate-900">Notifications</h3>
          </div>
          <div className="space-y-2">
            {([
              { label: 'New visit pending review', key: 'notif_pending_review' as const },
              { label: 'Biopsy result entered', key: 'notif_biopsy_result' as const },
              { label: 'Patient schedule synced', key: 'notif_schedule_sync' as const },
              { label: 'Session timeout warning', key: 'notif_session_timeout' as const },
            ] as const).map((item) => (
              <div key={item.key} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                <span className="text-sm text-slate-700">{item.label}</span>
                <Toggle on={settings[item.key]} onChange={() => set(item.key, !settings[item.key])} />
              </div>
            ))}
          </div>
        </div>

        {/* Security */}
        <div className="card p-5">
          <div className="flex items-center gap-3 mb-4">
            <Shield size={18} className="text-teal-600" />
            <h3 className="font-semibold text-slate-900">Security Settings</h3>
          </div>
          <div className="space-y-3">
            <div>
              <label className="label">Mobile Session Timeout</label>
              <select
                className="input"
                value={settings.mobile_timeout_minutes}
                onChange={(e) => set('mobile_timeout_minutes', parseInt(e.target.value))}
              >
                <option value={3}>3 minutes</option>
                <option value={5}>5 minutes (HIPAA minimum)</option>
                <option value={10}>10 minutes</option>
              </select>
            </div>
            <div>
              <label className="label">Web Session Timeout</label>
              <select
                className="input"
                value={settings.web_timeout_minutes}
                onChange={(e) => set('web_timeout_minutes', parseInt(e.target.value))}
              >
                <option value={10}>10 minutes</option>
                <option value={15}>15 minutes (HIPAA minimum)</option>
                <option value={30}>30 minutes</option>
              </select>
            </div>
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700">
              <strong>HIPAA Notice:</strong> Minimum session timeouts are enforced per 45 CFR §164.312(a)(2)(iii).
              Shorter timeouts increase security. Longer timeouts require documented business justification.
            </div>
          </div>
        </div>

        {/* Save */}
        <div className="flex items-center gap-3">
          <button type="button" onClick={handleReset} className="btn-secondary flex-1 justify-center">
            Reset to Defaults
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="btn-primary flex-1 justify-center disabled:opacity-60"
          >
            {saving ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : 'Save Settings'}
          </button>
        </div>

        {saveStatus === 'saved' && (
          <div className="flex items-center gap-2 text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 text-sm">
            <CheckCircle size={16} />
            Settings saved successfully.
          </div>
        )}
        {saveStatus === 'error' && (
          <div className="flex items-center gap-2 text-red-700 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm">
            <AlertCircle size={16} />
            Failed to save settings. Please try again.
          </div>
        )}
      </div>
    </div>
  );
}
