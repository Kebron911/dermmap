import { Settings, Bell, Shield, Smartphone, Palette, Camera, Database } from 'lucide-react';

export function SettingsPage() {
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
              <input className="input" defaultValue="Riverside Dermatology Associates" />
            </div>
            <div>
              <label className="label">PDF Header / Logo URL</label>
              <input className="input" placeholder="https://yourclinic.com/logo.png" />
            </div>
            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
              <span className="text-sm text-slate-700">Show clinic name on body maps</span>
              <div className="w-10 h-6 bg-teal-600 rounded-full relative cursor-pointer">
                <div className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full shadow" />
              </div>
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
              <select className="input">
                <option>Anterior (Front)</option>
                <option>Posterior (Back)</option>
              </select>
            </div>
            <div>
              <label className="label">Default Skin Tone (Diagram)</label>
              <div className="flex gap-2">
                {['#FDDCB5', '#F5C9A0', '#D4A574', '#A0714F', '#7B4F2E', '#3D1A00'].map((color) => (
                  <button
                    key={color}
                    className="w-8 h-8 rounded-full border-2 border-white shadow-sm hover:scale-110 transition-transform"
                    style={{ backgroundColor: color }}
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
            {[
              { label: 'Auto-capture when stable', defaultOn: false },
              { label: 'Show ruler overlay by default', defaultOn: true },
              { label: 'Dermoscopy mode detection', defaultOn: true },
              { label: 'Strip EXIF data from photos', defaultOn: true, required: true },
              { label: 'Require at least 1 photo per lesion', defaultOn: false },
            ].map((setting) => (
              <div key={setting.label} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                <div>
                  <span className="text-sm text-slate-700">{setting.label}</span>
                  {setting.required && (
                    <span className="ml-2 text-xs text-red-600 font-medium">(Required — HIPAA)</span>
                  )}
                </div>
                <div className={`w-10 h-6 rounded-full relative cursor-pointer transition-colors ${setting.defaultOn ? 'bg-teal-600' : 'bg-slate-300'}`}>
                  <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all ${setting.defaultOn ? 'right-1' : 'left-1'}`} />
                </div>
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
            {[
              { label: 'New visit pending review', on: true },
              { label: 'Biopsy result entered', on: true },
              { label: 'Patient schedule synced', on: false },
              { label: 'Session timeout warning', on: true },
            ].map((notif) => (
              <div key={notif.label} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                <span className="text-sm text-slate-700">{notif.label}</span>
                <div className={`w-10 h-6 rounded-full relative cursor-pointer transition-colors ${notif.on ? 'bg-teal-600' : 'bg-slate-300'}`}>
                  <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all ${notif.on ? 'right-1' : 'left-1'}`} />
                </div>
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
              <select className="input">
                <option>5 minutes (HIPAA minimum)</option>
                <option>3 minutes</option>
                <option>10 minutes</option>
              </select>
            </div>
            <div>
              <label className="label">Web Session Timeout</label>
              <select className="input">
                <option>15 minutes (HIPAA minimum)</option>
                <option>10 minutes</option>
                <option>30 minutes</option>
              </select>
            </div>
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700">
              <strong>HIPAA Notice:</strong> Minimum session timeouts are enforced per 45 CFR §164.312(a)(2)(iii).
              Shorter timeouts increase security. Longer timeouts require documented business justification.
            </div>
          </div>
        </div>

        {/* Save */}
        <div className="flex gap-3">
          <button className="btn-secondary flex-1 justify-center">Reset to Defaults</button>
          <button className="btn-primary flex-1 justify-center">Save Settings</button>
        </div>
      </div>
    </div>
  );
}
