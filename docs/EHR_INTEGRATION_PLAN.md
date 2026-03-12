# DermMap — EHR Integration Plan

**Created:** 2026-03-12  
**Last updated:** 2026-03-12  
**Scope:** Full EHR integration — SMART on FHIR OAuth 2.0, FHIR R4 resource mapping, vendor-specific modules (ModMed, Epic, Cerner, Athenahealth, eClinicalWorks), sync engine, webhook receivers, and compliance testing  
**Track status:** Check off each `[ ]` sub-task as completed. Update the Quick Reference status when an issue is fully closed.

---

## Quick Reference — Issue Index

| # | Task | Phase | Category | Status |
|---|------|-------|----------|--------|
| 1 | [EHR integration database tables](#1-ehr-integration-database-tables) | 0 — Foundation | Database | `[ ] Open` |
| 2 | [Backend dependencies and project structure](#2-backend-dependencies-and-project-structure) | 0 — Foundation | Architecture | `[ ] Open` |
| 3 | [Frontend configuration and types](#3-frontend-configuration-and-types) | 0 — Foundation | Frontend | `[ ] Open` |
| 4 | [SMART on FHIR discovery and registration](#4-smart-on-fhir-discovery-and-registration) | 1 — OAuth | Auth | `[ ] Open` |
| 5 | [OAuth 2.0 authorization code flow](#5-oauth-20-authorization-code-flow) | 1 — OAuth | Auth | `[ ] Open` |
| 6 | [Token management — storage, refresh, revocation](#6-token-management--storage-refresh-and-revocation) | 1 — OAuth | Auth | `[ ] Open` |
| 7 | [FHIR Patient — pull demographics](#7-fhir-patient-resource--pull-demographics) | 2 — FHIR | Data Mapping | `[ ] Open` |
| 8 | [FHIR Observation — push lesion findings](#8-fhir-observation-resource--push-lesion-findings) | 2 — FHIR | Data Mapping | `[ ] Open` |
| 9 | [FHIR Encounter — visit mapping](#9-fhir-encounter-resource--visit-mapping) | 2 — FHIR | Data Mapping | `[ ] Open` |
| 10 | [FHIR DocumentReference — push PDFs](#10-fhir-documentreference--push-visit-summary-pdfs) | 2 — FHIR | Data Mapping | `[ ] Open` |
| 11 | [FHIR DiagnosticReport — biopsy bi-dir sync](#11-fhir-diagnosticreport--biopsypathology-bi-directional-sync) | 2 — FHIR | Data Mapping | `[ ] Open` |
| 12 | [FHIR Appointment — schedule pull](#12-fhir-appointment-resource--schedule-pull) | 2 — FHIR | Data Mapping | `[ ] Open` |
| 13 | [FHIR Media + Binary — photo attachments](#13-fhir-media--binary--photo-attachments) | 2 — FHIR | Data Mapping | `[ ] Open` |
| 14 | [Modernizing Medicine (EMA) adapter](#14-modernizing-medicine-ema-adapter) | 3 — Vendors | Vendor | `[ ] Open` |
| 15 | [Epic adapter](#15-epic-mychart--hyperdrive-adapter) | 3 — Vendors | Vendor | `[ ] Open` |
| 16 | [Cerner / Oracle Health adapter](#16-cerner--oracle-health-adapter) | 3 — Vendors | Vendor | `[ ] Open` |
| 17 | [Athenahealth adapter](#17-athenahealth-athenaone-adapter) | 3 — Vendors | Vendor | `[ ] Open` |
| 18 | [eClinicalWorks adapter](#18-eclinicalworks-adapter) | 3 — Vendors | Vendor | `[ ] Open` |
| 19 | [Outbound sync engine — push queue](#19-outbound-sync-engine--push-queue-and-retry-logic) | 4 — Sync | Sync Engine | `[ ] Open` |
| 20 | [Inbound sync — pull + webhooks](#20-inbound-sync--scheduled-pull-and-webhook-receivers) | 4 — Sync | Sync Engine | `[ ] Open` |
| 21 | [Conflict resolution](#21-conflict-resolution-and-data-reconciliation) | 4 — Sync | Sync Engine | `[ ] Open` |
| 22 | [Frontend — live EHR page (replace demo)](#22-frontend--real-ehr-integration-page-replace-demo) | 4 — Sync | Frontend | `[ ] Open` |
| 23 | [Unit tests — FHIR builders/mappers](#23-unit-tests--fhir-resource-builders-and-mappers) | 5 — Testing | Testing | `[ ] Open` |
| 24 | [Integration tests — OAuth + API round-trips](#24-integration-tests--oauth-flow-and-api-round-trips) | 5 — Testing | Testing | `[ ] Open` |
| 25 | [Vendor sandbox testing](#25-vendor-sandbox-testing) | 5 — Testing | Testing | `[ ] Open` |
| 26 | [E2E tests — full sync cycle](#26-e2e-tests--full-sync-cycle) | 5 — Testing | Testing | `[ ] Open` |
| 27 | [HIPAA compliance for EHR data flows](#27-hipaa-compliance-for-ehr-data-flows) | 6 — Production | Compliance | `[ ] Open` |
| 28 | [Vendor marketplace submissions](#28-vendor-marketplace-submissions-and-certification) | 6 — Production | Certification | `[ ] Open` |
| 29 | [Monitoring, alerting, and runbook](#29-monitoring-alerting-and-operational-runbook) | 6 — Production | Operations | `[ ] Open` |

---

## How to Use This Document

1. Work tasks **in phase order** (Phase 0 → 1 → 2 → 3 → 4 → 5 → 6).
2. Read the **Goal**, **Files affected**, and **Step-by-step** sections in full before touching code.
3. Check off each sub-task `[ ]` → `[x]` as completed.
4. Run the **Verification** checklist before marking a task done.
5. Update the Quick Reference table to `[x] Done`.
6. Record your name and date in the Completion Summary at the bottom.

### Dependency Map

```
Phase 0 (DB tables + config) ──→ Phase 1 (SMART on FHIR OAuth) ──→ Phase 2 (FHIR resources)
                                                                  └──→ Phase 3 (vendor modules)
Phase 2 + Phase 3 ──→ Phase 4 (sync engine + webhooks)
Phase 4 ──→ Phase 5 (testing — unit, integration, E2E, sandbox)
Phase 5 ──→ Phase 6 (production launch + compliance)
```

### Vendor Priority Order

| Priority | Vendor | Rationale | Target |
|----------|--------|-----------|--------|
| 1 | **Modernizing Medicine (EMA)** | Dominant in dermatology; REST + FHIR hybrid API | Q2 2026 |
| 2 | **Epic (MyChart / Hyperdrive)** | Largest US install base; mature FHIR R4 + SMART on FHIR | Q3 2026 |
| 3 | **Cerner / Oracle Health** | Second largest; Millennium + CommunityWorks | Q3 2026 |
| 4 | **Athenahealth (athenaOne)** | Strong ambulatory market; athenaFlex API + FHIR | Q4 2026 |
| 5 | **eClinicalWorks** | Common in smaller practices; v12 cloud FHIR | Q1 2027 |

### DermMap ↔ FHIR R4 Data Mapping Summary

```
DermMap Model              FHIR R4 Resource         Direction     Trigger
────────────────────────   ─────────────────────    ──────────    ─────────────────────
Patient (demographics)     Patient                  ← Pull        Daily at 6 AM + on-demand
Visit                      Encounter                ← Pull        Appointment webhook
Lesion (ABCDE findings)    Observation              → Push         After provider sign-off
Photo                      Media + Binary           → Push         After provider sign-off
Visit summary PDF          DocumentReference        → Push         After provider sign-off
Biopsy / pathology         DiagnosticReport         ↔ Bi-dir      Path lab webhook
Appointment                Appointment              ← Pull        Real-time webhook
Provider                   Practitioner             ← Pull        On connection setup
```

---

---

## PHASE 0 — Foundation (Database, Config, Dependencies)

<!-- SECTION: PHASE_0 — to be filled -->

### 1. EHR integration database tables

**Goal:** Create the persistence layer for EHR connections, token storage, sync state, and FHIR resource mapping.

#### Files affected

| File | Change |
|------|--------|
| `backend/src/db/setup.js` | Add 4 new tables: `ehr_connections`, `ehr_tokens`, `ehr_sync_queue`, `ehr_resource_map` |
| `backend/src/db/migrations/001_ehr_tables.sql` | Standalone migration file (if migration framework from Security Plan issue 20 is done) |

#### Step-by-step

##### 1-A: Create `ehr_connections` table
- [ ] Stores per-clinic EHR vendor configuration

```sql
CREATE TABLE IF NOT EXISTS ehr_connections (
  connection_id    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id      UUID NOT NULL REFERENCES clinic_locations(location_id),
  vendor           VARCHAR(50) NOT NULL,  -- 'modmed' | 'epic' | 'cerner' | 'athena' | 'ecw'
  display_name     VARCHAR(100),
  fhir_base_url    TEXT NOT NULL,          -- e.g. https://fhir.epic.com/interconnect-fhir-oauth/api/FHIR/R4
  client_id        VARCHAR(255) NOT NULL,
  scopes           TEXT[] NOT NULL DEFAULT '{}',
  status           VARCHAR(20) NOT NULL DEFAULT 'pending',  -- pending | connected | error | disconnected
  enabled          BOOLEAN NOT NULL DEFAULT true,
  last_sync_at     TIMESTAMPTZ,
  last_error       TEXT,
  metadata         JSONB DEFAULT '{}',     -- vendor-specific config (e.g. ModMed practiceId)
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(location_id, vendor)
);
CREATE INDEX idx_ehr_connections_location ON ehr_connections(location_id);
CREATE INDEX idx_ehr_connections_vendor ON ehr_connections(vendor);
```

##### 1-B: Create `ehr_tokens` table
- [ ] Encrypted OAuth token storage with automatic refresh tracking

```sql
CREATE TABLE IF NOT EXISTS ehr_tokens (
  token_id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  connection_id    UUID NOT NULL REFERENCES ehr_connections(connection_id) ON DELETE CASCADE,
  access_token     TEXT NOT NULL,            -- AES-256-GCM encrypted
  refresh_token    TEXT,                     -- AES-256-GCM encrypted
  token_type       VARCHAR(20) DEFAULT 'Bearer',
  scope            TEXT,
  expires_at       TIMESTAMPTZ NOT NULL,
  refresh_expires_at TIMESTAMPTZ,
  issued_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  patient_context  VARCHAR(255),            -- SMART launch context patient ID
  encounter_context VARCHAR(255),           -- SMART launch context encounter ID
  UNIQUE(connection_id)                     -- one active token set per connection
);
CREATE INDEX idx_ehr_tokens_expires ON ehr_tokens(expires_at);
```

##### 1-C: Create `ehr_sync_queue` table
- [ ] Persistent outbound push queue with retry tracking

```sql
CREATE TABLE IF NOT EXISTS ehr_sync_queue (
  queue_id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  connection_id    UUID NOT NULL REFERENCES ehr_connections(connection_id),
  direction        VARCHAR(10) NOT NULL,    -- 'push' | 'pull'
  resource_type    VARCHAR(50) NOT NULL,    -- 'Observation' | 'DocumentReference' | etc.
  dermmap_entity   VARCHAR(50) NOT NULL,    -- 'lesion' | 'visit' | 'patient' | 'photo'
  dermmap_id       UUID NOT NULL,
  fhir_payload     JSONB,                   -- the FHIR resource to push (null for pulls)
  status           VARCHAR(20) NOT NULL DEFAULT 'pending',  -- pending | in_progress | completed | failed | dead_letter
  attempts         INT NOT NULL DEFAULT 0,
  max_attempts     INT NOT NULL DEFAULT 5,
  last_error       TEXT,
  next_retry_at    TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at     TIMESTAMPTZ,
  created_by       INT REFERENCES users(id)
);
CREATE INDEX idx_ehr_sync_queue_status ON ehr_sync_queue(status, next_retry_at);
CREATE INDEX idx_ehr_sync_queue_connection ON ehr_sync_queue(connection_id);
```

##### 1-D: Create `ehr_resource_map` table
- [ ] Bi-directional mapping between DermMap IDs and FHIR resource IDs

```sql
CREATE TABLE IF NOT EXISTS ehr_resource_map (
  map_id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  connection_id    UUID NOT NULL REFERENCES ehr_connections(connection_id),
  dermmap_entity   VARCHAR(50) NOT NULL,    -- 'patient' | 'lesion' | 'visit' | 'photo'
  dermmap_id       UUID NOT NULL,
  fhir_resource_type VARCHAR(50) NOT NULL,  -- 'Patient' | 'Observation' | 'Encounter' | etc.
  fhir_resource_id VARCHAR(255) NOT NULL,   -- the EHR's resource ID
  fhir_version_id  VARCHAR(50),             -- ETag / versionId for optimistic concurrency
  last_synced_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  sync_hash        VARCHAR(64),             -- SHA-256 of last synced payload (detect drift)
  UNIQUE(connection_id, dermmap_entity, dermmap_id, fhir_resource_type)
);
CREATE INDEX idx_ehr_resource_map_fhir ON ehr_resource_map(connection_id, fhir_resource_type, fhir_resource_id);
CREATE INDEX idx_ehr_resource_map_dermmap ON ehr_resource_map(dermmap_entity, dermmap_id);
```

##### 1-E: Add EHR audit log entries
- [ ] Extend the existing `audit_logs` table to cover EHR sync events — add `ehr_connection_id` as an optional column

```sql
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS ehr_connection_id UUID REFERENCES ehr_connections(connection_id);
```

#### Verification

- [ ] All 4 tables created successfully: `SELECT tablename FROM pg_tables WHERE tablename LIKE 'ehr_%';` → 4 rows
- [ ] Foreign keys enforced: inserting a row with a non-existent `connection_id` into `ehr_tokens` fails
- [ ] Unique constraints enforced: duplicate `(location_id, vendor)` in `ehr_connections` fails
- [ ] Indexes exist: `SELECT indexname FROM pg_indexes WHERE tablename LIKE 'ehr_%';` → 7 indexes

---

### 2. Backend dependencies and project structure

**Goal:** Install FHIR/OAuth libraries and create the file/folder structure for the integration module.

#### Files affected

| File | Change |
|------|--------|
| `backend/package.json` | Add `fhir-kit-client`, `node-jose`, `otplib` (if not from Security Plan), `node-cron` |
| `backend/src/services/ehr/` | New directory — core integration logic |
| `backend/src/services/ehr/fhirClient.js` | Thin wrapper around `fhir-kit-client` with token injection |
| `backend/src/services/ehr/tokenManager.js` | Encrypt/decrypt/refresh OAuth tokens |
| `backend/src/services/ehr/resourceMappers.js` | DermMap ↔ FHIR converters (one function per resource type) |
| `backend/src/services/ehr/syncEngine.js` | Queue processor — dequeue, push/pull, retry |
| `backend/src/services/ehr/vendors/` | New directory — vendor-specific adapters |
| `backend/src/services/ehr/vendors/modmed.js` | ModMed adapter |
| `backend/src/services/ehr/vendors/epic.js` | Epic adapter |
| `backend/src/services/ehr/vendors/cerner.js` | Cerner adapter |
| `backend/src/services/ehr/vendors/athena.js` | Athenahealth adapter |
| `backend/src/services/ehr/vendors/ecw.js` | eClinicalWorks adapter |
| `backend/src/services/ehr/vendors/base.js` | Abstract base adapter class |
| `backend/src/routes/ehr.js` | New route file — all `/api/ehr/*` endpoints |
| `backend/src/middleware/ehrAuth.js` | Middleware to validate EHR connection ownership |

#### Step-by-step

##### 2-A: Install NPM dependencies
- [ ] Run inside `backend/`:

```bash
npm install fhir-kit-client node-jose node-cron
```

| Package | Purpose |
|---------|---------|
| `fhir-kit-client` | FHIR R4 HTTP client — handles bundle pagination, content negotiation, conformance checks |
| `node-jose` | JOSE/JWK for SMART backend services auth (asymmetric key signing) |
| `node-cron` | Scheduled pull jobs (daily demographics sync, appointment refresh) |

##### 2-B: Create directory structure
- [ ] Create `backend/src/services/ehr/` and `backend/src/services/ehr/vendors/`

```
backend/src/
  services/
    ehr/
      index.js            ← re-exports for clean imports
      fhirClient.js       ← FHIR HTTP client wrapper
      tokenManager.js     ← OAuth token encrypt/decrypt/refresh
      resourceMappers.js  ← DermMap ↔ FHIR converters
      syncEngine.js       ← Push/pull queue processor
      webhookHandler.js   ← Inbound webhook processor
      vendors/
        base.js           ← Abstract VendorAdapter class
        modmed.js          ← Modernizing Medicine
        epic.js            ← Epic
        cerner.js          ← Cerner / Oracle Health
        athena.js          ← Athenahealth
        ecw.js             ← eClinicalWorks
  routes/
    ehr.js                ← All /api/ehr/* endpoints
  middleware/
    ehrAuth.js            ← Verify caller owns the EHR connection
```

##### 2-C: Create the base vendor adapter class
- [ ] Create `backend/src/services/ehr/vendors/base.js` with the adapter interface:

```javascript
// Every vendor adapter MUST implement these methods:
export class BaseVendorAdapter {
  constructor(connection) { this.connection = connection; }

  // SMART on FHIR discovery
  async getSmartConfiguration() { throw new Error('Not implemented'); }
  async getAuthorizationUrl(state, redirectUri) { throw new Error('Not implemented'); }
  async exchangeCodeForToken(code, redirectUri) { throw new Error('Not implemented'); }
  async refreshToken(refreshToken) { throw new Error('Not implemented'); }

  // FHIR resource operations
  async pullPatient(fhirId) { throw new Error('Not implemented'); }
  async pushObservation(observation) { throw new Error('Not implemented'); }
  async pushDocumentReference(docRef, binaryData) { throw new Error('Not implemented'); }
  async pullAppointments(date) { throw new Error('Not implemented'); }
  async pullDiagnosticReport(fhirId) { throw new Error('Not implemented'); }
  async pushMedia(media, binaryData) { throw new Error('Not implemented'); }

  // Vendor-specific quirks
  getScopes() { return ['launch/patient', 'patient/*.read', 'patient/Observation.write']; }
  getFhirVersion() { return 'R4'; }
  supportsWebhooks() { return false; }
  getWebhookSignatureHeader() { return null; }
}
```

##### 2-D: Create the EHR routes file
- [ ] Create `backend/src/routes/ehr.js` with endpoint stubs:

```javascript
import { Router } from 'express';
import { authenticateToken, authorizeRoles } from '../middleware/auth.js';

const router = Router();

// Connection management (admin/manager only)
router.get('/connections',        authenticateToken, authorizeRoles('admin','manager'), getConnections);
router.post('/connections',       authenticateToken, authorizeRoles('admin','manager'), createConnection);
router.put('/connections/:id',    authenticateToken, authorizeRoles('admin','manager'), updateConnection);
router.delete('/connections/:id', authenticateToken, authorizeRoles('admin','manager'), deleteConnection);

// OAuth flow
router.get('/authorize/:connectionId',  authenticateToken, authorizeRoles('admin','manager'), startAuthorization);
router.get('/callback',                  handleOAuthCallback);  // no auth — redirected by EHR

// Sync operations
router.post('/sync/push/:connectionId',  authenticateToken, authorizeRoles('provider'), triggerPush);
router.post('/sync/pull/:connectionId',  authenticateToken, authorizeRoles('admin','manager','provider'), triggerPull);
router.get('/sync/status/:connectionId', authenticateToken, getSyncStatus);
router.get('/sync/queue/:connectionId',  authenticateToken, getSyncQueue);

// Webhooks (vendor callbacks — verified by signature, not JWT)
router.post('/webhook/:vendor',  handleInboundWebhook);

export default router;
```

##### 2-E: Register routes in server.js
- [ ] Add to `backend/src/server.js`:

```javascript
import ehrRoutes from './routes/ehr.js';
app.use('/api/ehr', ehrRoutes);
```

##### 2-F: Create EHR auth middleware
- [ ] Create `backend/src/middleware/ehrAuth.js` to verify the caller's `location_id` matches the connection's `location_id`:

```javascript
// Prevents Clinic A from managing Clinic B's EHR connection
export async function verifyConnectionOwnership(req, res, next) {
  const { id, connectionId } = req.params;
  const connId = id || connectionId;
  const row = await pool.query(
    'SELECT location_id FROM ehr_connections WHERE connection_id = $1', [connId]
  );
  if (!row.rows.length) return res.status(404).json({ error: 'Connection not found' });
  if (row.rows[0].location_id !== req.user.location_id) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  req.ehrConnection = row.rows[0];
  next();
}
```

#### Verification

- [ ] `npm ls fhir-kit-client node-jose node-cron` — all installed, no peer dep warnings
- [ ] Directory structure matches the layout above
- [ ] `GET /api/ehr/connections` returns 200 (empty array) with valid admin JWT
- [ ] `GET /api/ehr/connections` returns 403 with MA JWT
- [ ] Server starts without import errors

---

### 3. Frontend configuration and types

**Goal:** Add EHR TypeScript types, config entries, and environment variables for the integration layer.

#### Files affected

| File | Change |
|------|--------|
| `src/types/index.ts` | Add EHR-related interfaces and enums |
| `src/types/fhir.ts` | New file — FHIR R4 resource type definitions |
| `src/config.ts` | Add EHR config section with env vars |
| `src/services/ehrService.ts` | New file — frontend API client for `/api/ehr/*` |
| `.env.example` | Add EHR environment variable stubs |

#### Step-by-step

##### 3-A: Add EHR types to `src/types/index.ts`
- [ ] Add these interfaces/enums:

```typescript
// --- EHR Integration Types ---

export type EHRVendor = 'modmed' | 'epic' | 'cerner' | 'athena' | 'ecw';
export type EHRConnectionStatus = 'pending' | 'connected' | 'error' | 'disconnected';
export type SyncDirection = 'push' | 'pull';
export type SyncQueueStatus = 'pending' | 'in_progress' | 'completed' | 'failed' | 'dead_letter';

export interface EHRConnection {
  connection_id: string;
  location_id: string;
  vendor: EHRVendor;
  display_name: string;
  fhir_base_url: string;
  status: EHRConnectionStatus;
  enabled: boolean;
  last_sync_at: string | null;
  last_error: string | null;
  scopes: string[];
  created_at: string;
  updated_at: string;
}

export interface EHRSyncQueueItem {
  queue_id: string;
  connection_id: string;
  direction: SyncDirection;
  resource_type: string;       // FHIR resource type
  dermmap_entity: string;
  dermmap_id: string;
  status: SyncQueueStatus;
  attempts: number;
  last_error: string | null;
  created_at: string;
  completed_at: string | null;
}

export interface EHRSyncStatus {
  connection_id: string;
  vendor: EHRVendor;
  status: EHRConnectionStatus;
  last_sync_at: string | null;
  queue_pending: number;
  queue_failed: number;
  patients_synced: number;
  records_pushed: number;
}

export interface EHRDataFlowConfig {
  resource: string;
  direction: SyncDirection | 'bidirectional';
  enabled: boolean;
  schedule: string;          // cron expression or 'realtime' or 'on_signoff'
  description: string;
}
```

##### 3-B: Create FHIR type definitions
- [ ] Create `src/types/fhir.ts` with core FHIR R4 resource interfaces:

```typescript
// Minimal FHIR R4 types for DermMap's use cases.
// Full spec: https://hl7.org/fhir/R4/

export interface FHIRReference {
  reference: string;
  display?: string;
}

export interface FHIRCoding {
  system: string;
  code: string;
  display?: string;
}

export interface FHIRCodeableConcept {
  coding: FHIRCoding[];
  text?: string;
}

export interface FHIRQuantity {
  value: number;
  unit: string;
  system?: string;
  code?: string;
}

export interface FHIRPatient {
  resourceType: 'Patient';
  id: string;
  identifier?: { system: string; value: string }[];
  name: { family: string; given: string[]; use?: string }[];
  birthDate: string;
  gender: 'male' | 'female' | 'other' | 'unknown';
  telecom?: { system: string; value: string; use?: string }[];
  address?: { line?: string[]; city?: string; state?: string; postalCode?: string }[];
}

export interface FHIRObservation {
  resourceType: 'Observation';
  id?: string;
  status: 'registered' | 'preliminary' | 'final' | 'amended';
  category?: { coding: FHIRCoding[] }[];
  code: FHIRCodeableConcept;
  subject: FHIRReference;
  effectiveDateTime?: string;
  performer?: FHIRReference[];
  component?: {
    code: FHIRCodeableConcept;
    valueQuantity?: FHIRQuantity;
    valueString?: string;
    valueBoolean?: boolean;
  }[];
  extension?: { url: string; valueString?: string }[];
}

export interface FHIREncounter {
  resourceType: 'Encounter';
  id?: string;
  status: 'planned' | 'arrived' | 'in-progress' | 'finished' | 'cancelled';
  class: FHIRCoding;
  type?: FHIRCodeableConcept[];
  subject: FHIRReference;
  participant?: { individual: FHIRReference; type?: FHIRCodeableConcept[] }[];
  period?: { start: string; end?: string };
}

export interface FHIRDocumentReference {
  resourceType: 'DocumentReference';
  id?: string;
  status: 'current' | 'superseded';
  type: FHIRCodeableConcept;
  subject: FHIRReference;
  date: string;
  content: { attachment: { contentType: string; data?: string; url?: string; title?: string } }[];
}

export interface FHIRDiagnosticReport {
  resourceType: 'DiagnosticReport';
  id?: string;
  status: 'registered' | 'partial' | 'preliminary' | 'final';
  code: FHIRCodeableConcept;
  subject: FHIRReference;
  effectiveDateTime?: string;
  result?: FHIRReference[];
  conclusion?: string;
  conclusionCode?: FHIRCodeableConcept[];
}

export interface FHIRAppointment {
  resourceType: 'Appointment';
  id?: string;
  status: 'proposed' | 'pending' | 'booked' | 'arrived' | 'fulfilled' | 'cancelled' | 'noshow';
  start: string;
  end: string;
  participant: { actor: FHIRReference; status: string }[];
  appointmentType?: FHIRCodeableConcept;
}
```

##### 3-C: Add EHR config to `src/config.ts`
- [ ] Add an `ehr` section:

```typescript
ehr: {
  callbackUrl: import.meta.env.VITE_EHR_CALLBACK_URL || `${window.location.origin}/api/ehr/callback`,
  defaultScopes: ['launch/patient', 'patient/*.read', 'patient/Observation.write', 'patient/DocumentReference.write'],
  syncIntervalMs: 300000,  // 5 minutes for queue polling
},
```

##### 3-D: Create `src/services/ehrService.ts`
- [ ] Create the frontend API client that calls `/api/ehr/*` endpoints:

```typescript
import { apiClient } from './apiClient';
import type { EHRConnection, EHRSyncStatus, EHRSyncQueueItem } from '../types';

export const ehrService = {
  // Connection CRUD
  getConnections: () => apiClient.get<EHRConnection[]>('/ehr/connections'),
  createConnection: (data: Partial<EHRConnection>) => apiClient.post<EHRConnection>('/ehr/connections', data),
  updateConnection: (id: string, data: Partial<EHRConnection>) => apiClient.put<EHRConnection>(`/ehr/connections/${id}`, data),
  deleteConnection: (id: string) => apiClient.delete(`/ehr/connections/${id}`),

  // OAuth
  startAuthorization: (connectionId: string) => apiClient.get<{ authorizationUrl: string }>(`/ehr/authorize/${connectionId}`),

  // Sync
  triggerPush: (connectionId: string) => apiClient.post(`/ehr/sync/push/${connectionId}`),
  triggerPull: (connectionId: string) => apiClient.post(`/ehr/sync/pull/${connectionId}`),
  getSyncStatus: (connectionId: string) => apiClient.get<EHRSyncStatus>(`/ehr/sync/status/${connectionId}`),
  getSyncQueue: (connectionId: string) => apiClient.get<EHRSyncQueueItem[]>(`/ehr/sync/queue/${connectionId}`),
};
```

##### 3-E: Add environment variables to `.env.example`
- [ ] Add:

```env
# --- EHR Integration ---
VITE_EHR_CALLBACK_URL=http://localhost:5173/api/ehr/callback
EHR_TOKEN_ENCRYPTION_KEY=         # 32-byte hex key for AES-256-GCM token encryption
EHR_MODMED_CLIENT_ID=
EHR_MODMED_CLIENT_SECRET=
EHR_EPIC_CLIENT_ID=
EHR_EPIC_PRIVATE_KEY_PATH=        # path to JWKS private key for Epic backend services
EHR_CERNER_CLIENT_ID=
EHR_CERNER_CLIENT_SECRET=
EHR_ATHENA_CLIENT_ID=
EHR_ATHENA_CLIENT_SECRET=
EHR_ECW_CLIENT_ID=
EHR_ECW_CLIENT_SECRET=
```

#### Verification

- [ ] `npx tsc --noEmit` — no TypeScript errors from new types
- [ ] `src/types/fhir.ts` exports are importable from `src/services/ehrService.ts`
- [ ] Config values are accessible: `console.log(config.ehr.defaultScopes)` in browser DevTools
- [ ] `.env.example` documents all new variables

---

---

## PHASE 1 — SMART on FHIR OAuth 2.0

<!-- SECTION: PHASE_1 — to be filled -->

### 4. SMART on FHIR discovery and registration

**Goal:** Implement `.well-known/smart-configuration` discovery and client registration for each vendor.

**Background:** SMART on FHIR is the OAuth 2.0 profile used by all major EHR vendors. Before DermMap can authenticate, it must discover each EHR's authorization and token endpoints via the SMART discovery document.

#### Files affected

| File | Change |
|------|--------|
| `backend/src/services/ehr/smartDiscovery.js` | New file — fetch and cache `.well-known/smart-configuration` |
| `backend/src/services/ehr/vendors/base.js` | Add `discover()` method to base class |
| `backend/src/routes/ehr.js` | Add `GET /api/ehr/connections/:id/smart-config` endpoint |

#### Step-by-step

##### 4-A: Understand the SMART discovery flow
- [ ] Review the spec: every FHIR server publishes a JSON document at `{fhir_base_url}/.well-known/smart-configuration` containing:

```json
{
  "authorization_endpoint": "https://fhir.example.com/auth/authorize",
  "token_endpoint": "https://fhir.example.com/auth/token",
  "registration_endpoint": "https://fhir.example.com/auth/register",
  "scopes_supported": ["launch", "launch/patient", "patient/*.read", "patient/Observation.write"],
  "response_types_supported": ["code"],
  "capabilities": ["launch-ehr", "launch-standalone", "client-public", "client-confidential-symmetric"]
}
```

##### 4-B: Create `smartDiscovery.js`
- [ ] Implement `discoverSmartConfig(fhirBaseUrl)`:

```javascript
import { createHash } from 'crypto';

// In-memory cache (TTL 1 hour) — avoids hitting EHR on every request
const cache = new Map();
const CACHE_TTL_MS = 3600000;

export async function discoverSmartConfig(fhirBaseUrl) {
  const cacheKey = createHash('sha256').update(fhirBaseUrl).digest('hex');
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.ts < CACHE_TTL_MS) return cached.data;

  // Try .well-known first, fall back to /metadata (CapabilityStatement)
  let config;
  try {
    const url = new URL('/.well-known/smart-configuration', fhirBaseUrl);
    const res = await fetch(url.href, { headers: { Accept: 'application/json' } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    config = await res.json();
  } catch {
    // Fallback: parse CapabilityStatement for OAuth URIs
    const metaUrl = new URL('/metadata', fhirBaseUrl);
    const res = await fetch(metaUrl.href, { headers: { Accept: 'application/fhir+json' } });
    const cs = await res.json();
    const security = cs.rest?.[0]?.security;
    const oauthExt = security?.extension?.find(e => e.url.includes('oauth-uris'));
    config = {
      authorization_endpoint: oauthExt?.extension?.find(e => e.url === 'authorize')?.valueUri,
      token_endpoint: oauthExt?.extension?.find(e => e.url === 'token')?.valueUri,
    };
  }

  cache.set(cacheKey, { data: config, ts: Date.now() });
  return config;
}
```

##### 4-C: Vendor registration requirements
- [ ] Document registration steps per vendor (these are **manual one-time tasks**, not code):

| Vendor | Registration Process | Credentials Received |
|--------|---------------------|---------------------|
| **ModMed** | Apply at [ModMed API Portal](https://developer.modmed.com) → submit use case → receive sandbox credentials | `client_id`, `client_secret` |
| **Epic** | Register at [App Orchard](https://appmarket.epic.com) → submit app for review → get non-production client ID → test → submit for production | `client_id` + JWKS keypair (asymmetric — no client_secret) |
| **Cerner** | Register at [Code Console](https://code.cerner.com) → create app → configure scopes → receive credentials | `client_id`, `client_secret` |
| **Athena** | Apply at [Athena Marketplace](https://marketplace.athenahealth.com) → developer program onboarding → sandbox access | `client_id`, `client_secret` |
| **eCW** | Contact eCW partner team → complete BAA → receive API credentials | `client_id`, `client_secret` |

##### 4-D: Store discovery results
- [ ] Add `smart_config` JSONB column to `ehr_connections` to cache the discovery document per connection:

```sql
ALTER TABLE ehr_connections ADD COLUMN IF NOT EXISTS smart_config JSONB;
```

##### 4-E: Add discovery endpoint
- [ ] In `backend/src/routes/ehr.js`, add:

```javascript
// GET /api/ehr/connections/:id/smart-config
// Fetches (or returns cached) SMART configuration for the connection's FHIR server
router.get('/connections/:id/smart-config', authenticateToken, authorizeRoles('admin','manager'), async (req, res) => {
  const conn = await getConnectionById(req.params.id);
  const config = await discoverSmartConfig(conn.fhir_base_url);
  // Cache in DB for offline reference
  await pool.query('UPDATE ehr_connections SET smart_config = $1 WHERE connection_id = $2', [config, conn.connection_id]);
  res.json(config);
});
```

#### Verification

- [ ] `discoverSmartConfig('https://fhir.epic.com/...')` returns an object with `authorization_endpoint` and `token_endpoint`
- [ ] Cache works: second call within 1 hour does NOT make an HTTP request
- [ ] Fallback to `/metadata` works when `.well-known` returns 404
- [ ] `GET /api/ehr/connections/:id/smart-config` returns the SMART config JSON
- [ ] Registration accounts created for ModMed (sandbox) and Epic (App Orchard non-production)

---

### 5. OAuth 2.0 authorization code flow

**Goal:** Implement the full SMART on FHIR authorization code grant — redirect to EHR, handle callback, exchange code for tokens, and handle scope negotiation.

**Background:** SMART on FHIR uses standard OAuth 2.0 authorization code flow with PKCE. DermMap acts as a **confidential client** (backend has a client_secret or private key), except for Epic which uses asymmetric JWT client authentication.

#### Files affected

| File | Change |
|------|--------|
| `backend/src/services/ehr/oauthService.js` | New file — authorization URL builder, code exchange, PKCE |
| `backend/src/routes/ehr.js` | Implement `GET /api/ehr/authorize/:connectionId` and `GET /api/ehr/callback` |
| `backend/src/services/ehr/vendors/base.js` | Add `buildAuthUrl()` and `exchangeCode()` to interface |

#### Step-by-step

##### 5-A: Implement PKCE (Proof Key for Code Exchange)
- [ ] Generate `code_verifier` (43–128 char random string) and `code_challenge` (S256 hash):

```javascript
import crypto from 'crypto';

export function generatePKCE() {
  const verifier = crypto.randomBytes(32).toString('base64url');
  const challenge = crypto.createHash('sha256').update(verifier).digest('base64url');
  return { verifier, challenge };
}
```

##### 5-B: Build the authorization URL
- [ ] Create `oauthService.js` with `buildAuthorizationUrl()`:

```javascript
export async function buildAuthorizationUrl(connection) {
  const smartConfig = await discoverSmartConfig(connection.fhir_base_url);
  const { verifier, challenge } = generatePKCE();
  const state = crypto.randomBytes(16).toString('hex');

  // Persist state + verifier in DB (short-lived — expires in 10 min)
  await pool.query(
    `INSERT INTO ehr_oauth_state (state, connection_id, code_verifier, expires_at)
     VALUES ($1, $2, $3, NOW() + INTERVAL '10 minutes')`,
    [state, connection.connection_id, verifier]
  );

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: connection.client_id,
    redirect_uri: process.env.EHR_OAUTH_CALLBACK_URL,
    scope: connection.scopes.join(' '),
    state,
    aud: connection.fhir_base_url,
    code_challenge: challenge,
    code_challenge_method: 'S256',
  });

  return `${smartConfig.authorization_endpoint}?${params.toString()}`;
}
```

##### 5-C: Create OAuth state table
- [ ] Add a short-lived table for PKCE state:

```sql
CREATE TABLE IF NOT EXISTS ehr_oauth_state (
  state           VARCHAR(64) PRIMARY KEY,
  connection_id   UUID NOT NULL REFERENCES ehr_connections(connection_id),
  code_verifier   VARCHAR(128) NOT NULL,
  expires_at      TIMESTAMPTZ NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_ehr_oauth_state_expires ON ehr_oauth_state(expires_at);
```

- [ ] Add a cleanup job: `DELETE FROM ehr_oauth_state WHERE expires_at < NOW()` (run every 15 min via `node-cron`)

##### 5-D: Implement the OAuth callback handler
- [ ] Handle the EHR's redirect back to DermMap after user authorization:

```javascript
// GET /api/ehr/callback?code=...&state=...
export async function handleOAuthCallback(req, res) {
  const { code, state, error, error_description } = req.query;

  // 1. Validate state exists and hasn't expired
  const stateRow = await pool.query(
    'SELECT * FROM ehr_oauth_state WHERE state = $1 AND expires_at > NOW()',
    [state]
  );
  if (!stateRow.rows.length) return res.status(400).json({ error: 'Invalid or expired state' });

  // 2. Handle EHR authorization errors
  if (error) {
    await pool.query('UPDATE ehr_connections SET status = $1, last_error = $2 WHERE connection_id = $3',
      ['error', error_description || error, stateRow.rows[0].connection_id]);
    return res.redirect('/ehr?error=' + encodeURIComponent(error_description || error));
  }

  // 3. Exchange authorization code for tokens
  const connection = await getConnectionById(stateRow.rows[0].connection_id);
  const smartConfig = await discoverSmartConfig(connection.fhir_base_url);
  const tokenResponse = await exchangeCodeForTokens(smartConfig.token_endpoint, {
    code,
    client_id: connection.client_id,
    redirect_uri: process.env.EHR_OAUTH_CALLBACK_URL,
    code_verifier: stateRow.rows[0].code_verifier,
    vendor: connection.vendor,
  });

  // 4. Store encrypted tokens
  await storeTokens(connection.connection_id, tokenResponse);

  // 5. Update connection status
  await pool.query('UPDATE ehr_connections SET status = $1, last_error = NULL WHERE connection_id = $2',
    ['connected', connection.connection_id]);

  // 6. Clean up PKCE state
  await pool.query('DELETE FROM ehr_oauth_state WHERE state = $1', [state]);

  // 7. Redirect back to EHR page
  res.redirect('/ehr?connected=' + connection.vendor);
}
```

##### 5-E: Implement code-for-token exchange
- [ ] Handle the token request — differs per vendor:

```javascript
async function exchangeCodeForTokens(tokenEndpoint, { code, client_id, redirect_uri, code_verifier, vendor }) {
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri,
    code_verifier,
  });

  const headers = { 'Content-Type': 'application/x-www-form-urlencoded' };

  if (vendor === 'epic') {
    // Epic uses JWT client assertion (asymmetric — RS384)
    body.set('client_assertion_type', 'urn:ietf:params:oauth:client-assertion-type:jwt-bearer');
    body.set('client_assertion', await buildEpicClientAssertion(client_id, tokenEndpoint));
  } else {
    // Other vendors use client_id + client_secret (symmetric)
    body.set('client_id', client_id);
    body.set('client_secret', getVendorSecret(vendor));
  }

  const res = await fetch(tokenEndpoint, { method: 'POST', headers, body: body.toString() });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(`Token exchange failed: ${err.error_description || err.error}`);
  }
  return res.json();
  // Returns: { access_token, token_type, expires_in, scope, refresh_token?, patient?, encounter? }
}
```

##### 5-F: Epic-specific JWT client assertion
- [ ] Build a signed JWT for Epic's asymmetric auth (RS384):

```javascript
import * as jose from 'node-jose';
import fs from 'fs';

async function buildEpicClientAssertion(clientId, tokenEndpoint) {
  const privateKeyPem = fs.readFileSync(process.env.EHR_EPIC_PRIVATE_KEY_PATH, 'utf8');
  const key = await jose.JWK.asKey(privateKeyPem, 'pem');
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: clientId,
    sub: clientId,
    aud: tokenEndpoint,
    jti: crypto.randomUUID(),
    exp: now + 300,   // 5-minute expiry per Epic spec
    iat: now,
  };
  const token = await jose.JWS.createSign({ format: 'compact', fields: { typ: 'JWT', alg: 'RS384' } }, key)
    .update(JSON.stringify(payload)).final();
  return token;
}
```

#### Verification

- [ ] `buildAuthorizationUrl()` generates a URL with all required params: `response_type`, `client_id`, `redirect_uri`, `scope`, `state`, `aud`, `code_challenge`, `code_challenge_method`
- [ ] PKCE `code_challenge` matches `code_verifier` when verified server-side
- [ ] Expired state (>10 min) is rejected with 400
- [ ] Replay of the same `state` value is rejected (row deleted after use)
- [ ] Token exchange returns `access_token` + `expires_in` from sandbox
- [ ] Epic JWT assertion passes validation at `https://fhir.epic.com/` sandbox
- [ ] Error from EHR (user denies consent) redirects to `/ehr?error=...` with message

---

### 6. Token management — storage, refresh, and revocation

**Goal:** Securely store access/refresh tokens using AES-256-GCM encryption, implement automatic refresh 5 minutes before expiry, and handle revocation on disconnect.

**HIPAA:** §164.312(a)(2)(iv) — Encryption and decryption of ePHI access credentials.

#### Files affected

| File | Change |
|------|--------|
| `backend/src/services/ehr/tokenManager.js` | New file — encrypt, decrypt, store, refresh, revoke tokens |
| `backend/src/services/ehr/syncEngine.js` | Call `getValidToken()` before every FHIR API request |

#### Step-by-step

##### 6-A: Implement AES-256-GCM token encryption
- [ ] Create `tokenManager.js`:

```javascript
import crypto from 'crypto';
import pool from '../../db/pool.js';

const ENCRYPTION_KEY = Buffer.from(process.env.EHR_TOKEN_ENCRYPTION_KEY, 'hex'); // 32 bytes
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;

function encrypt(plaintext) {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv('aes-256-gcm', ENCRYPTION_KEY, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  // Format: iv:tag:ciphertext (all base64)
  return `${iv.toString('base64')}:${tag.toString('base64')}:${encrypted.toString('base64')}`;
}

function decrypt(encoded) {
  const [ivB64, tagB64, dataB64] = encoded.split(':');
  const iv = Buffer.from(ivB64, 'base64');
  const tag = Buffer.from(tagB64, 'base64');
  const data = Buffer.from(dataB64, 'base64');
  const decipher = crypto.createDecipheriv('aes-256-gcm', ENCRYPTION_KEY, iv);
  decipher.setAuthTag(tag);
  return decipher.update(data, null, 'utf8') + decipher.final('utf8');
}
```

##### 6-B: Store tokens after OAuth exchange
- [ ] Add `storeTokens()`:

```javascript
export async function storeTokens(connectionId, tokenResponse) {
  const expiresAt = new Date(Date.now() + tokenResponse.expires_in * 1000);
  await pool.query(`
    INSERT INTO ehr_tokens (connection_id, access_token, refresh_token, token_type, scope, expires_at, patient_context, encounter_context)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    ON CONFLICT (connection_id) DO UPDATE SET
      access_token = EXCLUDED.access_token,
      refresh_token = COALESCE(EXCLUDED.refresh_token, ehr_tokens.refresh_token),
      scope = EXCLUDED.scope,
      expires_at = EXCLUDED.expires_at,
      patient_context = EXCLUDED.patient_context,
      encounter_context = EXCLUDED.encounter_context,
      issued_at = NOW()
  `, [
    connectionId,
    encrypt(tokenResponse.access_token),
    tokenResponse.refresh_token ? encrypt(tokenResponse.refresh_token) : null,
    tokenResponse.token_type || 'Bearer',
    tokenResponse.scope,
    expiresAt,
    tokenResponse.patient || null,
    tokenResponse.encounter || null,
  ]);
}
```

##### 6-C: Retrieve a valid token (auto-refresh if near expiry)
- [ ] Add `getValidToken()` — the primary function called before every FHIR request:

```javascript
const REFRESH_BUFFER_MS = 300000; // 5 minutes before expiry

export async function getValidToken(connectionId) {
  const { rows } = await pool.query(
    'SELECT * FROM ehr_tokens WHERE connection_id = $1', [connectionId]
  );
  if (!rows.length) throw new Error('No tokens found — connection requires authorization');

  const token = rows[0];
  const expiresAt = new Date(token.expires_at).getTime();

  if (Date.now() + REFRESH_BUFFER_MS < expiresAt) {
    // Token is still valid
    return decrypt(token.access_token);
  }

  // Token expired or about to expire — refresh
  if (!token.refresh_token) {
    throw new Error('Access token expired and no refresh token available — re-authorization required');
  }

  const connection = await getConnectionById(connectionId);
  const vendor = getVendorAdapter(connection.vendor);
  const newTokens = await vendor.refreshToken(decrypt(token.refresh_token));
  await storeTokens(connectionId, newTokens);
  return decrypt(encrypt(newTokens.access_token)); // return the new token
}
```

##### 6-D: Implement token refresh per vendor
- [ ] In each vendor adapter's `refreshToken()`:

```javascript
// Standard OAuth 2.0 refresh (ModMed, Cerner, Athena, eCW)
async refreshToken(refreshToken) {
  const smartConfig = await discoverSmartConfig(this.connection.fhir_base_url);
  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
    client_id: this.connection.client_id,
    client_secret: getVendorSecret(this.connection.vendor),
  });
  const res = await fetch(smartConfig.token_endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });
  if (!res.ok) throw new Error('Token refresh failed — re-authorization required');
  return res.json();
}

// Epic: uses JWT assertion instead of client_secret (same as initial exchange)
```

##### 6-E: Revoke tokens on disconnect
- [ ] When an admin disconnects an EHR connection, revoke tokens at the EHR and delete locally:

```javascript
export async function revokeTokens(connectionId) {
  const { rows } = await pool.query('SELECT * FROM ehr_tokens WHERE connection_id = $1', [connectionId]);
  if (rows.length && rows[0].refresh_token) {
    try {
      const connection = await getConnectionById(connectionId);
      const smartConfig = await discoverSmartConfig(connection.fhir_base_url);
      if (smartConfig.revocation_endpoint) {
        await fetch(smartConfig.revocation_endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            token: decrypt(rows[0].refresh_token),
            token_type_hint: 'refresh_token',
          }).toString(),
        });
      }
    } catch { /* best-effort — token may already be invalid */ }
  }
  await pool.query('DELETE FROM ehr_tokens WHERE connection_id = $1', [connectionId]);
  await pool.query("UPDATE ehr_connections SET status = 'disconnected' WHERE connection_id = $1", [connectionId]);
}
```

##### 6-F: Scheduled refresh job
- [ ] Add a `node-cron` job that refreshes tokens expiring within the next 10 minutes:

```javascript
import cron from 'node-cron';

// Every 5 minutes: refresh tokens that expire within 10 minutes
cron.schedule('*/5 * * * *', async () => {
  const { rows } = await pool.query(
    "SELECT connection_id FROM ehr_tokens WHERE expires_at < NOW() + INTERVAL '10 minutes' AND expires_at > NOW()"
  );
  for (const row of rows) {
    try { await getValidToken(row.connection_id); }
    catch (err) { console.error(`Token refresh failed for ${row.connection_id}:`, err.message); }
  }
});
```

#### Verification

- [ ] `encrypt()` → `decrypt()` round-trip produces the original plaintext
- [ ] Tokens in `ehr_tokens` table are encrypted (not readable as JSON/JWT)
- [ ] `getValidToken()` returns a decrypted token when not expired
- [ ] `getValidToken()` automatically refreshes when token is within 5 min of expiry
- [ ] `getValidToken()` throws when token expired AND no refresh token
- [ ] `revokeTokens()` deletes the DB row and calls the EHR revocation endpoint
- [ ] Cron job runs every 5 minutes and pre-refreshes expiring tokens
- [ ] `EHR_TOKEN_ENCRYPTION_KEY` env var validated at startup (reject if missing or wrong length)

---

---

## PHASE 2 — FHIR R4 Resource Mapping

<!-- SECTION: PHASE_2 — to be filled -->

### 7. FHIR Patient resource — pull demographics

**Goal:** Pull patient demographics from the EHR's FHIR Patient resource and map to DermMap's `patients` table. This is the foundation for all other resource syncs — every Observation, Encounter, etc. references a Patient.

**Direction:** ← Pull (EHR → DermMap)  
**Trigger:** Daily scheduled pull at 6 AM + on-demand when provider opens a patient chart  
**FHIR Resource:** `Patient` ([spec](https://hl7.org/fhir/R4/patient.html))

#### Files affected

| File | Change |
|------|--------|
| `backend/src/services/ehr/resourceMappers.js` | Add `fhirPatientToDermMap()` and `dermMapPatientToFhir()` |
| `backend/src/services/ehr/fhirClient.js` | Add `searchPatients()` and `readPatient()` |
| `backend/src/routes/ehr.js` | Add `POST /api/ehr/sync/pull-patient/:connectionId` |

#### Step-by-step

##### 7-A: Implement `fhirPatientToDermMap()` mapper
- [ ] Map FHIR Patient fields to DermMap `patients` columns:

```javascript
export function fhirPatientToDermMap(fhirPatient) {
  const name = fhirPatient.name?.find(n => n.use === 'official') || fhirPatient.name?.[0] || {};
  const phone = fhirPatient.telecom?.find(t => t.system === 'phone');
  const email = fhirPatient.telecom?.find(t => t.system === 'email');
  const address = fhirPatient.address?.[0];
  const mrn = fhirPatient.identifier?.find(i =>
    i.type?.coding?.some(c => c.code === 'MR')
  )?.value;

  return {
    mrn: mrn || fhirPatient.id,
    first_name: name.given?.join(' ') || '',
    last_name: name.family || '',
    date_of_birth: fhirPatient.birthDate,             // FHIR: YYYY-MM-DD
    sex: mapFhirGender(fhirPatient.gender),            // male→M, female→F, other→O, unknown→U
    phone: phone?.value || null,
    email: email?.value || null,
    // Address (not currently in DermMap schema — store in metadata for future use)
  };
}

function mapFhirGender(gender) {
  const map = { male: 'M', female: 'F', other: 'O', unknown: 'U' };
  return map[gender] || 'U';
}
```

##### 7-B: Implement FHIR Patient search
- [ ] In `fhirClient.js`, add patient search by MRN or name:

```javascript
export async function searchPatients(connectionId, params = {}) {
  const token = await getValidToken(connectionId);
  const connection = await getConnectionById(connectionId);
  const client = new FhirKitClient({ baseUrl: connection.fhir_base_url });
  client.bearerToken = token;

  return client.search({
    resourceType: 'Patient',
    searchParams: params,  // e.g. { identifier: 'MRN|204819' } or { name: 'Chen' }
  });
}

export async function readPatient(connectionId, fhirPatientId) {
  const token = await getValidToken(connectionId);
  const connection = await getConnectionById(connectionId);
  const client = new FhirKitClient({ baseUrl: connection.fhir_base_url });
  client.bearerToken = token;

  return client.read({ resourceType: 'Patient', id: fhirPatientId });
}
```

##### 7-C: Implement pull logic with upsert
- [ ] Pull a patient by FHIR ID, map to DermMap, and upsert:

```javascript
export async function pullPatient(connectionId, fhirPatientId) {
  const fhirPatient = await readPatient(connectionId, fhirPatientId);
  const dermMapData = fhirPatientToDermMap(fhirPatient);

  // Check if this FHIR patient already maps to a DermMap patient
  const existing = await pool.query(
    'SELECT dermmap_id FROM ehr_resource_map WHERE connection_id = $1 AND fhir_resource_type = $2 AND fhir_resource_id = $3',
    [connectionId, 'Patient', fhirPatientId]
  );

  if (existing.rows.length) {
    // Update existing patient
    await pool.query(
      'UPDATE patients SET first_name=$1, last_name=$2, date_of_birth=$3, sex=$4, phone=$5, email=$6, updated_at=NOW() WHERE patient_id=$7',
      [dermMapData.first_name, dermMapData.last_name, dermMapData.date_of_birth,
       dermMapData.sex, dermMapData.phone, dermMapData.email, existing.rows[0].dermmap_id]
    );
  } else {
    // Insert new patient + create resource map entry
    const { rows } = await pool.query(
      'INSERT INTO patients (mrn, first_name, last_name, date_of_birth, sex, phone, email) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING patient_id',
      [dermMapData.mrn, dermMapData.first_name, dermMapData.last_name, dermMapData.date_of_birth,
       dermMapData.sex, dermMapData.phone, dermMapData.email]
    );
    await pool.query(
      'INSERT INTO ehr_resource_map (connection_id, dermmap_entity, dermmap_id, fhir_resource_type, fhir_resource_id, fhir_version_id) VALUES ($1,$2,$3,$4,$5,$6)',
      [connectionId, 'patient', rows[0].patient_id, 'Patient', fhirPatientId, fhirPatient.meta?.versionId]
    );
  }

  return dermMapData;
}
```

##### 7-D: Scheduled bulk pull (daily at 6 AM)
- [ ] Add a cron job that pulls all patients seen in the last 7 days:

```javascript
// Daily at 6 AM: pull updated patient demographics
cron.schedule('0 6 * * *', async () => {
  const connections = await pool.query("SELECT * FROM ehr_connections WHERE status = 'connected' AND enabled = true");
  for (const conn of connections.rows) {
    const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0];
    const bundle = await searchPatients(conn.connection_id, { _lastUpdated: `ge${sevenDaysAgo}` });
    for (const entry of bundle.entry || []) {
      await pullPatient(conn.connection_id, entry.resource.id);
    }
    await pool.query('UPDATE ehr_connections SET last_sync_at = NOW() WHERE connection_id = $1', [conn.connection_id]);
  }
});
```

#### Verification

- [ ] `fhirPatientToDermMap()` correctly maps a sample Epic/ModMed Patient JSON to DermMap fields
- [ ] MRN extracted from `identifier` array where `type.coding.code === 'MR'`
- [ ] Gender mapping: `male` → `M`, `female` → `F`, `other` → `O`, `unknown` → `U`
- [ ] Upsert: pulling the same patient twice does NOT create duplicates
- [ ] Resource map entry created with `fhir_resource_id` and `fhir_version_id`
- [ ] Daily cron job pulls patients updated in last 7 days
- [ ] HIPAA audit log entry created for each patient pull

---

### 8. FHIR Observation resource — push lesion findings

**Goal:** Map DermMap lesion ABCDE documentation to FHIR Observation resources with SNOMED CT coding and push to the EHR after provider sign-off.

**Direction:** → Push (DermMap → EHR)  
**Trigger:** After provider signs off on visit (visit status → `signed`)  
**FHIR Resource:** `Observation` ([spec](https://hl7.org/fhir/R4/observation.html))

#### Files affected

| File | Change |
|------|--------|
| `backend/src/services/ehr/resourceMappers.js` | Add `dermMapLesionToFhirObservation()` |
| `backend/src/services/ehr/fhirClient.js` | Add `createObservation()` and `updateObservation()` |
| `backend/src/services/ehr/syncEngine.js` | Enqueue observation push on visit sign-off |

#### Step-by-step

##### 8-A: Define SNOMED CT code mappings
- [ ] Create a lookup table for DermMap fields → SNOMED CT codes:

```javascript
const SNOMED = {
  SKIN_LESION:    { system: 'http://snomed.info/sct', code: '400010006', display: 'Skin lesion' },
  LESION_SIZE:    { system: 'http://snomed.info/sct', code: '246116008', display: 'Lesion size' },
  LESION_SHAPE:   { system: 'http://snomed.info/sct', code: '246196000', display: 'Shape of lesion' },
  LESION_COLOR:   { system: 'http://snomed.info/sct', code: '255438004', display: 'Color' },
  BODY_SITE:      { system: 'http://snomed.info/sct', code: '368209003', display: 'Body site' },
  BORDER:         { system: 'http://snomed.info/sct', code: '112233009', display: 'Border regularity' },
  ASYMMETRY:      { system: 'http://snomed.info/sct', code: '255403003', display: 'Asymmetry finding' },
};

const UCUM = { system: 'http://unitsofmeasure.org' };
```

##### 8-B: Implement `dermMapLesionToFhirObservation()`
- [ ] Build a FHIR Observation from a DermMap lesion:

```javascript
export function dermMapLesionToFhirObservation(lesion, patient, visit, provider) {
  const patientFhirId = getResourceMapId('patient', patient.patient_id);

  const observation = {
    resourceType: 'Observation',
    status: visit.status === 'signed' ? 'final' : 'preliminary',
    category: [{ coding: [{ system: 'http://terminology.hl7.org/CodeSystem/observation-category', code: 'exam', display: 'Exam' }] }],
    code: { coding: [SNOMED.SKIN_LESION] },
    subject: { reference: `Patient/${patientFhirId}`, display: `${patient.last_name}, ${patient.first_name}` },
    effectiveDateTime: visit.visit_date,
    performer: [{ reference: `Practitioner/${provider.id}`, display: provider.name }],
    component: [],
    extension: [],
  };

  // ABCDE components
  if (lesion.size_mm != null) {
    observation.component.push({
      code: { coding: [SNOMED.LESION_SIZE] },
      valueQuantity: { value: lesion.size_mm, unit: 'mm', system: UCUM.system, code: 'mm' },
    });
  }
  if (lesion.shape) {
    observation.component.push({
      code: { coding: [SNOMED.LESION_SHAPE] },
      valueString: lesion.shape,
    });
  }
  if (lesion.color) {
    observation.component.push({
      code: { coding: [SNOMED.LESION_COLOR] },
      valueString: lesion.color,
    });
  }
  if (lesion.border) {
    observation.component.push({
      code: { coding: [SNOMED.BORDER] },
      valueString: lesion.border,
    });
  }
  if (lesion.symmetry) {
    observation.component.push({
      code: { coding: [SNOMED.ASYMMETRY] },
      valueBoolean: lesion.symmetry === 'asymmetric',
    });
  }

  // Body location as extension (DermMap-specific — includes x,y coordinates + region)
  observation.extension.push({
    url: 'https://dermmap.io/fhir/StructureDefinition/lesion-body-location',
    extension: [
      { url: 'region', valueString: lesion.body_region },
      { url: 'view', valueString: lesion.body_view },
      { url: 'x', valueDecimal: lesion.body_location_x },
      { url: 'y', valueDecimal: lesion.body_location_y },
    ],
  });

  // Biopsy result (if performed)
  if (lesion.biopsy_result && lesion.biopsy_result !== 'na' && lesion.biopsy_result !== 'pending') {
    observation.component.push({
      code: { coding: [{ system: 'http://snomed.info/sct', code: '86273004', display: 'Biopsy finding' }] },
      valueString: lesion.biopsy_result,
    });
  }

  // Dermoscopy features (if present)
  if (lesion.dermoscopy_features?.length) {
    observation.component.push({
      code: { coding: [{ system: 'http://snomed.info/sct', code: '53639009', display: 'Dermoscopy' }] },
      valueString: lesion.dermoscopy_features.join(', '),
    });
  }

  return observation;
}
```

##### 8-C: Auto-enqueue on visit sign-off
- [ ] In the visit sign-off handler (existing `visits.js` route), add:

```javascript
// After updating visit status to 'signed':
const connections = await getActiveConnections(req.user.location_id);
for (const conn of connections) {
  for (const lesion of visit.lesions) {
    await enqueueSync({
      connection_id: conn.connection_id,
      direction: 'push',
      resource_type: 'Observation',
      dermmap_entity: 'lesion',
      dermmap_id: lesion.lesion_id,
      fhir_payload: dermMapLesionToFhirObservation(lesion, patient, visit, provider),
      created_by: req.user.id,
    });
  }
}
```

##### 8-D: Handle create vs update (idempotent push)
- [ ] Check `ehr_resource_map` before pushing:

```javascript
async function pushObservation(connectionId, lesionId, observation) {
  const existing = await getResourceMap(connectionId, 'lesion', lesionId, 'Observation');
  const token = await getValidToken(connectionId);
  const connection = await getConnectionById(connectionId);
  const client = new FhirKitClient({ baseUrl: connection.fhir_base_url });
  client.bearerToken = token;

  if (existing) {
    // UPDATE existing observation
    observation.id = existing.fhir_resource_id;
    const result = await client.update({ resourceType: 'Observation', id: observation.id, body: observation });
    await updateResourceMap(existing.map_id, result.meta?.versionId);
  } else {
    // CREATE new observation
    const result = await client.create({ resourceType: 'Observation', body: observation });
    await createResourceMap(connectionId, 'lesion', lesionId, 'Observation', result.id, result.meta?.versionId);
  }
}
```

#### Verification

- [ ] `dermMapLesionToFhirObservation()` produces valid FHIR JSON — validate against `https://www.hl7.org/fhir/R4/observation.html`
- [ ] SNOMED CT codes verified: 400010006 (Skin lesion), 246116008 (Lesion size), 246196000 (Shape), 255438004 (Color)
- [ ] Measurement uses UCUM units (`mm`, not `millimeters`)
- [ ] Body location extension includes region, view, x, y coordinates
- [ ] Observation status is `final` for signed visits, `preliminary` for in-progress
- [ ] Idempotent: pushing the same lesion twice updates (not duplicates)
- [ ] Resource map updated with EHR's `versionId` after successful push
- [ ] Visit sign-off enqueues one Observation per lesion

---

### 9. FHIR Encounter resource — visit mapping

**Goal:** Map DermMap visits to FHIR Encounter resources. Bi-directional: pull EHR encounters to pre-populate visits, push visit metadata after documentation.

**Direction:** ↔ Bi-directional  
**Trigger:** Pull on appointment check-in; Push after provider sign-off  
**FHIR Resource:** `Encounter` ([spec](https://hl7.org/fhir/R4/encounter.html))

#### Files affected

| File | Change |
|------|--------|
| `backend/src/services/ehr/resourceMappers.js` | Add `fhirEncounterToDermMapVisit()` and `dermMapVisitToFhirEncounter()` |
| `backend/src/services/ehr/fhirClient.js` | Add `searchEncounters()`, `createEncounter()` |

#### Step-by-step

##### 9-A: Map FHIR Encounter → DermMap Visit (pull)
- [ ] Implement `fhirEncounterToDermMapVisit()`:

```javascript
export function fhirEncounterToDermMapVisit(encounter) {
  const patientRef = encounter.subject?.reference;  // "Patient/12345"
  const provider = encounter.participant?.find(p =>
    p.type?.some(t => t.coding?.some(c => c.code === 'ATND'))
  );

  return {
    visit_date: encounter.period?.start,
    status: mapEncounterStatus(encounter.status),  // 'arrived' → 'in_progress', 'finished' → 'signed'
    visit_type: encounter.type?.[0]?.text || 'follow-up',
    fhir_patient_ref: patientRef,
    fhir_provider_ref: provider?.individual?.reference,
  };
}

function mapEncounterStatus(fhirStatus) {
  const map = {
    'planned': 'in_progress', 'arrived': 'in_progress', 'in-progress': 'in_progress',
    'finished': 'signed', 'cancelled': 'locked',
  };
  return map[fhirStatus] || 'in_progress';
}
```

##### 9-B: Map DermMap Visit → FHIR Encounter (push)
- [ ] Implement `dermMapVisitToFhirEncounter()`:

```javascript
export function dermMapVisitToFhirEncounter(visit, patient, provider) {
  return {
    resourceType: 'Encounter',
    status: visit.status === 'signed' ? 'finished' : 'in-progress',
    class: { system: 'http://terminology.hl7.org/CodeSystem/v3-ActCode', code: 'AMB', display: 'ambulatory' },
    type: [{ coding: [{ system: 'http://snomed.info/sct', code: '185349003', display: 'Encounter for check up' }], text: visit.visit_type }],
    subject: { reference: `Patient/${getResourceMapId('patient', patient.patient_id)}` },
    participant: [{
      type: [{ coding: [{ system: 'http://terminology.hl7.org/CodeSystem/v3-ParticipationType', code: 'ATND' }] }],
      individual: { reference: `Practitioner/${provider.id}`, display: provider.name },
    }],
    period: { start: visit.visit_date, end: visit.completed_at || undefined },
  };
}
```

##### 9-C: Enqueue encounter push on visit sign-off
- [ ] Add to visit sign-off handler alongside Observation pushes:

```javascript
await enqueueSync({
  connection_id: conn.connection_id,
  direction: 'push',
  resource_type: 'Encounter',
  dermmap_entity: 'visit',
  dermmap_id: visit.visit_id,
  fhir_payload: dermMapVisitToFhirEncounter(visit, patient, provider),
  created_by: req.user.id,
});
```

#### Verification

- [ ] Encounter uses class code `AMB` (ambulatory) — correct for outpatient derm
- [ ] Participant type `ATND` (attending) correctly identifies the provider
- [ ] Status mapping: `signed` → `finished`, `in_progress` → `in-progress`
- [ ] Bi-directional: pulling an Encounter creates a DermMap visit stub; pushing updates the EHR

---

### 10. FHIR DocumentReference — push visit summary PDFs

**Goal:** Upload signed visit summary PDFs to the EHR as FHIR DocumentReference + Binary resources so they appear in the patient chart.

**Direction:** → Push (DermMap → EHR)  
**Trigger:** After provider sign-off (visit status → `signed`)  
**FHIR Resources:** `DocumentReference` + `Binary` ([spec](https://hl7.org/fhir/R4/documentreference.html))

#### Files affected

| File | Change |
|------|--------|
| `backend/src/services/ehr/resourceMappers.js` | Add `dermMapPdfToFhirDocRef()` |
| `backend/src/services/ehr/fhirClient.js` | Add `createDocumentReference()`, `createBinary()` |

#### Step-by-step

##### 10-A: Implement `dermMapPdfToFhirDocRef()`
- [ ] Build a DocumentReference that wraps the visit summary PDF:

```javascript
export function dermMapPdfToFhirDocRef(visit, patient, pdfBase64) {
  return {
    resourceType: 'DocumentReference',
    status: 'current',
    type: { coding: [{ system: 'http://loinc.org', code: '34108-1', display: 'Outpatient Note' }] },
    subject: { reference: `Patient/${getResourceMapId('patient', patient.patient_id)}` },
    date: new Date().toISOString(),
    description: `DermMap Visit Summary — ${visit.visit_date}`,
    content: [{
      attachment: {
        contentType: 'application/pdf',
        data: pdfBase64,   // Base64-encoded PDF (for small docs < 10 MB)
        title: `DermMap_Visit_${visit.visit_id}_${visit.visit_date}.pdf`,
      },
    }],
    context: {
      encounter: [{ reference: `Encounter/${getResourceMapId('visit', visit.visit_id)}` }],
      period: { start: visit.visit_date },
    },
  };
}
```

##### 10-B: Handle large PDFs with Binary resource
- [ ] For PDFs > 5 MB, upload as a separate Binary resource and reference by URL:

```javascript
async function pushLargeDocument(connectionId, visit, patient, pdfBuffer) {
  const client = await getAuthenticatedClient(connectionId);

  // Step 1: Upload Binary
  const binary = await client.create({
    resourceType: 'Binary',
    body: { resourceType: 'Binary', contentType: 'application/pdf', data: pdfBuffer.toString('base64') },
  });

  // Step 2: Create DocumentReference pointing to the Binary
  const docRef = dermMapPdfToFhirDocRef(visit, patient, null);
  docRef.content[0].attachment = { contentType: 'application/pdf', url: `Binary/${binary.id}` };
  return client.create({ resourceType: 'DocumentReference', body: docRef });
}
```

##### 10-C: Generate PDF from visit data
- [ ] Use existing `jspdf` / `html2canvas` (already in frontend dependencies) or generate server-side:

```javascript
// Server-side PDF generation (add pdfkit if needed: npm install pdfkit)
import PDFDocument from 'pdfkit';
export function generateVisitSummaryPdf(visit, patient, lesions) {
  return new Promise((resolve) => {
    const doc = new PDFDocument();
    const buffers = [];
    doc.on('data', chunk => buffers.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(buffers)));

    doc.fontSize(16).text(`Visit Summary — ${patient.first_name} ${patient.last_name}`);
    doc.fontSize(12).text(`Date: ${visit.visit_date}`);
    doc.text(`Status: ${visit.status}`);
    doc.text(`Lesions documented: ${lesions.length}`);
    // ... add lesion details, ABCDE scores, etc.
    doc.end();
  });
}
```

#### Verification

- [ ] DocumentReference uses LOINC code `34108-1` (Outpatient Note)
- [ ] PDF appears in the patient's EHR document list (verify in sandbox)
- [ ] PDFs < 5 MB: inline `data` field in attachment
- [ ] PDFs > 5 MB: separate Binary resource + URL reference
- [ ] Document title includes visit date for easy identification
- [ ] Encounter reference links the document to the correct visit

---

### 11. FHIR DiagnosticReport — biopsy/pathology bi-directional sync

**Goal:** Push biopsy orders to the EHR and pull pathology results back as FHIR DiagnosticReport resources.

**Direction:** ↔ Bi-directional  
**Trigger:** Push when biopsy is performed; Pull via path lab webhook or polling  
**FHIR Resource:** `DiagnosticReport` ([spec](https://hl7.org/fhir/R4/diagnosticreport.html))

#### Files affected

| File | Change |
|------|--------|
| `backend/src/services/ehr/resourceMappers.js` | Add `dermMapBiopsyToFhirDiagReport()` and `fhirDiagReportToDermMapBiopsy()` |
| `backend/src/services/ehr/fhirClient.js` | Add `createDiagnosticReport()`, `searchDiagnosticReports()` |
| `backend/src/services/ehr/webhookHandler.js` | Handle inbound path lab results |

#### Step-by-step

##### 11-A: Map DermMap biopsy → FHIR DiagnosticReport (push)
- [ ] Build DiagnosticReport when `lesion.action` is `biopsy_performed`:

```javascript
export function dermMapBiopsyToFhirDiagReport(lesion, patient, visit) {
  return {
    resourceType: 'DiagnosticReport',
    status: lesion.biopsy_result === 'pending' ? 'registered' : 'final',
    code: { coding: [{ system: 'http://loinc.org', code: '22634-0', display: 'Path report.dermatopathology' }] },
    subject: { reference: `Patient/${getResourceMapId('patient', patient.patient_id)}` },
    encounter: { reference: `Encounter/${getResourceMapId('visit', visit.visit_id)}` },
    effectiveDateTime: visit.visit_date,
    conclusion: lesion.pathology_notes || undefined,
    conclusionCode: lesion.biopsy_result !== 'pending' ? [{
      coding: [{ system: 'http://snomed.info/sct', code: mapBiopsyResult(lesion.biopsy_result), display: lesion.biopsy_result }],
    }] : undefined,
    result: [{ reference: `Observation/${getResourceMapId('lesion', lesion.lesion_id)}` }],
  };
}

function mapBiopsyResult(result) {
  const map = { benign: '30621000', atypical: '112676007', malignant: '86049000' };
  return map[result] || '261665006'; // 'unknown'
}
```

##### 11-B: Map FHIR DiagnosticReport → DermMap biopsy result (pull)
- [ ] When pathology results arrive from the EHR:

```javascript
export function fhirDiagReportToDermMapBiopsy(report) {
  const conclusionCoding = report.conclusionCode?.[0]?.coding?.[0];
  let biopsyResult = 'pending';
  if (conclusionCoding) {
    const reverseMap = { '30621000': 'benign', '112676007': 'atypical', '86049000': 'malignant' };
    biopsyResult = reverseMap[conclusionCoding.code] || conclusionCoding.display || 'pending';
  }
  return {
    biopsy_result: biopsyResult,
    pathology_notes: report.conclusion || null,
    fhir_report_id: report.id,
    report_date: report.effectiveDateTime,
  };
}
```

##### 11-C: Poll for pending pathology results
- [ ] Cron job: every 2 hours, check for pending biopsies and search the EHR for results:

```javascript
cron.schedule('0 */2 * * *', async () => {
  // Find all lesions with biopsy_performed but result = 'pending'
  const pending = await pool.query(
    "SELECT l.lesion_id, l.patient_id, m.connection_id, m.fhir_resource_id FROM lesions l " +
    "JOIN ehr_resource_map m ON m.dermmap_entity = 'lesion' AND m.dermmap_id = l.lesion_id " +
    "WHERE l.biopsy_result = 'pending' AND l.action = 'biopsy_performed'"
  );
  for (const row of pending.rows) {
    const reports = await searchDiagnosticReports(row.connection_id, {
      result: `Observation/${row.fhir_resource_id}`, status: 'final',
    });
    if (reports.entry?.length) {
      const result = fhirDiagReportToDermMapBiopsy(reports.entry[0].resource);
      await pool.query('UPDATE lesions SET biopsy_result = $1, pathology_notes = $2 WHERE lesion_id = $3',
        [result.biopsy_result, result.pathology_notes, row.lesion_id]);
    }
  }
});
```

#### Verification

- [ ] DiagnosticReport uses LOINC code `22634-0` (Path report — dermatopathology)
- [ ] SNOMED codes for biopsy results: benign (30621000), atypical (112676007), malignant (86049000)
- [ ] Push: pending biopsy creates a `registered` report; completed creates `final`
- [ ] Pull: pathology result updates `lesions.biopsy_result` and `pathology_notes`
- [ ] Polling runs every 2 hours for pending biopsies
- [ ] Webhook handler (Task 20) can receive real-time results from path lab

---

### 12. FHIR Appointment resource — schedule pull

**Goal:** Pull today's appointments from the EHR so MAs can see the day's schedule and prep patient charts.

**Direction:** ← Pull (EHR → DermMap)  
**Trigger:** Real-time webhook (if vendor supports) + manual refresh + daily 5:30 AM pull  
**FHIR Resource:** `Appointment` ([spec](https://hl7.org/fhir/R4/appointment.html))

#### Files affected

| File | Change |
|------|--------|
| `backend/src/services/ehr/resourceMappers.js` | Add `fhirAppointmentToDermMapSchedule()` |
| `backend/src/services/ehr/fhirClient.js` | Add `searchAppointments()` |
| `backend/src/routes/ehr.js` | Add `GET /api/ehr/appointments/:connectionId` |

#### Step-by-step

##### 12-A: Map FHIR Appointment → DermMap schedule entry
- [ ] Implement `fhirAppointmentToDermMapSchedule()`:

```javascript
export function fhirAppointmentToDermMapSchedule(appointment) {
  const patient = appointment.participant?.find(p =>
    p.actor?.reference?.startsWith('Patient/')
  );
  const provider = appointment.participant?.find(p =>
    p.actor?.reference?.startsWith('Practitioner/')
  );

  return {
    appointment_date: appointment.start,
    appointment_end: appointment.end,
    status: mapAppointmentStatus(appointment.status),
    appointment_type: appointment.appointmentType?.text || appointment.serviceType?.[0]?.text || 'Office Visit',
    fhir_patient_ref: patient?.actor?.reference,
    fhir_provider_ref: provider?.actor?.reference,
    patient_name: patient?.actor?.display,
    provider_name: provider?.actor?.display,
    duration_minutes: appointment.minutesDuration,
    notes: appointment.comment || null,
  };
}

function mapAppointmentStatus(fhirStatus) {
  const map = { proposed: 'pending', pending: 'pending', booked: 'confirmed',
                 arrived: 'checked_in', fulfilled: 'completed', cancelled: 'cancelled', noshow: 'no_show' };
  return map[fhirStatus] || 'pending';
}
```

##### 12-B: Search today's appointments
- [ ] In `fhirClient.js`:

```javascript
export async function searchAppointments(connectionId, date) {
  const client = await getAuthenticatedClient(connectionId);
  return client.search({
    resourceType: 'Appointment',
    searchParams: {
      date: date || new Date().toISOString().split('T')[0],
      status: 'booked,arrived',
      _sort: 'date',
      _count: 100,
    },
  });
}
```

##### 12-C: Daily schedule pre-load (5:30 AM)
- [ ] Cron job to pull today's appointments before the clinic opens:

```javascript
cron.schedule('30 5 * * 1-6', async () => {  // Mon-Sat at 5:30 AM
  const connections = await pool.query("SELECT * FROM ehr_connections WHERE status = 'connected' AND enabled = true");
  for (const conn of connections.rows) {
    const bundle = await searchAppointments(conn.connection_id);
    for (const entry of bundle.entry || []) {
      const sched = fhirAppointmentToDermMapSchedule(entry.resource);
      // Upsert into local schedule table
      await upsertScheduleEntry(conn.location_id, sched, entry.resource.id);
    }
  }
});
```

##### 12-D: On-demand refresh endpoint
- [ ] `GET /api/ehr/appointments/:connectionId?date=2026-03-12` — returns today's schedule:

```javascript
router.get('/appointments/:connectionId', authenticateToken, async (req, res) => {
  const date = req.query.date || new Date().toISOString().split('T')[0];
  const bundle = await searchAppointments(req.params.connectionId, date);
  const appointments = (bundle.entry || []).map(e => fhirAppointmentToDermMapSchedule(e.resource));
  res.json(appointments);
});
```

#### Verification

- [ ] Appointment search returns only the specified date's appointments
- [ ] Status mapping: `booked` → `confirmed`, `arrived` → `checked_in`, `noshow` → `no_show`
- [ ] Duration, patient name, and provider name correctly extracted from `participant` array
- [ ] Daily cron runs at 5:30 AM Mon–Sat
- [ ] On-demand refresh returns fresh data (not cached)

---

### 13. FHIR Media + Binary — photo attachments

**Goal:** Push clinical and dermoscopic photos to the EHR as FHIR Media resources with Binary payloads so they appear in the patient's image gallery.

**Direction:** → Push (DermMap → EHR)  
**Trigger:** After provider sign-off (alongside Observation and DocumentReference)  
**FHIR Resources:** `Media` + `Binary` ([spec](https://hl7.org/fhir/R4/media.html))  
**Note:** This is the most bandwidth-intensive operation. Photo push should be queued with lower priority than text-based resources.

#### Files affected

| File | Change |
|------|--------|
| `backend/src/services/ehr/resourceMappers.js` | Add `dermMapPhotoToFhirMedia()` |
| `backend/src/services/ehr/fhirClient.js` | Add `createMedia()`, `createBinary()` |
| `backend/src/services/ehr/syncEngine.js` | Add photo push with size-based batching |

#### Step-by-step

##### 13-A: Map DermMap photo → FHIR Media
- [ ] Build a Media resource from a DermMap photo record:

```javascript
export function dermMapPhotoToFhirMedia(photo, lesion, patient) {
  return {
    resourceType: 'Media',
    status: 'completed',
    type: { coding: [{ system: 'http://terminology.hl7.org/CodeSystem/media-type', code: 'image', display: 'Image' }] },
    modality: photo.capture_type === 'dermoscopic'
      ? { coding: [{ system: 'http://dicom.nema.org/resources/ontology/DCM', code: 'DMS', display: 'Dermoscopy' }] }
      : { coding: [{ system: 'http://dicom.nema.org/resources/ontology/DCM', code: 'XC', display: 'External-camera Photography' }] },
    subject: { reference: `Patient/${getResourceMapId('patient', patient.patient_id)}` },
    createdDateTime: photo.captured_at,
    bodySite: { coding: [{ system: 'http://snomed.info/sct', code: '368209003', display: lesion.body_region }] },
    content: {
      contentType: photo.mime_type || 'image/jpeg',
      // data filled below (small) or url to Binary (large)
      width: photo.width_px,
      height: photo.height_px,
      title: `${photo.capture_type}_${lesion.body_region}_${photo.photo_id}`,
    },
    note: [{ text: `DermMap Lesion ID: ${lesion.lesion_id}, Region: ${lesion.body_region}, View: ${lesion.body_view}` }],
  };
}
```

##### 13-B: Upload photo Binary + link to Media
- [ ] Two-step upload (Binary → Media):

```javascript
async function pushPhoto(connectionId, photo, lesion, patient) {
  const client = await getAuthenticatedClient(connectionId);

  // Step 1: Download photo from S3 (signed URL)
  const photoBuffer = await downloadFromS3(photo.storage_key, photo.storage_bucket);

  // Step 2: Upload as FHIR Binary
  const binary = await client.create({
    resourceType: 'Binary',
    body: { resourceType: 'Binary', contentType: photo.mime_type || 'image/jpeg', data: photoBuffer.toString('base64') },
  });

  // Step 3: Create Media referencing the Binary
  const media = dermMapPhotoToFhirMedia(photo, lesion, patient);
  media.content.url = `Binary/${binary.id}`;
  const result = await client.create({ resourceType: 'Media', body: media });

  // Step 4: Record mapping
  await createResourceMap(connectionId, 'photo', photo.photo_id, 'Media', result.id, result.meta?.versionId);
}
```

##### 13-C: Size-based batching and throttling
- [ ] Photos can be large (5–20 MB each). Queue with lower priority and batch limits:

```javascript
// In syncEngine.js:
const PHOTO_BATCH_SIZE = 5;           // max photos per push cycle
const PHOTO_MAX_PAYLOAD_MB = 50;      // max total MB per push cycle

async function processPhotoQueue(connectionId) {
  const queue = await pool.query(
    "SELECT * FROM ehr_sync_queue WHERE connection_id = $1 AND resource_type = 'Media' AND status = 'pending' ORDER BY created_at LIMIT $2",
    [connectionId, PHOTO_BATCH_SIZE]
  );
  let totalBytes = 0;
  for (const item of queue.rows) {
    const photo = await getPhotoById(item.dermmap_id);
    if (totalBytes + (photo.file_size || 0) > PHOTO_MAX_PAYLOAD_MB * 1024 * 1024) break;
    totalBytes += photo.file_size || 0;
    await processQueueItem(item);
  }
}
```

##### 13-D: Vendor-specific photo limitations
- [ ] Document known constraints:

| Vendor | Max Image Size | Supported Formats | Notes |
|--------|---------------|-------------------|-------|
| **ModMed** | 20 MB | JPEG, PNG | Proprietary media endpoint (not FHIR) |
| **Epic** | 10 MB | JPEG, PNG, DICOM | Uses `DocumentReference` not `Media` for some orgs |
| **Cerner** | 10 MB | JPEG, PNG | Binary → DocumentReference preferred |
| **Athena** | 5 MB | JPEG, PNG | Must use clinical document API |
| **eCW** | 5 MB | JPEG | Limited format support |

#### Verification

- [ ] DICOM modality code: `DMS` for dermoscopy, `XC` for clinical photo
- [ ] Body site coded with SNOMED CT
- [ ] Binary uploaded before Media (proper reference chain)
- [ ] Batch limiter prevents more than 50 MB per push cycle
- [ ] Photos appear in EHR patient chart image gallery (sandbox)
- [ ] Large photos (>10 MB) are compressed before upload if vendor has size limits

---

---

## PHASE 3 — Vendor-Specific Modules

<!-- SECTION: PHASE_3 — to be filled -->

### 14. Modernizing Medicine (EMA) adapter

**Goal:** Implement ModMed's API adapter — the primary derm-specific EHR. ModMed uses a hybrid REST + FHIR API with some proprietary endpoints alongside FHIR R4.

**Priority:** 1 (most dermatology practices use ModMed EMA)  
**API Type:** REST + FHIR R4 hybrid  
**Auth:** OAuth 2.0 (client credentials + authorization code)  
**Sandbox:** [developer.modmed.com](https://developer.modmed.com)

#### Files affected

| File | Change |
|------|--------|
| `backend/src/services/ehr/vendors/modmed.js` | New file — ModMed adapter extending BaseVendorAdapter |

#### Step-by-step

##### 14-A: Register for ModMed API access
- [ ] Apply at ModMed Developer Portal → complete use-case questionnaire
- [ ] Receive sandbox `client_id` and `client_secret`
- [ ] Store in environment: `EHR_MODMED_CLIENT_ID`, `EHR_MODMED_CLIENT_SECRET`
- [ ] Note: ModMed requires a BAA before production access

##### 14-B: Implement ModMed adapter
- [ ] Create `backend/src/services/ehr/vendors/modmed.js`:

```javascript
import { BaseVendorAdapter } from './base.js';

export class ModMedAdapter extends BaseVendorAdapter {
  getScopes() {
    return [
      'launch/patient',
      'patient/Patient.read',
      'patient/Appointment.read',
      'patient/Observation.write',
      'patient/DocumentReference.write',
      'patient/DiagnosticReport.read',
      'patient/DiagnosticReport.write',
    ];
  }

  // ModMed-specific: practice ID required in API calls
  getPracticeId() {
    return this.connection.metadata?.practiceId;
  }

  // ModMed has a proprietary patient search endpoint alongside FHIR
  async searchPatientsByMRN(mrn) {
    // Use FHIR search first; fall back to proprietary if needed
    return this.fhirSearch('Patient', { identifier: `MRN|${mrn}` });
  }

  // ModMed supports real-time appointment webhooks
  supportsWebhooks() { return true; }
  getWebhookSignatureHeader() { return 'X-ModMed-Signature'; }

  async verifyWebhookSignature(payload, signature) {
    // HMAC-SHA256 verification using webhook secret
    const hmac = crypto.createHmac('sha256', process.env.EHR_MODMED_WEBHOOK_SECRET);
    hmac.update(typeof payload === 'string' ? payload : JSON.stringify(payload));
    const expected = hmac.digest('hex');
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
  }

  // ModMed derm-specific fields: ICD-10 for derm, SNOMED for lesion morphology
  getDermSpecificMappings() {
    return {
      visitTypes: ['New Patient', 'Follow-Up', 'Biopsy Follow-Up', 'Full Body Exam', 'Mohs Surgery'],
      icd10Codes: {
        // Common derm diagnosis codes
        'L82.1': 'Seborrheic keratosis',
        'D22.9': 'Melanocytic nevi, unspecified',
        'C43.9': 'Malignant melanoma of skin, unspecified',
        'L57.0': 'Actinic keratosis',
        'D48.5': 'Neoplasm of uncertain behavior of skin',
      },
    };
  }
}
```

##### 14-C: ModMed-specific data flow quirks
- [ ] Document and handle these ModMed-specific behaviors:

| Quirk | Handling |
|-------|---------|
| Photos use proprietary media API, not FHIR Media | Use `POST /api/v1/media/upload` with multipart form data |
| Appointment types are practice-configurable | Pull appointment types via `/api/v1/appointmenttypes` on connection setup |
| Patient ID format differs from FHIR ID | Store both MRN and ModMed internal ID in `ehr_resource_map.metadata` |
| Encounter notes have a structured template | Map DermMap free-text notes to ModMed's structured note format |
| Dermoscopy images have a separate category | Tag with `category: 'dermoscopy'` in upload metadata |

#### Verification

- [ ] ModMed sandbox credentials work — can authenticate and get access token
- [ ] Patient search by MRN returns correct patient from sandbox
- [ ] Observation push creates a viewable record in the sandbox EHR chart
- [ ] Photo upload appears in patient media gallery
- [ ] Webhook signature verification accepts valid signatures, rejects invalid ones
- [ ] Practice ID extracted from connection metadata and included in API calls

---

### 15. Epic (MyChart / Hyperdrive) adapter

**Goal:** Implement Epic's FHIR R4 API via the App Orchard marketplace. Epic has the largest US install base and the most mature FHIR implementation.

**Priority:** 2  
**API Type:** FHIR R4 (fully conformant)  
**Auth:** SMART on FHIR — **asymmetric JWT** (RS384 — no client_secret; uses a JWKS private key)  
**Sandbox:** [fhir.epic.com](https://fhir.epic.com) — free open sandbox  
**Marketplace:** [App Orchard](https://appmarket.epic.com)

#### Files affected

| File | Change |
|------|--------|
| `backend/src/services/ehr/vendors/epic.js` | New file — Epic adapter extending BaseVendorAdapter |

#### Step-by-step

##### 15-A: Register at App Orchard
- [ ] Create a developer account at [https://appmarket.epic.com](https://appmarket.epic.com)
- [ ] Register a new app → select "Clinician-facing" + "Backend System"
- [ ] Generate RSA 384 keypair: `openssl genrsa -out epic_private.pem 2048`
- [ ] Upload the public key (JWKS format) to App Orchard
- [ ] Store private key path in `EHR_EPIC_PRIVATE_KEY_PATH` env var
- [ ] Receive non-production `client_id`

##### 15-B: Implement Epic adapter
- [ ] Create `backend/src/services/ehr/vendors/epic.js`:

```javascript
import { BaseVendorAdapter } from './base.js';
import * as jose from 'node-jose';
import fs from 'fs';
import crypto from 'crypto';

export class EpicAdapter extends BaseVendorAdapter {
  getScopes() {
    return [
      'launch/patient',
      'patient/Patient.read',
      'patient/Observation.read',
      'patient/Observation.write',
      'patient/Encounter.read',
      'patient/DocumentReference.write',
      'patient/DiagnosticReport.read',
      'patient/Appointment.read',
    ];
  }

  // Epic uses RS384 JWT client assertion instead of client_secret
  async exchangeCodeForToken(code, redirectUri, codeVerifier) {
    const smartConfig = await this.discover();
    const assertion = await this.buildClientAssertion(smartConfig.token_endpoint);

    const body = new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
      code_verifier: codeVerifier,
      client_assertion_type: 'urn:ietf:params:oauth:client-assertion-type:jwt-bearer',
      client_assertion: assertion,
    });

    const res = await fetch(smartConfig.token_endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    });
    if (!res.ok) throw new Error(`Epic token exchange failed: ${await res.text()}`);
    return res.json();
  }

  async buildClientAssertion(audience) {
    const privateKeyPem = fs.readFileSync(process.env.EHR_EPIC_PRIVATE_KEY_PATH, 'utf8');
    const key = await jose.JWK.asKey(privateKeyPem, 'pem');
    const now = Math.floor(Date.now() / 1000);
    const payload = {
      iss: this.connection.client_id,
      sub: this.connection.client_id,
      aud: audience,
      jti: crypto.randomUUID(),
      exp: now + 300,
      iat: now,
      nbf: now,
    };
    return jose.JWS.createSign({ format: 'compact', fields: { typ: 'JWT', alg: 'RS384' } }, key)
      .update(JSON.stringify(payload)).final();
  }

  async refreshToken(refreshToken) {
    const smartConfig = await this.discover();
    const assertion = await this.buildClientAssertion(smartConfig.token_endpoint);
    const body = new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_assertion_type: 'urn:ietf:params:oauth:client-assertion-type:jwt-bearer',
      client_assertion: assertion,
    });
    const res = await fetch(smartConfig.token_endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    });
    if (!res.ok) throw new Error('Epic refresh failed');
    return res.json();
  }

  // Epic does NOT support FHIR Media — use DocumentReference for images
  async pushPhoto(photo, lesion, patient) {
    // Upload as DocumentReference with embedded base64 image
    // NOT as Media resource (Epic returns 400 for Media creates)
  }

  supportsWebhooks() { return false; }  // Epic uses polling, not webhooks (as of 2026)
}
```

##### 15-C: Epic-specific API quirks
- [ ] Document and handle:

| Quirk | Handling |
|-------|---------|
| No `client_secret` — must use RS384 JWT assertion | `buildClientAssertion()` method |
| `Media` resource not supported for writes | Use `DocumentReference` with inline base64 |
| Patient search requires at least 2 search params | Always include `birthdate` + `family` or `identifier` |
| Refresh tokens expire after 24 hours | Auto-refresh cron handles this |
| Rate limit: 100 requests/minute per app | Implement per-connection rate limiter |
| Open sandbox at `https://fhir.epic.com/interconnect-fhir-oauth/api/FHIR/R4` | Use for all testing before App Orchard submission |

##### 15-D: Test against Epic open sandbox
- [ ] Set `fhir_base_url` to `https://fhir.epic.com/interconnect-fhir-oauth/api/FHIR/R4`
- [ ] Test patient search: `GET /Patient?family=Argonaut&given=Jason`
- [ ] Test observation read: `GET /Observation?patient={id}&category=exam`
- [ ] Verify DocumentReference create with PDF attachment

#### Verification

- [ ] RS384 JWT assertion accepted by Epic sandbox token endpoint
- [ ] Patient search returns results from Epic sandbox
- [ ] Observation create with SNOMED-coded components succeeds
- [ ] DocumentReference with base64 PDF attachment creates successfully
- [ ] Rate limiter prevents more than 100 requests/minute
- [ ] Token refresh works silently before 24-hour expiry

---

### 16. Cerner / Oracle Health adapter

**Goal:** Implement Cerner's Millennium FHIR R4 API via the Code Console program.

**Priority:** 3  
**API Type:** FHIR R4  
**Auth:** OAuth 2.0 (client credentials — symmetric `client_id` + `client_secret`)  
**Sandbox:** [fhir-open.cerner.com](https://fhir-open.cerner.com) (open) + [code.cerner.com](https://code.cerner.com) (authenticated)  
**Marketplace:** [Code Console](https://code.cerner.com/developer/smart-on-fhir)

#### Files affected

| File | Change |
|------|--------|
| `backend/src/services/ehr/vendors/cerner.js` | New file — Cerner adapter extending BaseVendorAdapter |

#### Step-by-step

##### 16-A: Register at Code Console
- [ ] Create developer account at [code.cerner.com](https://code.cerner.com)
- [ ] Register new app → select SMART on FHIR scopes
- [ ] Receive `client_id` and `client_secret`
- [ ] Note sandbox tenant: `https://fhir-myrecord.cerner.com/r4/ec2458f2-1e24-41c8-b71b-0e701af7583d`

##### 16-B: Implement Cerner adapter
- [ ] Create `backend/src/services/ehr/vendors/cerner.js`:

```javascript
import { BaseVendorAdapter } from './base.js';

export class CernerAdapter extends BaseVendorAdapter {
  getScopes() {
    return [
      'launch', 'openid', 'fhirUser', 'online_access',
      'patient/Patient.read',
      'patient/Observation.write',
      'patient/Encounter.read',
      'patient/DocumentReference.write',
      'patient/DiagnosticReport.read',
      'patient/Appointment.read',
    ];
  }

  // Standard OAuth 2.0 — symmetric client_secret
  async exchangeCodeForToken(code, redirectUri, codeVerifier) {
    const smartConfig = await this.discover();
    const body = new URLSearchParams({
      grant_type: 'authorization_code',
      code, redirect_uri: redirectUri, code_verifier: codeVerifier,
      client_id: this.connection.client_id,
      client_secret: getVendorSecret('cerner'),
    });
    const res = await fetch(smartConfig.token_endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    });
    if (!res.ok) throw new Error(`Cerner token exchange failed: ${await res.text()}`);
    return res.json();
  }

  // Cerner requires _format parameter on some endpoints
  async searchWithFormat(resourceType, params) {
    params._format = 'json';
    return this.fhirSearch(resourceType, params);
  }

  supportsWebhooks() { return false; }  // Cerner supports CDS Hooks, not data webhooks
}
```

##### 16-C: Cerner-specific quirks
- [ ] Document and handle:

| Quirk | Handling |
|-------|---------|
| Requires `_format=json` on some search endpoints | Add to all search params |
| Observation.write may require specific code systems | Use Cerner's proprietary code system alongside SNOMED |
| Binary upload uses `Content-Type: application/fhir+json` | Set explicitly in request headers |
| Patient search by MRN uses `identifier` with Cerner-specific system URI | Store system URI in connection `metadata` |
| Rate limit: 60 requests/minute | Per-connection rate limiter |

#### Verification

- [ ] OAuth flow succeeds against Cerner sandbox
- [ ] Patient search returns sandbox test patients
- [ ] Observation create with SNOMED + Cerner codes succeeds
- [ ] DocumentReference with PDF attachment accepted
- [ ] Rate limiter respects 60 req/min limit

---

### 17. Athenahealth (athenaOne) adapter

**Goal:** Implement Athenahealth's athenaFlex + FHIR API via the Marketplace Developer Program.

**Priority:** 4  
**API Type:** athenaFlex (proprietary REST) + FHIR R4 (partial)  
**Auth:** OAuth 2.0 (client credentials + authorization code)  
**Sandbox:** [developer.athenahealth.com](https://developer.athenahealth.com) — requires developer application  
**Marketplace:** [Athena Marketplace](https://marketplace.athenahealth.com)

#### Files affected

| File | Change |
|------|--------|
| `backend/src/services/ehr/vendors/athena.js` | New file — Athenahealth adapter extending BaseVendorAdapter |

#### Step-by-step

##### 17-A: Register for API access
- [ ] Apply at [developer.athenahealth.com](https://developer.athenahealth.com)
- [ ] Complete developer program onboarding (requires BAA)
- [ ] Receive sandbox `client_id`, `client_secret`, and `practiceId`
- [ ] Note: Athena uses a **practice ID** in all API paths: `/v1/{practiceId}/patients`

##### 17-B: Implement Athena adapter
- [ ] Create `backend/src/services/ehr/vendors/athena.js`:

```javascript
import { BaseVendorAdapter } from './base.js';

export class AthenaAdapter extends BaseVendorAdapter {
  getScopes() {
    // Athena uses both FHIR scopes and proprietary athenaFlex scopes
    return [
      'launch/patient', 'patient/Patient.read', 'patient/Encounter.read',
      'patient/Appointment.read', 'patient/DocumentReference.write',
      'athena/patient.read', 'athena/appointment.read', 'athena/document.write',
    ];
  }

  getPracticeId() { return this.connection.metadata?.practiceId; }

  // Athena has a hybrid API — FHIR for standard resources, athenaFlex for derm-specific
  async pullPatient(fhirId) {
    // Use FHIR Patient endpoint
    return this.fhirRead('Patient', fhirId);
  }

  async pullAppointments(date) {
    // Athena's appointment search is better via athenaFlex
    const practiceId = this.getPracticeId();
    const token = await this.getToken();
    const res = await fetch(
      `${this.getAthenaBaseUrl()}/v1/${practiceId}/appointments?startdate=${date}&enddate=${date}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    return res.json();
  }

  getAthenaBaseUrl() {
    // Athena's REST API base differs from FHIR base
    return this.connection.metadata?.athenaBaseUrl || 'https://api.preview.platform.athenahealth.com';
  }

  // Athena supports subscription-based webhooks for appointments
  supportsWebhooks() { return true; }
  getWebhookSignatureHeader() { return 'X-Athena-Subscription-Signature'; }
}
```

##### 17-C: Athena-specific quirks
- [ ] Document and handle:

| Quirk | Handling |
|-------|---------|
| Practice ID required in all REST paths | `getPracticeId()` reads from connection metadata |
| Two separate base URLs (FHIR vs athenaFlex) | Store both in `metadata` |
| Document upload requires department ID | Pull department list on connection setup |
| Photo upload uses `/documents` endpoint (not FHIR Media) | Custom `pushPhoto()` override |
| Max image size: 5 MB | Compress before upload |
| Rate limit: 120 requests/minute | Per-connection rate limiter |

#### Verification

- [ ] OAuth flow succeeds against Athena sandbox
- [ ] Appointment pull via athenaFlex returns today's schedule
- [ ] Patient pull via FHIR returns correct demographics
- [ ] Document upload with PDF accepted
- [ ] Practice ID correctly injected into API paths

---

### 18. eClinicalWorks adapter

**Goal:** Implement eCW's v12 cloud FHIR R4 API.

**Priority:** 5  
**API Type:** FHIR R4 (via v12 cloud platform)  
**Auth:** OAuth 2.0 (standard symmetric)  
**Sandbox:** Contact eCW partner team — no public sandbox  
**Note:** eCW is common in smaller practices; API access requires a direct partnership agreement + BAA.

#### Files affected

| File | Change |
|------|--------|
| `backend/src/services/ehr/vendors/ecw.js` | New file — eCW adapter extending BaseVendorAdapter |

#### Step-by-step

##### 18-A: Establish eCW partnership
- [ ] Contact eCW partner team for API access
- [ ] Complete BAA and partnership agreement
- [ ] Receive sandbox credentials (`client_id`, `client_secret`)
- [ ] Get assigned a test tenant URL

##### 18-B: Implement eCW adapter
- [ ] Create `backend/src/services/ehr/vendors/ecw.js`:

```javascript
import { BaseVendorAdapter } from './base.js';

export class ECWAdapter extends BaseVendorAdapter {
  getScopes() {
    return [
      'launch/patient', 'patient/Patient.read',
      'patient/Observation.write', 'patient/Encounter.read',
      'patient/DocumentReference.write', 'patient/Appointment.read',
    ];
  }

  // eCW v12 FHIR is mostly standard — fewer quirks than older versions
  // Standard OAuth symmetric auth (same as Cerner)

  // eCW-specific: photos JPEG only, max 5MB
  async pushPhoto(photo, lesion, patient) {
    if (photo.mime_type !== 'image/jpeg') {
      photo = await convertToJpeg(photo);  // eCW only supports JPEG
    }
    if (photo.file_size > 5 * 1024 * 1024) {
      photo = await compressImage(photo, { maxSizeMB: 5 });
    }
    return super.pushPhoto(photo, lesion, patient);
  }

  supportsWebhooks() { return false; }
}
```

##### 18-C: eCW-specific quirks
- [ ] Document and handle:

| Quirk | Handling |
|-------|---------|
| No public sandbox — must get access from eCW | Document process; defer testing until credentials received |
| v12 cloud only — older on-premise installs lack FHIR | Verify version on connection setup |
| Photo upload: JPEG only, max 5 MB | Auto-convert PNG → JPEG; compress if oversized |
| Limited `_include` support | Make separate requests instead of using `_include` |
| Rate limit varies per deployment | Start conservative (30 req/min), adjust per eCW guidance |

#### Verification

- [ ] OAuth flow succeeds against eCW sandbox (when credentials received)
- [ ] Patient search returns results
- [ ] Observation create accepted
- [ ] JPEG conversion works for PNG uploads
- [ ] Image compression reduces files to under 5 MB

---

---

## PHASE 4 — Sync Engine, Webhooks, and Conflict Resolution

<!-- SECTION: PHASE_4 — to be filled -->

### 19. Outbound sync engine — push queue and retry logic

**Goal:** Build the async push engine that dequeues DermMap changes from `ehr_sync_queue` and pushes them to the connected EHR with exponential backoff retry.

#### Files affected

| File | Change |
|------|--------|
| `backend/src/services/ehr/syncEngine.js` | New file — queue processor with retry, dead-letter, and rate limiting |
| `backend/src/server.js` | Start sync engine on server boot |

#### Step-by-step

##### 19-A: Implement the queue processor
- [ ] Create `syncEngine.js`:

```javascript
import pool from '../../db/pool.js';
import { getVendorAdapter } from './vendors/index.js';
import { getValidToken } from './tokenManager.js';

const POLL_INTERVAL_MS = 30000;     // Check queue every 30 seconds
const BATCH_SIZE = 10;               // Process 10 items per cycle
const MAX_ATTEMPTS = 5;
const BASE_RETRY_DELAY_MS = 60000;   // 1 minute, then 2, 4, 8, 16

export function startSyncEngine() {
  setInterval(processQueue, POLL_INTERVAL_MS);
  console.log('[EHR Sync Engine] Started — polling every 30s');
}

async function processQueue() {
  // Fetch pending items whose retry time has passed
  const { rows } = await pool.query(`
    SELECT q.*, c.vendor, c.fhir_base_url FROM ehr_sync_queue q
    JOIN ehr_connections c ON c.connection_id = q.connection_id
    WHERE q.status IN ('pending', 'failed')
      AND q.attempts < q.max_attempts
      AND (q.next_retry_at IS NULL OR q.next_retry_at <= NOW())
      AND c.status = 'connected' AND c.enabled = true
    ORDER BY q.created_at ASC
    LIMIT $1
  `, [BATCH_SIZE]);

  for (const item of rows) {
    await processQueueItem(item);
  }
}

async function processQueueItem(item) {
  // Mark as in_progress
  await pool.query("UPDATE ehr_sync_queue SET status = 'in_progress' WHERE queue_id = $1", [item.queue_id]);

  try {
    const adapter = getVendorAdapter(item.vendor, item.connection_id);
    const token = await getValidToken(item.connection_id);

    if (item.direction === 'push') {
      await executePush(adapter, token, item);
    } else {
      await executePull(adapter, token, item);
    }

    // Success
    await pool.query(
      "UPDATE ehr_sync_queue SET status = 'completed', completed_at = NOW() WHERE queue_id = $1",
      [item.queue_id]
    );
  } catch (err) {
    const attempts = item.attempts + 1;
    const retryDelay = BASE_RETRY_DELAY_MS * Math.pow(2, attempts - 1);
    const newStatus = attempts >= MAX_ATTEMPTS ? 'dead_letter' : 'failed';

    await pool.query(`
      UPDATE ehr_sync_queue SET
        status = $1, attempts = $2, last_error = $3,
        next_retry_at = NOW() + INTERVAL '${retryDelay} milliseconds'
      WHERE queue_id = $4
    `, [newStatus, attempts, err.message, item.queue_id]);

    if (newStatus === 'dead_letter') {
      console.error(`[EHR Sync] Dead letter: ${item.queue_id} — ${item.resource_type} ${item.dermmap_entity}/${item.dermmap_id}`);
      // TODO: Alert on dead-letter items (Task 29)
    }
  }
}
```

##### 19-B: Implement push execution
- [ ] Route to the correct FHIR operation based on resource type:

```javascript
async function executePush(adapter, token, item) {
  const { resource_type, dermmap_entity, dermmap_id, fhir_payload, connection_id } = item;

  // Check if this DermMap entity already has a FHIR counterpart
  const existing = await getResourceMap(connection_id, dermmap_entity, dermmap_id, resource_type);

  if (existing) {
    // UPDATE
    fhir_payload.id = existing.fhir_resource_id;
    const result = await adapter.fhirUpdate(resource_type, fhir_payload);
    await updateResourceMap(existing.map_id, result.meta?.versionId);
  } else {
    // CREATE
    const result = await adapter.fhirCreate(resource_type, fhir_payload);
    await createResourceMap(connection_id, dermmap_entity, dermmap_id, resource_type, result.id, result.meta?.versionId);
  }
}
```

##### 19-C: Enqueue helper function
- [ ] Used by visit sign-off, photo upload, etc.:

```javascript
export async function enqueueSync({ connection_id, direction, resource_type, dermmap_entity, dermmap_id, fhir_payload, created_by }) {
  // Deduplicate: don't re-queue if an identical pending item exists
  const existing = await pool.query(
    "SELECT queue_id FROM ehr_sync_queue WHERE connection_id=$1 AND dermmap_entity=$2 AND dermmap_id=$3 AND resource_type=$4 AND status IN ('pending','in_progress')",
    [connection_id, dermmap_entity, dermmap_id, resource_type]
  );
  if (existing.rows.length) return existing.rows[0].queue_id;

  const { rows } = await pool.query(`
    INSERT INTO ehr_sync_queue (connection_id, direction, resource_type, dermmap_entity, dermmap_id, fhir_payload, created_by)
    VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING queue_id
  `, [connection_id, direction, resource_type, dermmap_entity, dermmap_id, fhir_payload, created_by]);

  return rows[0].queue_id;
}
```

##### 19-D: Start sync engine on server boot
- [ ] In `backend/src/server.js`, after all routes are registered:

```javascript
import { startSyncEngine } from './services/ehr/syncEngine.js';

// Start the EHR sync engine (only if not in test mode)
if (process.env.NODE_ENV !== 'test') {
  startSyncEngine();
}
```

#### Verification

- [ ] Queue processor picks up pending items every 30 seconds
- [ ] Successful push: status → `completed`, `completed_at` set
- [ ] Failed push: `attempts` incremented, `next_retry_at` set with exponential backoff
- [ ] After 5 failures: status → `dead_letter`
- [ ] Deduplication: enqueuing the same entity twice doesn't create duplicate rows
- [ ] Disabled/disconnected connections are skipped
- [ ] Resource map updated with FHIR `id` and `versionId` after successful push

---

### 20. Inbound sync — scheduled pull and webhook receivers

**Goal:** Implement scheduled data pulls (demographics daily, appointments pre-shift) and real-time webhook receivers for vendors that support them.

#### Files affected

| File | Change |
|------|--------|
| `backend/src/services/ehr/webhookHandler.js` | New file — validate signatures and process inbound webhooks |
| `backend/src/routes/ehr.js` | `POST /api/ehr/webhook/:vendor` endpoint |
| `backend/src/services/ehr/scheduledPulls.js` | New file — cron-based scheduled pulls |

#### Step-by-step

##### 20-A: Webhook receiver architecture
- [ ] Create `webhookHandler.js`:

```javascript
import crypto from 'crypto';
import pool from '../../db/pool.js';
import { getVendorAdapter } from './vendors/index.js';

export async function handleWebhook(vendor, headers, rawBody) {
  // 1. Find all connections for this vendor that have webhooks enabled
  const { rows: connections } = await pool.query(
    "SELECT * FROM ehr_connections WHERE vendor = $1 AND status = 'connected' AND enabled = true",
    [vendor]
  );

  // 2. Verify signature (vendor-specific)
  let verified = false;
  let matchedConnection = null;
  for (const conn of connections) {
    const adapter = getVendorAdapter(vendor, conn);
    const sigHeader = adapter.getWebhookSignatureHeader();
    if (sigHeader && headers[sigHeader.toLowerCase()]) {
      if (await adapter.verifyWebhookSignature(rawBody, headers[sigHeader.toLowerCase()])) {
        verified = true;
        matchedConnection = conn;
        break;
      }
    }
  }

  if (!verified) throw new Error('Webhook signature verification failed');

  // 3. Parse and route the event
  const payload = JSON.parse(rawBody);
  await routeWebhookEvent(matchedConnection, payload);
}

async function routeWebhookEvent(connection, payload) {
  const eventType = payload.event || payload.resourceType || 'unknown';

  switch (eventType) {
    case 'appointment.created':
    case 'appointment.updated':
    case 'Appointment':
      await handleAppointmentWebhook(connection, payload);
      break;
    case 'diagnosticreport.final':
    case 'DiagnosticReport':
      await handlePathologyResultWebhook(connection, payload);
      break;
    case 'patient.updated':
    case 'Patient':
      await handlePatientUpdateWebhook(connection, payload);
      break;
    default:
      console.log(`[EHR Webhook] Unhandled event type: ${eventType}`);
  }
}
```

##### 20-B: Implement webhook endpoint
- [ ] In `backend/src/routes/ehr.js`:

```javascript
import { handleWebhook } from '../services/ehr/webhookHandler.js';

// POST /api/ehr/webhook/:vendor
// No JWT auth — authenticated by vendor-specific signature verification
router.post('/webhook/:vendor', express.raw({ type: '*/*' }), async (req, res) => {
  try {
    await handleWebhook(req.params.vendor, req.headers, req.body.toString());
    res.status(200).json({ status: 'received' });
  } catch (err) {
    console.error(`[EHR Webhook] ${req.params.vendor} error:`, err.message);
    // Return 200 even on error to prevent retries for bad signatures
    // Log for investigation instead
    res.status(200).json({ status: 'received' });
  }
});
```

##### 20-C: Implement scheduled pulls
- [ ] Create `scheduledPulls.js` with all cron jobs:

```javascript
import cron from 'node-cron';
import pool from '../../db/pool.js';
import { searchPatients, searchAppointments, searchDiagnosticReports } from './fhirClient.js';
import { fhirPatientToDermMap, fhirAppointmentToDermMapSchedule, fhirDiagReportToDermMapBiopsy } from './resourceMappers.js';

export function startScheduledPulls() {
  // 1. Daily demographics refresh — 6:00 AM
  cron.schedule('0 6 * * *', pullUpdatedPatients);

  // 2. Pre-shift appointment pull — 5:30 AM Mon–Sat
  cron.schedule('30 5 * * 1-6', pullTodayAppointments);

  // 3. Pathology results check — every 2 hours
  cron.schedule('0 */2 * * *', pullPendingPathologyResults);

  // 4. Expired state cleanup — every 15 minutes
  cron.schedule('*/15 * * * *', cleanupExpiredOAuthState);

  console.log('[EHR Scheduled Pulls] Registered 4 cron jobs');
}

async function pullUpdatedPatients() {
  const connections = await getActiveConnections();
  for (const conn of connections.rows) {
    try {
      const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0];
      const bundle = await searchPatients(conn.connection_id, { _lastUpdated: `ge${sevenDaysAgo}` });
      let count = 0;
      for (const entry of bundle.entry || []) {
        await upsertPatientFromFhir(conn.connection_id, entry.resource);
        count++;
      }
      console.log(`[EHR Pull] ${conn.vendor}: Updated ${count} patients`);
    } catch (err) {
      console.error(`[EHR Pull] ${conn.vendor} patient pull failed:`, err.message);
    }
  }
}

async function pullTodayAppointments() {
  const connections = await getActiveConnections();
  const today = new Date().toISOString().split('T')[0];
  for (const conn of connections.rows) {
    try {
      const bundle = await searchAppointments(conn.connection_id, today);
      let count = 0;
      for (const entry of bundle.entry || []) {
        const sched = fhirAppointmentToDermMapSchedule(entry.resource);
        await upsertScheduleEntry(conn.location_id, sched, entry.resource.id);
        count++;
      }
      console.log(`[EHR Pull] ${conn.vendor}: Loaded ${count} appointments for ${today}`);
    } catch (err) {
      console.error(`[EHR Pull] ${conn.vendor} appointment pull failed:`, err.message);
    }
  }
}

async function pullPendingPathologyResults() {
  // (See Task 11-C for implementation)
}

async function cleanupExpiredOAuthState() {
  await pool.query('DELETE FROM ehr_oauth_state WHERE expires_at < NOW()');
}

async function getActiveConnections() {
  return pool.query("SELECT * FROM ehr_connections WHERE status = 'connected' AND enabled = true");
}
```

##### 20-D: Start scheduled pulls on server boot
- [ ] In `backend/src/server.js`:

```javascript
import { startScheduledPulls } from './services/ehr/scheduledPulls.js';

if (process.env.NODE_ENV !== 'test') {
  startScheduledPulls();
}
```

#### Verification

- [ ] Webhook with valid ModMed signature → 200, event processed
- [ ] Webhook with invalid signature → 200 (logged but not processed)
- [ ] Webhook with unknown event type → 200 (logged, no error)
- [ ] Daily patient pull updates demographics for recently modified patients
- [ ] Appointment pull loads today's schedule before clinic opens
- [ ] Pathology poll updates `biopsy_result` when final report available
- [ ] OAuth state cleanup removes expired rows every 15 minutes

---

### 21. Conflict resolution and data reconciliation

**Goal:** Handle conflicts when the same record is modified in both DermMap and the EHR simultaneously. Define clear rules for which system "wins" per resource type.

#### Files affected

| File | Change |
|------|--------|
| `backend/src/services/ehr/conflictResolver.js` | New file — conflict detection and resolution logic |
| `backend/src/services/ehr/resourceMappers.js` | Add `computeSyncHash()` for drift detection |

#### Step-by-step

##### 21-A: Define conflict resolution rules
- [ ] Establish rules per resource type based on clinical workflow:

| Resource | Source of Truth | Rule | Rationale |
|----------|----------------|------|-----------|
| **Patient demographics** | EHR wins | Always overwrite DermMap on pull | EHR is registration system of record |
| **Appointments** | EHR wins | Always overwrite DermMap on pull | EHR manages scheduling |
| **Lesion observations** | DermMap wins | DermMap is the authoring system; push overwrites EHR | DermMap is the clinical documentation tool |
| **Visit summary PDF** | DermMap wins | DermMap generates the PDF; push is append-only | Documents are immutable after sign-off |
| **Pathology results** | EHR wins | Lab results come from the path lab via EHR | Path lab is the authoritative source |
| **Photos** | DermMap wins | DermMap captures photos; push is one-way | DermMap owns the clinical images |

##### 21-B: Detect drift using sync hashes
- [ ] Compute a SHA-256 hash of the FHIR payload and store in `ehr_resource_map.sync_hash`:

```javascript
import crypto from 'crypto';

export function computeSyncHash(fhirResource) {
  // Exclude server-assigned fields (id, meta, text) for stable comparison
  const canonical = { ...fhirResource };
  delete canonical.id;
  delete canonical.meta;
  delete canonical.text;
  const json = JSON.stringify(canonical, Object.keys(canonical).sort());
  return crypto.createHash('sha256').update(json).digest('hex');
}
```

##### 21-C: Implement optimistic concurrency with FHIR ETags
- [ ] Use `If-Match` header with the stored `fhir_version_id` on updates:

```javascript
async function pushWithConcurrencyCheck(adapter, resource, resourceMapEntry) {
  try {
    return await adapter.fhirUpdate(resource.resourceType, resource, {
      headers: { 'If-Match': `W/"${resourceMapEntry.fhir_version_id}"` },
    });
  } catch (err) {
    if (err.status === 409 || err.status === 412) {
      // Conflict: EHR has a newer version — apply resolution rule
      return await resolveConflict(adapter, resource, resourceMapEntry);
    }
    throw err;
  }
}

async function resolveConflict(adapter, localResource, mapEntry) {
  const remoteResource = await adapter.fhirRead(localResource.resourceType, localResource.id);
  const rule = getConflictRule(localResource.resourceType);

  if (rule === 'local_wins') {
    // Force-push DermMap's version (without If-Match)
    return adapter.fhirUpdate(localResource.resourceType, localResource);
  } else {
    // Remote wins — update DermMap with EHR's version
    await applyRemoteUpdate(mapEntry, remoteResource);
    return remoteResource;
  }
}

function getConflictRule(resourceType) {
  const rules = {
    Patient: 'remote_wins', Appointment: 'remote_wins',
    Observation: 'local_wins', DocumentReference: 'local_wins',
    DiagnosticReport: 'remote_wins', Media: 'local_wins',
  };
  return rules[resourceType] || 'local_wins';
}
```

##### 21-D: Conflict audit logging
- [ ] Log every conflict for review:

```javascript
async function logConflict(connectionId, resourceType, dermmapId, resolution, details) {
  await pool.query(`
    INSERT INTO audit_logs (user_id, action_type, resource_type, resource_id, details, ehr_connection_id)
    VALUES (0, 'ehr_conflict', $1, $2, $3, $4)
  `, [resourceType, dermmapId, JSON.stringify({ resolution, ...details }), connectionId]);
}
```

#### Verification

- [ ] Patient pull with local changes: EHR version overwrites DermMap (EHR wins)
- [ ] Observation push when EHR has newer version: DermMap force-pushes (DermMap wins)
- [ ] 409/412 from FHIR server triggers conflict resolution, not a crash
- [ ] Sync hash changes when meaningful fields change but stays the same for metadata-only changes
- [ ] All conflicts logged in `audit_logs` with resolution details
- [ ] `If-Match` header sent on every FHIR update

---

### 22. Frontend — real EHR integration page (replace demo)

**Goal:** Replace the hardcoded demo `EHRIntegrationPage.tsx` with a live page that manages real connections, shows actual sync status, and persists configuration.

#### Files affected

| File | Change |
|------|--------|
| `src/pages/EHRIntegrationPage.tsx` | Rewrite — replace hardcoded data with API calls |
| `src/services/ehrService.ts` | Wire to actual API endpoints (created in Task 3) |
| `src/store/appStore.ts` | Add EHR state slice (connections, sync status, queue) |

#### Step-by-step

##### 22-A: Add EHR state to Zustand store
- [ ] In `appStore.ts`, add:

```typescript
ehrConnections: EHRConnection[];
ehrSyncStatus: Record<string, EHRSyncStatus>;  // keyed by connection_id
setEhrConnections: (connections: EHRConnection[]) => void;
updateEhrSyncStatus: (connectionId: string, status: EHRSyncStatus) => void;
```

##### 22-B: Replace Configuration tab with live data
- [ ] **Connection list**: Fetch from `GET /api/ehr/connections` on mount
- [ ] **Add connection form**: POST to `/api/ehr/connections` with vendor, FHIR base URL, client ID, scopes
- [ ] **OAuth connect button**: Calls `GET /api/ehr/authorize/:connectionId` → redirects to EHR OAuth page
- [ ] **Status indicator**: Poll `GET /api/ehr/sync/status/:connectionId` every 30 seconds
- [ ] **Disconnect button**: Calls `DELETE /api/ehr/connections/:id` → revokes tokens → updates UI

##### 22-C: Replace FHIR Resources tab with live resource counts
- [ ] Query `ehr_resource_map` for counts per resource type:

```typescript
// GET /api/ehr/sync/status/:connectionId returns:
{
  patients_synced: 247,     // COUNT WHERE dermmap_entity = 'patient'
  observations_pushed: 1842, // COUNT WHERE fhir_resource_type = 'Observation'
  documents_pushed: 318,     // COUNT WHERE fhir_resource_type = 'DocumentReference'
  appointments_pulled: 512,  // COUNT WHERE fhir_resource_type = 'Appointment'
  reports_synced: 104,       // COUNT WHERE fhir_resource_type = 'DiagnosticReport'
  photos_pushed: 936,        // COUNT WHERE fhir_resource_type = 'Media'
}
```

##### 22-D: Replace Activity Feed with real sync queue
- [ ] Fetch from `GET /api/ehr/sync/queue/:connectionId`
- [ ] Show real push/pull events with timestamps, status, and error messages
- [ ] Add retry button for failed items
- [ ] Add dead-letter queue viewer for admin users

##### 22-E: Add manual sync triggers
- [ ] "Pull Patients Now" button → `POST /api/ehr/sync/pull/:connectionId`
- [ ] "Push All Pending" button → `POST /api/ehr/sync/push/:connectionId`
- [ ] "Refresh Appointments" button → `GET /api/ehr/appointments/:connectionId`

##### 22-F: Keep the vendor info cards (non-breaking)
- [ ] Retain the existing vendor cards (Epic, Cerner, etc.) with "Coming Soon" badges
- [ ] Show "Connected" badge for vendors with an active connection
- [ ] Show "Error" badge for vendors in error state

#### Verification

- [ ] Page loads without demo data — shows "No connections" if none configured
- [ ] OAuth flow: click Connect → redirect to EHR → return to DermMap → status shows "Connected"
- [ ] Sync status updates in real-time (30s polling)
- [ ] Queue viewer shows pending/completed/failed items with timestamps
- [ ] Manual sync buttons trigger immediate push/pull
- [ ] Disconnect removes tokens and updates status to "Disconnected"
- [ ] Admin/manager only: non-admin users see read-only view

---

---

## PHASE 5 — Testing Strategy

<!-- SECTION: PHASE_5 — to be filled -->

### 23. Unit tests — FHIR resource builders and mappers

**Goal:** Test every FHIR resource builder and DermMap ↔ FHIR mapper function in isolation with deterministic test data.

#### Files affected

| File | Change |
|------|--------|
| `backend/src/test/ehr/resourceMappers.test.js` | New — unit tests for all mapper functions |
| `backend/src/test/ehr/tokenManager.test.js` | New — encrypt/decrypt round-trip, refresh logic |
| `backend/src/test/ehr/conflictResolver.test.js` | New — conflict resolution rules |
| `backend/src/test/ehr/fixtures/` | New — sample FHIR JSON fixtures (Patient, Observation, etc.) |

#### Step-by-step

##### 23-A: Create FHIR test fixtures
- [ ] Create `fixtures/fhirPatient.json` — sample FHIR Patient from Epic sandbox
- [ ] Create `fixtures/fhirObservation.json` — sample Observation with SNOMED components
- [ ] Create `fixtures/fhirEncounter.json` — sample ambulatory Encounter
- [ ] Create `fixtures/fhirAppointment.json` — sample booked Appointment
- [ ] Create `fixtures/fhirDiagnosticReport.json` — sample final pathology report
- [ ] Create `fixtures/dermMapLesion.json` — sample DermMap lesion with full ABCDE data
- [ ] Create `fixtures/dermMapVisit.json` — sample signed visit with 2 lesions

##### 23-B: Resource mapper tests
- [ ] Write tests for each mapper function:

```javascript
import { describe, it, expect } from 'vitest';
import { fhirPatientToDermMap, dermMapLesionToFhirObservation, /* etc */ } from '../../services/ehr/resourceMappers.js';
import fhirPatient from './fixtures/fhirPatient.json';
import dermMapLesion from './fixtures/dermMapLesion.json';

describe('fhirPatientToDermMap', () => {
  it('maps name correctly (official use preferred)', () => {
    const result = fhirPatientToDermMap(fhirPatient);
    expect(result.first_name).toBe('Jason');
    expect(result.last_name).toBe('Argonaut');
  });

  it('extracts MRN from identifier array', () => {
    const result = fhirPatientToDermMap(fhirPatient);
    expect(result.mrn).toMatch(/^[A-Z0-9]+$/);
  });

  it('maps gender correctly', () => {
    expect(fhirPatientToDermMap({ ...fhirPatient, gender: 'male' }).sex).toBe('M');
    expect(fhirPatientToDermMap({ ...fhirPatient, gender: 'female' }).sex).toBe('F');
    expect(fhirPatientToDermMap({ ...fhirPatient, gender: 'unknown' }).sex).toBe('U');
  });

  it('handles missing fields gracefully', () => {
    const minimal = { resourceType: 'Patient', id: '123' };
    const result = fhirPatientToDermMap(minimal);
    expect(result.first_name).toBe('');
    expect(result.last_name).toBe('');
    expect(result.mrn).toBe('123');
  });
});

describe('dermMapLesionToFhirObservation', () => {
  it('uses SNOMED CT 400010006 for skin lesion code', () => {
    const obs = dermMapLesionToFhirObservation(dermMapLesion, mockPatient, mockVisit, mockProvider);
    expect(obs.code.coding[0].code).toBe('400010006');
  });

  it('includes size component with UCUM mm', () => {
    const obs = dermMapLesionToFhirObservation(dermMapLesion, mockPatient, mockVisit, mockProvider);
    const sizeComp = obs.component.find(c => c.valueQuantity);
    expect(sizeComp.valueQuantity.unit).toBe('mm');
    expect(sizeComp.valueQuantity.system).toBe('http://unitsofmeasure.org');
  });

  it('includes body location extension with x, y, region, view', () => {
    const obs = dermMapLesionToFhirObservation(dermMapLesion, mockPatient, mockVisit, mockProvider);
    const locExt = obs.extension.find(e => e.url.includes('body-location'));
    expect(locExt.extension).toHaveLength(4);
  });

  it('status is final for signed visits, preliminary otherwise', () => {
    const signed = dermMapLesionToFhirObservation(dermMapLesion, mockPatient, { ...mockVisit, status: 'signed' }, mockProvider);
    expect(signed.status).toBe('final');
    const inProgress = dermMapLesionToFhirObservation(dermMapLesion, mockPatient, { ...mockVisit, status: 'in_progress' }, mockProvider);
    expect(inProgress.status).toBe('preliminary');
  });
});
```

##### 23-C: Token manager tests
- [ ] Test encrypt/decrypt round-trip
- [ ] Test that encrypted tokens are NOT JSON/JWT (can't be decoded without key)
- [ ] Test that wrong key fails to decrypt
- [ ] Test `getValidToken()` returns token when not expired
- [ ] Test `getValidToken()` triggers refresh when within 5 min of expiry

##### 23-D: Conflict resolver tests
- [ ] Test `computeSyncHash()` is deterministic (same input → same hash)
- [ ] Test `computeSyncHash()` ignores `id`, `meta`, `text` fields
- [ ] Test conflict rules: Patient → remote_wins, Observation → local_wins
- [ ] Test `resolveConflict()` applies correct rule per resource type

##### 23-E: Run tests
- [ ] `cd backend && npx vitest run src/test/ehr/` — all tests green

#### Verification

- [ ] 100% pass rate on all mapper tests
- [ ] Each mapper handles null/undefined fields without throwing
- [ ] SNOMED codes match the defined code table
- [ ] Token encrypt/decrypt is symmetric (round-trip produces identical output)
- [ ] Conflict rules match the table in Task 21

---

### 24. Integration tests — OAuth flow and API round-trips

**Goal:** Test the complete OAuth authorization + token exchange flow and FHIR API create/read/update/search round-trips against a mock FHIR server.

#### Files affected

| File | Change |
|------|--------|
| `backend/src/test/ehr/oauth.integration.test.js` | New — OAuth flow tests |
| `backend/src/test/ehr/fhirCrud.integration.test.js` | New — FHIR CRUD round-trip tests |
| `backend/src/test/ehr/syncEngine.integration.test.js` | New — queue processing tests |
| `backend/src/test/ehr/mockFhirServer.js` | New — Express-based mock FHIR server |

#### Step-by-step

##### 24-A: Create a mock FHIR server
- [ ] Build a lightweight Express server that mimics a FHIR R4 endpoint:

```javascript
import express from 'express';

export function createMockFhirServer(port = 9999) {
  const app = express();
  app.use(express.json());

  const resources = new Map();  // In-memory resource store

  // SMART discovery
  app.get('/.well-known/smart-configuration', (req, res) => {
    res.json({
      authorization_endpoint: `http://localhost:${port}/auth/authorize`,
      token_endpoint: `http://localhost:${port}/auth/token`,
      scopes_supported: ['launch/patient', 'patient/*.read', 'patient/Observation.write'],
    });
  });

  // Token endpoint (mock — always returns a token)
  app.post('/auth/token', (req, res) => {
    res.json({
      access_token: 'mock-access-token-' + Date.now(),
      token_type: 'Bearer',
      expires_in: 3600,
      scope: req.body.scope || 'patient/*.read',
      refresh_token: 'mock-refresh-token',
    });
  });

  // FHIR CRUD
  app.post('/:resourceType', (req, res) => {
    const id = 'mock-' + Date.now();
    const resource = { ...req.body, id, meta: { versionId: '1' } };
    resources.set(`${req.params.resourceType}/${id}`, resource);
    res.status(201).json(resource);
  });

  app.get('/:resourceType/:id', (req, res) => {
    const key = `${req.params.resourceType}/${req.params.id}`;
    const resource = resources.get(key);
    resource ? res.json(resource) : res.status(404).json({ resourceType: 'OperationOutcome' });
  });

  app.get('/:resourceType', (req, res) => {
    const entries = [...resources.values()].filter(r => r.resourceType === req.params.resourceType);
    res.json({ resourceType: 'Bundle', type: 'searchset', entry: entries.map(r => ({ resource: r })) });
  });

  return app.listen(port);
}
```

##### 24-B: OAuth flow integration tests
- [ ] Test the full flow against the mock server:

```javascript
describe('OAuth Integration', () => {
  let mockServer;
  beforeAll(() => { mockServer = createMockFhirServer(9999); });
  afterAll(() => { mockServer.close(); });

  it('discovers SMART endpoints', async () => {
    const config = await discoverSmartConfig('http://localhost:9999');
    expect(config.token_endpoint).toBe('http://localhost:9999/auth/token');
  });

  it('builds authorization URL with PKCE', async () => {
    const url = await buildAuthorizationUrl(mockConnection);
    expect(url).toContain('code_challenge=');
    expect(url).toContain('code_challenge_method=S256');
  });

  it('exchanges code for tokens', async () => {
    const tokens = await exchangeCodeForTokens('http://localhost:9999/auth/token', {
      code: 'mock-auth-code', client_id: 'test', redirect_uri: 'http://localhost:5173/api/ehr/callback',
      code_verifier: 'test-verifier', vendor: 'modmed',
    });
    expect(tokens.access_token).toBeTruthy();
    expect(tokens.expires_in).toBe(3600);
  });

  it('stores and retrieves encrypted tokens', async () => {
    await storeTokens(testConnectionId, { access_token: 'secret-token', expires_in: 3600 });
    const token = await getValidToken(testConnectionId);
    expect(token).toBe('secret-token');
  });
});
```

##### 24-C: FHIR CRUD round-trip tests
- [ ] Test create → read → update → search cycle for each resource type:

```javascript
describe('FHIR CRUD Round-Trips', () => {
  it('creates and reads back an Observation', async () => {
    const obs = dermMapLesionToFhirObservation(mockLesion, mockPatient, mockVisit, mockProvider);
    const created = await fhirClient.create({ resourceType: 'Observation', body: obs });
    const fetched = await fhirClient.read({ resourceType: 'Observation', id: created.id });
    expect(fetched.code.coding[0].code).toBe('400010006');
  });

  it('creates and reads back a DocumentReference', async () => { /* ... */ });
  it('searches Patients by identifier', async () => { /* ... */ });
  it('searches Appointments by date', async () => { /* ... */ });
});
```

##### 24-D: Sync engine integration tests
- [ ] Test queue processing end-to-end:

```javascript
describe('Sync Engine', () => {
  it('processes a pending push item and marks completed', async () => {
    const queueId = await enqueueSync({ /* observation push */ });
    await processQueue();
    const result = await pool.query('SELECT status FROM ehr_sync_queue WHERE queue_id = $1', [queueId]);
    expect(result.rows[0].status).toBe('completed');
  });

  it('retries failed items with exponential backoff', async () => {
    // Mock FHIR server returns 500 → item status becomes 'failed', attempts = 1, next_retry_at set
  });

  it('moves to dead_letter after max attempts', async () => {
    // Set attempts = 4, process → should become 'dead_letter'
  });

  it('deduplicates enqueue calls', async () => {
    const id1 = await enqueueSync({ /* same entity */ });
    const id2 = await enqueueSync({ /* same entity */ });
    expect(id1).toBe(id2);
  });
});
```

#### Verification

- [ ] Mock FHIR server handles all required CRUD operations
- [ ] OAuth flow test covers: discovery → auth URL → code exchange → token storage
- [ ] CRUD round-trip tests cover all 6 resource types (Patient, Observation, Encounter, DocumentReference, DiagnosticReport, Appointment)
- [ ] Sync engine tests cover: success, retry, dead-letter, dedup
- [ ] All tests pass: `cd backend && npx vitest run src/test/ehr/`

---

### 25. Vendor sandbox testing

**Goal:** Test against each vendor's official sandbox/test environment.

#### Files affected

| File | Change |
|------|--------|
| `backend/src/test/ehr/sandbox/modmed.sandbox.test.js` | ModMed sandbox round-trip tests |
| `backend/src/test/ehr/sandbox/epic.sandbox.test.js` | Epic open-sandbox tests |
| `backend/src/test/ehr/sandbox/cerner.sandbox.test.js` | Cerner Code Console sandbox tests |
| `backend/src/test/ehr/sandbox/athena.sandbox.test.js` | Athenahealth Preview API tests |
| `backend/src/test/ehr/sandbox/ecw.sandbox.test.js` | eClinicalWorks partner sandbox tests |
| `backend/src/test/ehr/sandbox/sandbox-helpers.js` | Shared sandbox utilities (token cache, skip logic) |
| `.env.sandbox` | Sandbox credentials — never committed |

#### Step-by-step

##### 25-A  Sandbox registration and credentials

1. **ModMed** — Apply at `developer.modmed.com`. Request EMA API sandbox access for specialty = Dermatology. Receive `client_id`, `client_secret`, and a test tenant URL (e.g., `https://sandbox-api.modmed.com`). Store in `.env.sandbox` as `MODMED_SANDBOX_CLIENT_ID`, `MODMED_SANDBOX_CLIENT_SECRET`, `MODMED_SANDBOX_BASE_URL`.
2. **Epic** — Register at `fhir.epic.com/Developer`. Create a "Backend System" or "Patient-facing" app. Epic provides an open sandbox at `https://fhir.epic.com/interconnect-fhir-oauth/api/FHIR/R4` with test patients (e.g., `Camila Lopez`, MRN `E3826`). Store `EPIC_SANDBOX_CLIENT_ID` and upload your public JWKS (RS384 key from Task 5).
3. **Cerner / Oracle Health** — Register at `code.cerner.com`. Create a SMART app. Cerner provides `https://fhir-myrecord.cerner.com/r4/ec2458f2-1e24-41c8-b71b-0e701af7583d` (Millennium sandbox). Store `CERNER_SANDBOX_CLIENT_ID`, `CERNER_SANDBOX_CLIENT_SECRET`.
4. **Athenahealth** — Apply at `developer.athenahealth.com`. Request Preview API access. Sandbox base: `https://api.preview.platform.athenahealth.com/fhir/r4`. Store `ATHENA_SANDBOX_CLIENT_ID`, `ATHENA_SANDBOX_CLIENT_SECRET`.
5. **eClinicalWorks** — Contact eCW partner program. Sandbox access is granted after partnership agreement. Store `ECW_SANDBOX_CLIENT_ID`, `ECW_SANDBOX_CLIENT_SECRET`, `ECW_SANDBOX_BASE_URL`.

##### 25-B  Shared sandbox test helper

Create `backend/src/test/ehr/sandbox/sandbox-helpers.js`:

```js
import { describe, it, beforeAll } from 'vitest';
import dotenv from 'dotenv';
import path from 'path';

// Load sandbox env vars
dotenv.config({ path: path.resolve(__dirname, '../../../../../.env.sandbox') });

/**
 * Skip sandbox suite if credentials are missing.
 * CI runs skip these by default; developers opt-in via .env.sandbox.
 */
export function describeSandbox(vendor, envPrefix, fn) {
  const clientId = process.env[`${envPrefix}_SANDBOX_CLIENT_ID`];
  const skip = !clientId;
  const suiteFn = skip ? describe.skip : describe;
  suiteFn(`[SANDBOX] ${vendor}`, fn);
}

/** Cache access tokens per suite run to avoid repeated OAuth round-trips. */
const tokenCache = new Map();

export async function getCachedToken(vendorKey, fetchTokenFn) {
  if (tokenCache.has(vendorKey)) {
    const cached = tokenCache.get(vendorKey);
    if (cached.expiresAt > Date.now() + 60_000) return cached.accessToken;
  }
  const { accessToken, expiresIn } = await fetchTokenFn();
  tokenCache.set(vendorKey, {
    accessToken,
    expiresAt: Date.now() + expiresIn * 1000,
  });
  return accessToken;
}
```

##### 25-C  ModMed sandbox test

```js
// backend/src/test/ehr/sandbox/modmed.sandbox.test.js
import { describeSandbox, getCachedToken } from './sandbox-helpers.js';
import { ModmedAdapter } from '../../../services/ehr/vendors/modmed.js';
import { it, expect, beforeAll } from 'vitest';

describeSandbox('ModMed EMA', 'MODMED', () => {
  let adapter;
  let token;

  beforeAll(async () => {
    adapter = new ModmedAdapter({
      baseUrl: process.env.MODMED_SANDBOX_BASE_URL,
      clientId: process.env.MODMED_SANDBOX_CLIENT_ID,
      clientSecret: process.env.MODMED_SANDBOX_CLIENT_SECRET,
    });
    token = await getCachedToken('modmed', () => adapter.getBackendToken());
  });

  it('reads Patient by MRN', async () => {
    const bundle = await adapter.searchPatient(token, { identifier: 'TEST-001' });
    expect(bundle.resourceType).toBe('Bundle');
    expect(bundle.entry?.length).toBeGreaterThan(0);
  });

  it('reads Observations for a test patient', async () => {
    const bundle = await adapter.searchObservations(token, { patient: 'test-patient-1' });
    expect(bundle.resourceType).toBe('Bundle');
  });

  it('creates and reads back a DocumentReference', async () => {
    const docRef = await adapter.createDocumentReference(token, {
      patientId: 'test-patient-1',
      content: Buffer.from('test PDF content'),
      contentType: 'application/pdf',
      description: 'DermMap sandbox test',
    });
    expect(docRef.id).toBeDefined();

    const readBack = await adapter.readResource(token, 'DocumentReference', docRef.id);
    expect(readBack.id).toBe(docRef.id);
  });
});
```

##### 25-D  Epic sandbox test

```js
// backend/src/test/ehr/sandbox/epic.sandbox.test.js
import { describeSandbox, getCachedToken } from './sandbox-helpers.js';
import { EpicAdapter } from '../../../services/ehr/vendors/epic.js';
import { it, expect, beforeAll } from 'vitest';

describeSandbox('Epic', 'EPIC', () => {
  let adapter;
  let token;

  beforeAll(async () => {
    adapter = new EpicAdapter({
      baseUrl: 'https://fhir.epic.com/interconnect-fhir-oauth/api/FHIR/R4',
      clientId: process.env.EPIC_SANDBOX_CLIENT_ID,
      jwksPath: process.env.EPIC_JWKS_PATH,  // path to RS384 private key
    });
    // Epic backend auth uses signed JWT assertion (no client_secret)
    token = await getCachedToken('epic', () => adapter.getBackendToken());
  });

  it('reads well-known test patient Camila Lopez', async () => {
    // Epic sandbox patient: Camila Lopez, FHIR ID = erXuFYUfucBZaryVksYEcMg3
    const patient = await adapter.readResource(token, 'Patient', 'erXuFYUfucBZaryVksYEcMg3');
    expect(patient.resourceType).toBe('Patient');
    expect(patient.name[0].family).toBe('Lopez');
  });

  it('searches Encounters for test patient', async () => {
    const bundle = await adapter.searchEncounters(token, { patient: 'erXuFYUfucBZaryVksYEcMg3' });
    expect(bundle.resourceType).toBe('Bundle');
  });

  it('handles 403 for restricted scopes gracefully', async () => {
    // Epic sandbox restricts write scopes by default
    const result = await adapter.createObservation(token, {
      patientId: 'erXuFYUfucBZaryVksYEcMg3',
      code: '39607008',
      display: 'Test lesion',
    }).catch(e => e);
    // Expect graceful error, not crash
    expect(result).toBeDefined();
  });
});
```

##### 25-E  Cerner sandbox test

```js
// backend/src/test/ehr/sandbox/cerner.sandbox.test.js
import { describeSandbox, getCachedToken } from './sandbox-helpers.js';
import { CernerAdapter } from '../../../services/ehr/vendors/cerner.js';
import { it, expect, beforeAll } from 'vitest';

describeSandbox('Cerner / Oracle Health', 'CERNER', () => {
  let adapter;
  let token;

  beforeAll(async () => {
    adapter = new CernerAdapter({
      baseUrl: 'https://fhir-myrecord.cerner.com/r4/ec2458f2-1e24-41c8-b71b-0e701af7583d',
      clientId: process.env.CERNER_SANDBOX_CLIENT_ID,
      clientSecret: process.env.CERNER_SANDBOX_CLIENT_SECRET,
    });
    token = await getCachedToken('cerner', () => adapter.getClientCredentialsToken());
  });

  it('reads Patient resource from Millennium sandbox', async () => {
    // Cerner sandbox test patient ID: 12742399
    const patient = await adapter.readResource(token, 'Patient', '12742399');
    expect(patient.resourceType).toBe('Patient');
  });

  it('searches DiagnosticReports', async () => {
    const bundle = await adapter.searchDiagnosticReports(token, { patient: '12742399' });
    expect(bundle.resourceType).toBe('Bundle');
  });

  it('respects Cerner rate limits (429 retry)', async () => {
    // Rapid-fire requests to trigger rate limit handling
    const promises = Array.from({ length: 5 }, () =>
      adapter.readResource(token, 'Patient', '12742399')
    );
    const results = await Promise.allSettled(promises);
    const fulfilled = results.filter(r => r.status === 'fulfilled');
    expect(fulfilled.length).toBe(5); // All should succeed via retry logic
  });
});
```

##### 25-F  Athenahealth and eCW sandbox tests follow the same pattern.

Create equivalent files (`athena.sandbox.test.js`, `ecw.sandbox.test.js`) using respective adapters and sandbox base URLs. Each should test:
- Patient read by known test ID
- Observation or Encounter search
- Write operation (create DocumentReference) if sandbox allows
- Error handling for restricted operations

##### 25-G  CI configuration

Add to `package.json` scripts:
```json
"test:sandbox": "cd backend && DOTENV_CONFIG_PATH=../.env.sandbox npx vitest run src/test/ehr/sandbox/"
```

In CI (GitHub Actions), sandbox tests run **only** on `release/*` branches with secrets injected:
```yaml
# .github/workflows/sandbox-tests.yml
name: EHR Sandbox Tests
on:
  push:
    branches: ['release/*']
jobs:
  sandbox:
    runs-on: ubuntu-latest
    environment: ehr-sandbox   # GitHub Environment with vendor secrets
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20 }
      - run: npm ci && cd backend && npm ci
      - run: npm run test:sandbox
        env:
          MODMED_SANDBOX_CLIENT_ID: ${{ secrets.MODMED_SANDBOX_CLIENT_ID }}
          MODMED_SANDBOX_CLIENT_SECRET: ${{ secrets.MODMED_SANDBOX_CLIENT_SECRET }}
          MODMED_SANDBOX_BASE_URL: ${{ secrets.MODMED_SANDBOX_BASE_URL }}
          EPIC_SANDBOX_CLIENT_ID: ${{ secrets.EPIC_SANDBOX_CLIENT_ID }}
          EPIC_JWKS_PATH: ${{ secrets.EPIC_JWKS_PATH }}
          CERNER_SANDBOX_CLIENT_ID: ${{ secrets.CERNER_SANDBOX_CLIENT_ID }}
          CERNER_SANDBOX_CLIENT_SECRET: ${{ secrets.CERNER_SANDBOX_CLIENT_SECRET }}
          ATHENA_SANDBOX_CLIENT_ID: ${{ secrets.ATHENA_SANDBOX_CLIENT_ID }}
          ATHENA_SANDBOX_CLIENT_SECRET: ${{ secrets.ATHENA_SANDBOX_CLIENT_SECRET }}
          ECW_SANDBOX_CLIENT_ID: ${{ secrets.ECW_SANDBOX_CLIENT_ID }}
          ECW_SANDBOX_CLIENT_SECRET: ${{ secrets.ECW_SANDBOX_CLIENT_SECRET }}
          ECW_SANDBOX_BASE_URL: ${{ secrets.ECW_SANDBOX_BASE_URL }}
```

#### Verification

- [ ] `.env.sandbox` exists locally with at least ModMed + Epic credentials
- [ ] Sandbox tests auto-skip when credentials are missing (`describe.skip`)
- [ ] ModMed: Patient read, Observation search, DocumentReference create/read
- [ ] Epic: Known test patient read, Encounter search, 403 error handling
- [ ] Cerner: Patient read, DiagnosticReport search, rate-limit retry
- [ ] Athena: Patient read, basic CRUD if permitted
- [ ] eCW: Patient read, basic CRUD if permitted
- [ ] CI pipeline runs sandbox tests only on `release/*` branches
- [ ] No sandbox credentials appear in logs or committed files

---

### 26. E2E tests — full sync cycle

**Goal:** End-to-end tests covering the complete pull → transform → display → edit → push cycle.

#### Files affected

| File | Change |
|------|--------|
| `e2e/ehr-sync.spec.ts` | Playwright E2E: connect → pull → display → edit → push |
| `e2e/ehr-fixtures/mock-fhir-server.ts` | Lightweight Express FHIR server for E2E |
| `e2e/ehr-fixtures/test-data.ts` | FHIR Bundle fixtures for E2E |
| `playwright.config.ts` | Add E2E project for EHR tests |

#### Step-by-step

##### 26-A  E2E mock FHIR server fixture

Create `e2e/ehr-fixtures/mock-fhir-server.ts` — a lightweight Express server that Playwright starts before tests:

```ts
import express from 'express';
import { Server } from 'http';

export function createMockFhirServer(port = 9090): { start: () => Promise<Server>; stop: (s: Server) => Promise<void> } {
  const app = express();
  app.use(express.json());

  // SMART discovery
  app.get('/fhir/r4/.well-known/smart-configuration', (req, res) => {
    res.json({
      authorization_endpoint: `http://localhost:${port}/auth/authorize`,
      token_endpoint: `http://localhost:${port}/auth/token`,
      capabilities: ['launch-ehr', 'client-public', 'client-confidential-symmetric'],
    });
  });

  // Metadata
  app.get('/fhir/r4/metadata', (req, res) => {
    res.json({ resourceType: 'CapabilityStatement', fhirVersion: '4.0.1', status: 'active' });
  });

  // Fake OAuth — immediately redirect with code
  app.get('/auth/authorize', (req, res) => {
    const { redirect_uri, state } = req.query;
    res.redirect(`${redirect_uri}?code=e2e-test-code&state=${state}`);
  });

  // Fake token exchange
  app.post('/auth/token', (req, res) => {
    res.json({
      access_token: 'e2e-mock-token',
      token_type: 'Bearer',
      expires_in: 3600,
      scope: 'patient/*.read patient/*.write',
      patient: 'e2e-patient-1',
    });
  });

  // Patient read
  app.get('/fhir/r4/Patient/:id', (req, res) => {
    res.json({
      resourceType: 'Patient',
      id: req.params.id,
      name: [{ family: 'TestPatient', given: ['E2E'] }],
      birthDate: '1985-03-15',
      gender: 'female',
    });
  });

  // Observation search
  app.get('/fhir/r4/Observation', (req, res) => {
    res.json({
      resourceType: 'Bundle', type: 'searchset', total: 1,
      entry: [{
        resource: {
          resourceType: 'Observation', id: 'obs-1',
          code: { coding: [{ system: 'http://snomed.info/sct', code: '39607008', display: 'Lung structure' }] },
          subject: { reference: `Patient/${req.query.patient}` },
        },
      }],
    });
  });

  // Observation create (push)
  app.post('/fhir/r4/Observation', (req, res) => {
    res.status(201).json({ ...req.body, id: 'obs-new-' + Date.now() });
  });

  return {
    start: () => new Promise(resolve => { const s = app.listen(port, () => resolve(s)); }),
    stop: (s) => new Promise(resolve => s.close(resolve)),
  };
}
```

##### 26-B  Playwright E2E test

Create `e2e/ehr-sync.spec.ts`:

```ts
import { test, expect } from '@playwright/test';
import { createMockFhirServer } from './ehr-fixtures/mock-fhir-server';
import type { Server } from 'http';

let fhirServer: Server;

test.beforeAll(async () => {
  const mock = createMockFhirServer(9090);
  fhirServer = await mock.start();
});

test.afterAll(async () => {
  if (fhirServer) await new Promise(r => fhirServer.close(r));
});

// ----- Test: Full EHR connection → pull → display → edit → push cycle -----

test('connects to EHR, pulls patient data, edits, and pushes back', async ({ page }) => {
  // 1. Navigate to EHR integration page
  await page.goto('/ehr');
  await expect(page.getByRole('heading', { name: /EHR Integration/i })).toBeVisible();

  // 2. Add a new connection pointing to mock FHIR server
  await page.getByRole('button', { name: /Add Connection/i }).click();
  await page.getByLabel('Vendor').selectOption('modmed');
  await page.getByLabel('FHIR Base URL').fill('http://localhost:9090/fhir/r4');
  await page.getByLabel('Client ID').fill('e2e-client');
  await page.getByLabel('Client Secret').fill('e2e-secret');
  await page.getByRole('button', { name: /Connect/i }).click();

  // 3. Verify OAuth redirect completes and connection shows "Connected"
  await expect(page.getByText('Connected')).toBeVisible({ timeout: 10_000 });

  // 4. Trigger sync pull
  await page.getByRole('button', { name: /Sync Now/i }).click();
  await expect(page.getByText('Sync complete')).toBeVisible({ timeout: 15_000 });

  // 5. Verify patient data appeared
  await page.goto('/patients');
  await expect(page.getByText('TestPatient, E2E')).toBeVisible();

  // 6. Open patient and verify observations loaded
  await page.getByText('TestPatient, E2E').click();
  await expect(page.getByText(/Observation/i)).toBeVisible();

  // 7. Edit observation (add a note)
  await page.getByRole('button', { name: /Edit/i }).first().click();
  await page.getByLabel('Notes').fill('E2E test note added');
  await page.getByRole('button', { name: /Save/i }).click();

  // 8. Push changes back to EHR
  await page.getByRole('button', { name: /Push to EHR/i }).click();
  await expect(page.getByText('Push complete')).toBeVisible({ timeout: 10_000 });
});

test('displays error when EHR server is unreachable', async ({ page }) => {
  await page.goto('/ehr');
  await page.getByRole('button', { name: /Add Connection/i }).click();
  await page.getByLabel('Vendor').selectOption('epic');
  await page.getByLabel('FHIR Base URL').fill('http://localhost:1/fhir/r4'); // unreachable
  await page.getByLabel('Client ID').fill('bad-client');
  await page.getByRole('button', { name: /Connect/i }).click();

  await expect(page.getByText(/connection failed|unable to connect/i)).toBeVisible({ timeout: 10_000 });
});

test('handles token expiration gracefully during sync', async ({ page }) => {
  // Connect with mock server
  await page.goto('/ehr');
  await page.getByRole('button', { name: /Add Connection/i }).click();
  await page.getByLabel('Vendor').selectOption('modmed');
  await page.getByLabel('FHIR Base URL').fill('http://localhost:9090/fhir/r4');
  await page.getByLabel('Client ID').fill('e2e-client');
  await page.getByLabel('Client Secret').fill('e2e-secret');
  await page.getByRole('button', { name: /Connect/i }).click();
  await expect(page.getByText('Connected')).toBeVisible({ timeout: 10_000 });

  // Simulate token expiry by clearing stored tokens
  await page.evaluate(() => {
    // Clear any stored tokens to force refresh
    localStorage.removeItem('ehr_access_token');
  });

  // Trigger sync — should auto-refresh token and succeed
  await page.getByRole('button', { name: /Sync Now/i }).click();
  await expect(page.getByText(/Sync complete|Token refreshed/i)).toBeVisible({ timeout: 15_000 });
});
```

##### 26-C  Playwright config update

Add an EHR E2E project to `playwright.config.ts`:

```ts
// In the projects array, add:
{
  name: 'ehr-e2e',
  testMatch: /ehr-sync\.spec\.ts/,
  use: {
    baseURL: 'http://localhost:5173',
  },
  // Start both the frontend dev server AND the backend
  webServer: [
    { command: 'npm run dev', url: 'http://localhost:5173', reuseExistingServer: true },
    { command: 'cd backend && npm start', url: 'http://localhost:3000/health', reuseExistingServer: true },
  ],
}
```

Add script: `"test:e2e:ehr": "npx playwright test --project=ehr-e2e"`

#### Verification

- [ ] Mock FHIR server starts on port 9090 and serves discovery, OAuth, Patient, Observation endpoints
- [ ] E2E test completes full cycle: connect → OAuth → pull → display → edit → push
- [ ] Unreachable server test verifies graceful error display
- [ ] Token expiration test verifies automatic refresh
- [ ] Tests run headless in CI: `npm run test:e2e:ehr`
- [ ] No test data leaks into production database

---

---

## PHASE 6 — Production Launch and Compliance

<!-- SECTION: PHASE_6 — to be filled -->

### 27. HIPAA compliance for EHR data flows

**Goal:** Ensure all EHR data flows meet HIPAA Technical Safeguard requirements (45 CFR §164.312).

#### Files affected

| File | Change |
|------|--------|
| `backend/src/middleware/ehrAudit.js` | PHI access audit logger — every FHIR read/write logged |
| `backend/src/services/ehr/encryption.js` | AES-256-GCM encryption for PHI at rest in `ehr_tokens`, `ehr_sync_queue` |
| `backend/src/db/setup.js` | Add encryption columns, tighten column-level permissions |
| `nginx.conf` | Enforce TLS 1.2+, HSTS, disable weak ciphers |
| `docker-compose.yml` | Add `POSTGRES_SSL=require`, volume encryption notes |
| `backend/src/services/ehr/tokenManager.js` | Encrypt tokens at rest, decrypt only in-memory |
| `docs/HIPAA_EHR_CONTROLS.md` | Mapping of HIPAA Technical Safeguards → DermMap controls |

#### Step-by-step

##### 27-A  Encryption in transit (§164.312(e)(1))

1. **TLS 1.2+ enforcement** — Verify `nginx.conf` already sets `ssl_protocols TLSv1.2 TLSv1.3;` and `ssl_ciphers 'ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384';`. Add if missing.
2. **HSTS header** — Add `add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload" always;` to nginx.
3. **Backend → EHR TLS** — All `fhir-kit-client` requests use `https://`. Add a startup check that rejects any `EHR_*_BASE_URL` env var not starting with `https://`.
4. **Backend → PostgreSQL TLS** — Set `PGSSLMODE=require` in connection config. Verify with `SELECT ssl_is_used FROM pg_stat_ssl WHERE pid = pg_backend_pid();`.

##### 27-B  Encryption at rest (§164.312(a)(2)(iv))

1. Create `backend/src/services/ehr/encryption.js`:

```js
import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const KEY = Buffer.from(process.env.EHR_ENCRYPTION_KEY, 'hex'); // 32-byte key

export function encrypt(plaintext) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGORITHM, KEY, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  // Store as: iv:tag:ciphertext (all hex)
  return `${iv.toString('hex')}:${tag.toString('hex')}:${encrypted.toString('hex')}`;
}

export function decrypt(stored) {
  const [ivHex, tagHex, ciphertextHex] = stored.split(':');
  const decipher = crypto.createDecipheriv(ALGORITHM, KEY, Buffer.from(ivHex, 'hex'));
  decipher.setAuthTag(Buffer.from(tagHex, 'hex'));
  return decipher.update(ciphertextHex, 'hex', 'utf8') + decipher.final('utf8');
}
```

2. **Encrypt token storage** — In `tokenManager.js`, call `encrypt()` before INSERT/UPDATE to `ehr_tokens` table, `decrypt()` on SELECT.
3. **Encrypt sync queue payloads** — `ehr_sync_queue.payload` contains PHI. Encrypt with `encrypt()` before insert, decrypt when processing.
4. **Key management** — `EHR_ENCRYPTION_KEY` stored in environment (AWS Secrets Manager, Azure Key Vault, or Docker secrets). 32-byte hex key generated via `crypto.randomBytes(32).toString('hex')`. Rotate via dual-key window.

##### 27-C  Access controls (§164.312(a)(1))

1. **Role-based access** — Only users with `role = 'provider'` or `role = 'admin'` can trigger EHR sync. Middleware check on all `/api/ehr/*` routes:

```js
// backend/src/middleware/ehrAudit.js
export function requireEhrAccess(req, res, next) {
  if (!['provider', 'admin'].includes(req.user?.role)) {
    return res.status(403).json({ error: 'EHR access requires provider or admin role' });
  }
  next();
}
```

2. **Minimum necessary** — FHIR queries use `_elements` parameter to request only needed fields (e.g., `?_elements=name,birthDate,identifier` for Patient).
3. **Session timeout** — SMART tokens expire per vendor policy (typically 5-60 min). Backend never extends beyond vendor-issued `expires_in`.

##### 27-D  Audit controls (§164.312(b))

1. **PHI access logging** — Every FHIR API call logged to `audit_logs` table with: `user_id`, `action` (read/write), `resource_type`, `fhir_resource_id`, `vendor`, `timestamp`, `ip_address`.

```js
// In ehrAudit.js middleware
export function logEhrAccess(action, resourceType) {
  return async (req, res, next) => {
    const start = Date.now();
    res.on('finish', async () => {
      await db.query(
        `INSERT INTO audit_logs (user_id, action, resource_type, details, ip_address, created_at)
         VALUES ($1, $2, $3, $4, $5, NOW())`,
        [
          req.user?.id,
          `ehr:${action}`,
          resourceType,
          JSON.stringify({
            vendor: req.params.vendor,
            fhirResourceId: req.params.resourceId,
            statusCode: res.statusCode,
            durationMs: Date.now() - start,
          }),
          req.ip,
        ]
      );
    });
    next();
  };
}
```

2. **Audit log retention** — 6 years minimum (HIPAA requirement). Add DB policy: `ALTER TABLE audit_logs SET (autovacuum_enabled = true);` with no auto-delete.
3. **Audit log immutability** — Remove DELETE and UPDATE grants on `audit_logs` for the application DB user.

##### 27-E  BAA documentation

1. **Vendor BAAs** — Each EHR vendor requires a Business Associate Agreement before production access. Track in `baa_records` table (already exists in schema).
2. **Infrastructure BAAs** — Ensure BAAs are in place with: hosting provider (AWS/Azure/GCP), database provider, any backup/monitoring SaaS.
3. **Create HIPAA control mapping doc** at `docs/HIPAA_EHR_CONTROLS.md` listing each Technical Safeguard → DermMap implementation.

#### Verification

- [ ] All FHIR API calls use TLS 1.2+ (test with `openssl s_client -connect <host>:443`)
- [ ] PostgreSQL connection uses SSL (`PGSSLMODE=require` verified)
- [ ] HSTS header present with `max-age >= 63072000`
- [ ] Tokens in `ehr_tokens` table are encrypted (not plaintext)
- [ ] Sync queue payloads are encrypted at rest
- [ ] `EHR_ENCRYPTION_KEY` not in source code, loaded from environment
- [ ] Role check rejects non-provider/admin users from `/api/ehr/*` routes
- [ ] Every FHIR read/write creates an `audit_logs` entry
- [ ] Audit logs cannot be deleted by application DB user
- [ ] `docs/HIPAA_EHR_CONTROLS.md` maps all §164.312 subsections
- [ ] BAA records exist for all vendors and infrastructure providers

---

### 28. Vendor marketplace submissions and certification

**Goal:** Submit DermMap for certification/listing on each vendor's app marketplace.

#### Step-by-step

##### 28-A  ModMed Marketplace

1. **Portal:** `developer.modmed.com` → Partner Portal
2. **Requirements:** Working integration with EMA sandbox, HIPAA compliance documentation, completed security questionnaire, signed partner agreement.
3. **Submission artifacts:**
   - App description (dermatology-focused clinical documentation)
   - Screenshots of DermMap EHR sync UI
   - FHIR resource scope list (`patient/*.read`, `patient/Observation.write`, `patient/DocumentReference.write`)
   - Privacy policy URL, Terms of Service URL
   - Support contact and escalation procedures
4. **Review process:** ModMed technical review (2-4 weeks) → security review → approval → listing.
5. **Timeline:** Submit Q2 2026 after sandbox testing passes.

##### 28-B  Epic App Orchard / Galaxy

1. **Portal:** `appmarket.epic.com` (formerly App Orchard, now Epic on FHIR)
2. **Requirements:**
   - **SMART on FHIR conformance** — App must pass Epic's automated SMART test suite.
   - **Launch context** — Support EHR launch (`launch/patient` scope) and standalone launch.
   - **RS384 JWT auth** — Must use asymmetric auth (no client_secret for production).
   - **ONC Health IT Certification (g)(10)** — Required for patient-facing apps.
   - **Security questionnaire** — Detailed security practices, penetration test results, SOC 2 if available.
3. **Submission artifacts:**
   - App listing (name, description, specialty = Dermatology, category = Clinical Documentation)
   - FHIR scope manifest
   - Launch URLs (EHR launch redirect, standalone launch)
   - JWKS endpoint URL (public keys)
   - Privacy policy, Terms of Service, BAA template
4. **Review process:** Automated SMART conformance check → Epic security review (4-8 weeks) → App Orchard listing.
5. **Timeline:** Submit Q3 2026.

##### 28-C  Oracle Health (Cerner) Code Console

1. **Portal:** `code.cerner.com` → App Gallery
2. **Requirements:**
   - SMART on FHIR app passing Cerner's Millennium sandbox validation.
   - Completed Cerner security review (includes HIPAA questionnaire).
   - Support for Cerner's patient/user launch contexts.
3. **Submission artifacts:**
   - App registration in Code Console (already done for sandbox)
   - Production promotion request
   - Security attestation form
   - Support SLA documentation
4. **Review process:** Cerner validation suite → security review (3-6 weeks) → production credentials issued.
5. **Timeline:** Submit Q3 2026.

##### 28-D  Athenahealth Marketplace

1. **Portal:** `marketplace.athenahealth.com` → Developer Portal
2. **Requirements:**
   - Working integration with Preview API sandbox.
   - Athena partner agreement signed.
   - Completed data use questionnaire.
3. **Submission artifacts:**
   - App profile (name, category, specialty)
   - API scope list
   - Webhook endpoint URLs (if using Athena subscription events)
   - Support documentation
4. **Review process:** Technical review → compliance review (3-5 weeks) → marketplace listing.
5. **Timeline:** Submit Q4 2026.

##### 28-E  eClinicalWorks Partner Marketplace

1. **Portal:** eCW partner program (contact-based, not self-service)
2. **Requirements:**
   - Signed partnership agreement.
   - Integration validated in eCW sandbox.
   - eCW-specific API usage patterns documented.
3. **Submission artifacts:**
   - Partner application form
   - Integration demo (live walkthrough with eCW team)
   - Security documentation
4. **Review process:** Partner onboarding → technical validation → listing (4-8 weeks).
5. **Timeline:** Submit Q1 2027.

##### 28-F  ONC Health IT Certification (optional but recommended)

1. **Standard:** ONC Cures Act Final Rule — §170.315(g)(10) Standardized API for patient and population services.
2. **Benefit:** Required by some health systems; proves FHIR R4 compliance to all vendors.
3. **Process:** Engage an ONC-ACB (Accredited Certification Body) such as Drummond Group or SLI Compliance. Typical timeline: 3-6 months.
4. **Scope:** Test SMART on FHIR launch, FHIR resource reads, USCDI v1 data classes.

#### Verification

- [ ] ModMed partner agreement signed and app submitted
- [ ] Epic App Orchard listing submitted with JWKS endpoint
- [ ] Epic SMART conformance automated test passes
- [ ] Cerner Code Console production promotion requested
- [ ] Athena marketplace profile submitted
- [ ] eCW partner demo completed
- [ ] All vendor security questionnaires answered
- [ ] Privacy policy and Terms of Service URLs live and accessible
- [ ] Support escalation procedures documented for each vendor
- [ ] ONC certification process initiated (if pursuing)

---

### 29. Monitoring, alerting, and operational runbook

**Goal:** Build observability for EHR sync health — dashboards, alerts, and incident response.

#### Files affected

| File | Change |
|------|--------|
| `backend/src/services/ehr/metrics.js` | Prometheus-style metrics: sync latency, error rates, token refresh counts |
| `backend/src/services/ehr/healthCheck.js` | `/api/ehr/health` endpoint — vendor connectivity status |
| `backend/src/routes/ehrRoutes.js` | Mount health check endpoint |
| `docs/EHR_RUNBOOK.md` | Operational runbook for on-call engineers |
| `docker-compose.yml` | Add Prometheus + Grafana services (optional) |

#### Step-by-step

##### 29-A  EHR health check endpoint

Create `backend/src/services/ehr/healthCheck.js`:

```js
import db from '../../db/setup.js';

export async function getEhrHealth() {
  const connections = await db.query(`
    SELECT vendor, status, last_sync_at, 
           EXTRACT(EPOCH FROM (NOW() - last_sync_at)) AS seconds_since_sync
    FROM ehr_connections
    WHERE status != 'disconnected'
  `);

  const queueStats = await db.query(`
    SELECT status, COUNT(*) as count
    FROM ehr_sync_queue
    GROUP BY status
  `);

  const failedRecent = await db.query(`
    SELECT COUNT(*) as count
    FROM ehr_sync_queue
    WHERE status = 'failed' AND updated_at > NOW() - INTERVAL '1 hour'
  `);

  return {
    status: failedRecent.rows[0]?.count > 10 ? 'degraded' : 'healthy',
    timestamp: new Date().toISOString(),
    connections: connections.rows.map(c => ({
      vendor: c.vendor,
      status: c.status,
      lastSync: c.last_sync_at,
      secondsSinceSync: Math.round(c.seconds_since_sync),
      stale: c.seconds_since_sync > 3600, // > 1 hour = stale
    })),
    queue: {
      pending: queueStats.rows.find(r => r.status === 'pending')?.count || 0,
      processing: queueStats.rows.find(r => r.status === 'processing')?.count || 0,
      failed: queueStats.rows.find(r => r.status === 'failed')?.count || 0,
      deadLetter: queueStats.rows.find(r => r.status === 'dead_letter')?.count || 0,
    },
    failedLastHour: parseInt(failedRecent.rows[0]?.count || 0),
  };
}
```

Mount at `GET /api/ehr/health` (requires admin role).

##### 29-B  Metrics collection

Create `backend/src/services/ehr/metrics.js`:

```js
const metrics = {
  syncPullTotal: 0,
  syncPushTotal: 0,
  syncErrorTotal: 0,
  tokenRefreshTotal: 0,
  tokenRefreshErrorTotal: 0,
  lastSyncDurationMs: {},    // keyed by vendor
  syncLatencyHistogram: [],  // { vendor, durationMs, timestamp }
};

export function recordSyncPull(vendor, durationMs, success) {
  metrics.syncPullTotal++;
  if (!success) metrics.syncErrorTotal++;
  metrics.lastSyncDurationMs[vendor] = durationMs;
  metrics.syncLatencyHistogram.push({ vendor, durationMs, timestamp: Date.now() });
  // Keep last 1000 entries
  if (metrics.syncLatencyHistogram.length > 1000) metrics.syncLatencyHistogram.shift();
}

export function recordSyncPush(vendor, durationMs, success) {
  metrics.syncPushTotal++;
  if (!success) metrics.syncErrorTotal++;
  metrics.lastSyncDurationMs[vendor] = durationMs;
}

export function recordTokenRefresh(vendor, success) {
  metrics.tokenRefreshTotal++;
  if (!success) metrics.tokenRefreshErrorTotal++;
}

export function getMetrics() {
  return { ...metrics };
}

// Prometheus-format export (if using Prometheus)
export function getPrometheusMetrics() {
  return [
    `# HELP dermmap_ehr_sync_pull_total Total EHR sync pull operations`,
    `# TYPE dermmap_ehr_sync_pull_total counter`,
    `dermmap_ehr_sync_pull_total ${metrics.syncPullTotal}`,
    `# HELP dermmap_ehr_sync_push_total Total EHR sync push operations`,
    `# TYPE dermmap_ehr_sync_push_total counter`,
    `dermmap_ehr_sync_push_total ${metrics.syncPushTotal}`,
    `# HELP dermmap_ehr_sync_error_total Total EHR sync errors`,
    `# TYPE dermmap_ehr_sync_error_total counter`,
    `dermmap_ehr_sync_error_total ${metrics.syncErrorTotal}`,
    `# HELP dermmap_ehr_token_refresh_total Total OAuth token refreshes`,
    `# TYPE dermmap_ehr_token_refresh_total counter`,
    `dermmap_ehr_token_refresh_total ${metrics.tokenRefreshTotal}`,
  ].join('\n');
}
```

##### 29-C  Alerting rules

Define alert thresholds (implement via Grafana alerts, PagerDuty, or simple cron check):

| Alert | Condition | Severity | Action |
|-------|-----------|----------|--------|
| Sync stale | No successful sync in > 2 hours for any active connection | **Warning** | Check vendor API status, verify tokens |
| High error rate | > 10 sync failures in 1 hour | **Critical** | Page on-call, check logs, check vendor status page |
| Token refresh failure | Token refresh fails 3 consecutive times | **Critical** | Verify credentials, check vendor OAuth endpoint |
| Dead letter queue growing | > 20 items in dead_letter status | **Warning** | Manual review needed, possible data mapping issue |
| Queue backlog | > 100 pending items for > 30 min | **Warning** | Check sync engine process, possible slowdown |
| Disk/DB growth | `ehr_sync_queue` > 100K rows | **Info** | Run cleanup of completed items older than 30 days |

##### 29-D  Operational runbook

Create `docs/EHR_RUNBOOK.md` covering:

1. **Sync failures — common causes and fixes:**
   - **401 Unauthorized** → Token expired or revoked → Trigger manual token refresh → If persists, re-authorize connection.
   - **403 Forbidden** → Scope insufficient → Check vendor app configuration → May need scope upgrade.
   - **429 Too Many Requests** → Rate limited → Check `Retry-After` header → Back off and retry.
   - **500/502/503 from vendor** → Vendor outage → Check vendor status page → Wait and retry.
   - **Network timeout** → DNS or connectivity issue → Check outbound firewall rules → Verify FHIR base URL.

2. **Token issues:**
   - **Refresh token expired** → User must re-authorize (SMART launch). Notify user via in-app banner.
   - **JWT signing key rotation (Epic)** → Update JWKS at `/api/ehr/jwks`. No user action needed if auto-rotation is configured.

3. **Data conflicts:**
   - **Remote wins by default** → Check `ehr_resource_map.last_synced_hash` → If local was modified, flag for manual review → Admin resolves in conflict resolution UI.

4. **Dead letter queue processing:**
   - Query: `SELECT * FROM ehr_sync_queue WHERE status = 'dead_letter' ORDER BY updated_at DESC LIMIT 50;`
   - Common causes: invalid FHIR resource (mapping bug), vendor-specific validation error, resource deleted on vendor side.
   - Fix: Correct mapping → Reset status to `pending` → Will be retried automatically.

5. **Emergency disconnect:**
   - `UPDATE ehr_connections SET status = 'disconnected' WHERE vendor = '<vendor>';`
   - Stops all sync immediately. Pending queue items will pause until reconnected.

6. **Vendor status pages:**
   - ModMed: `status.modmed.com`
   - Epic: `status.epic.com`
   - Cerner: `status.oracle.com/health`
   - Athena: `status.athenahealth.com`
   - eCW: Contact partner support

##### 29-E  Dashboard (Grafana or built-in)

Build a simple admin dashboard at `/admin/ehr-health` showing:
- Connection status cards (green/yellow/red per vendor)
- Sync activity chart (pulls/pushes per hour, last 24h)
- Error rate trend
- Queue depth bar chart (pending, processing, failed, dead_letter)
- Last sync timestamp per vendor

If using Grafana: point at the `/api/ehr/metrics/prometheus` endpoint. Pre-built dashboard JSON in `docs/grafana-ehr-dashboard.json`.

#### Verification

- [ ] `GET /api/ehr/health` returns status, connections, queue stats
- [ ] Health endpoint requires admin role (403 for non-admin)
- [ ] Metrics increment correctly for sync/pull/push/error operations
- [ ] Prometheus export endpoint returns valid Prometheus format (`curl /api/ehr/metrics/prometheus`)
- [ ] Alerting rules documented with clear thresholds and severities
- [ ] `docs/EHR_RUNBOOK.md` covers all common failure scenarios
- [ ] Dashboard displays real-time sync health data
- [ ] Dead letter items are reviewable and retryable from admin UI

---

---

## Appendices

<!-- SECTION: APPENDICES — to be filled -->

### Appendix A — FHIR R4 Resource Examples (Full JSON)

#### A-1  Patient

```json
{
  "resourceType": "Patient",
  "id": "derm-patient-001",
  "meta": { "versionId": "1", "lastUpdated": "2026-01-15T10:30:00Z" },
  "identifier": [
    { "system": "http://dermmap.com/mrn", "value": "DM-10042" },
    { "system": "http://hl7.org/fhir/sid/us-ssn", "value": "***-**-1234" }
  ],
  "name": [{ "use": "official", "family": "Garcia", "given": ["Maria", "Elena"] }],
  "gender": "female",
  "birthDate": "1978-06-22",
  "telecom": [
    { "system": "phone", "value": "555-867-5309", "use": "mobile" },
    { "system": "email", "value": "m.garcia@example.com" }
  ],
  "address": [{
    "use": "home", "line": ["456 Oak Dr"], "city": "Austin",
    "state": "TX", "postalCode": "78701", "country": "US"
  }]
}
```

#### A-2  Observation (Dermatology Lesion)

```json
{
  "resourceType": "Observation",
  "id": "obs-lesion-001",
  "status": "final",
  "category": [{
    "coding": [{ "system": "http://terminology.hl7.org/CodeSystem/observation-category", "code": "exam", "display": "Exam" }]
  }],
  "code": {
    "coding": [{ "system": "http://snomed.info/sct", "code": "39607008", "display": "Lung structure" }],
    "text": "Melanocytic nevus, trunk"
  },
  "subject": { "reference": "Patient/derm-patient-001" },
  "encounter": { "reference": "Encounter/enc-001" },
  "effectiveDateTime": "2026-01-15T14:30:00Z",
  "performer": [{ "reference": "Practitioner/dr-smith-001" }],
  "bodySite": {
    "coding": [{ "system": "http://snomed.info/sct", "code": "51185008", "display": "Thorax structure" }],
    "text": "Upper back, left scapular region"
  },
  "component": [
    {
      "code": { "coding": [{ "system": "http://loinc.org", "code": "33756-8", "display": "Size" }] },
      "valueQuantity": { "value": 5.2, "unit": "mm", "system": "http://unitsofmeasure.org", "code": "mm" }
    },
    {
      "code": { "coding": [{ "system": "http://snomed.info/sct", "code": "3723001", "display": "Asymmetry" }] },
      "valueString": "Symmetric"
    },
    {
      "code": { "coding": [{ "system": "http://snomed.info/sct", "code": "263714004", "display": "Color" }] },
      "valueString": "Brown, uniform"
    }
  ],
  "note": [{ "text": "Stable melanocytic nevus. No ABCDE warning signs. Patient to monitor and return in 12 months." }]
}
```

#### A-3  Encounter

```json
{
  "resourceType": "Encounter",
  "id": "enc-001",
  "status": "finished",
  "class": { "system": "http://terminology.hl7.org/CodeSystem/v3-ActCode", "code": "AMB", "display": "ambulatory" },
  "type": [{
    "coding": [{ "system": "http://snomed.info/sct", "code": "270427003", "display": "Patient-initiated encounter" }]
  }],
  "subject": { "reference": "Patient/derm-patient-001" },
  "participant": [{
    "individual": { "reference": "Practitioner/dr-smith-001", "display": "Dr. Smith" }
  }],
  "period": { "start": "2026-01-15T14:00:00Z", "end": "2026-01-15T14:45:00Z" },
  "reasonCode": [{
    "coding": [{ "system": "http://snomed.info/sct", "code": "271807003", "display": "Skin rash" }],
    "text": "Full body skin exam"
  }]
}
```

#### A-4  DocumentReference (Clinical Photo Report)

```json
{
  "resourceType": "DocumentReference",
  "id": "doc-report-001",
  "status": "current",
  "type": {
    "coding": [{ "system": "http://loinc.org", "code": "55113-5", "display": "Key images Document Radiology" }]
  },
  "category": [{
    "coding": [{ "system": "http://loinc.org", "code": "55113-5", "display": "Key images" }]
  }],
  "subject": { "reference": "Patient/derm-patient-001" },
  "date": "2026-01-15T15:00:00Z",
  "author": [{ "reference": "Practitioner/dr-smith-001" }],
  "description": "DermMap clinical photo report — full body skin exam 2026-01-15",
  "content": [{
    "attachment": {
      "contentType": "application/pdf",
      "url": "https://dermmap.com/api/reports/doc-report-001.pdf",
      "title": "Clinical Photo Report",
      "creation": "2026-01-15T15:00:00Z"
    }
  }],
  "context": {
    "encounter": [{ "reference": "Encounter/enc-001" }],
    "period": { "start": "2026-01-15T14:00:00Z", "end": "2026-01-15T14:45:00Z" }
  }
}
```

#### A-5  DiagnosticReport (Pathology)

```json
{
  "resourceType": "DiagnosticReport",
  "id": "path-001",
  "status": "final",
  "category": [{
    "coding": [{ "system": "http://terminology.hl7.org/CodeSystem/v2-0074", "code": "PAT", "display": "Pathology" }]
  }],
  "code": {
    "coding": [{ "system": "http://loinc.org", "code": "22034-7", "display": "Pathology report" }]
  },
  "subject": { "reference": "Patient/derm-patient-001" },
  "encounter": { "reference": "Encounter/enc-001" },
  "effectiveDateTime": "2026-01-17T09:00:00Z",
  "issued": "2026-01-18T11:30:00Z",
  "performer": [{ "reference": "Practitioner/pathologist-001", "display": "Dr. Pathologist" }],
  "result": [{ "reference": "Observation/obs-lesion-001" }],
  "conclusion": "Compound melanocytic nevus. No evidence of atypia or malignancy.",
  "conclusionCode": [{
    "coding": [{ "system": "http://snomed.info/sct", "code": "254806003", "display": "Melanocytic naevus" }]
  }]
}
```

#### A-6  Appointment

```json
{
  "resourceType": "Appointment",
  "id": "appt-001",
  "status": "booked",
  "serviceType": [{
    "coding": [{ "system": "http://snomed.info/sct", "code": "310126000", "display": "Dermatology service" }]
  }],
  "start": "2027-01-15T14:00:00Z",
  "end": "2027-01-15T14:30:00Z",
  "participant": [
    { "actor": { "reference": "Patient/derm-patient-001" }, "status": "accepted" },
    { "actor": { "reference": "Practitioner/dr-smith-001" }, "status": "accepted" }
  ],
  "reasonCode": [{
    "coding": [{ "system": "http://snomed.info/sct", "code": "225544004", "display": "Follow-up visit" }],
    "text": "12-month follow-up skin exam"
  }]
}
```

### Appendix B — SNOMED CT / LOINC Code Reference

#### B-1  SNOMED CT Codes — Dermatology Diagnoses

| SNOMED Code | Display | Use in DermMap |
|-------------|---------|----------------|
| 39607008 | Lung structure (body structure) | Observation.code (placeholder — use specific lesion codes below) |
| 254806003 | Melanocytic naevus | Benign mole diagnosis |
| 93655004 | Malignant melanoma | Melanoma diagnosis |
| 402567005 | Basal cell carcinoma of skin | BCC diagnosis |
| 402501007 | Squamous cell carcinoma of skin | SCC diagnosis |
| 400210000 | Actinic keratosis | Pre-cancerous lesion |
| 201101007 | Acne vulgaris | Common diagnosis |
| 238575004 | Contact dermatitis | Rash diagnosis |
| 200956004 | Psoriasis | Chronic skin condition |
| 399244003 | Dysplastic nevus | Atypical mole |
| 271807003 | Skin rash | Encounter reason code |
| 225544004 | Follow-up visit | Appointment reason |
| 310126000 | Dermatology service | Appointment service type |

#### B-2  SNOMED CT Codes — Body Sites

| SNOMED Code | Display | Body Region |
|-------------|---------|-------------|
| 51185008 | Thorax structure | Chest/back |
| 302551006 | Entire face | Face |
| 368209003 | Right arm | Right upper limb |
| 368208006 | Left arm | Left upper limb |
| 61685007 | Lower limb structure | Legs |
| 244023005 | Scalp structure | Head/scalp |
| 45048000 | Neck structure | Neck |
| 371398005 | Ear structure | Ears |
| 181469002 | Nose structure | Nose |
| 113197003 | Hand structure | Hands |
| 56459004 | Foot structure | Feet |

#### B-3  SNOMED CT Codes — Observation Components

| SNOMED Code | Display | Component Use |
|-------------|---------|---------------|
| 3723001 | Asymmetry | ABCDE: A — Asymmetry |
| 263714004 | Color | ABCDE: C — Color |
| 246116008 | Lesion size | Diameter measurement |
| 255509001 | Evolving | ABCDE: E — Evolution |

#### B-4  LOINC Codes

| LOINC Code | Display | Use in DermMap |
|------------|---------|----------------|
| 55113-5 | Key images Document Radiology | DocumentReference.type for clinical photos |
| 22034-7 | Pathology report | DiagnosticReport.code for biopsy results |
| 33756-8 | Size | Observation.component for lesion diameter |
| 72170-4 | Photographic image | Media type for clinical photographs |
| 11529-5 | Surgical pathology study | Pathology report type |

#### B-5  UCUM Units

| UCUM Code | Display | Use |
|-----------|---------|-----|
| mm | Millimeter | Lesion diameter |
| cm | Centimeter | Lesion diameter (larger) |
| mm2 | Square millimeter | Lesion area |

#### B-6  DICOM Modality Codes (for Media resources)

| Code | Display | Use |
|------|---------|-----|
| XC | External-camera Photography | Clinical dermatology photos |
| OP | Ophthalmic Photography | Dermoscopy images |

### Appendix C — Vendor API Endpoints and Sandbox URLs

#### C-1  ModMed (Modernizing Medicine / EMA)

| Resource | URL |
|----------|-----|
| Developer Portal | `https://developer.modmed.com` |
| FHIR Base (Sandbox) | `https://sandbox-api.modmed.com/fhir/r4` |
| FHIR Base (Production) | `https://api.modmed.com/fhir/r4` (per tenant) |
| SMART Discovery | `{base}/.well-known/smart-configuration` |
| OAuth Authorize | `{base}/oauth/authorize` |
| OAuth Token | `{base}/oauth/token` |
| Status Page | `https://status.modmed.com` |
| Documentation | `https://developer.modmed.com/docs/fhir` |

**Auth type:** Confidential client — `client_id` + `client_secret` (symmetric).

#### C-2  Epic

| Resource | URL |
|----------|-----|
| Developer Portal | `https://fhir.epic.com/Developer` |
| Open Sandbox (R4) | `https://fhir.epic.com/interconnect-fhir-oauth/api/FHIR/R4` |
| SMART Discovery | `{base}/.well-known/smart-configuration` |
| OAuth Authorize | `{base}/oauth2/authorize` |
| OAuth Token | `{base}/oauth2/token` |
| App Orchard / Galaxy | `https://appmarket.epic.com` |
| Status Page | `https://status.epic.com` |
| Test Patients | Camila Lopez (FHIR ID: `erXuFYUfucBZaryVksYEcMg3`), Jason Argonaut |

**Auth type:** Asymmetric (RS384 JWT) — signed JWT assertion, NO `client_secret`. Requires JWKS endpoint.

#### C-3  Oracle Health (Cerner)

| Resource | URL |
|----------|-----|
| Developer Portal | `https://code.cerner.com` |
| Millennium Sandbox (R4) | `https://fhir-myrecord.cerner.com/r4/ec2458f2-1e24-41c8-b71b-0e701af7583d` |
| SMART Discovery | `{base}/.well-known/smart-configuration` |
| OAuth Authorize | Per CapabilityStatement |
| OAuth Token | Per CapabilityStatement |
| Code Console | `https://code.cerner.com/developer/smart-on-fhir` |
| Status Page | `https://status.oracle.com/health` |
| Test Patients | ID `12742399`, ID `12724066` |

**Auth type:** Confidential client — `client_id` + `client_secret` (symmetric). Standard PKCE flow.

#### C-4  Athenahealth

| Resource | URL |
|----------|-----|
| Developer Portal | `https://developer.athenahealth.com` |
| Preview API (Sandbox) | `https://api.preview.platform.athenahealth.com/fhir/r4` |
| Production API | `https://api.platform.athenahealth.com/fhir/r4` |
| SMART Discovery | `{base}/.well-known/smart-configuration` |
| Marketplace | `https://marketplace.athenahealth.com` |
| Status Page | `https://status.athenahealth.com` |

**Auth type:** Confidential client — `client_id` + `client_secret`. Athena-specific: requires `ath-` prefix on practice IDs.

#### C-5  eClinicalWorks (eCW)

| Resource | URL |
|----------|-----|
| Partner Program | Contact eCW sales/partner team |
| FHIR Base (varies) | `https://<instance>.ecwcloud.com/fhir/r4` |
| SMART Discovery | `{base}/.well-known/smart-configuration` |
| Sandbox | Provided after partner agreement |
| Documentation | Provided to partners |

**Auth type:** Confidential client — `client_id` + `client_secret`. eCW-specific: may require custom headers for practice routing.

### Appendix D — Environment Variables Reference

#### D-1  Core EHR Configuration

| Variable | Description | Example | Required |
|----------|-------------|---------|----------|
| `EHR_ENCRYPTION_KEY` | 32-byte hex key for AES-256-GCM encryption of PHI at rest | `a1b2c3...` (64 hex chars) | Yes |
| `EHR_SYNC_INTERVAL_MS` | Interval for cron sync polling (default: 300000 = 5 min) | `300000` | No |
| `EHR_SYNC_BATCH_SIZE` | Max items to process per sync cycle | `50` | No |
| `EHR_MAX_RETRIES` | Max retry attempts before dead-lettering | `3` | No |
| `EHR_WEBHOOK_SECRET` | HMAC secret for validating incoming vendor webhooks | `whsec_...` | Yes (if webhooks enabled) |

#### D-2  ModMed

| Variable | Description | Example |
|----------|-------------|---------|
| `MODMED_CLIENT_ID` | OAuth client ID from ModMed developer portal | `dm-prod-client` |
| `MODMED_CLIENT_SECRET` | OAuth client secret | `secret_...` |
| `MODMED_BASE_URL` | FHIR R4 base URL | `https://api.modmed.com/fhir/r4` |
| `MODMED_SANDBOX_CLIENT_ID` | Sandbox client ID (dev/test only) | `dm-sandbox-client` |
| `MODMED_SANDBOX_CLIENT_SECRET` | Sandbox client secret | `secret_...` |
| `MODMED_SANDBOX_BASE_URL` | Sandbox FHIR base URL | `https://sandbox-api.modmed.com/fhir/r4` |

#### D-3  Epic

| Variable | Description | Example |
|----------|-------------|---------|
| `EPIC_CLIENT_ID` | OAuth client ID from Epic App Orchard | `epic-prod-id` |
| `EPIC_JWKS_PATH` | Path to RS384 private key PEM file | `/secrets/epic-private.pem` |
| `EPIC_JWKS_KID` | Key ID matching the JWKS endpoint | `dermmap-epic-key-1` |
| `EPIC_BASE_URL` | Production FHIR base (per health system) | Configured per connection |
| `EPIC_SANDBOX_CLIENT_ID` | Sandbox client ID | `epic-sandbox-id` |

> **Note:** Epic does NOT use `client_secret`. Auth is via signed RS384 JWT using the private key.

#### D-4  Oracle Health (Cerner)

| Variable | Description | Example |
|----------|-------------|---------|
| `CERNER_CLIENT_ID` | OAuth client ID from Code Console | `cerner-prod-id` |
| `CERNER_CLIENT_SECRET` | OAuth client secret | `secret_...` |
| `CERNER_BASE_URL` | Production FHIR base (per health system) | Configured per connection |
| `CERNER_SANDBOX_CLIENT_ID` | Sandbox client ID | `cerner-sandbox-id` |
| `CERNER_SANDBOX_CLIENT_SECRET` | Sandbox client secret | `secret_...` |

#### D-5  Athenahealth

| Variable | Description | Example |
|----------|-------------|---------|
| `ATHENA_CLIENT_ID` | OAuth client ID | `athena-prod-id` |
| `ATHENA_CLIENT_SECRET` | OAuth client secret | `secret_...` |
| `ATHENA_BASE_URL` | Production FHIR base | `https://api.platform.athenahealth.com/fhir/r4` |
| `ATHENA_SANDBOX_CLIENT_ID` | Preview API client ID | `athena-sandbox-id` |
| `ATHENA_SANDBOX_CLIENT_SECRET` | Preview API secret | `secret_...` |

#### D-6  eClinicalWorks

| Variable | Description | Example |
|----------|-------------|---------|
| `ECW_CLIENT_ID` | OAuth client ID | `ecw-prod-id` |
| `ECW_CLIENT_SECRET` | OAuth client secret | `secret_...` |
| `ECW_BASE_URL` | FHIR base URL (instance-specific) | `https://practice.ecwcloud.com/fhir/r4` |
| `ECW_SANDBOX_CLIENT_ID` | Sandbox client ID | `ecw-sandbox-id` |
| `ECW_SANDBOX_CLIENT_SECRET` | Sandbox secret | `secret_...` |
| `ECW_SANDBOX_BASE_URL` | Sandbox FHIR base | Provided by eCW |

#### D-7  Security note

All secrets **MUST** be managed via:
- **Local dev:** `.env` file (in `.gitignore`)
- **CI/CD:** GitHub Actions secrets or equivalent
- **Production:** AWS Secrets Manager, Azure Key Vault, or Docker secrets

Never commit secrets to source control. Run `git secrets --scan` in pre-commit hook to catch accidental leaks.

---

## Completion Summary

| Phase | Tasks | Owner | Date Started | Date Completed |
|-------|-------|-------|-------------|----------------|
| 0 — Foundation | 1, 2, 3 | | | |
| 1 — SMART/OAuth | 4, 5, 6 | | | |
| 2 — FHIR Resources | 7, 8, 9, 10, 11, 12, 13 | | | |
| 3 — Vendor Modules | 14, 15, 16, 17, 18 | | | |
| 4 — Sync Engine | 19, 20, 21, 22 | | | |
| 5 — Testing | 23, 24, 25, 26 | | | |
| 6 — Prod/Compliance | 27, 28, 29 | | | |
