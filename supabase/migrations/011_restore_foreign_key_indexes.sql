-- Restores covering indexes for foreign keys flagged by Supabase Performance Advisor.
-- This keeps FK checks, deletes, and joins efficient.

CREATE INDEX IF NOT EXISTS agent_versions_published_by_idx
  ON public.agent_versions (published_by);

CREATE INDEX IF NOT EXISTS agents_archived_by_idx
  ON public.agents (archived_by);

CREATE INDEX IF NOT EXISTS agents_created_by_idx
  ON public.agents (created_by);

CREATE INDEX IF NOT EXISTS agents_published_version_id_idx
  ON public.agents (published_version_id);

CREATE INDEX IF NOT EXISTS audit_logs_actor_id_idx
  ON public.audit_logs (actor_id);

CREATE INDEX IF NOT EXISTS chat_threads_created_by_idx
  ON public.chat_threads (created_by);

CREATE INDEX IF NOT EXISTS chat_threads_workspace_id_idx
  ON public.chat_threads (workspace_id);

CREATE INDEX IF NOT EXISTS connections_created_by_idx
  ON public.connections (created_by);

CREATE INDEX IF NOT EXISTS knowledge_sources_created_by_idx
  ON public.knowledge_sources (created_by);

CREATE INDEX IF NOT EXISTS legacy_widget_deployments_published_version_id_idx
  ON public.legacy_widget_deployments (published_version_id);

CREATE INDEX IF NOT EXISTS legacy_widget_leads_widget_session_id_idx
  ON public.legacy_widget_leads (widget_session_id);

CREATE INDEX IF NOT EXISTS legacy_widget_session_messages_deployment_id_idx
  ON public.legacy_widget_session_messages (deployment_id);

CREATE INDEX IF NOT EXISTS messages_created_by_idx
  ON public.messages (created_by);

CREATE INDEX IF NOT EXISTS run_approvals_requested_by_idx
  ON public.run_approvals (requested_by);

CREATE INDEX IF NOT EXISTS run_approvals_resolved_by_idx
  ON public.run_approvals (resolved_by);

CREATE INDEX IF NOT EXISTS runs_created_by_idx
  ON public.runs (created_by);

CREATE INDEX IF NOT EXISTS widget_agents_agent_id_idx
  ON public.widget_agents (agent_id);

CREATE INDEX IF NOT EXISTS widget_agents_published_version_id_idx
  ON public.widget_agents (published_version_id);

CREATE INDEX IF NOT EXISTS widget_leads_widget_agent_id_idx
  ON public.widget_leads (widget_agent_id);

CREATE INDEX IF NOT EXISTS widget_preview_drafts_created_by_idx
  ON public.widget_preview_drafts (created_by);

CREATE INDEX IF NOT EXISTS widget_preview_drafts_workspace_id_idx
  ON public.widget_preview_drafts (workspace_id);

CREATE INDEX IF NOT EXISTS widget_session_messages_widget_agent_id_idx
  ON public.widget_session_messages (widget_agent_id);

CREATE INDEX IF NOT EXISTS workspaces_owner_id_idx
  ON public.workspaces (owner_id);
