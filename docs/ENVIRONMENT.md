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
- använda obekräftad `RESEND_FROM_EMAIL`
- köra utan `APP_ORIGIN`, vilket ger trasiga signeringslänkar
