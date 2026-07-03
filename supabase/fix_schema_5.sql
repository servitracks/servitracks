NOTIFY pgrst, 'reload schema';

ALTER TABLE IF EXISTS public.work_orders DROP CONSTRAINT IF EXISTS work_orders_vehicle_id_fkey;
ALTER TABLE IF EXISTS public.quotes DROP CONSTRAINT IF EXISTS quotes_vehicle_id_fkey;
ALTER TABLE IF EXISTS public.inspections DROP CONSTRAINT IF EXISTS inspections_vehicle_id_fkey;

ALTER TABLE IF EXISTS public.maintenance_items DROP CONSTRAINT IF EXISTS maintenance_items_vehicle_id_fkey;
ALTER TABLE IF EXISTS public.orders DROP CONSTRAINT IF EXISTS orders_vehicle_id_fkey;
ALTER TABLE IF EXISTS public.invoices DROP CONSTRAINT IF EXISTS invoices_vehicle_id_fkey;
ALTER TABLE IF EXISTS public.invoices DROP CONSTRAINT IF EXISTS invoices_order_id_fkey;
ALTER TABLE IF EXISTS public.movimientos_caja DROP CONSTRAINT IF EXISTS movimientos_caja_caja_id_fkey;

ALTER TABLE public.vehicles ALTER COLUMN id TYPE text USING id::text;

ALTER TABLE IF EXISTS public.work_orders ALTER COLUMN vehicle_id TYPE text USING vehicle_id::text;
ALTER TABLE IF EXISTS public.quotes ALTER COLUMN vehicle_id TYPE text USING vehicle_id::text;
ALTER TABLE IF EXISTS public.inspections ALTER COLUMN vehicle_id TYPE text USING vehicle_id::text;

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
