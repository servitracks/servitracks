-- ==============================================================================
-- MIGRACIÓN MAESTRA DE AUDITORÍA Y REMEDIACIÓN TÉCNICA - SERVITRACKS
-- Fecha: 2026-09-06
-- ==============================================================================

-- 1. CORRECCIÓN DE ESQUEMA Y TABLAS FALTANTES
-- ------------------------------------------------------------------------------

-- Tabla documents (requerida por el sincronizador)
CREATE TABLE IF NOT EXISTS public.documents (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  type TEXT,
  size NUMERIC,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_documents_tenant ON public.documents(tenant_id);

-- Tabla order_items (normalización de repuestos y servicios en órdenes de trabajo)
CREATE TABLE IF NOT EXISTS public.order_items (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  order_id TEXT NOT NULL,
  product_id TEXT,
  service_id TEXT,
  name TEXT NOT NULL,
  quantity NUMERIC NOT NULL DEFAULT 1,
  unit_price NUMERIC NOT NULL DEFAULT 0,
  tax NUMERIC DEFAULT 0,
  labor_price NUMERIC DEFAULT 0,
  already_deducted BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_order_items_tenant_order ON public.order_items(tenant_id, order_id);

-- Permitir nulos en referencias foráneas de órdenes y compras para no romper integridad histórica
ALTER TABLE public.orders ALTER COLUMN customer_id DROP NOT NULL;
ALTER TABLE public.orders ALTER COLUMN vehicle_id DROP NOT NULL;
ALTER TABLE public.purchase_orders ALTER COLUMN supplier_id DROP NOT NULL;

-- Columna observation en quotes (eliminando el hack textual [OBS]:)
ALTER TABLE public.quotes ADD COLUMN IF NOT EXISTS observation TEXT;

-- Migrar observaciones existentes embebidas en notes con [OBS]:
UPDATE public.quotes
SET observation = TRIM(SPLIT_PART(notes, '[OBS]:', 2)),
    notes = TRIM(SPLIT_PART(notes, '[OBS]:', 1))
WHERE notes LIKE '%[OBS]:%' AND (observation IS NULL OR observation = '');

-- Campos en invoices para contingencia DGII y estado de sincronización
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS sync_status TEXT DEFAULT 'synced';
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS contingency_payload JSONB;

-- Tabla de secuencias correlativas de NCF tradicionales
CREATE TABLE IF NOT EXISTS public.ncf_sequences (
  tenant_id TEXT NOT NULL,
  ncf_type TEXT NOT NULL,
  current_number BIGINT NOT NULL DEFAULT 0,
  max_number BIGINT NOT NULL DEFAULT 99999999,
  is_active BOOLEAN DEFAULT true,
  updated_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (tenant_id, ncf_type)
);

-- 2. FUNCIONES DE NEGOCIO EN POSTGRESQL (RPCs)
-- ------------------------------------------------------------------------------

-- Función para obtener el siguiente NCF correlativo con bloqueo de fila
CREATE OR REPLACE FUNCTION public.get_next_ncf(p_tenant_id TEXT, p_ncf_type TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_current BIGINT;
  v_max BIGINT;
BEGIN
  SELECT current_number, max_number INTO v_current, v_max
  FROM public.ncf_sequences
  WHERE tenant_id = p_tenant_id AND ncf_type = p_ncf_type
  FOR UPDATE;

  IF NOT FOUND THEN
    v_current := 1;
    v_max := 99999999;
    INSERT INTO public.ncf_sequences (tenant_id, ncf_type, current_number, max_number, is_active, updated_at)
    VALUES (p_tenant_id, p_ncf_type, 1, 99999999, true, now());
  ELSE
    v_current := v_current + 1;
    UPDATE public.ncf_sequences
    SET current_number = v_current, updated_at = now()
    WHERE tenant_id = p_tenant_id AND ncf_type = p_ncf_type;
  END IF;

  RETURN p_ncf_type || LPAD(v_current::TEXT, 8, '0');
END;
$$;

-- Función atómica para descuento de inventario en POS con bloqueo FOR UPDATE
CREATE OR REPLACE FUNCTION public.deduct_inventory_stock(
  p_tenant_id TEXT,
  p_invoice_id TEXT,
  p_items JSONB,
  p_user_id TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_item JSONB;
  v_prod_id TEXT;
  v_qty NUMERIC;
  v_prod RECORD;
  v_combo_item JSONB;
  v_sub_prod_id TEXT;
  v_sub_qty NUMERIC;
  v_deducted_count INT := 0;
  v_mov_id TEXT;
BEGIN
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    -- Si ya fue deducido previamente (ej: al iniciar la orden), omitir
    IF (v_item->>'alreadyDeducted')::BOOLEAN IS TRUE THEN
      CONTINUE;
    END IF;

    v_prod_id := v_item->>'productId';
    v_qty := COALESCE((v_item->>'quantity')::NUMERIC, 1);

    IF v_prod_id IS NOT NULL AND v_prod_id <> '' THEN
      -- Bloqueo transaccional
      SELECT * INTO v_prod FROM public.products
      WHERE id::text = v_prod_id AND tenant_id::text = p_tenant_id
      FOR UPDATE;

      IF FOUND THEN
        -- Si es un combo de productos
        IF v_prod.is_combo IS TRUE AND v_prod.combo_items IS NOT NULL THEN
          FOR v_combo_item IN SELECT * FROM jsonb_array_elements(v_prod.combo_items)
          LOOP
            v_sub_prod_id := v_combo_item->>'productId';
            v_sub_qty := COALESCE((v_combo_item->>'quantity')::NUMERIC, 1) * v_qty;

            UPDATE public.products
            SET stock = GREATEST(0, stock - v_sub_qty),
                updated_at = now()
            WHERE id::text = v_sub_prod_id AND tenant_id::text = p_tenant_id;

            v_mov_id := 'mov-' || extract(epoch from now())::bigint || '-' || substr(md5(random()::text), 1, 6);
            INSERT INTO public.movements (
              id, tenant_id, product_id, product_name, type, quantity, reason, date, user_id
            ) VALUES (
              v_mov_id,
              p_tenant_id,
              v_sub_prod_id,
              COALESCE((SELECT name FROM public.products WHERE id::text = v_sub_prod_id), 'Subproducto'),
              'out',
              v_sub_qty,
              'Venta combo POS (Factura #' || RIGHT(p_invoice_id, 6) || ')',
              now()::TEXT,
              p_user_id
            );
          END LOOP;
        ELSE
          -- Producto simple
          UPDATE public.products
          SET stock = GREATEST(0, stock - v_qty),
              updated_at = now()
          WHERE id::text = v_prod_id AND tenant_id::text = p_tenant_id;

          v_mov_id := 'mov-' || extract(epoch from now())::bigint || '-' || substr(md5(random()::text), 1, 6);
          INSERT INTO public.movements (
            id, tenant_id, product_id, product_name, type, quantity, reason, date, user_id
          ) VALUES (
            v_mov_id,
            p_tenant_id,
            v_prod_id,
            v_prod.name,
            'out',
            v_qty,
            'Venta POS (Factura #' || RIGHT(p_invoice_id, 6) || ')',
            now()::TEXT,
            p_user_id
          );
        END IF;

        v_deducted_count := v_deducted_count + 1;
      END IF;
    END IF;
  END LOOP;

  RETURN jsonb_build_object('success', true, 'deducted_items', v_deducted_count);
END;
$$;

-- 3. SANEAMIENTO DE INTEGRIDAD REFERENCIAL Y REGISTROS HUÉRFANOS
-- ------------------------------------------------------------------------------

-- Limpiar movimientos que apuntaban a productos que ya fueron eliminados
DELETE FROM public.movements 
WHERE product_id::text NOT IN (SELECT id::text FROM public.products);

-- Neutralizar referencias huérfanas en órdenes de compra
UPDATE public.purchase_orders 
SET supplier_id = NULL 
WHERE supplier_id IS NOT NULL AND supplier_id::text NOT IN (SELECT id::text FROM public.suppliers);

-- Neutralizar referencias huérfanas en órdenes de trabajo
UPDATE public.orders 
SET customer_id = NULL 
WHERE customer_id IS NOT NULL AND customer_id::text NOT IN (SELECT id::text FROM public.customers);

UPDATE public.orders 
SET vehicle_id = NULL 
WHERE vehicle_id IS NOT NULL AND vehicle_id::text NOT IN (SELECT id::text FROM public.vehicles);

-- 4. SEGURIDAD Y CONTROL DE ACCESO (ROW LEVEL SECURITY)
-- ------------------------------------------------------------------------------

-- Funciones auxiliares de seguridad
CREATE OR REPLACE FUNCTION public.current_user_tenant_ids()
RETURNS SETOF TEXT
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT tenant_id::text FROM public.tenant_users
  WHERE user_id::text = auth.uid()::text
     OR email = auth.jwt() ->> 'email';
$$;

CREATE OR REPLACE FUNCTION public.is_superadmin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT COALESCE(
    (auth.jwt() ->> 'email' = 'admin@servitracks.com') OR
    EXISTS (SELECT 1 FROM public.tenant_users WHERE (user_id::text = auth.uid()::text OR email = auth.jwt() ->> 'email') AND role = 'superadmin'),
    false
  );
$$;

-- Activar RLS en todas las tablas operativas
DO $$
DECLARE
  tbl TEXT;
  tables TEXT[] := ARRAY[
    'tenants', 'tenant_users', 'customers', 'vehicles', 'products', 'services',
    'orders', 'order_items', 'invoices', 'invoice_items', 'cajas', 'movimientos_caja',
    'movements', 'technicians', 'quotes', 'inspections', 'maintenance_items',
    'maintenance_alerts', 'maintenance_history', 'suppliers', 'supplier_products',
    'purchase_orders', 'goods_receipts', 'accounts_payable', 'quote_requests',
    'activity_logs', 'open_tabs', 'empleados_nomina', 'nominas_periodos',
    'wa_conversations', 'wa_messages', 'documents', 'ncf_sequences'
  ];
BEGIN
  FOREACH tbl IN ARRAY tables
  LOOP
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = tbl) THEN
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', tbl);
      -- Eliminar políticas previas para evitar duplicados
      EXECUTE format('DROP POLICY IF EXISTS tenant_isolation_policy ON public.%I;', tbl);
      EXECUTE format('DROP POLICY IF EXISTS tenant_select_policy ON public.%I;', tbl);
      EXECUTE format('DROP POLICY IF EXISTS tenant_insert_policy ON public.%I;', tbl);
      EXECUTE format('DROP POLICY IF EXISTS tenant_update_policy ON public.%I;', tbl);
      EXECUTE format('DROP POLICY IF EXISTS tenant_delete_policy ON public.%I;', tbl);
    END IF;
  END LOOP;
END;
$$;

-- Políticas para tenants
DROP POLICY IF EXISTS tenant_select_policy ON public.tenants;
DROP POLICY IF EXISTS tenant_insert_policy ON public.tenants;
DROP POLICY IF EXISTS tenant_update_policy ON public.tenants;
DROP POLICY IF EXISTS tenant_delete_policy ON public.tenants;
CREATE POLICY tenant_select_policy ON public.tenants
  FOR SELECT TO authenticated, anon
  USING (true); -- Permitir resolver nombre y slug de taller para login y rutas

CREATE POLICY tenant_insert_policy ON public.tenants
  FOR INSERT TO authenticated
  WITH CHECK (true); -- Permitir a nuevo usuario registrado crear su taller inicial

CREATE POLICY tenant_update_policy ON public.tenants
  FOR UPDATE TO authenticated
  USING (public.is_superadmin() OR id::text IN (SELECT public.current_user_tenant_ids()))
  WITH CHECK (public.is_superadmin() OR id::text IN (SELECT public.current_user_tenant_ids()));

CREATE POLICY tenant_delete_policy ON public.tenants
  FOR DELETE TO authenticated
  USING (public.is_superadmin());

-- Políticas para tenant_users
DROP POLICY IF EXISTS tenant_users_select_policy ON public.tenant_users;
DROP POLICY IF EXISTS tenant_users_insert_policy ON public.tenant_users;
DROP POLICY IF EXISTS tenant_users_update_policy ON public.tenant_users;
DROP POLICY IF EXISTS tenant_users_delete_policy ON public.tenant_users;
CREATE POLICY tenant_users_select_policy ON public.tenant_users
  FOR SELECT TO authenticated
  USING (public.is_superadmin() OR tenant_id::text IN (SELECT public.current_user_tenant_ids()) OR user_id::text = auth.uid()::text OR email = auth.jwt() ->> 'email');

CREATE POLICY tenant_users_insert_policy ON public.tenant_users
  FOR INSERT TO authenticated
  WITH CHECK (public.is_superadmin() OR tenant_id::text IN (SELECT public.current_user_tenant_ids()) OR user_id::text = auth.uid()::text);

CREATE POLICY tenant_users_update_policy ON public.tenant_users
  FOR UPDATE TO authenticated
  USING (public.is_superadmin() OR tenant_id::text IN (SELECT public.current_user_tenant_ids()))
  WITH CHECK (public.is_superadmin() OR tenant_id::text IN (SELECT public.current_user_tenant_ids()));

CREATE POLICY tenant_users_delete_policy ON public.tenant_users
  FOR DELETE TO authenticated
  USING (public.is_superadmin() OR tenant_id::text IN (SELECT public.current_user_tenant_ids()));

-- Políticas de aislamiento multitenant dinámicas para todas las tablas que contengan tenant_id
DO $$
DECLARE
  tbl TEXT;
  tables TEXT[] := ARRAY[
    'customers', 'vehicles', 'products', 'services',
    'orders', 'order_items', 'invoices', 'invoice_items', 'cajas', 'movimientos_caja',
    'movements', 'technicians', 'quotes', 'inspections', 'maintenance_items',
    'maintenance_alerts', 'maintenance_history', 'suppliers', 'supplier_products',
    'purchase_orders', 'goods_receipts', 'accounts_payable', 'quote_requests',
    'activity_logs', 'open_tabs', 'empleados_nomina', 'nominas_periodos',
    'wa_conversations', 'wa_messages', 'documents', 'ncf_sequences'
  ];
BEGIN
  FOREACH tbl IN ARRAY tables
  LOOP
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = tbl AND column_name = 'tenant_id'
    ) THEN
      EXECUTE format('
        CREATE POLICY tenant_isolation_policy ON public.%I
        FOR ALL TO authenticated
        USING (public.is_superadmin() OR tenant_id::text IN (SELECT public.current_user_tenant_ids()))
        WITH CHECK (public.is_superadmin() OR tenant_id::text IN (SELECT public.current_user_tenant_ids()));
      ', tbl);
    END IF;
  END LOOP;
END;
$$;

-- Políticas para saas_plans / plans (catálogo de precios público)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'saas_plans') THEN
    ALTER TABLE public.saas_plans ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS saas_plans_public_read ON public.saas_plans;
    CREATE POLICY saas_plans_public_read ON public.saas_plans FOR SELECT TO authenticated, anon USING (true);
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'plans') THEN
    ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS plans_public_read ON public.plans;
    CREATE POLICY plans_public_read ON public.plans FOR SELECT TO authenticated, anon USING (true);
  END IF;
END;
$$;

NOTIFY pgrst, 'reload schema';
NOTIFY pgrst, 'reload config';
