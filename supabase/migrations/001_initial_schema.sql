-- Quote Builder Pro - Initial Schema Migration
-- Run this in Supabase SQL Editor to set up the database

BEGIN;

-- ============================================
-- SHARED HELPERS
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

-- ============================================
-- TEMPLATES TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS templates (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'ovrigt',
  is_builtin BOOLEAN NOT NULL DEFAULT false,
  sections JSONB NOT NULL DEFAULT '[]'::jsonb,
  design_settings JSONB NOT NULL DEFAULT '{
    "accentColor": "#FF5C00",
    "fontPairing": "modern",
    "coverEnabled": true,
    "coverBackground": "#0F172A",
    "logoPosition": "left",
    "dividerStyle": "line"
  }'::jsonb,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT templates_name_not_blank CHECK (btrim(name) <> ''),
  CONSTRAINT templates_category_check CHECK (
    category IN ('webb', 'ai-agent', 'konsult', 'ovrigt')
  )
);

-- ============================================
-- PROPOSALS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS proposals (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  client_name TEXT NOT NULL DEFAULT '',
  client_email TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  total_value NUMERIC(12, 2) NOT NULL DEFAULT '0',
  public_slug TEXT NOT NULL UNIQUE,
  template_id INTEGER REFERENCES templates(id) ON DELETE SET NULL,
  sections JSONB NOT NULL DEFAULT '[]'::jsonb,
  branding JSONB NOT NULL DEFAULT '{
    "accentColor": "#FF5C00",
    "fontPairing": "modern",
    "coverEnabled": true,
    "coverBackground": "#0F172A",
    "logoPosition": "left",
    "dividerStyle": "line"
  }'::jsonb,
  parties JSONB NOT NULL DEFAULT '{
    "sender": {
      "companyName": "",
      "orgNumber": "",
      "contactName": "",
      "email": "",
      "phone": "",
      "address": "",
      "postalCode": "",
      "city": ""
    },
    "recipient": {
      "companyName": "",
      "orgNumber": "",
      "contactName": "",
      "email": "",
      "phone": "",
      "address": "",
      "postalCode": "",
      "city": "",
      "kind": "company"
    }
  }'::jsonb,
  personal_message TEXT,
  signed_by_name TEXT,
  signature_initials TEXT,
  signature_data_url TEXT,
  acceptance_evidence JSONB,
  signed_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  last_activity_at TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT proposals_status_check CHECK (
    status IN ('draft', 'sent', 'viewed', 'accepted', 'declined')
  ),
  CONSTRAINT proposals_total_value_nonnegative CHECK (total_value >= 0),
  CONSTRAINT proposals_public_slug_not_blank CHECK (btrim(public_slug) <> '')
);

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_proposals_status ON proposals(status);
CREATE INDEX IF NOT EXISTS idx_proposals_client_name ON proposals(client_name);
CREATE INDEX IF NOT EXISTS idx_proposals_template_id ON proposals(template_id);
CREATE INDEX IF NOT EXISTS idx_proposals_created_at ON proposals(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_proposals_updated_at ON proposals(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_proposals_last_activity_at ON proposals(last_activity_at DESC);

CREATE INDEX IF NOT EXISTS idx_templates_category ON templates(category);
CREATE INDEX IF NOT EXISTS idx_templates_is_builtin ON templates(is_builtin);
CREATE INDEX IF NOT EXISTS idx_templates_updated_at ON templates(updated_at DESC);

-- ============================================
-- TRIGGERS
-- ============================================

DROP TRIGGER IF EXISTS set_templates_updated_at ON templates;
CREATE TRIGGER set_templates_updated_at
BEFORE UPDATE ON templates
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_proposals_updated_at ON proposals;
CREATE TRIGGER set_proposals_updated_at
BEFORE UPDATE ON proposals
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

-- ============================================
-- ROW LEVEL SECURITY (optional - only enable when the app no longer uses the postgres role)
-- ============================================

-- ALTER TABLE proposals ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE templates ENABLE ROW LEVEL SECURITY;

-- ============================================
-- DEFAULT TEMPLATES SEED DATA
-- ============================================

INSERT INTO templates (name, description, category, is_builtin, sections, design_settings)
SELECT
  'Webb & Design',
  'För webbprojekt, designuppdrag och digitala lanseringar.',
  'webb',
  true,
  '[
    {
      "id": "section-1",
      "title": "Översikt",
      "blocks": [
        { "id": "block-1", "type": "heading", "content": "Webbprojekt för {{kundnamn}}", "level": 1 },
        { "id": "block-2", "type": "text", "content": "Beskriv webbupplägget här..." }
      ]
    },
    {
      "id": "section-2",
      "title": "Leverans",
      "blocks": [
        { "id": "block-3", "type": "heading", "content": "Vad som ingår i projektet", "level": 2 },
        { "id": "block-4", "type": "text", "content": "• Discovery och workshops\n• Struktur och wireframes\n• Design av centrala sidor\n• Utveckling och QA\n• Lansering och uppföljning" }
      ]
    },
    {
      "id": "section-3",
      "title": "Prissättning",
      "blocks": [
        { "id": "block-5", "type": "pricing", "rows": [], "vatEnabled": true }
      ]
    }
  ]'::jsonb,
  '{
    "accentColor": "#FF5C00",
    "fontPairing": "modern",
    "coverEnabled": true,
    "coverBackground": "#0F172A",
    "logoPosition": "left",
    "dividerStyle": "line"
  }'::jsonb
