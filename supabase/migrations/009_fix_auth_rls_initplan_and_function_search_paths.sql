BEGIN;

-- Security Advisor: Function Search Path Mutable
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = 'normalize_proposal_sections_legacy'
  ) THEN
    EXECUTE $sql$
      CREATE OR REPLACE FUNCTION public.normalize_proposal_sections_legacy(sections_json JSONB)
      RETURNS JSONB
      LANGUAGE sql
      IMMUTABLE
      SET search_path = public
      AS $fn$
        SELECT COALESCE(
          jsonb_agg(
            CASE
              WHEN jsonb_typeof(section_value) <> 'object' THEN section_value
              ELSE jsonb_set(
                section_value,
                '{blocks}',
                COALESCE((
                  SELECT jsonb_agg(
                    CASE
                      WHEN COALESCE(block_value->>'type', '') <> 'pricing' THEN block_value
                      ELSE jsonb_set(
                        block_value,
                        '{rows}',
                        COALESCE((
                          SELECT jsonb_agg(
                            CASE
                              WHEN jsonb_typeof(row_value) <> 'object' THEN row_value
                              WHEN row_value ? 'type' THEN row_value
                              ELSE row_value || jsonb_build_object('type', 'one_time')
                            END
                          )
                          FROM jsonb_array_elements(
                            CASE
                              WHEN jsonb_typeof(block_value->'rows') = 'array'
                                THEN block_value->'rows'
                              ELSE '[]'::jsonb
                            END
                          ) AS row_item(row_value)
                        ), '[]'::jsonb),
                        true
                      )
                    END
                  )
                  FROM jsonb_array_elements(
                    CASE
                      WHEN jsonb_typeof(section_value->'blocks') = 'array'
                        THEN section_value->'blocks'
                      ELSE '[]'::jsonb
                    END
                  ) AS block_item(block_value)
                ), '[]'::jsonb),
                true
              )
            END
          ),
          '[]'::jsonb
        )
        FROM jsonb_array_elements(
          CASE
            WHEN jsonb_typeof(sections_json) = 'array' THEN sections_json
            ELSE '[]'::jsonb
          END
        ) AS section_item(section_value);
      $fn$;
    $sql$;
  END IF;
END $$;

