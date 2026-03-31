# PLAN-modal-redesign: Premium Quote Modal Redesign

This plan transforms the current "Skapa ny offert" modal into a premium, industry-standard experience.

## Phase 0: Socratic Gate (Confirm Before Start)

1.  **Sidebar vs. Chips**: I propose moving to a **Left Sidebar** for categories. This is more "App-like" and professional for larger libraries. Do you agree?
2.  **Preview Interactivity**: Should the right pane be interactive (e.g., hover over sections to see details) or just look like a static, beautiful render?
3.  **Start from Scratch**: Integration? Should it be its own "Path" or just the first item in the list?

## Phase 1: Research & Audit
- [ ] Audit `proposal-start-dialog.tsx` for layout constraints.
- [ ] Evaluate `TemplateCard` for "Hover Lift" and "Entrance Scale" animations.

## Phase 2: Implementation (The Redesign)
- [ ] **Modal Structure**: Refactor `DialogContent` to use a refined layout with a dedicated sidebar.
- [ ] **Sidebar**: Create a high-fidelity navigation menu with category icons.
- [ ] **Animations**: Add `framer-motion` for smooth modal entrance and filtering state changes.
- [ ] **Preview Pane**: Refine the "Paper Canvas" shadow and rendering.
- [ ] **Micro-interactions**: Use `backdrop-blur` and `ring-offset` for premium feel.

## Phase 3: Verification
- [ ] Verify filtering performance with 20+ templates.
- [ ] Check modal responsiveness on tablet/desktop.
- [ ] Ensure 0 lint errors in `proposal-start-dialog.tsx`.

[OK] Plan created: docs/PLAN-modal-redesign.md

Next steps:
- Review the plan
- Run `/create` to start implementation
- Or modify plan manually
