import { config } from '../config';
import { logger } from './logger';
import type { User } from '../types';
import { DEMO_USERS } from '../data/syntheticData';
import { api } from './api';

// ---------------------------------------------------------------------------
// Auth Service — demo mode fakes JWT; production mode calls real backend.
// ---------------------------------------------------------------------------

const TOKEN_KEY = 'auth_token';
const USER_KEY = 'auth_user';

export interface AuthResult {
  user: User;
  token: string;
  expiresAt: number;
}

function generateDemoToken(user: User): string {
  // Simulated JWT — base64 header.payload.signature
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payload = btoa(
    JSON.stringify({
      sub: user.id,
      name: user.name,
      role: user.role,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + config.sessionTimeoutMs / 1000,
    }),
  );
  const sig = btoa('demo-signature');
  return `${header}.${payload}.${sig}`;
}

export const authService = {
  async login(email: string, _password: string): Promise<AuthResult> {
    if (config.isDemo) {
      // Find matching demo user by email
      const user = DEMO_USERS.find(u => u.email === email);
      if (!user) throw new Error('Invalid credentials');
      const token = generateDemoToken(user);
      const expiresAt = Date.now() + config.sessionTimeoutMs;
      sessionStorage.setItem(TOKEN_KEY, token);
      sessionStorage.setItem(USER_KEY, JSON.stringify(user));
      logger.info('Demo login', { userId: user.id, role: user.role });
      return { user, token, expiresAt };
    }
    const result = await api.post<AuthResult>('/auth/login', { email, password: _password });
    sessionStorage.setItem(TOKEN_KEY, result.token);
    sessionStorage.setItem(USER_KEY, JSON.stringify(result.user));
    return result;
  },

  async logout(): Promise<void> {
    logger.info('User logged out');
    sessionStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(USER_KEY);
    if (!config.isDemo) {
      try { await api.post('/auth/logout'); } catch { /* best-effort */ }
    }
  },

  getStoredUser(): User | null {
    try {
      const raw = sessionStorage.getItem(USER_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  },

  getToken(): string | null {
    return sessionStorage.getItem(TOKEN_KEY);
  },

  isAuthenticated(): boolean {
    return !!sessionStorage.getItem(TOKEN_KEY);
  },
};
