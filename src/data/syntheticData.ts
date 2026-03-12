import { Patient, AuditLogEntry, ClinicStats } from '../types';

// Royalty-free clinical reference images (Unsplash) — used as representative
// stand-ins for captured lesion photos in the demo.
const CLINICAL_IMG_POOL = [
  'https://images.unsplash.com/photo-1576086213369-97a306d36557?w=400&h=400&fit=crop&q=80',
  'https://images.unsplash.com/photo-1579684385127-1ef15d508118?w=400&h=400&fit=crop&q=80',
  'https://images.unsplash.com/photo-1559757148-5c350d0d3c56?w=400&h=400&fit=crop&q=80',
  'https://images.unsplash.com/photo-1576086213369-97a306d36557?w=400&h=400&fit=crop&crop=entropy&q=75',
  'https://images.unsplash.com/photo-1579684385127-1ef15d508118?w=400&h=400&fit=crop&crop=center&q=75',
  'https://images.unsplash.com/photo-1559757148-5c350d0d3c56?w=400&h=400&fit=crop&crop=top&q=75',
];

const DERM_IMG_POOL = [
  'https://images.unsplash.com/photo-1576086213369-97a306d36557?w=400&h=400&fit=crop&crop=faces&q=85',
  'https://images.unsplash.com/photo-1579684385127-1ef15d508118?w=400&h=400&fit=crop&crop=entropy&q=85',
  'https://images.unsplash.com/photo-1559757148-5c350d0d3c56?w=400&h=400&fit=crop&crop=bottom&q=85',
];

// Deterministic pick — stable across hot-reloads, no Math.random()
function photoHash(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) & 0x7fffffff;
  return h;
}

const makeLesionPhoto = (id: string, type: 'clinical' | 'dermoscopic' = 'clinical') => {
  const pool = type === 'dermoscopic' ? DERM_IMG_POOL : CLINICAL_IMG_POOL;
  const url = pool[photoHash(id) % pool.length];
  const thumbnail = url.replace('w=400&h=400', 'w=80&h=80');
  const daysAgo = photoHash(id) % 30;
  return {
    photo_id: `ph-${id}`,
    url,
    capture_type: type,
    captured_at: new Date(Date.now() - daysAgo * 86400000).toISOString(),
    captured_by: (photoHash(id) & 1) ? 'Alex Johnson' : 'Maria Santos',
    thumbnail,
  };
};

