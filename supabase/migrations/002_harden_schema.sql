-- Quote Builder Pro - Existing Database Hardening
-- Run this after 001_initial_schema.sql on databases that already exist.

BEGIN;

-- ============================================
-- DATA CLEANUP BEFORE CONSTRAINTS
-- ============================================

UPDATE proposals
SET status = 'draft'
WHERE status IS NULL
   OR status NOT IN ('draft', 'sent', 'viewed', 'accepted', 'declined');

UPDATE proposals
SET total_value = 0
WHERE total_value IS NULL
   OR total_value < 0;

UPDATE proposals
SET public_slug = md5(random()::text || clock_timestamp()::text)
WHERE btrim(public_slug) = '';

UPDATE templates
SET name = 'Untitled template ' || id
WHERE btrim(name) = '';

UPDATE templates
SET category = 'ovrigt'
WHERE category IS NULL
   OR category NOT IN ('webb', 'ai-agent', 'konsult', 'ovrigt');

UPDATE proposals p
SET template_id = NULL
WHERE template_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM templates t
    WHERE t.id = p.template_id
  );

-- ============================================
-- CONSTRAINTS
-- ============================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'templates_name_not_blank'
  ) THEN
    ALTER TABLE templates
    ADD CONSTRAINT templates_name_not_blank CHECK (btrim(name) <> '');
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'templates_category_check'
  ) THEN
    ALTER TABLE templates
    ADD CONSTRAINT templates_category_check CHECK (
      category IN ('webb', 'ai-agent', 'konsult', 'ovrigt')
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'proposals_status_check'
  ) THEN
    ALTER TABLE proposals
    ADD CONSTRAINT proposals_status_check CHECK (
      status IN ('draft', 'sent', 'viewed', 'accepted', 'declined')
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'proposals_total_value_nonnegative'
  ) THEN
    ALTER TABLE proposals
    ADD CONSTRAINT proposals_total_value_nonnegative CHECK (total_value >= 0);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'proposals_public_slug_not_blank'
  ) THEN
    ALTER TABLE proposals
    ADD CONSTRAINT proposals_public_slug_not_blank CHECK (btrim(public_slug) <> '');
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'proposals_template_id_fkey'
  ) THEN
    ALTER TABLE proposals
    ADD CONSTRAINT proposals_template_id_fkey
    FOREIGN KEY (template_id)
    REFERENCES templates(id)
    ON DELETE SET NULL;
  END IF;
END;
$$;

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_proposals_updated_at ON proposals(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_templates_updated_at ON templates(updated_at DESC);

-- ============================================
-- UPDATED_AT TRIGGERS
-- ============================================

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgname = 'set_templates_updated_at'
      AND tgrelid = 'templates'::regclass
  ) THEN
    CREATE TRIGGER set_templates_updated_at
    BEFORE UPDATE ON templates
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgname = 'set_proposals_updated_at'
      AND tgrelid = 'proposals'::regclass
  ) THEN
    CREATE TRIGGER set_proposals_updated_at
    BEFORE UPDATE ON proposals
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();
  END IF;
END;
$$;

COMMIT;
