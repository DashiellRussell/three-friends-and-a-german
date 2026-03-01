-- Migration: Add waitlist table and auth_id to profiles
-- Run this in Supabase SQL editor

-- 1. Waitlist table
CREATE TABLE IF NOT EXISTS waitlist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  source text DEFAULT 'landing',
  created_at timestamptz DEFAULT now()
);

-- 2. Add auth_id to profiles for Supabase Auth linking
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS auth_id uuid UNIQUE REFERENCES auth.users(id);

-- 3. Trigger: when a new auth.users row is created, upsert profile (link existing by email)
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS trigger AS $$
BEGIN
  -- Try to link existing profile by email, or create new one
  INSERT INTO public.profiles (id, email, auth_id)
  VALUES (gen_random_uuid(), NEW.email, NEW.id)
  ON CONFLICT (email) DO UPDATE SET auth_id = EXCLUDED.auth_id
  WHERE profiles.auth_id IS NULL;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if any
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_auth_user();
