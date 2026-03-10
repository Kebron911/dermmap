export type UserRole = 'ma' | 'provider' | 'admin';

export interface User {
  id: string;
  name: string;
  role: UserRole;
  email: string;
  credentials?: string;
  location_id?: string;
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

// ---------------------------------------------------------------------------
// Dermoscopic feature annotations
// ---------------------------------------------------------------------------
export type DermoscopyFeature =
  | 'pigment_network'
  | 'atypical_network'
  | 'blue_white_veil'
  | 'regression_structures'
  | 'dots_globules'
  | 'streaks'
  | 'blotch'
  | 'vascular_pattern'
  | 'structureless'
  | 'crystalline_structures';

export interface DermoscopyAnnotation {
  feature: DermoscopyFeature;
  x: number;
  y: number;
  notes?: string;
}

// ---------------------------------------------------------------------------
// CPT code tracking
// ---------------------------------------------------------------------------
export interface CPTCode {
  code: string;
  description: string;
  category: 'evaluation' | 'biopsy' | 'excision' | 'destruction' | 'repair' | 'pathology' | 'photo';
  fee_estimate?: number;
}

// ---------------------------------------------------------------------------
// Risk scoring
// ---------------------------------------------------------------------------
export interface RiskScore {
  total: number;           // 0-10
  asymmetry: number;       // 0-2
  border: number;          // 0-2
  color: number;           // 0-2
  diameter: number;        // 0-2
  evolution: number;       // 0-2
  level: 'low' | 'moderate' | 'high' | 'very_high';
  recommendation: string;
}

// ---------------------------------------------------------------------------
// Change detection
// ---------------------------------------------------------------------------
export interface LesionChange {
  lesion_id: string;
  previous_visit_id: string;
  current_visit_id: string;
  size_delta_mm: number | null;
  color_changed: boolean;
  border_changed: boolean;
  symmetry_changed: boolean;
  new_features: DermoscopyFeature[];
  overall_concern: 'none' | 'low' | 'moderate' | 'high';
  summary: string;
}

export interface Photo {
  photo_id: string;
  url: string;
  capture_type: 'clinical' | 'dermoscopic';
  captured_at: string;
  captured_by: string;
  thumbnail?: string;
  annotations?: DermoscopyAnnotation[];
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
  risk_score?: RiskScore;
  dermoscopy_features?: DermoscopyFeature[];
  cpt_codes?: string[];
  measurements?: { width_mm?: number; height_mm?: number; depth_mm?: number };
  change_from_prior?: LesionChange;
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
  cpt_codes?: string[];
  documentation_time_sec?: number;
  location_id?: string;
  provider_attestation?: string;
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
  location_id?: string;
  risk_level?: 'low' | 'moderate' | 'high';
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

// ---------------------------------------------------------------------------
// Clinic / location
// ---------------------------------------------------------------------------
export interface ClinicLocation {
  location_id: string;
  name: string;
  address: string;
  phone: string;
  timezone: string;
  providers: string[];
  active: boolean;
}

// ---------------------------------------------------------------------------
// Provider performance
// ---------------------------------------------------------------------------
export interface ProviderPerformance {
  provider_id: string;
  provider_name: string;
  total_visits: number;
  total_lesions: number;
  total_photos: number;
  avg_documentation_time_sec: number;
  biopsies_performed: number;
  malignancies_found: number;
  biopsy_yield_pct: number;  // malignancies / biopsies * 100
  patients_seen: number;
  visits_per_day: number;
}

// ---------------------------------------------------------------------------
// Staff scorecard (MA metrics)
// ---------------------------------------------------------------------------
export interface StaffScorecard {
  user_id: string;
  user_name: string;
  role: UserRole;
  total_visits_documented: number;
  total_photos_taken: number;
  avg_documentation_time_sec: number;
  completeness_pct: number;       // % of lesion fields filled in
  photos_per_lesion: number;
  visits_per_day: number;
}

// ---------------------------------------------------------------------------
// Quality metrics
// ---------------------------------------------------------------------------
export interface QualityMetrics {
  biopsy_yield: number;           // % biopsies malignant
  documentation_completeness: number; // % fields completed
  photo_quality_score: number;     // avg 1-5 rating
  avg_lesions_per_visit: number;
  follow_up_compliance: number;   // % follow-ups completed on time
  referral_turnaround_days: number;
}

// ---------------------------------------------------------------------------
// Clinical note template
// ---------------------------------------------------------------------------
export interface ClinicalNoteTemplate {
  id: string;
  name: string;
  category: 'common' | 'biopsy' | 'follow_up' | 'screening' | 'custom';
  text: string;
  tags: string[];
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

