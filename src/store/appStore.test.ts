import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { useAppStore } from './appStore';
import { SYNTHETIC_PATIENTS } from '../data/syntheticData';
import { Lesion } from '../types';

const initialState = useAppStore.getState();

const seedPatients = () => structuredClone(SYNTHETIC_PATIENTS);

const resetStore = () => {
  useAppStore.setState(
    {
      ...initialState,
      patients: seedPatients(),
      currentUser: null,
      selectedPatient: null,
      currentVisit: null,
      selectedLesion: null,
      pendingLesion: null,
      currentPage: 'login',
      docStartTime: null,
    },
    true
  );
};

const makeLesion = (overrides: Partial<Lesion> = {}): Lesion => ({
  lesion_id: 'l-test-1',
  body_location_x: 100,
  body_location_y: 120,
  body_region: 'chest',
  body_view: 'anterior',
  size_mm: 4,
  shape: 'round',
  color: 'brown',
  border: 'regular',
  symmetry: 'symmetric',
  action: 'monitor',
  clinical_notes: 'Baseline lesion',
  biopsy_result: 'na',
  pathology_notes: '',
  created_at: new Date().toISOString(),
  created_by: 'tester',
  photos: [],
  ...overrides,
});

describe('useAppStore', () => {
  beforeEach(() => {
    resetStore();
  });

  it('logs in and logs out', () => {
    const user = { id: 'ma-100', name: 'Jamie Doe', role: 'ma' as const, email: 'jamie@example.com' };
    useAppStore.getState().login(user);

    expect(useAppStore.getState().currentUser).toEqual(user);

    useAppStore.getState().logout();

    expect(useAppStore.getState().currentUser).toBeNull();
    expect(useAppStore.getState().currentVisit).toBeNull();
    expect(useAppStore.getState().selectedPatient).toBeNull();
    expect(useAppStore.getState().currentPage).toBe('login');
  });

  it('starts a new visit and updates patient state', () => {
    const user = { id: 'ma-101', name: 'Avery Hart', role: 'ma' as const, email: 'avery@example.com' };
    const patient = useAppStore.getState().patients[0];

    useAppStore.getState().login(user);
    const newVisit = useAppStore.getState().startNewVisit(patient);

    const state = useAppStore.getState();
    const updatedPatient = state.patients.find((p) => p.patient_id === patient.patient_id);

    expect(state.currentVisit?.visit_id).toBe(newVisit.visit_id);
    expect(state.selectedPatient?.visits.some((v) => v.visit_id === newVisit.visit_id)).toBe(true);
    expect(updatedPatient?.visits.some((v) => v.visit_id === newVisit.visit_id)).toBe(true);
    expect(newVisit.ma_id).toBe(user.id);
  });

  it('adds and updates lesions in a visit', () => {
    const patient = useAppStore.getState().patients[0];
    const visit = patient.visits[0];

    useAppStore.getState().setCurrentVisit(visit);

    const lesion = makeLesion({ lesion_id: 'l-added-1' });
    useAppStore.getState().addLesionToVisit(visit.visit_id, lesion);

    const updatedVisit = useAppStore.getState().patients[0].visits[0];
    expect(updatedVisit.lesions.some((l) => l.lesion_id === 'l-added-1')).toBe(true);
    expect(useAppStore.getState().currentVisit?.lesions.some((l) => l.lesion_id === 'l-added-1')).toBe(true);

    const existingLesion = updatedVisit.lesions[0];
    const updatedLesion = { ...existingLesion, size_mm: (existingLesion.size_mm || 0) + 2 };
    useAppStore.getState().updateLesion(visit.visit_id, updatedLesion);

    const visitAfterUpdate = useAppStore.getState().patients[0].visits[0];
    const found = visitAfterUpdate.lesions.find((l) => l.lesion_id === updatedLesion.lesion_id);
    expect(found?.size_mm).toBe(updatedLesion.size_mm);
  });

  it('tracks documentation time', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-01-01T00:00:00Z'));

    useAppStore.getState().startDocTimer();

    vi.setSystemTime(new Date('2024-01-01T00:00:10Z'));
    expect(useAppStore.getState().getDocTime()).toBe(10);

    vi.useRealTimers();
  });

  it('updates view and selection state', () => {
    const patient = useAppStore.getState().patients[0];
    const visit = patient.visits[0];
    const lesion = visit.lesions[0];

    useAppStore.getState().setSelectedPatient(patient);
    useAppStore.getState().setCurrentVisit(visit);
    useAppStore.getState().setSelectedLesion(lesion);
    useAppStore.getState().setPendingLesion({ x: 12, y: 34 });
    useAppStore.getState().setBodyView('posterior');
    useAppStore.getState().setPlacingLesion(true);
    useAppStore.getState().setCurrentPage('search');

    const state = useAppStore.getState();
    expect(state.selectedPatient?.patient_id).toBe(patient.patient_id);
    expect(state.currentVisit?.visit_id).toBe(visit.visit_id);
    expect(state.selectedLesion?.lesion_id).toBe(lesion.lesion_id);
    expect(state.pendingLesion).toEqual({ x: 12, y: 34 });
    expect(state.bodyView).toBe('posterior');
    expect(state.placingLesion).toBe(true);
    expect(state.currentPage).toBe('search');
  });
});
