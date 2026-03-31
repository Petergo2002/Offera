# Plan - Fix Auth Routing Redirect

This plan addresses the issue where unauthenticated users are automatically redirected to `/auth` when visiting the root route `/`.

## User Review Required

> [!IMPORTANT]
> **Routing Logic Change**: The `useEffect` in `App.tsx` currently forces a redirect for anyone not at `/auth` or a `/p/` route. I will modify this to allow `/` to load the landing page without redirection.

## Proposed Changes

### [Frontend - App Layout & Routing]

#### [MODIFY] [App.tsx](file:///Users/petergorgees/Downloads/Quote-Builder-Pro/artifacts/offera/src/App.tsx)
-   Update the redirect condition in `AuthAwareRouter`.
-   Prevent `setLocation("/auth")` from firing when the user is at the root `/`.

## Verification Plan

### Manual Verification
-   Visit `http://localhost:5173/` in Incognito.
-   Ensure no redirect to `/auth` occurrs.
-   The new Landing Page should be visible.
