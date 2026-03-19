# Auth & User Relations — Part 2: Doctors, Organizations & Partnerships

## Context

This is Part 2 of the auth & user relations plan. Part 1 (`auth-and-user-relations-part1-mvp.md`) covers the MVP: caretaker relationships, invite codes, and audit log.

Part 2 adds **doctors**, **care organizations** (old age homes), **doctor organizations** (hospitals/clinics), and **org-to-org partnerships**. These are fundamentally different account types from patients — they have no medical records of their own.

**Prerequisites:** All MVP tables from Part 1 must be deployed first.

---

## Account Types (Full System)

| Type | Has health records? | Purpose |
|------|-------------------|---------|
| **Patient** (existing `profiles`) | Yes | Track own health, check-ins, symptoms, medications |
| **Caretaker** (Part 1) | Yes (their own) | Monitor a loved one's health data |
| **Doctor** (solo) | No | Independent practitioner — view patient data, upload documents, see trends/alerts |
| **Care Organization** (old age home, care facility) | No | Manage residents' daily wellbeing, caretaker assignments, alerts dashboard |
| **Doctor Organization** (hospital, clinic, practice) | No | Clinical management — doctors assigned to patients on need-to-know basis, org-controlled access |

All share Clerk authentication — one login identity. A person can be a patient AND a doctor AND belong to organizations. Roles are additive.

---

## Two Distinct Organization Types

### Care Organizations (e.g., old age homes, assisted living)
- **Staff roles:** `owner`, `admin`, `nurse`, `caretaker`
- **Focus:** daily health monitoring, medication adherence, alert management
- Residents are patients whose daily wellbeing is managed by the facility
- Family caretakers can be added alongside org staff (org approves)
- **Dashboard:** bulk alerts, resident status overview, medication tracking

### Doctor Organizations (e.g., hospitals, clinics, group practices)
- **Staff roles:** `owner`, `admin`, `doctor`, `nurse`, `receptionist`
- **Focus:** clinical data, diagnoses, prescriptions, medical document management
- Patients are assigned to specific doctors — **need-to-know basis** (not every doctor sees every patient)
- Admin assigns doctor-patient relationships within the org
- **Dashboard:** patient panels per doctor, clinical alerts, document upload/review

### Solo Doctors vs Hospital Doctors
**Solo doctors** use `doctor_accounts` directly with `doctor_patient_relationships` — no org involved. **Hospital doctors** are members of a doctor org, and their patient access flows through org-controlled `doctor_patient_assignments`. A doctor can be both (solo practice + hospital affiliation).

### Org-to-Org Partnerships
A doctor org (hospital) can partner with a care org (old age home). This allows the hospital's doctors to be assigned to care facility residents without duplicating patient records. The partnership defines what access the partner org's staff gets.

---

## New Tables

### 1. `doctor_accounts`
Doctor-specific professional accounts. Linked to Clerk auth but NOT to `profiles`.

```sql
create table doctor_accounts (
  id uuid primary key default gen_random_uuid(),
  clerk_user_id text unique not null,        -- Clerk identity (same as profiles.clerk_user_id if they're also a patient)
  email text unique not null,
  display_name text not null,
  practice_name text,
  specialty text,
  license_number text,
  phone_number text,
  verified boolean default false,            -- admin/manual verification
  verification_data jsonb,                   -- license docs, proof, etc.
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index doctor_accounts_clerk on doctor_accounts(clerk_user_id);
```

### 2. `doctor_patient_relationships`
Many-to-many link between **solo** doctors and patients. Patients can have multiple doctors.

```sql
create table doctor_patient_relationships (
  id uuid primary key default gen_random_uuid(),
  doctor_id uuid not null references doctor_accounts(id) on delete cascade,
  patient_id uuid not null references profiles(id) on delete cascade,
  status text not null default 'active' check (status in ('pending', 'active', 'revoked')),
  permissions jsonb not null default '{
    "view_checkins": true,
    "view_symptoms": true,
    "view_documents": true,
    "view_medications": true,
    "view_trends": true,
    "upload_documents": true,
    "view_reports": true,
    "generate_reports": true,
    "view_alerts": true
  }',
  linked_via text check (linked_via in ('invite_code', 'org_assigned', 'manual')),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(doctor_id, patient_id)
);

create index dpr_doctor on doctor_patient_relationships(doctor_id) where status = 'active';
create index dpr_patient on doctor_patient_relationships(patient_id) where status = 'active';
```

