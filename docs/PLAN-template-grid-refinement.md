# Implementation Plan: Template Grid & Card Refinement

The current template selection modal uses a 2-column layout with large, chunky cards. This plan aims to dramatically improve the "Vibe" by making the cards more elegant, compact, and dense, using a 3-column grid and refined typography.

## User Review Required

> [!IMPORTANT]
> **Switching to a 3-Column Grid**: To make everything fit better (as requested), I propose moving from `md:grid-cols-2` to `md:grid-cols-3`. This will increase information density by 50%.

> [!WARNING]
> **Compact UI Strategy**: In the "Picker" view (when choosing a template), I recommend hiding the description by default or shortening it to 1 line, as the user typically recognizes the template by title and cover image.

## Proposed Changes

Grouped by component behavior and visual hierarchy.

---

### [Component] [TemplateCard](file:///Users/petergorgees/Downloads/Quote-Builder-Pro/artifacts/offera/src/components/template-card.tsx)

Refine the `compact` variant to significantly reduce vertical footprint and visual weight.

#### [MODIFY] [template-card.tsx](file:///Users/petergorgees/Downloads/Quote-Builder-Pro/artifacts/offera/src/components/template-card.tsx)
- **Article Wrapper**: Reduce outer padding from `p-2` to `p-1.5`. Reduce corner radius from `[2.5rem]` to `[2rem]`.
- **Cover Section**: Change aspect ratio from `aspect-[16/10]` to `aspect-[4/3]` or `aspect-[16/9]` (taller vs wider) to fit more cards vertically. Reduce internal padding from `p-8` to `p-6`.
- **Typography**: 
    - Scale template name from `text-2xl` to `text-lg`.
    - Change description from `line-clamp-2` to `line-clamp-1` or `hidden` in compact mode.
- **Buttons**: Reduce height from `h-12` to `h-10`. Scale icons from `h-4` to `h-3.5`.
- **Selected State**: Use a more subtle ring (`ring-2` instead of `ring-4`).

---

### [Component] [ProposalStartDialog](file:///Users/petergorgees/Downloads/Quote-Builder-Pro/artifacts/offera/src/components/proposal-start-dialog.tsx)

Update the layout container to handle the increased density.

#### [MODIFY] [proposal-start-dialog.tsx](file:///Users/petergorgees/Downloads/Quote-Builder-Pro/artifacts/offera/src/components/proposal-start-dialog.tsx)
- **Grid Layout**: Change `md:grid-cols-2` to `md:grid-cols-3`.
- **Grid Gap**: Reduce gap from `gap-6` to `gap-4`.
- **Padding**: Ensure `px-10` on the main container is sufficient for 3 columns.

---

## Open Questions

> [!IMPORTANT]
> 1. **3 Columns vs 2 Columns**: Should I stick with `grid-cols-3` even if the titles are long, or would you prefer me to just make the 2-column cards much shorter?
> 2. **Description Visibility**: Would you like to keep the description of the template visible in the picker, or is the title + preview (on hover) enough?
> 3. **Button Style**: Should we simplify the buttons to just icons or smaller text to save more horizontal space?

## Verification Plan

### Automated Tests
- `npm run typecheck` to ensure no prop regressions.

### Manual Verification
- **Visual Audit**: Open the "Create New Quote" modal and verify:
    - 3 cards fit horizontally without horizontal scrolling.
    - Title and category tags do not overflow.
    - "Use Template" hover effect remains smooth.
    - Selection ring (`selected` state) looks balanced with the smaller card size.
