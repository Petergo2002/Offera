# Offera Quote Builder Pro

Offera is a pnpm workspace monorepo for building, sending, previewing, and digitally accepting sales proposals. The current workspace contains a React/Vite frontend, an Express API, shared OpenAPI-generated client/schema packages, and a Drizzle/PostgreSQL data layer with a JSON-file fallback for local development without a database.

## Stack

- Frontend: React 19, Vite 7, Wouter, TanStack Query, Tailwind CSS 4, Radix UI, Framer Motion
- Backend: Express 5, Pino, Drizzle ORM, PostgreSQL
- Shared contracts: OpenAPI 3.1, Orval-generated React Query client and Zod schemas
- Tooling: pnpm workspaces, TypeScript project references, esbuild, Replit artifact config

## Workspace Layout

```text
.
├── artifacts/
│   ├── api-server/        # Express API artifact
│   ├── offera/            # Main proposal builder web app
│   └── mockup-sandbox/    # Isolated component/mockup preview app
├── lib/
│   ├── api-client-react/  # Generated React Query client
│   ├── api-spec/          # OpenAPI source and Orval config
│   ├── api-zod/           # Generated Zod schemas and TS types
│   └── db/                # Drizzle schema and PostgreSQL access
├── scripts/               # Workspace orchestration scripts
├── docs/                  # Architecture and codebase documentation
├── stitch 2/              # Design reference HTML/screenshots
└── attached_assets/       # Imported prompt/reference material
```

## Run Locally

1. Install dependencies:

```bash
pnpm install
```

2. Start the full stack:

```bash
pnpm run dev
```

3. Or run individual apps:

```bash
pnpm run dev:api
pnpm run dev:web
```

Default local ports:

- Web app: `5173`
- API server: `3001`
- Mockup sandbox: `4173` when run directly

### Database Modes

- With `DATABASE_URL` set, the API uses PostgreSQL through Drizzle.
- Without `DATABASE_URL`, proposal and template data fall back to `.local/offera-dev-data.json`.

## Typecheck and Build

```bash
pnpm run typecheck
pnpm run build
```

## Generate API Contracts

If you update [`lib/api-spec/openapi.yaml`](lib/api-spec/openapi.yaml), regenerate the client and Zod packages with:

```bash
pnpm --filter @workspace/api-spec run codegen
```

## Database Push

```bash
pnpm --filter @workspace/db run push
```

## Deployment

The repository is configured for Replit deployments:

- Root deployment metadata: `.replit`
- Web artifact: `artifacts/offera/.replit-artifact/artifact.toml`
- API artifact: `artifacts/api-server/.replit-artifact/artifact.toml`

Production behavior inferred from the artifact configs:

- Build the web app into `artifacts/offera/dist/public`
- Build the API bundle into `artifacts/api-server/dist/index.mjs`
- Serve the API on port `8080`
- Expose health at `/api/healthz`

## Documentation

- [Architecture](docs/ARCHITECTURE.md)
- [Codebase Guide](docs/CODEBASE.md)
- [API Reference](docs/API.md)
- [Component Inventory](docs/COMPONENTS.md)
- [Data Models](docs/DATA_MODELS.md)
- [Integrations](docs/INTEGRATIONS.md)
- [Environment Variables](docs/ENVIRONMENT.md)

## Current Notes

> ⚠️ Unclear: `replit.md` still documents `/api/health`, while the actual implementation and deployment config use `/api/healthz`.

> ⚠️ Unclear: The API package includes `cookie-parser`, but `artifacts/api-server/src/app.ts` does not mount it yet.
