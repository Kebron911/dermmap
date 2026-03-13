import { useEffect } from 'react';
import { Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAppStore } from './store/appStore';
import { registerNavigate } from './store/appStore';
import { LoginScreen } from './components/auth/LoginScreen';
import { AppShell } from './components/layout/AppShell';
import { ErrorBoundary } from './components/ui/ErrorBoundary';
import { MobileViewToggle } from './components/ui/MobileViewToggle';
import { ConflictResolutionModal } from './components/sync/ConflictResolutionModal';
import { PWAInstallBanner } from './components/ui/PWAInstallBanner';
import { config } from './config';
import { SchedulePage } from './pages/SchedulePage';
import { PatientSearchPage } from './pages/PatientSearchPage';
import { BodyMapPage } from './pages/BodyMapPage';
import { VisitQueuePage } from './pages/VisitQueuePage';
import { AnalyticsDashboard } from './pages/AnalyticsDashboard';
import { AuditLogPage } from './pages/AuditLogPage';
import { UserManagementPage } from './pages/UserManagementPage';
import { EHRIntegrationPage } from './pages/EHRIntegrationPage';
import { SettingsPage } from './pages/SettingsPage';
import { ProviderDashboardPage } from './pages/ProviderDashboardPage';
import { QualityMetricsPage } from './pages/QualityMetricsPage';
import { ReportBuilderPage } from './pages/ReportBuilderPage';
import { OnboardingPage } from './pages/OnboardingPage';
import syncService, { registerConflictHandler } from './services/syncService';
import { useSessionTimeout } from './hooks/useSessionTimeout';
import { auditLogger } from './services/auditLogger';
import { analytics } from './services/analytics';
import { setUser as setSentryUser } from './services/sentry';
import { apiClient } from './services/apiClient';

// Sync URL path → store's currentPage so legacy components reading currentPage stay correct
function NavigationSyncer() {
  const location = useLocation();
  const navigate = useNavigate();
  const setCurrentPage = useAppStore((s) => s.setCurrentPage);

  // Register the navigate function so store actions can drive URL changes
  useEffect(() => {
    registerNavigate(navigate);
  }, [navigate]);

  // Keep store in sync when the URL changes (back/forward, direct link)
  useEffect(() => {
    const page = location.pathname.replace(/^\//, '') || 'schedule';
    setCurrentPage(page, /* fromUrl */ true);
    analytics.pageView(location.pathname, page);
  }, [location.pathname, setCurrentPage]);

  return null;
}

function AuthenticatedApp() {
  const { showWarning, secondsLeft, extendSession } = useSessionTimeout();
  return (
    <>
      {showWarning && (
        <div
          role="alert"
          className="fixed top-0 inset-x-0 z-50 bg-amber-400 text-stone-900 text-sm font-semibold text-center px-4 py-2"
        >
          Your session will expire in {secondsLeft}s due to inactivity.{' '}
          <button
            onClick={extendSession}
            className="ml-2 underline font-bold cursor-pointer bg-transparent border-0 p-0"
          >
            Stay signed in
          </button>
        </div>
      )}
      <AppShell>
      <ErrorBoundary fallbackMessage="This page encountered an error. Try navigating to a different section.">
        <Routes>
          <Route path="/schedule" element={<SchedulePage />} />
          <Route path="/search" element={<PatientSearchPage />} />
          <Route path="/bodymap" element={<BodyMapPage />} />
          <Route path="/queue" element={<VisitQueuePage />} />
          <Route path="/analytics" element={<AnalyticsDashboard />} />
          <Route path="/providers" element={<ProviderDashboardPage />} />
          <Route path="/quality" element={<QualityMetricsPage />} />
          <Route path="/reports" element={<ReportBuilderPage />} />
          <Route path="/audit" element={<AuditLogPage />} />
          <Route path="/users" element={<UserManagementPage />} />
          <Route path="/ehr" element={<EHRIntegrationPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="*" element={<Navigate to="/schedule" replace />} />
        </Routes>
      </ErrorBoundary>
      </AppShell>
    </>
}

export default function App() {
  const { currentUser, syncConflicts, setSyncConflicts, clearSyncConflicts } = useAppStore();

  // Start offline sync service and register conflict handler
  useEffect(() => {
    syncService.init();
    registerConflictHandler((conflicts) => {
      setSyncConflicts(conflicts);
    });
  }, [setSyncConflicts]);

  // Keep audit logger and error reporting in sync with current user
  useEffect(() => {
    auditLogger.setUser(currentUser);
    setSentryUser(currentUser ? {
      id: currentUser.id,
      email: currentUser.email,
      role: currentUser.role,
    } : null);
    if (currentUser) {
      analytics.setUser(currentUser.id);
    }
  }, [currentUser]);

  return (
    <ErrorBoundary>
      {/* Always mounted so _navigate is registered before any setCurrentPage call */}
      <NavigationSyncer />
      {/* Public signup route — accessible before authentication */}
      <Routes>
        <Route path="/signup" element={<OnboardingPage />} />
        <Route path="*" element={
          !currentUser ? (
            <ErrorBoundary fallbackMessage="Login failed. Please refresh the page.">
              <LoginScreen />
            </ErrorBoundary>
          ) : (
            <>
              <AuthenticatedApp />
              {config.isDemo && <MobileViewToggle />}
              <PWAInstallBanner />
              {syncConflicts.length > 0 && (
                <ConflictResolutionModal
                  conflicts={syncConflicts}
                  onResolve={(resolutions) => {
                    // Push 'local' resolutions back to the sync queue so the local value wins on next sync.
                    // 'server' resolutions require no action — the server value is already persisted.
                    const localWins = syncConflicts.filter(
                      (c) => resolutions[c.id] === 'local'
                    );
                    if (localWins.length > 0) {
                      localWins.forEach((c) => {
                        apiClient.pushChanges([{
                          entity_type: c.entityType,
                          entity_id: c.entityId,
                          operation: 'update',
                          data: { [c.field]: c.localValue },
                          client_timestamp: c.localTimestamp,
                        }]).catch(() => {/* offline — will retry on next sync cycle */});
                      });
                    }
                    clearSyncConflicts();
                  }}
                  onDismiss={clearSyncConflicts}
                />
              )}
            </>
          )}
        />
      </Routes>
    </ErrorBoundary>
  );
}
