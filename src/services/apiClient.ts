import { Patient, Visit, Lesion, User } from '../types';
import { config } from '../config';
import { DEMO_USERS, SYNTHETIC_PATIENTS } from '../data/syntheticData';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

class APIClient {
  private token: string | null = null;

  constructor() {
    // Load token from sessionStorage (not localStorage — must not persist after tab close on shared terminals)
    this.token = sessionStorage.getItem('auth_token');
  }

  setToken(token: string | null) {
    this.token = token;
    if (token) {
      sessionStorage.setItem('auth_token', token);
    } else {
      sessionStorage.removeItem('auth_token');
    }
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Request failed' }));
      throw new Error(error.error || `HTTP ${response.status}`);
    }

    return response.json();
  }

  // ---------- Authentication ----------
  async login(email: string, password: string): Promise<{ user: User; token: string }> {
    if (config.isDemo) {
      const demoUser = DEMO_USERS.find(u => u.email === email);
    if (config.isDemo && config.isDev && demoUser && password === 'demo123') {
        const token = `demo-${demoUser.id}`;
        this.setToken(token);
        return { user: { id: demoUser.id, name: demoUser.name, role: demoUser.role, email: demoUser.email }, token };
      }
      throw new Error('Invalid demo credentials');
    }
    const response = await this.request<{ user: User; token: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    this.setToken(response.token);
    return response;
  }

  async register(name: string, email: string, password: string, role: 'ma' | 'provider' | 'manager'): Promise<{ user: User; token: string }> {
    const response = await this.request<{ user: User; token: string }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, email, password, role }),
    });
    this.setToken(response.token);
    return response;
  }

  async verifyToken(): Promise<{ user: User; valid: boolean }> {
    return this.request('/auth/verify');
  }

  logout() {
    this.setToken(null);
  }

  // ---------- Patients ----------
  async getPatients(search?: string, limit = 50, offset = 0): Promise<Patient[]> {
    if (config.isDemo) {
      const lower = search?.toLowerCase() ?? '';
      const filtered = lower
        ? SYNTHETIC_PATIENTS.filter(p =>
            p.first_name.toLowerCase().includes(lower) ||
            p.last_name.toLowerCase().includes(lower) ||
            p.mrn.toLowerCase().includes(lower)
          )
        : SYNTHETIC_PATIENTS;
      return filtered.slice(Number(offset), Number(offset) + Number(limit));
    }
    const params = new URLSearchParams();
    if (search) params.append('search', search);
    params.append('limit', limit.toString());
    params.append('offset', offset.toString());
    return this.request(`/patients?${params}`);
  }

  async getPatient(patientId: string): Promise<Patient> {
    return this.request(`/patients/${patientId}`);
  }

  async createPatient(patient: Partial<Patient>): Promise<Patient> {
    return this.request('/patients', {
      method: 'POST',
      body: JSON.stringify(patient),
    });
  }

  async updatePatient(patientId: string, updates: Partial<Patient>): Promise<Patient> {
    return this.request(`/patients/${patientId}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  }

  async deletePatient(patientId: string): Promise<{ message: string }> {
    return this.request(`/patients/${patientId}`, {
      method: 'DELETE',
    });
  }

  // ---------- Visits ----------
  async getVisit(visitId: string): Promise<Visit> {
    return this.request(`/visits/${visitId}`);
  }

  async createVisit(visit: Partial<Visit>): Promise<Visit> {
    return this.request('/visits', {
      method: 'POST',
      body: JSON.stringify(visit),
    });
  }

  async updateVisit(visitId: string, updates: Partial<Visit>): Promise<Visit> {
    return this.request(`/visits/${visitId}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  }

  async deleteVisit(visitId: string): Promise<{ message: string }> {
    return this.request(`/visits/${visitId}`, {
      method: 'DELETE',
    });
  }

  // ---------- Lesions ----------
  async createLesion(lesion: Partial<Lesion>): Promise<Lesion> {
    return this.request('/lesions', {
      method: 'POST',
      body: JSON.stringify(lesion),
    });
  }

  async updateLesion(lesionId: string, updates: Partial<Lesion>): Promise<Lesion> {
    return this.request(`/lesions/${lesionId}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  }

  async deleteLesion(lesionId: string): Promise<{ message: string }> {
    return this.request(`/lesions/${lesionId}`, {
      method: 'DELETE',
    });
  }

  // ---------- Photos ----------
  getPhotoUrl(photoId: string): string {
    return `${API_BASE_URL}/photos/${photoId}`;
  }

  async uploadPhoto(photo: {
    photo_id: string;
    lesion_id: string;
    visit_id: string;
    photo_data: string;
    photo_type?: string;
    mime_type?: string;
  }): Promise<{ photo_id: string; url: string }> {
    return this.request('/photos', {
      method: 'POST',
      body: JSON.stringify(photo),
    });
  }

  async deletePhoto(photoId: string): Promise<{ message: string }> {
    return this.request(`/photos/${photoId}`, {
      method: 'DELETE',
    });
  }

  // ---------- Sync (Offline Support) ----------
  async getChanges(since: string, entityType?: string): Promise<{
    changes: Array<{ entity_type: string; entity_id: string; operation: string; synced_at: string }>;
    timestamp: string;
  }> {
    const params = new URLSearchParams({ since });
    if (entityType) params.append('entity_type', entityType);
    
    return this.request(`/sync/changes?${params}`);
  }

  async pushChanges(changes: Array<{
    entity_type: string;
    entity_id: string;
    operation: 'create' | 'update' | 'delete';
    data?: any;
    client_timestamp: string;
  }>): Promise<{
    results: Array<{ entity_id: string; status: string }>;
    conflicts: Array<{ entity_id: string; status: string; error: string }>;
    timestamp: string;
  }> {
    return this.request('/sync/push', {
      method: 'POST',
      body: JSON.stringify({ changes }),
    });
  }
}

// Singleton instance
export const apiClient = new APIClient();

export default apiClient;
