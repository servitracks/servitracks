-- Agregar columnas a la tabla de movements para mayor control
ALTER TABLE public.movements 
ADD COLUMN IF NOT EXISTS technician_id text,
ADD COLUMN IF NOT EXISTS customer_id text,
ADD COLUMN IF NOT EXISTS invoice_id text;

-- Crear tabla para las Sesiones de Inventario
CREATE TABLE IF NOT EXISTS public.inventory_sessions (
    id text primary key,
    tenant_id text not null,
    name text not null,
    status text not null, -- 'en_progreso' o 'cerrado'
    auditor_id text,
    discrepancies jsonb not null default '[]'::jsonb,
    created_at text not null,
    completed_at text
);
