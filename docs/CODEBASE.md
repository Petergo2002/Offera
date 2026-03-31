# Codebase

## Top level

| Path | Roll |
| --- | --- |
| `artifacts/` | Körbara appar |
| `lib/` | Delade bibliotek och genererade kontrakt |
| `supabase/migrations/` | SQL-migreringar för schema, auth och evidence-kedja |
| `scripts/` | Workspace-skript för dev och bygg |
| `docs/` | Underhållen dokumentation |

## Appar

### `artifacts/offera`

Huvudappen.

Viktigast:

- `src/App.tsx` routing + providers
- `src/components/auth-provider.tsx` Supabase-session och `/api/me`
- `src/components/layout.tsx` shell för interna sidor
- `src/components/document-builder.tsx` gemensam editor/preview för offert och mall
- `src/components/proposal-quick-view.tsx` sidepanel för översikt, bevis och permanenta actions
- `src/pages/dashboard.tsx`
- `src/pages/builder.tsx`
- `src/pages/templates.tsx`
- `src/pages/template-builder.tsx`
- `src/pages/archive.tsx`
- `src/pages/settings.tsx`
- `src/pages/public-proposal.tsx`

### `artifacts/api-server`

HTTP-API:t.

Viktigast:

- `src/app.ts` Express-app och middleware
- `src/index.ts` process entry
- `src/routes/me.ts`
- `src/routes/company-profile.ts`
- `src/routes/proposals.ts`
- `src/routes/templates.ts`
- `src/lib/auth.ts` Supabase JWT-verifiering och workspace-context
- `src/lib/local-store.ts` lokal fallback
- `src/lib/proposal-evidence.ts` snapshot/hash/evidence-logik
- `src/lib/proposal-signing.ts` token/länkgenerering
- `src/lib/pdf.ts` server-side PDF-rendering via Playwright
- `src/lib/resend.ts` e-postutskick

### `artifacts/mockup-sandbox`

Separat sandbox för isolerade UI/mockup-preview-komponenter.

## Delade bibliotek

### `lib/api-spec`

- OpenAPI-spec
- Orval-konfiguration

### `lib/api-client-react`

- genererad klient
- `custom-fetch`
- auth token getter som frontend sätter via `AuthProvider`

### `lib/api-zod`

- genererade Zod-scheman
- delade typer för request/response

### `lib/db`

- Drizzle-klient
- tabellscheman för workspace-, offert-, mall- och evidence-data

## Databasområden

| Fil | Syfte |
| --- | --- |
| `schema/workspaces.ts` | workspace-ägarskap |
| `schema/profiles.ts` | auth-användarprofil |
| `schema/company-profiles.ts` | företagsprofil för avsändaren |
| `schema/proposals.ts` | live-offerter |
| `schema/proposal-revisions.ts` | signerbara revisioner |
| `schema/proposal-audit-events.ts` | audit trail |
| `schema/signing-tokens.ts` | personliga signeringstokens |
| `schema/templates.ts` | built-in och egna mallar |

## Migrations

Nuvarande migreringskedja:

- `001_initial_schema.sql`
- `002_harden_schema.sql`
- `003_add_proposal_signing_tokens.sql`
- `004_add_proposal_evidence_chain.sql`
- `005_add_auth_and_workspace_rls.sql`
- `006_backfill_legacy_pricing_row_types.sql`
- `007_add_company_profile_contact_name.sql`
- `008_add_company_profile_postal_fields.sql`

## Dev-skript

| Fil | Syfte |
| --- | --- |
| `scripts/dev.mjs` | startar API + web och läser `.env` |
| `scripts/run-api-dev.mjs` | bygger och startar API lokalt |
| `scripts/run-offera-dev.mjs` | startar Vite-webben lokalt |

## Docs-princip

`docs/` ska beskriva current state. Tillfälliga arbetsplaner ska inte ligga kvar där permanent.
