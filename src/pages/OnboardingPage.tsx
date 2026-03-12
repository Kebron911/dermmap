/**
 * OnboardingPage — HIPAA-compliant clinic signup flow.
 *
 * Four steps:
 *   1. Clinic information (name, NPI, address)
 *   2. Admin account credentials
 *   3. BAA review and typed-signature acceptance
 *   4. Success screen with next-step instructions
 *
 * On completion calls POST /api/provision/clinic (unauthenticated).
 * No PHI is collected during signup — only organizational / account data.
 */

import { useState, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Building2, User, FileCheck, CheckCircle,
  ChevronRight, ChevronLeft, Eye, EyeOff, AlertCircle, Loader2,
} from 'lucide-react';
import clsx from 'clsx';

// ─── Types ───────────────────────────────────────────────────────────────────

interface ClinicInfo {
  clinic_name: string;
  npi: string;
  address_street: string;
  address_city: string;
  address_state: string;
  address_zip: string;
  phone: string;
  clinic_email: string;
}

interface AdminInfo {
  admin_name: string;
  admin_email: string;
  admin_password: string;
  admin_password_confirm: string;
}

// ─── BAA text ────────────────────────────────────────────────────────────────
// Required elements per HIPAA §164.504(e)(2); keep version in sync with
// BAA_VERSION constant in backend/src/routes/provision.js.
const BAA_VERSION = '1.0';
const BAA_TEXT = `BUSINESS ASSOCIATE AGREEMENT — Version ${BAA_VERSION}
Effective Date: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}

This Business Associate Agreement ("BAA") is entered into between the Covered
Entity identified during registration ("Covered Entity") and DermMap, Inc.
("Business Associate"), collectively the "Parties."

1. DEFINITIONS
   Terms used but not otherwise defined shall have the meaning ascribed in 45
   C.F.R. Parts 160 and 164 (the HIPAA Rules).
   "Protected Health Information" or "PHI" means individually identifiable
   health information as defined in 45 C.F.R. § 160.103.

2. OBLIGATIONS OF BUSINESS ASSOCIATE
   Business Associate agrees to:
   (a) Not use or further disclose PHI other than as permitted by this BAA or
       as required by law;
   (b) Use appropriate administrative, physical, and technical safeguards, and
       comply with Subpart C of 45 C.F.R. Part 164 (Security Rule) with respect
       to electronic PHI;
   (c) Report to Covered Entity any use or disclosure of PHI not permitted by
       this BAA, and any Security Incident, without unreasonable delay;
   (d) Ensure that subcontractors agree to the same restrictions and conditions
       that apply to Business Associate;
   (e) Make PHI available for access, amendment, and accounting as required by
       45 C.F.R. §§ 164.524, 164.526 and 164.528;
   (f) To the extent Business Associate carries out Covered Entity's obligations
       under Subpart E of 45 C.F.R. Part 164, comply with those requirements.

3. PERMITTED USES AND DISCLOSURES
   Business Associate may use and disclose PHI solely to perform the services
   described in the DermMap Terms of Service, or as required by law.

4. TERM AND TERMINATION
   This BAA is effective upon the Covered Entity's execution (indicated below)
   and shall remain in force until the DermMap subscription terminates. Upon
   termination, Business Associate shall destroy or return all PHI.

5. MISCELLANEOUS
   This BAA shall be governed by applicable federal law. In the event of any
   conflict between this BAA and the HIPAA Rules, the HIPAA Rules shall govern.

By electronically signing below, the individual signing on behalf of Covered
Entity represents they are authorized to bind Covered Entity and agrees to the
terms of this BAA on Covered Entity's behalf.
`;

// ─── Step indicator ───────────────────────────────────────────────────────────

const STEPS = [
  { label: 'Clinic Info',  Icon: Building2 },
  { label: 'Admin Account', Icon: User },
  { label: 'Sign BAA',     Icon: FileCheck },
  { label: 'Complete',     Icon: CheckCircle },
];

