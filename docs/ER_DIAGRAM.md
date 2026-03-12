┌──────────────────────────────────────────────────────────────────────────────────┐
│                          DermMap Entity-Relationship Diagram                     │
└──────────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────┐          ┌─────────────────────┐
│   ClinicLocation    │          │        User         │
│─────────────────────│          │─────────────────────│
│ PK location_id      │          │ PK id               │
│    name             │          │    name             │
│    address          │          │    role             │◄─────────────────────────────────┐
│    phone            │          │    email            │     (created_by / user_id refs)  │
│    timezone         │          │    credentials      │                                  │
│    active           │          │ FK location_id      │──────┐                           │
└─────────────────────┘          └─────────────────────┘      │                           │
         ▲                                ▲                   │                           │
         │ location_id                    │ provider_id       │                           │
         │ (optional)                     │ ma_id             │                           │
         │                                │                   │                           │
┌─────────────────────┐          ┌─────────────────────┐      │ belongs to                │
│      Patient        │          │        Visit        │      │                           │
│─────────────────────│          │─────────────────────│      │                           │
│ PK patient_id       │          │ PK visit_id         │      │                           │
│    mrn              │          │    visit_date       │      │                           │
│    first_name       │◄─────────│ FK patient_id (via  │      │                           │
│    last_name        │  1:many  │    nesting)         │──────┘                           │
│    date_of_birth    │          │ FK provider_id      │                                  │
│    gender           │          │ FK ma_id            │                                  │
│    skin_type        │          │    status           │                                  │
│    risk_level       │          │    cpt_codes[]      │                                  │
│ FK location_id      │          │    doc_time_sec     │                                  │
└─────────────────────┘          │    provider_        │                                  │
         │                       │    attestation      │                                  │
         │                       │ FK location_id      │                                  │
         │                       └─────────────────────┘                                  │
         │                                │                                               │
         │                                │ 1:many                                        │
         │                                ▼                                               │
         │                       ┌─────────────────────┐                                  │
         │                       │       Lesion        │                                  │
         │                       │─────────────────────│                                  │
         │                       │ PK lesion_id        │                                  │
         │                       │    body_location_x  │                                  │
         │                       │    body_location_y  │                                  │
         │                       │    body_region      │                                  │
         │                       │    body_view        │                                  │
         │                       │    size_mm          │                                  │
         │                       │    shape            │                                  │
         │                       │    color            │                                  │
         │                       │    border           │                                  │
         │                       │    symmetry         │                                  │
         │                       │    action           │                                  │
         │                       │    biopsy_result    │                                  │
         │                       │    clinical_notes   │                                  │
         │                       │    cpt_codes[]      │                                  │
         │                       │    created_at       │                                  │
         │                       │ FK created_by ──────┼──────────────────────────────────┘
         │                       └─────────────────────┘
         │                                │         │
         │              ┌─────────────────┘         └──────────────────┐
         │              │ 1:many                            1:1 (opt)  │
         │              ▼                                               ▼
         │     ┌─────────────────────┐               ┌─────────────────────────┐
         │     │       Photo         │               │       RiskScore         │
         │     │─────────────────────│               │─────────────────────────│
         │     │ PK photo_id         │               │    total (0-10)         │
         │     │    url              │               │    asymmetry            │
         │     │    capture_type     │               │    border               │
         │     │    captured_at      │               │    color                │
         │     │ FK captured_by ─────┼───► User      │    diameter             │
         │     │    annotations[]    │               │    evolution            │
         │     └─────────────────────┘               │    level                │
         │              │                            │    recommendation       │
         │              │ 0:many                     └─────────────────────────┘
         │              ▼
         │   ┌────────────────────────┐
         │   │  DermoscopyAnnotation  │               ┌─────────────────────────┐
         │   │────────────────────────│               │      LesionChange       │
         │   │    feature             │               │─────────────────────────│
         │   │    x, y                │               │ FK lesion_id            │
         │   │    notes               │               │ FK previous_visit_id    │
         │   └────────────────────────┘               │ FK current_visit_id     │
         │                                            │    size_delta_mm        │
         │                                            │    color_changed        │
         │                                            │    border_changed       │
         │                                            │    overall_concern      │
         │                                            └─────────────────────────┘
         │
         │
┌────────┴─────────────────────────────────────────────────────────────────────────┐
│                             AUDIT / ANALYTICS (no FK constraints)                │
│                                                                                  │
│  ┌──────────────────────┐   ┌──────────────────────┐   ┌──────────────────────┐  │
│  │    AuditLogEntry     │   │ ProviderPerformance  │   │   StaffScorecard     │  │
│  │──────────────────────│   │──────────────────────│   │──────────────────────│  │
│  │ PK log_id            │   │ FK provider_id       │   │ FK user_id           │  │
│  │ FK user_id (soft)    │   │    total_visits      │   │    completeness_pct  │  │
│  │    action_type       │   │    biopsy_yield_pct  │   │    photos_per_lesion │  │
│  │    resource_type     │   │    malignancies_found│   └──────────────────────┘  │
│  │    resource_id       │   └──────────────────────┘                             │
│  │    ip_address        │                                                        │
│  │    device_id         │   ┌──────────────────────┐   ┌──────────────────────┐  │
│  └──────────────────────┘   │   QualityMetrics     │   │   ClinicStats        │  │
│                             │──────────────────────│   │──────────────────────│  │
│                             │    biopsy_yield      │   │    visits_by_day[]   │  │
│                             │    doc_completeness  │   │    provider_adoption │  │
│                             │    follow_up_pct     │   │    lesion_outcomes   │  │
│                             └──────────────────────┘   └──────────────────────┘  │
└──────────────────────────────────────────────────────────────────────────────────┘

Cardinality Key:
  1:many   ──────►   one-to-many (parent ► child)
  ◄─────── FK        foreign key reference
  (opt)              optional / nullable
  (soft)             soft reference (string ID, no enforced FK)
  []                 array / embedded collection
