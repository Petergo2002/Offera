BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS workspaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  display_name TEXT,
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS company_profiles (
  workspace_id UUID PRIMARY KEY REFERENCES workspaces(id) ON DELETE CASCADE,
  company_name TEXT NOT NULL DEFAULT '',
  contact_name TEXT NOT NULL DEFAULT '',
  org_number TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  phone TEXT NOT NULL DEFAULT '',
  address TEXT NOT NULL DEFAULT '',
  website TEXT NOT NULL DEFAULT '',
  logo_url TEXT,
  default_currency TEXT NOT NULL DEFAULT 'SEK',
  default_tax_rate NUMERIC(5, 2) NOT NULL DEFAULT '25',
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

ALTER TABLE proposals ADD COLUMN IF NOT EXISTS workspace_id UUID;
ALTER TABLE templates ADD COLUMN IF NOT EXISTS workspace_id UUID;
ALTER TABLE proposal_revisions ADD COLUMN IF NOT EXISTS workspace_id UUID;
ALTER TABLE proposal_audit_events ADD COLUMN IF NOT EXISTS workspace_id UUID;
ALTER TABLE proposal_signing_tokens ADD COLUMN IF NOT EXISTS workspace_id UUID;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'proposals_workspace_id_fkey'
  ) THEN
    ALTER TABLE proposals
      ADD CONSTRAINT proposals_workspace_id_fkey
      FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'templates_workspace_id_fkey'
  ) THEN
    ALTER TABLE templates
      ADD CONSTRAINT templates_workspace_id_fkey
      FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'proposal_revisions_workspace_id_fkey'
  ) THEN
    ALTER TABLE proposal_revisions
      ADD CONSTRAINT proposal_revisions_workspace_id_fkey
      FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'proposal_audit_events_workspace_id_fkey'
  ) THEN
    ALTER TABLE proposal_audit_events
      ADD CONSTRAINT proposal_audit_events_workspace_id_fkey
      FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'proposal_signing_tokens_workspace_id_fkey'
  ) THEN
    ALTER TABLE proposal_signing_tokens
      ADD CONSTRAINT proposal_signing_tokens_workspace_id_fkey
      FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_profiles_workspace_id ON profiles(workspace_id);
CREATE INDEX IF NOT EXISTS idx_proposals_workspace_id ON proposals(workspace_id);
CREATE INDEX IF NOT EXISTS idx_templates_workspace_id ON templates(workspace_id);
CREATE INDEX IF NOT EXISTS idx_proposal_revisions_workspace_id ON proposal_revisions(workspace_id);
CREATE INDEX IF NOT EXISTS idx_proposal_audit_events_workspace_id ON proposal_audit_events(workspace_id);
CREATE INDEX IF NOT EXISTS idx_proposal_signing_tokens_workspace_id ON proposal_signing_tokens(workspace_id);