### 3. `organizations`
Unified org table for both care facilities and doctor organizations. The `type` column determines which role set and permission model applies.

```sql
create table organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  type text not null check (type in ('care', 'doctor')),
  -- 'care' = old age home, assisted living, care facility
  -- 'doctor' = hospital, clinic, group practice
  subtype text,                              -- freeform: 'aged_care', 'hospital', 'clinic', 'rehab', etc.
  email text,
  phone text,
  address text,
  website text,
  verified boolean default false,
  verification_data jsonb,                   -- license docs, registration proof, etc.
  settings jsonb default '{}',               -- org-level preferences, notification settings
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index organizations_type on organizations(type) where verified = true;
```

### 4. `organization_members`
Staff membership. **Different role sets per org type:**
- Care orgs: `owner`, `admin`, `nurse`, `caretaker`
- Doctor orgs: `owner`, `admin`, `doctor`, `nurse`, `receptionist`

```sql
create table organization_members (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  clerk_user_id text not null,               -- staff's Clerk identity
  email text not null,
  display_name text not null,
  -- Role depends on org type:
  -- care orgs: 'owner', 'admin', 'nurse', 'caretaker'
  -- doctor orgs: 'owner', 'admin', 'doctor', 'nurse', 'receptionist'
  role text not null default 'staff',
  -- Doctor org members may link to a doctor_accounts record (optional)
  doctor_account_id uuid references doctor_accounts(id) on delete set null,
  permissions jsonb not null default '{}',
  active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(organization_id, clerk_user_id)
);

create index org_members_org on organization_members(organization_id) where active = true;
create index org_members_clerk on organization_members(clerk_user_id);
create index org_members_doctor on organization_members(doctor_account_id) where doctor_account_id is not null;
```

**Default permissions by role — Care orgs:**

| Permission | owner | admin | nurse | caretaker |
|-----------|-------|-------|-------|-----------|
| `manage_residents` | yes | yes | no | no |
| `manage_staff` | yes | no | no | no |
| `view_all_alerts` | yes | yes | yes | yes |
| `view_all_records` | yes | yes | yes | no |
| `manage_caretakers` | yes | yes | no | no |
| `generate_reports` | yes | yes | yes | no |

**Default permissions by role — Doctor orgs:**

| Permission | owner | admin | doctor | nurse | receptionist |
|-----------|-------|-------|--------|-------|-------------|
| `manage_patients` | yes | yes | no | no | no |
| `manage_staff` | yes | no | no | no | no |
| `assign_doctors` | yes | yes | no | no | no |
| `view_assigned_patients` | yes | yes | yes | yes | no |
| `view_all_patients` | yes | yes | no | no | no |
| `upload_documents` | yes | yes | yes | yes | no |
| `view_clinical_data` | yes | no | yes | yes | no |
| `manage_appointments` | yes | yes | no | no | yes |
| `generate_reports` | yes | yes | yes | no | no |

**Key distinction:** In doctor orgs, the `doctor` role only sees patients they are **assigned** to (need-to-know). `admin`/`owner` can see all patients for oversight. `receptionist` manages scheduling but never sees clinical data.

### 5. `organization_patients`
Links patients (profiles) to an organization. Used by **both** org types.
- For care orgs: these are "residents"
- For doctor orgs: these are "patients" in the org's patient pool

```sql
create table organization_patients (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  patient_id uuid not null references profiles(id) on delete cascade,
  status text not null default 'active' check (status in ('active', 'discharged', 'pending')),
  -- Care org fields:
  admitted_at timestamptz default now(),
  discharged_at timestamptz,
  room_or_unit text,                         -- e.g., "Room 204", "Wing B"
  -- Doctor org fields:
  primary_doctor_member_id uuid references organization_members(id) on delete set null,
  referral_reason text,
  -- Shared:
  notes text,
  created_at timestamptz default now(),
  unique(organization_id, patient_id)
);

create index org_patients_org on organization_patients(organization_id) where status = 'active';
create index org_patients_patient on organization_patients(patient_id) where status = 'active';
create index org_patients_doctor on organization_patients(primary_doctor_member_id) where primary_doctor_member_id is not null;
```

