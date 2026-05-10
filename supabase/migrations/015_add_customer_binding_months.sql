ALTER TABLE public.customers
ADD COLUMN IF NOT EXISTS binding_months integer;

ALTER TABLE public.customers
DROP CONSTRAINT IF EXISTS customers_binding_months_positive_check;

ALTER TABLE public.customers
ADD CONSTRAINT customers_binding_months_positive_check
CHECK (binding_months IS NULL OR binding_months > 0);

ALTER TABLE public.customers
DROP CONSTRAINT IF EXISTS customers_binding_months_requires_value_check;

ALTER TABLE public.customers
ADD CONSTRAINT customers_binding_months_requires_value_check
CHECK (
  binding_months IS NULL
  OR (value IS NOT NULL AND value_period IS NOT NULL)
);
