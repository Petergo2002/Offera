# API

## Overview

- Base path: `/api`
- Transport: JSON over HTTP
- Auth: no authentication or authorization is implemented anywhere in the current API
- Contract source: `lib/api-spec/openapi.yaml`
- Runtime validators: `@workspace/api-zod`

The same contract is used by:

- `artifacts/api-server` for request parsing
- `artifacts/offera/src/lib/api.ts` for frontend response parsing
- `lib/api-client-react` for generated request helpers and React Query hooks

## Endpoint Summary

| Method | Path | Purpose | Auth |
| --- | --- | --- | --- |
| `GET` | `/api/healthz` | Health check | None |
| `GET` | `/api/proposals` | List proposals | None |
| `POST` | `/api/proposals` | Create proposal | None |
| `GET` | `/api/proposals/:id` | Fetch proposal by numeric ID | None |
| `PUT` | `/api/proposals/:id` | Update proposal | None |
| `DELETE` | `/api/proposals/:id` | Delete proposal | None |
| `POST` | `/api/proposals/:id/send` | Mark proposal as sent and save recipient email/message | None |
| `GET` | `/api/proposals/public/:slug` | Public proposal lookup by slug | None |
| `POST` | `/api/proposals/public/:slug/respond` | Accept or decline public proposal | None |
| `GET` | `/api/templates` | List templates | None |
| `POST` | `/api/templates` | Create template | None |
| `GET` | `/api/templates/:id` | Fetch template by numeric ID | None |
| `PUT` | `/api/templates/:id` | Update template | None |
| `DELETE` | `/api/templates/:id` | Delete template | None |
| `POST` | `/api/templates/:id/copy` | Duplicate template | None |

## Endpoints

### `GET /api/healthz`

- Returns: `{ "status": "ok" }`
- Used by: Replit artifact health check and any runtime liveness probe

### `GET /api/proposals`

- Returns: `Proposal[]`
- Sorting:
  - Database mode: newest `updatedAt` first
  - Local mode: local store also sorts newest first
- Notes:
  - Proposal totals are returned as numbers even though PostgreSQL stores `total_value` as numeric text

### `POST /api/proposals`

- Request body: `CreateProposalRequest`
  - `title?: string`
  - `clientName?: string`
  - `clientEmail?: string`
  - `templateId?: number`
- Response: `201 Created` with `Proposal`
- Behavior:
  - Seeds sections/branding from a template when `templateId` exists
  - Otherwise creates default sections and default branding
  - Initializes status as `draft`
  - Generates a random public slug

### `GET /api/proposals/:id`

- Path params:
  - `id: integer`
- Responses:
  - `200` with `Proposal`
  - `400` when `id` is not numeric
  - `404` when not found

### `PUT /api/proposals/:id`

- Path params:
  - `id: integer`
- Request body: `UpdateProposalRequest`
  - `title?: string`
  - `clientName?: string`
  - `clientEmail?: string`
  - `sections?: ProposalSection[]`
  - `branding?: ProposalBranding`
  - `parties?: ProposalParties`
  - `totalValue?: number`
- Response: updated `Proposal`
- Behavior:
  - Updates `updatedAt` and `lastActivityAt`
  - Keeps legacy `clientName`/`clientEmail` mirrored with `parties.recipient`

### `DELETE /api/proposals/:id`

- Path params:
  - `id: integer`
- Response: `204 No Content`
- Behavior:
  - Deletes the proposal in DB mode
  - Removes it from local JSON storage in fallback mode

### `POST /api/proposals/:id/send`

- Path params:
  - `id: integer`
- Request body: `SendProposalRequest`
  - `clientEmail: string`
  - `personalMessage?: string`
- Response: updated `Proposal`
- Behavior:
  - Sets status to `sent`
  - Stores recipient email and optional personal message
  - Does not actually send email; it only records send intent/state

### `GET /api/proposals/public/:slug`

- Path params:
  - `slug: string`
- Response: `Proposal`
- Public access: yes
- Behavior:
  - Looks up the proposal by `publicSlug`
  - If the current status is `sent`, the endpoint promotes it to `viewed`
  - Returns `404` when the slug is missing

