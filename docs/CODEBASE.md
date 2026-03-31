# Codebase

## Overview

This repository is a `pnpm` workspace monorepo. It is organized around three deployable or runnable artifacts, four shared libraries, workspace scripts, and a set of reference/planning assets that document product direction.

The codebase mixes four categories of content:

- authored application code under `artifacts/`, `lib/`, and `scripts/`
- generated contract code under `lib/api-client-react/src/generated` and `lib/api-zod/src/generated`
- deployment/build outputs such as `dist/` and `.replit-artifact/`
- local support material such as plans, attached references, and agent configuration

## Top-level Directory Structure

| Path               | Purpose                                                                                                      |
| ------------------ | ------------------------------------------------------------------------------------------------------------ |
| `/artifacts`       | Deployable apps and runnable artifacts: the web app, API server, and mockup sandbox.                         |
| `/lib`             | Shared workspace libraries for API contracts, generated clients, generated Zod schemas, and database access. |
| `/scripts`         | Workspace-level developer scripts for starting services and post-merge setup.                                |
| `/docs`            | Project documentation and implementation plans.                                                              |
| `/stitch 2`        | Static design reference packages used to guide the current UI direction.                                     |
| `/attached_assets` | Imported prompt/reference material captured during previous work.                                            |
| `/.agent`          | Agent-specific architecture notes, scripts, and skill metadata used by the local AI workflow.                |
| `/.agents`         | Additional agent workspace metadata. Present, but not used by the application runtime.                       |
| `/.local`          | Local runtime state, including the JSON fallback datastore used when no PostgreSQL connection is configured. |
| `/node_modules`    | Workspace dependency installation output.                                                                    |
| `/.pnpm-store`     | Local pnpm package cache.                                                                                    |
| `/.git`            | Git metadata.                                                                                                |

## Root Files

| File                       | Purpose                                                               |
| -------------------------- | --------------------------------------------------------------------- |
| `/package.json`            | Workspace root scripts and shared dev dependencies.                   |
| `/pnpm-workspace.yaml`     | Declares the monorepo package boundaries.                             |
| `/pnpm-lock.yaml`          | Locked dependency graph for the workspace.                            |
| `/tsconfig.base.json`      | Shared TypeScript compiler defaults inherited by packages.            |
| `/tsconfig.json`           | Workspace TypeScript project references.                              |
| `/.npmrc`                  | pnpm/npm workspace configuration.                                     |
| `/.gitignore`              | Git ignore rules for build output, local files, and dependencies.     |
| `/.replit`                 | Replit workspace/deployment configuration at the repo level.          |
| `/.replitignore`           | Replit ignore rules.                                                  |
| `/replit.md`               | Human-readable Replit/project notes.                                  |
| `/PLAN-stitch-ui-logic.md` | Root-level implementation planning note for Stitch-inspired UI logic. |
| `/PLAN-ui-refinement.md`   | Root-level UI refinement plan.                                        |
| `/README.md`               | Primary onboarding document for the project.                          |

## Runtime Artifacts

### `/artifacts/api-server`

Express API server that implements the proposal and template backend.

| Path                                                   | Purpose                                                                         |
| ------------------------------------------------------ | ------------------------------------------------------------------------------- |
| `/artifacts/api-server/package.json`                   | API package manifest and scripts.                                               |
| `/artifacts/api-server/tsconfig.json`                  | TypeScript config for the API package.                                          |
| `/artifacts/api-server/build.mjs`                      | esbuild-based production bundling script.                                       |
| `/artifacts/api-server/.replit-artifact/artifact.toml` | Replit artifact build/run definition for API deployment.                        |
| `/artifacts/api-server/src/index.ts`                   | Process entrypoint; starts the Express app on the configured port.              |
| `/artifacts/api-server/src/app.ts`                     | Express app composition: middleware, logging, JSON parsing, and route mounting. |
| `/artifacts/api-server/src/routes/index.ts`            | Aggregates and mounts the route modules under `/api`.                           |
| `/artifacts/api-server/src/routes/health.ts`           | Health check endpoint implementation.                                           |
| `/artifacts/api-server/src/routes/proposals.ts`        | CRUD, send, public fetch, and public respond flows for proposals.               |
| `/artifacts/api-server/src/routes/templates.ts`        | CRUD and copy flows for templates.                                              |
| `/artifacts/api-server/src/lib/logger.ts`              | Central Pino logger setup used by the server.                                   |
| `/artifacts/api-server/src/lib/local-store.ts`         | File-backed development datastore used when `DATABASE_URL` is absent.           |
| `/artifacts/api-server/dist`                           | Built server output. Present in the repo/worktree as generated output.          |