WHERE NOT EXISTS (
  SELECT 1 FROM templates WHERE name = 'Webb & Design'
);

INSERT INTO templates (name, description, category, is_builtin, sections, design_settings)
SELECT
  'AI-agent / Maja',
  'För AI-agenter, automation och operativa AI-leveranser.',
  'ai-agent',
  true,
  '[
    {
      "id": "section-1",
      "title": "Översikt",
      "blocks": [
        { "id": "block-1", "type": "heading", "content": "AI-agent för {{kundnamn}}", "level": 1 },
        { "id": "block-2", "type": "text", "content": "Beskriv AI-agentens ansvar här..." }
      ]
    },
    {
      "id": "section-2",
      "title": "Leverans",
      "blocks": [
        { "id": "block-3", "type": "heading", "content": "Vad agenten ska göra", "level": 2 },
        { "id": "block-4", "type": "text", "content": "• Identifiera vilka arbetsflöden som automatiseras\n• Beskriv vilka system agenten ska arbeta i\n• Förklara hur uppföljning och förbättring sker" }
      ]
    },
    {
      "id": "section-3",
      "title": "Prissättning",
      "blocks": [
        { "id": "block-5", "type": "pricing", "rows": [], "vatEnabled": true }
      ]
    }
  ]'::jsonb,
  '{
    "accentColor": "#4F46E5",
    "fontPairing": "editorial",
    "coverEnabled": true,
    "coverBackground": "#0F172A",
    "logoPosition": "left",
    "dividerStyle": "line"
  }'::jsonb
WHERE NOT EXISTS (
  SELECT 1 FROM templates WHERE name = 'AI-agent / Maja'
);

INSERT INTO templates (name, description, category, is_builtin, sections, design_settings)
SELECT
  'Konsulttjänst',
  'För rådgivning, strategi, förändringsledning och specialiststöd.',
  'konsult',
  true,
  '[
    {
      "id": "section-1",
      "title": "Översikt",
      "blocks": [
        { "id": "block-1", "type": "heading", "content": "Konsultupplägg för {{kundnamn}}", "level": 1 },
        { "id": "block-2", "type": "text", "content": "Beskriv konsultuppdraget här..." }
      ]
    },
    {
      "id": "section-2",
      "title": "Leverans",
      "blocks": [
        { "id": "block-3", "type": "heading", "content": "Uppdragets omfattning", "level": 2 },
        { "id": "block-4", "type": "text", "content": "• Nulägesanalys\n• Strategisk rekommendation\n• Implementeringsstöd\n• Löpande avstämningar" }
      ]
    },
    {
      "id": "section-3",
      "title": "Prissättning",
      "blocks": [
        { "id": "block-5", "type": "pricing", "rows": [], "vatEnabled": true }
      ]
    }
  ]'::jsonb,
  '{
    "accentColor": "#0F172A",
    "fontPairing": "klassisk",
    "coverEnabled": true,
    "coverBackground": "#0F172A",
    "logoPosition": "left",
    "dividerStyle": "line"
  }'::jsonb
WHERE NOT EXISTS (
  SELECT 1 FROM templates WHERE name = 'Konsulttjänst'
);

COMMIT;

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- SELECT tablename FROM pg_tables WHERE schemaname = 'public';
-- SELECT indexname FROM pg_indexes WHERE tablename IN ('proposals', 'templates');
