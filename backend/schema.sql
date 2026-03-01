-- ============================================================
-- Kira Health Companion — Supabase Schema
-- 7 tables · pgvector · RLS on all tables
-- ============================================================

-- Extensions
create extension if not exists "pgcrypto";
create extension if not exists "vector";

-- ============================================================
-- 1. profiles
-- ============================================================
create table profiles (
  id            uuid primary key default gen_random_uuid(),
  email         text unique not null,
  display_name  text,
  date_of_birth date,
  gender        text,
  blood_type    text,
  conditions    text[] default '{}',
  allergies     text[] default '{}',
  phone_number  text,
  timezone      text default 'UTC',
  emergency_contact jsonb,  -- {name, phone, relationship}
  checkin_time  time,
  voice_pref    text,
  language      text default 'en',

  -- onboarding
  onboarding_completed boolean default false,
  onboarding_step      int default 0,  -- 0=welcome, 1=profile, 2=health, 3=preferences, 4=done
  onboarding_data      jsonb,          -- partial form state so user can resume

  -- streaks
  streak               int8 default 0,
  streak_updated_on    date,

  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

alter table profiles enable row level security;
create policy "Users read own profile"  on profiles for select using (auth.uid() = id);
create policy "Users update own profile" on profiles for update using (auth.uid() = id);
create policy "Users insert own profile" on profiles for insert with check (auth.uid() = id);

-- ============================================================
-- 2. check_ins
-- ============================================================
create table check_ins (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references profiles(id) on delete cascade,
  input_mode  text check (input_mode in ('voice', 'text')),
  mood        text,
  energy      int2 check (energy between 1 and 10),
  sleep_hours numeric,
  notes       text,
  transcript  text,
  audio_url   text,
  summary     text,      -- AI-generated one-liner
  embedding   vector(1024),
  flagged     boolean default false,
  flag_reason text,
  created_at  timestamptz default now()
);

alter table check_ins enable row level security;
create policy "Users read own check_ins"  on check_ins for select using (user_id = auth.uid());
create policy "Users insert own check_ins" on check_ins for insert with check (user_id = auth.uid());

create index check_ins_user_created on check_ins (user_id, created_at desc);

-- ============================================================
-- 3. symptoms  (doubles as alerts via is_critical flag)
-- ============================================================
create table symptoms (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references profiles(id) on delete cascade,
  check_in_id   uuid references check_ins(id) on delete cascade,
  document_id   uuid,  -- FK added after documents table exists
  name          text not null,
  severity      int2 check (severity between 1 and 10),
  body_area     text,

  -- alert fields
  is_critical    boolean default false,
  alert_level    text check (alert_level in ('info', 'warning', 'critical')),
  alert_message  text,
  dismissed      boolean default false,

  created_at    timestamptz default now()
);

alter table symptoms enable row level security;
create policy "Users read own symptoms"  on symptoms for select using (user_id = auth.uid());
create policy "Users insert own symptoms" on symptoms for insert with check (user_id = auth.uid());
create policy "Users update own symptoms" on symptoms for update using (user_id = auth.uid());

create index symptoms_user_created on symptoms (user_id, created_at desc);
create index symptoms_alerts on symptoms (user_id) where is_critical = true and dismissed = false;

-- ============================================================
-- 4. documents  (findings merged as jsonb)
-- ============================================================
create table documents (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references profiles(id) on delete cascade,
  file_name     text not null,
  file_url      text not null,
  file_type     text,          -- MIME type
  document_type text check (document_type in ('lab_report', 'prescription', 'imaging', 'discharge_summary', 'other')),
  summary       text,
  findings      jsonb,         -- [{metric, value, unit, status, reference_note}] or any shape per doc type
  embedding     vector(1024),
  flagged       boolean default false,
  flag_reason   text,
  created_at    timestamptz default now()
);

alter table documents enable row level security;
create policy "Users read own documents"  on documents for select using (user_id = auth.uid());
create policy "Users insert own documents" on documents for insert with check (user_id = auth.uid());

create index documents_user_created on documents (user_id, created_at desc);

-- now add the FK from symptoms -> documents
alter table symptoms
  add constraint symptoms_document_id_fkey
  foreign key (document_id) references documents(id) on delete set null;

-- ============================================================
-- 5. document_chunks  (RAG pipeline)
-- ============================================================
create table document_chunks (
  id           uuid primary key default gen_random_uuid(),
  document_id  uuid not null references documents(id) on delete cascade,
  chunk_index  int4 not null,
  content      text not null,
  token_count  int4,
  embedding    vector(1024),
  metadata     jsonb,
  created_at   timestamptz default now()
);

alter table document_chunks enable row level security;
create policy "Users read own chunks" on document_chunks
  for select using (
    document_id in (select id from documents where user_id = auth.uid())
  );

create index chunks_document on document_chunks (document_id, chunk_index);

-- ============================================================
-- 6. reports
-- ============================================================
create table reports (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references profiles(id) on delete cascade,
  date_from       date not null,
  date_to         date not null,
  detail_level    text check (detail_level in ('brief', 'summary', 'detailed')),
  include_sections jsonb,   -- {symptoms: true, documents: true, trends: true, ...}
  content_path    text,
  status          text default 'pending' check (status in ('pending', 'generating', 'completed', 'failed')),
  created_at      timestamptz default now()
);

alter table reports enable row level security;
create policy "Users read own reports"  on reports for select using (user_id = auth.uid());
create policy "Users insert own reports" on reports for insert with check (user_id = auth.uid());
create policy "Users update own reports" on reports for update using (user_id = auth.uid());

create index reports_user_created on reports (user_id, created_at desc);

-- ============================================================
-- 7. outbound_calls
-- ============================================================
create table outbound_calls (
  id                          uuid primary key default gen_random_uuid(),
  user_id                     uuid not null references profiles(id) on delete cascade,
  trigger_symptom_id          uuid references symptoms(id) on delete set null,
  elevenlabs_conversation_id  text,
  twilio_call_sid             text,
  status                      text default 'initiated' check (status in ('initiated', 'in_progress', 'completed', 'failed', 'no_answer')),
  transcript                  text,
  outcome                     text,
  duration_seconds            int4,
  created_at                  timestamptz default now()
);

alter table outbound_calls enable row level security;
create policy "Users read own calls" on outbound_calls for select using (user_id = auth.uid());

create index calls_user_created on outbound_calls (user_id, created_at desc);

-- ============================================================
-- Vector indexes (enable once >1K rows per table)
-- ============================================================
-- create index check_ins_embedding_idx on check_ins using ivfflat (embedding vector_cosine_ops) with (lists = 100);
-- create index documents_embedding_idx on documents using ivfflat (embedding vector_cosine_ops) with (lists = 100);
-- create index chunks_embedding_idx on document_chunks using ivfflat (embedding vector_cosine_ops) with (lists = 100);

-- ============================================================
-- RPC: semantic search across document chunks
-- ============================================================
create or replace function match_document_chunks(
  query_embedding vector(1024),
  match_count     int default 5,
  filter_user_id  uuid default null
)
returns table (
  id           uuid,
  document_id  uuid,
  content      text,
  similarity   float
)
language plpgsql
as $$
begin
  return query
    select
      dc.id,
      dc.document_id,
      dc.content,
      1 - (dc.embedding <=> query_embedding) as similarity
    from document_chunks dc
    join documents d on d.id = dc.document_id
    where (filter_user_id is null or d.user_id = filter_user_id)
    order by dc.embedding <=> query_embedding
    limit match_count;
end;
$$;

-- ============================================================
-- RPC: semantic search across check-ins
-- ============================================================
create or replace function match_check_ins(
  query_embedding vector(1024),
  match_count     int default 5,
  filter_user_id  uuid default null
)
returns table (
  id         uuid,
  summary    text,
  mood       text,
  energy     int2,
  created_at timestamptz,
  similarity float
)
language plpgsql
as $$
begin
  return query
    select
      ci.id,
      ci.summary,
      ci.mood,
      ci.energy,
      ci.created_at,
      1 - (ci.embedding <=> query_embedding) as similarity
    from check_ins ci
    where (filter_user_id is null or ci.user_id = filter_user_id)
      and ci.embedding is not null
    order by ci.embedding <=> query_embedding
    limit match_count;
end;
$$;

-- ============================================================
-- Trigger: auto-update updated_at on profiles
-- ============================================================
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger profiles_updated_at
  before update on profiles
  for each row execute function update_updated_at();
