# DermMap: Functional Prototype Requirements
## Complete Specification for Sales Demo Build

---

## 1. Design Philosophy

This prototype must demonstrate a **production-ready clinical tool**, not a mockup. Every screen a prospect touches during a demo should feel real, fast, and purpose-built for dermatology workflows. The primary user is the **Medical Assistant (MA)** in the exam room, with secondary views for physicians and practice managers.

The demo must answer one question convincingly: *"How does this fit into my clinic's day without disrupting what already works?"*

---

## 2. User Roles & Permissions

The prototype must support three distinct roles, each with different access levels. This is both a functional requirement and a compliance requirement — HIPAA mandates role-based access control.

### Medical Assistant (MA) — Primary User
- Create and select patients
- Tap body map to place lesion markers
- Capture and attach photos to markers
- Add basic notes (size, color, shape descriptors via structured dropdowns — not free text)
- View patient lesion history (read-only on prior visits)
- Cannot delete photos or markers from prior visits
- Cannot access billing, analytics, or export functions

### Physician / Provider
- Everything the MA can do, plus:
- Edit or reclassify lesion markers
- Add clinical notes and assessment (free text + structured fields)
- Tag lesions for biopsy, excision, or monitoring
- Compare lesion photos across visits (side-by-side view)
- Sign off / lock a visit record
- Access patient lesion timeline with full history

### Practice Manager / Admin
- User account management (add/remove providers, MAs)
- Clinic settings (branding, default body map preferences, photo quality settings)
- Audit log viewer (who accessed what, when)
- Usage analytics (visits documented, photos captured, average documentation time)
- Export and reporting functions
- Cannot view clinical images or patient records (unless also assigned a clinical role)

### Authentication Requirements
- Individual user accounts (no shared logins — HIPAA requirement)
- Session timeout after 5 minutes of inactivity on mobile, 15 minutes on web
- PIN or biometric unlock to resume session (mobile)
- Password complexity requirements (12+ characters, mixed case, number, symbol)
- Multi-factor authentication (MFA) for all users
- Failed login lockout after 5 attempts

---

## 3. HIPAA & Compliance — Built Into Every Layer

This is not a separate module. Compliance must be embedded into every feature decision.

### Data Encryption
- **At rest:** AES-256 encryption for all stored data (images, patient records, audit logs)
- **In transit:** TLS 1.2+ for all API calls and data transfers
- **On device:** Photos must never be saved to the device camera roll or local storage unencrypted; images exist only within the app's encrypted sandbox

### Audit Trail
Every action generates an immutable audit log entry:
- User ID, timestamp, action type, affected record
- Examples: "MA [user_id] created lesion marker on Patient [patient_id] at [timestamp]", "Provider [user_id] viewed photo [photo_id] at [timestamp]"
- Audit logs cannot be edited or deleted by any user role
- Retained for minimum 6 years (HIPAA requirement)

### Access Controls
- Role-based access (see Section 2)
- Minimum necessary access principle — users see only what their role requires
- Break-the-glass emergency access with mandatory justification logging
- Automatic session termination on app backgrounding (mobile) after timeout

### Business Associate Agreement (BAA) Readiness
- The prototype architecture must assume a BAA with the cloud hosting provider
- Demo should include a slide or screen showing "BAA-covered infrastructure" as a talking point
- For the demo itself: use synthetic/fake patient data only — never real PHI

### Device Security
- Remote wipe capability for enrolled devices
- No data caching on device beyond the active session
- Screenshot/screen recording disabled within the app (iOS/Android APIs exist for this)
- No copy/paste of patient data outside the app

---

## 4. Core Workflow — The MA Exam Room Flow

This is the money sequence in the demo. It must be fast, smooth, and obviously better than the current workflow. Target: **under 10 seconds** from patient selection to documented lesion.

### Step 1: Patient Selection
- **Search bar** at top of home screen — search by name, DOB, or MRN (Medical Record Number)
- Recent patients list (last 10 seen today) for quick tap access
- Patient card shows: name, DOB, MRN, last visit date, number of tracked lesions
- If EHR integration is active: patient list syncs from the EHR schedule for today's appointments

### Step 2: Body Map Interaction
- Full-screen anatomical body diagram (anterior and posterior views)
- **Tap to place a marker** — marker appears at tap location with a pulsing animation to confirm placement
- Existing markers from prior visits shown in a muted color (gray) with visit date labels
- New markers for today's visit shown in a distinct color (e.g., blue)
- Biopsied lesions shown with a different icon (e.g., small scalpel icon or cross-hatch)
- **Pinch to zoom** on body regions for precise placement (hands, feet, face, scalp)
- Body map orientations available: anterior, posterior, left lateral, right lateral, head/face detail, hands detail, feet detail
- Gender-specific body diagrams selectable per patient
- Skin tone options for body diagram (improves lesion visibility context)

