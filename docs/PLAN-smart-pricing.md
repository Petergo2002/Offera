# PROJECT PLAN: Smart Pricing & Packages

**Goal**: Transform the current "Pricing Table" into a comprehensive "Packages and Prices" system with service descriptions and premium UI.

## Phase 1: Research & Socratic Gate
- [ ] **Data Scope**: Finalize if `content` field is sufficient for package descriptions.
- [ ] **UI Style**: Confirm "Card-style" vs. "List-style" with user.
- [ ] **Multi-item**: Determine if a single package should support nested feature lists.

## Phase 2: Schema & Type Generation
- [ ] **Modify `openapi.yaml`**: Add optional `description` or `features` fields to `pricing` block.
- [ ] **API Sync**: Run `pnpm run generate:api` (if applicable) to update Zod schemas.
- [ ] **Document Logic**: Update `document.ts` to support new fields in `createBlock`.

## Phase 3: Builder UI/UX Overhaul
- [ ] **Rename Labels**: Bulk update UI text from "Prissättning" to "Paket och priser".
- [ ] **Smart Editor**: 
    - [ ] Add `Textarea` for package description.
    - [ ] Add "Feature List" component (optional based on feedback).
    - [ ] Polish the card layout for a premium feel.

## Phase 4: Public View Rendering
- [ ] **Public View UI**: Update `public-proposal.tsx` to render package content prominently.
- [ ] **Grouped Costs**: Ensure setup and recurring costs are visually distinct under the package header.

## Phase 5: Verification
- [ ] **Typecheck**: Run `npm run build`.
- [ ] **UX Audit**: Run `ux_audit.py` on the new builder layout.
- [ ] **Manual Test**: Create a package and verify it appears correctly in the generated PDF/Link.

---

### Assignments:
- **`database-architect`** → `openapi.yaml` updates
- **`frontend-specialist`** → Builder & Public View UI
- **`orchestrator`** → Verification and consistency checks
