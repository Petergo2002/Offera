-- CRM (Kunder) Schema
-- Adds customers and sectioned links

BEGIN;

-- ============================================
-- CUSTOMERS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT customers_name_not_blank CHECK (btrim(name) <> '')
);

-- Index for searching and listing
CREATE INDEX IF NOT EXISTS idx_customers_workspace_id ON customers(workspace_id);
CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email);
CREATE INDEX IF NOT EXISTS idx_customers_name ON customers(name);

-- Trigger for updated_at
CREATE TRIGGER set_customers_updated_at
BEFORE UPDATE ON customers
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

-- == RLS for customers ==
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

CREATE POLICY customers_all_own_workspace
  ON public.customers
  FOR ALL
  TO authenticated
  USING (auth.uid() IS NOT NULL AND workspace_id = public.current_workspace_id())
  WITH CHECK (auth.uid() IS NOT NULL AND workspace_id = public.current_workspace_id());

-- ============================================
-- CUSTOMER LINKS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS customer_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  section_name TEXT NOT NULL DEFAULT 'Länkar',
  label TEXT NOT NULL,
  url TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT customer_links_label_not_blank CHECK (btrim(label) <> ''),
  CONSTRAINT customer_links_url_not_blank CHECK (btrim(url) <> '')
);

-- Index for listing links per customer
CREATE INDEX IF NOT EXISTS idx_customer_links_customer_id ON customer_links(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_links_workspace_id ON customer_links(workspace_id);

-- == RLS for customer_links ==
ALTER TABLE customer_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY customer_links_all_own_workspace
  ON public.customer_links
  FOR ALL
  TO authenticated
  USING (auth.uid() IS NOT NULL AND workspace_id = public.current_workspace_id())
  WITH CHECK (auth.uid() IS NOT NULL AND workspace_id = public.current_workspace_id());

-- ============================================
-- UPDATE PROPOSALS WITH CUSTOMER REFERENCE
-- ============================================

ALTER TABLE proposals ADD COLUMN IF NOT EXISTS customer_id UUID REFERENCES customers(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_proposals_customer_id ON proposals(customer_id);

COMMIT;