export const SYNTHETIC_PATIENTS: Patient[] = [
  {
    patient_id: 'pt-001',
    first_name: 'Margaret',
    last_name: 'Chen',
    date_of_birth: '1962-04-15',
    mrn: 'MRN-204819',
    gender: 'female',
    skin_type: 'III',
    created_at: '2022-01-10T09:00:00Z',
    visits: [
      {
        visit_id: 'v-001-1',
        visit_date: '2024-01-15',
        provider_id: 'dr-001',
        provider_name: 'Dr. Sarah Mitchell',
        ma_id: 'ma-001',
        ma_name: 'Alex Johnson',
        status: 'locked',
        documentation_time_sec: 11,
        created_at: '2024-01-15T09:00:00Z',
        lesions: [
          {
            lesion_id: 'l-001-1-1',
            body_location_x: 80,
            body_location_y: 140,
            body_region: 'chest',
            body_view: 'anterior',
            size_mm: 6,
            shape: 'irregular',
            color: 'dark_brown',
            border: 'irregular',
            symmetry: 'asymmetric',
            action: 'biopsy_performed',
            clinical_notes: 'Asymmetric lesion with irregular border. ABCDE criteria met. Biopsy indicated.',
            biopsy_result: 'atypical',
            pathology_notes: 'Moderately dysplastic nevus. Recommend excision with 5mm margin.',
            created_at: '2024-01-15T09:10:00Z',
            created_by: 'Alex Johnson',
            photos: [
              makeLesionPhoto('001-1-1-a', 'clinical'),
              makeLesionPhoto('001-1-1-b', 'dermoscopic'),
            ],
          },
          {
            lesion_id: 'l-001-1-2',
            body_location_x: 100,
            body_location_y: 200,
            body_region: 'abdomen',
            body_view: 'anterior',
            size_mm: 3,
            shape: 'round',
            color: 'brown',
            border: 'regular',
            symmetry: 'symmetric',
            action: 'monitor',
            clinical_notes: 'Benign-appearing compound nevus. Monitor at next visit.',
            biopsy_result: 'na',
            pathology_notes: '',
            created_at: '2024-01-15T09:25:00Z',
            created_by: 'Alex Johnson',
            photos: [makeLesionPhoto('001-1-2-a', 'clinical')],
          },
        ],
      },
      {
        visit_id: 'v-001-2',
        visit_date: '2024-07-22',
        provider_id: 'dr-001',
        provider_name: 'Dr. Sarah Mitchell',
        ma_id: 'ma-001',
        ma_name: 'Alex Johnson',
        status: 'locked',
        documentation_time_sec: 8,
        created_at: '2024-07-22T10:30:00Z',
        lesions: [
          {
            lesion_id: 'l-001-2-1',
            body_location_x: 80,
            body_location_y: 140,
            body_region: 'chest',
            body_view: 'anterior',
            size_mm: 4,
            shape: 'irregular',
            color: 'dark_brown',
            border: 'irregular',
            symmetry: 'asymmetric',
            action: 'excision',
            clinical_notes: 'Follow-up post-biopsy. Excision site healing well. 5mm margin clear.',
            biopsy_result: 'benign',
            pathology_notes: 'Excision margins clear. No residual dysplasia.',
            created_at: '2024-07-22T10:40:00Z',
            created_by: 'Alex Johnson',
            photos: [
              makeLesionPhoto('001-2-1-a', 'clinical'),
              makeLesionPhoto('001-2-1-b', 'clinical'),
            ],
          },
        ],
      },
      {
        visit_id: 'v-001-3',
        visit_date: '2026-02-28',
        provider_id: 'dr-001',
        provider_name: 'Dr. Sarah Mitchell',
        ma_id: 'ma-001',
        ma_name: 'Alex Johnson',
        status: 'pending_review',
        documentation_time_sec: 9,
        created_at: '2026-02-28T14:00:00Z',
        lesions: [
          {
            lesion_id: 'l-001-3-1',
            body_location_x: 40,
            body_location_y: 120,
            body_region: 'left_shoulder',
            body_view: 'anterior',
            size_mm: 5,
            shape: 'oval',
            color: 'brown',
            border: 'irregular',
            symmetry: 'asymmetric',
            action: 'biopsy_scheduled',
            clinical_notes: 'New pigmented lesion. Dermoscopy: atypical network. Schedule biopsy.',
            biopsy_result: 'pending',
            pathology_notes: '',
            created_at: '2026-02-28T14:10:00Z',
            created_by: 'Alex Johnson',
            photos: [
              makeLesionPhoto('001-3-1-a', 'clinical'),
              makeLesionPhoto('001-3-1-b', 'dermoscopic'),
            ],
            isNew: true,
          },
        ],
      },
    ],
  },
  {
    patient_id: 'pt-002',
    first_name: 'Robert',
    last_name: 'Williams',
    date_of_birth: '1955-09-03',
    mrn: 'MRN-103847',
    gender: 'male',
    skin_type: 'II',
    created_at: '2023-03-22T09:00:00Z',
    visits: [
      {
        visit_id: 'v-002-1',
        visit_date: '2026-02-15',
        provider_id: 'dr-002',
        provider_name: 'Dr. James Park',
        ma_id: 'ma-002',
        ma_name: 'Maria Santos',
        status: 'locked',
        documentation_time_sec: 12,
        created_at: '2026-02-15T11:00:00Z',
        lesions: [
          {
            lesion_id: 'l-002-1-1',
            body_location_x: 160,
            body_location_y: 120,
            body_region: 'right_shoulder',
            body_view: 'posterior',
            size_mm: 8,
            shape: 'irregular',
            color: 'multicolored',
            border: 'irregular',
            symmetry: 'asymmetric',
            action: 'biopsy_performed',
            clinical_notes: 'Highly suspicious. Multiple ABCDE criteria. Urgent biopsy.',
            biopsy_result: 'malignant',
            pathology_notes: 'Melanoma in situ, 0.45mm Breslow depth. Refer to surgical oncology.',
            created_at: '2024-11-05T11:15:00Z',
            created_by: 'Maria Santos',
            photos: [
              makeLesionPhoto('002-1-1-a', 'clinical'),
              makeLesionPhoto('002-1-1-b', 'dermoscopic'),
            ],
          },
          {
            lesion_id: 'l-002-1-2',
            body_location_x: 130,
            body_location_y: 120,
            body_region: 'upper_back',
            body_view: 'posterior',
            size_mm: 2,
            shape: 'round',
            color: 'tan',
            border: 'regular',
            symmetry: 'symmetric',
            action: 'monitor',
            clinical_notes: 'Benign seborrheic keratosis. Monitor.',
            biopsy_result: 'benign',
            pathology_notes: '',
            created_at: '2024-11-05T11:30:00Z',
            created_by: 'Maria Santos',
            photos: [makeLesionPhoto('002-1-2-a', 'clinical')],
          },
        ],
      },
    ],
  },
  {
    patient_id: 'pt-003',
    first_name: 'Elena',
    last_name: 'Rodriguez',
    date_of_birth: '1989-12-07',
    mrn: 'MRN-301256',
    gender: 'female',
    skin_type: 'IV',
    created_at: '2024-02-14T09:00:00Z',
    visits: [
      {
        visit_id: 'v-003-1',
        visit_date: '2026-01-20',
        provider_id: 'dr-001',
        provider_name: 'Dr. Sarah Mitchell',
        ma_id: 'ma-002',
        ma_name: 'Maria Santos',
        status: 'locked',
        documentation_time_sec: 7,
        created_at: '2026-01-20T09:00:00Z',
        lesions: [
          {
            lesion_id: 'l-003-1-1',
            body_location_x: 100,
            body_location_y: 50,
            body_region: 'face',
            body_view: 'anterior',
            size_mm: 3,
            shape: 'round',
            color: 'brown',
            border: 'regular',
            symmetry: 'symmetric',
            action: 'monitor',
            clinical_notes: 'Benign dermal nevus. No intervention required.',
            biopsy_result: 'na',
            pathology_notes: '',
            created_at: '2024-02-14T09:10:00Z',
            created_by: 'Maria Santos',
            photos: [makeLesionPhoto('003-1-1-a', 'clinical')],
          },
        ],
      },
    ],
  },
  {
    patient_id: 'pt-004',
    first_name: 'David',
    last_name: 'Kim',
    date_of_birth: '1948-06-20',
    mrn: 'MRN-402183',
    gender: 'male',
    skin_type: 'III',
    created_at: '2021-06-01T09:00:00Z',
    visits: [
      {
        visit_id: 'v-004-1',
        visit_date: '2023-06-10',
        provider_id: 'dr-002',
        provider_name: 'Dr. James Park',
        ma_id: 'ma-001',
        ma_name: 'Alex Johnson',
        status: 'locked',
        documentation_time_sec: 8,
        created_at: '2023-06-10T09:00:00Z',
        lesions: [
          {
            lesion_id: 'l-004-1-1',
            body_location_x: 100,
            body_location_y: 200,
            body_region: 'abdomen',
            body_view: 'anterior',
            size_mm: 4,
            shape: 'oval',
            color: 'pink',
            border: 'regular',
            symmetry: 'symmetric',
            action: 'monitor',
            clinical_notes: 'Dermatofibroma. Benign. Monitor for size change.',
            biopsy_result: 'benign',
            pathology_notes: '',
            created_at: '2023-06-10T09:15:00Z',
            created_by: 'Alex Johnson',
            photos: [makeLesionPhoto('004-1-1-a', 'clinical')],
          },
        ],
      },
      {
        visit_id: 'v-004-2',
        visit_date: '2026-02-10',
        provider_id: 'dr-002',
        provider_name: 'Dr. James Park',
        ma_id: 'ma-001',
        ma_name: 'Alex Johnson',
        status: 'locked',
        documentation_time_sec: 9,
        created_at: '2026-02-10T10:00:00Z',
        lesions: [
          {
            lesion_id: 'l-004-2-1',
            body_location_x: 100,
            body_location_y: 200,
            body_region: 'abdomen',
            body_view: 'anterior',
            size_mm: 5,
            shape: 'oval',
            color: 'pink',
            border: 'regular',
            symmetry: 'symmetric',
            action: 'monitor',
            clinical_notes: 'Slight increase in size from prior visit (4mm → 5mm). Continue monitoring.',
            biopsy_result: 'benign',
            pathology_notes: '',
            created_at: '2024-06-15T10:10:00Z',
            created_by: 'Alex Johnson',
            photos: [
              makeLesionPhoto('004-2-1-a', 'clinical'),
              makeLesionPhoto('004-2-1-b', 'dermoscopic'),
            ],
          },
        ],
      },
    ],
  },
  {
    patient_id: 'pt-005',
    first_name: 'Sarah',
    last_name: 'Thompson',
    date_of_birth: '1978-03-25',
    mrn: 'MRN-501934',
    gender: 'female',
    skin_type: 'I',
    created_at: '2022-09-15T09:00:00Z',
    visits: [
      {
        visit_id: 'v-005-1',
        visit_date: '2026-03-05',
        provider_id: 'dr-001',
        provider_name: 'Dr. Sarah Mitchell',
        ma_id: 'ma-002',
        ma_name: 'Maria Santos',
        status: 'pending_review',
        documentation_time_sec: 10,
        created_at: '2026-03-05T13:00:00Z',
        lesions: [
          {
            lesion_id: 'l-005-1-1',
            body_location_x: 38,
            body_location_y: 160,
            body_region: 'left_upper_arm',
            body_view: 'anterior',
            size_mm: 7,
            shape: 'irregular',
            color: 'multicolored',
            border: 'irregular',
            symmetry: 'asymmetric',
            action: 'biopsy_scheduled',
            clinical_notes: 'New lesion with concerning features. ABCDE positive on 4/5 criteria.',
            biopsy_result: 'pending',
            pathology_notes: '',
            created_at: '2024-12-03T13:10:00Z',
            created_by: 'Maria Santos',
            photos: [
              makeLesionPhoto('005-1-1-a', 'clinical'),
              makeLesionPhoto('005-1-1-b', 'dermoscopic'),
            ],
            isNew: true,
          },
          {
            lesion_id: 'l-005-1-2',
            body_location_x: 71,
            body_location_y: 430,
            body_region: 'left_lower_leg',
            body_view: 'anterior',
            size_mm: 2,
            shape: 'round',
            color: 'tan',
            border: 'regular',
            symmetry: 'symmetric',
            action: 'monitor',
            clinical_notes: 'Solar lentigo. Benign.',
            biopsy_result: 'na',
            pathology_notes: '',
            created_at: '2024-12-03T13:20:00Z',
            created_by: 'Maria Santos',
            photos: [makeLesionPhoto('005-1-2-a', 'clinical')],
            isNew: true,
          },
        ],
      },
    ],
  },
  // Additional patients for realism
  {
    patient_id: 'pt-006',
    first_name: 'James',
    last_name: 'Patel',
    date_of_birth: '1970-11-14',
    mrn: 'MRN-601748',
    gender: 'male',
    skin_type: 'V',
    created_at: '2023-11-01T09:00:00Z',
    visits: [
      {
        visit_id: 'v-006-1',
        visit_date: '2026-03-10',
        provider_id: 'dr-002',
        provider_name: 'Dr. James Park',
        ma_id: 'ma-001',
        ma_name: 'Alex Johnson',
        status: 'in_progress',
        documentation_time_sec: 5,
        created_at: '2026-03-10T08:30:00Z',
        lesions: [],
      },
    ],
  },
  {
    patient_id: 'pt-007',
    first_name: 'Linda',
    last_name: 'Okonkwo',
    date_of_birth: '1965-07-30',
    mrn: 'MRN-702937',
    gender: 'female',
    skin_type: 'VI',
    created_at: '2024-05-20T09:00:00Z',
    visits: [
      {
        visit_id: 'v-007-1',
        visit_date: '2026-03-09',
        provider_id: 'dr-001',
        provider_name: 'Dr. Sarah Mitchell',
        ma_id: 'ma-002',
        ma_name: 'Maria Santos',
        status: 'pending_review',
        documentation_time_sec: 7,
        created_at: '2026-03-09T09:00:00Z',
        lesions: [
          {
            lesion_id: 'l-007-1-1',
            body_location_x: 100,
            body_location_y: 93,
            body_region: 'neck',
            body_view: 'anterior',
            size_mm: 4,
            shape: 'oval',
            color: 'dark_brown',
            border: 'regular',
            symmetry: 'symmetric',
            action: 'monitor',
            clinical_notes: 'Dermal nevus. Benign appearance.',
            biopsy_result: 'na',
            pathology_notes: '',
            created_at: '2025-01-07T09:10:00Z',
            created_by: 'Maria Santos',
            photos: [makeLesionPhoto('007-1-1-a', 'clinical')],
            isNew: true,
          },
        ],
      },
    ],
  },
];

