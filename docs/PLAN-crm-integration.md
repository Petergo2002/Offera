# Plan: CRM Integration for Offera ("Relationship-First Hub")

Offera is evolving from a proposal builder into a centralized sales platform. This plan details how we'll integrate CRM capabilities that run automatically in the background.

## User Review Required

> [!IMPORTANT]
> **Automated Sync Logic**: New clients will be created automatically in the database when a proposal is sent to a new email address. This ensures the CRM is always up-to-date without manual entry.

> [!NOTE]
> **Data Privacy**: The CRM is scoped per user. Your customer data is strictly private and never shared across workspaces.

---

## Proposed Changes

### 1. Database Schema (Supabase/PostgreSQL)

We will introduce two core tables to manage relationships and tracking.

#### [NEW] `clients` Table
- `id`: SERIAL PRIMARY KEY
- `user_id`: UUID REFERENCES auth.users (owner)
- `email`: TEXT (Unique per user_id)
- `name`: TEXT (Main contact person)
- `company_name`: TEXT
- `phone`: TEXT
- `org_number`: TEXT
- `address`: TEXT, `zip_code`: TEXT, `city`: TEXT
- `metadata`: JSONB (Custom fields/tags)
- `created_at`: TIMESTAMP, `updated_at`: TIMESTAMP

#### [NEW] `proposal_activities` Table
- `id`: SERIAL PRIMARY KEY
- `proposal_id`: INT REFERENCES proposals(id) ON DELETE CASCADE
- `type`: TEXT (`viewed`, `opened`, `signed`, `status_change`)
- `metadata`: JSONB (IP address, user agent, geolocation hints)
- `created_at`: TIMESTAMP

#### [MODIFY] `proposals` Table
- Add `client_id`: INT REFERENCES clients(id) ON DELETE SET NULL
- Update RLS policies to allow complex CRM queries.

### 2. Backend Orchestration

#### Client Sync Trigger
A database trigger `handle_proposal_client_sync()` will:
- Monitor `proposals` for changes in the recipient email.
- Automatically `UPSERT` the contact data into the `clients` table.
- Link the proposal to the correct `client_id`.

#### Activity Tracking Engine
A server action to log when a customer interacts with the public proposal page (e.g., first view, multiple opens).

### 3. Frontend UI & UX

#### [NEW] CRM Dashboard (`/dashboard/clients`)
A dedicated view for managing relationships.
- **Client List**: Searchable grid showing customer name, company, number of proposals, and lifetime value ($).
- **Client Detail Card**:
    - **Overview**: Essential contact info.
    - **Timeline**: A vertical "Activity Stream" showing the journey from first proposal to signed contract.
    - **History**: Quick links to all documentation associated with this client.

#### [MODIFY] Document Builder Integration
- **Contact Autocomplete**: When typing a recipient's email, search existing clients to populate the "Parties" info instantly.
- **Client Badge**: Visual indicator showing if the recipient is a new or existing contact.

---

## Open Questions

> [!CAUTION]
> **Conflicting Data**: If you send a proposal to an existing email but with a *new* Company Name, should the CRM update the record? (Our recommendation: Default to update, but provide a "Lock Record" option).

---

## Verification Plan

### Automated Tests
- **db-sync**: Verify that saving a proposal creates a contact in `clients`.
- **rls-audit**: Ensure User A cannot see User B's clients or activity logs.
- **performance**: Test the CRM timeline with 100+ activity entries to ensure stay-on-page speed.

### Manual Verification
- Create a proposal -> Check "Kunder" fliken.
- Open proposal as guest -> Verify activity appears in the client timeline.
- Edit client in CRM -> Check if "Mottagare" in old proposals updates (or stays locked).
