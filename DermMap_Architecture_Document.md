# DermMap: Technical Architecture Document
## Prototype-to-Production Code Stack & System Design

---

## 1. Architecture Principles

Every decision in this document follows four rules:

1. **Nothing gets thrown away.** The prototype code stack is the production code stack. No "rebuild in a real language later." If it runs in the demo, it runs in production.
2. **HIPAA is structural, not decorative.** Encryption, audit logging, and access control are in the data layer and middleware, not sprinkled on top as an afterthought.
3. **The MA's device is the center of gravity.** Architecture decisions optimize for the mobile exam room experience first. The web dashboard is secondary.
4. **Offline-first, sync-second.** The app must work without internet and resolve conflicts gracefully. Exam rooms have bad WiFi. This is non-negotiable.

---

## 2. High-Level System Overview

```
┌─────────────────────────────────────────────────────────────┐
│                        CLIENT LAYER                         │
│                                                             │
│   ┌──────────────┐    ┌──────────────┐    ┌─────────────┐  │
│   │  iOS App     │    │ Android App  │    │ Web Dashboard│  │
│   │  (React      │    │ (React       │    │ (React SPA)  │  │
│   │   Native)    │    │  Native)     │    │              │  │
│   └──────┬───────┘    └──────┬───────┘    └──────┬───────┘  │
│          │                   │                   │          │
│          └───────────────────┼───────────────────┘          │
│                              │                              │
│                     HTTPS / TLS 1.3                         │
└──────────────────────────────┼──────────────────────────────┘
                               │
┌──────────────────────────────┼──────────────────────────────┐
│                        API GATEWAY                          │
│                   (AWS API Gateway)                         │
│              Rate Limiting / Auth Check                     │
└──────────────────────────────┼──────────────────────────────┘
                               │
┌──────────────────────────────┼──────────────────────────────┐
│                     APPLICATION LAYER                       │
│                                                             │
│   ┌───────────────────────────────────────────────────┐     │
│   │            Node.js / Express API Server            │     │
│   │                  (TypeScript)                      │     │
│   ├───────────────────────────────────────────────────┤     │
│   │                                                   │     │
│   │  ┌─────────┐ ┌──────────┐ ┌────────────────────┐ │     │
│   │  │  Auth   │ │  Audit   │ │  RBAC Middleware    │ │     │
│   │  │Middleware│ │  Logger  │ │  (role check on    │ │     │
│   │  │ (JWT +  │ │ (every   │ │   every route)     │ │     │
│   │  │  MFA)   │ │  request)│ │                    │ │     │
│   │  └─────────┘ └──────────┘ └────────────────────┘ │     │
│   │                                                   │     │
│   │  ┌─────────────────────────────────────────────┐  │     │
│   │  │              Service Layer                   │  │     │
│   │  │                                             │  │     │
│   │  │  PatientService    LesionService            │  │     │
│   │  │  VisitService      PhotoService             │  │     │
│   │  │  UserService       AuditService             │  │     │
│   │  │  ExportService     SyncService              │  │     │
│   │  │  IntegrationService (FHIR stub)             │  │     │
│   │  └─────────────────────────────────────────────┘  │     │
│   └───────────────────────────────────────────────────┘     │
└──────────────────────────────┬──────────────────────────────┘
                               │
┌──────────────────────────────┼──────────────────────────────┐
│                       DATA LAYER                            │
│                                                             │
│   ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐ │
│   │  PostgreSQL  │  │  Amazon S3   │  │  Redis           │ │
│   │  (RDS)       │  │  (Images)    │  │  (Sessions +     │ │
│   │              │  │              │  │   Cache)         │ │
│   │  - Patients  │  │  - Clinical  │  │                  │ │
│   │  - Visits    │  │    photos    │  │  - JWT blacklist │ │
│   │  - Lesions   │  │  - Exports   │  │  - Rate limits   │ │
│   │  - Users     │  │  - PDFs      │  │  - Session state │ │
│   │  - Audit log │  │              │  │                  │ │
│   │              │  │  AES-256     │  │                  │ │
│   │  AES-256     │  │  server-side │  │  Encrypted       │ │
│   │  at rest     │  │  encryption  │  │  in transit      │ │
│   └──────────────┘  └──────────────┘  └──────────────────┘ │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 3. Technology Stack — Detailed Selections & Rationale

### 3.1 Mobile App: React Native (TypeScript)

**Selection: React Native with Expo (managed workflow for prototype, eject to bare workflow for production camera/dermoscopy features)**

Why React Native over native Swift/Kotlin:
- Single codebase for iOS and Android — critical for a startup with limited engineering resources
- TypeScript across the entire stack (mobile, API, web) means one language for the whole team
- React Native's camera libraries (react-native-camera, expo-camera) are mature enough for clinical photo capture
- The body map interaction (tap coordinates on an SVG) works excellently in React Native via react-native-svg
- Expo provides over-the-air updates — you can push fixes to demo devices without App Store review cycles

Why not Flutter: smaller ecosystem for healthcare libraries, Dart adds a second language to the stack, fewer healthcare-specific open source packages.

Why not pure native: doubles your engineering cost for the same features. You can always extract performance-critical components (camera, image processing) to native modules later.

**Key Libraries:**
```
react-native (0.74+)             — Core framework
expo (~52)                       — Managed workflow, OTA updates
expo-camera                      — Photo capture
expo-local-authentication        — Biometric unlock (Face ID / fingerprint)
expo-secure-store                — Encrypted on-device key storage
react-native-svg                 — Body map rendering and interaction
react-native-reanimated          — Smooth animations (marker placement, transitions)
react-native-gesture-handler     — Pinch-to-zoom on body map
@react-navigation/native         — Screen navigation
react-native-mmkv                — Fast encrypted local storage (offline data)
watermelondb                     — Offline-first local database with sync
@tanstack/react-query            — Server state management and caching
react-native-pdf-lib             — Client-side PDF generation (offline export)
react-native-image-resizer       — Photo compression before upload
```

**Offline-First Architecture (WatermelonDB):**

This is the most critical architectural decision for the mobile app. WatermelonDB provides:
- A local SQLite database on the device that mirrors the server schema
- Lazy loading — only loads records as needed, so performance stays fast even with thousands of lesion records
- Built-in sync protocol — defines a pull/push contract with your API
- Encrypted at rest via SQLCipher integration

```
┌─────────────────────────────────────────────┐
│              Mobile App                      │
│                                              │
│  ┌────────────────┐  ┌───────────────────┐  │
│  │  React Native  │  │  WatermelonDB     │  │
│  │  UI Layer      │──│  (Local SQLite)   │  │
│  │                │  │                   │  │
│  │  Body Map      │  │  patients (local) │  │
│  │  Camera        │  │  visits (local)   │  │
│  │  Forms         │  │  lesions (local)  │  │
│  │  Timeline      │  │  photos (refs)    │  │
│  └────────────────┘  └────────┬──────────┘  │
│                               │              │
│                     ┌─────────▼──────────┐  │
│                     │   Sync Engine      │  │
│                     │                    │  │
│                     │  - Pull changes    │  │
│                     │    from server     │  │
│                     │  - Push local      │  │
│                     │    changes up      │  │
│                     │  - Conflict        │  │
│                     │    resolution      │  │
│                     │  - Queue photos    │  │
│                     │    for upload      │  │
│                     └────────────────────┘  │
└─────────────────────────────────────────────┘
```

**Photo Pipeline (on-device):**
```
Camera Capture
    │
    ▼
