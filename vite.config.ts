/// <reference types="vitest/config" />
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  // Warn build operators if VITE_AUTH_PROVIDER is not explicitly set in non-development builds.
  // In production, config.ts defaults to 'custom' (demo disabled), but explicit opt-in is safer.
  if (mode !== 'development' && !env.VITE_AUTH_PROVIDER) {
    console.warn(
      '\x1b[33m\n[DermMap] VITE_AUTH_PROVIDER is not set. ' +
      'Production build will default to "custom" auth (demo mode disabled). ' +
      'Set VITE_AUTH_PROVIDER=custom in your build environment to silence this warning.\n\x1b[0m'
    );
  }

  return {
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'masked-icon.svg'],
      manifest: {
        name: 'DermMap - Dermatology Lesion Mapping',
        short_name: 'DermMap',
        description: 'Professional dermatology lesion mapping and documentation platform',
        theme_color: '#14b8a6',
        background_color: '#ffffff',
        display: 'standalone',
        start_url: '/',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        // No runtimeCaching for /api/ routes — PHI must NOT be stored in SW caches
        // (HIPAA: caches survive logout on shared devices).
        // Static UI assets only.
        runtimeCaching: [],
      },
    }),
  ],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom'],
          'charts': ['recharts'],
          'pdf': ['jspdf', 'html2canvas'],
          'utils': ['date-fns', 'clsx'],
        },
      },
    },
    chunkSizeWarningLimit: 1000,
  },
  // @ts-expect-error -- vitest augments the UserConfig with 'test'
  test: {
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    globals: true,
    exclude: ['e2e/**', 'node_modules/**', 'dist/**', 'backend/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'src/main.tsx',
        'src/vite-env.d.ts',
        'src/registerSW.ts',
        'src/service-worker.ts',
        // Synthetic demo data is not production logic
        'src/data/syntheticData.ts',
        // Auth0 wrapper is a thin integration shim
        'src/components/auth/Auth0Wrapper.tsx',
        // Billing stub — not yet implemented
        'src/components/billing/**',
        // Generated type declarations
        'src/types/**',
      ],
      thresholds: {
        lines: 60,
        functions: 55,
        branches: 55,
        statements: 60,
      },
    },
  },
  };
})
