# [PLAN] Quote Builder Pro: UI/UX Redesign (Stitch 2)

This plan outlines the steps to align the current project's user interface with the "Stitch 2" design reference. We will implement the "Architectural Curator" aesthetic—focusing on layering, tonal shifts, and glassmorphism.

## User Review Required

- **Hybrid Layout**: Moving to a top fixed navbar plus a desktop sidebar as seen in the reference.
- **Tonal Shifts**: Replacing 1px solid borders with background luminosity offsets.

## Proposed Changes

### 1. Global Styles & Tokens
- **[MODIFY] indices.css**: Update HSL tokens for primary indigo, surface grays, and error reds.
- **[MODIFY] fonts**: Ensure Manrope (Display) and Inter (Body) are properly loaded and used.

### 2. Dashboard Page
- **[MODIFY] dashboard.tsx**: Implement Bento-style stats grid and new table view.
- **[ADD] Activity Panel**: Add "Recent Drafts" and "Action Required" sidebar sections.

### 3. Builder Page
- **[MODIFY] builder.tsx**: Redesign the editing canvas and floating side panels.
- **[ADD] Contextual HUD**: Implementation of the bottom-fixed action bar for mobile/desktop toggle.

### 4. Template Page
- **[MODIFY] templates.tsx**: New grid layout for template cards with tonal chips for categorization.

### 5. Public View
- **[MODIFY] public-proposal.tsx**: Modernize the external proposal view and signature acceptance flow.

## Verification Checklist

### Phase 1: Foundations
- [ ] index.css updated with Stitch 2 tokens
- [ ] Typography hierarchy validated

### Phase 2: Page Implementation
- [ ] Dashboard layout matches reference
- [ ] Builder canvas redesigned
- [ ] Public view updated

### Phase 3: Final Polishing
- [ ] 200ms transitions applied to components
- [ ] Mobile Contextual HUD operational
- [ ] All borders removed where tonal shifts exist

---

**Next steps:**
- Review the plan
- Run `/create` to start implementation
- Or modify plan manually