Strip EXIF/GPS data (expo-image-manipulator)
    │
    ▼
Resize to clinical standard (max 4096x4096, maintain aspect ratio)
    │
    ▼
Compress JPEG (quality 85 — balances file size with diagnostic clarity)
    │
    ▼
Generate thumbnail (512x512) for timeline/grid views
    │
    ▼
Encrypt and write to app sandbox (temporary)
    │
    ▼
Queue for upload to S3 (via sync engine)
    │
    ▼
Delete local copy after confirmed server receipt
```

### 3.2 Web Dashboard: React (TypeScript) with Next.js

**Selection: Next.js 14+ (App Router) with server-side rendering**

Why Next.js:
- Same React component patterns as the mobile app — shared UI logic where possible
- Server-side rendering means the dashboard loads fast even with large patient datasets
- API routes can proxy requests to the backend, simplifying CORS and auth handling
- Vercel deployment for the prototype (migrate to self-hosted on AWS for production HIPAA compliance)
- Built-in image optimization for rendering clinical photos at appropriate sizes

**Key Libraries:**
```
next (14+)                       — Framework
react                            — UI
tailwindcss                      — Styling (utility-first, fast iteration)
shadcn/ui                        — Component library (accessible, customizable)
@tanstack/react-query            — Server state (same patterns as mobile)
recharts                         — Analytics charts (usage dashboard)
react-pdf (@react-pdf/renderer)  — Server-side PDF generation
zustand                          — Lightweight client state management
zod                              — Runtime type validation (shared with API)
```

**Dashboard Page Structure:**
```
/login                           — Auth screen
/dashboard                       — Practice manager overview
/patients                        — Patient search and list
/patients/[id]                   — Patient lesion map (full body view)
/patients/[id]/visits/[visitId]  — Visit detail with lesion documentation
/patients/[id]/lesions/[lesionId]— Lesion timeline and comparison tools
/queue                           — Provider review queue (pending visits)
/admin/users                     — User management
/admin/audit                     — Audit log viewer
/admin/settings                  — Clinic configuration
/admin/analytics                 — Usage metrics
/export/[visitId]                — PDF preview and generation
/integrations                    — EHR connection settings (stub for demo)
```

### 3.3 API Server: Node.js / Express (TypeScript)

**Selection: Express.js on Node.js 20 LTS, written entirely in TypeScript**

Why Express over Fastify/Hono/NestJS:
- Express is the most battle-tested Node.js framework for healthcare — more security audits, more middleware options, more developers who know it
- NestJS adds unnecessary abstraction overhead for a small team — Express with well-organized service layers gives you the same structure without the framework lock-in
- TypeScript gives you type safety across the full stack (mobile ↔ API ↔ web)

Why Node.js over Python/Go/Java:
- TypeScript everywhere = one language for the entire engineering team
- Excellent library ecosystem for FHIR (fhir.js), PDF generation, image processing
- Fast enough for this workload (the bottleneck is S3 uploads, not compute)
- When you hire, full-stack TypeScript developers are easier to find than Go or Java healthcare specialists

**API Structure (folder layout):**
```
src/
├── server.ts                    — Entry point, Express app config
├── config/
│   ├── database.ts              — PostgreSQL connection (via Prisma)
│   ├── redis.ts                 — Redis connection
│   ├── s3.ts                    — S3 client config
│   └── env.ts                   — Environment variable validation (zod)
├── middleware/
│   ├── auth.ts                  — JWT verification + session check
│   ├── rbac.ts                  — Role-based access control
│   ├── audit.ts                 — Automatic audit log on every request
│   ├── rateLimiter.ts           — Rate limiting (Redis-backed)
│   ├── encryption.ts            — Field-level encryption/decryption
│   ├── errorHandler.ts          — Global error handler (no PHI in errors)
│   └── requestId.ts             — Unique request ID for tracing
├── routes/
│   ├── auth.routes.ts           — Login, logout, MFA, refresh token
│   ├── patient.routes.ts        — CRUD patients
│   ├── visit.routes.ts          — CRUD visits, status transitions
│   ├── lesion.routes.ts         — CRUD lesions, body map coordinates
│   ├── photo.routes.ts          — Upload, retrieve, delete (presigned URLs)
│   ├── export.routes.ts         — PDF generation, download
│   ├── user.routes.ts           — User management (admin)
│   ├── audit.routes.ts          — Audit log queries (admin)
│   ├── sync.routes.ts           — Mobile offline sync endpoints
│   ├── analytics.routes.ts      — Usage metrics (admin)
│   └── integration.routes.ts    — FHIR stub endpoints
├── services/
│   ├── patient.service.ts
│   ├── visit.service.ts
│   ├── lesion.service.ts
│   ├── photo.service.ts
│   ├── export.service.ts
│   ├── user.service.ts
│   ├── audit.service.ts
│   ├── sync.service.ts
│   ├── analytics.service.ts
│   └── fhir.service.ts          — FHIR resource mapping (stub)
├── models/                      — Prisma schema + generated types
├── validators/                  — Zod schemas for request validation
├── utils/
│   ├── crypto.ts                — AES-256 field encryption helpers
│   ├── photoProcessor.ts        — Server-side image validation
│   ├── pdfGenerator.ts          — Visit summary PDF builder
│   └── sanitizer.ts             — Input sanitization
└── tests/
    ├── unit/
    ├── integration/
    └── fixtures/                — Synthetic test data
