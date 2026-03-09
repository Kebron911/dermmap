import { useEffect } from 'react';
import { useAppStore } from './store/appStore';
import { LoginScreen } from './components/auth/LoginScreen';
import { AppShell } from './components/layout/AppShell';
import { ErrorBoundary } from './components/ui/ErrorBoundary';
import { SchedulePage } from './pages/SchedulePage';
import { PatientSearchPage } from './pages/PatientSearchPage';
import { BodyMapPage } from './pages/BodyMapPage';
import { VisitQueuePage } from './pages/VisitQueuePage';
import { AnalyticsDashboard } from './pages/AnalyticsDashboard';
import { AuditLogPage } from './pages/AuditLogPage';
import { UserManagementPage } from './pages/UserManagementPage';
import { EHRIntegrationPage } from './pages/EHRIntegrationPage';
import { SettingsPage } from './pages/SettingsPage';
import { syncQueue } from './services/syncQueue';
import { auditLogger } from './services/auditLogger';
import { analytics } from './services/analytics';
import { setUser as setSentryUser } from './services/sentry';

function PageContent() {
  const { currentPage } = useAppStore();

  // Track page views
  useEffect(() => {
    analytics.pageView(`/${currentPage}`, currentPage);
  }, [currentPage]);

  switch (currentPage) {
    case 'schedule': return <SchedulePage />;
    case 'search': return <PatientSearchPage />;
    case 'bodymap': return <BodyMapPage />;
    case 'queue': return <VisitQueuePage />;
    case 'analytics': return <AnalyticsDashboard />;
    case 'audit': return <AuditLogPage />;
    case 'users': return <UserManagementPage />;
    case 'ehr': return <EHRIntegrationPage />;
    case 'settings': return <SettingsPage />;
    default: return <SchedulePage />;
  }
}

export default function App() {
  const { currentUser } = useAppStore();

  // Start offline sync queue listener
  useEffect(() => {
    const cleanup = syncQueue.startAutoSync();
    return cleanup;
  }, []);

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

  if (!currentUser) {
    return (
      <ErrorBoundary fallbackMessage="Login failed. Please refresh the page.">
        <LoginScreen />
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary>
      <AppShell>
        <ErrorBoundary fallbackMessage="This page encountered an error. Try navigating to a different section.">
          <PageContent />
        </ErrorBoundary>
      </AppShell>
    </ErrorBoundary>
  );
}
