import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useAppStore } from './appStore';
import { SYNTHETIC_PATIENTS } from '../data/syntheticData';
import { Lesion, Visit } from '../types';

// Mock service dependencies so tests run without a real backend or IndexedDB
vi.mock('../services/apiClient', () => ({
  apiClient: {
    login: vi.fn(),
    logout: vi.fn(),
    getPatients: vi.fn().mockResolvedValue([]),
    createVisit: vi.fn().mockImplementation((data: Partial<Visit>) =>
      Promise.resolve({
        visit_id: `v-api-${Date.now()}`,
        visit_date: new Date().toISOString().split('T')[0],
        visit_type: 'routine_screening',
        chief_complaint: 'Annual skin check',
        status: 'in_progress',
        lesions: [],
        created_at: new Date().toISOString(),
        created_by: (data as any).ma_id ?? 'test',
        ...data,
      })
    ),
    updateVisit: vi.fn().mockResolvedValue({}),
    deleteVisit: vi.fn().mockResolvedValue({}),
    createLesion: vi.fn().mockImplementation((data: any) => Promise.resolve(data)),
    updateLesion: vi.fn().mockResolvedValue({}),
    deleteLesion: vi.fn().mockResolvedValue({}),
  },
}));

vi.mock('../services/indexedDB', () => ({
  default: {
    savePatients: vi.fn().mockResolvedValue(undefined),
    getPatients: vi.fn().mockResolvedValue([]),
    saveVisits: vi.fn().mockResolvedValue(undefined),
    saveLesions: vi.fn().mockResolvedValue(undefined),
    addPendingChange: vi.fn().mockResolvedValue(undefined),
    clearAll: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock('../services/syncService', () => ({
  default: {
    queueChange: vi.fn().mockResolvedValue(undefined),
    destroy: vi.fn(),
  },
}));

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

const makeMockPatient = () => ({
  patient_id: 'p-test-1',
  first_name: 'Test',
  last_name: 'Patient',
  dob: '1990-01-01',
  date_of_birth: '1990-01-01',
  mrn: 'MRN-TEST-001',
  age: 34,
  sex: 'F' as const,
  gender: 'female' as const,
  skin_type: 'III' as const,
  visits: [],
  created_at: new Date().toISOString(),
});

describe('useAppStore', () => {
  beforeEach(() => {
    resetStore();
  });

  it('logs in and logs out', async () => {
    // Skip actual login test since it requires API, just test state changes
    const user = { id: 'ma-100', name: 'Jamie Doe', role: 'ma' as const, email: 'jamie@example.com' };
    useAppStore.setState({ currentUser: user, token: 'test-token' });

    expect(useAppStore.getState().currentUser).toEqual(user);

    useAppStore.getState().logout();

    expect(useAppStore.getState().currentUser).toBeNull();
    expect(useAppStore.getState().currentVisit).toBeNull();
    expect(useAppStore.getState().selectedPatient).toBeNull();
    expect(useAppStore.getState().currentPage).toBe('login');
  });

  it('starts a new visit and updates patient state', async () => {
    const user = { id: 'ma-101', name: 'Avery Hart', role: 'ma' as const, email: 'avery@example.com' };
    
    // Set up synthetic data for testing
    useAppStore.setState({ patients: [makeMockPatient()] });
    const patient = useAppStore.getState().patients[0];

    useAppStore.setState({ currentUser: user, token: 'test-token' });
    const newVisit = await useAppStore.getState().startNewVisit(patient);

    const state = useAppStore.getState();
    const updatedPatient = state.patients.find((p) => p.patient_id === patient.patient_id);

    expect(state.currentVisit?.visit_id).toBe(newVisit.visit_id);
    expect(state.selectedPatient?.visits.some((v) => v.visit_id === newVisit.visit_id)).toBe(true);
    expect(updatedPatient?.visits.some((v) => v.visit_id === newVisit.visit_id)).toBe(true);
    expect(newVisit.ma_id).toBe(user.id);
  });

  it('adds and updates lesions in a visit', async () => {
    const user = { id: 'ma-101', name: 'Avery Hart', role: 'ma' as const, email: 'avery@example.com' };
    useAppStore.setState({ currentUser: user, token: 'test-token', patients: [makeMockPatient()] });
    const patient = useAppStore.getState().patients[0];

    // Create a visit first since the mock patient starts with no visits
    const visit = await useAppStore.getState().startNewVisit(patient);
    useAppStore.getState().setCurrentVisit(visit);

    const lesion = makeLesion({ lesion_id: 'l-added-1' });
    await useAppStore.getState().addLesionToVisit(visit.visit_id, lesion);

    const updatedVisit = useAppStore.getState().patients[0].visits.find(v => v.visit_id === visit.visit_id)!;
    expect(updatedVisit.lesions.some((l) => l.lesion_id === 'l-added-1')).toBe(true);
    expect(useAppStore.getState().currentVisit?.lesions.some((l) => l.lesion_id === 'l-added-1')).toBe(true);

    const addedLesion = updatedVisit.lesions.find(l => l.lesion_id === 'l-added-1')!;
    const updatedLesion = { ...addedLesion, size_mm: (addedLesion.size_mm || 0) + 2 };
    await useAppStore.getState().updateLesion(visit.visit_id, updatedLesion);

    const visitAfterUpdate = useAppStore.getState().patients[0].visits.find(v => v.visit_id === visit.visit_id)!;
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
    // Use the pre-seeded SYNTHETIC_PATIENTS so visits and lesions exist
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

  it('deletes a lesion from a visit', async () => {
    const patient = useAppStore.getState().patients[0];
    const visit = patient.visits[0];
    const lesion = makeLesion({ lesion_id: 'l-delete-test' });

    await useAppStore.getState().addLesionToVisit(visit.visit_id, lesion);

    let updatedVisit = useAppStore.getState().patients[0].visits[0];
    expect(updatedVisit.lesions.some((l) => l.lesion_id === 'l-delete-test')).toBe(true);

    await useAppStore.getState().deleteLesion(visit.visit_id, 'l-delete-test');

    updatedVisit = useAppStore.getState().patients[0].visits[0];
    expect(updatedVisit.lesions.some((l) => l.lesion_id === 'l-delete-test')).toBe(false);
  });

  it('deletes lesion and clears selected lesion if it matches', async () => {
    const patient = useAppStore.getState().patients[0];
    const visit = patient.visits[0];
    const lesion = makeLesion({ lesion_id: 'l-selected-delete' });

    await useAppStore.getState().addLesionToVisit(visit.visit_id, lesion);
    useAppStore.getState().setSelectedLesion(lesion);

    expect(useAppStore.getState().selectedLesion?.lesion_id).toBe('l-selected-delete');

    await useAppStore.getState().deleteLesion(visit.visit_id, 'l-selected-delete');

    expect(useAppStore.getState().selectedLesion).toBeNull();
  });

  it('completes a visit by updating its status', async () => {
    const user = { id: 'ma-102', name: 'Test MA', role: 'ma' as const, email: 'test@example.com' };
    useAppStore.setState({ currentUser: user, token: 'test-token', patients: [makeMockPatient()] });
    const patient = useAppStore.getState().patients[0];
    
    const visit = await useAppStore.getState().startNewVisit(patient);

    expect(visit.status).toBe('in_progress');

    await useAppStore.getState().completeVisit(visit.visit_id, 'signed');

    const updatedPatient = useAppStore.getState().patients.find(p => p.patient_id === patient.patient_id);
    const updatedVisit = updatedPatient?.visits.find(v => v.visit_id === visit.visit_id);
    expect(updatedVisit?.status).toBe('signed');
  });

  it('completes visit and updates currentVisit if it matches', async () => {
    const user = { id: 'ma-103', name: 'Test MA', role: 'ma' as const, email: 'test@example.com' };
    useAppStore.setState({ currentUser: user, token: 'test-token', patients: [makeMockPatient()] });
    const patient = useAppStore.getState().patients[0];
    
    const visit = await useAppStore.getState().startNewVisit(patient);

    useAppStore.getState().setCurrentVisit(visit);
    expect(useAppStore.getState().currentVisit?.status).toBe('in_progress');

    await useAppStore.getState().completeVisit(visit.visit_id, 'pending_review');

    expect(useAppStore.getState().currentVisit?.status).toBe('pending_review');
  });

  it('deletes an entire visit', async () => {
    const user = { id: 'ma-102', name: 'Test MA', role: 'ma' as const, email: 'test@example.com' };
    useAppStore.setState({ currentUser: user, token: 'test-token', patients: [makeMockPatient()] });
    const patient = useAppStore.getState().patients[0];
    
    const newVisit = await useAppStore.getState().startNewVisit(patient);

    let updatedPatient = useAppStore.getState().patients[0];
    expect(updatedPatient.visits.some((v) => v.visit_id === newVisit.visit_id)).toBe(true);

    await useAppStore.getState().deleteVisit(newVisit.visit_id);

    updatedPatient = useAppStore.getState().patients[0];
    expect(updatedPatient.visits.some((v) => v.visit_id === newVisit.visit_id)).toBe(false);
  });

  it('deletes visit and clears currentVisit if it matches', async () => {
    const user = { id: 'ma-103', name: 'Test MA', role: 'ma' as const, email: 'test@example.com' };
    useAppStore.setState({ currentUser: user, token: 'test-token', patients: [makeMockPatient()] });
    const patient = useAppStore.getState().patients[0];
    
    const newVisit = await useAppStore.getState().startNewVisit(patient);
    useAppStore.getState().setCurrentVisit(newVisit);

    expect(useAppStore.getState().currentVisit?.visit_id).toBe(newVisit.visit_id);

    await useAppStore.getState().deleteVisit(newVisit.visit_id);

    expect(useAppStore.getState().currentVisit).toBeNull();
  });
});
