NOTIFY pgrst, 'reload schema';

ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS customer_name text;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS customer_rnc text;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS km_unit text default 'km';
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS qr_url text;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS security_code text;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS signature_date text;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS is_commission_paid boolean default false;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS items jsonb default '[]'::jsonb;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS notes text;

NOTIFY pgrst, 'reload schema';
