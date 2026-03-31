# Project Plan: Stitch 2 UI & Logic Integration

## 1. Overview
The goal is to seamlessly integrate all 8 high-end UI designs from the `stitch 2` directory into the main Next.js App Router application. The implementation will precisely follow the aesthetic rules outlined in "The Architectural Curator" (`offera_slate_indigo/DESIGN.md`), ensuring a cohesive, "SaaS-premium" vibe without standard 1px borders. Along with pixel-perfect structural UI, the critical frontend logic (state management, routing, component interactions, and proposal calculations) will be fully implemented. Specific backend integrations (e-signing API, sending emails, and pagination) will be handled separately by the user, but the UX flows surrounding them must be complete and emit the right callback events.

## 2. Project Type
**WEB** (Next.js App Router, React, Tailwind CSS)

## 3. Success Criteria
- All pages/flows from `stitch 2` are converted into modular, responsive React components.
- The visual design matches the Stitch 2 reference files 100% (incorporating specific `.offera_slate_indigo` design tokens, gradients, glassmorphism, void/spacing boundaries, and typography: Manrope & Inter).
- The logical flow works seamlessly (state management for the Proposal Builder updates correctly, forms validate, and UI state toggles function).
- E-signing and email buttons/forms emit the correct events or callbacks for the user to hook into later.
- The implementation passes all Phase X verifications (Linting, UX/Accessibility, and Build).

## 4. Tech Stack
- **Framework**: Next.js 14+ (App Router)
- **Styling**: Tailwind CSS (configured to match the `offera_slate_indigo` design tokens)
- **Logic & State**: React Hooks (`useState`, `useReducer`, `useMemo`) and potentially a global state library (like Zustand) for the complex Proposal Builder.
- **Icons**: Lucide React.
- **Micro-interactions**: Framer Motion or Tailwind transitions (200ms Ease-Out hover states).

## 5. File Structure (Target)
```text
/src/app
  /dashboard                  # Matches main_dashboard
  /proposals                  
    /new                      # Matches new_proposal_creation_flow
    /[id]/builder             # Matches proposal_builder
    /[id]/send                # Matches send_proposal_flow
  /public-proposal/[id]       # Matches public_proposal_page
    /sign                     # Matches acceptance_signature_flow
  /templates                  # Matches template_library

/src/components
  /ui                         # Reusable atoms (Buttons, Inputs, Ghost Borders)
  /proposal                   # Proposal specific interactive blocks
```

## 6. Task Breakdown

### Task 1: Core Design System & Tokens
- **Agent**: `frontend-specialist`
- **Skill**: `frontend-design`
- **Action**: Update `tailwind.config.ts`, `globals.css`, and `layout.tsx` to implement "The Architectural Curator" design system (`#4e45e4` primary, `surface` nested layers, typography fonts Manrope & Inter). Build reusable base `<Button>`, `<Input>`, and Layout components that strictly follow the "No-Line" rule (using tonal shifts and spacing voids).
- **Verify**: Component gallery confirms the tokens are working without standard 1px borders, and hover states use 200ms Ease-Out transitions.

### Task 2: Main Dashboard & Navigation
- **Agent**: `frontend-specialist`
- **Action**: Convert `stitch 2/main_dashboard/code.html` to a robust Next.js page. Implement the "Contextual HUD" signature component from the design spec (Glassmorphism blur: 24px and primary top-border: 2px).
- **Verify**: The dashboard renders perfectly, visually indistinguishable from `screen.png`.

### Task 3: Template Library
- **Agent**: `frontend-specialist`
- **Action**: Implement the `template_library` view. Implement responsive grid layouts and card components for templates.
- **Verify**: Template selection flows horizontally/vertically without overlapping or rendering errors.

### Task 4: New Proposal Creation Flow
- **Agent**: `frontend-specialist`
- **Action**: Build the step-by-step or modal flow from `new_proposal_creation_flow`. 
- **Verify**: User can initiate a new proposal and input high-level robust form details (client details, basic scoping).

### Task 5: Proposal Builder (Core Logic)
- **Agent**: `frontend-specialist`
- **Action**: Convert `stitch 2/proposal_builder` to React. *This requires heavy state management.* Build the interface for proposal blocks: real-time total calculations, sectioning, adding/removing items, and managing the "architectural staircase" hierarchy.
- **Verify**: Adding/editing line items correctly and instantly updates the total quote summary block.

### Task 6: Send Proposal Flow (Callbacks)
- **Agent**: `frontend-specialist`
- **Action**: Implement `send_proposal_flow`. Build the UI exactly as designed. Expose a pure frontend callback (e.g., `onSendProposal`) where the user can later integrate their email logic.
- **Verify**: Clicking "Send" triggers the callback and transitions the UI to a success state.

### Task 7: Public Proposal Page & Acceptance Signature Flow
- **Agent**: `frontend-specialist`
- **Action**: Implement the external-facing `public_proposal_page` and the `acceptance_signature_flow`. Hooks up the visual signature capture logic so the UI flow feels complete, exposing the final signature payload required for the user's external e-signing API.
- **Verify**: Complete flow from reading the proposal as a client, to clicking accept, drawing/typing signature, and seeing a visual success state.

## 7. Phase X: Verification

## ✅ PHASE X COMPLETE (Pending)
- [ ] Lint: Pass (`npm run lint` & `npx tsc --noEmit`)
- [ ] Security: No critical issues
- [ ] UX/UI Audit: Matches "The Architectural Curator" guidelines (No 1px solid borders, dynamic offsets, proper depth elevations)
- [ ] Logic Verification: Proposal builder correctly manages item addition and sum.
- [ ] Build: Success (`npm run build`)
- [ ] Check: Socratic Gate rules fully applied
- [ ] Date: [To be filled]
