# Plan: Offera Design Expansion (Vibe & Style)

Denna plan syftar till att öka designmöjligheterna i Offera-plattformen genom att introducera avancerade men lättanvända "vibe"-inställningar. Vi håller det "simple and good" genom att fokusera på globala effekter som ger maximal visuell påverkan med minimal ansträngning för användaren.

## User Review Required

> [!IMPORTANT]
> Vi kommer att utöka `DocumentDesignSettings` med nya fält. Detta kräver uppdateringar i både API-specifikationen (OpenAPI), databasen (Drizzle) och frontend-komponenterna.
> Vi fokuserar på **Globala inställningar** för att hålla gränssnittet enkelt.

## Proposed Changes

### 1. API & Data Models
Utöka design-schemat för att stödja nya "vibe"-tokens.

#### [MODIFY] [openapi.yaml](file:///Users/petergorgees/Dev/Quote-Builder-Pro/lib/api-spec/openapi.yaml)
- Lägg till `glassmorphismEnabled` (boolean) i `DocumentDesignSettings`.
- Lägg till `vibePreset` (enum: `architectural`, `editorial`, `glass`, `minimal`) i `DocumentDesignSettings`.
- Lägg till `gradientEnabled` (boolean) för primära knappar och headers.

#### [MODIFY] [schema.ts](file:///Users/petergorgees/Dev/Quote-Builder-Pro/supabase/migrations/...) (Söker upp exakt fil under körning)
- Uppdatera databasschemat för att inkludera de nya fälten i `templates` och `proposals` tabellerna.

### 2. Frontend: Proposal Builder
Implementera de nya kontrollerna i editorn.

#### [MODIFY] [DesignSettingsPanel](file:///Users/petergorgees/Dev/Quote-Builder-Pro/artifacts/offera/src/components/...) (Söker upp exakt fil under körning)
- Lägg till en ny sektion "Vibe & Effekter".
- Implementera switchar för Glassmorphism och Gradients.
- Lägg till en dropdown för "Design-presets".

### 3. Frontend: Public Proposal Page
Uppdatera den publika sidan för att rendera de nya effekterna.

#### [MODIFY] [PublicProposalView](file:///Users/petergorgees/Dev/Quote-Builder-Pro/artifacts/offera/src/views/...)
- Applicera `backdrop-blur` och transparens om `glassmorphismEnabled` är sant.
- Uppdatera knappar till att använda varumärkets signatur-gradients.
- Justera spacing och offsets baserat på valt `vibePreset`.

---

## Task Breakdown

### Phase 1: Foundation (API & Types)
- [ ] **Task 1: Update OpenAPI Spec**
  - **Agent**: `backend-specialist`
  - **Input**: `openapi.yaml`
  - **Output**: Updated `DocumentDesignSettings` schema
  - **Verify**: Run `npm run gen` to verify type generation.
- [ ] **Task 2: Database Migration**
  - **Agent**: `database-architect`
  - **Input**: Drizzle schema
  - **Output**: SQL migration file
  - **Verify**: Apply migration to local Supabase/Postgres.

### Phase 2: Implementation (UI & Settings)
- [ ] **Task 3: Editor UI Updates**
  - **Agent**: `frontend-specialist`
  - **Input**: Builder UI components
  - **Output**: New "Vibe" controls in the design panel
  - **Verify**: Visual check in the browser.
- [ ] **Task 4: Rendering Logic**
  - **Agent**: `frontend-specialist`
  - **Input**: Public proposal components
  - **Output**: Dynamic styling based on new design tokens
  - **Verify**: Open a public proposal and toggle "Glassmorphism".

### Phase 3: Polish & "WOW" Factor
- [ ] **Task 5: Signature Gradients & Animations**
  - **Agent**: `frontend-specialist`
  - **Input**: CSS/Tailwind configs
  - **Output**: Premium micro-animations (Ease-Out 200ms) and jewel-like gradients
  - **Verify**: Use `ux_audit.py` to check for visual consistency.

---

## Verification Plan

### Automated Tests
- `npm run lint` för att säkerställa kodkvalitet.
- `python .agent/skills/frontend-design/scripts/ux_audit.py .` för att verifiera att vi följer "The Architectural Curator"-principerna.

### Manual Verification
1. Öppna Proposal Builder.
2. Ändra "Vibe Preset" till `glass`.
3. Verifiera att korten får en suddig bakgrund (`backdrop-blur`).
4. Aktivera "Gradient Buttons" och se till att de ser "premium" ut.
5. Spara och kolla den publika länken som en kund.