### 6. `doctor_patient_assignments`
**Doctor orgs only.** Controls which specific doctors within an org can see which patients. This is the need-to-know access layer.

A patient in a doctor org's pool isn't automatically visible to every doctor — they must be explicitly assigned. An admin or owner creates these assignments.

```sql
create table doctor_patient_assignments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  member_id uuid not null references organization_members(id) on delete cascade,  -- the doctor/nurse
  patient_id uuid not null references profiles(id) on delete cascade,
  role_in_care text default 'attending' check (role_in_care in ('attending', 'specialist', 'consulting', 'nurse')),
  permissions jsonb not null default '{
    "view_checkins": true,
    "view_symptoms": true,
    "view_documents": true,
    "view_medications": true,
    "view_trends": true,
    "upload_documents": true,
    "view_reports": true,
    "generate_reports": true
  }',
  assigned_by uuid not null references organization_members(id),  -- who created this assignment
  active boolean default true,
  created_at timestamptz default now(),
  unique(organization_id, member_id, patient_id)
);

create index dpa_member on doctor_patient_assignments(member_id) where active = true;
create index dpa_patient on doctor_patient_assignments(patient_id) where active = true;
create index dpa_org on doctor_patient_assignments(organization_id) where active = true;
```

**Access resolution for doctor orgs:**
1. Is the member an `owner` or `admin` with `view_all_patients`? → can see all org patients
2. Is there an active `doctor_patient_assignments` row for this member + patient? → can see this patient with those permissions
3. Otherwise → denied

### 7. `organization_partnerships`
Links a doctor org to a care org, enabling the hospital's doctors to be assigned to the care facility's residents.

```sql
create table organization_partnerships (
  id uuid primary key default gen_random_uuid(),
  doctor_org_id uuid not null references organizations(id) on delete cascade,
  care_org_id uuid not null references organizations(id) on delete cascade,
  status text not null default 'active' check (status in ('pending', 'active', 'revoked')),
  -- What the partnership allows:
  permissions jsonb not null default '{
    "assign_doctors_to_residents": true,
    "view_resident_alerts": true,
    "upload_documents_for_residents": true,
    "view_resident_records": false
  }',
  initiated_by uuid not null references organization_members(id),  -- who proposed the partnership
  approved_by uuid references organization_members(id),            -- who approved from the other side
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(doctor_org_id, care_org_id)
);

create index partnerships_doctor_org on organization_partnerships(doctor_org_id) where status = 'active';
create index partnerships_care_org on organization_partnerships(care_org_id) where status = 'active';
```

**How partnerships work:**
1. A doctor org admin initiates a partnership with a care org → status = `pending`
2. A care org admin approves → status = `active`
3. Once active, the doctor org admin can create `doctor_patient_assignments` for care org residents
4. The care org retains ultimate control — can revoke the partnership at any time
5. Revoking a partnership deactivates all related `doctor_patient_assignments`

**Example flow:** St. Mary's Hospital (doctor org) partners with Sunshine Aged Care (care org). Hospital admin assigns Dr. Smith to 3 residents. Dr. Smith can now see those 3 residents' health data. If Sunshine revokes the partnership, Dr. Smith loses access immediately.

---

## Part 1 Migration Additions

When Part 2 is deployed, the Part 1 tables need these FK additions:

```sql
-- Add FK from caretaker_relationships.organization_id → organizations
alter table caretaker_relationships
  add constraint cr_organization_fk foreign key (organization_id) references organizations(id) on delete set null;

-- Add FKs from invite_codes to doctor_accounts and organizations
alter table invite_codes
  add constraint ic_doctor_fk foreign key (created_by_doctor_id) references doctor_accounts(id) on delete cascade;
alter table invite_codes
  add constraint ic_org_fk foreign key (created_by_org_id) references organizations(id) on delete cascade;
```

---

## Summary of All Part 2 Tables

| # | Table | Org type | Purpose |
|---|-------|----------|---------|
| 1 | `doctor_accounts` | — | Solo doctor professional accounts (no health data) |
| 2 | `doctor_patient_relationships` | — | Solo doctor ↔ Patient links with permissions |
| 3 | `organizations` | Both | Organization entities (care or doctor type) |
| 4 | `organization_members` | Both | Staff with type-specific roles |
| 5 | `organization_patients` | Both | Org ↔ Patient links (residents for care, patients for doctor orgs) |
| 6 | `doctor_patient_assignments` | Doctor | Need-to-know access: which doctors see which patients within an org |
| 7 | `organization_partnerships` | Both | Doctor org ↔ Care org formal links |

