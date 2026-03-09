import { config } from '../config';
import { api } from './api';
import { logger } from './logger';
import type { Patient, Visit, Lesion } from '../types';
import { SYNTHETIC_PATIENTS } from '../data/syntheticData';
import { db } from './db';

// ---------------------------------------------------------------------------
// Patient Service — abstracts data‐access; in demo mode returns synthetic data
// from an IndexedDB‐backed cache.  In production mode it hits the real API.
// ---------------------------------------------------------------------------

export const patientService = {
  async getAll(): Promise<Patient[]> {
    if (config.isDemo) {
      let patients = await db.patients.getAll();
      if (patients.length === 0) {
        for (const p of SYNTHETIC_PATIENTS) {
          await db.patients.put(p);
        }
        patients = SYNTHETIC_PATIENTS;
      }
      return patients;
    }
    return api.get<Patient[]>('/patients');
  },

  async getById(id: string): Promise<Patient | undefined> {
    if (config.isDemo) {
      return db.patients.get(id);
    }
    return api.get<Patient>(`/patients/${id}`);
  },

  async update(patient: Patient): Promise<Patient> {
    if (config.isDemo) {
      await db.patients.put(patient);
      return patient;
    }
    return api.put<Patient>(`/patients/${patient.patient_id}`, patient);
  },
};

// ---------------------------------------------------------------------------
// Visit Service
// ---------------------------------------------------------------------------

export const visitService = {
  async create(patientId: string, visit: Visit): Promise<Visit> {
    if (config.isDemo) {
      const patient = await patientService.getById(patientId);
      if (patient) {
        patient.visits = [...patient.visits, visit];
        await db.patients.put(patient);
      }
      logger.info('Visit created (demo)', { visitId: visit.visit_id, patientId });
      return visit;
    }
    return api.post<Visit>(`/patients/${patientId}/visits`, visit);
  },

  async update(patientId: string, visit: Visit): Promise<Visit> {
    if (config.isDemo) {
      const patient = await patientService.getById(patientId);
      if (patient) {
        patient.visits = patient.visits.map(v => (v.visit_id === visit.visit_id ? visit : v));
        await db.patients.put(patient);
      }
      return visit;
    }
    return api.put<Visit>(`/patients/${patientId}/visits/${visit.visit_id}`, visit);
  },
};

// ---------------------------------------------------------------------------
// Lesion Service
// ---------------------------------------------------------------------------

export const lesionService = {
  async addToVisit(patientId: string, visitId: string, lesion: Lesion): Promise<Lesion> {
    if (config.isDemo) {
      const patient = await patientService.getById(patientId);
      if (patient) {
        const visit = patient.visits.find(v => v.visit_id === visitId);
        if (visit) {
          visit.lesions = [...visit.lesions, lesion];
          await db.patients.put(patient);
        }
      }
      logger.info('Lesion added (demo)', { lesionId: lesion.lesion_id, visitId });
      return lesion;
    }
    return api.post<Lesion>(`/patients/${patientId}/visits/${visitId}/lesions`, lesion);
  },

  async update(patientId: string, visitId: string, lesion: Lesion): Promise<Lesion> {
    if (config.isDemo) {
      const patient = await patientService.getById(patientId);
      if (patient) {
        const visit = patient.visits.find(v => v.visit_id === visitId);
        if (visit) {
          visit.lesions = visit.lesions.map(l => (l.lesion_id === lesion.lesion_id ? lesion : l));
          await db.patients.put(patient);
        }
      }
      return lesion;
    }
    return api.put<Lesion>(
      `/patients/${patientId}/visits/${visitId}/lesions/${lesion.lesion_id}`,
      lesion,
    );
  },
};
