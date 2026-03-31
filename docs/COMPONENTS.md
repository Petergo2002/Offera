# Components

## Huvudproviders

| Fil | Ansvar |
| --- | --- |
| `artifacts/offera/src/App.tsx` | QueryClient, auth, layout och routing |
| `artifacts/offera/src/components/auth-provider.tsx` | Supabase-session, `/api/me`, auth actions |
| `artifacts/offera/src/components/layout.tsx` | intern app-shell med sidebar, topbar och mobilnav |

## Huvudsidor

| Sida | Fil | Roll |
| --- | --- | --- |
| Dashboard | `artifacts/offera/src/pages/dashboard.tsx` | listning, filter, överblick, quick view och post-send summary |
| Offertbyggare | `artifacts/offera/src/pages/builder.tsx` | redigera offert, spara, skicka, tracking, PDF och kopiera låsta offerter |
| Mallbibliotek | `artifacts/offera/src/pages/templates.tsx` | built-ins, egna mallar, preview, skapa |
| Mallbyggare | `artifacts/offera/src/pages/template-builder.tsx` | redigera mall |
| Arkiv | `artifacts/offera/src/pages/archive.tsx` | historik, quick view, bevis, PDF och permanenta borttagningar |
| Inställningar | `artifacts/offera/src/pages/settings.tsx` | företagsprofil, logga och standardavsändare |
| Publik offert | `artifacts/offera/src/pages/public-proposal.tsx` | kundvy, gate, signering, accept/decline och publik PDF |
| Auth | `artifacts/offera/src/pages/auth.tsx` | login, signup, reset password |
| Landing | `artifacts/offera/src/pages/landing.tsx` | publik marknadslandning för utloggade |

## Viktigaste produktkomponenterna

### `DocumentBuilder`

Fil: `artifacts/offera/src/components/document-builder.tsx`

Ansvar:

- editor + preview i samma yta
- blockredigering
- pricing/logik
- cover-inställningar
- part-dialog och part-sektion
- mobil/tablet/desktop-preview
- read-only-läge för signerade offerter
- preview av kundens svarszon längst ner i offerten

### `ProposalQuickView`

Fil: `artifacts/offera/src/components/proposal-quick-view.tsx`

Ansvar:

- används från dashboard och arkiv
- visar offertöversikt i sidepanel
- växlar till `Bevis`-läge för audit trail, signatur och tokenhistorik
- stödjer kopiering, permanent radering och öppning av bevisrapport

### `TemplateCard`

Fil: `artifacts/offera/src/components/template-card.tsx`

Ansvar:

- mallkort i biblioteket
- actions för använd, edit, copy, delete, preview

### `TemplatePreviewDialog`

Fil: `artifacts/offera/src/components/template-preview-dialog.tsx`

Ansvar:

- läsbar mallpreview med mockdata
- cover, block och pricing-preview

### `StatusBadge`

Fil: `artifacts/offera/src/components/status-badge.tsx`

Ansvar:

- konsekvent statusvisning för `draft`, `sent`, `viewed`, `accepted`, `declined`

## Delad UI-bas

`artifacts/offera/src/components/ui/*` innehåller primitiva wrappers för dialoger, tabs, select, inputs, toasts, dropdowns och övriga byggblock. De är inte affärslogik i sig, men bär den visuella standarden för hela produkten.

## Viktiga hooks och helpers

| Fil | Syfte |
| --- | --- |
| `hooks/use-company-settings.ts` | frontend-state för företagsprofil mot API |
| `lib/api.ts` | handskriven frontend-klient |
| `lib/document.ts` | dokumentlogik, placeholders, pricing, totals |
| `lib/post-send-summary.ts` | engångssummary efter utskick |
| `lib/evidence-report.ts` | HTML-bevisrapport |
| `lib/supabase.ts` | browser-Supabase-klient |

## Component-princip

- affärslogik ska bo i pages/lib/api-server, inte i generiska UI-primitiver
- `document-builder.tsx` är medvetet tung eftersom den är produktens kärna
- nya docs ska beskriva stabila surfaces, inte tillfälliga experiment