### Step 3: Photo Capture
- Tapping a new marker immediately opens the camera
- Camera overlay shows a circular guide frame for consistent lesion framing
- **Auto-capture mode** (optional): camera auto-fires when stable and in focus
- Built-in ruler overlay option (toggled on/off) for size reference
- Dermoscopy lens attachment support: app detects lens and adjusts capture settings (exposure, white balance)
- Flash control: auto, on, off, ring light (if accessory connected)
- Photo quality: minimum 8MP, stored as compressed JPEG at clinical-quality settings
- Multiple photos per marker supported (e.g., macro + dermoscopic)
- Photo immediately attaches to the marker — no manual linking step

### Step 4: Quick Documentation (Structured Input)
- After photo capture, a **bottom sheet slides up** with structured fields:
  - **Size:** dropdown or quick-tap buttons (1mm, 2mm, 3mm, 4mm, 5mm, 6mm+, custom)
  - **Shape:** round, oval, irregular, other
  - **Color:** dropdown with clinical terms (tan, brown, dark brown, black, red, pink, multicolored)
  - **Border:** regular, irregular, not assessed
  - **Symmetry:** symmetric, asymmetric, not assessed
  - **Action:** monitor, biopsy scheduled, biopsy performed, excision, referral, no action
  - **Notes:** optional free-text field (for provider, not MA — grayed out for MA role)
- All fields have sensible defaults ("not assessed") so the MA can skip and move on
- **Save & Next** button — saves this lesion and returns to the body map for the next one

### Step 5: Visit Completion
- MA taps "Complete Visit" when all lesions documented
- Summary screen shows: number of lesions documented, photos taken, any flagged for biopsy
- Visit goes into "pending review" status for the provider to sign off
- Provider can review, add clinical notes, and lock the record

---

## 5. EHR Integration Layer — "Works Alongside" Design

The prototype must demonstrate that it complements, not competes with, the existing EHR. This is critical for the sales pitch.

### Minimum Viable Integration (Phase 1 / Demo)
- **PDF Export:** Generate a formatted visit summary PDF that can be uploaded as a document into any EHR
  - PDF includes: patient name, DOB, MRN, visit date, body map with markers, photos, structured data for each lesion, provider name
  - One-tap "Generate PDF" from the visit summary screen
  - PDF designed to look like a professional clinical document, not a screenshot dump

### FHIR Integration (Demonstrate Readiness)
- Demo should include a settings screen or integration panel showing:
  - "Connect to EHR" with logos for Epic, Cerner/Oracle Health, Athenahealth, eClinicalWorks, Modernizing Medicine (ModMed — very common in derm)
  - FHIR R4 endpoint configuration fields
  - Patient sync status indicator
  - "Last synced: [timestamp]"
- Even if non-functional in the demo, this screen signals to prospects that integration is on the roadmap and architecturally planned

### Data Flow (What to Show in Demo)
- Patient demographics pulled from EHR (or simulated)
- Today's appointment schedule pulled from EHR (or simulated)
- Visit summary pushed back to EHR as a document/media attachment
- Discrete data elements (lesion count, biopsy tags) available via FHIR resources

### ModMed / EMA Specific Consideration
- Modernizing Medicine's EMA platform is the dominant derm-specific EHR
- If you can show even a conceptual integration with EMA, it dramatically increases credibility
- Consider a "ModMed Integration" badge or callout in the demo

---

## 6. Patient Lesion Map — Longitudinal View

This is the feature that creates long-term value and switching costs. It's also the feature physicians will care most about.

### Visual Timeline
- Patient's body map shows all lesions ever documented, color-coded by status:
  - **Active/Monitoring:** blue markers
  - **Biopsied:** yellow markers with result tag (benign, atypical, malignant)
  - **Excised/Removed:** green markers (faded, with line-through)
  - **New this visit:** pulsing blue markers
- Tapping any marker opens that lesion's full history

### Lesion Detail View
- Photo carousel showing every image of that lesion across visits
- Side-by-side comparison tool: pick any two photos to compare
- Timeline bar at bottom showing visit dates — swipe to navigate
- Change indicators: "New", "Unchanged", "Changed — review recommended"
- All structured data history (size, color, border changes over time)
- Biopsy results and pathology notes (if entered)

### Comparison Tools
- **Side-by-side:** two photos, same lesion, different dates
- **Overlay:** semi-transparent overlay of two photos for alignment comparison
- **Grid view:** all photos of one lesion in chronological grid

---

