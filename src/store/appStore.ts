import { create } from 'zustand';
import { User, Patient, Visit, Lesion, BodyView } from '../types';
import { SYNTHETIC_PATIENTS } from '../data/syntheticData';

interface AppState {
  // Auth
  currentUser: User | null;
  login: (user: User) => void;
  logout: () => void;

  // Patients
  patients: Patient[];
  selectedPatient: Patient | null;
  setSelectedPatient: (patient: Patient | null) => void;

  // Current Visit
  currentVisit: Visit | null;
  setCurrentVisit: (visit: Visit | null) => void;
  startNewVisit: (patient: Patient) => Visit;

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
  addLesionToVisit: (visitId: string, lesion: Lesion) => void;
  updateLesion: (visitId: string, lesion: Lesion) => void;

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
  login: (user) => set({ currentUser: user }),
  logout: () => set({
    currentUser: null,
    selectedPatient: null,
    currentVisit: null,
    selectedLesion: null,
    pendingLesion: null,
    currentPage: 'login',
  }),

  patients: SYNTHETIC_PATIENTS,
  selectedPatient: null,
  setSelectedPatient: (patient) => set({ selectedPatient: patient }),

  currentVisit: null,
  setCurrentVisit: (visit) => set({ currentVisit: visit }),
  startNewVisit: (patient) => {
    const user = get().currentUser!;
    const newVisit: Visit = {
      visit_id: `v-new-${Date.now()}`,
      visit_date: new Date().toISOString().split('T')[0],
      provider_id: 'dr-001',
      provider_name: 'Dr. Sarah Mitchell',
      ma_id: user.id,
      ma_name: user.name,
      status: 'in_progress',
      created_at: new Date().toISOString(),
      lesions: [],
    };
    // Add to patient's visits
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
    return newVisit;
  },

  bodyView: 'anterior',
  setBodyView: (view) => set({ bodyView: view }),
  placingLesion: false,
  setPlacingLesion: (placing) => set({ placingLesion: placing }),

  selectedLesion: null,
  setSelectedLesion: (lesion) => set({ selectedLesion: lesion }),
  pendingLesion: null,
  setPendingLesion: (coords) => set({ pendingLesion: coords }),

  addLesionToVisit: (visitId, lesion) => {
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
  },

  updateLesion: (visitId, lesion) => {
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
