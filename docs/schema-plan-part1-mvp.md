# Database Schema Plan — Part 1: MVP (Caretaker Relationships)

## Context

Tessera currently has a single-user model — each person has a `profiles` record and can only see their own health data. This MVP adds **caretaker relationships** so family members and friends can monitor a loved one's health, with proper permissions and account claiming.

This is Part 1 of a 2-part schema plan. Part 2 covers doctors, organizations, and partnerships (see `schema-plan-part2-future.md`).

### What MVP Includes
- Caretaker relationships (with levels, permissions, account claiming)
- Invite codes (for linking caretakers)
- Audit log (relationship lifecycle tracking)
- `profiles.account_claimed` column
- `resolveTargetUser` middleware
- Caretaker API routes (`/api/relationships`, `/api/invite`)

### What MVP Does NOT Include (see Part 2)
- Doctor accounts and doctor-patient relationships
- Care organizations (old age homes) and doctor organizations (hospitals)
- Org-to-org partnerships
- Doctor/org API routes

The MVP tables are designed to be **forward-compatible** with the Part 2 schema. No breaking changes needed when Part 2 is implemented.

---

## Account Types (MVP)

| Type | Has health records? | Purpose |
|------|-------------------|---------|
| **Patient** (existing `profiles`) | Yes | Track own health, check-ins, symptoms, medications |
| **Caretaker** (also a `profiles` record) | Yes (their own) | Monitor a loved one's health data with permission-gated access |

Caretakers are regular users who also look after others. They may have their own health data. This is fundamentally different from doctors and organizations (covered in Part 2), which have no health records of their own.

---

## New Tables

### 1. `caretaker_relationships`
Personal caretaker links (family, friends). Both sides are regular profiles.

```sql
create table caretaker_relationships (
  id uuid primary key default gen_random_uuid(),
  caretaker_id uuid not null references profiles(id) on delete cascade,
  patient_id uuid not null references profiles(id) on delete cascade,
  level text not null default 'secondary' check (level in ('primary', 'secondary')),
  status text not null default 'active' check (status in ('pending', 'active', 'revoked')),
  permissions jsonb not null default '{
    "view_alerts": true,
    "view_checkins": false,
    "view_symptoms": false,
    "view_medications": false,
    "view_documents": false,
    "view_reports": false,
    "view_trends": false,
    "initiate_calls": false
  }',
  -- Who controls permissions: the person who set up the account initially,
  -- but patient can "claim" control later
  managed_by text not null default 'caretaker' check (managed_by in ('caretaker', 'patient', 'org')),
  linked_via text check (linked_via in ('invite_code', 'direct_setup', 'org_assigned')),
  organization_id uuid,  -- if created through an org (FK added in Part 2 migration)
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(caretaker_id, patient_id)
);

create index cr_caretaker on caretaker_relationships(caretaker_id) where status = 'active';
create index cr_patient on caretaker_relationships(patient_id) where status = 'active';
```

**Permission control flow:**
1. When a caretaker sets up an account for a tech-illiterate user → `managed_by = 'caretaker'` (caretaker controls permissions)
2. Patient can later "claim" their account → `managed_by = 'patient'` (patient takes control, can adjust all caretaker permissions)
3. If set up through an org (Part 2) → `managed_by = 'org'` (org admin controls, can approve/restrict external caretakers)

### 2. `invite_codes`
Short-lived codes for linking relationships. MVP supports caretaker linking; Part 2 adds doctor/org code types.

```sql
create table invite_codes (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,                 -- 6-char alphanumeric (e.g., "A3X9K2")
  type text not null check (type in ('caretaker', 'doctor_patient', 'org_resident', 'org_staff')),
  -- Who created the code (MVP only uses created_by_profile_id):
  created_by_profile_id uuid references profiles(id) on delete cascade,
  created_by_doctor_id uuid,                 -- FK added in Part 2 migration
  created_by_org_id uuid,                    -- FK added in Part 2 migration
  -- Target constraints (optional):
  target_email text,                         -- if set, only this email can redeem
  -- Metadata for the relationship to create:
  relationship_data jsonb default '{}',      -- e.g., {"level": "primary", "permissions": {...}}
  -- Expiry & usage:
  expires_at timestamptz not null default (now() + interval '24 hours'),
  max_uses integer default 1,
  use_count integer default 0,
  redeemed_at timestamptz,
  created_at timestamptz default now()
);

create index invite_codes_code on invite_codes(code) where redeemed_at is null;
```

**How caretaker linking works (MVP):**
- Either the caretaker or patient generates a 6-char code
- Code includes permission level and defaults in `relationship_data`
- Other party enters the code → creates `caretaker_relationships` entry
- Codes expire after 24 hours and are single-use by default
- Can be restricted to a specific email for security

### 3. `audit_log`
Track relationship changes for security and accountability.

