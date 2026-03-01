-- Migration: Add medications and medication_logs tables
-- Run this in Supabase SQL Editor (Dashboard > SQL Editor > New Query)
-- ============================================================

-- ============================================================
-- 1. medications — the user's medication list
-- ============================================================
CREATE TABLE IF NOT EXISTS medications (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name        text NOT NULL,
  dosage      text,
  frequency   text DEFAULT 'daily',
  time_of_day text,
  instructions text,
  active      boolean DEFAULT true,
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now()
);

ALTER TABLE medications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own medications"
  ON medications FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users insert own medications"
  ON medications FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users update own medications"
  ON medications FOR UPDATE
  USING (user_id = auth.uid());

CREATE INDEX IF NOT EXISTS medications_user_active
  ON medications (user_id) WHERE active = true;

-- Reuse the existing update_updated_at() trigger function
CREATE TRIGGER medications_updated_at
  BEFORE UPDATE ON medications
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- 2. medication_logs — daily intake records
-- ============================================================
CREATE TABLE IF NOT EXISTS medication_logs (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  medication_id   uuid NOT NULL REFERENCES medications(id) ON DELETE CASCADE,
  check_in_id     uuid REFERENCES check_ins(id) ON DELETE SET NULL,
  taken           boolean NOT NULL,
  logged_at       timestamptz DEFAULT now(),
  scheduled_date  date DEFAULT CURRENT_DATE,
  source          text DEFAULT 'manual' CHECK (source IN ('manual', 'voice', 'text', 'auto')),
  notes           text
);

ALTER TABLE medication_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own medication_logs"
  ON medication_logs FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users insert own medication_logs"
  ON medication_logs FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users update own medication_logs"
  ON medication_logs FOR UPDATE
  USING (user_id = auth.uid());

-- Prevents double-logging same medication on same day; enables upsert for toggle behavior
CREATE UNIQUE INDEX IF NOT EXISTS medication_logs_unique
  ON medication_logs (user_id, medication_id, scheduled_date);

CREATE INDEX IF NOT EXISTS medication_logs_user_date
  ON medication_logs (user_id, scheduled_date DESC);

-- ============================================================
-- Verify tables were created
-- ============================================================
SELECT 'medications' AS table_name, COUNT(*) AS row_count FROM medications
UNION ALL
SELECT 'medication_logs', COUNT(*) FROM medication_logs;
