ALTER TABLE public.customers
ADD COLUMN IF NOT EXISTS value numeric(12,2),
ADD COLUMN IF NOT EXISTS value_period text;

ALTER TABLE public.customers
DROP CONSTRAINT IF EXISTS customers_value_nonnegative_check;

ALTER TABLE public.customers
ADD CONSTRAINT customers_value_nonnegative_check
CHECK (value IS NULL OR value >= 0);

ALTER TABLE public.customers
DROP CONSTRAINT IF EXISTS customers_value_period_check;

ALTER TABLE public.customers
ADD CONSTRAINT customers_value_period_check
CHECK (value_period IS NULL OR value_period IN ('month', 'year'));

ALTER TABLE public.customers
DROP CONSTRAINT IF EXISTS customers_value_pair_check;

ALTER TABLE public.customers
ADD CONSTRAINT customers_value_pair_check
CHECK (
  (value IS NULL AND value_period IS NULL)
  OR (value IS NOT NULL AND value_period IS NOT NULL)
);