```

**Middleware Chain (every request passes through this in order):**
```
Request
  │
  ▼
requestId        — Assign unique trace ID
  │
  ▼
rateLimiter      — Block excessive requests (Redis counter)
  │
  ▼
auth             — Verify JWT, check session not revoked, check MFA status
  │
  ▼
rbac             — Check user role has permission for this route + action
  │
  ▼
audit            — Log: who, what, when, from where (before processing)
  │
  ▼
Route Handler    — Business logic via service layer
  │
  ▼
audit            — Log: outcome (after processing)
  │
  ▼
encryption       — Encrypt any PHI fields in the response
  │
  ▼
Response
```

### 3.4 Database: PostgreSQL 16 (via Amazon RDS)

**Selection: PostgreSQL with Prisma ORM**

Why PostgreSQL:
- Best open-source relational database for healthcare workloads — ACID compliance, row-level security, JSON support for flexible fields
- Amazon RDS for PostgreSQL offers HIPAA-eligible managed hosting with automated backups, encryption at rest, and point-in-time recovery
- Prisma ORM gives you type-safe database queries that match your TypeScript models exactly — no runtime type mismatches between your API and your data

Why not MongoDB/DynamoDB:
- Relational data is relational. Patients have visits, visits have lesions, lesions have photos. This is a textbook relational schema.
- PostgreSQL's JSONB columns give you document-style flexibility where needed (clinical notes, custom fields) without sacrificing relational integrity
- Healthcare auditors expect relational databases with foreign keys and constraints — it's easier to demonstrate data integrity

**Schema (Prisma format):**
```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ──────────────────────────────────────────
// User & Authentication
// ──────────────────────────────────────────

model User {
  id              String    @id @default(uuid())
  email           String    @unique
  passwordHash    String
  firstName       String    @db.VarChar(255)   // encrypted at app layer
  lastName        String    @db.VarChar(255)   // encrypted at app layer
  role            UserRole
  clinicId        String
  clinic          Clinic    @relation(fields: [clinicId], references: [id])
  mfaSecret       String?                      // encrypted
  mfaEnabled      Boolean   @default(false)
  isActive        Boolean   @default(true)
  lastLoginAt     DateTime?
  failedAttempts  Int       @default(0)
  lockedUntil     DateTime?
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt

  // Relations
  visitsAsProvider   Visit[]     @relation("VisitProvider")
  visitsAsMA         Visit[]     @relation("VisitMA")
  auditLogs          AuditLog[]
  createdLesions     Lesion[]
  capturedPhotos     Photo[]

  @@index([clinicId])
  @@index([email])
}

enum UserRole {
  MEDICAL_ASSISTANT
  PROVIDER
  ADMIN
}

model Clinic {
  id              String    @id @default(uuid())
  name            String
  address         String?
  phone           String?
  logoUrl         String?
  timezone        String    @default("America/New_York")
  settings        Json      @default("{}")     // clinic-level config
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt

  users           User[]
  patients        Patient[]
}

// ──────────────────────────────────────────
// Clinical Data
// ──────────────────────────────────────────