### `/artifacts/offera`

Primary React/Vite single-page application for internal users and public proposal recipients.

| Path                                               | Purpose                                                                |
| -------------------------------------------------- | ---------------------------------------------------------------------- |
| `/artifacts/offera/package.json`                   | Web app package manifest and scripts.                                  |
| `/artifacts/offera/tsconfig.json`                  | TypeScript config for the web app.                                     |
| `/artifacts/offera/vite.config.ts`                 | Vite config for local dev/build.                                       |
| `/artifacts/offera/index.html`                     | SPA HTML entry template.                                               |
| `/artifacts/offera/components.json`                | shadcn-style component generator config.                               |
| `/artifacts/offera/requirements.yaml`              | Artifact/runtime requirements metadata.                                |
| `/artifacts/offera/.replit-artifact/artifact.toml` | Replit artifact build/run definition for the web app.                  |
| `/artifacts/offera/public/favicon.svg`             | Browser favicon asset.                                                 |
| `/artifacts/offera/public/opengraph.jpg`           | Social preview image.                                                  |
| `/artifacts/offera/src/main.tsx`                   | React bootstrap, global providers, and root mount.                     |
| `/artifacts/offera/src/App.tsx`                    | Application router and top-level provider tree.                        |
| `/artifacts/offera/src/index.css`                  | Global Tailwind/CSS theme tokens and base styles.                      |
| `/artifacts/offera/src/pages`                      | Route-level page components.                                           |
| `/artifacts/offera/src/components`                 | Product-specific composite components.                                 |
| `/artifacts/offera/src/components/ui`              | Reusable UI primitive wrappers and layout utilities.                   |
| `/artifacts/offera/src/hooks`                      | Custom React hooks shared across the frontend.                         |
| `/artifacts/offera/src/lib`                        | Frontend domain helpers and API wrapper code.                          |
| `/artifacts/offera/src/types`                      | Local type declarations such as third-party module shims.              |
| `/artifacts/offera/dist`                           | Built static output. Present in the repo/worktree as generated output. |

#### `/artifacts/offera/src/pages`

| Path                                               | Purpose                                                               |
| -------------------------------------------------- | --------------------------------------------------------------------- |
| `/artifacts/offera/src/pages/dashboard.tsx`        | Proposal listing, filtering, creation entrypoint, and delete actions. |
| `/artifacts/offera/src/pages/builder.tsx`          | Full proposal editor with save, send, and save-as-template flows.     |
| `/artifacts/offera/src/pages/templates.tsx`        | Template library page with category/search/filter actions.            |
| `/artifacts/offera/src/pages/template-builder.tsx` | Template editor reusing the shared document builder.                  |
| `/artifacts/offera/src/pages/public-proposal.tsx`  | Client-facing proposal acceptance and signature experience.           |
| `/artifacts/offera/src/pages/archive.tsx`          | Archive/history view for non-draft proposals.                         |
| `/artifacts/offera/src/pages/settings.tsx`         | Company settings/profile page backed by local storage.                |
| `/artifacts/offera/src/pages/not-found.tsx`        | 404 route fallback.                                                   |

#### `/artifacts/offera/src/components`

| Path                                                    | Purpose                                                               |
| ------------------------------------------------------- | --------------------------------------------------------------------- |
| `/artifacts/offera/src/components/document-builder.tsx` | Core document editor and preview surface for proposals and templates. |
| `/artifacts/offera/src/components/layout.tsx`           | Shared app shell for authenticated/operator pages.                    |
| `/artifacts/offera/src/components/status-badge.tsx`     | Proposal status label renderer.                                       |
| `/artifacts/offera/src/components/template-card.tsx`    | Template summary card used across library and picker flows.           |

#### `/artifacts/offera/src/components/ui`

Reusable UI system modules. These are mostly thin wrappers around Radix primitives or shared presentational helpers. They are intentionally generic and are duplicated in the mockup sandbox so previews can run without importing from the main app package.

Representative groups:

- overlays: `dialog.tsx`, `sheet.tsx`, `drawer.tsx`, `popover.tsx`, `hover-card.tsx`, `tooltip.tsx`, `alert-dialog.tsx`
- navigation/layout: `sidebar.tsx`, `navigation-menu.tsx`, `breadcrumb.tsx`, `pagination.tsx`, `scroll-area.tsx`, `resizable.tsx`
- form inputs: `input.tsx`, `textarea.tsx`, `select.tsx`, `checkbox.tsx`, `switch.tsx`, `radio-group.tsx`, `slider.tsx`, `input-group.tsx`, `form.tsx`
- feedback/data display: `toast.tsx`, `toaster.tsx`, `badge.tsx`, `progress.tsx`, `skeleton.tsx`, `spinner.tsx`, `table.tsx`, `chart.tsx`, `empty.tsx`

