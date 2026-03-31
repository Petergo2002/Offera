# Plan - New Proposal Creation Flow UI Alignment

This plan outlines the steps to implement a new Marketing Landing Page and redesign the Login Page using the assets provided from the Stitch project.

## User Review Required

> [!IMPORTANT]
> **Routing Change**: I propose changing the root route (`/`) behavior. Currently, it redirects unauthenticated users to `/auth`. I will change it so:
> -   **Unauthenticated users** see the new **Marketing Landing Page** at `/`.
> -   **Authenticated users** see the **Dashboard** at `/`.
> -   A dedicated `/auth` route will be used for the login/signup forms.

## Proposed Changes

### [Frontend - UI Redesign]

---

#### [NEW] [landing.tsx](file:///Users/petergorgees/Downloads/Quote-Builder-Pro/artifacts/offera/src/pages/landing.tsx)
-   Create a new page component based on the `Marketing Landing Page` from Stitch.
-   Include sections: Hero, Social Proof, Features, Testimonials, and Pricing.
-   Add "Sign In" and "Get Started" buttons linking to `/auth`.

#### [MODIFY] [auth.tsx](file:///Users/petergorgees/Downloads/Quote-Builder-Pro/artifacts/offera/src/pages/auth.tsx)
-   Overhaul the UI to match the premium design from the `Login Page` in Stitch.
-   Retain existing logic for:
    -   `signIn`, `signUp`, `resetPassword` via `useAuth`.
    -   Form validation and error handling.
    -   Mode switching (Login/Signup/Reset).

#### [MODIFY] [App.tsx](file:///Users/petergorgees/Downloads/Quote-Builder-Pro/artifacts/offera/src/App.tsx)
-   Import the new `LandingPage`.
-   Update `AuthAwareRouter` to handle the new routing logic:
    -   If not authenticated and at `/`, show `LandingPage`.
    -   If not authenticated and at `/auth`, show `AuthPage`.
    -   Otherwise, keep existing redirect logic for protected routes.

#### [MODIFY] [index.css](file:///Users/petergorgees/Downloads/Quote-Builder-Pro/artifacts/offera/src/index.css)
-   Add custom utility classes if needed (e.g., `glass-effect`, `auth-gradient`, `cta-gradient`).
-   Import Manrope and Inter fonts.

## Open Questions

1.  **Language**: The Stitch templates are in English, but the current project uses Swedish. Should I translate the landing page to Swedish or keep both in English?
2.  **Navigation**: Should the Landing Page have a different navigation bar than the main application? (Stitch landing page has its own nav).

## Verification Plan

### Automated Tests
-   `npm run typecheck` to ensure no TypeScript errors.
-   Visual check using the browser tool.

### Manual Verification
-   Verify that `/` shows the Landing Page when logged out.
-   Verify that clicking "Sign In" goes to the new Login Page.
-   Verify that logging in successfully redirects to the Dashboard.
