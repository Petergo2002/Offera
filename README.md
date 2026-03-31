# Offera

Offera är en `pnpm`-monorepo för att skapa, skicka, signera och arkivera B2B-offerter. Produkten består av en React/Vite-app, en Express-API-server, Supabase Auth, PostgreSQL via Drizzle och en beviskedja för signerade dokument.

## Vad som finns idag

- inloggning med Supabase Auth
- workspace-bunden data med RLS
- offert- och mallbyggare
- publika offertlänkar
- personlig signeringslänk via Resend
- revisionskedja, audit trail och evidence export
- företagsprofil och cover-branding
- lokal JSON-fallback när `DATABASE_URL` saknas

## Stack

- Frontend: React 19, Vite 7, Wouter, TanStack Query, Tailwind CSS 4, Radix UI
- Backend: Express 5, Pino, Drizzle ORM
- Auth/DB: Supabase Auth + PostgreSQL
- Mail: Resend
- Contracts: OpenAPI 3.1 + Orval + Zod

## Repository

```text
.
├── artifacts/
│   ├── api-server/        # Express API
│   ├── offera/            # Huvudappen
│   └── mockup-sandbox/    # Isolerad preview-sandbox
├── lib/
│   ├── api-client-react/  # Genererad klient + custom fetch
│   ├── api-spec/          # OpenAPI-kontrakt
│   ├── api-zod/           # Genererade Zod-scheman och typer
│   └── db/                # Drizzle-schema och DB-klient
├── supabase/migrations/   # SQL-migreringar
├── scripts/               # Dev- och buildskript
└── docs/                  # Underhållen dokumentation
```

## Kom igång

1. Installera beroenden:

```bash
pnpm install
```

2. Lägg in din `.env`.

Minimikrav för full app:

```bash
DATABASE_URL=postgresql://...
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
APP_ORIGIN=http://localhost:5173
RESEND_API_KEY=re_...
RESEND_FROM_EMAIL="Offera <signing@yourdomain.com>"
```

3. Starta lokalt:

```bash
pnpm run dev
```

Standardportar:

- Web: `5173`
- API: `3001`

## Nyttiga kommandon

```bash
pnpm run dev
pnpm run typecheck
pnpm run build
pnpm --filter @workspace/api-spec run codegen
```

## Driftlägen

### Fullt Supabase/Postgres-läge

När `DATABASE_URL` finns använder API:t PostgreSQL via Drizzle.

### Lokal fallback

När `DATABASE_URL` saknas använder API:t `.local/offera-dev-data.json` för offerter och mallar. Auth, workspace-säkerhet och evidence-kedjan är däremot byggda för databasläge.

## Dokumentation

- [Docs index](docs/README.md)
- [Arkitektur](docs/ARCHITECTURE.md)
- [API](docs/API.md)
- [Kodbas](docs/CODEBASE.md)
- [Komponenter](docs/COMPONENTS.md)
- [Datamodeller](docs/DATA_MODELS.md)
- [Miljövariabler](docs/ENVIRONMENT.md)
- [Integrationer](docs/INTEGRATIONS.md)
- [Dokumentbevarande](docs/DOCUMENT_RETENTION_POLICY.md)

## Status

Dokumentationen i `docs/` beskriver nu current state. Äldre arbetsplaner har tagits bort från huvudstrukturen för att minska brus.
