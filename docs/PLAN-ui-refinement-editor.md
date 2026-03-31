# PLAN: Unify Package and Summary Sections in Editor

The goal is to merge the separate "Package/Pricing" box and the "Summary/Totals" box into a single, cohesive card in the proposal editor. Currently, these two elements are separate siblings with their own borders, which feels disconnected.

## User Review Required

> [!IMPORTANT]
> **Layout Decision**: Moving the summary inside the main card will change the vertical flow. I propose placing the summary at the bottom-right of the main card, integrated into the same white background, or as a tinted footer section.
>
> **Design Vibe**: I will maintain the right-alignment for the summary to preserve visual hierarchy, but it will live inside the primary `rounded-[2.5rem]` container.

## Proposed Changes

### [Frontend] Editor Component

#### [MODIFY] [document-builder.tsx](file:///Users/petergorgees/Downloads/Quote-Builder-Pro/artifacts/offera/src/components/document-builder.tsx)

- Locate the `PricingBlock` return statement.
- Identify the close `</div>` of the main package card (around line 882).
- Move the summary `div` content (currently starting at line 884) inside the main card's trailing space.
- Adjust the `mt-12 ml-auto` styling on the summary container to ensure it fits naturally within the parent padding.
- Add a separator (like a dashed border) if needed to clearly demarcate the transition from rows to totals.

## Open Questions

1. **Inner Background**: Should the summary section keep its slightly different background color (`bg-surface-container-low/50`) or should it just be plain white to match the main card?
2. **Spacing**: Currently there is an `mt-12` gap between them. When they are connected, do you want a visual line (separator) between the rows and the totals, or just space?

## Verification Plan

### Automated Tests
- Run `npm run lint` to ensure no JSX/TS errors.
- Run `python .agent/skills/frontend-design/scripts/ux_audit.py .` to verify layout consistency.

### Manual Verification
- Visual inspection of the editor in the browser.
- Verify that adding/removing rows still recalculates correctly and doesn't break the layout.
- Ensure the "Calculated Total Value" is still prominent.
