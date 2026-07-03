-- 1. Add missing columns
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS is_commission_paid boolean default false;
ALTER TABLE public.movimientos_caja ADD COLUMN IF NOT EXISTS tecnico_id text;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS is_combo boolean default false;

-- 2. Fix the not-null constraint on orders.parts
ALTER TABLE public.orders ALTER COLUMN parts DROP NOT NULL;
ALTER TABLE public.orders ALTER COLUMN parts SET DEFAULT '[]'::jsonb;

-- 3. Fix UUID issues for IDs. The app uses text IDs (e.g., 'v1783...', 'caja-178...'). 
-- We need to change the 'id' columns from uuid to text.
-- First, drop foreign keys that might reference these tables
ALTER TABLE public.maintenance_items DROP CONSTRAINT IF EXISTS maintenance_items_vehicle_id_fkey;
ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_vehicle_id_fkey;
ALTER TABLE public.invoices DROP CONSTRAINT IF EXISTS invoices_vehicle_id_fkey;
ALTER TABLE public.invoices DROP CONSTRAINT IF EXISTS invoices_order_id_fkey;
ALTER TABLE public.products DROP CONSTRAINT IF EXISTS products_service_ids_fkey; -- unlikely to be a single FK, but just in case
ALTER TABLE public.movimientos_caja DROP CONSTRAINT IF EXISTS movimientos_caja_caja_id_fkey;

-- Now alter the primary keys and foreign keys to text
ALTER TABLE public.vehicles ALTER COLUMN id TYPE text USING id::text;
ALTER TABLE public.maintenance_items ALTER COLUMN id TYPE text USING id::text;
ALTER TABLE public.maintenance_items ALTER COLUMN vehicle_id TYPE text USING vehicle_id::text;

ALTER TABLE public.services ALTER COLUMN id TYPE text USING id::text;

ALTER TABLE public.cajas ALTER COLUMN id TYPE text USING id::text;
ALTER TABLE public.movimientos_caja ALTER COLUMN caja_id TYPE text USING caja_id::text;

-- Update foreign key references in other tables just in case they were uuid
ALTER TABLE public.orders ALTER COLUMN vehicle_id TYPE text USING vehicle_id::text;
ALTER TABLE public.invoices ALTER COLUMN vehicle_id TYPE text USING vehicle_id::text;
ALTER TABLE public.invoices ALTER COLUMN order_id TYPE text USING order_id::text;
