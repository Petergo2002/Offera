# Design System Specification: The Architectural Curator

## 1. Overview & Creative North Star
The Creative North Star for this design system is **"The Architectural Curator."** 

Standard SaaS products often feel like a collection of disconnected widgets. This system rejects that "templated" look in favor of a layout that feels built, not just assembled. We achieve this through a "High-End Editorial" lens: using intentional asymmetry, generous negative space (breathing room), and a hierarchy that guides the eye like a well-curated gallery. 

Instead of rigid grids, we use **Dynamic Offsets**. By slightly offsetting headers from their content blocks or using overlapping "glass" layers, we break the digital monotony. The result is a UI that feels credible, commercially mature, and hyper-precise—mimicking the deliberate craft of high-end physical architecture.

---

## 2. Colors & Surface Philosophy
The palette is rooted in a "Atmospheric Neutral" base, allowing the **Royal Indigo** (`primary: #4e45e4`) to act as a high-intent signal rather than a loud decoration.

### The "No-Line" Rule
Standard UI relies on 1px borders to separate content. In this system, **1px solid borders for sectioning are prohibited.** Boundaries must be defined through:
- **Tonal Shifts:** Placing a `surface_container_low` (`#f0f4f7`) element against a `surface` (`#f7f9fb`) background.
- **Negative Space:** Using the Spacing Scale (specifically `8` or `12` units) to create structural "voids" that act as invisible dividers.

### Surface Hierarchy & Nesting
Treat the UI as a series of physical layers. We use the surface-container tiers to create "nested" depth:
1.  **Base Layer:** `surface` (#f7f9fb) – The canvas.
2.  **Structural Sections:** `surface_container_low` (#f0f4f7) – Large background areas for sidebars or secondary content.
3.  **Interactive Elements:** `surface_container_lowest` (#ffffff) – Used for cards and input areas to make them "pop" against the slightly darker background.

### The Glass & Gradient Rule
To move beyond "flat" design, use **Glassmorphism** for floating elements (modals, popovers, navigation bars). 
- Use semi-transparent versions of `surface_container_lowest` with a `backdrop-blur` of 12px–20px.
- **Signature Textures:** For primary CTAs, apply a subtle linear gradient from `primary` (#4e45e4) to `primary_dim` (#4135d8) at a 145° angle. This adds a "jewel-like" depth that a flat hex code cannot achieve.

---

## 3. Typography: The Editorial Voice
We utilize a dual-typeface system to balance authority with utility.

*   **Display & Headlines (Manrope):** Chosen for its geometric confidence. Use `display-lg` and `headline-md` with a slight negative letter-spacing (-0.02em) to create a tight, high-fashion editorial feel.
*   **Body & Labels (Inter):** The workhorse. Inter provides maximum legibility for complex SaaS data. Ensure `body-md` uses a generous line-height (1.5) to maintain the "calm" vibe.
*   **Hierarchy as Brand:** Use `on_surface_variant` (#596064) for labels and secondary text to create a soft contrast against the deep charcoal `on_surface` (#2c3437). This prevents the UI from feeling "heavy" while maintaining readability.

---

## 4. Elevation & Depth: Tonal Layering
Traditional shadows are often a crutch for poor layout. In this system, depth is earned through layering.

*   **The Layering Principle:** Place a `surface_container_lowest` (#ffffff) card on a `surface_container` (#eaeff2) background. The 1.5% difference in luminosity creates a sophisticated, "soft" lift without a single pixel of shadow.
*   **Ambient Shadows:** If an element must float (e.g., a dropdown), use a shadow tinted with the `on_surface` color: `rgba(44, 52, 55, 0.04)` with a 40px blur and 12px Y-offset.
*   **The "Ghost Border" Fallback:** If accessibility requires a border, use `outline_variant` (#acb3b7) at **15% opacity**. Never use 100% opaque borders for interior elements.

---

## 5. Components

### Buttons
- **Primary:** Gradient from `primary` to `primary_dim`. Roundedness: `md` (0.375rem). No border.
- **Secondary:** Surface `surface_container_high` with `on_secondary_container` text.
- **Tertiary (Ghost):** No background. Text uses `primary`. High horizontal padding (`spacing-4`) to ensure a wide hit-target.

### Cards & Lists
- **The Divider Ban:** Do not use `hr` tags or 1px lines between list items. Use background shifts or `spacing-3` gaps.
- **Header Offsets:** Titles should be indented `spacing-2` further than the body text to create an architectural "staircase" effect.

### Input Fields
- **Resting:** `surface_container_lowest` background with a "Ghost Border."
- **Focus:** Border becomes 1px solid `primary` with a 4px "glow" (a shadow using `primary` at 10% opacity).

### Status Badges (Tonal Chips)
- **Success:** Background `surface_container_highest`, text `primary`.
- **Error:** Background `error_container` (#f97386) at 20% opacity, text `error`.

### Signature Component: The "Contextual HUD"
A floating, semi-transparent navigation element positioned at the bottom-center of the screen. Uses Glassmorphism (blur: 24px) and a `primary` top-border of 2px to signal the active workspace.

---

## 6. Do’s and Don’ts

### Do:
*   **Use Asymmetry:** Place a large headline on the left and a small supporting paragraph on the right with a `spacing-16` gap.
*   **Nesting Surfaces:** Place white cards on gray backgrounds; never white on white.
*   **Micro-interactions:** Use 200ms "Ease-Out" transitions for all hover states.

### Don't:
*   **Don't use pure black:** Always use `on_surface` (#2c3437) for text to keep the "calm" vibe.
*   **Don't use standard grids:** Break the grid occasionally. Let an image or a pull-quote bleed into the margin.
*   **Don't use heavy shadows:** If you can see the shadow clearly, it’s too dark. It should feel like an ambient glow, not a drop shadow.
*   **Don't crowd the UI:** If a screen feels "busy," increase the spacing between sections by one level on the scale (e.g., move from `12` to `16`).