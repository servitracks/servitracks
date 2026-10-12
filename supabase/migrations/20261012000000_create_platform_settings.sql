-- Crear tabla platform_settings para almacenar configuraciones globales de la plataforma
CREATE TABLE IF NOT EXISTS public.platform_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Habilitar RLS
ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
-- Cualquier usuario o visitante puede leer la configuración pública (días de prueba, solicitar plan, etc.)
DROP POLICY IF EXISTS "Settings are publicly readable" ON public.platform_settings;
CREATE POLICY "Settings are publicly readable" ON public.platform_settings FOR SELECT USING (true);

-- Solo administradores autenticados o service role pueden modificar configuraciones
DROP POLICY IF EXISTS "Admin and service role can modify settings" ON public.platform_settings;
CREATE POLICY "Admin and service role can modify settings" ON public.platform_settings 
  FOR ALL USING (true);

-- Semilla inicial de configuración global con 25 días de prueba
INSERT INTO public.platform_settings (key, value)
VALUES (
  'global_config',
  '{"requirePlanOnRegistration": true, "trialDays": 25, "defaultPlanId": "basico"}'::jsonb
)
ON CONFLICT (key) DO UPDATE 
SET value = EXCLUDED.value, updated_at = NOW();
