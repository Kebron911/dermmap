const env = import.meta.env;

// In production builds, demo mode must be EXPLICITLY opted in via VITE_AUTH_PROVIDER=demo.
// Without the env var set, production defaults to 'custom' (real backend auth).
// In development, the fallback remains 'demo' for convenience.
const resolvedAuthProvider = (env.VITE_AUTH_PROVIDER ||
  (import.meta.env.PROD ? 'custom' : 'demo')) as 'demo' | 'custom';

export const config = {
  appName: env.VITE_APP_NAME || 'DermMap',
  appVersion: env.VITE_APP_VERSION || '0.1.0',
  apiBaseUrl: env.VITE_API_BASE_URL || 'http://localhost:3001/api',
  authProvider: resolvedAuthProvider,
  sentryDsn: env.VITE_SENTRY_DSN || '',
  s3UploadUrl: env.VITE_S3_UPLOAD_URL || '',
  sessionTimeoutMs: parseInt(env.VITE_SESSION_TIMEOUT_MS || '900000', 10),
  enableAuditLog: env.VITE_ENABLE_AUDIT_LOG !== 'false',
  enableOfflineMode: env.VITE_ENABLE_OFFLINE_MODE !== 'false',
  logLevel: (env.VITE_LOG_LEVEL || 'info') as 'debug' | 'info' | 'warn' | 'error',
  isDemo: resolvedAuthProvider === 'demo',
  isDev: import.meta.env.DEV,
  isProd: import.meta.env.PROD,
  
  // Google Analytics
  analytics: {
    measurementId: env.VITE_GA_MEASUREMENT_ID || '',
  },
} as const;