### `/artifacts/mockup-sandbox`

Secondary Vite app used for isolated previewing of mockup or generated components.

| Path                                                            | Purpose                                                       |
| --------------------------------------------------------------- | ------------------------------------------------------------- |
| `/artifacts/mockup-sandbox/package.json`                        | Sandbox package manifest.                                     |
| `/artifacts/mockup-sandbox/tsconfig.json`                       | TypeScript config for the sandbox.                            |
| `/artifacts/mockup-sandbox/vite.config.ts`                      | Vite config for sandbox development.                          |
| `/artifacts/mockup-sandbox/index.html`                          | HTML entry template.                                          |
| `/artifacts/mockup-sandbox/components.json`                     | shadcn-style component config for sandbox primitives.         |
| `/artifacts/mockup-sandbox/.replit-artifact/artifact.toml`      | Replit artifact definition for preview builds.                |
| `/artifacts/mockup-sandbox/mockupPreviewPlugin.ts`              | Vite plugin that discovers and registers preview components.  |
| `/artifacts/mockup-sandbox/src/main.tsx`                        | Sandbox bootstrap.                                            |
| `/artifacts/mockup-sandbox/src/App.tsx`                         | Preview gallery/router application.                           |
| `/artifacts/mockup-sandbox/src/index.css`                       | Sandbox styling entrypoint.                                   |
| `/artifacts/mockup-sandbox/src/components/ui`                   | Local copy of the UI primitive library for isolated previews. |
| `/artifacts/mockup-sandbox/src/hooks`                           | Sandbox-local copies of shared hooks.                         |
| `/artifacts/mockup-sandbox/src/lib/utils.ts`                    | Sandbox utility helpers.                                      |
| `/artifacts/mockup-sandbox/src/.generated/mockup-components.ts` | Generated registry of previewable components.                 |

## Shared Libraries

### `/lib/api-spec`

Source-of-truth API contract package.

| Path                            | Purpose                                                        |
| ------------------------------- | -------------------------------------------------------------- |
| `/lib/api-spec/package.json`    | Package manifest including codegen command.                    |
| `/lib/api-spec/openapi.yaml`    | OpenAPI 3.1 contract describing routes and schemas.            |
| `/lib/api-spec/orval.config.ts` | Orval config that generates the React client and Zod packages. |

### `/lib/api-client-react`

Generated frontend API client package.

| Path                                                 | Purpose                                            |
| ---------------------------------------------------- | -------------------------------------------------- |
| `/lib/api-client-react/package.json`                 | Package manifest for the generated client package. |
| `/lib/api-client-react/tsconfig.json`                | TypeScript config.                                 |
| `/lib/api-client-react/src/index.ts`                 | Public export surface for the generated client.    |
| `/lib/api-client-react/src/custom-fetch.ts`          | Shared fetch adapter used by generated hooks.      |
| `/lib/api-client-react/src/generated/api.ts`         | Generated endpoint clients and React Query hooks.  |
| `/lib/api-client-react/src/generated/api.schemas.ts` | Generated shared schema/type helpers.              |
| `/lib/api-client-react/dist`                         | Built package output.                              |

### `/lib/api-zod`

Generated Zod validators and TypeScript types from the OpenAPI contract.

| Path                                 | Purpose                                                                                          |
| ------------------------------------ | ------------------------------------------------------------------------------------------------ |
| `/lib/api-zod/package.json`          | Package manifest for schema/types package.                                                       |
| `/lib/api-zod/tsconfig.json`         | TypeScript config.                                                                               |
| `/lib/api-zod/src/index.ts`          | Public export surface.                                                                           |
| `/lib/api-zod/src/generated/api.ts`  | Generated top-level Zod schema exports.                                                          |
| `/lib/api-zod/src/generated/types/*` | Generated per-schema Zod/type modules such as `proposal`, `template`, and request payload types. |
| `/lib/api-zod/dist`                  | Built package output.                                                                            |

### `/lib/db`

Shared PostgreSQL access layer and Drizzle schema package.

| Path                              | Purpose                                             |
| --------------------------------- | --------------------------------------------------- |
| `/lib/db/package.json`            | Package manifest including DB push/build scripts.   |
| `/lib/db/tsconfig.json`           | TypeScript config.                                  |
| `/lib/db/drizzle.config.ts`       | Drizzle Kit configuration.                          |
| `/lib/db/src/index.ts`            | Database connection pool and Drizzle client export. |
| `/lib/db/src/schema/index.ts`     | Schema barrel export.                               |
| `/lib/db/src/schema/proposals.ts` | Drizzle schema for the `proposals` table.           |
| `/lib/db/src/schema/templates.ts` | Drizzle schema for the `templates` table.           |
| `/lib/db/dist`                    | Built package output.                               |

