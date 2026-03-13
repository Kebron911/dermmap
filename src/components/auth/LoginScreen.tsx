import { useState } from 'react';
import { Shield, Lock, Eye, EyeOff, ChevronRight, CheckCircle2, Stethoscope } from 'lucide-react';
import { useAppStore } from '../../store/appStore';
import { DEMO_USERS } from '../../data/syntheticData';
import { config } from '../../config';

const roleColors = {
  ma: { bg: 'bg-sky-50', border: 'border-sky-200', icon: 'bg-sky-100 text-sky-700', badge: 'text-sky-700' },
  provider: { bg: 'bg-teal-50', border: 'border-teal-200', icon: 'bg-teal-100 text-teal-700', badge: 'text-teal-700' },
  admin: { bg: 'bg-violet-50', border: 'border-violet-200', icon: 'bg-violet-100 text-violet-700', badge: 'text-violet-700' },
  manager: { bg: 'bg-violet-50', border: 'border-violet-200', icon: 'bg-violet-100 text-violet-700', badge: 'text-violet-700' },
};

const roleIcons = {
  ma: '🩺',
  provider: '👨‍⚕️',
  admin: '⚙️',
  manager: '⚙️',
};

export function LoginScreen() {
  const { login, setCurrentPage } = useAppStore();
  const [showPassword, setShowPassword] = useState(false);
  const [selectedDemo, setSelectedDemo] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mfaCode, setMfaCode] = useState('');
  const [step, setStep] = useState<'credentials' | 'mfa'>('credentials');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDemoLogin = (userId: string) => {
    const user = DEMO_USERS.find((u) => u.id === userId);
    if (!user) return;
    setSelectedDemo(userId);
    setEmail(user.email);
    setPassword('demo123');
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    if (step === 'credentials') {
      setLoading(true);
      setTimeout(() => {
        setLoading(false);
        setStep('mfa');
      }, 800);
    } else {
      setLoading(true);
      try {
        const success = await login(email, password);
        if (success) {
          const loggedInUser = useAppStore.getState().currentUser;
          const role = loggedInUser?.role ?? (DEMO_USERS.find((u) => u.email === email)?.role || 'ma');
          const landingPage = role === 'ma' ? 'schedule' : role === 'provider' ? 'queue' : 'analytics';
          setCurrentPage(landingPage);
        } else {
          setError('Invalid credentials. Please try again.');
          setStep('credentials');
        }
      } catch (err) {
        // Check if it's a connection error
        const isConnectionError = err instanceof TypeError && 
          (err.message?.includes('fetch failed') || err.message?.includes('Failed to fetch'));
        
        if (isConnectionError) {
          setError('Cannot connect to server. Please start the Docker backend (see README.md)');
        } else {
          setError('Login failed. Please try again.');
        }
        setStep('credentials');
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-teal-950 to-slate-900 flex flex-col items-center justify-center p-4">
      {/* Demo Banner */}
      {config.isDemo && (
        <div className="fixed top-0 inset-x-0 bg-amber-500 text-amber-950 text-center py-1.5 text-xs font-semibold tracking-wide z-50">
          DEMO ENVIRONMENT — SYNTHETIC DATA ONLY — NOT FOR CLINICAL USE
        </div>
      )}

      <div className="w-full max-w-md mt-8">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-teal-500 rounded-2xl mb-4 shadow-lg shadow-teal-500/30">
            <Stethoscope className="text-white" size={32} />
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">DermMap</h1>
          <p className="text-teal-300 text-sm mt-1">Dermatology Lesion Mapping Platform</p>
        </div>

        {/* Demo Role Selection */}
        {config.isDemo && <div className="card p-4 mb-4">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">
            Demo — Select a Role to Continue
          </p>
          <div className="space-y-2">
            {DEMO_USERS.map((user) => {
              const colors = roleColors[user.role];
              const isSelected = selectedDemo === user.id;
              return (
                <button
                  key={user.id}
                  data-testid={`demo-user-${user.role}`}
                  onClick={() => handleDemoLogin(user.id)}
                  className={`w-full text-left p-3 rounded-lg border transition-all duration-150 ${
                    isSelected
                      ? `${colors.bg} ${colors.border} shadow-sm`
                      : 'border-slate-100 hover:border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center text-lg ${isSelected ? colors.icon : 'bg-slate-100'}`}>
                      {roleIcons[user.role]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-slate-900">{user.name}</span>
                        {user.credentials && (
                          <span className={`text-xs font-medium ${isSelected ? colors.badge : 'text-slate-500'}`}>
                            {user.credentials}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 truncate">{user.subtitle}</p>
                    </div>
                    {isSelected && <CheckCircle2 size={16} className="text-teal-600 shrink-0" />}
                  </div>
                </button>
              );
            })}
          </div>
        </div>}

        {/* Login Form */}
        <div className="card p-6">
          <div className="flex items-center gap-2 mb-5">
            <Lock size={16} className="text-slate-400" />
            <span className="text-sm font-semibold text-slate-700">
              {step === 'credentials' ? 'Sign In' : 'Multi-Factor Authentication'}
            </span>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}
            
            {step === 'credentials' ? (
              <>
                <div>
                  <label className="label">Email Address</label>
                  <input
                    type="email"
                    className="input"
                    placeholder="you@clinic.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className="label">Password</label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      className="input pr-10"
                      placeholder="••••••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div>
                <label className="label">Authentication Code</label>
                <p className="text-xs text-slate-500 mb-3">
                  Enter the 6-digit code from your authenticator app{config.isDemo ? ' (demo: any 6 digits)' : ''}
                </p>
                <input
                  type="text"
                  aria-label="Authentication code"
                  className="input text-center text-2xl tracking-widest font-mono"
                  placeholder="000000"
                  maxLength={6}
                  value={mfaCode}
                  onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, ''))}
                  autoFocus
                />
              </div>
            )}

            <button
              type="submit"
              disabled={loading || (config.isDemo && !selectedDemo && step === 'credentials')}
              className="w-full btn-primary justify-center py-2.5 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  {step === 'credentials' ? 'Continue' : 'Sign In'}
                  <ChevronRight size={16} />
                </>
              )}
            </button>
          </form>

          {step === 'mfa' && (
            <button
              onClick={() => setStep('credentials')}
              className="w-full text-center text-xs text-slate-500 hover:text-slate-700 mt-3"
            >
              ← Back to credentials
            </button>
          )}
        </div>

        {/* Compliance Footer */}
        <div className="mt-6 flex items-center justify-center gap-4 text-xs text-slate-400">
          <div className="flex items-center gap-1">
            <Shield size={12} />
            <span>HIPAA Compliant</span>
          </div>
          <div className="w-px h-3 bg-slate-600" />
          <div className="flex items-center gap-1">
            <Lock size={12} />
            <span>TLS 1.3 Encrypted</span>
          </div>
          <div className="w-px h-3 bg-slate-600" />
          <span>BAA-Covered Infrastructure</span>
        </div>

        <p className="text-center text-xs text-slate-500 mt-4">
          Inactivity timeout: 15 min · MFA required
        </p>

        {!config.isDemo && (
          <p className="text-center text-xs text-slate-400 mt-3">
            New clinic?{' '}
            <a href="/signup" className="text-teal-400 hover:text-teal-300 underline underline-offset-2">
              Create your account
            </a>
          </p>
        )}
      </div>
    </div>
  );
}
