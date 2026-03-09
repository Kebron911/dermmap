import ReactGA from 'react-ga4';
import { config } from '../config';

// ---------------------------------------------------------------------------
// Analytics Service — Google Analytics 4 integration.
// ---------------------------------------------------------------------------

const GA_MEASUREMENT_ID = import.meta.env.VITE_GA_MEASUREMENT_ID || '';

export function initAnalytics() {
  if (!GA_MEASUREMENT_ID || config.isDemo) {
    console.info('Analytics disabled (demo mode or no tracking ID)');
    return;
  }

  ReactGA.initialize(GA_MEASUREMENT_ID, {
    gaOptions: {
      anonymizeIp: true, // HIPAA compliance
      cookieFlags: 'SameSite=None;Secure',
    },
  });

  console.info('Google Analytics initialized');
}

export const analytics = {
  pageView(path: string, title?: string) {
    if (!GA_MEASUREMENT_ID || config.isDemo) return;
    ReactGA.send({ hitType: 'pageview', page: path, title });
  },

  event(category: string, action: string, label?: string, value?: number) {
    if (!GA_MEASUREMENT_ID || config.isDemo) return;
    ReactGA.event({ category, action, label, value });
  },

  trackTiming(category: string, variable: string, value: number, label?: string) {
    if (!GA_MEASUREMENT_ID || config.isDemo) return;
    ReactGA.event({
      category,
      action: variable,
      label,
      value,
      nonInteraction: true,
    });
  },

  setUser(userId: string) {
    if (!GA_MEASUREMENT_ID || config.isDemo) return;
    ReactGA.set({ userId });
  },
};
