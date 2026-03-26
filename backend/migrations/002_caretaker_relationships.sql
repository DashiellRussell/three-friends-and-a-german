-- Migration: Add caretaker relationships, invite codes, audit log
-- Part 1 MVP of auth & user relations plan

-- Add account_claimed to profiles
alter table profiles add column if not exists account_claimed boolean default true;

-- caretaker_relationships
create table if not exists caretaker_relationships (
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
  managed_by text not null default 'caretaker' check (managed_by in ('caretaker', 'patient', 'org')),
  linked_via text check (linked_via in ('invite_code', 'direct_setup', 'org_assigned')),
  organization_id uuid,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(caretaker_id, patient_id)
);

alter table caretaker_relationships enable row level security;
create policy "Users read own caretaker_relationships" on caretaker_relationships
  for select using (caretaker_id = auth.uid() or patient_id = auth.uid());

create index if not exists cr_caretaker on caretaker_relationships(caretaker_id) where status = 'active';
create index if not exists cr_patient on caretaker_relationships(patient_id) where status = 'active';

create trigger caretaker_relationships_updated_at
  before update on caretaker_relationships
  for each row execute function update_updated_at();

-- invite_codes
create table if not exists invite_codes (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  type text not null check (type in ('caretaker', 'doctor_patient', 'org_resident', 'org_staff')),
  created_by_profile_id uuid references profiles(id) on delete cascade,
  created_by_doctor_id uuid,
  created_by_org_id uuid,
  target_email text,
  relationship_data jsonb default '{}',
  expires_at timestamptz not null default (now() + interval '24 hours'),
  max_uses integer default 1,
  use_count integer default 0,
  redeemed_at timestamptz,
  created_at timestamptz default now()
);

alter table invite_codes enable row level security;
create policy "Users read own invite_codes" on invite_codes
  for select using (created_by_profile_id = auth.uid());

create index if not exists invite_codes_code on invite_codes(code) where redeemed_at is null;

-- audit_log
create table if not exists audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_type text not null check (actor_type in ('patient', 'caretaker', 'doctor', 'org_member', 'system')),
  actor_id text not null,
  action text not null,
  target_type text not null,
  target_id uuid not null,
  details jsonb default '{}',
  created_at timestamptz default now()
);

alter table audit_log enable row level security;
create policy "Users read own audit_log" on audit_log
  for select using (actor_id = auth.uid()::text);

create index if not exists audit_log_target on audit_log(target_type, target_id);
create index if not exists audit_log_actor on audit_log(actor_id);
create index if not exists audit_log_created on audit_log(created_at);
