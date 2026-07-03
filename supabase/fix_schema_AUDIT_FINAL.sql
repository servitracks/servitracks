-- SCRIPT DE AUDITORÍA TOTAL: ALINEACIÓN PERFECTA ENTRE FRONTEND Y SUPABASE
NOTIFY pgrst, 'reload schema';

-- 1. CUSTOMERS
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS tags jsonb DEFAULT '[]'::jsonb;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS birthday text;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS notes text;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS email text;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS address text;

-- 2. VEHICLES
ALTER TABLE public.vehicles ADD COLUMN IF NOT EXISTS vin text;
ALTER TABLE public.vehicles ADD COLUMN IF NOT EXISTS color text;
ALTER TABLE public.vehicles ADD COLUMN IF NOT EXISTS km numeric;
ALTER TABLE public.vehicles ADD COLUMN IF NOT EXISTS fuel text;
ALTER TABLE public.vehicles ADD COLUMN IF NOT EXISTS transmission text;
ALTER TABLE public.vehicles ADD COLUMN IF NOT EXISTS last_service text;
ALTER TABLE public.vehicles ADD COLUMN IF NOT EXISTS next_service text;

-- 3. MAINTENANCE ITEMS
ALTER TABLE public.maintenance_items ADD COLUMN IF NOT EXISTS lifespan_km numeric;
ALTER TABLE public.maintenance_items ADD COLUMN IF NOT EXISTS lifespan_days numeric;
ALTER TABLE public.maintenance_items ADD COLUMN IF NOT EXISTS current_percentage numeric;
ALTER TABLE public.maintenance_items ADD COLUMN IF NOT EXISTS category text;

-- 4. SERVICES
ALTER TABLE public.services ADD COLUMN IF NOT EXISTS description text;
ALTER TABLE public.services ADD COLUMN IF NOT EXISTS labor_price numeric;
ALTER TABLE public.services ADD COLUMN IF NOT EXISTS duration text;
ALTER TABLE public.services ADD COLUMN IF NOT EXISTS category text;
ALTER TABLE public.services ADD COLUMN IF NOT EXISTS maintenance_category text;
ALTER TABLE public.services ADD COLUMN IF NOT EXISTS lifespan_km numeric;
ALTER TABLE public.services ADD COLUMN IF NOT EXISTS lifespan_days numeric;

-- 5. PRODUCTS
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS barcode text;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS brand text;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS type text;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS labor_price numeric;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS image text;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS supplier text;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS location text;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS service_ids jsonb DEFAULT '[]'::jsonb;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS variants jsonb DEFAULT '[]'::jsonb;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS maintenance_category text;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS lifespan_km numeric;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS lifespan_days numeric;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS vehicle_make text;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS vehicle_model text;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS vehicle_year text;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS is_combo boolean DEFAULT false;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS combo_items jsonb DEFAULT '[]'::jsonb;

-- 6. ORDERS
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS mechanic_id text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS km numeric;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS km_unit text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS service_ids jsonb DEFAULT '[]'::jsonb;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS parts jsonb DEFAULT '[]'::jsonb;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS estimated_time text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS notes text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS checklist jsonb DEFAULT '[]'::jsonb;

-- 7. QUOTES
ALTER TABLE public.quotes ADD COLUMN IF NOT EXISTS valid_until text;
ALTER TABLE public.quotes ADD COLUMN IF NOT EXISTS discount numeric;
ALTER TABLE public.quotes ADD COLUMN IF NOT EXISTS notes text;
ALTER TABLE public.quotes ADD COLUMN IF NOT EXISTS items jsonb DEFAULT '[]'::jsonb;

-- 8. INVOICES
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS customer_name text;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS customer_rnc text;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS vehicle_id text;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS order_id text;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS mechanic_id text;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS km numeric;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS km_unit text;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS items jsonb DEFAULT '[]'::jsonb;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS discount numeric;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS ncf text;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS qr_url text;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS security_code text;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS signature_date text;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS notes text;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS is_commission_paid boolean DEFAULT false;

-- 9. CAJAS
ALTER TABLE public.cajas ADD COLUMN IF NOT EXISTS cerrada_en text;
ALTER TABLE public.cajas ADD COLUMN IF NOT EXISTS monto_esperado_efectivo numeric;
ALTER TABLE public.cajas ADD COLUMN IF NOT EXISTS monto_contado_efectivo numeric;
ALTER TABLE public.cajas ADD COLUMN IF NOT EXISTS monto_contado_tarjeta numeric;
ALTER TABLE public.cajas ADD COLUMN IF NOT EXISTS monto_contado_transferencia numeric;
ALTER TABLE public.cajas ADD COLUMN IF NOT EXISTS diferencia numeric;
ALTER TABLE public.cajas ADD COLUMN IF NOT EXISTS notas_apertura text;
ALTER TABLE public.cajas ADD COLUMN IF NOT EXISTS notas_cierre text;

-- 10. MOVIMIENTOS_CAJA
ALTER TABLE public.movimientos_caja ADD COLUMN IF NOT EXISTS tecnico_id text;
ALTER TABLE public.movimientos_caja ADD COLUMN IF NOT EXISTS monto_mano_obra numeric;

-- 11. TECHNICIANS
ALTER TABLE public.technicians ADD COLUMN IF NOT EXISTS phone text;
ALTER TABLE public.technicians ADD COLUMN IF NOT EXISTS pago_nomina numeric;
ALTER TABLE public.technicians ADD COLUMN IF NOT EXISTS tipo_pago text;

-- 12. MOVEMENTS (InventoryMovement)
ALTER TABLE public.movements ADD COLUMN IF NOT EXISTS variant_id text;

-- 13. INSPECTIONS
ALTER TABLE public.inspections ADD COLUMN IF NOT EXISTS work_order_id text;
ALTER TABLE public.inspections ADD COLUMN IF NOT EXISTS technician_id text;
ALTER TABLE public.inspections ADD COLUMN IF NOT EXISTS body_damage_notes text;
ALTER TABLE public.inspections ADD COLUMN IF NOT EXISTS completed_at text;

-- 14. MAINTENANCE ALERTS
-- (all basic ones exist, but just in case)
ALTER TABLE public.maintenance_alerts ADD COLUMN IF NOT EXISTS status text DEFAULT 'pending';

-- 15. MAINTENANCE HISTORY
ALTER TABLE public.maintenance_history ADD COLUMN IF NOT EXISTS completed_at text;
ALTER TABLE public.maintenance_history ADD COLUMN IF NOT EXISTS notes text;

-- 16. SUPPLIERS
-- Assuming this table was created fully, but let's ensure contacts exists
ALTER TABLE public.suppliers ADD COLUMN IF NOT EXISTS contacts jsonb DEFAULT '[]'::jsonb;
ALTER TABLE public.suppliers ADD COLUMN IF NOT EXISTS legal_name text;
ALTER TABLE public.suppliers ADD COLUMN IF NOT EXISTS rnc text;
ALTER TABLE public.suppliers ADD COLUMN IF NOT EXISTS notes text;

-- FINAL RELAXATIONS PARA EVITAR CRASHES POR NULL
ALTER TABLE public.products ALTER COLUMN stock DROP NOT NULL;
ALTER TABLE public.products ALTER COLUMN min_stock DROP NOT NULL;
ALTER TABLE public.orders ALTER COLUMN parts DROP NOT NULL;
ALTER TABLE public.cajas ALTER COLUMN cerrada_en DROP NOT NULL;

NOTIFY pgrst, 'reload schema';