model Patient {
  id              String    @id @default(uuid())
  mrn             String                       // encrypted at app layer
  firstName       String    @db.VarChar(255)   // encrypted
  lastName        String    @db.VarChar(255)   // encrypted
  dateOfBirth     String                       // encrypted (stored as string)
  gender          Gender
  skinType        SkinType?
  clinicId        String
  clinic          Clinic    @relation(fields: [clinicId], references: [id])
  isActive        Boolean   @default(true)
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt

  visits          Visit[]

  @@index([clinicId])
  @@index([mrn])
}

enum Gender {
  MALE
  FEMALE
  OTHER
}

enum SkinType {
  TYPE_I
  TYPE_II
  TYPE_III
  TYPE_IV
  TYPE_V
  TYPE_VI
}

model Visit {
  id              String      @id @default(uuid())
  patientId       String
  patient         Patient     @relation(fields: [patientId], references: [id])
  providerId      String?
  provider        User?       @relation("VisitProvider", fields: [providerId], references: [id])
  maId            String?
  ma              User?       @relation("VisitMA", fields: [maId], references: [id])
  visitDate       DateTime    @default(now())
  status          VisitStatus @default(IN_PROGRESS)
  clinicalNotes   String?                      // encrypted, provider only
  signedAt        DateTime?
  signedBy        String?
  createdAt       DateTime    @default(now())
  updatedAt       DateTime    @updatedAt

  lesions         Lesion[]

  @@index([patientId])
  @@index([providerId])
  @@index([visitDate])
  @@index([status])
}

enum VisitStatus {
  IN_PROGRESS
  PENDING_REVIEW
  SIGNED
  LOCKED
  AMENDED
}

model Lesion {
  id              String       @id @default(uuid())
  visitId         String
  visit           Visit        @relation(fields: [visitId], references: [id])
  bodyLocationX   Float        // 0-1 normalized coordinate on body map
  bodyLocationY   Float        // 0-1 normalized coordinate on body map
  bodyRegion      BodyRegion
  bodyView        BodyView
  sizeMm          Float?
  shape           LesionShape?
  color           LesionColor?
  border          LesionBorder?
  symmetry        LesionSymmetry?
  action          LesionAction  @default(NO_ACTION)
  clinicalNotes   String?                      // encrypted, provider only
  biopsyResult    BiopsyResult  @default(NOT_APPLICABLE)
  pathologyNotes  String?                      // encrypted
  createdById     String
  createdBy       User          @relation(fields: [createdById], references: [id])
  createdAt       DateTime      @default(now())
  updatedAt       DateTime      @updatedAt

  photos          Photo[]

  // For tracking the same lesion across visits
  linkedLesionId  String?      // points to the "original" lesion from first visit
  linkedLesion    Lesion?      @relation("LesionHistory", fields: [linkedLesionId], references: [id])
  linkedFromLesions Lesion[]   @relation("LesionHistory")

  @@index([visitId])
  @@index([linkedLesionId])
  @@index([bodyRegion])
}

enum BodyRegion {
  HEAD_FACE
  HEAD_SCALP
  NECK
  CHEST
  ABDOMEN
  UPPER_BACK
  LOWER_BACK
  LEFT_SHOULDER
  RIGHT_SHOULDER
  LEFT_UPPER_ARM
  RIGHT_UPPER_ARM
  LEFT_FOREARM
  RIGHT_FOREARM
  LEFT_HAND
  RIGHT_HAND
  LEFT_UPPER_LEG
  RIGHT_UPPER_LEG
  LEFT_LOWER_LEG
  RIGHT_LOWER_LEG
  LEFT_FOOT
  RIGHT_FOOT
  GROIN
  BUTTOCKS
}

enum BodyView {
  ANTERIOR
  POSTERIOR
  LATERAL_LEFT
  LATERAL_RIGHT
  DETAIL_HEAD
  DETAIL_HANDS
  DETAIL_FEET
}

enum LesionShape    { ROUND  OVAL  IRREGULAR  OTHER }
enum LesionColor    { TAN  BROWN  DARK_BROWN  BLACK  RED  PINK  MULTICOLORED }
enum LesionBorder   { REGULAR  IRREGULAR  NOT_ASSESSED }
enum LesionSymmetry { SYMMETRIC  ASYMMETRIC  NOT_ASSESSED }
enum LesionAction   { MONITOR  BIOPSY_SCHEDULED  BIOPSY_PERFORMED  EXCISION  REFERRAL  NO_ACTION }
enum BiopsyResult   { BENIGN  ATYPICAL  MALIGNANT  PENDING  NOT_APPLICABLE }

model Photo {
  id              String      @id @default(uuid())
  lesionId        String
  lesion          Lesion      @relation(fields: [lesionId], references: [id])
  storageKey      String      // S3 object key (not a URL — URL is generated via presigned)
  thumbnailKey    String      // S3 key for thumbnail version
  captureType     CaptureType @default(CLINICAL)
  widthPx         Int
  heightPx        Int
  fileSizeBytes   Int
  mimeType        String      @default("image/jpeg")
  capturedById    String
  capturedBy      User        @relation(fields: [capturedById], references: [id])
  capturedAt      DateTime    @default(now())
  createdAt       DateTime    @default(now())

  @@index([lesionId])
}

enum CaptureType { CLINICAL  DERMOSCOPIC }