## 7. Web Dashboard

Used by physicians for review and by practice managers for operations.

### Provider View
- Patient search and lesion map viewer (same as mobile, responsive web version)
- Visit queue: list of visits pending provider review/sign-off
- Lesion comparison tools (larger screen = better for this)
- Quick documentation: add clinical notes, reclassify lesions, update biopsy results
- Secure messaging: send lesion photos to another provider for consultation (within the platform, encrypted)

### Practice Manager View
- **Usage Dashboard:**
  - Visits documented per day/week/month
  - Average documentation time per visit
  - Photos captured per visit
  - Lesions tracked per patient (average)
  - Provider-level metrics (who's using it, who isn't)
- **User Management:**
  - Add/remove users
  - Assign roles
  - Reset credentials
  - View login history
- **Audit Log Viewer:**
  - Searchable, filterable log of all system actions
  - Export to CSV for compliance reporting
- **Billing Integration Readiness:**
  - Screen showing "CPT code tagging" concept (linking documented lesions to procedure codes)
  - This is a future feature but showing the concept in the demo signals revenue-cycle value

---

## 8. Mobile App Technical Requirements

### Platform
- iOS (primary — most dermatology clinics use iPads and iPhones in the exam room)
- Android (secondary — for practices that use Android tablets)
- Minimum iOS 16, Android 13

### Performance
- App launch to patient selection: under 2 seconds
- Body map rendering: under 1 second
- Photo capture to saved: under 1 second
- Offline capability: the app must work without internet (sync when reconnected)
  - Critical for exam rooms with poor WiFi
  - All data encrypted locally during offline period
  - Conflict resolution for offline edits (last-write-wins with manual review flag)

### Camera Integration
- Native camera access (not webview)
- Support for external dermoscopy lens adapters (DermLite, 3Gen, Canfield)
- EXIF data stripped from photos before storage (contains device GPS — PHI risk)
- Photo metadata stored separately in the app database (not embedded in image file)

### Accessibility
- VoiceOver / TalkBack support for visually impaired users
- Dynamic text sizing
- High contrast mode option
- One-handed operation support for the core workflow (body map → photo → save)

---

## 9. Data Architecture

### Patient Record
```
Patient
├── patient_id (UUID)
├── first_name (encrypted)
├── last_name (encrypted)
├── date_of_birth (encrypted)
├── mrn (encrypted)
├── gender
├── skin_type (Fitzpatrick scale I-VI)
├── created_at
├── updated_at
└── Visits[]
    ├── visit_id (UUID)
    ├── visit_date
    ├── provider_id
    ├── ma_id
    ├── status (in_progress, pending_review, signed, locked)
    ├── created_at
    └── Lesions[]
        ├── lesion_id (UUID)
        ├── body_location_x (coordinate on body map)
        ├── body_location_y (coordinate on body map)
        ├── body_region (enum: head, neck, chest, upper_back, etc.)
        ├── body_view (anterior, posterior, lateral_left, lateral_right, etc.)
        ├── size_mm
        ├── shape (enum)
        ├── color (enum)
        ├── border (enum)
        ├── symmetry (enum)
        ├── action (enum)
        ├── clinical_notes (provider only)
        ├── biopsy_result (benign, atypical, malignant, pending, n/a)
        ├── pathology_notes
        ├── created_at
        ├── created_by
        └── Photos[]
            ├── photo_id (UUID)
            ├── storage_url (encrypted reference)
            ├── capture_type (clinical, dermoscopic)
            ├── resolution
            ├── captured_at
            └── captured_by
```

### Audit Log Record
```
AuditLog
├── log_id (UUID)
├── timestamp
├── user_id
├── user_role
├── action_type (enum: create, read, update, delete, export, login, logout)
├── resource_type (patient, visit, lesion, photo, user, setting)
├── resource_id
├── details (JSON — what changed)
├── ip_address
└── device_id
```

---

## 10. Infrastructure & Hosting

### Cloud Requirements
- HIPAA-eligible cloud service: AWS (with BAA), Azure (with BAA), or Google Cloud (with BAA)
- Dedicated VPC with no public-facing databases
- Image storage: encrypted S3-compatible object storage with server-side encryption
- Database: encrypted at rest, automated backups, point-in-time recovery
- All environments (dev, staging, prod) must be HIPAA-compliant — not just prod

### For the Demo Specifically
- Can run on a single cloud instance with synthetic data
- Must use HTTPS everywhere (even in demo)
- Synthetic patient data generator: 50-100 fake patients with realistic lesion histories, photos, and visit timelines
- Demo mode toggle: clearly marks the environment as "DEMO — NOT FOR CLINICAL USE" with a banner

