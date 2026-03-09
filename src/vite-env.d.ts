/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_APP_NAME: string;
  readonly VITE_APP_VERSION: string;
  readonly VITE_API_BASE_URL: string;
  readonly VITE_AUTH_PROVIDER: 'demo' | 'auth0' | 'custom';
  readonly VITE_SENTRY_DSN: string;
  readonly VITE_S3_UPLOAD_URL: string;
  readonly VITE_SESSION_TIMEOUT_MS: string;
  readonly VITE_ENABLE_AUDIT_LOG: string;
  readonly VITE_ENABLE_OFFLINE_MODE: string;
  readonly VITE_LOG_LEVEL: 'debug' | 'info' | 'warn' | 'error';
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
