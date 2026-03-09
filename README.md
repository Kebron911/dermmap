# DermMap

Full‐body dermatology lesion mapping and documentation platform with enterprise features.

## Quick Start

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Run unit tests with coverage
npm test

# Run E2E tests
npm run test:e2e

# Production build
npm run build
```

## Features

### Core Functionality
- ✅ Full-body SVG body map with lesion placement
- ✅ Clinical photo capture and comparison
- ✅ PDF report generation
- ✅ Role-based access (MA, Provider, Admin)
- ✅ Multi-visit tracking and history

### Enterprise Features
- ✅ **Offline Mode** — Full offline support with automatic sync
- ✅ **Session Management** — 15-minute timeout with warning
- ✅ **Audit Logging** — HIPAA-compliant activity tracking
- ✅ **Error Reporting** — Sentry integration for production
- ✅ **Analytics** — Google Analytics 4 with PII anonymization
- ✅ **PWA Support** — Service worker for app-like experience
- ✅ **Form Validation** — Zod schemas with real-time feedback
- ✅ **Cloud Storage** — S3/Azure abstraction layer
- ✅ **Auth0 Ready** — SSO integration configuration

### Security & Compliance
- ✅ JWT authentication with token refresh
- ✅ HIPAA-compliant data handling
- ✅ Encrypted session storage
- ✅ CSP headers configured
- ✅ Input sanitization
- ✅ Audit trail for all actions

### Developer Experience
- ✅ TypeScript strict mode
- ✅ 98% test coverage (unit tests)
- ✅ E2E tests with Playwright
- ✅ Hot module replacement
- ✅ Code splitting & lazy loading
- ✅ Automated CI/CD pipeline

## Architecture

| Layer | Tech |
|-------|------|
| UI | React 18 + TypeScript + Tailwind CSS |
| State | Zustand (in‐memory + IndexedDB persistence) |
| Validation | Zod schemas |
| API Client | Typed fetch wrapper with retry & timeout |
| Storage | IndexedDB (demo) / REST API (production) |
| PDF Export | jsPDF + html2canvas |
| Charts | Recharts |
| Auth | Auth0 / Demo mode |
| Error Tracking | Sentry |
| Analytics | Google Analytics 4 |
| PWA | Vite Plugin PWA + Workbox |
| Build | Vite 6 |
| Tests | Vitest + Testing Library + Playwright |

## Project Structure

```
src/
├── components/
│   ├── auth/          # Login, Auth0 wrapper
│   ├── bodymap/       # SVG body map & lesion markers
│   ├── layout/        # AppShell, Sidebar, PageWrapper
│   ├── lesion/        # Lesion form, photo comparison
│   └── ui/            # ErrorBoundary, Spinner, Skeleton, SessionTimeout, FormComponents
├── data/              # Synthetic demo data
├── hooks/             # useNetworkStatus, useKeyboardShortcuts, useFormValidation
├── pages/             # Route‐level page components
├── schemas/           # Zod validation schemas
├── services/          
│   ├── api.ts         # HTTP client
│   ├── authService.ts # JWT & Auth0
│   ├── patientService.ts # Data access layer
│   ├── db.ts          # IndexedDB wrapper
│   ├── cloudStorage.ts # S3/Azure abstraction
│   ├── auditLogger.ts # Compliance logging
│   ├── sentry.ts      # Error reporting
│   ├── analytics.ts   # Google Analytics
│   ├── syncQueue.ts   # Offline sync
│   └── logger.ts      # Structured logging
├── store/             # Zustand store
├── types/             # TypeScript interfaces
├── utils/             # PDF export
├── config.ts          # Environment configuration
└── main.tsx           # App entry point

e2e/                   # Playwright E2E tests
```

## Key Services

### API Layer
- **`services/api.ts`** — Typed fetch wrapper with auth headers, timeout handling, and error classes
- **`services/patientService.ts`** — Domain service layer (IndexedDB in demo, REST in production)
- **`services/authService.ts`** — JWT session management with Auth0 integration
- **`services/cloudStorage.ts`** — Image upload abstraction (S3/Azure/local)

### Persistence & Offline
- **`services/db.ts`** — IndexedDB for patients, audit log, images, sync queue
- **`services/syncQueue.ts`** — Offline mutation queue with auto-replay on reconnect
- **Service Worker** — Caches assets and API responses for offline use

### Observability
- **`services/logger.ts`** — Structured logging with configurable levels
- **`services/auditLogger.ts`** — HIPAA-compliant audit trail
- **`services/sentry.ts`** — Production error tracking with PII masking
- **`services/analytics.ts`** — User behavior analytics with anonymization

## Environment Variables

Create `.env.local` for local development:

```env
# Core
VITE_APP_NAME=DermMap
VITE_APP_VERSION=0.1.0
VITE_API_BASE_URL=http://localhost:3001/api
VITE_AUTH_PROVIDER=demo  # demo | auth0 | custom