-- Performance Advisor: Auth RLS Initialization Plan
DO $$
DECLARE
  workspace_owner_column TEXT;
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'profiles'
      AND column_name = 'workspace_id'
  ) THEN
    EXECUTE $sql$
      CREATE OR REPLACE FUNCTION public.current_workspace_id()
      RETURNS UUID
      LANGUAGE sql
      STABLE
      SECURITY DEFINER
      SET search_path = public
      AS $fn$
        SELECT workspace_id
        FROM public.profiles
        WHERE id = (SELECT auth.uid())
        LIMIT 1;
      $fn$;
    $sql$;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'workspaces'
      AND column_name = 'owner_user_id'
  ) THEN
    workspace_owner_column := 'owner_user_id';
  ELSIF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'workspaces'
      AND column_name = 'owner_id'
  ) THEN
    workspace_owner_column := 'owner_id';
  ELSE
    workspace_owner_column := NULL;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_class
    WHERE relnamespace = 'public'::regnamespace
      AND relname = 'profiles'
      AND relkind = 'r'
  ) THEN
    DROP POLICY IF EXISTS profiles_select_own ON public.profiles;
    CREATE POLICY profiles_select_own
      ON public.profiles
      FOR SELECT
      TO authenticated
      USING ((SELECT auth.uid()) IS NOT NULL AND id = (SELECT auth.uid()));

    DROP POLICY IF EXISTS profiles_update_own ON public.profiles;
    CREATE POLICY profiles_update_own
      ON public.profiles
      FOR UPDATE
      TO authenticated
      USING ((SELECT auth.uid()) IS NOT NULL AND id = (SELECT auth.uid()))
      WITH CHECK ((SELECT auth.uid()) IS NOT NULL AND id = (SELECT auth.uid()));
  END IF;

  IF workspace_owner_column IS NOT NULL THEN
    EXECUTE format('DROP POLICY IF EXISTS workspaces_select_own ON public.workspaces;');
    EXECUTE format(
      'CREATE POLICY workspaces_select_own ON public.workspaces FOR SELECT TO authenticated USING ((SELECT auth.uid()) IS NOT NULL AND %I = (SELECT auth.uid()));',
      workspace_owner_column
    );
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'company_profiles'
      AND column_name = 'workspace_id'
  ) AND EXISTS (
    SELECT 1
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = 'current_workspace_id'
  ) THEN
    DROP POLICY IF EXISTS company_profiles_select_own ON public.company_profiles;
    CREATE POLICY company_profiles_select_own
      ON public.company_profiles
      FOR SELECT
      TO authenticated
      USING ((SELECT auth.uid()) IS NOT NULL AND workspace_id = (SELECT public.current_workspace_id()));

    DROP POLICY IF EXISTS company_profiles_update_own ON public.company_profiles;
    CREATE POLICY company_profiles_update_own
      ON public.company_profiles
      FOR UPDATE
      TO authenticated
      USING ((SELECT auth.uid()) IS NOT NULL AND workspace_id = (SELECT public.current_workspace_id()))
      WITH CHECK ((SELECT auth.uid()) IS NOT NULL AND workspace_id = (SELECT public.current_workspace_id()));
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'proposals'
      AND column_name = 'workspace_id'
  ) AND EXISTS (
    SELECT 1
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = 'current_workspace_id'
  ) THEN
    DROP POLICY IF EXISTS proposals_all_own_workspace ON public.proposals;
    CREATE POLICY proposals_all_own_workspace
      ON public.proposals
      FOR ALL
      TO authenticated
      USING ((SELECT auth.uid()) IS NOT NULL AND workspace_id = (SELECT public.current_workspace_id()))
      WITH CHECK ((SELECT auth.uid()) IS NOT NULL AND workspace_id = (SELECT public.current_workspace_id()));
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'proposal_revisions'
      AND column_name = 'workspace_id'
  ) AND EXISTS (
    SELECT 1
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = 'current_workspace_id'
  ) THEN
    DROP POLICY IF EXISTS proposal_revisions_all_own_workspace ON public.proposal_revisions;
    CREATE POLICY proposal_revisions_all_own_workspace
      ON public.proposal_revisions
      FOR ALL
      TO authenticated
      USING ((SELECT auth.uid()) IS NOT NULL AND workspace_id = (SELECT public.current_workspace_id()))
      WITH CHECK ((SELECT auth.uid()) IS NOT NULL AND workspace_id = (SELECT public.current_workspace_id()));
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'proposal_audit_events'
      AND column_name = 'workspace_id'
  ) AND EXISTS (
    SELECT 1
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = 'current_workspace_id'
  ) THEN
    DROP POLICY IF EXISTS proposal_audit_events_all_own_workspace ON public.proposal_audit_events;
    CREATE POLICY proposal_audit_events_all_own_workspace
      ON public.proposal_audit_events
      FOR ALL
      TO authenticated
      USING ((SELECT auth.uid()) IS NOT NULL AND workspace_id = (SELECT public.current_workspace_id()))
      WITH CHECK ((SELECT auth.uid()) IS NOT NULL AND workspace_id = (SELECT public.current_workspace_id()));
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'proposal_signing_tokens'
      AND column_name = 'workspace_id'
  ) AND EXISTS (
    SELECT 1
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = 'current_workspace_id'
  ) THEN
    DROP POLICY IF EXISTS proposal_signing_tokens_all_own_workspace ON public.proposal_signing_tokens;
    CREATE POLICY proposal_signing_tokens_all_own_workspace
      ON public.proposal_signing_tokens
      FOR ALL
      TO authenticated
      USING ((SELECT auth.uid()) IS NOT NULL AND workspace_id = (SELECT public.current_workspace_id()))
      WITH CHECK ((SELECT auth.uid()) IS NOT NULL AND workspace_id = (SELECT public.current_workspace_id()));
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'templates'
      AND column_name = 'workspace_id'
  ) AND EXISTS (
    SELECT 1
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = 'current_workspace_id'
  ) THEN
    DROP POLICY IF EXISTS templates_select_visible ON public.templates;
    CREATE POLICY templates_select_visible
      ON public.templates
      FOR SELECT
      TO authenticated
      USING (
        (SELECT auth.uid()) IS NOT NULL
        AND (
          is_builtin = TRUE
          OR workspace_id = (SELECT public.current_workspace_id())
        )
      );

    DROP POLICY IF EXISTS templates_insert_own ON public.templates;
    CREATE POLICY templates_insert_own
      ON public.templates
      FOR INSERT
      TO authenticated
      WITH CHECK (
        (SELECT auth.uid()) IS NOT NULL
        AND workspace_id = (SELECT public.current_workspace_id())
        AND COALESCE(is_builtin, FALSE) = FALSE
      );

    DROP POLICY IF EXISTS templates_update_own ON public.templates;
    CREATE POLICY templates_update_own
      ON public.templates
      FOR UPDATE
      TO authenticated
      USING (
        (SELECT auth.uid()) IS NOT NULL
        AND workspace_id = (SELECT public.current_workspace_id())
        AND COALESCE(is_builtin, FALSE) = FALSE
      )
      WITH CHECK (
        (SELECT auth.uid()) IS NOT NULL
        AND workspace_id = (SELECT public.current_workspace_id())
        AND COALESCE(is_builtin, FALSE) = FALSE
      );

    DROP POLICY IF EXISTS templates_delete_own ON public.templates;
    CREATE POLICY templates_delete_own
      ON public.templates
      FOR DELETE
      TO authenticated
      USING (
        (SELECT auth.uid()) IS NOT NULL
        AND workspace_id = (SELECT public.current_workspace_id())
        AND COALESCE(is_builtin, FALSE) = FALSE
      );
  END IF;
END $$;

COMMIT;
