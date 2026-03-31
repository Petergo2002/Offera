# Architecture

## Systemöversikt

Offera är uppdelat i tre lager:

1. `artifacts/offera`
   React/Vite-klienten för interna användare och publika offertmottagare.
2. `artifacts/api-server`
   Express-API:t som hanterar auth-boundary, affärslogik, signering och evidence-export.
3. `lib/*`
   Delade kontrakt, genererade typer och databasschema.

## Huvudflöden

### Intern operator-del

- användaren loggar in via Supabase Auth
- frontend hämtar session från Supabase och skickar bearer-token till API:t
- API:t verifierar JWT, löser `workspace_id` och skyddar interna routes
- offerter, mallar och företagsprofil läses och skrivs per workspace

### Publik offertdel

- mottagaren öppnar `/p/:slug`
- frontend hämtar offert via `/api/proposals/public/:slug`
- läsåtkomst kräver personlig `signing_token` eller att användaren redan är inloggad i rätt workspace
- om offerten skickades via Resend används `signing_token` för att låsa mottagaren till rätt revision
- accept/avböj sker via `/api/proposals/public/:slug/respond`

### Signering och beviskedja

- när en offert skickas skapas en låst signerbar revision
- exakt snapshot hash:as och kopplas till revisionen
- audit events loggas längs vägen
- signeringsbevis sparas mot revisionen
- evidence-export och läsbar bevisrapport kan hämtas i arkivet

## Tekniska byggblock

### Frontend

- Wouter för routing
- TanStack Query för datahämtning och cache
- egen `api.ts` som använder `customFetch` från `@workspace/api-client-react`
- `AuthProvider` som binder ihop Supabase-session, `/api/me` och företagsprofil

### Backend

- Express 5
- Pino för loggning
- Zod/Orval-genererade schemas för request/response-validering
- route-moduler för `me`, `company-profile`, `proposals`, `templates`

### Persistence

- PostgreSQL + Drizzle i normalt driftläge
- Supabase-migreringar i `supabase/migrations`
- lokal JSON-store som fallback i utveckling när DB saknas

## Auth-boundary

### Kräver auth

- `/api/me`
- `/api/company-profile`
- alla interna `proposals`- och `templates`-routes

### Publikt

- `/api/healthz`
- `/api/proposals/public/:slug` kräver personlig länk eller workspace-auth
- `/api/proposals/public/:slug/respond`
- frontend-routen `/p/:slug` laddar via samma accessregel

## Viktiga designbeslut

- contract-first: OpenAPI-specen är källan till API-kontraktet
- workspace-scope: interna records ägs av ett workspace
- evidence-first signering: signerad version är en separat revision, inte bara ett statusfält
- graceful fallback: API:t kan lokalt köra utan Postgres för enklare dev

## Runtime-lägen

### Databasläge

- `DATABASE_URL` finns
- Supabase Auth + workspace + RLS används
- evidence, revisions och auth är fullt aktiva

### Fallbackläge

- `DATABASE_URL` saknas
- offerter och mallar går via `.local/offera-dev-data.json`
- auth- och complianceflöden ska ses som databasorienterade; fallbackläget är främst för lokal utveckling