export const AUDIT_LOG: AuditLogEntry[] = [
  {
    log_id: 'log-001',
    timestamp: '2026-03-10T14:02:11Z',
    user_id: 'ma-001',
    user_name: 'Alex Johnson',
    user_role: 'ma',
    action_type: 'login',
    resource_type: 'user',
    resource_id: 'ma-001',
    details: 'Successful login from device iPad-Exam-Room-3',
    ip_address: '192.168.1.45',
    device_id: 'iPad-Exam-Room-3',
  },
  {
    log_id: 'log-002',
    timestamp: '2026-03-10T14:05:33Z',
    user_id: 'ma-001',
    user_name: 'Alex Johnson',
    user_role: 'ma',
    action_type: 'read',
    resource_type: 'patient',
    resource_id: 'pt-001',
    details: 'Viewed patient record: Margaret Chen (MRN-204819)',
    ip_address: '192.168.1.45',
    device_id: 'iPad-Exam-Room-3',
  },
  {
    log_id: 'log-003',
    timestamp: '2026-03-10T14:06:12Z',
    user_id: 'ma-001',
    user_name: 'Alex Johnson',
    user_role: 'ma',
    action_type: 'create',
    resource_type: 'lesion',
    resource_id: 'l-001-3-1',
    details: 'Created lesion marker on left shoulder for patient pt-001',
    ip_address: '192.168.1.45',
    device_id: 'iPad-Exam-Room-3',
  },
  {
    log_id: 'log-004',
    timestamp: '2026-03-10T14:06:45Z',
    user_id: 'ma-001',
    user_name: 'Alex Johnson',
    user_role: 'ma',
    action_type: 'create',
    resource_type: 'photo',
    resource_id: 'ph-001-3-1-a',
    details: 'Captured clinical photo for lesion l-001-3-1',
    ip_address: '192.168.1.45',
    device_id: 'iPad-Exam-Room-3',
  },
  {
    log_id: 'log-005',
    timestamp: '2026-03-10T14:18:22Z',
    user_id: 'dr-001',
    user_name: 'Dr. Sarah Mitchell',
    user_role: 'provider',
    action_type: 'read',
    resource_type: 'visit',
    resource_id: 'v-001-3',
    details: 'Reviewed visit v-001-3 for patient Margaret Chen',
    ip_address: '10.0.0.12',
    device_id: 'Workstation-Provider-1',
  },
  {
    log_id: 'log-006',
    timestamp: '2026-03-10T14:22:05Z',
    user_id: 'dr-001',
    user_name: 'Dr. Sarah Mitchell',
    user_role: 'provider',
    action_type: 'update',
    resource_type: 'lesion',
    resource_id: 'l-001-3-1',
    details: 'Updated clinical notes and action for lesion l-001-3-1',
    ip_address: '10.0.0.12',
    device_id: 'Workstation-Provider-1',
  },
  {
    log_id: 'log-007',
    timestamp: '2026-03-10T14:35:00Z',
    user_id: 'admin-001',
    user_name: 'Practice Manager Taylor',
    user_role: 'admin',
    action_type: 'export',
    resource_type: 'visit',
    resource_id: 'v-001-3',
    details: 'Exported visit summary PDF for visit v-001-3',
    ip_address: '10.0.0.5',
    device_id: 'Admin-Workstation',
  },
  {
    log_id: 'log-008',
    timestamp: '2026-03-10T15:01:44Z',
    user_id: 'ma-002',
    user_name: 'Maria Santos',
    user_role: 'ma',
    action_type: 'create',
    resource_type: 'visit',
    resource_id: 'v-007-1',
    details: 'Started new visit for patient Linda Okonkwo (MRN-702937)',
    ip_address: '192.168.1.52',
    device_id: 'iPad-Exam-Room-1',
  },
  {
    log_id: 'log-009',
    timestamp: '2026-03-09T08:00:00Z',
    user_id: 'admin-001',
    user_name: 'Practice Manager Taylor',
    user_role: 'admin',
    action_type: 'create',
    resource_type: 'user',
    resource_id: 'ma-003',
    details: 'Created new user account for MA: Casey Rivera',
    ip_address: '10.0.0.5',
    device_id: 'Admin-Workstation',
  },
  {
    log_id: 'log-010',
    timestamp: '2026-03-09T17:45:00Z',
    user_id: 'dr-002',
    user_name: 'Dr. James Park',
    user_role: 'provider',
    action_type: 'update',
    resource_type: 'visit',
    resource_id: 'v-007-1',
    details: 'Signed and locked visit record v-007-1',
    ip_address: '10.0.0.14',
    device_id: 'Workstation-Provider-2',
  },
];

