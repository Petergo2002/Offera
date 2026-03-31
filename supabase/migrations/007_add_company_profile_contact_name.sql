BEGIN;

ALTER TABLE public.company_profiles
  ADD COLUMN IF NOT EXISTS contact_name TEXT NOT NULL DEFAULT '';

COMMIT;
