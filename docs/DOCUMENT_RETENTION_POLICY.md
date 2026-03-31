# Offera Document Retention And Evidence Policy

## Scope
This policy covers proposals, signed revisions, audit events, signing tokens, and exported evidence packages stored by Offera.

## What Is Preserved
- The exact revision that was sent for signing.
- The document fingerprint (`snapshot_hash`) for the sent revision.
- Signing metadata: recipient email, signer name, signer email, initials, timestamp, Resend message id, and acceptance evidence.
- Audit events for proposal creation, updates, sends, opens, signing, declines, confirmations, and tamper detection.
- Signing token metadata required to prove delivery and use of the personal signing link.

## Immutability Rules
- A sent revision is treated as the canonical version that was presented for signing.
- A signed or declined revision must never be overwritten in place.
- Later edits create new revisions or affect draft data only.
- Audit events are append-only records and must not be edited or deleted through normal product flows.

## Retention
- Signed and declined revisions should be retained for at least 7 years unless stricter customer or legal requirements apply.
- Audit events tied to signed or declined revisions should be retained for the same period.
- Expired signing tokens may be retained as delivery evidence for the same period when linked to a signed or declined revision.
- Draft-only data may be deleted earlier based on product policy, but never if it would break evidence for an executed agreement.

## Export
- Offera must support export of a machine-readable evidence package for each proposal.
- The evidence package should include:
  - proposal metadata
  - active revision metadata
  - document snapshot
  - snapshot hash
  - audit trail
  - signing token metadata
  - generation timestamp
  - exporting user identity
- Evidence export should be available to authenticated workspace users through the archive/admin UI.

## Verification
- The stored `snapshot_hash` is the primary fingerprint for integrity checks.
- Any mismatch between a stored revision snapshot and its hash must be treated as a tamper event.
- Tamper events must remain visible in archive/admin evidence views.

## Access Control
- Internal proposal and evidence data is workspace-scoped and protected by authentication plus row-level security.
- Public proposal routes may expose only the active signing view required for the recipient flow.
- Export of evidence packages is restricted to authenticated users in the owning workspace.

## Backups
- Database backups must preserve proposal revisions, audit events, signing tokens, and company/workspace ownership mappings.
- Restore procedures must preserve original timestamps and hashes.

## Operational Guidance
- Do not claim that Offera provides qualified electronic signatures unless the signature flow is upgraded to a compliant trust service.
- Use product language such as `electronic signature`, `digital acceptance`, and `evidence package` unless stronger compliance is actually implemented.