// ──────────────────────────────────────────
// Audit & Compliance
// ──────────────────────────────────────────

model AuditLog {
  id              String      @id @default(uuid())
  timestamp       DateTime    @default(now())
  userId          String
  user            User        @relation(fields: [userId], references: [id])
  userRole        UserRole
  actionType      AuditAction
  resourceType    String      // "patient", "visit", "lesion", "photo", etc.
  resourceId      String?
  details         Json?       // what changed (before/after for updates)
  ipAddress       String?
  deviceId        String?
  requestId       String?     // correlates to the API request trace ID
  success         Boolean     @default(true)

  @@index([userId])
  @@index([timestamp])
  @@index([resourceType, resourceId])
  @@index([actionType])
}

enum AuditAction {
  CREATE
  READ
  UPDATE
  DELETE
  EXPORT
  LOGIN
  LOGOUT
  LOGIN_FAILED
  MFA_VERIFIED
  SESSION_TIMEOUT
  PHOTO_UPLOAD
  PHOTO_VIEW
  VISIT_SIGNED
  VISIT_LOCKED
}

// ──────────────────────────────────────────
// Sync (for offline mobile support)
// ──────────────────────────────────────────

model SyncLog {
  id              String    @id @default(uuid())
  userId          String
  deviceId        String
  syncType        String    // "pull" or "push"
  lastSyncedAt    DateTime
  recordsPulled   Int       @default(0)
  recordsPushed   Int       @default(0)
  conflictsFound  Int       @default(0)
  status          String    // "success", "partial", "failed"
  createdAt       DateTime  @default(now())

  @@index([userId, deviceId])
}
```

### 3.5 Image Storage: Amazon S3

**Selection: S3 with server-side encryption (SSE-S3 or SSE-KMS) + presigned URLs**

Architecture:
```
Mobile App                         API Server                    S3 Bucket
    │                                  │                            │
    │  1. "I want to upload a photo"   │                            │
    │ ──────────────────────────────▶  │                            │
    │                                  │                            │
    │  2. Presigned upload URL         │                            │
    │     (expires in 5 min)           │                            │
    │ ◀──────────────────────────────  │                            │
    │                                  │                            │
    │  3. Upload photo directly ───────┼──────────────────────────▶ │
    │     (never touches API server)   │                            │
    │                                  │                            │
    │  4. "Upload complete"            │                            │
    │ ──────────────────────────────▶  │                            │
    │                                  │  5. Verify object exists   │
    │                                  │ ────────────────────────▶  │
    │                                  │                            │
    │                                  │  6. Generate thumbnail     │
    │                                  │     (Lambda trigger)       │
    │                                  │                            │
```

Why presigned URLs:
- Clinical photos can be 5-10MB each. You don't want that traffic flowing through your API server.
- Presigned URLs let the mobile app upload directly to S3, keeping your API server fast and lightweight.
- The presigned URL expires after 5 minutes, so it can't be reused or intercepted meaningfully.
- Download works the same way — the API generates a presigned download URL, the client fetches the image directly from S3.

**S3 Bucket Configuration:**
```
Bucket: dermmap-clinical-images-{env}
├── Encryption: SSE-KMS (AWS managed key or custom CMK)
├── Versioning: Enabled (accidental deletion recovery)
├── Lifecycle: 
│   ├── Transition to S3 Infrequent Access after 90 days
│   └── Transition to S3 Glacier after 1 year (cost savings for old images)
├── Access: Private (no public access, presigned URLs only)
├── CORS: Restricted to app domains only
├── Logging: S3 access logging enabled (for audit)
└── Replication: Cross-region replication to a second region (disaster recovery)

Object key structure:
{clinicId}/{patientId}/{visitId}/{lesionId}/{photoId}.jpg
{clinicId}/{patientId}/{visitId}/{lesionId}/{photoId}_thumb.jpg
```

**Thumbnail Generation (AWS Lambda):**
```
S3 Upload Event
    │
    ▼
Lambda Function (Node.js + sharp library)
    │
    ├── Validate image (is it actually a JPEG? check magic bytes)
    ├── Strip any remaining EXIF data (defense in depth)
    ├── Resize to 512x512 thumbnail
    ├── Write thumbnail to same bucket with _thumb suffix
    └── Update Photo record in database with dimensions and file size
```

### 3.6 Cache & Sessions: Redis

**Selection: Amazon ElastiCache for Redis (HIPAA-eligible)**

Used for:
```
┌──────────────────────────────────────────────────┐
│  Redis Usage                                      │
│                                                   │
│  Session Management                               │
│  ├── Active session tokens (TTL: 15 min web,     │
│  │   5 min mobile)                                │
│  ├── Refresh token whitelist                      │
│  └── Revoked token blacklist (for logout)         │
│                                                   │
│  Rate Limiting                                    │
│  ├── Login attempts per user (5 per 15 min)       │
│  ├── API requests per user (1000 per min)         │
│  └── Photo uploads per user (100 per hour)        │
│                                                   │
│  Caching                                          │
│  ├── Patient list for today's schedule (TTL: 5m)  │
│  ├── Body map marker positions (TTL: session)     │
│  └── Presigned URL cache (TTL: 4 min)             │
└──────────────────────────────────────────────────┘
```

### 3.7 PDF Generation: Server-Side

**Selection: @react-pdf/renderer (Node.js) for structured PDFs**

Why server-side:
- Consistent output regardless of device
- Clinical-quality photo embedding with proper resolution
- PDF/A compliance for archival requirements
- Can be triggered from both mobile app and web dashboard

```
Visit Summary PDF Pipeline:

