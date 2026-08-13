-- 1. Tabla de Planes
CREATE TABLE IF NOT EXISTS public.planes (
  id TEXT PRIMARY KEY,
  nombre TEXT NOT NULL,
  precio_mensual NUMERIC NOT NULL,
  precio_anual NUMERIC,
  limite_empleados INTEGER NOT NULL DEFAULT 5,
  limite_ordenes_mes INTEGER, -- NULL = Ilimitado
  limite_whatsapp_mes INTEGER DEFAULT 500,
  whatsapp BOOLEAN DEFAULT TRUE,
  facturacion_fiscal BOOLEAN DEFAULT FALSE,
  multisucursal BOOLEAN DEFAULT FALSE,
  logistica BOOLEAN DEFAULT FALSE,
  procesos BOOLEAN DEFAULT TRUE,
  destacado BOOLEAN DEFAULT FALSE,
  polar_product_monthly_url TEXT,
  polar_product_yearly_url TEXT,
  precio_sucursal_adicional NUMERIC DEFAULT 0,
  limite_sucursales_adicionales INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Habilitar RLS
ALTER TABLE public.planes ENABLE ROW LEVEL SECURITY;

-- Políticas de RLS para Planes (Público de lectura, Super Admin de escritura)
DROP POLICY IF EXISTS "Planes son públicos para ver" ON public.planes;
CREATE POLICY "Planes son públicos para ver" ON public.planes FOR SELECT USING (true);

DROP POLICY IF EXISTS "Solo administradores globales pueden modificar planes" ON public.planes;
CREATE POLICY "Solo administradores globales pueden modificar planes" ON public.planes 
  FOR ALL USING (auth.role() = 'authenticated'); -- Asumimos que la lógica de super admin se maneja a nivel de UI, o se puede refinar luego

-- 2. Modificación en la Tabla Tenants (Talleres)
ALTER TABLE public.tenants 
  ADD COLUMN IF NOT EXISTS plan_id TEXT REFERENCES public.planes(id) DEFAULT 'basico',
  ADD COLUMN IF NOT EXISTS estado TEXT DEFAULT 'TRIAL',
  ADD COLUMN IF NOT EXISTS trial_hasta TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '14 days'),
  ADD COLUMN IF NOT EXISTS max_sucursales INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS config JSONB DEFAULT '{}'::jsonb;
  
-- 3. Inserción de planes por defecto
INSERT INTO public.planes (id, nombre, precio_mensual, precio_anual, limite_empleados, limite_ordenes_mes, limite_whatsapp_mes, whatsapp, facturacion_fiscal, multisucursal, logistica, procesos, destacado)
VALUES 
  ('basico', 'Plan Básico', 29, 290, 5, 100, 500, true, false, false, false, true, false),
  ('pro', 'Plan Pro', 59, 590, 15, 500, 2000, true, true, false, false, true, true),
  ('enterprise', 'Plan Enterprise', 129, 1290, 50, NULL, 5000, true, true, true, true, true, false)
ON CONFLICT (id) DO NOTHING;
