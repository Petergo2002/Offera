# UI Refinement Plan - Clean Slate Layout

This plan covers the requested UI refinements to simplify the Quote Builder interface.

## User Review Required

> [!IMPORTANT]
> The top navigation links (Dashboard, Templates, Analytics, Settings) will be removed. The Sidebar will be the only way to navigate between pages.

> [!NOTE]
> Sidebar labels will be cleaned up to show only "Home" and "Templates" without the underlying icon names being visible as text.

## Proposed Changes

### Phase 1: Research & Location
- [x] Identify navigation components in `dashboard.tsx` and `templates.tsx`.
- [x] Locate the 'Stitch 2 Mode' banner in the sidebar.

### Phase 2: Implementation

#### 1. Header Refinement
- **File**: `src/pages/dashboard.tsx` & `src/pages/templates.tsx`
- **Action**: Remove the desktop navigation links from the top `<nav>` component.

#### 2. Sidebar Simplification
- **File**: `src/pages/dashboard.tsx` & `src/pages/templates.tsx`
- **Action**:
    - Update sidebar links to only show "Home" and "Templates".
    - Remove the "Stitch 2 Mode" banner/box from the bottom left of the sidebar.
    - Clean up the label text to avoid showing icon names (like "dashboard" or "description") as labels.

### Phase 3: Verification
- [ ] Verify Dashboard UI in browser.
- [ ] Verify Templates UI in browser.
- [ ] Ensure mobile navigation still works correctly.

## Expected Result
A cleaner, more focused UI where the sidebar handles all primary navigation and promotional/redundant elements are removed.
