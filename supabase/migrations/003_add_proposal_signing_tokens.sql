BEGIN;

CREATE TABLE IF NOT EXISTS proposal_signing_tokens (
  id SERIAL PRIMARY KEY,
  proposal_id INTEGER NOT NULL REFERENCES proposals(id) ON DELETE CASCADE,
  recipient_email TEXT NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,
  email_id TEXT,
  expires_at TIMESTAMP NOT NULL,
  used_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_proposal_signing_tokens_proposal_id
  ON proposal_signing_tokens(proposal_id);

CREATE INDEX IF NOT EXISTS idx_proposal_signing_tokens_recipient_email
  ON proposal_signing_tokens(recipient_email);

CREATE INDEX IF NOT EXISTS idx_proposal_signing_tokens_expires_at
  ON proposal_signing_tokens(expires_at);

COMMIT;
