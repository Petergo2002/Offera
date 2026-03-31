BEGIN;

CREATE TABLE IF NOT EXISTS proposal_revisions (
  id SERIAL PRIMARY KEY,
  proposal_id INTEGER NOT NULL REFERENCES proposals(id) ON DELETE CASCADE,
  revision_number INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'sent',
  snapshot JSONB NOT NULL,
  snapshot_hash TEXT NOT NULL,
  signing_recipient_email TEXT NOT NULL,
  resend_email_id TEXT,
  is_active BOOLEAN NOT NULL DEFAULT false,
  sent_at TIMESTAMP NOT NULL DEFAULT NOW(),
  viewed_at TIMESTAMP,
  signed_at TIMESTAMP,
  declined_at TIMESTAMP,
  signer_name TEXT,
  signer_email TEXT,
  signer_initials TEXT,
  signature_data_url TEXT,
  acceptance_evidence JSONB,
  tampered_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_proposal_revisions_proposal_revision_number
  ON proposal_revisions(proposal_id, revision_number);

CREATE INDEX IF NOT EXISTS idx_proposal_revisions_proposal_id
  ON proposal_revisions(proposal_id);

CREATE INDEX IF NOT EXISTS idx_proposal_revisions_is_active
  ON proposal_revisions(is_active);

CREATE INDEX IF NOT EXISTS idx_proposal_revisions_status
  ON proposal_revisions(status);

CREATE INDEX IF NOT EXISTS idx_proposal_revisions_sent_at
  ON proposal_revisions(sent_at);

CREATE INDEX IF NOT EXISTS idx_proposal_revisions_snapshot_hash
  ON proposal_revisions(snapshot_hash);

CREATE UNIQUE INDEX IF NOT EXISTS ux_proposal_revisions_active_per_proposal
  ON proposal_revisions(proposal_id)
  WHERE is_active = true;

CREATE TABLE IF NOT EXISTS proposal_audit_events (
  id SERIAL PRIMARY KEY,
  proposal_id INTEGER NOT NULL REFERENCES proposals(id) ON DELETE CASCADE,
  revision_id INTEGER REFERENCES proposal_revisions(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL,
  actor_type TEXT NOT NULL,
  actor_email TEXT,
  ip_address TEXT,
  user_agent TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_proposal_audit_events_proposal_id
  ON proposal_audit_events(proposal_id);

CREATE INDEX IF NOT EXISTS idx_proposal_audit_events_revision_id
  ON proposal_audit_events(revision_id);

CREATE INDEX IF NOT EXISTS idx_proposal_audit_events_event_type
  ON proposal_audit_events(event_type);

CREATE INDEX IF NOT EXISTS idx_proposal_audit_events_created_at
  ON proposal_audit_events(created_at);

ALTER TABLE proposals
  ADD COLUMN IF NOT EXISTS active_revision_id INTEGER;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'proposals_active_revision_id_fkey'
  ) THEN
    ALTER TABLE proposals
      ADD CONSTRAINT proposals_active_revision_id_fkey
      FOREIGN KEY (active_revision_id)
      REFERENCES proposal_revisions(id)
      ON DELETE SET NULL;
  END IF;
END $$;

ALTER TABLE proposal_signing_tokens
  ADD COLUMN IF NOT EXISTS revision_id INTEGER;

CREATE INDEX IF NOT EXISTS idx_proposal_signing_tokens_revision_id
  ON proposal_signing_tokens(revision_id);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'proposal_signing_tokens_revision_id_fkey'
  ) THEN
    ALTER TABLE proposal_signing_tokens
      ADD CONSTRAINT proposal_signing_tokens_revision_id_fkey
      FOREIGN KEY (revision_id)
      REFERENCES proposal_revisions(id)
      ON DELETE SET NULL;
  END IF;
END $$;

COMMIT;
