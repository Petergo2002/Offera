# Project Plan: Proposal Editor Revamp (Kling-style)

## Goal
Revamp the proposal creation experience (`builder.tsx`) to industry standards. The goal is a premium, "drag and drop" interface with contextual sidebars (Inspector) and a beautiful, customizable Cover Page out of the box.

## Architecture & Design Decisions

Based on user feedback to prioritize absolute best practices, drag-and-drop, and premium aesthetics:

1.  **Contextual Sidebar (The Inspector)**
    *   Instead of static tabs ("Innehåll" / "Design"), the sidebar will react to the user's selection.
    *   **Default State:** Shows the list of sections/blocks for drag-and-drop reordering (Table of Contents) and global theme settings.
    *   **Selected State:** When a user clicks a block (e.g., the Cover, a Text block, a Pricing table), the sidebar morphs to show the specific settings for *that* block (e.g., upload cover image, change text alignment, toggle VAT).

2.  **Premium Cover Page (Hero Section)**
    *   The first block of any proposal will be a dedicated `CoverBlock`.
    *   It will feature layout options (e.g., Full Background Image, Split Layout).
    *   Settings in the contextual sidebar: Cover Image URL, Overlay Opacity, Alignment.

3.  **Drag & Drop Polish**
    *   Enhance the visual feedback of `@hello-pangea/dnd`.
    *   Make adding new blocks a fluid, inline experience rather than a hidden button.

## Task Breakdown

### Phase 1: State Management & Sidebar Refactoring
- [ ] Add tracking for `selectedBlockId` in the local state.
- [ ] Refactor the Sidebar component to conditionally render:
    - `GlobalSettings` (if nothing is selected).
    - `BlockInspector` (if a block is selected).
- [ ] Add a way to deselect a block (clicking outside).

### Phase 2: The Cover Page Implementation
- [ ] Extend `ContentBlockType` to include a `"cover"` type (or treat the first section specially).
- [ ] Build the `CoverBlock` UI component with support for background images, logo placement, and typography.
- [ ] Build the `CoverInspector` UI in the sidebar to handle image uploads/URLs and layout toggles.

### Phase 3: Block Interaction & Polish
- [ ] Add "Click to select" functionality to all existing blocks (`heading`, `text`, `pricing`, etc.).
- [ ] Move block-specific settings (like heading level `H1/H2/H3`, pricing VAT toggle) out of the floating inline menus and into the new contextual Sidebar.
- [ ] Improve the visual styling of the editor canvas to look like a real document (shadows, a4 proportions).

## Agents Assigned
- `frontend-specialist`: For UI/UX implementation, React state management, and TailwindCSS styling.
- `project-planner`: Managing this document.

## Next Steps
- Review this plan.
- Use `/create` or give approval to begin Phase 1.
