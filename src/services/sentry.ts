import * as Sentry from '@sentry/react';
import { config } from '../config';

// ---------------------------------------------------------------------------
// Sentry Error Reporting — initializes Sentry for production error tracking.
// ---------------------------------------------------------------------------

export function initSentry() {
  if (!config.sentryDsn || config.isDemo) {
    console.info('Sentry disabled (demo mode or no DSN)');
    return;
  }

  Sentry.init({
    dsn: config.sentryDsn,
    environment: config.isProd ? 'production' : 'development',
    release: `dermmap@${config.appVersion}`,
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration({
        maskAllText: true, // HIPAA compliance: mask PII
        blockAllMedia: true,
      }),
    ],
    tracesSampleRate: config.isProd ? 0.1 : 1.0,
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,
    beforeSend(event, hint) {
      // Filter sensitive data before sending to Sentry
      if (event.request) {
        delete event.request.cookies;
        delete event.request.headers;
      }
      return event;
    },
  });

  console.info('Sentry initialized');
}

export function captureException(error: Error, context?: Record<string, unknown>) {
  if (config.isDemo) {
    if (import.meta.env.DEV) console.error('Demo error (not sent to Sentry):', error, context);
    return;
  }
  Sentry.captureException(error, { extra: context });
}

export function captureMessage(message: string, level: 'info' | 'warning' | 'error' = 'info') {
  if (config.isDemo) return;
  Sentry.captureMessage(message, level);
}

export function setUser(user: { id: string; email?: string; role?: string } | null) {
  if (config.isDemo) return;
  if (user) {
    Sentry.setUser({ id: user.id, email: user.email });
    Sentry.setTag('role', user.role);
  } else {
    Sentry.setUser(null);
  }
}
