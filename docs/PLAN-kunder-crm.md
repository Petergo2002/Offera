# Project Plan: Kunder CRM for Offera

Build a customer relationship management (CRM) section in Offera that tracks clients, their signed contracts, and important project links.

## Phase 1: Database Schema & Migrations

### [NEW] `supabase/migrations/0012_add_customers_table.sql`
- Create `customers` table:
  - `id` (UUID, PK)
  - `workspace_id` (UUID, FK to workspaces)
  - `name` (TEXT)
  - `email` (TEXT)
  - `created_at`, `updated_at` (TIMESTAMP)
- Create `customer_links` table:
  - `id` (UUID, PK)
  - `customer_id` (UUID, FK to customers)
  - `section_name` (TEXT) - e.g., "GitHub Repos"
  - `link_label` (TEXT) - e.g., "Frontend App"
  - `url` (TEXT)
  - `created_at` (TIMESTAMP)
- Add RLS policies for both tables (workspace isolation).
- Update `proposals` table:
  - Add `customer_id` (UUID, FK to customers, nullable).

## Phase 2: Backend API Updates

### [MODIFY] `artifacts/api-server/src/routes/proposals.ts`
- In the `respond` (sign) handler:
  - After a proposal status becomes `accepted`:
  - Check if a customer with the proposal's `client_email` exists in the `workspace_id`.
  - If not, create a new customer record using `client_name` and `client_email`.
  - Link the proposal to the customer by updating `customer_id`.

### [NEW] `artifacts/api-server/src/routes/customers.ts`
- Implement CRUD endpoints:
  - `GET /api/customers` (List)
  - `GET /api/customers/:id` (Detail with linked proposals and links)
  - `POST /api/customers` (Manual creation)
  - `PUT /api/customers/:id` (Update)
  - `DELETE /api/customers/:id` (Delete)
  - `POST /api/customers/:id/links` (Add link)
  - `DELETE /api/customers/links/:id` (Remove link)

## Phase 3: Frontend Implementation

### [MODIFY] `artifacts/offera/src/components/layout.tsx`
- Add "Kunder" to the sidebar navigation.
- Icon: `Users` (from lucide-react).

### [NEW] `artifacts/offera/src/pages/customers/`
- `index.tsx`: Dashboard with customer list and "Ny Kund" button.
- `[id].tsx`: Detailed view for a specific customer.
  - Section 1: Contact info.
  - Section 2: Proposaler (Signed/Draft).
  - Section 3: Länkar (Smart sections logic).

### [MODIFY] `artifacts/offera/src/lib/api.ts`
- Add API client methods for customer operations.

## Phase 4: Verification Checklist

### Automated Tests
- [ ] Verify that signing a proposal creates a customer record.
- [ ] Verify that manual customer creation works.
- [ ] Verify that RLS prevents accessing customers from other workspaces.

### UI Verification
- [ ] Navigate to "Kunder" and see the list.
- [ ] Add a sectioned link and verify it persists.
- [ ] Check if signed proposals appear under the correct customer.
