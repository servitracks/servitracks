-- Migración: Permitir el rol 'warehouse' (Almacén) en la tabla tenant_users
-- Fecha: 2026-10-15

BEGIN;

-- 1. Eliminar la restricción actual que restringe los roles
ALTER TABLE public.tenant_users 
  DROP CONSTRAINT IF EXISTS tenant_users_role_check;

-- 2. Volver a crear la restricción incluyendo el rol 'warehouse'
ALTER TABLE public.tenant_users 
  ADD CONSTRAINT tenant_users_role_check 
  CHECK (role IN ('owner', 'admin', 'mechanic', 'cashier', 'receptionist', 'warehouse'));

COMMIT;
