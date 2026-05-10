ALTER TABLE public.customers
ADD COLUMN IF NOT EXISTS tax_rate numeric(5,2);

ALTER TABLE public.customers
DROP CONSTRAINT IF EXISTS customers_tax_rate_range_check;

ALTER TABLE public.customers
ADD CONSTRAINT customers_tax_rate_range_check
CHECK (tax_rate IS NULL OR (tax_rate >= 0 AND tax_rate <= 100));