### `POST /api/proposals/public/:slug/respond`

- Path params:
  - `slug: string`
- Request body: `RespondToProposalRequest`
  - `action: "accept" | "decline"`
  - `signerName?: string`
  - `initials?: string`
  - `signatureDataUrl?: string`
  - `termsAccepted?: boolean`
- Response: updated `Proposal`
- Public access: yes
- Accept validation rules from runtime implementation:
  - `signerName` is required
  - `initials` is required and normalized to uppercase, max 5 chars
  - `termsAccepted` must be `true`
  - `signatureDataUrl` must exist
  - signature must be a PNG data URL
  - signature payload length must be `<= 500000`
- Stored acceptance evidence:
  - signer name
  - initials
  - signature image data URL
  - consent timestamp
  - requester IP address when available
  - requester user agent when available

### `GET /api/templates`

- Returns: `Template[]`
- Behavior:
  - Ensures built-in starter templates exist before listing
  - Adds `usageCount` based on proposals referencing each template
  - Sorts built-ins before custom templates

### `POST /api/templates`

- Request body: `CreateTemplateRequest`
  - `name: string`
  - `description?: string`
  - `category: "webb" | "ai-agent" | "konsult" | "ovrigt"`
  - `sections?: ProposalSection[]`
  - `designSettings?: DocumentDesignSettings`
  - `sourceProposalId?: number`
- Response: `201 Created` with `Template`
- Behavior:
  - Rejects duplicate template names with `409`
  - When `sourceProposalId` is provided, clones a proposal into a sanitized template:
    - customer names/emails are replaced with placeholders
    - pricing rows are reset to generic rows and zero amounts

### `GET /api/templates/:id`

- Path params:
  - `id: integer`
- Responses:
  - `200` with `Template`
  - `400` for invalid IDs
  - `404` when not found

### `PUT /api/templates/:id`

- Path params:
  - `id: integer`
- Request body: `UpdateTemplateRequest`
  - `name?: string`
  - `description?: string`
  - `category?: TemplateCategory`
  - `sections?: ProposalSection[]`
  - `designSettings?: DocumentDesignSettings`
- Response: updated `Template`
- Guardrails:
  - Built-in templates return `403`
  - Duplicate names return `409`

### `DELETE /api/templates/:id`

- Path params:
  - `id: integer`
- Response: `204 No Content`
- Guardrails:
  - Built-in templates cannot be deleted and return `403`
  - Missing templates return `404`

### `POST /api/templates/:id/copy`

- Path params:
  - `id: integer`
- Request body: `CopyTemplateRequest`
  - `name?: string`
  - `description?: string`
  - `category?: TemplateCategory`
- Response: `201 Created` with copied `Template`
- Behavior:
  - Generates names like `Original (kopia)` and `Original (kopia) 2`
  - Copy is always stored as `isBuiltIn: false`

## Error Semantics

Common runtime error shapes:

- Validation/business errors: `{ "error": "..." }`
- Missing records: `404` with `{ "error": "Proposal not found" }` or `{ "error": "Template not found" }`
- Conflicts: `409` with duplicate-name messages
- Unexpected failures: `500` with `{ "error": "Internal server error" }`

## External API Usage

Strictly speaking, the runtime application does not call third-party business APIs.

What it does call:

- Frontend to backend: same-origin `fetch("/api/...")`
- Browser asset loading:
  - Google Fonts in `artifacts/offera/index.html` and `artifacts/offera/src/index.css`
  - Google Fonts in the mockup sandbox HTML

What is not implemented:

- No email provider integration
- No payment integration
- No e-signature SaaS integration
- No authentication provider

## Contract vs Implementation Notes

> ⚠️ Unclear: `replit.md` still documents `/api/health`, but the live code, OpenAPI spec, and artifact health probe all use `/api/healthz`.

> ⚠️ Unclear: The API has no auth checks at all, even for operator-only routes such as create/update/delete. That may be intentional for an internal prototype, but the code does not indicate a future auth boundary yet.