```sql
create table audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_type text not null check (actor_type in ('patient', 'caretaker', 'doctor', 'org_member', 'system')),
  actor_id text not null,                    -- profile UUID or doctor UUID or org_member UUID
  action text not null,                      -- 'relationship_created', 'permissions_changed', 'relationship_revoked', etc.
  target_type text not null,                 -- 'caretaker_relationship', 'doctor_patient_relationship', 'org_resident', etc.
  target_id uuid not null,
  details jsonb default '{}',               -- what changed (old/new values)
  created_at timestamptz default now()
);

create index audit_log_target on audit_log(target_type, target_id);
create index audit_log_actor on audit_log(actor_id);
create index audit_log_created on audit_log(created_at);
```

---

## Modifications to Existing Tables

### `profiles` table — add one column:

```sql
alter table profiles add column account_claimed boolean default true;
```

When a caretaker creates an account on behalf of someone else, `account_claimed = false`. When the actual person logs in and takes ownership, it flips to `true` and `caretaker_relationships.managed_by` switches to `'patient'`.

---

## MVP Summary

| Table | Purpose |
|-------|---------|
| `caretaker_relationships` | Personal caretaker ↔ patient links with levels & permissions |
| `invite_codes` | Short-lived linking codes (forward-compatible with all relationship types) |
| `audit_log` | Relationship lifecycle events |
| `profiles.account_claimed` | Track whether patient has claimed their own account |

**Total: 3 new tables, 1 column added to `profiles`.**

---

## Key Access Patterns

### "Show me all my caretakers" (Patient)
```sql
SELECT p.*, cr.level, cr.permissions FROM profiles p
JOIN caretaker_relationships cr ON cr.caretaker_id = p.id
WHERE cr.patient_id = :patient_id AND cr.status = 'active';
```

### "Show me everyone I care for" (Caretaker)
```sql
SELECT p.*, cr.level, cr.permissions FROM profiles p
JOIN caretaker_relationships cr ON cr.patient_id = p.id
WHERE cr.caretaker_id = :caretaker_id AND cr.status = 'active';
```

### "Can this person view this patient's check-ins?" (MVP)
Backend helper `resolveAccess(actorClerkId, patientId, permission)` checks:
1. Is actor the patient themselves? → full access
2. Is actor a caretaker with `view_checkins` permission? → allowed
3. Otherwise → denied

(Part 2 extends this with doctor and org checks.)

---

## Auth Middleware Changes

### `backend/src/middleware/auth.ts`
Add a `resolveTargetUser` middleware/helper:
- Reads `?for=<patient_id>` query param or `x-on-behalf-of` header
- If present, checks the acting user's permissions via `caretaker_relationships`
- Sets `req.targetUserId` (the patient being viewed) and `req.actorType` ('self' or 'caretaker')
- Existing routes use `req.targetUserId || req.userId` for data queries

---

## New API Routes

### `/api/relationships` (new route file)
- `GET /api/relationships/caretakers` — list my caretakers (as patient)
- `GET /api/relationships/dependents` — list people I care for (as caretaker)
- `POST /api/relationships/caretakers` — add caretaker (via invite code)
- `PATCH /api/relationships/:id/permissions` — update permissions
- `DELETE /api/relationships/:id` — revoke relationship
- `POST /api/relationships/claim` — patient claims their account (sets `managed_by = 'patient'`)

### `/api/invite` (new route file)
- `POST /api/invite/generate` — create invite code (specify type + relationship_data)
- `POST /api/invite/redeem` — redeem invite code (creates appropriate relationship)
- `GET /api/invite/:code/info` — peek at code (type, who created it, expiry) without redeeming

### Existing routes modification
Routes like `/api/checkin`, `/api/symptoms`, `/api/documents`, `/api/reports` need to accept `?for=<patient_id>` and use the `resolveTargetUser` helper to authorize cross-user data access.

---

## Verification

### To test the schema:
1. Apply migration to Supabase: `psql` or Supabase dashboard SQL editor
2. Create test data: two profiles (one caretaker, one patient)
3. Test invite code flow: generate → redeem → verify relationship created
4. Test permission checks: caretaker with `view_alerts` only should NOT see check-ins
5. Test account claiming: caretaker creates account → patient claims it

### To test the API:
1. Create caretaker relationship via invite code → verify bidirectional listing
2. Update permissions → verify access changes
3. Caretaker sets up account for patient → patient claims account → verify `managed_by` flips
4. Revoke a relationship → verify data access is denied
5. Check audit log entries for all relationship changes

---

## Files to Create/Modify

| File | Action |
|------|--------|
| `backend/schema.sql` | Add `caretaker_relationships`, `invite_codes`, `audit_log` + `account_claimed` column to profiles |
| `backend/src/middleware/auth.ts` | Add `resolveTargetUser` helper |
| `backend/src/routes/relationships.ts` | New: caretaker relationship CRUD |
| `backend/src/routes/invite.ts` | New: invite code generation/redemption |
| `backend/src/index.ts` | Register new route files |
| Existing data routes (`checkin.ts`, `symptoms.ts`, `documents.ts`, `reports.ts`, `voice.ts`) | Add `?for=` param support via `resolveTargetUser` |