CREATE OR REPLACE FUNCTION public.current_workspace_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT workspace_id
  FROM public.profiles
  WHERE id = auth.uid()
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.claim_legacy_workspace_data(target_workspace_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  claimed_any BOOLEAN := FALSE;
BEGIN
  IF target_workspace_id IS NULL THEN
    RETURN FALSE;
  END IF;

  IF (SELECT COUNT(*) FROM public.profiles) <> 1 THEN
    RETURN FALSE;
  END IF;

  UPDATE public.proposals
  SET workspace_id = target_workspace_id
  WHERE workspace_id IS NULL;
  claimed_any := claimed_any OR FOUND;

  UPDATE public.templates
  SET workspace_id = target_workspace_id
  WHERE workspace_id IS NULL
    AND COALESCE(is_builtin, FALSE) = FALSE;
  claimed_any := claimed_any OR FOUND;

  UPDATE public.proposal_revisions
  SET workspace_id = target_workspace_id
  WHERE workspace_id IS NULL;
  claimed_any := claimed_any OR FOUND;

  UPDATE public.proposal_audit_events
  SET workspace_id = target_workspace_id
  WHERE workspace_id IS NULL;
  claimed_any := claimed_any OR FOUND;

  UPDATE public.proposal_signing_tokens
  SET workspace_id = target_workspace_id
  WHERE workspace_id IS NULL;
  claimed_any := claimed_any OR FOUND;

  RETURN claimed_any;
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_workspace_id UUID := gen_random_uuid();
  workspace_name TEXT := COALESCE(NULLIF(new.raw_user_meta_data->>'workspace_name', ''), split_part(COALESCE(new.email, 'Mitt företag'), '@', 1));
BEGIN
  INSERT INTO public.workspaces (id, owner_user_id, name)
  VALUES (
    new_workspace_id,
    new.id,
    COALESCE(NULLIF(workspace_name, ''), 'Mitt företag')
  );

  INSERT INTO public.profiles (id, email, display_name, workspace_id)
  VALUES (
    new.id,
    COALESCE(new.email, ''),
    NULLIF(new.raw_user_meta_data->>'display_name', ''),
    new_workspace_id
  );

  INSERT INTO public.company_profiles (workspace_id, email)
  VALUES (
    new_workspace_id,
    COALESCE(new.email, '')
  );

  PERFORM public.claim_legacy_workspace_data(new_workspace_id);

  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE proposal_revisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE proposal_audit_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE proposal_signing_tokens ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'profiles' AND policyname = 'profiles_select_own') THEN
    DROP POLICY profiles_select_own ON public.profiles;
  END IF;
  CREATE POLICY profiles_select_own
    ON public.profiles
    FOR SELECT
    TO authenticated
    USING (auth.uid() IS NOT NULL AND id = auth.uid());

  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'profiles' AND policyname = 'profiles_update_own') THEN
    DROP POLICY profiles_update_own ON public.profiles;
  END IF;
  CREATE POLICY profiles_update_own
    ON public.profiles
    FOR UPDATE
    TO authenticated
    USING (auth.uid() IS NOT NULL AND id = auth.uid())
    WITH CHECK (auth.uid() IS NOT NULL AND id = auth.uid());

  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'workspaces' AND policyname = 'workspaces_select_own') THEN
    DROP POLICY workspaces_select_own ON public.workspaces;
  END IF;
  CREATE POLICY workspaces_select_own
    ON public.workspaces
    FOR SELECT
    TO authenticated
    USING (auth.uid() IS NOT NULL AND owner_user_id = auth.uid());

  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'company_profiles' AND policyname = 'company_profiles_select_own') THEN
    DROP POLICY company_profiles_select_own ON public.company_profiles;
  END IF;
  CREATE POLICY company_profiles_select_own
    ON public.company_profiles
    FOR SELECT
    TO authenticated
    USING (auth.uid() IS NOT NULL AND workspace_id = public.current_workspace_id());

  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'company_profiles' AND policyname = 'company_profiles_update_own') THEN
    DROP POLICY company_profiles_update_own ON public.company_profiles;
  END IF;
  CREATE POLICY company_profiles_update_own
    ON public.company_profiles
    FOR UPDATE
    TO authenticated
    USING (auth.uid() IS NOT NULL AND workspace_id = public.current_workspace_id())
    WITH CHECK (auth.uid() IS NOT NULL AND workspace_id = public.current_workspace_id());

  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'proposals' AND policyname = 'proposals_all_own_workspace') THEN
    DROP POLICY proposals_all_own_workspace ON public.proposals;
  END IF;
  CREATE POLICY proposals_all_own_workspace
    ON public.proposals
    FOR ALL
    TO authenticated
    USING (auth.uid() IS NOT NULL AND workspace_id = public.current_workspace_id())
    WITH CHECK (auth.uid() IS NOT NULL AND workspace_id = public.current_workspace_id());

  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'proposal_revisions' AND policyname = 'proposal_revisions_all_own_workspace') THEN
    DROP POLICY proposal_revisions_all_own_workspace ON public.proposal_revisions;
  END IF;
  CREATE POLICY proposal_revisions_all_own_workspace
    ON public.proposal_revisions
    FOR ALL
    TO authenticated
    USING (auth.uid() IS NOT NULL AND workspace_id = public.current_workspace_id())
    WITH CHECK (auth.uid() IS NOT NULL AND workspace_id = public.current_workspace_id());

  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'proposal_audit_events' AND policyname = 'proposal_audit_events_all_own_workspace') THEN
    DROP POLICY proposal_audit_events_all_own_workspace ON public.proposal_audit_events;
  END IF;
  CREATE POLICY proposal_audit_events_all_own_workspace
    ON public.proposal_audit_events
    FOR ALL
    TO authenticated
    USING (auth.uid() IS NOT NULL AND workspace_id = public.current_workspace_id())
    WITH CHECK (auth.uid() IS NOT NULL AND workspace_id = public.current_workspace_id());

  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'proposal_signing_tokens' AND policyname = 'proposal_signing_tokens_all_own_workspace') THEN
    DROP POLICY proposal_signing_tokens_all_own_workspace ON public.proposal_signing_tokens;
  END IF;
  CREATE POLICY proposal_signing_tokens_all_own_workspace
    ON public.proposal_signing_tokens
    FOR ALL
    TO authenticated
    USING (auth.uid() IS NOT NULL AND workspace_id = public.current_workspace_id())
    WITH CHECK (auth.uid() IS NOT NULL AND workspace_id = public.current_workspace_id());

  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'templates' AND policyname = 'templates_select_visible') THEN
    DROP POLICY templates_select_visible ON public.templates;
  END IF;
  CREATE POLICY templates_select_visible
    ON public.templates
    FOR SELECT
    TO authenticated
    USING (
      auth.uid() IS NOT NULL
      AND (
        is_builtin = TRUE
        OR workspace_id = public.current_workspace_id()
      )
    );

  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'templates' AND policyname = 'templates_insert_own') THEN
    DROP POLICY templates_insert_own ON public.templates;
  END IF;
  CREATE POLICY templates_insert_own
    ON public.templates
    FOR INSERT
    TO authenticated
    WITH CHECK (
      auth.uid() IS NOT NULL
      AND workspace_id = public.current_workspace_id()
      AND COALESCE(is_builtin, FALSE) = FALSE
    );

  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'templates' AND policyname = 'templates_update_own') THEN
    DROP POLICY templates_update_own ON public.templates;
  END IF;
  CREATE POLICY templates_update_own
    ON public.templates
    FOR UPDATE
    TO authenticated
    USING (
      auth.uid() IS NOT NULL
      AND workspace_id = public.current_workspace_id()
      AND COALESCE(is_builtin, FALSE) = FALSE
    )
    WITH CHECK (
      auth.uid() IS NOT NULL
      AND workspace_id = public.current_workspace_id()
      AND COALESCE(is_builtin, FALSE) = FALSE
    );

  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'templates' AND policyname = 'templates_delete_own') THEN
    DROP POLICY templates_delete_own ON public.templates;
  END IF;
  CREATE POLICY templates_delete_own
    ON public.templates
    FOR DELETE
    TO authenticated
    USING (
      auth.uid() IS NOT NULL
      AND workspace_id = public.current_workspace_id()
      AND COALESCE(is_builtin, FALSE) = FALSE
    );
END $$;

COMMIT;
