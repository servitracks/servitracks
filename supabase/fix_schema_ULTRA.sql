NOTIFY pgrst, 'reload schema';

-- Add all missing columns seen in the error logs for products
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS labor_price numeric default 0;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS is_combo boolean default false;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS combo_items jsonb default '[]'::jsonb;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS variants jsonb default '[]'::jsonb;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS maintenance_category text;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS lifespan_km numeric;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS lifespan_days numeric;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS vehicle_make text;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS vehicle_model text;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS vehicle_year text;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS service_ids jsonb default '[]'::jsonb;

-- Add missing columns for invoices
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS items jsonb default '[]'::jsonb;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS is_commission_paid boolean default false;

-- Add missing columns for movimientos_caja
ALTER TABLE public.movimientos_caja ADD COLUMN IF NOT EXISTS tecnico_id text;
ALTER TABLE public.movimientos_caja ADD COLUMN IF NOT EXISTS monto_mano_obra numeric default 0;

-- Relax constraints
ALTER TABLE public.orders ALTER COLUMN parts DROP NOT NULL;
ALTER TABLE public.orders ALTER COLUMN parts SET DEFAULT '[]'::jsonb;

-- FORCE all IDs to TEXT using Exception catching blocks so it never fails
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN SELECT tc.table_name, kcu.column_name, tc.constraint_name 
             FROM information_schema.table_constraints AS tc 
             JOIN information_schema.key_column_usage AS kcu ON tc.constraint_name = kcu.constraint_name 
             JOIN information_schema.constraint_column_usage AS ccu ON ccu.constraint_name = tc.constraint_name 
             WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_schema = 'public'
    LOOP
        BEGIN
            EXECUTE 'ALTER TABLE public.' || quote_ident(r.table_name) || ' DROP CONSTRAINT IF EXISTS ' || quote_ident(r.constraint_name);
        EXCEPTION WHEN others THEN NULL; END;
    END LOOP;
END $$;

DO $$ BEGIN ALTER TABLE public.vehicles ALTER COLUMN id TYPE text USING id::text; EXCEPTION WHEN others THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.orders ALTER COLUMN id TYPE text USING id::text; EXCEPTION WHEN others THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.cajas ALTER COLUMN id TYPE text USING id::text; EXCEPTION WHEN others THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.services ALTER COLUMN id TYPE text USING id::text; EXCEPTION WHEN others THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.maintenance_items ALTER COLUMN id TYPE text USING id::text; EXCEPTION WHEN others THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.movimientos_caja ALTER COLUMN id TYPE text USING id::text; EXCEPTION WHEN others THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.invoices ALTER COLUMN id TYPE text USING id::text; EXCEPTION WHEN others THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.products ALTER COLUMN id TYPE text USING id::text; EXCEPTION WHEN others THEN NULL; END $$;

-- Force foreign key columns to text manually just in case
DO $$ BEGIN ALTER TABLE public.movimientos_caja ALTER COLUMN caja_id TYPE text USING caja_id::text; EXCEPTION WHEN others THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.invoices ALTER COLUMN order_id TYPE text USING order_id::text; EXCEPTION WHEN others THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.invoices ALTER COLUMN vehicle_id TYPE text USING vehicle_id::text; EXCEPTION WHEN others THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.orders ALTER COLUMN vehicle_id TYPE text USING vehicle_id::text; EXCEPTION WHEN others THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.maintenance_items ALTER COLUMN vehicle_id TYPE text USING vehicle_id::text; EXCEPTION WHEN others THEN NULL; END $$;

NOTIFY pgrst, 'reload schema';
