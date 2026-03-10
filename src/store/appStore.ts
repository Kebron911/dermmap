import { create } from 'zustand';
import { User, Patient, Visit, Lesion, BodyView, VisitStatus } from '../types';
import { apiClient } from '../services/apiClient';
import indexedDB from '../services/indexedDB';
import syncService from '../services/syncService';

interface AppState {
  // Auth
  currentUser: User | null;
  token: string | null;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;

  // Patients
  patients: Patient[];
  loadPatients: () => Promise<void>;
  selectedPatient: Patient | null;
  setSelectedPatient: (patient: Patient | null) => void;

  // Current Visit
  currentVisit: Visit | null;
  setCurrentVisit: (visit: Visit | null) => void;
  startNewVisit: (patient: Patient) => Promise<Visit>;

  // Body Map
  bodyView: BodyView;
  setBodyView: (view: BodyView) => void;
  placingLesion: boolean;
  setPlacingLesion: (placing: boolean) => void;

  // Lesion Documentation
  selectedLesion: Lesion | null;
  setSelectedLesion: (lesion: Lesion | null) => void;
  pendingLesion: { x: number; y: number } | null;
  setPendingLesion: (coords: { x: number; y: number } | null) => void;
  addLesionToVisit: (visitId: string, lesion: Lesion) => Promise<void>;
  updateLesion: (visitId: string, lesion: Lesion) => Promise<void>;
  deleteLesion: (visitId: string, lesionId: string) => Promise<void>;

  // Sync status
  ehrSynced: boolean;

  // Visit Management
  completeVisit: (visitId: string, status: VisitStatus, providerAttestation?: string) => Promise<void>;
  deleteVisit: (visitId: string) => Promise<void>;

  // Navigation
  currentPage: string;
  setCurrentPage: (page: string) => void;

  // Demo timer
  docStartTime: number | null;
  startDocTimer: () => void;
  getDocTime: () => number;
}

