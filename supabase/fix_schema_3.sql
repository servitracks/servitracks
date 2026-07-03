-- 1. Refrescar la caché de la API (Para que reconozca tecnico_id, is_combo, is_commission_paid)
NOTIFY pgrst, 'reload schema';

-- 2. Eliminar llaves foráneas para poder cambiar el tipo de dato con seguridad
ALTER TABLE public.maintenance_items DROP CONSTRAINT IF EXISTS maintenance_items_vehicle_id_fkey;
ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_vehicle_id_fkey;
ALTER TABLE public.invoices DROP CONSTRAINT IF EXISTS invoices_vehicle_id_fkey;
ALTER TABLE public.invoices DROP CONSTRAINT IF EXISTS invoices_order_id_fkey;
ALTER TABLE public.movimientos_caja DROP CONSTRAINT IF EXISTS movimientos_caja_caja_id_fkey;

-- 3. Cambiar TODAS las columnas conflictivas de UUID a TEXT
-- Vehículos
ALTER TABLE public.vehicles ALTER COLUMN id TYPE text USING id::text;
ALTER TABLE public.maintenance_items ALTER COLUMN vehicle_id TYPE text USING vehicle_id::text;
ALTER TABLE public.orders ALTER COLUMN vehicle_id TYPE text USING vehicle_id::text;
ALTER TABLE public.invoices ALTER COLUMN vehicle_id TYPE text USING vehicle_id::text;

-- Órdenes y Facturas
ALTER TABLE public.orders ALTER COLUMN id TYPE text USING id::text;
ALTER TABLE public.invoices ALTER COLUMN order_id TYPE text USING order_id::text;
ALTER TABLE public.invoices ALTER COLUMN id TYPE text USING id::text;

-- Cajas
ALTER TABLE public.cajas ALTER COLUMN id TYPE text USING id::text;
ALTER TABLE public.movimientos_caja ALTER COLUMN caja_id TYPE text USING caja_id::text;

-- Servicios y Mantenimientos
ALTER TABLE public.services ALTER COLUMN id TYPE text USING id::text;
ALTER TABLE public.maintenance_items ALTER COLUMN id TYPE text USING id::text;

-- 4. Refrescar la caché una última vez para asegurar que Supabase tome los cambios de tipo
NOTIFY pgrst, 'reload schema';
