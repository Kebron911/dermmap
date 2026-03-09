export type UserRole = 'ma' | 'provider' | 'admin';

export interface User {
  id: string;
  name: string;
  role: UserRole;
  email: string;
  credentials?: string;
}

export type FitzpatrickType = 'I' | 'II' | 'III' | 'IV' | 'V' | 'VI';

export type VisitStatus = 'in_progress' | 'pending_review' | 'signed' | 'locked';

export type LesionAction =
  | 'monitor'
  | 'biopsy_scheduled'
  | 'biopsy_performed'
  | 'excision'
  | 'referral'
  | 'no_action';

export type BiopsyResult = 'benign' | 'atypical' | 'malignant' | 'pending' | 'na';

export type LesionShape = 'round' | 'oval' | 'irregular' | 'other';

export type LesionColor =
  | 'tan'
  | 'brown'
  | 'dark_brown'
  | 'black'
  | 'red'
  | 'pink'
  | 'multicolored';

export type LesionBorder = 'regular' | 'irregular' | 'not_assessed';
export type LesionSymmetry = 'symmetric' | 'asymmetric' | 'not_assessed';

export type BodyView =
  | 'anterior'
  | 'posterior'
  | 'lateral_left'
  | 'lateral_right'
  | 'face_detail'
  | 'hands_detail'
  | 'feet_detail';

export type BodyRegion =
  | 'scalp'
  | 'face'
  | 'neck'
  | 'left_shoulder'
  | 'right_shoulder'
  | 'left_upper_arm'
  | 'right_upper_arm'
  | 'left_forearm'
  | 'right_forearm'
  | 'left_hand'
  | 'right_hand'
  | 'chest'
  | 'upper_back'
  | 'abdomen'
  | 'lower_back'
  | 'left_hip'
  | 'right_hip'
  | 'left_thigh'
  | 'right_thigh'
  | 'left_lower_leg'
  | 'right_lower_leg'
  | 'left_foot'
  | 'right_foot';

export interface Photo {
  photo_id: string;
  url: string;
  capture_type: 'clinical' | 'dermoscopic';
  captured_at: string;
  captured_by: string;
  thumbnail?: string;
}

export interface Lesion {
  lesion_id: string;
  body_location_x: number;
  body_location_y: number;
  body_region: BodyRegion;
  body_view: BodyView;
  size_mm: number | null;
  shape: LesionShape | null;
  color: LesionColor | null;
  border: LesionBorder;
  symmetry: LesionSymmetry;
  action: LesionAction;
  clinical_notes: string;
  biopsy_result: BiopsyResult;
  pathology_notes: string;
  created_at: string;
  created_by: string;
  photos: Photo[];
  isNew?: boolean;
}

export interface Visit {
  visit_id: string;
  visit_date: string;
  provider_id: string;
  provider_name: string;
  ma_id: string;
  ma_name: string;
  status: VisitStatus;
  created_at: string;
  lesions: Lesion[];
}

export interface Patient {
  patient_id: string;
  first_name: string;
  last_name: string;
  date_of_birth: string;
  mrn: string;
  gender: 'male' | 'female' | 'other';
  skin_type: FitzpatrickType;
  created_at: string;
  visits: Visit[];
}

export interface AuditLogEntry {
  log_id: string;
  timestamp: string;
  user_id: string;
  user_name: string;
  user_role: UserRole;
  action_type: 'create' | 'read' | 'update' | 'delete' | 'export' | 'login' | 'logout';
  resource_type: 'patient' | 'visit' | 'lesion' | 'photo' | 'user' | 'setting';
  resource_id: string;
  details: string;
  ip_address: string;
  device_id: string;
}

export interface ClinicStats {
  total_visits: number;
  avg_documentation_time_sec: number;
  total_photos: number;
  avg_lesions_per_visit: number;
  visits_by_day: { date: string; count: number }[];
  provider_adoption: { name: string; visits: number; photos: number }[];
  lesion_outcomes: { status: string; count: number }[];
}
