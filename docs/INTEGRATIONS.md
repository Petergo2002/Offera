# Integrations

## Summary

The codebase integrates primarily with libraries and platform tooling rather than third-party SaaS backends. There is no Stripe, auth provider, email service, or external e-signature API in the current runtime code.

## Runtime Integrations

### PostgreSQL (`pg`)

- Purpose: persistent storage for proposals and templates
- Configured in: `lib/db/src/index.ts`
- Activated by: `DATABASE_URL`
- Used by:
  - `artifacts/api-server/src/routes/proposals.ts`
  - `artifacts/api-server/src/routes/templates.ts`
  - `lib/db/src/schema/*.ts`

### Drizzle ORM / Drizzle Kit

- Purpose: typed schema definition and DB access
- Configured in:
  - `lib/db/src/schema/proposals.ts`
  - `lib/db/src/schema/templates.ts`
  - `lib/db/drizzle.config.ts`
- Tooling commands:
  - `pnpm --filter @workspace/db run push`
  - `pnpm --filter @workspace/db run push-force`

### Local JSON Store

- Purpose: offline/no-database fallback
- Configured in: `artifacts/api-server/src/lib/local-store.ts`
- Backing file: `.local/offera-dev-data.json`
- Used when: `DATABASE_URL` is missing

### OpenAPI + Orval

- Purpose: single-source API contract and generated client/schema packages
- Source:
  - `lib/api-spec/openapi.yaml`
  - `lib/api-spec/orval.config.ts`
- Outputs:
  - `lib/api-client-react/src/generated/**`
  - `lib/api-zod/src/generated/**`

### TanStack React Query

- Purpose: query caching and mutation coordination in the frontend
- Configured in: `artifacts/offera/src/App.tsx`
- Used by:
  - `dashboard.tsx`
  - `builder.tsx`
  - `template-builder.tsx`
  - `templates.tsx`
  - `public-proposal.tsx`
- Generated support also exists in: `lib/api-client-react/src/generated/api.ts`

### Wouter

- Purpose: lightweight SPA routing
- Used in:
  - `artifacts/offera/src/App.tsx`
  - `artifacts/offera/src/components/layout.tsx`
  - route pages under `artifacts/offera/src/pages`

### Radix UI + shadcn-style wrappers

- Purpose: accessible low-level primitives with local styling
- Configured by:
  - `artifacts/offera/components.json`
  - `artifacts/mockup-sandbox/components.json`
- Used throughout `artifacts/offera/src/components/ui/**`

### Tailwind CSS 4

- Purpose: styling system and theme tokens
- Configured in:
  - `artifacts/offera/src/index.css`
  - `artifacts/offera/vite.config.ts`
  - `artifacts/mockup-sandbox/src/index.css`
  - `artifacts/mockup-sandbox/vite.config.ts`

### Framer Motion

- Purpose: premium UI transitions and stateful modal/preview animations
- Used in:
  - `artifacts/offera/src/pages/public-proposal.tsx`

### `@hello-pangea/dnd`

- Purpose: drag-and-drop section reordering
- Used in: `artifacts/offera/src/components/document-builder.tsx`

### `react-signature-canvas`

- Purpose: handwritten signature capture in the public acceptance flow
- Used in: `artifacts/offera/src/pages/public-proposal.tsx`
- Local typing shim: `artifacts/offera/src/types/react-signature-canvas.d.ts`

### `canvas-confetti`

- Purpose: visual celebration on proposal acceptance
- Used in: `artifacts/offera/src/pages/public-proposal.tsx`

### Recharts

- Purpose: chart primitives in the reusable UI layer
- Used in: `artifacts/offera/src/components/ui/chart.tsx`
- Current product usage:
  - the chart primitive exists, but the main app pages do not currently render business charts

### Pino / `pino-http`

- Purpose: structured server logging
- Used in:
  - `artifacts/api-server/src/lib/logger.ts`
  - `artifacts/api-server/src/app.ts`
- Build support:
  - `artifacts/api-server/build.mjs` uses `esbuild-plugin-pino`

## Platform and Build Integrations

### Replit Artifacts

- Purpose: dev/prod deployment wiring
- Configured in:
  - `.replit`
  - `artifacts/api-server/.replit-artifact/artifact.toml`
  - `artifacts/offera/.replit-artifact/artifact.toml`
  - `artifacts/mockup-sandbox/.replit-artifact/artifact.toml`

Effects:

- web app served as static artifact
- API artifact built and run separately
- mockup sandbox exposed under `/__mockup`

### Replit Dev Plugins

- Purpose: dev-only preview helpers in Replit
- Used in Vite configs:
  - `@replit/vite-plugin-cartographer`
  - `@replit/vite-plugin-dev-banner`
  - `@replit/vite-plugin-runtime-error-modal`
- Activated only when:
  - `NODE_ENV !== "production"`
  - `REPL_ID` is defined

### Google Fonts

- Purpose: typography loading for product and sandbox UIs
- Used in:
  - `artifacts/offera/index.html`
  - `artifacts/offera/src/index.css`
  - `artifacts/mockup-sandbox/index.html`
- Font families actually used by the product:
  - Inter
  - Manrope
  - DM Sans
  - Playfair Display

## Internal Integration Boundaries

### Frontend to API

- `artifacts/offera/src/lib/api.ts` uses handwritten `fetch`
- `lib/api-client-react` also exists but is not the main frontend transport layer yet

### API to Shared Types

- Request/response validation is performed with `@workspace/api-zod`
- DB-backed routes additionally use `@workspace/db`

## Missing/Not Yet Integrated

- No outbound email provider for actually sending proposal links
- No auth provider or session management
- No file storage service for logos or uploaded assets
- No dedicated analytics, billing, or monitoring SaaS integration
- No external e-signature vendor; signatures are stored directly as PNG data URLs

## Notes

> ⚠️ Unclear: The project includes both a generated React Query client (`lib/api-client-react`) and a handwritten frontend client (`artifacts/offera/src/lib/api.ts`). The handwritten client is the one actually used by the product UI today.