export const useAppStore = create<AppState>((set, get) => ({
  currentUser: null,
  token: null,
  
  login: async (email: string, password: string) => {
    try {
      const response = await apiClient.login(email, password);
      set({ 
        currentUser: response.user,
        token: response.token,
      });
      
      // Load initial data after login
      await get().loadPatients();
      
      return true;
    } catch (error) {
      console.error('Login failed:', error);
      return false;
    }
  },
  
  logout: () => {
    apiClient.logout();
    set({
      currentUser: null,
      token: null,
      patients: [],
      selectedPatient: null,
      currentVisit: null,
      selectedLesion: null,
      pendingLesion: null,
      currentPage: 'login',
    });
  },

  patients: [],
  
  ehrSynced: false,

  loadPatients: async () => {
    try {
      const patients = await apiClient.getPatients();
      set({ patients, ehrSynced: true });
      
      // Cache in IndexedDB for offline access
      await indexedDB.savePatients(patients);
    } catch (error) {
      console.error('Failed to load patients:', error);
      // Try to load from cache if API fails
      const cachedPatients = await indexedDB.getPatients();
      if (cachedPatients.length > 0) {
        set({ patients: cachedPatients });
      }
    }
  },
  
  selectedPatient: null,
  setSelectedPatient: (patient) => set({ selectedPatient: patient }),

  currentVisit: null,
  setCurrentVisit: (visit) => set({ currentVisit: visit }),
  
  startNewVisit: async (patient) => {
    const user = get().currentUser!;
    const isProvider = user.role === 'provider';
    try {
      const visitData = {
        patient_id: patient.patient_id,
        provider_id: isProvider ? user.id : '',
        provider_name: isProvider ? user.name : '',
        ma_id: isProvider ? '' : user.id,
        ma_name: isProvider ? '' : user.name,
      };
      
      const newVisit = await apiClient.createVisit(visitData);
      
      // Update local state
      set((state) => ({
        patients: state.patients.map((p) =>
          p.patient_id === patient.patient_id
            ? { ...p, visits: [...p.visits, newVisit] }
            : p
        ),
        currentVisit: newVisit,
        selectedPatient: {
          ...patient,
          visits: [...patient.visits, newVisit],
        },
      }));
      
      // Cache in IndexedDB
      await indexedDB.saveVisits([newVisit]);
      
      return newVisit;
    } catch (error) {
      console.error('Failed to create visit:', error);
      
      // Fallback: create locally and queue for sync
      const newVisit: Visit = {
        visit_id: `v-offline-${Date.now()}`,
        visit_date: new Date().toISOString().split('T')[0],
        provider_id: isProvider ? user.id : '',
        provider_name: isProvider ? user.name : '',
        ma_id: isProvider ? '' : user.id,
        ma_name: isProvider ? '' : user.name,
        status: 'in_progress',
        created_at: new Date().toISOString(),
        lesions: [],
      };
      
      set((state) => ({
        patients: state.patients.map((p) =>
          p.patient_id === patient.patient_id
            ? { ...p, visits: [...p.visits, newVisit] }
            : p
        ),
        currentVisit: newVisit,
        selectedPatient: {
          ...patient,
          visits: [...patient.visits, newVisit],
        },
      }));
      
      // Queue for sync when back online
      await syncService.queueChange('visits', newVisit.visit_id, 'create', newVisit);
      await indexedDB.saveVisits([newVisit]);
      
      return newVisit;
    }
  },

  bodyView: 'anterior',
  setBodyView: (view) => set({ bodyView: view }),
  placingLesion: false,
  setPlacingLesion: (placing) => set({ placingLesion: placing }),

  selectedLesion: null,
  setSelectedLesion: (lesion) => set({ selectedLesion: lesion }),
  pendingLesion: null,
  setPendingLesion: (coords) => set({ pendingLesion: coords }),

  addLesionToVisit: async (visitId, lesion) => {
    try {
      const createdLesion = await apiClient.createLesion({ ...lesion, visit_id: visitId } as any);
      
      set((state) => {
        const updatedPatients = state.patients.map((p) => ({
          ...p,
          visits: p.visits.map((v) =>
            v.visit_id === visitId
              ? { ...v, lesions: [...v.lesions, createdLesion] }
              : v
          ),
        }));
        const updatedPatient = state.selectedPatient
          ? {
              ...state.selectedPatient,
              visits: state.selectedPatient.visits.map((v) =>
                v.visit_id === visitId
                  ? { ...v, lesions: [...v.lesions, createdLesion] }
                  : v
              ),
            }
          : state.selectedPatient;
        const updatedVisit = state.currentVisit?.visit_id === visitId
          ? { ...state.currentVisit, lesions: [...state.currentVisit.lesions, createdLesion] }
          : state.currentVisit;
        return {
          patients: updatedPatients,
          selectedPatient: updatedPatient,
          currentVisit: updatedVisit,
        };
      });
      
      await indexedDB.saveLesions([createdLesion]);
    } catch (error) {
      console.error('Failed to add lesion:', error);
      
      // Fallback: add locally and queue for sync
      set((state) => {
        const updatedPatients = state.patients.map((p) => ({
          ...p,
          visits: p.visits.map((v) =>
            v.visit_id === visitId
              ? { ...v, lesions: [...v.lesions, lesion] }
              : v
          ),
        }));
        const updatedPatient = state.selectedPatient
          ? {
              ...state.selectedPatient,
              visits: state.selectedPatient.visits.map((v) =>
                v.visit_id === visitId
                  ? { ...v, lesions: [...v.lesions, lesion] }
                  : v
              ),
            }
          : state.selectedPatient;
        const updatedVisit = state.currentVisit?.visit_id === visitId
          ? { ...state.currentVisit, lesions: [...state.currentVisit.lesions, lesion] }
          : state.currentVisit;
        return {
          patients: updatedPatients,
          selectedPatient: updatedPatient,
          currentVisit: updatedVisit,
        };
      });
      
      await syncService.queueChange('lesions', lesion.lesion_id, 'create', lesion);
      await indexedDB.saveLesions([lesion]);
    }
  },

  updateLesion: async (visitId, lesion) => {
    try {
      await apiClient.updateLesion(lesion.lesion_id, lesion);
      
      set((state) => {
        const updateVisitLesion = (v: Visit) =>
          v.visit_id === visitId
            ? { ...v, lesions: v.lesions.map((l) => l.lesion_id === lesion.lesion_id ? lesion : l) }
            : v;
        return {
          patients: state.patients.map((p) => ({ ...p, visits: p.visits.map(updateVisitLesion) })),
          selectedPatient: state.selectedPatient
            ? { ...state.selectedPatient, visits: state.selectedPatient.visits.map(updateVisitLesion) }
            : null,
          currentVisit: state.currentVisit ? updateVisitLesion(state.currentVisit) : null,
        };
      });
      
      await indexedDB.saveLesions([lesion]);
    } catch (error) {
      console.error('Failed to update lesion:', error);
      
      // Fallback: update locally and queue for sync
      set((state) => {
        const updateVisitLesion = (v: Visit) =>
          v.visit_id === visitId
            ? { ...v, lesions: v.lesions.map((l) => l.lesion_id === lesion.lesion_id ? lesion : l) }
            : v;
        return {
          patients: state.patients.map((p) => ({ ...p, visits: p.visits.map(updateVisitLesion) })),
          selectedPatient: state.selectedPatient
            ? { ...state.selectedPatient, visits: state.selectedPatient.visits.map(updateVisitLesion) }
            : null,
          currentVisit: state.currentVisit ? updateVisitLesion(state.currentVisit) : null,
        };
      });
      
      await syncService.queueChange('lesions', lesion.lesion_id, 'update', lesion);
      await indexedDB.saveLesions([lesion]);
    }
  },

  deleteLesion: async (visitId, lesionId) => {
    try {
      await apiClient.deleteLesion(lesionId);
      
      set((state) => {
        const deleteFromVisit = (v: Visit) =>
          v.visit_id === visitId
            ? { ...v, lesions: v.lesions.filter((l) => l.lesion_id !== lesionId) }
            : v;
        return {
          patients: state.patients.map((p) => ({ ...p, visits: p.visits.map(deleteFromVisit) })),
          selectedPatient: state.selectedPatient
            ? { ...state.selectedPatient, visits: state.selectedPatient.visits.map(deleteFromVisit) }
            : null,
          currentVisit: state.currentVisit ? deleteFromVisit(state.currentVisit) : null,
          selectedLesion: state.selectedLesion?.lesion_id === lesionId ? null : state.selectedLesion,
        };
      });
      
      // Note: IndexedDB deletion not needed for offline-first architecture
    } catch (error) {
      console.error('Failed to delete lesion:', error);
      
      // Fallback: delete locally and queue for sync
      set((state) => {
        const deleteFromVisit = (v: Visit) =>
          v.visit_id === visitId
            ? { ...v, lesions: v.lesions.filter((l) => l.lesion_id !== lesionId) }
            : v;
        return {
          patients: state.patients.map((p) => ({ ...p, visits: p.visits.map(deleteFromVisit) })),
          selectedPatient: state.selectedPatient
            ? { ...state.selectedPatient, visits: state.selectedPatient.visits.map(deleteFromVisit) }
            : null,
          currentVisit: state.currentVisit ? deleteFromVisit(state.currentVisit) : null,
          selectedLesion: state.selectedLesion?.lesion_id === lesionId ? null : state.selectedLesion,
        };
      });
      
      await syncService.queueChange('lesions', lesionId, 'delete', null);
      // Note: IndexedDB deletion not needed for offline-first architecture
    }
  },

  completeVisit: async (visitId, status, providerAttestation) => {
    try {
      const updatePayload: { status: VisitStatus; provider_attestation?: string } = { status };
      if (providerAttestation) updatePayload.provider_attestation = providerAttestation;

      await apiClient.updateVisit(visitId, updatePayload);
      
      set((state) => {
        const updateStatus = (v: Visit) =>
          v.visit_id === visitId
            ? { ...v, status, ...(providerAttestation ? { provider_attestation: providerAttestation } : {}) }
            : v;
        return {
          patients: state.patients.map((p) => ({ ...p, visits: p.visits.map(updateStatus) })),
          selectedPatient: state.selectedPatient
            ? { ...state.selectedPatient, visits: state.selectedPatient.visits.map(updateStatus) }
            : null,
          currentVisit: state.currentVisit?.visit_id === visitId
            ? updateStatus(state.currentVisit)
            : state.currentVisit,
        };
      });
      
      const visit = get().currentVisit;
      if (visit) await indexedDB.saveVisits([visit]);
    } catch (error) {
      console.error('Failed to complete visit:', error);
      
      // Fallback: update locally and queue for sync
      set((state) => {
        const updateStatus = (v: Visit) =>
          v.visit_id === visitId
            ? { ...v, status, ...(providerAttestation ? { provider_attestation: providerAttestation } : {}) }
            : v;
        return {
          patients: state.patients.map((p) => ({ ...p, visits: p.visits.map(updateStatus) })),
          selectedPatient: state.selectedPatient
            ? { ...state.selectedPatient, visits: state.selectedPatient.visits.map(updateStatus) }
            : null,
          currentVisit: state.currentVisit?.visit_id === visitId
            ? updateStatus(state.currentVisit)
            : state.currentVisit,
        };
      });
      
      await syncService.queueChange('visits', visitId, 'update', { status, provider_attestation: providerAttestation });
      const visit = get().currentVisit;
      if (visit) await indexedDB.saveVisits([visit]);
    }
  },

  deleteVisit: async (visitId) => {
    try {
      await apiClient.deleteVisit(visitId);
      
      set((state) => {
        const filterVisit = (visits: Visit[]) => visits.filter(v => v.visit_id !== visitId);
        return {
          patients: state.patients.map((p) => ({ ...p, visits: filterVisit(p.visits) })),
          selectedPatient: state.selectedPatient
            ? { ...state.selectedPatient, visits: filterVisit(state.selectedPatient.visits) }
            : null,
          currentVisit: state.currentVisit?.visit_id === visitId ? null : state.currentVisit,
        };
      });
      
      // Note: IndexedDB deletion not needed for offline-first architecture
    } catch (error) {
      console.error('Failed to delete visit:', error);
      
      // Fallback: delete locally and queue for sync
      set((state) => {
        const filterVisit = (visits: Visit[]) => visits.filter(v => v.visit_id !== visitId);
        return {
          patients: state.patients.map((p) => ({ ...p, visits: filterVisit(p.visits) })),
          selectedPatient: state.selectedPatient
            ? { ...state.selectedPatient, visits: filterVisit(state.selectedPatient.visits) }
            : null,
          currentVisit: state.currentVisit?.visit_id === visitId ? null : state.currentVisit,
        };
      });
      
      await syncService.queueChange('visits', visitId, 'delete', null);
      // Note: IndexedDB deletion not needed for offline-first architecture
    }
  },

  currentPage: 'login',
  setCurrentPage: (page) => set({ currentPage: page }),

  docStartTime: null,
  startDocTimer: () => set({ docStartTime: Date.now() }),
  getDocTime: () => {
    const start = get().docStartTime;
    if (!start) return 0;
    return Math.round((Date.now() - start) / 1000);
  },
}));
