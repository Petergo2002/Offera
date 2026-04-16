-- Enhance customers table with detailed company information
ALTER TABLE public.customers 
ADD COLUMN IF NOT EXISTS org_number text,
ADD COLUMN IF NOT EXISTS contact_person text,
ADD COLUMN IF NOT EXISTS phone text,
ADD COLUMN IF NOT EXISTS address text,
ADD COLUMN IF NOT EXISTS postal_code text,
ADD COLUMN IF NOT EXISTS city text;

-- Create an index for org_number within a workspace for faster lookups
CREATE INDEX IF NOT EXISTS idx_customers_org_number ON public.customers (workspace_id, org_number);
