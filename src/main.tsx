import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { Auth0Wrapper } from './components/auth/Auth0Wrapper.tsx'
import { initSentry } from './services/sentry.ts'
import { initAnalytics } from './services/analytics.ts'
import { registerServiceWorker } from './registerSW.ts'

// Initialize error reporting
initSentry();

// Initialize analytics
initAnalytics();

// Register service worker for PWA
registerServiceWorker();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Auth0Wrapper>
      <App />
    </Auth0Wrapper>
  </StrictMode>,
)
