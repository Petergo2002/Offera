# Integrations

## Aktiva integrationer

### Supabase Auth

Används för:

- email + lösenord
- browser-session
- bearer-token till API:t
- auth-källa för workspace-scope

Relevanta filer:

- `artifacts/offera/src/lib/supabase.ts`
- `artifacts/offera/src/components/auth-provider.tsx`
- `artifacts/api-server/src/lib/auth.ts`

### PostgreSQL / Supabase Postgres

Används för:

- offerter
- mallar
- company profile
- revisionskedja
- audit trail
- signing tokens

Relevanta filer:

- `lib/db/src/index.ts`
- `lib/db/src/schema/*`
- `supabase/migrations/*`

### Resend

Används för:

- personliga signeringslänkar
- white-label-ish utskick via verifierad domän

Relevanta filer:

- `artifacts/api-server/src/lib/resend.ts`
- `artifacts/api-server/src/lib/proposal-signing.ts`
- `artifacts/api-server/src/routes/proposals.ts`

### OpenAPI + Orval + Zod

Används för:

- central API-spec
- genererade typer och validerare
- typed fetch/client-stöd

Relevanta filer:

- `lib/api-spec/openapi.yaml`
- `lib/api-spec/orval.config.ts`
- `lib/api-zod/*`
- `lib/api-client-react/*`

## Produktnära bibliotek

### TanStack Query

Används för query/mutation-cache i frontend.

### Wouter

Används för lätt SPA-routing.

### Framer Motion

Används i offentliga/offertnära ytor där polish behövs.

### `react-signature-canvas`

Används för handritad signatur i publik offertvy.

## Fallback/interna integrationer

### Local store

När `DATABASE_URL` saknas använder API:t `.local/offera-dev-data.json`.

Det är en utvecklingsfallback, inte primär driftintegration.

### Replit artifact config

Repo:t innehåller fortfarande Replit-artifactfiler för build/run-metadata.

## Saker som inte är integrerade

- Stripe eller betalningar
- BankID
- extern e-signature vendor enligt eIDAS/Digg-spåret
- separat filstorage för logotyper/bilder

## Viktig notering

Appen använder idag en handskriven frontend-klient i `artifacts/offera/src/lib/api.ts` som primär transport. `lib/api-client-react` finns fortfarande som genererat stöd och auth-tokenbärare, men huvud-UI:t använder inte fullt ut de genererade hooks:en.