# Auth0 (production)
VITE_AUTH0_DOMAIN=your-tenant.us.auth0.com
VITE_AUTH0_CLIENT_ID=your_client_id
VITE_AUTH0_AUDIENCE=https://api.dermmap.io

# Observability
VITE_SENTRY_DSN=https://xxx@sentry.io/yyy
VITE_GA_MEASUREMENT_ID=G-XXXXXXXXXX

# Cloud Storage
VITE_S3_UPLOAD_URL=https://uploads.dermmap.io

# Features
VITE_SESSION_TIMEOUT_MS=900000
VITE_ENABLE_AUDIT_LOG=true
VITE_ENABLE_OFFLINE_MODE=true
VITE_LOG_LEVEL=debug  # debug | info | warn | error
```

## Docker

```bash
# Build
docker build -t dermmap .

# Run
docker run -p 8080:80 dermmap

# With environment variables
docker run -p 8080:80 --env-file .env.production dermmap
```

## CI/CD

GitHub Actions workflow (`.github/workflows/ci.yml`) runs on every push/PR:
1. TypeScript type-check
2. Unit tests with coverage
3. E2E tests (optional, can be enabled)
4. Production build
5. Deploy (configure with your cloud provider)

## Testing

### Unit Tests
```bash
npm test              # Run with coverage
npm run test:watch    # Watch mode
```

- **Coverage**: 98% statements, 89% branches, 81% functions
- **Framework**: Vitest + Testing Library
- **Files**: 8 test files, 25 tests

### E2E Tests
```bash
npm run test:e2e          # Headless
npm run test:e2e:ui       # Interactive UI
npm run test:e2e:headed   # Watch in browser
```

- **Framework**: Playwright
- **Browsers**: Chromium, Firefox, WebKit, Mobile Chrome
- **Coverage**: Login, body map workflow, offline mode, accessibility

## Deployment

See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed production deployment guide.

### Quick Deploy Options

**Vercel/Netlify (Recommended)**
```bash
npm run build
# Deploy dist/ folder
```

**AWS S3 + CloudFront**
```bash
npm run build
aws s3 sync dist/ s3://your-bucket --delete
aws cloudfront create-invalidation --distribution-id XXX --paths "/*"
```

**Docker + Kubernetes**
```bash
docker build -t dermmap:latest .
kubectl apply -f k8s/deployment.yaml
```

## Security

See [SECURITY.md](./SECURITY.md) for security implementation details.

**Key Security Features:**
- HTTPS-only in production
- CSP headers configured
- JWT authentication
- Session timeout
- CSRF protection
- Input sanitization
- Audit logging
- PII masking in error reports

## Accessibility

See [ACCESSIBILITY.md](./ACCESSIBILITY.md) for WCAG 2.1 AA compliance details.

**Accessibility Features:**
- ARIA labels and roles
- Keyboard navigation (Ctrl+Shift+S/P/B/Q shortcuts)
- Screen reader support
- WCAG AA contrast ratios
- Focus management
- Semantic HTML

## Performance

**Build Output:**
- React vendor chunk: ~160KB gzipped
- Charts chunk: ~50KB gzipped
- PDF chunk: ~50KB gzipped
- Main bundle: ~332KB gzipped
- First Contentful Paint: <2s
- Time to Interactive: <3s

**Optimizations:**
- Code splitting by route
- Lazy loading for charts and PDF
- Image optimization
- Service worker caching
- CDN-ready assets

## Browser Support

- Chrome/Edge: Last 2 versions
- Firefox: Last 2 versions
- Safari: Last 2 versions
- Mobile: iOS Safari 14+, Chrome Android 90+

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

**Development Guidelines:**
- Write tests for new features
- Follow TypeScript strict mode
- Use semantic commit messages
- Update documentation
- Ensure CI passes

## License

Proprietary — all rights reserved.

## Support

- **Documentation**: See `docs/` folder
- **Issues**: GitHub Issues
- **Email**: support@dermmap.io