**Total: 7 new tables + 3 FK additions to Part 1 tables.**

---

## Key Access Patterns

### "Show me all my patients" (Solo doctor)
```sql
SELECT p.* FROM profiles p
JOIN doctor_patient_relationships dpr ON dpr.patient_id = p.id
WHERE dpr.doctor_id = :doctor_id AND dpr.status = 'active';
```

### "Show me my assigned patients" (Doctor in a hospital)
```sql
SELECT p.*, dpa.role_in_care, dpa.permissions FROM profiles p
JOIN doctor_patient_assignments dpa ON dpa.patient_id = p.id
WHERE dpa.member_id = :member_id AND dpa.active = true;
```

### "Show all patients in this hospital" (Hospital admin only)
```sql
SELECT p.*, op.status, op.primary_doctor_member_id FROM profiles p
JOIN organization_patients op ON op.patient_id = p.id
WHERE op.organization_id = :org_id AND op.status = 'active';
```

### "Show all residents with active alerts" (Care org dashboard)
```sql
SELECT p.display_name, s.* FROM symptoms s
JOIN profiles p ON p.id = s.user_id
JOIN organization_patients op ON op.patient_id = p.id
WHERE op.organization_id = :org_id AND op.status = 'active'
  AND s.is_critical = true AND s.dismissed = false;
```

### "Show partner hospital's doctors assigned to our residents" (Care org)
```sql
SELECT om.display_name, om.role, dpa.patient_id, dpa.role_in_care
FROM doctor_patient_assignments dpa
JOIN organization_members om ON om.id = dpa.member_id
JOIN organization_partnerships op ON op.doctor_org_id = dpa.organization_id
  AND op.care_org_id = :care_org_id AND op.status = 'active'
WHERE dpa.active = true;
```

### "Can this person view this patient's check-ins?" (Full system)
Backend helper `resolveAccess(actorClerkId, patientId, permission)` checks in order:
1. Is actor the patient themselves? → full access
2. Is actor a caretaker with `view_checkins` permission? → allowed (Part 1)
3. Is actor a solo doctor with `view_checkins` permission? → allowed
4. Is actor a doctor org member?
   a. Is actor an admin/owner with `view_all_patients`? → allowed (if patient is in org)
   b. Is there an active `doctor_patient_assignments` row with `view_checkins`? → allowed
5. Is actor a care org member where patient is a resident?
   a. Does member role grant `view_all_records`? → allowed
   b. Otherwise → check role-specific permissions
6. Otherwise → denied

---

## Auth Middleware Changes

### Account type detection
The auth middleware needs to detect whether the Clerk user is a patient, doctor, or org member:
- Check `profiles` table → patient
- Check `doctor_accounts` table → doctor
- Check `organization_members` table → org staff
- A user could match multiple (e.g., a doctor who is also a patient)

### Extend `resolveTargetUser` (from Part 1)
The Part 1 middleware checks caretaker relationships. Part 2 extends it to also check:
- `doctor_patient_relationships` (solo doctor access)
- `doctor_patient_assignments` (hospital doctor access)
- `organization_patients` + `organization_members` (care org staff access)
- `organization_partnerships` (cross-org access)

Sets `req.actorType` to one of: `'self'`, `'caretaker'`, `'doctor'`, `'org_member'`

---

## New API Routes

### `/api/doctors` (new route file) — Solo doctor portal
- `POST /api/doctors/register` — create solo doctor account (with verification data)
- `GET /api/doctors/profile` — get own doctor profile
- `PATCH /api/doctors/profile` — update doctor profile
- `GET /api/doctors/patients` — list linked patients
- `GET /api/doctors/patients/:patientId/checkins` — view patient check-ins (permission-gated)
- `GET /api/doctors/patients/:patientId/symptoms` — view patient symptoms
- `GET /api/doctors/patients/:patientId/trends` — view patient trends
- `GET /api/doctors/patients/:patientId/documents` — view patient documents
- `POST /api/doctors/patients/:patientId/documents` — upload document for patient
- `GET /api/doctors/patients/:patientId/reports` — view/generate reports