---

## 11. PDF Export — The "Integration Bridge"

This is the most important integration feature for the demo because it works with every EHR immediately, no API needed.

### PDF Contents
- **Header:** Clinic name, logo, document title ("Dermatology Lesion Documentation")
- **Patient Info:** Name, DOB, MRN, visit date, provider
- **Body Map Image:** Rendered body diagram with all markers from this visit, labeled with numbers
- **Lesion Table:** Numbered list matching body map markers
  - For each lesion: location description, size, color, shape, border, symmetry, action taken
- **Photo Grid:** Clinical photos for each lesion, labeled with lesion number and body location
- **Prior History Summary:** Brief note of how many prior visits and total tracked lesions
- **Footer:** "Generated by DermMap | [timestamp] | Page X of Y"
- **Digital signature line** for the provider

### PDF Quality
- Photos embedded at clinical resolution (not thumbnails)
- PDF/A compliant for long-term archival
- File size optimized (target under 5MB for a typical visit with 5-10 photos)
- Secure: no embedded JavaScript, no active content

---

## 12. Demo-Specific Features

These features exist solely to make the sales demo compelling.

### Synthetic Data Package
- 75 fake patients with diverse demographics
- 3-8 prior visits per patient with realistic lesion progression
- Mix of benign, atypical, and malignant outcomes
- Before/after photo pairs showing realistic lesion changes
- One "star patient" with a rich 2-year history to demo the timeline feature

### Guided Demo Mode
- Optional walkthrough overlay that highlights features step-by-step
- "Try it yourself" mode: prospect can tap the body map and take a photo with the demo device
- Timer overlay: shows real-time documentation speed ("That took 6 seconds")
- Comparison overlay: shows equivalent steps in a traditional EHR workflow

### Demo Analytics Dashboard
- Pre-populated with 6 months of fake clinic data
- Shows compelling metrics: "Average documentation time: 8 seconds" vs. industry average
- Provider adoption chart showing ramp-up curve
- ROI calculator: input number of providers, visits/day → shows time saved and cost offset

### One-Pager / Leave-Behind
- Exportable PDF summary of the product for the prospect to share with partners
- Includes: feature overview, pricing, integration roadmap, compliance summary, contact info

---

## 13. Security Testing & Validation Checklist

Before the demo goes live, even with synthetic data:

- Penetration testing (basic web app scan at minimum)
- OWASP Top 10 vulnerabilities addressed
- No PHI in logs, error messages, or URLs
- API authentication on every endpoint (no unauthenticated routes)
- Rate limiting on login and API endpoints
- Input validation on all fields (prevent injection attacks)
- Image upload validation (file type, size limits, malware scanning)
- SSL certificate valid and properly configured
- CORS policy restrictive (not wildcard)
- Content Security Policy headers set
- No hardcoded credentials or API keys in codebase
- Dependency vulnerability scan (npm audit / pip audit equivalent)

---

## 14. What to Cut From the Demo (Scope Control)

To keep the prototype buildable, these features should be **shown as UI mockups or "coming soon" screens** rather than fully functional:

- Real EHR API integration (show the settings screen, not a live connection)
- AI-assisted lesion analysis (show a concept screen with "AI Analysis: Coming Q3 2026")
- Dermoscopy lens auto-detection (show the setting toggle, hardcode behavior)
- Real push notifications
- Multi-clinic / enterprise management
- Billing/CPT code integration
- Secure inter-provider messaging (show the UI, use fake message data)
- Real-time sync across multiple devices

These should be **fully functional in the demo:**
- Patient selection and search
- Body map tap-to-mark workflow
- Photo capture and attachment
- Structured lesion documentation
- Patient lesion timeline and history
- Side-by-side photo comparison
- PDF export
- Role-based login (show MA vs. Provider vs. Admin views)
- Audit log viewer
- Usage analytics dashboard (with synthetic data)

---

## 15. Success Criteria for the Demo

The prototype is ready for sales when:

1. An MA can document a lesion in under 10 seconds without training
2. A physician can review a patient's lesion history and compare photos in under 30 seconds
3. A practice manager can see the usage dashboard and understand the value proposition immediately
4. The PDF export looks professional enough to attach to a real medical chart
5. Every screen loads in under 2 seconds
6. The compliance story is visible throughout (audit logs, encryption indicators, role separation)
7. A prospect can pick up the demo device and use the core workflow intuitively without instruction
8. The "works alongside your EHR" message is clear and credible

---

*Document Version: 1.0*
*Target Platform: iOS (primary), Web Dashboard (secondary)*
*Target Users: Medical Assistants (primary), Dermatologists (secondary), Practice Managers (tertiary)*