export const CLINIC_STATS: ClinicStats = {
  total_visits: 2847,
  avg_documentation_time_sec: 7.8,
  total_photos: 11432,
  avg_lesions_per_visit: 4.1,
  visits_by_day: [
    { date: 'Jul', count: 312 },
    { date: 'Aug', count: 428 },
    { date: 'Sep', count: 391 },
    { date: 'Oct', count: 445 },
    { date: 'Nov', count: 410 },
    { date: 'Dec', count: 378 },
    { date: 'Jan', count: 483 },
  ],
  provider_adoption: [
    { name: 'Dr. Mitchell', visits: 1204, photos: 5203 },
    { name: 'Dr. Park', visits: 987, photos: 4102 },
    { name: 'Dr. Osei', visits: 656, photos: 2127 },
  ],
  lesion_outcomes: [
    { status: 'Monitoring', count: 7843 },
    { status: 'Biopsied - Benign', count: 2107 },
    { status: 'Biopsied - Atypical', count: 412 },
    { status: 'Biopsied - Malignant', count: 87 },
    { status: 'Excised', count: 499 },
    { status: 'Referral', count: 142 },
  ],
};

export const DEMO_USERS = [
  {
    id: 'ma-001',
    name: 'Alex Johnson',
    role: 'ma' as const,
    email: 'alex.ma@dermmap.com',
    credentials: 'CMA',
    description: 'Medical Assistant — Exam Room View',
    subtitle: 'Document lesions, capture photos, complete visits',
  },
  {
    id: 'dr-001',
    name: 'Dr. Sarah Mitchell',
    role: 'provider' as const,
    email: 'sarah.dr@dermmap.com',
    credentials: 'MD, FAAD',
    description: 'Dermatologist — Clinical Review View',
    subtitle: 'Review visits, compare lesion photos, sign off records',
  },
  {
    id: 'mgr-001',
    name: 'Taylor Brooks',
    role: 'manager' as const,
    email: 'taylor.mgr@dermmap.com',
    credentials: 'Practice Manager',
    description: 'Practice Manager — Operations View',
    subtitle: 'Analytics, user management, audit logs, settings',
  },
];

