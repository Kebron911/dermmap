const env = import.meta.env;

export const config = {
  appName: env.VITE_APP_NAME || 'DermMap',
  appVersion: env.VITE_APP_VERSION || '0.1.0',
  apiBaseUrl: env.VITE_API_BASE_URL || 'http://localhost:3001/api',
  authProvider: (env.VITE_AUTH_PROVIDER || 'demo') as 'demo' | 'auth0' | 'custom',
  sentryDsn: env.VITE_SENTRY_DSN || '',
  s3UploadUrl: env.VITE_S3_UPLOAD_URL || '',
  sessionTimeoutMs: parseInt(env.VITE_SESSION_TIMEOUT_MS || '900000', 10),
  enableAuditLog: env.VITE_ENABLE_AUDIT_LOG !== 'false',
  enableOfflineMode: env.VITE_ENABLE_OFFLINE_MODE !== 'false',
  logLevel: (env.VITE_LOG_LEVEL || 'info') as 'debug' | 'info' | 'warn' | 'error',
  isDemo: (env.VITE_AUTH_PROVIDER || 'demo') === 'demo',
  isDev: import.meta.env.DEV,
  isProd: import.meta.env.PROD,
  
  // Auth0 configuration
  auth0: {
    domain: env.VITE_AUTH0_DOMAIN || '',
    clientId: env.VITE_AUTH0_CLIENT_ID || '',
    audience: env.VITE_AUTH0_AUDIENCE || '',
  },
  
  // Google Analytics
  analytics: {
    measurementId: env.VITE_GA_MEASUREMENT_ID || '',
  },
} as const;

