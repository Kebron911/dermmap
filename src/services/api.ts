import { config } from '../config';
import { logger } from './logger';

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: string,
    public details?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

interface RequestOptions extends Omit<RequestInit, 'body'> {
  body?: unknown;
  timeout?: number;
}

function getAuthToken(): string | null {
  return sessionStorage.getItem('auth_token');
}

async function request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const { body, timeout = 15000, ...init } = options;
  const url = `${config.apiBaseUrl}${endpoint}`;
  const token = getAuthToken();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(init.headers as Record<string, string> || {}),
  };

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    logger.debug('API request', { method: init.method || 'GET', url });

    const response = await fetch(url, {
      ...init,
      headers,
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });

    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({}));
      throw new ApiError(
        errorBody.message || `HTTP ${response.status}`,
        response.status,
        errorBody.code,
        errorBody.details,
      );
    }

    if (response.status === 204) return undefined as T;
    return response.json();
  } catch (err) {
    if (err instanceof ApiError) throw err;
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw new ApiError('Request timed out', 408, 'TIMEOUT');
    }
    logger.error('API request failed', err, { url });
    throw new ApiError('Network error', 0, 'NETWORK_ERROR', err);
  } finally {
    clearTimeout(timeoutId);
  }
}

export const api = {
  get: <T>(endpoint: string, opts?: RequestOptions) =>
    request<T>(endpoint, { ...opts, method: 'GET' }),

  post: <T>(endpoint: string, body?: unknown, opts?: RequestOptions) =>
    request<T>(endpoint, { ...opts, method: 'POST', body }),

  put: <T>(endpoint: string, body?: unknown, opts?: RequestOptions) =>
    request<T>(endpoint, { ...opts, method: 'PUT', body }),

  patch: <T>(endpoint: string, body?: unknown, opts?: RequestOptions) =>
    request<T>(endpoint, { ...opts, method: 'PATCH', body }),

  delete: <T>(endpoint: string, opts?: RequestOptions) =>
    request<T>(endpoint, { ...opts, method: 'DELETE' }),
};