## Workspace Scripts

| Path                          | Purpose                                                                      |
| ----------------------------- | ---------------------------------------------------------------------------- |
| `/scripts/package.json`       | Workspace package metadata for the script directory.                         |
| `/scripts/dev.mjs`            | Starts the workspace dev processes together.                                 |
| `/scripts/run-api-dev.mjs`    | Starts the API dev server, respecting environment overrides.                 |
| `/scripts/run-offera-dev.mjs` | Starts the web app dev server, respecting environment overrides.             |
| `/scripts/post-merge.sh`      | Post-merge setup helper that reinstalls dependencies and attempts a DB push. |

## Documentation and Planning

### `/docs`

Project documentation plus implementation plans written during active development.

| Path                    | Purpose                                              |
| ----------------------- | ---------------------------------------------------- |
| `/docs/ARCHITECTURE.md` | High-level architecture and flow documentation.      |
| `/docs/CODEBASE.md`     | Directory and file guide for the repository.         |
| `/docs/API.md`          | API route reference and behavior notes.              |
| `/docs/COMPONENTS.md`   | Frontend component/module inventory.                 |
| `/docs/DATA_MODELS.md`  | Data structure and persistence model reference.      |
| `/docs/INTEGRATIONS.md` | Third-party and cross-package integration guide.     |
| `/docs/ENVIRONMENT.md`  | Environment variable reference.                      |
| `/docs/PLAN-*.md`       | Implementation plans for UI and editing workstreams. |

### `/stitch 2`

Static design references grouped by flow:

- `acceptance_signature_flow`
- `main_dashboard`
- `new_proposal_creation_flow`
- `offera_slate_indigo`
- `proposal_builder`
- `public_proposal_page`
- `send_proposal_flow`
- `template_library`

Each folder contains HTML/CSS mockups or assets used as reference rather than runtime code.

### `/attached_assets`

Stores imported source text used as historical context during product iteration. The current repo contains one long-form pasted brief.

## Local and Agent-specific Support Folders

| Path                           | Purpose                                                                            |
| ------------------------------ | ---------------------------------------------------------------------------------- |
| `/.local/offera-dev-data.json` | Local JSON datastore for proposals/templates in fallback mode.                     |
| `/.agent/*`                    | Local agent configuration, architecture notes, prompts, and reusable skill assets. |
| `/.agents/*`                   | Additional agent/plugin metadata.                                                  |

These folders support the development environment but are not part of the deployed application runtime.

## Generated and Duplicated Content

- `dist/` folders under `artifacts/*` and `lib/*` are generated build outputs.
- `lib/api-client-react/src/generated` and `lib/api-zod/src/generated` are generated from the OpenAPI spec.
- `artifacts/mockup-sandbox/src/components/ui` is effectively a local duplicate of the frontend UI primitives so the sandbox can run independently.

## Naming Conventions

- package names use the workspace scope prefix `@workspace/...`
- React components and pages use lowercase kebab-case filenames with PascalCase exports, for example `template-card.tsx` exporting `TemplateCard`
- hooks use the `use-*` filename pattern, for example `use-company-settings.ts`
- route modules in the API are plural resource names, for example `proposals.ts` and `templates.ts`
- shared schema/type files generated by Orval use lower camel or lower-case names derived from schema identifiers, for example `proposalBranding.ts` and `respondToProposalRequest.ts`
- documentation planning files use the `PLAN-*.md` prefix

## Authored vs Generated Boundaries

Authored files are the ones you are expected to edit directly:

- `artifacts/api-server/src/**/*`
- `artifacts/offera/src/**/*`
- `artifacts/mockup-sandbox/src/**/*` and `mockupPreviewPlugin.ts`
- `lib/api-spec/openapi.yaml`
- `lib/db/src/**/*`
- `scripts/**/*`

Generated or derived files should generally be regenerated rather than hand-edited:

- `lib/api-client-react/src/generated/**/*`
- `lib/api-zod/src/generated/**/*`
- `artifacts/mockup-sandbox/src/.generated/mockup-components.ts`
- `dist/**/*`

## Notes

> ⚠️ Unclear: The repository includes committed/generated `dist/` directories for multiple packages. That may be intentional for artifact-based deployment, but the codebase does not document whether those outputs are expected to be source-controlled.
