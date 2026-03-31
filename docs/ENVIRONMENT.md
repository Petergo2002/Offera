# Environment

## Översikt

Dev-skripten läser `.env` automatiskt. Du behöver normalt inte exportera variabler manuellt innan `pnpm run dev`.

## Kärnvariabler

| Variabel | Krav | Syfte |
| --- | --- | --- |
| `DATABASE_URL` | Krävs för Postgres-läge | PostgreSQL/Supabase-anslutning |
| `VITE_SUPABASE_URL` | Krävs för auth | Supabase-projektets URL |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Krävs för auth | publishable key för browser-klienten |
| `VITE_API_BASE_URL` | Optional | publik API-bas-URL när webben inte kör same-origin med `/api` |
| `APP_ORIGIN` | Krävs för utskick | publik bas-URL för signeringslänkar |
| `RESEND_API_KEY` | Krävs för mejlutskick | Resend-auth |
| `RESEND_FROM_EMAIL` | Krävs för mejlutskick | verifierad avsändaradress |

## Vercel: två projekt

Produktionen är byggd för två separata Vercel-projekt:

- frontendprojekt med root `artifacts/offera`
- API-projekt med root `artifacts/api-server`

De ska inte dela exakt samma env-vars. De viktigaste variablerna pekar dessutom åt olika håll:

- `VITE_API_BASE_URL` ska peka på API-domänen
- `APP_ORIGIN` ska peka på frontend-domänen

## Vercel: frontendprojekt

Projekt:

- root directory: `artifacts/offera`
- framework preset: `Vite`

Sätt dessa variabler i frontendprojektet:

| Variabel | Value-format | Exempel |
| --- | --- | --- |
| `VITE_SUPABASE_URL` | Supabase-projektets URL | `https://YOUR_PROJECT.supabase.co` |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Supabase publishable key | `sb_publishable_...` |
| `VITE_API_BASE_URL` | publik URL till API-projektet | `https://your-api-project.vercel.app` |

Frontend ska inte ha:

- `DATABASE_URL`
- `APP_ORIGIN`
- `RESEND_API_KEY`
- `RESEND_FROM_EMAIL`

## Vercel: API-projekt

Projekt:

- root directory: `artifacts/api-server`
- framework preset: `Express`

Sätt dessa variabler i API-projektet:

| Variabel | Value-format | Exempel |
| --- | --- | --- |
| `DATABASE_URL` | PostgreSQL-anslutningssträng | `postgresql://...` |
| `SUPABASE_URL` | Supabase-projektets URL | `https://YOUR_PROJECT.supabase.co` |
| `APP_ORIGIN` | publik URL till frontendprojektet | `https://your-web-project.vercel.app` |
| `RESEND_API_KEY` | Resend API-nyckel | `re_...` |
| `RESEND_FROM_EMAIL` | verifierad avsändaradress i Resend | `Offera <signing@yourdomain.com>` |

API-projektet behöver inte `VITE_SUPABASE_PUBLISHABLE_KEY`.

## Viktiga relationer

- `VITE_API_BASE_URL` och `APP_ORIGIN` ska aldrig vara samma värde när frontend och API ligger på olika Vercel-domäner.
- `VITE_API_BASE_URL` ska vara API:t, till exempel `https://offera-woad.vercel.app`
- `APP_ORIGIN` ska vara webben, till exempel `https://offera-offera.vercel.app`
- `DATABASE_URL` ska vara en riktig Postgres connection string, inte en vanlig projekt-URL

## Vad koden faktiskt läser

- frontend auth kräver `VITE_SUPABASE_URL` och `VITE_SUPABASE_PUBLISHABLE_KEY`
- frontend API-klient läser `VITE_API_BASE_URL`
- backend DB-klient kräver `DATABASE_URL`
- backend auth läser `SUPABASE_URL` eller fallback-namn
- backend mejl/signeringslänkar kräver `APP_ORIGIN`, `RESEND_API_KEY` och `RESEND_FROM_EMAIL`

## Dev-/routingvariabler

| Variabel | Default | Syfte |
| --- | --- | --- |
| `PORT` | processberoende | generell portoverride |
| `API_PORT` | `3001` | API-port i `pnpm run dev` |
| `WEB_PORT` | `5173` | webbport i `pnpm run dev` |
| `API_TARGET` | `http://127.0.0.1:3001` | Vite-proxy för `/api` |
| `BASE_PATH` | `/` | mount path för SPA |
| `NODE_ENV` | `development` | dev/prod-beteende |
| `LOG_LEVEL` | `info` | Pino-loggnivå |
| `REPL_ID` | optional | Replit-specifika dev plugins |

## Backend auth-relaterat

API:t kan läsa Supabase-URL från flera namn:

- `SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_URL`
- `VITE_SUPABASE_URL`

I praktiken räcker det oftast att ha `VITE_SUPABASE_URL` i `.env`, eftersom dev-skripten laddar samma miljö för både web och API.

## Exempel: full lokal setup

```bash
DATABASE_URL=postgresql://...
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
VITE_API_BASE_URL=https://your-api-project.vercel.app
APP_ORIGIN=http://localhost:5173
RESEND_API_KEY=re_...
RESEND_FROM_EMAIL="Offera <signing@yourdomain.com>"
API_PORT=3001
WEB_PORT=5173
API_TARGET=http://127.0.0.1:3001
BASE_PATH=/
NODE_ENV=development
LOG_LEVEL=info
```

## Driftlägen

### Databasläge

När `DATABASE_URL` finns:

- API:t använder Postgres/Drizzle
- auth/workspace/RLS fungerar som tänkt
- evidence-export, revisionskedja och workspace-data ligger i DB

### Fallbackläge

När `DATABASE_URL` saknas:

- offerter och mallar går via `.local/offera-dev-data.json`
- detta är främst ett enklare dev-läge, inte det rekommenderade driftläget

## Vanliga misstag

- använda projekt-URL som `DATABASE_URL`
- glömma `VITE_SUPABASE_PUBLISHABLE_KEY`
- glömma `VITE_API_BASE_URL` när frontend och API ligger på olika domäner
- sätta `APP_ORIGIN` till API-domänen i stället för frontend-domänen
- sätta `VITE_API_BASE_URL` till frontend-domänen i stället för API-domänen
- lägga backend-hemligheter i frontendprojektet
- använda obekräftad `RESEND_FROM_EMAIL`
- köra utan `APP_ORIGIN`, vilket ger trasiga signeringslänkar