// ─── Programmatic patient generator (fills the roster to 75) ────────────────

const FIRST_NAMES_F = ['Patricia', 'Barbara', 'Linda', 'Susan', 'Nancy', 'Karen', 'Betty', 'Helen',
  'Sandra', 'Donna', 'Carol', 'Ruth', 'Sharon', 'Michelle', 'Laura', 'Sarah', 'Kimberly', 'Deborah',
  'Jessica', 'Shirley', 'Cynthia', 'Angela', 'Melissa', 'Brenda', 'Amy', 'Anna', 'Rebecca', 'Virginia',
  'Kathleen', 'Pamela', 'Martha', 'Debra', 'Amanda'];

const FIRST_NAMES_M = ['James', 'John', 'Robert', 'Michael', 'William', 'David', 'Richard', 'Joseph',
  'Thomas', 'Charles', 'Christopher', 'Daniel', 'Matthew', 'Anthony', 'Mark', 'Donald', 'Steven',
  'Paul', 'Andrew', 'Joshua', 'Kenneth', 'Kevin', 'Brian', 'George', 'Timothy', 'Ronald', 'Edward',
  'Jason', 'Jeffrey', 'Ryan', 'Jacob', 'Gary', 'Nicholas'];

const LAST_NAMES = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis',
  'Wilson', 'Anderson', 'Taylor', 'Thomas', 'Jackson', 'White', 'Harris', 'Martin', 'Thompson',
  'Moore', 'Young', 'Allen', 'King', 'Wright', 'Scott', 'Torres', 'Nguyen', 'Hill', 'Flores',
  'Green', 'Adams', 'Nelson', 'Baker', 'Hall', 'Rivera', 'Campbell', 'Mitchell', 'Carter', 'Roberts'];