1. API receives export request
2. Service layer fetches:
   - Patient record (decrypted)
   - Visit record with all lesions
   - Photo presigned URLs for embedding
   - Body map SVG with marker positions
3. @react-pdf/renderer builds the document:
   - Header with clinic branding
   - Patient demographics
   - Rendered body map image (SVG → PNG via sharp)
   - Lesion table with numbered references
   - Photo grid (fetched from S3, embedded at 300 DPI)
   - Footer with generation timestamp and page numbers
4. PDF written to S3 (exports bucket)
5. Presigned download URL returned to client
6. Audit log entry: "User X exported Visit Y for Patient Z"
```

---

## 4. Security Architecture

### 4.1 Authentication Flow

```
┌──────────┐          ┌───────────┐         ┌──────────┐
│  Client   │          │  API      │         │  Redis   │
│  (Mobile/ │          │  Server   │         │          │
│   Web)    │          │           │         │          │
└────┬──────┘          └─────┬─────┘         └────┬─────┘
     │                       │                    │
     │  1. POST /auth/login  │                    │
     │  { email, password }  │                    │
     │ ─────────────────────▶│                    │
     │                       │                    │
     │                       │ Verify password    │
     │                       │ (bcrypt compare)   │
     │                       │                    │
     │  2. MFA required      │                    │
     │ ◀─────────────────────│                    │
     │                       │                    │
     │  3. POST /auth/mfa    │                    │
     │  { mfaCode }          │                    │
     │ ─────────────────────▶│                    │
     │                       │                    │
     │                       │ Verify TOTP code   │
     │                       │                    │
     │                       │  Store session ────▶│
     │                       │                    │
     │  4. { accessToken,    │                    │
     │     refreshToken }    │                    │
     │ ◀─────────────────────│                    │
     │                       │                    │
     │  5. API requests with │                    │
     │  Authorization:       │                    │
     │  Bearer {accessToken} │                    │
     │ ─────────────────────▶│                    │
     │                       │  Check session ───▶│
     │                       │  still valid       │
     │                       │ ◀──────────────────│
     │                       │                    │
```

**Token Structure:**
```
Access Token (JWT, 15 min TTL):
{
  sub: "user_uuid",
  role: "MEDICAL_ASSISTANT",
  clinicId: "clinic_uuid",
  sessionId: "session_uuid",    // ties to Redis session
  iat: 1234567890,
  exp: 1234568790
}

Refresh Token (opaque, 24 hour TTL):
- Stored in Redis, tied to session
- Rotated on every use (one-time use)
- Revoked on logout or session timeout
```

### 4.2 Field-Level Encryption

Not all data needs the same protection. PHI fields get an extra encryption layer on top of database-level encryption.

```
┌──────────────────────────────────────────────────────────┐
│  Encryption Layers                                        │
│                                                           │
│  Layer 1: Transport (TLS 1.3)                            │
│  ├── All data in transit between client and server        │
│                                                           │
│  Layer 2: Storage (AES-256 at rest)                      │
│  ├── RDS encrypted storage                               │
│  ├── S3 server-side encryption                           │
│  ├── Redis in-transit encryption                         │
│                                                           │
│  Layer 3: Field-Level (AES-256-GCM, app layer)           │
│  ├── patient.firstName                                   │
│  ├── patient.lastName                                    │
│  ├── patient.dateOfBirth                                 │
│  ├── patient.mrn                                         │
│  ├── lesion.clinicalNotes                                │
│  ├── lesion.pathologyNotes                               │
│  ├── visit.clinicalNotes                                 │
│  └── user.mfaSecret                                      │
│                                                           │
│  Encryption keys managed via AWS KMS                      │
│  Key rotation: automatic, every 365 days                  │
│  Old keys retained for decryption of historical data      │
└──────────────────────────────────────────────────────────┘
```

### 4.3 Network Security

```
┌─────────────────────────────────────────────────────────┐
│  AWS VPC Architecture                                    │
│                                                          │
│  ┌─────────────────────────────────────────────────┐    │
│  │  Public Subnet                                   │    │
│  │  ├── API Gateway                                 │    │
│  │  ├── CloudFront (web dashboard CDN)             │    │
│  │  └── NAT Gateway (outbound only)                │    │
│  └──────────────────────┬──────────────────────────┘    │
│                          │                               │
│  ┌──────────────────────▼──────────────────────────┐    │
│  │  Private Subnet                                  │    │
│  │  ├── ECS Fargate (API server containers)        │    │
│  │  ├── Lambda functions (thumbnail generation)     │    │
│  │  └── No direct internet access                   │    │
│  └──────────────────────┬──────────────────────────┘    │
│                          │                               │
│  ┌──────────────────────▼──────────────────────────┐    │
│  │  Isolated Subnet                                 │    │
│  │  ├── RDS PostgreSQL (no internet access)        │    │
│  │  ├── ElastiCache Redis (no internet access)     │    │
│  │  └── S3 VPC Endpoint (no internet route)        │    │
│  └─────────────────────────────────────────────────┘    │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

---

## 5. Offline Sync Architecture

This is the hardest engineering problem in the system. Here's how it works.

