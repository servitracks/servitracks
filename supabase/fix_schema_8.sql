ALTER TABLE public.invoices DROP CONSTRAINT IF EXISTS invoices_mechanic_id_fkey;
ALTER TABLE public.invoices ALTER COLUMN mechanic_id TYPE text USING mechanic_id::text;
NOTIFY pgrst, 'reload schema';