const SKIN_TYPES = ['I', 'II', 'III', 'IV', 'V', 'VI'] as const;
const BODY_REGIONS_ANT = ['face', 'chest', 'abdomen', 'left_upper_arm', 'right_upper_arm', 'left_forearm', 'right_forearm'] as const;
const BODY_REGIONS_POST = ['upper_back', 'lower_back', 'left_shoulder', 'right_shoulder', 'left_thigh', 'right_thigh'] as const;
const ACTIONS = ['monitor', 'biopsy_scheduled', 'biopsy_performed', 'excision', 'monitor', 'monitor'] as const;
const BIOPSY_RESULTS = ['na', 'na', 'benign', 'atypical', 'benign', 'na'] as const;
const COLORS_LIST = ['tan', 'brown', 'dark_brown', 'pink', 'multicolored', 'red'] as const;
const NOTES_BANK = [
  'Benign-appearing compound nevus. Monitor at next annual visit.',
  'Dysplastic nevus with mild atypia. Excision recommended per guidelines.',
  'Seborrheic keratosis. Benign. No intervention required.',
  'Atypical lesion — ABCDE criteria partially met. Biopsy scheduled.',
  'Actinic keratosis, treated with liquid nitrogen. Follow-up in 3 months.',
  'Basal cell carcinoma. Mohs referral placed.',
  'Dermatofibroma. Benign. Patient educated on self-exam.',
  'Solar lentigo. Sun protection counseling provided.',
  'Squamous cell carcinoma in situ (Bowen\'s disease). Excision performed.',
  'Intradermal nevus. Stable over 2 visits. Continue monitoring.',
  'Blue nevus. Symmetric, well-circumscribed. Benign features.',
  'Post-inflammatory hyperpigmentation. No intervention.',
];