### Sync Protocol (WatermelonDB ↔ API)

```
┌────────────────────────────────────────────────────────────┐
│  Sync Flow                                                  │
│                                                             │
│  PULL (server → device):                                   │
│  1. Device sends: last_synced_at timestamp                 │
│  2. Server returns: all records created/updated/deleted    │
│     since that timestamp for this user's clinic            │
│  3. Device applies changes to local WatermelonDB           │
│                                                             │
│  PUSH (device → server):                                   │
│  1. Device sends: all locally created/updated records      │
│     since last sync                                         │
│  2. Server validates and applies each change               │
│  3. Server returns: success/conflict for each record       │
│                                                             │
│  CONFLICT RESOLUTION:                                      │
│  Strategy: Last-write-wins with conflict flag              │
│  1. If server record was updated after device record:      │
│     → Server version wins                                   │
│     → Device record flagged for manual review              │
│  2. If device record is newer:                             │
│     → Device version wins                                   │
│  3. Photos are append-only (never conflict)                │
│  4. Audit logs are append-only (never conflict)            │
│                                                             │
│  PHOTO SYNC:                                               │
│  1. Photos queued locally with pending status              │
│  2. Background upload when connection available             │
│  3. Upload order: newest first (current visit priority)    │
│  4. Retry with exponential backoff on failure              │
│  5. Local encrypted copy deleted after server confirmation │
└────────────────────────────────────────────────────────────┘
```

### Sync API Endpoints:
```
POST /api/sync/pull
  Request:  { lastSyncedAt: "2026-03-09T10:00:00Z", deviceId: "xxx" }
  Response: { changes: { patients: [...], visits: [...], lesions: [...] },
              timestamp: "2026-03-09T10:05:00Z" }

POST /api/sync/push
  Request:  { changes: { visits: [...], lesions: [...], photos: [...] },
              deviceId: "xxx" }
  Response: { results: [{ id: "xxx", status: "applied" | "conflict", ... }] }

POST /api/sync/photo-upload-url
  Request:  { photoId: "xxx", mimeType: "image/jpeg", fileSizeBytes: 4500000 }
  Response: { uploadUrl: "https://s3.../presigned", expiresAt: "..." }
```

---

## 6. FHIR Integration Stub (Demo-Ready, Production-Extensible)

The demo won't connect to a real EHR. But the architecture must show that FHIR is planned, not bolted on.

```
┌──────────────────────────────────────────────────────┐
│  FHIR Service Layer (src/services/fhir.service.ts)   │
│                                                       │
│  Maps internal data models to FHIR R4 resources:     │
│                                                       │
│  Patient    → FHIR Patient resource                  │
│  Visit      → FHIR Encounter resource                │
│  Lesion     → FHIR Condition resource                │
│  Photo      → FHIR Media resource                    │
│  Provider   → FHIR Practitioner resource             │
│  PDF Export → FHIR DocumentReference resource        │
│                                                       │
│  Demo mode: returns mock FHIR bundles                │
│  Production: connects to EHR FHIR endpoint           │
│                                                       │
│  Integration Settings Screen (UI):                    │
│  ├── EHR vendor selector (Epic, Cerner, ModMed...)   │
│  ├── FHIR endpoint URL field                         │
│  ├── Client ID / Client Secret fields                │
│  ├── Scopes configuration                            │
│  ├── Test Connection button (returns mock success)    │
│  └── Sync schedule (manual, hourly, real-time)       │
└──────────────────────────────────────────────────────┘
```

---

## 7. Deployment Architecture

### Prototype / Demo
```
┌─────────────────────────────────────────────────┐
│  Demo Deployment (AWS, single region)            │
│                                                  │
│  ECS Fargate (1 task)                           │
│  ├── API server container                        │
│  ├── Auto-scaling: OFF (single instance is fine) │
│                                                  │
│  RDS PostgreSQL (db.t3.medium)                  │
│  ├── Single-AZ (no failover needed for demo)    │
│  ├── 20 GB storage                              │
│                                                  │
│  S3 Bucket (standard)                           │
│  ├── Synthetic images preloaded                  │
│                                                  │
│  ElastiCache Redis (cache.t3.micro)             │
│  ├── Single node                                 │
│                                                  │
│  CloudFront                                      │
│  ├── Web dashboard distribution                  │
│                                                  │
│  Estimated monthly cost: ~$150-250               │
└─────────────────────────────────────────────────┘
```

### Production (future)
```
┌─────────────────────────────────────────────────┐
│  Production Deployment (AWS, multi-AZ)           │
│                                                  │
│  ECS Fargate (auto-scaling, 2-10 tasks)         │
│  ├── API server containers                       │
│  ├── Health checks + rolling deploys             │
│                                                  │
│  RDS PostgreSQL (db.r6g.large)                  │
│  ├── Multi-AZ with automated failover           │
│  ├── Read replicas for dashboard queries         │
│  ├── Automated backups (35-day retention)        │
│  ├── Point-in-time recovery enabled              │
│                                                  │
│  S3 Bucket                                       │
│  ├── Cross-region replication                    │
│  ├── Lifecycle policies (IA → Glacier)           │
│                                                  │
│  ElastiCache Redis (cluster mode)               │
│  ├── Multi-AZ with automatic failover           │
│                                                  │
│  CloudFront + WAF                               │
│  ├── Web Application Firewall rules              │
│  ├── DDoS protection (Shield Standard)           │
│                                                  │
│  CloudWatch + CloudTrail                         │
│  ├── Application monitoring and alerting         │
│  ├── API call logging for compliance             │
│                                                  │
│  Estimated monthly cost: ~$800-2000 (scales)    │
└─────────────────────────────────────────────────┘
```