function StepIndicator({ current }: { current: number }) {
  return (
    <div className="flex items-center justify-center gap-0 mb-8">
      {STEPS.map((step, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <div key={i} className="flex items-center">
            <div className="flex flex-col items-center">
              <div className={clsx(
                'w-9 h-9 rounded-full flex items-center justify-center transition-colors',
                done   && 'bg-teal-600 text-white',
                active && 'bg-teal-600 text-white ring-4 ring-teal-100',
                !done && !active && 'bg-slate-100 text-slate-400',
              )}>
                {done
                  ? <CheckCircle size={18} />
                  : <step.Icon size={18} />
                }
              </div>
              <span className={clsx(
                'mt-1 text-xs font-medium hidden sm:block',
                active ? 'text-teal-700' : 'text-slate-400',
              )}>
                {step.label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div className={clsx(
                'w-16 h-0.5 mx-1 mb-5',
                i < current ? 'bg-teal-600' : 'bg-slate-200',
              )} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Field components ─────────────────────────────────────────────────────────

function Field({
  label, name, type = 'text', value, onChange, required, placeholder, helpText, error,
}: {
  label: string; name: string; type?: string; value: string;
  onChange: (v: string) => void; required?: boolean; placeholder?: string;
  helpText?: string; error?: string;
}) {
  const [showPw, setShowPw] = useState(false);
  const isPassword = type === 'password';
  return (
    <div>
      <label htmlFor={name} className="block text-sm font-medium text-slate-700 mb-1">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      <div className="relative">
        <input
          id={name}
          name={name}
          type={isPassword ? (showPw ? 'text' : 'password') : type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          autoComplete={isPassword ? 'new-password' : 'off'}
          className={clsx(
            'w-full px-3 py-2 border rounded-lg text-sm outline-none transition',
            'focus:ring-2 focus:ring-teal-500 focus:border-teal-500',
            error ? 'border-red-400 bg-red-50' : 'border-slate-300 bg-white',
          )}
        />
        {isPassword && (
          <button
            type="button"
            tabIndex={-1}
            onClick={() => setShowPw((p) => !p)}
            className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
          >
            {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        )}
      </div>
      {helpText && !error && <p className="mt-1 text-xs text-slate-500">{helpText}</p>}
      {error && <p className="mt-1 text-xs text-red-600 flex items-center gap-1"><AlertCircle size={12} />{error}</p>}
    </div>
  );
}

// ─── Checks ───────────────────────────────────────────────────────────────────

function validateClinic(c: ClinicInfo): Partial<Record<keyof ClinicInfo, string>> {
  const e: Partial<Record<keyof ClinicInfo, string>> = {};
  if (!c.clinic_name.trim()) e.clinic_name = 'Clinic name is required';
  if (!/^\d{10}$/.test(c.npi)) e.npi = 'NPI must be exactly 10 digits';
  return e;
}

function validateAdmin(a: AdminInfo): Partial<Record<keyof AdminInfo, string>> {
  const e: Partial<Record<keyof AdminInfo, string>> = {};
  if (!a.admin_name.trim()) e.admin_name = 'Name is required';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(a.admin_email)) e.admin_email = 'Valid email required';
  if (a.admin_password.length < 12) e.admin_password = 'Password must be at least 12 characters';
  if (a.admin_password !== a.admin_password_confirm) e.admin_password_confirm = 'Passwords do not match';
  return e;
}

// ─── Main component ───────────────────────────────────────────────────────────

export function OnboardingPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState('');

  const [clinic, setClinic] = useState<ClinicInfo>({
    clinic_name: '', npi: '', address_street: '', address_city: '',
    address_state: '', address_zip: '', phone: '', clinic_email: '',
  });
  const [admin, setAdmin] = useState<AdminInfo>({
    admin_name: '', admin_email: '', admin_password: '', admin_password_confirm: '',
  });
  const [baaAccepted, setBaaAccepted] = useState(false);
  const [baaSignatory, setBaaSignatory] = useState('');

  const [clinicErrors, setClinicErrors] = useState<Partial<Record<keyof ClinicInfo, string>>>({});
  const [adminErrors, setAdminErrors] = useState<Partial<Record<keyof AdminInfo, string>>>({});
  const [baaError, setBaaError] = useState('');

  function setC<K extends keyof ClinicInfo>(key: K, val: string) {
    setClinic((p) => ({ ...p, [key]: val }));
    setClinicErrors((p) => { const n = { ...p }; delete n[key]; return n; });
  }
  function setA<K extends keyof AdminInfo>(key: K, val: string) {
    setAdmin((p) => ({ ...p, [key]: val }));
    setAdminErrors((p) => { const n = { ...p }; delete n[key]; return n; });
  }

  function nextStep() {
    if (step === 0) {
      const errs = validateClinic(clinic);
      if (Object.keys(errs).length) { setClinicErrors(errs); return; }
    }
    if (step === 1) {
      const errs = validateAdmin(admin);
      if (Object.keys(errs).length) { setAdminErrors(errs); return; }
    }
    setStep((s) => s + 1);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!baaAccepted) { setBaaError('You must accept the BAA to continue.'); return; }
    if (baaSignatory.trim().length < 2) { setBaaError('Enter your full name to sign.'); return; }

    setSubmitting(true);
    setServerError('');
    try {
      const res = await fetch('/api/provision/clinic', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...clinic,
          ...admin,
          baa_accepted: true,
          baa_signatory_name: baaSignatory.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setServerError(data.error || 'Registration failed. Please try again.');
        return;
      }
      setStep(3);
    } catch {
      setServerError('Network error. Check your connection and try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 to-slate-100 flex items-start justify-center p-4 pt-12">
      <div className="w-full max-w-2xl">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2 mb-8">
          <div className="w-9 h-9 bg-teal-600 rounded-lg flex items-center justify-center">
            <span className="text-white text-lg font-bold">D</span>
          </div>
          <span className="text-2xl font-bold text-slate-900">DermMap</span>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8">
          <StepIndicator current={step} />

          {/* ── Step 0: Clinic Information ── */}
          {step === 0 && (
            <div>
              <h2 className="text-xl font-bold text-slate-900 mb-1">Clinic Information</h2>
              <p className="text-sm text-slate-500 mb-6">
                This information appears on patient reports and BAA documentation.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <Field label="Practice Name" name="clinic_name" value={clinic.clinic_name}
                    onChange={(v) => setC('clinic_name', v)} required
                    placeholder="Riverside Dermatology Associates"
                    error={clinicErrors.clinic_name} />
                </div>
                <Field label="NPI Number" name="npi" value={clinic.npi}
                  onChange={(v) => setC('npi', v)} required placeholder="10-digit NPI"
                  helpText="Your 10-digit National Provider Identifier"
                  error={clinicErrors.npi} />
                <Field label="Practice Phone" name="phone" value={clinic.phone}
                  onChange={(v) => setC('phone', v)} placeholder="(555) 000-0000" />
                <div className="sm:col-span-2">
                  <Field label="Practice Email" name="clinic_email" type="email"
                    value={clinic.clinic_email} onChange={(v) => setC('clinic_email', v)}
                    placeholder="admin@yourclinic.com" />
                </div>
                <div className="sm:col-span-2">
                  <Field label="Street Address" name="address_street"
                    value={clinic.address_street} onChange={(v) => setC('address_street', v)}
                    placeholder="123 Medical Plaza Dr" />
                </div>
                <Field label="City" name="address_city" value={clinic.address_city}
                  onChange={(v) => setC('address_city', v)} placeholder="Phoenix" />
                <div className="grid grid-cols-2 gap-3">
                  <Field label="State" name="address_state" value={clinic.address_state}
                    onChange={(v) => setC('address_state', v)} placeholder="AZ" />
                  <Field label="ZIP" name="address_zip" value={clinic.address_zip}
                    onChange={(v) => setC('address_zip', v)} placeholder="85001" />
                </div>
              </div>
            </div>
          )}

          {/* ── Step 1: Admin Account ── */}
          {step === 1 && (
            <div>
              <h2 className="text-xl font-bold text-slate-900 mb-1">Administrator Account</h2>
              <p className="text-sm text-slate-500 mb-6">
                This account will have full admin access to provision providers and manage settings.
                You can add additional users after setup.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <Field label="Full Name" name="admin_name" value={admin.admin_name}
                    onChange={(v) => setA('admin_name', v)} required
                    placeholder="Dr. Jane Smith" error={adminErrors.admin_name} />
                </div>
                <div className="sm:col-span-2">
                  <Field label="Email Address" name="admin_email" type="email"
                    value={admin.admin_email} onChange={(v) => setA('admin_email', v)} required
                    placeholder="jane.smith@yourclinic.com" error={adminErrors.admin_email} />
                </div>
                <Field label="Password" name="admin_password" type="password"
                  value={admin.admin_password} onChange={(v) => setA('admin_password', v)} required
                  helpText="Minimum 12 characters (HIPAA requirement)"
                  error={adminErrors.admin_password} />
                <Field label="Confirm Password" name="admin_password_confirm" type="password"
                  value={admin.admin_password_confirm}
                  onChange={(v) => setA('admin_password_confirm', v)} required
                  error={adminErrors.admin_password_confirm} />
              </div>
              <div className="mt-4 p-3 bg-blue-50 border border-blue-100 rounded-lg text-xs text-blue-700">
                <strong>Security note:</strong> After setup, each provider and MA will receive
                their own account. Shared credentials are not permitted under HIPAA.
              </div>
            </div>
          )}

          {/* ── Step 2: BAA ── */}
          {step === 2 && (
            <form onSubmit={handleSubmit}>
              <h2 className="text-xl font-bold text-slate-900 mb-1">
                Business Associate Agreement
              </h2>
              <p className="text-sm text-slate-500 mb-4">
                Federal law (HIPAA 45 C.F.R. §164.308(b)) requires a signed BAA
                before any protected health information can be shared with DermMap.
                Please read the agreement carefully.
              </p>

              {/* BAA text box */}
              <div className="h-56 overflow-y-auto border border-slate-200 rounded-lg bg-slate-50
                              p-4 text-xs text-slate-600 font-mono leading-relaxed mb-4
                              whitespace-pre-wrap">
                {BAA_TEXT}
              </div>

              {/* Acceptance checkbox */}
              <label className="flex items-start gap-3 cursor-pointer mb-4">
                <input
                  type="checkbox"
                  checked={baaAccepted}
                  onChange={(e) => { setBaaAccepted(e.target.checked); setBaaError(''); }}
                  className="mt-0.5 h-4 w-4 rounded border-slate-300 text-teal-600
                             focus:ring-teal-500 cursor-pointer"
                />
                <span className="text-sm text-slate-700">
                  I have read and agree to the terms of this Business Associate Agreement on
                  behalf of my organization, and I have authority to bind my organization
                  to this agreement.
                </span>
              </label>

              {/* Typed signature */}
              <div className="mb-1">
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Electronic Signature — Type your full legal name
                  <span className="text-red-500 ml-0.5">*</span>
                </label>
                <input
                  type="text"
                  value={baaSignatory}
                  onChange={(e) => { setBaaSignatory(e.target.value); setBaaError(''); }}
                  placeholder="Your full name"
                  className={clsx(
                    'w-full px-3 py-2 border rounded-lg text-sm outline-none transition',
                    'focus:ring-2 focus:ring-teal-500 focus:border-teal-500 italic',
                    baaError ? 'border-red-400 bg-red-50' : 'border-slate-300 bg-white',
                  )}
                />
              </div>
              <p className="text-xs text-slate-500 mb-4">
                By typing your name and clicking "Complete Registration", you are electronically
                signing this BAA. Your IP address, timestamp, and this name will be recorded
                per HIPAA requirements.
              </p>

              {baaError && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg
                               text-sm text-red-700 flex items-center gap-2">
                  <AlertCircle size={16} className="shrink-0" />
                  {baaError}
                </div>
              )}

              {serverError && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg
                               text-sm text-red-700 flex items-center gap-2">
                  <AlertCircle size={16} className="shrink-0" />
                  {serverError}
                </div>
              )}

              <div className="flex gap-3 mt-2">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  disabled={submitting}
                  className="btn-secondary flex items-center gap-1.5"
                >
                  <ChevronLeft size={16} /> Back
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn-primary flex-1 flex items-center justify-center gap-2
                             disabled:opacity-60"
                >
                  {submitting
                    ? <><Loader2 size={16} className="animate-spin" /> Registering…</>
                    : <><FileCheck size={16} /> Complete Registration</>
                  }
                </button>
              </div>
            </form>
          )}

          {/* ── Step 3: Success ── */}
          {step === 3 && (
            <div className="text-center py-4">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-teal-100
                              rounded-full mb-4">
                <CheckCircle className="text-teal-600" size={36} />
              </div>
              <h2 className="text-2xl font-bold text-slate-900 mb-2">Registration Complete</h2>
              <p className="text-slate-600 mb-6 max-w-md mx-auto">
                Your clinic has been registered. Check <strong>{admin.admin_email}</strong> for
                an activation link. Your account will be active within minutes.
              </p>

              <div className="text-left bg-slate-50 border border-slate-200 rounded-xl p-5
                              mb-6 space-y-3 max-w-sm mx-auto">
                <h3 className="font-semibold text-slate-900 text-sm mb-2">Next Steps</h3>
                {[
                  'Click the activation link in your email',
                  'Log in as admin and set up provider accounts',
                  'Add your first patient and test the workflow',
                  'Schedule a 30-minute onboarding call with our team',
                ].map((item, i) => (
                  <div key={i} className="flex items-start gap-2.5 text-sm text-slate-700">
                    <span className="mt-0.5 w-5 h-5 rounded-full bg-teal-600 text-white text-xs
                                     flex items-center justify-center shrink-0 font-bold">
                      {i + 1}
                    </span>
                    {item}
                  </div>
                ))}
              </div>

              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <button
                  onClick={() => navigate('/login')}
                  className="btn-primary flex items-center justify-center gap-2"
                >
                  Go to Login
                </button>
                <a
                  href="mailto:onboarding@dermmap.io"
                  className="btn-secondary flex items-center justify-center gap-2"
                >
                  Contact Onboarding
                </a>
              </div>
            </div>
          )}

          {/* Navigation buttons (steps 0, 1 only — step 2 has its own form submit) */}
          {step < 2 && (
            <div className="flex gap-3 mt-8">
              {step > 0 && (
                <button
                  onClick={() => setStep((s) => s - 1)}
                  className="btn-secondary flex items-center gap-1.5"
                >
                  <ChevronLeft size={16} /> Back
                </button>
              )}
              {step === 0 && (
                <button
                  onClick={() => navigate('/login')}
                  className="btn-secondary"
                >
                  Already have an account
                </button>
              )}
              <button
                onClick={nextStep}
                className="btn-primary flex-1 flex items-center justify-center gap-1.5"
              >
                Continue <ChevronRight size={16} />
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-slate-500 mt-6">
          HIPAA-compliant · SOC 2 in progress · 
          <a href="/security" className="underline ml-1">Security overview</a>
        </p>
      </div>
    </div>
  );
}