// Seeded pseudo-random to keep data stable across hot-reloads
function seededRand(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    return (s >>> 0) / 0xffffffff;
  };
}

function pickFrom<T>(arr: readonly T[], rng: () => number): T {
  return arr[Math.floor(rng() * arr.length)];
}

function genMRN(n: number): string {
  return `MRN-${600000 + n * 1171}`;
}

function genDOB(rng: () => number): string {
  const year = 1945 + Math.floor(rng() * 55);
  const month = String(1 + Math.floor(rng() * 12)).padStart(2, '0');
  const day = String(1 + Math.floor(rng() * 28)).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function genVisitDate(rng: () => number, yearsAgo: number): string {
  const base = new Date('2026-03-10');
  base.setFullYear(base.getFullYear() - yearsAgo);
  base.setMonth(Math.floor(rng() * 12));
  base.setDate(1 + Math.floor(rng() * 27));
  return base.toISOString().split('T')[0];
}

// Recent date within last 60 days of 2026-03-10
function genRecentDate(rng: () => number): string {
  const daysAgo = 5 + Math.floor(rng() * 55);
  const d = new Date('2026-03-10');
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString().split('T')[0];
}

function genLesion(visitId: string, lesionIdx: number, rng: () => number) {
  const isAnt = rng() > 0.45;
  const region = isAnt ? pickFrom(BODY_REGIONS_ANT, rng) : pickFrom(BODY_REGIONS_POST, rng);
  const action = pickFrom(ACTIONS, rng);
  const biopsy: import('../types').BiopsyResult = (action === 'biopsy_performed' || action === 'excision')
    ? pickFrom(['benign', 'atypical', 'benign', 'malignant'] as const, rng)
    : 'na';
  const x = 60 + Math.floor(rng() * 80);
  const y = 50 + Math.floor(rng() * 360);
  return {
    lesion_id: `${visitId}-l${lesionIdx}`,
    body_location_x: x,
    body_location_y: y,
    body_region: region,
    body_view: (isAnt ? 'anterior' : 'posterior') as 'anterior' | 'posterior',
    size_mm: 2 + Math.round(rng() * 10),
    shape: pickFrom(['round', 'oval', 'irregular', 'other'] as const, rng),
    color: pickFrom(COLORS_LIST, rng),
    border: pickFrom(['regular', 'irregular'] as const, rng),
    symmetry: pickFrom(['symmetric', 'asymmetric'] as const, rng),
    action,
    clinical_notes: pickFrom(NOTES_BANK, rng),
    biopsy_result: biopsy,
    pathology_notes: biopsy === 'atypical' ? 'Mildly dysplastic nevus. Recommend excision with 3 mm margin.' :
      biopsy === 'malignant' ? 'Melanoma in situ. Surgical oncology referral placed.' :
      biopsy === 'benign' ? 'Benign nevus. No further action.' : '',
    created_at: new Date().toISOString(),
    created_by: rng() > 0.5 ? 'Alex Johnson' : 'Maria Santos',
    photos: [makeLesionPhoto(`gen-${visitId}-l${lesionIdx}`, rng() > 0.6 ? 'dermoscopic' : 'clinical')],
  };
}

function generatePatient(n: number): import('../types').Patient {
  const rng = seededRand(n * 31337 + 42);
  const isFemale = rng() > 0.45;
  const firstName = isFemale ? pickFrom(FIRST_NAMES_F, rng) : pickFrom(FIRST_NAMES_M, rng);
  const lastName = pickFrom(LAST_NAMES, rng);
  const skinType = pickFrom(SKIN_TYPES, rng);
  const visitCount = 1 + Math.floor(rng() * 4);
  const providers = ['dr-001', 'dr-002'];
  const providerNames = ['Dr. Sarah Mitchell', 'Dr. James Park'];

  const visits = Array.from({ length: visitCount }, (_, vi) => {
    // Most recent visit is always within the last 60 days so the queue/schedule look current
    const isLatest = vi === visitCount - 1;
    const visitDate = isLatest ? genRecentDate(rng) : genVisitDate(rng, visitCount - vi);
    const visitId = `vg-${n}-${vi}`;
    const lesionCount = 1 + Math.floor(rng() * 5);
    const provIdx = Math.floor(rng() * providers.length);
    const statuses = ['locked', 'locked', 'locked', 'pending_review', 'signed'] as const;
    return {
      visit_id: visitId,
      visit_date: visitDate,
      provider_id: providers[provIdx],
      provider_name: providerNames[provIdx],
      ma_id: rng() > 0.5 ? 'ma-001' : 'ma-002',
      ma_name: rng() > 0.5 ? 'Alex Johnson' : 'Maria Santos',
      status: isLatest ? pickFrom(statuses, rng) : 'locked',
      documentation_time_sec: Math.round(5 + rng() * 12),
      created_at: `${visitDate}T09:00:00Z`,
      lesions: Array.from({ length: lesionCount }, (_, li) => genLesion(visitId, li, rng)),
    };
  });

  return {
    patient_id: `pt-gen-${n}`,
    first_name: firstName,
    last_name: lastName,
    date_of_birth: genDOB(rng),
    mrn: genMRN(n),
    gender: isFemale ? 'female' : 'male',
    skin_type: skinType,
    created_at: `${genVisitDate(rng, 3)}T09:00:00Z`,
    visits,
  };
}

// Generate enough patients to reach a total of 75
const GENERATED_PATIENTS: import('../types').Patient[] = Array.from(
  { length: 68 },
  (_, i) => generatePatient(i + 100),
);

export const ALL_PATIENTS = [...SYNTHETIC_PATIENTS, ...GENERATED_PATIENTS];

// ─── Today's appointments ────────────────────────────────────────────────────

export const TODAY_APPOINTMENTS = [
  { time: '8:00 AM', patient: SYNTHETIC_PATIENTS[5], reason: 'Annual skin check' },
  { time: '8:30 AM', patient: SYNTHETIC_PATIENTS[0], reason: 'Follow-up, shoulder lesion' },
  { time: '9:00 AM', patient: SYNTHETIC_PATIENTS[2], reason: 'Mole mapping' },
  { time: '9:30 AM', patient: SYNTHETIC_PATIENTS[3], reason: 'Follow-up, abdomen' },
  { time: '10:00 AM', patient: SYNTHETIC_PATIENTS[6], reason: 'New patient' },
  { time: '10:30 AM', patient: SYNTHETIC_PATIENTS[4], reason: 'Biopsy follow-up' },
  { time: '11:00 AM', patient: SYNTHETIC_PATIENTS[1], reason: 'Post-excision check' },
];