---

## 8. CI/CD Pipeline

```
Developer pushes code
        │
        ▼
GitHub Actions triggers
        │
        ├── Lint (ESLint + Prettier)
        ├── Type check (tsc --noEmit)
        ├── Unit tests (Jest)
        ├── Integration tests (against test DB)
        ├── Security scan (npm audit, Snyk)
        ├── SAST scan (CodeQL or Semgrep)
        │
        ▼
Build artifacts
        │
        ├── API: Docker image → push to ECR
        ├── Web: Next.js build → push to S3/CloudFront
        ├── Mobile: EAS Build (Expo Application Services)
        │
        ▼
Deploy to staging
        │
        ├── Run smoke tests against staging
        ├── Manual QA approval gate
        │
        ▼
Deploy to production
        │
        ├── Rolling deployment (zero downtime)
        ├── Health check verification
        └── Automated rollback on failure
```

---

## 9. Monitoring & Observability

```
┌──────────────────────────────────────────────────┐
│  Monitoring Stack                                 │
│                                                   │
│  Application Logging                              │
│  ├── Structured JSON logs (Winston/Pino)         │
│  ├── NO PHI in logs (enforced by sanitizer)      │
│  ├── Request ID correlation across services       │
│  ├── Ship to CloudWatch Logs                      │
│                                                   │
│  Metrics                                          │
│  ├── API response times (p50, p95, p99)          │
│  ├── Photo upload success rate                    │
│  ├── Sync success/failure rate                    │
│  ├── Active sessions count                        │
│  ├── Database query latency                       │
│  ├── S3 operation latency                         │
│                                                   │
│  Alerting                                         │
│  ├── API error rate > 5% → PagerDuty             │
│  ├── Database connection pool exhausted → alert   │
│  ├── S3 upload failures > 10/min → alert          │
│  ├── Failed login spike → security alert          │
│  ├── Audit log write failure → critical alert     │
│                                                   │
│  CRITICAL: Audit log write failures are the       │
│  highest severity alert. If audit logging breaks, │
│  the system must stop processing requests until   │
│  logging is restored. HIPAA requires complete     │
│  audit trails.                                    │
└──────────────────────────────────────────────────┘
```

---

## 10. Development Team & Timeline Estimate

### Minimum Team to Build the Prototype
```
1 Full-Stack Lead (TypeScript) — owns API + database + infrastructure
1 React Native Developer      — owns mobile app
1 React Developer              — owns web dashboard
1 Designer (UI/UX)             — owns wireframes, body map assets, PDF layout
                                  (contract/part-time is fine for prototype)
```

### Timeline (Prototype to Demo-Ready)
```
Weeks 1-2:    Infrastructure setup, auth system, database schema, CI/CD
Weeks 3-4:    Body map component (SVG, tap interaction, zoom), patient CRUD
Weeks 5-6:    Camera integration, photo pipeline, offline storage
Weeks 7-8:    Visit workflow end-to-end (MA flow), lesion documentation
Weeks 9-10:   Lesion timeline, photo comparison tools, provider review
Weeks 11-12:  Web dashboard (patient viewer, admin panels, analytics)
Weeks 13-14:  PDF export, synthetic data generation, demo mode
Weeks 15-16:  Security hardening, penetration testing, polish, QA

Total: ~16 weeks (4 months) with a team of 3-4
```

---

## 11. Technology Decision Summary

| Component | Selection | Why |
|---|---|---|
| Mobile app | React Native + Expo (TypeScript) | Single codebase, OTA updates, shared types with API |
| Local database | WatermelonDB (SQLite) | Offline-first with built-in sync protocol |
| Web dashboard | Next.js 14 (TypeScript) | SSR, shared React patterns with mobile |
| API server | Express.js (TypeScript) | Battle-tested, healthcare middleware ecosystem |
| ORM | Prisma | Type-safe queries, migration management, schema-as-code |
| Primary database | PostgreSQL 16 (RDS) | HIPAA-eligible, relational integrity, JSONB flexibility |
| Image storage | Amazon S3 + presigned URLs | Direct upload/download, server-side encryption |
| Cache/sessions | Redis (ElastiCache) | Session management, rate limiting, ephemeral data |
| PDF generation | @react-pdf/renderer | Server-side, consistent output, clinical-quality photos |
| Auth | JWT + TOTP MFA + Redis sessions | Stateless tokens with server-side revocation |
| Encryption | AES-256-GCM (field level) + KMS | PHI protection beyond storage encryption |
| Infrastructure | AWS (ECS Fargate, RDS, S3, ElastiCache) | HIPAA BAA available, managed services reduce ops burden |
| CI/CD | GitHub Actions + EAS Build | Automated testing, security scanning, mobile builds |
| Monitoring | CloudWatch + structured logging | No PHI in logs, request correlation, alerting |

---

*Architecture Version: 1.0*
*Designed for: Prototype → Production continuity*
*Primary constraint: HIPAA compliance at every layer*
*Secondary constraint: Offline-first mobile experience*
