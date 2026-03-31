# Environment

## Overview

The project uses a small set of environment variables, mostly for ports, proxy targets, and database selection. There are no checked-in secret examples or `.env` files in the repository.

## Variable Reference

| Variable | Required | Default | Used In | Purpose |
| --- | --- | --- | --- | --- |
| `DATABASE_URL` | Required for PostgreSQL mode; optional overall | None | `lib/db/src/index.ts`, `lib/db/drizzle.config.ts`, API route modules | Enables PostgreSQL-backed persistence. Without it, the API falls back to local JSON storage. |
| `PORT` | Optional | `3001` for API, `5173` for web, `4173` for sandbox | API/server and Vite configs | Runtime port for whichever process is starting. |
| `API_TARGET` | Optional | `http://127.0.0.1:3001` | `artifacts/offera/vite.config.ts`, `scripts/dev.mjs`, `scripts/run-offera-dev.mjs` | Vite dev proxy target for `/api`. |
| `BASE_PATH` | Optional | `/` for web, `/__mockup` for sandbox artifact, `/` in dev scripts | Vite configs and dev scripts | Mount path for the SPA and preview sandbox. |
| `API_PORT` | Optional | `3001` | `scripts/dev.mjs` | Convenience variable for the combined dev launcher to override the API port. |
| `WEB_PORT` | Optional | `5173` | `scripts/dev.mjs` | Convenience variable for the combined dev launcher to override the web port. |
| `NODE_ENV` | Optional | `development` in dev scripts | API logger, API build/run, Vite configs | Controls dev/prod behavior such as pretty logging and Replit dev plugins. |
| `LOG_LEVEL` | Optional | `info` | `artifacts/api-server/src/lib/logger.ts` | Pino log level override. |
| `APP_ORIGIN` | Required for Resend-backed signing links | None | `artifacts/api-server/src/lib/proposal-signing.ts`, proposal send route | Base public URL used to build the personal signing link sent to the recipient. |
| `RESEND_API_KEY` | Required for Resend-backed signing links | None | `artifacts/api-server/src/lib/resend.ts` | Authenticates outbound email delivery via Resend. |
| `RESEND_FROM_EMAIL` | Required for Resend-backed signing links | None | `artifacts/api-server/src/lib/resend.ts` | Sender address used when sending signing emails. Should belong to a verified Resend domain in production. |
| `REPL_ID` | Optional, Replit-specific | None | web and sandbox Vite configs | Enables Replit-only development plugins. |
| `CI` | Optional, artifact-build specific | `true` in `.replit` postBuild | `.replit` | Replit build environment flag. |

## Required vs Optional

### Required to use the DB package directly

- `DATABASE_URL`

`lib/db/src/index.ts` throws immediately if it is missing, because the DB package itself only supports PostgreSQL mode.

### Optional for the application as a whole

- `DATABASE_URL`

The API runtime checks for this variable and intentionally falls back to `local-store.ts` when absent.

## Consumption Details

### `DATABASE_URL`

- DB package:
  - `lib/db/src/index.ts`
  - `lib/db/drizzle.config.ts`
- API behavior switches:
  - `artifacts/api-server/src/routes/proposals.ts`
  - `artifacts/api-server/src/routes/templates.ts`

Behavior:

- present: use PostgreSQL/Drizzle
- absent: use `.local/offera-dev-data.json`

### `PORT`

Different packages assign different defaults:

- API server: `3001`
- Offera web app: `5173`
- Mockup sandbox: `4173`
- Replit production API artifact: `8080`
- Replit production web artifact: `25570`

### `BASE_PATH`

Used to support non-root hosting:

- web app router base in `artifacts/offera/src/App.tsx` via `import.meta.env.BASE_URL`
- Vite config in `artifacts/offera/vite.config.ts`
- sandbox preview path base in `artifacts/mockup-sandbox/vite.config.ts`

### `API_TARGET`

Used only in local/dev web serving to proxy `/api` requests to the API process.

### Resend-backed signing

These variables are required only if you want proposal sending to deliver personal signing links by email:

- `APP_ORIGIN`
- `RESEND_API_KEY`
- `RESEND_FROM_EMAIL`

## Replit-provided Environment

The repository expects Replit to supply some runtime defaults through artifact configs:

- API artifact:
  - `PORT=8080`
  - `NODE_ENV=production`
- Web artifact:
  - `PORT=25570`
  - `BASE_PATH=/`

## Example Local Setups

### Local JSON fallback mode

```bash
pnpm run dev
```

No extra variables required.

### PostgreSQL-backed local mode

```bash
DATABASE_URL=postgres://user:pass@host:5432/dbname pnpm run dev
```

### PostgreSQL + Resend signing mode

```bash
DATABASE_URL=postgres://user:pass@host:5432/dbname \
APP_ORIGIN=http://localhost:5173 \
RESEND_API_KEY=re_xxx \
RESEND_FROM_EMAIL="Offera <signing@yourdomain.com>" \
pnpm run dev
```

### Custom ports

```bash
API_PORT=4001 WEB_PORT=5174 pnpm run dev
```

## Notes

> ⚠️ Unclear: `scripts/post-merge.sh` assumes a DB push should happen after merge, but if `DATABASE_URL` is not available in that environment the script will fail.
