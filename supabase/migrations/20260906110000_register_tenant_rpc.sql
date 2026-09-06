-- Migration: 20260906110000_register_tenant_rpc.sql
-- Purpose: Provides check_slug_available and register_tenant_account RPCs
-- Eliminates need for service_role key on the client during onboarding.

CREATE OR REPLACE FUNCTION public.check_slug_available(p_slug TEXT)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT NOT EXISTS (SELECT 1 FROM public.tenants WHERE LOWER(slug) = LOWER(TRIM(p_slug)));
$$;

GRANT EXECUTE ON FUNCTION public.check_slug_available TO anon, authenticated;

DROP FUNCTION IF EXISTS public.register_tenant_account(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS public.register_tenant_account(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT);

CREATE OR REPLACE FUNCTION public.register_tenant_account(
  p_company_name TEXT,
  p_slug TEXT,
  p_admin_email TEXT,
  p_admin_password TEXT,
  p_admin_name TEXT,
  p_rnc TEXT DEFAULT '',
  p_phone TEXT DEFAULT '',
  p_plan_id TEXT DEFAULT 'free',
  p_address TEXT DEFAULT '',
  p_logo TEXT DEFAULT ''
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
DECLARE
  v_user_id UUID;
  v_tenant_id UUID;
  v_encrypted_pw TEXT;
  v_existing_user UUID;
  v_existing_tenant UUID;
  v_plan_id TEXT;
  v_first_name TEXT;
  v_last_name TEXT;
BEGIN
  -- Validate mandatory input
  IF TRIM(p_company_name) = '' OR TRIM(p_slug) = '' OR TRIM(p_admin_email) = '' OR LENGTH(p_admin_password) < 6 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Parametros invalidos o contrasena muy corta');
  END IF;

  -- Check if slug already exists
  SELECT id INTO v_existing_tenant FROM public.tenants WHERE LOWER(slug) = LOWER(TRIM(p_slug));
  IF v_existing_tenant IS NOT NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'El identificador del taller ya existe');
  END IF;

  -- Check if email already exists in auth.users
  SELECT id INTO v_existing_user FROM auth.users WHERE LOWER(email) = LOWER(TRIM(p_admin_email));
  IF v_existing_user IS NOT NULL THEN
    -- If user already exists, update their password so they can log in
    v_user_id := v_existing_user;
    UPDATE auth.users
    SET encrypted_password = extensions.crypt(p_admin_password, extensions.gen_salt('bf')),
        updated_at = now()
    WHERE id = v_user_id;
  ELSE
    v_user_id := gen_random_uuid();
    v_encrypted_pw := extensions.crypt(p_admin_password, extensions.gen_salt('bf'));

    -- 1. Create auth user with full GoTrue compatibility
    INSERT INTO auth.users (
      id,
      instance_id,
      email,
      encrypted_password,
      email_confirmed_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at,
      role,
      aud,
      confirmation_token,
      recovery_token,
      email_change_token_new,
      email_change,
      phone_change,
      phone_change_token,
      email_change_token_current,
      email_change_confirm_status,
      reauthentication_token,
      is_sso_user,
      is_anonymous
    ) VALUES (
      v_user_id,
      '00000000-0000-0000-0000-000000000000'::uuid,
      LOWER(TRIM(p_admin_email)),
      v_encrypted_pw,
      now(),
      '{"provider": "email", "providers": ["email"]}'::jsonb,
      jsonb_build_object('name', p_admin_name, 'email_verified', true),
      now(),
      now(),
      'authenticated',
      'authenticated',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      0,
      '',
      false,
      false
    );

    -- 2. Create auth identity
    INSERT INTO auth.identities (
      id,
      user_id,
      identity_data,
      provider,
      provider_id,
      last_sign_in_at,
      created_at,
      updated_at
    ) VALUES (
      gen_random_uuid(),
      v_user_id,
      jsonb_build_object(
        'sub', v_user_id::text,
        'name', p_admin_name,
        'email', LOWER(TRIM(p_admin_email)),
        'email_verified', true,
        'phone_verified', false
      ),
      'email',
      v_user_id::text,
      now(),
      now(),
      now()
    );
  END IF;

  -- Resolve plan id from plans table (id is TEXT, column is nombre)
  SELECT id INTO v_plan_id FROM public.plans WHERE LOWER(id) = LOWER(p_plan_id) OR LOWER(nombre) = LOWER(p_plan_id) LIMIT 1;
  IF v_plan_id IS NULL THEN
    SELECT id INTO v_plan_id FROM public.plans LIMIT 1;
  END IF;

  v_tenant_id := gen_random_uuid();

  -- 3. Insert tenant
  INSERT INTO public.tenants (
    id,
    name,
    slug,
    rnc,
    phone,
    address,
    logo,
    email,
    plan_id,
    status,
    estado,
    trial_hasta,
    config,
    created_at,
    updated_at
  ) VALUES (
    v_tenant_id,
    TRIM(p_company_name),
    LOWER(TRIM(p_slug)),
    TRIM(p_rnc),
    TRIM(p_phone),
    TRIM(p_address),
    TRIM(p_logo),
    LOWER(TRIM(p_admin_email)),
    v_plan_id,
    'active',
    'TRIAL',
    now() + INTERVAL '14 days',
    '{"umbral_diferencia_caja": 500, "formato_ticket": "80mm"}'::jsonb,
    now(),
    now()
  );

  -- 4. Map user to tenant as owner
  INSERT INTO public.tenant_users (
    id,
    tenant_id,
    user_id,
    name,
    email,
    role,
    status,
    created_at
  ) VALUES (
    gen_random_uuid(),
    v_tenant_id,
    v_user_id,
    TRIM(p_admin_name),
    LOWER(TRIM(p_admin_email)),
    'owner',
    'active',
    now()
  );

  -- Split admin name
  v_first_name := split_part(TRIM(p_admin_name), ' ', 1);
  v_last_name := SUBSTRING(TRIM(p_admin_name) FROM LENGTH(v_first_name) + 2);
  IF v_last_name IS NULL OR v_last_name = '' THEN
    v_last_name := 'Administrador';
  END IF;

  -- 5. Create workshop employee (for PIN/POS)
  INSERT INTO public.empleados (
    tenant_id,
    nombre,
    apellido,
    rol,
    pin
  ) VALUES (
    v_tenant_id,
    v_first_name,
    v_last_name,
    'ADMIN',
    '1234'
  );

  -- 6. Create payroll employee (for Nomina)
  INSERT INTO public.empleados_nomina (
    id,
    tenant_id,
    cedula,
    nombres,
    apellidos,
    cargo,
    salario_base,
    tipo_cobro,
    estado,
    created_at,
    updated_at
  ) VALUES (
    gen_random_uuid()::text,
    v_tenant_id::text,
    '000-0000000-0',
    v_first_name,
    v_last_name,
    'Administrador / Propietario',
    0,
    'fijo',
    'activo',
    now()::text,
    now()::text
  );

  RETURN jsonb_build_object(
    'success', true,
    'tenant_id', v_tenant_id,
    'user_id', v_user_id,
    'slug', LOWER(TRIM(p_slug))
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.register_tenant_account TO anon, authenticated;