### `/api/organizations` (new route file) — Shared routes for both org types
- `POST /api/organizations` — create organization (specify `type: 'care' | 'doctor'`)
- `GET /api/organizations/:id` — org details
- `PATCH /api/organizations/:id` — update org settings
- `GET /api/organizations/:id/patients` — list patients/residents
- `POST /api/organizations/:id/patients` — add patient/resident (via invite code or direct)
- `PATCH /api/organizations/:id/patients/:patientId` — update status, assign room/doctor
- `DELETE /api/organizations/:id/patients/:patientId` — discharge/remove patient
- `GET /api/organizations/:id/staff` — list staff members
- `POST /api/organizations/:id/staff` — add staff member (via invite code)
- `PATCH /api/organizations/:id/staff/:memberId` — update role/permissions
- `DELETE /api/organizations/:id/staff/:memberId` — remove staff member
- `GET /api/organizations/:id/alerts` — alert dashboard (all patients with critical symptoms)

### `/api/organizations` — Doctor org-specific routes
- `POST /api/organizations/:id/assignments` — assign a doctor to a patient (admin/owner only)
- `GET /api/organizations/:id/assignments` — list all doctor-patient assignments
- `GET /api/organizations/:id/assignments?doctor=:memberId` — assignments for a specific doctor
- `DELETE /api/organizations/:id/assignments/:assignmentId` — remove assignment
- `GET /api/organizations/:id/my-patients` — doctor's own assigned patients (for the logged-in doctor)

### `/api/organizations` — Care org-specific routes
- `GET /api/organizations/:id/residents/overview` — resident wellness dashboard (alert counts, medication adherence, last check-in)
- `POST /api/organizations/:id/residents/:patientId/caretakers` — manage external caretaker access for a resident (org approves/restricts)

### `/api/partnerships` (new route file) — Org-to-org links
- `POST /api/partnerships` — propose partnership (doctor org → care org)
- `GET /api/partnerships` — list partnerships for my org
- `PATCH /api/partnerships/:id/approve` — approve partnership (care org admin)
- `PATCH /api/partnerships/:id/revoke` — revoke partnership (either side)
- `GET /api/partnerships/:id/shared-patients` — list patients accessible through this partnership

### Invite code extensions
The Part 1 invite code system gains new types:
- `doctor_patient` — Solo doctor generates code, patient redeems → creates `doctor_patient_relationships`
- `org_resident` — Org generates code, patient/caretaker redeems → creates `organization_patients`
- `org_staff` — Org generates code, staff member redeems → creates `organization_members`

---

## Verification

### To test the schema:
1. Apply Part 2 migration after Part 1 is stable
2. Create test data: a solo doctor, a hospital (doctor org), a care org, patients
3. Test solo doctor: invite code → link patient → verify access
4. Test hospital: add patient → assign doctor → verify doctor sees only assigned patients
5. Test care org: add resident → verify staff access by role
6. Test partnership: hospital partners with care org → assign doctor to resident → verify cross-org access
7. Test partnership revocation: revoke → verify all cross-org assignments deactivated

### To test the API:
1. Register a solo doctor → generate invite → patient redeems → verify relationship
2. Create hospital → add staff (doctor, nurse, receptionist) → add patients → assign doctor
3. Verify doctor sees only assigned patients, admin sees all, receptionist sees nothing clinical
4. Create care org → add residents → verify alert dashboard
5. Create partnership → assign hospital doctor to care org resident → verify access
6. Revoke partnership → verify access revoked
7. Check audit log entries for all operations

---

## Files to Create/Modify

| File | Action |
|------|--------|
| `backend/schema.sql` | Add all 7 Part 2 tables + FK additions to Part 1 tables |
| `backend/src/middleware/auth.ts` | Extend `resolveTargetUser` with doctor/org/partnership checks + account type detection |
| `backend/src/routes/doctors.ts` | New: solo doctor portal API |
| `backend/src/routes/organizations.ts` | New: org management API (shared + care-specific + doctor-specific routes) |
| `backend/src/routes/partnerships.ts` | New: org-to-org partnership API |
| `backend/src/routes/invite.ts` | Extend redemption logic for doctor/org code types |
| `backend/src/index.ts` | Register new route files |
| Existing data routes | Extend `resolveTargetUser` checks to cover doctor/org/partnership access paths |
