-- 1. Ensure Cajas table and correct column types
CREATE TABLE IF NOT EXISTS public.cajas (
    id text primary key,
    tenant_id text not null,
    empleado_id text,
    monto_inicial numeric not null,
    estado text not null,
    abierta_en text not null,
    cerrada_en text,
    monto_esperado_efectivo numeric,
    monto_contado_efectivo numeric,
    monto_contado_tarjeta numeric,
    monto_contado_transferencia numeric,
    diferencia numeric,
    notas_apertura text,
    notas_cierre text
);
-- Drop foreign key constraint if it exists before altering column type
ALTER TABLE public.cajas DROP CONSTRAINT IF EXISTS cajas_empleado_id_fkey;

-- If the table existed with uuid for empleado_id, change it to text
ALTER TABLE public.cajas ALTER COLUMN empleado_id TYPE text USING empleado_id::text;

-- 2. Ensure Movimientos Caja table and missing column
CREATE TABLE IF NOT EXISTS public.movimientos_caja (
    id text primary key,
    tenant_id text not null,
    caja_id text not null,
    empleado_id text,
    tecnico_id text,
    tipo text not null,
    concepto text not null,
    monto numeric not null,
    monto_mano_obra numeric,
    metodo text not null,
    creado_en text not null
);
ALTER TABLE public.movimientos_caja ADD COLUMN IF NOT EXISTS monto_mano_obra numeric;

-- Drop foreign key constraints if they exist
ALTER TABLE public.movimientos_caja DROP CONSTRAINT IF EXISTS movimientos_caja_empleado_id_fkey;
ALTER TABLE public.movimientos_caja DROP CONSTRAINT IF EXISTS movimientos_caja_caja_id_fkey;

ALTER TABLE public.movimientos_caja ALTER COLUMN empleado_id TYPE text USING empleado_id::text;

-- 3. Ensure Orders table
CREATE TABLE IF NOT EXISTS public.orders (
    id text primary key,
    tenant_id text not null,
    customer_id text not null,
    vehicle_id text not null,
    mechanic_id text,
    km numeric,
    km_unit text,
    status text not null,
    description text,
    service_ids jsonb not null default '[]'::jsonb,
    parts jsonb not null default '[]'::jsonb,
    estimated_time text,
    notes text,
    checklist jsonb not null default '[]'::jsonb,
    total numeric not null,
    created_at text not null,
    updated_at text not null
);

-- 4. Ensure Quotes table
CREATE TABLE IF NOT EXISTS public.quotes (
    id text primary key,
    tenant_id text not null,
    customer_id text not null,
    vehicle_id text,
    quote_number text not null,
    status text not null,
    valid_until text,
    subtotal numeric not null,
    tax numeric not null,
    discount numeric,
    total numeric not null,
    notes text,
    items jsonb not null default '[]'::jsonb,
    created_at text not null,
    updated_at text not null
);

-- 5. Add missing columns to existing tables
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS combo_items jsonb;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS customer_name text;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS customer_rnc text;

-- 6. Apply all missing procurement and inspection tables just in case
CREATE TABLE IF NOT EXISTS public.technicians (
    id text primary key,
    tenant_id text not null,
    name text not null,
    phone text,
    status text not null,
    pago_nomina numeric,
    tipo_pago text,
    created_at text not null
);

CREATE TABLE IF NOT EXISTS public.inspections (
    id text primary key,
    tenant_id text not null,
    vehicle_id text not null,
    customer_id text not null,
    work_order_id text,
    technician_id text,
    status text not null,
    fuel_level text not null,
    body_damage_notes text,
    items jsonb not null default '[]'::jsonb,
    created_at text not null,
    completed_at text
);

CREATE TABLE IF NOT EXISTS public.suppliers (
    id text primary key,
    tenant_id text not null,
    code text not null,
    commercial_name text not null,
    legal_name text,
    rnc text,
    type text not null,
    status text not null,
    contacts jsonb not null default '[]'::jsonb,
    country text,
    province text,
    city text,
    address text,
    google_maps_url text,
    credit_limit numeric,
    credit_days numeric,
    general_discount numeric,
    volume_discount numeric,
    itbis numeric,
    currency text not null,
    rating_delivery numeric not null,
    rating_quality numeric not null,
    rating_price numeric not null,
    rating_service numeric not null,
    notes text,
    created_at text not null,
    updated_at text not null
);

CREATE TABLE IF NOT EXISTS public.supplier_products (
    id text primary key,
    tenant_id text not null,
    supplier_id text not null,
    product_id text not null,
    current_price numeric not null,
    last_price numeric,
    last_updated text not null
);

CREATE TABLE IF NOT EXISTS public.purchase_orders (
    id text primary key,
    tenant_id text not null,
    supplier_id text not null,
    number text not null,
    invoice_number text,
    payment_status text not null,
    status text not null,
    items jsonb not null default '[]'::jsonb,
    subtotal numeric not null,
    tax numeric not null,
    total numeric not null,
    notes text,
    created_by text not null,
    created_at text not null,
    updated_at text not null,
    expected_delivery text
);

CREATE TABLE IF NOT EXISTS public.goods_receipts (
    id text primary key,
    tenant_id text not null,
    purchase_order_id text not null,
    supplier_id text not null,
    items jsonb not null default '[]'::jsonb,
    received_at text not null,
    received_by text not null,
    notes text
);

CREATE TABLE IF NOT EXISTS public.accounts_payable (
    id text primary key,
    tenant_id text not null,
    supplier_id text not null,
    purchase_order_id text,
    invoice_number text not null,
    amount numeric not null,
    paid_amount numeric not null,
    due_date text not null,
    status text not null,
    created_at text not null,
    paid_at text,
    notes text
);

CREATE TABLE IF NOT EXISTS public.quote_requests (
    id text primary key,
    tenant_id text not null,
    product_name text not null,
    description text,
    supplier_ids jsonb not null default '[]'::jsonb,
    responses jsonb not null default '[]'::jsonb,
    status text not null,
    created_at text not null
);
