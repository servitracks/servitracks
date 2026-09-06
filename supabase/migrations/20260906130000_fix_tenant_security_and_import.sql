-- Migration: 20260906130000_fix_tenant_security_and_import.sql
-- Purpose: Fix RLS tenant resolution for all users (case-insensitive email matching, owner tenant matching),
-- link existing unlinked tenant_users, and ensure robust import operations.

-- 1. Actualizar funcion de resolucion de tenants del usuario actual
CREATE OR REPLACE FUNCTION public.current_user_tenant_ids()
RETURNS SETOF TEXT
LANGUAGE sql
SECURITY DEFINER
STABLE
AS 
  SELECT tenant_id::text FROM public.tenant_users
  WHERE user_id::text = auth.uid()::text
     OR id::text = auth.uid()::text
     OR (email IS NOT NULL AND LOWER(TRIM(email)) = LOWER(TRIM(COALESCE(auth.jwt() ->> 'email', ''))))
  UNION
  SELECT id::text FROM public.tenants
  WHERE email IS NOT NULL AND LOWER(TRIM(email)) = LOWER(TRIM(COALESCE(auth.jwt() ->> 'email', '')));
;

-- 2. Actualizar funcion de verificacion de superadmin (insensible a mayusculas)
CREATE OR REPLACE FUNCTION public.is_superadmin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS 
  SELECT COALESCE(
    (LOWER(TRIM(COALESCE(auth.jwt() ->> 'email', ''))) IN ('admin@servitracks.com', 'admin@klynn.com', 'rubenpolanco487@gmail.com')) OR
    EXISTS (
      SELECT 1 FROM public.tenant_users 
      WHERE (user_id::text = auth.uid()::text OR id::text = auth.uid()::text OR (email IS NOT NULL AND LOWER(TRIM(email)) = LOWER(TRIM(COALESCE(auth.jwt() ->> 'email', ''))))) 
        AND role = 'superadmin'
    ),
    false
  );
;

-- 3. Vincular usuarios existentes en tenant_users que no tenian user_id mapeado
UPDATE public.tenant_users tu
SET user_id = u.id
FROM auth.users u
WHERE (tu.user_id IS NULL OR tu.user_id::text = '')
  AND LOWER(TRIM(tu.email)) = LOWER(TRIM(u.email));

-- 4. Permitir nulo en supplier_id de accounts_payable para evitar fallos si una importacion no tiene proveedor persistido
DO 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'accounts_payable' 
      AND column_name = 'supplier_id' 
      AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE public.accounts_payable ALTER COLUMN supplier_id DROP NOT NULL;
  END IF;
END ;
