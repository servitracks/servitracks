NOTIFY pgrst, 'reload schema';

ALTER TABLE public.maintenance_items DROP CONSTRAINT IF EXISTS maintenance_items_vehicle_id_fkey;
ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_vehicle_id_fkey;
ALTER TABLE public.invoices DROP CONSTRAINT IF EXISTS invoices_vehicle_id_fkey;
ALTER TABLE public.invoices DROP CONSTRAINT IF EXISTS invoices_order_id_fkey;
ALTER TABLE public.movimientos_caja DROP CONSTRAINT IF EXISTS movimientos_caja_caja_id_fkey;

ALTER TABLE public.vehicles ALTER COLUMN id TYPE text USING id::text;
ALTER TABLE public.maintenance_items ALTER COLUMN vehicle_id TYPE text USING vehicle_id::text;
ALTER TABLE public.orders ALTER COLUMN vehicle_id TYPE text USING vehicle_id::text;
ALTER TABLE public.invoices ALTER COLUMN vehicle_id TYPE text USING vehicle_id::text;

ALTER TABLE public.orders ALTER COLUMN id TYPE text USING id::text;
ALTER TABLE public.invoices ALTER COLUMN order_id TYPE text USING order_id::text;
ALTER TABLE public.invoices ALTER COLUMN id TYPE text USING id::text;

ALTER TABLE public.cajas ALTER COLUMN id TYPE text USING id::text;
ALTER TABLE public.movimientos_caja ALTER COLUMN caja_id TYPE text USING caja_id::text;

ALTER TABLE public.services ALTER COLUMN id TYPE text USING id::text;
ALTER TABLE public.maintenance_items ALTER COLUMN id TYPE text USING id::text;

NOTIFY pgrst, 'reload schema';
