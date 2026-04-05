-- Run this after 009_fix_auth_rls_initplan_and_function_search_paths.sql.
-- Intentionally excludes leaked password protection, which is configured in Supabase Auth settings.
-- Note: dropping indexes can briefly lock writes on busy tables. Run during a quiet period.

BEGIN;

-- Performance Advisor: Multiple Permissive Policies on public.agents DELETE
DROP POLICY IF EXISTS agents_member_delete ON public.agents;
DROP POLICY IF EXISTS agents_owner_delete ON public.agents;

CREATE POLICY agents_delete
  ON public.agents
  FOR DELETE
  TO public
  USING (
    can_edit_agent(id)
    OR EXISTS (
      SELECT 1
      FROM public.workspaces
      WHERE workspaces.id = agents.workspace_id
        AND workspaces.owner_id = (SELECT auth.uid())
    )
  );

COMMIT;

-- Performance Advisor: Unused Indexes
-- Keep outside the transaction to reduce the size of a single locking unit.
DROP INDEX IF EXISTS public.chat_threads_workspace_id_idx;
DROP INDEX IF EXISTS public.agent_versions_published_by_idx;
DROP INDEX IF EXISTS public.agents_archived_by_idx;
DROP INDEX IF EXISTS public.agents_created_by_idx;
DROP INDEX IF EXISTS public.agents_published_version_id_idx;
DROP INDEX IF EXISTS public.audit_logs_actor_id_idx;
DROP INDEX IF EXISTS public.chat_threads_created_by_idx;
DROP INDEX IF EXISTS public.connections_created_by_idx;
DROP INDEX IF EXISTS public.knowledge_sources_created_by_idx;
DROP INDEX IF EXISTS public.messages_created_by_idx;
DROP INDEX IF EXISTS public.run_approvals_requested_by_idx;
DROP INDEX IF EXISTS public.run_approvals_resolved_by_idx;
DROP INDEX IF EXISTS public.runs_created_by_idx;
DROP INDEX IF EXISTS public.knowledge_chunks_embedding_hnsw_idx;
DROP INDEX IF EXISTS public.workspaces_owner_id_idx;
DROP INDEX IF EXISTS public.widget_preview_drafts_expires_at_idx;
DROP INDEX IF EXISTS public.widgets_workspace_id_idx;
DROP INDEX IF EXISTS public.widgets_widget_public_key_idx;
DROP INDEX IF EXISTS public.widget_agents_agent_id_idx;
DROP INDEX IF EXISTS public.widget_leads_widget_agent_id_idx;
DROP INDEX IF EXISTS public.widget_preview_drafts_workspace_id_idx;
DROP INDEX IF EXISTS public.widget_preview_drafts_created_by_idx;
DROP INDEX IF EXISTS public.widget_session_messages_widget_agent_id_idx;
DROP INDEX IF EXISTS public.widget_leads_lower_email_idx;
DROP INDEX IF EXISTS public.legacy_widget_deployments_published_version_id_idx;
DROP INDEX IF EXISTS public.legacy_widget_leads_widget_session_id_idx;
DROP INDEX IF EXISTS public.legacy_widget_session_messages_deployment_id_idx;
DROP INDEX IF EXISTS public.widget_agents_published_version_id_idx;
DROP INDEX IF EXISTS public.agents_workspace_surface_status_idx;
