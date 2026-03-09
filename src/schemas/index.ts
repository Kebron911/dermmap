import { z } from 'zod';

// ---------------------------------------------------------------------------
// Shared enums as Zod schemas
// ---------------------------------------------------------------------------

export const UserRoleSchema = z.enum(['ma', 'provider', 'admin']);
export const FitzpatrickTypeSchema = z.enum(['I', 'II', 'III', 'IV', 'V', 'VI']);
export const VisitStatusSchema = z.enum(['in_progress', 'pending_review', 'signed', 'locked']);
export const LesionActionSchema = z.enum([
  'monitor', 'biopsy_scheduled', 'biopsy_performed', 'excision', 'referral', 'no_action',
]);
export const BiopsyResultSchema = z.enum(['benign', 'atypical', 'malignant', 'pending', 'na']);
export const LesionShapeSchema = z.enum(['round', 'oval', 'irregular', 'other']);
export const LesionColorSchema = z.enum([
  'tan', 'brown', 'dark_brown', 'black', 'red', 'pink', 'multicolored',
]);
export const LesionBorderSchema = z.enum(['regular', 'irregular', 'not_assessed']);
export const LesionSymmetrySchema = z.enum(['symmetric', 'asymmetric', 'not_assessed']);
export const BodyViewSchema = z.enum([
  'anterior', 'posterior', 'lateral_left', 'lateral_right',
  'face_detail', 'hands_detail', 'feet_detail',
]);
export const BodyRegionSchema = z.enum([
  'scalp', 'face', 'neck', 'left_shoulder', 'right_shoulder',
  'left_upper_arm', 'right_upper_arm', 'left_forearm', 'right_forearm',
  'left_hand', 'right_hand', 'chest', 'upper_back', 'abdomen', 'lower_back',
  'left_hip', 'right_hip', 'left_thigh', 'right_thigh',
  'left_lower_leg', 'right_lower_leg', 'left_foot', 'right_foot',
]);

// ---------------------------------------------------------------------------
// Domain schemas
// ---------------------------------------------------------------------------

export const PhotoSchema = z.object({
  photo_id: z.string().min(1),
  url: z.string().min(1),
  capture_type: z.enum(['clinical', 'dermoscopic']),
  captured_at: z.string().datetime({ offset: true }).or(z.string().min(1)),
  captured_by: z.string().min(1),
  thumbnail: z.string().optional(),
});

export const LesionSchema = z.object({
  lesion_id: z.string().min(1),
  body_location_x: z.number().min(0).max(1),
  body_location_y: z.number().min(0).max(1),
  body_region: BodyRegionSchema,
  body_view: BodyViewSchema,
  size_mm: z.number().positive().nullable(),
  shape: LesionShapeSchema.nullable(),
  color: LesionColorSchema.nullable(),
  border: LesionBorderSchema,
  symmetry: LesionSymmetrySchema,
  action: LesionActionSchema,
  clinical_notes: z.string(),
  biopsy_result: BiopsyResultSchema,
  pathology_notes: z.string(),
  created_at: z.string().min(1),
  created_by: z.string().min(1),
  photos: z.array(PhotoSchema),
  isNew: z.boolean().optional(),
});

export const VisitSchema = z.object({
  visit_id: z.string().min(1),
  visit_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD'),
  provider_id: z.string().min(1),
  provider_name: z.string().min(1),
  ma_id: z.string().min(1),
  ma_name: z.string().min(1),
  status: VisitStatusSchema,
  created_at: z.string().min(1),
  lesions: z.array(LesionSchema),
});

export const PatientSchema = z.object({
  patient_id: z.string().min(1),
  first_name: z.string().min(1, 'First name is required'),
  last_name: z.string().min(1, 'Last name is required'),
  date_of_birth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD'),
  mrn: z.string().min(1, 'MRN is required'),
  gender: z.enum(['male', 'female', 'other']),
  skin_type: FitzpatrickTypeSchema,
  created_at: z.string().min(1),
  visits: z.array(VisitSchema),
});

// ---------------------------------------------------------------------------
// Form‐specific schemas (partial, for user input validation)
// ---------------------------------------------------------------------------

export const LoginFormSchema = z.object({
  email: z.string().email('Valid email is required'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

export const LesionFormSchema = z.object({
  size_mm: z.number().positive('Size must be positive').nullable(),
  shape: LesionShapeSchema.nullable(),
  color: LesionColorSchema.nullable(),
  border: LesionBorderSchema,
  symmetry: LesionSymmetrySchema,
  action: LesionActionSchema,
  clinical_notes: z.string().max(2000, 'Notes limited to 2000 characters'),
});

// Type exports
export type LoginFormData = z.infer<typeof LoginFormSchema>;
export type LesionFormData = z.infer<typeof LesionFormSchema>;
