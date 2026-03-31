# PLAN-template-preview.md

## Goal
Implement a high-fidelity template preview system to replace the direct "Start" action. This ensures users can inspect the full content and design of a template before creating a proposal.

## Phase 1: Research & Setup
- [ ] Review `public-proposal.tsx` for core rendering logic.
- [ ] Ensure `Template` data structure supports full block rendering.

## Phase 2: UI Components
- [ ] **template-card.tsx**: Rename "Starta" to "Förhandsgranska", update icon to `Eye`.
- [ ] **TemplatePreviewDialog.tsx**: Create new modal component for full-screen/large-format preview.
- [ ] **TemplateDocPreview.tsx**: Create high-fidelity blocks renderer for templates.

## Phase 3: Page Integration
- [ ] **templates.tsx**: Implement `previewTemplate` state and dialog trigger.
- [ ] Implement "Create Proposal" bridge from the preview dialog to the builder.

## Phase 4: Verification
- [ ] `npm run typecheck`
- [ ] Manual test of the preview-to-create flow.

## Agent Assignment
- **Frontend Specialist**: Responsible for all UI/UX and styling logic.
