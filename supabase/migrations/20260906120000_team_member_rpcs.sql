-- Migration: 20260906120000_team_member_rpcs.sql
-- Purpose: Secure RPCs for managing workshop team members without exposing service_role key

CREATE OR REPLACE FUNCTION public.create_team_member(
  p_tenant_id UUID,
  p_email TEXT,
  p_password TEXT,
  p_name TEXT,
  p_role TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
DECLARE
  v_caller_id UUID := auth.uid();
  v_is_owner BOOLEAN;
  v_user_id UUID;
  v_encrypted_pw TEXT;
  v_existing_user UUID;
BEGIN
  -- Verify caller is owner of this tenant or authenticated
  SELECT EXISTS(
    SELECT 1 FROM public.tenant_users
    WHERE tenant_id = p_tenant_id
      AND user_id = v_caller_id
      AND role IN ('owner', 'superadmin')
  ) INTO v_is_owner;

  IF NOT v_is_owner AND v_caller_id IS NOT NULL THEN
    -- Check if superadmin by email
    IF NOT EXISTS(SELECT 1 FROM auth.users WHERE id = v_caller_id AND email IN ('admin@servitracks.com', 'admin@klynn.com', 'rubenpolanco487@gmail.com')) THEN
      RETURN jsonb_build_object('success', false, 'error', 'No tienes permisos de propietario para agregar miembros');
    END IF;
  END IF;

  -- Validate password
  IF LENGTH(p_password) < 6 THEN
    RETURN jsonb_build_object('success', false, 'error', 'La contrasena debe tener al menos 6 caracteres');
  END IF;

  -- Check if user exists in auth.users
  SELECT id INTO v_existing_user FROM auth.users WHERE LOWER(email) = LOWER(TRIM(p_email));
  IF v_existing_user IS NOT NULL THEN
    v_user_id := v_existing_user;
  ELSE
    v_user_id := gen_random_uuid();
    v_encrypted_pw := extensions.crypt(p_password, extensions.gen_salt('bf'));

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
      LOWER(TRIM(p_email)),
      v_encrypted_pw,
      now(),
      '{"provider": "email", "providers": ["email"]}'::jsonb,
      jsonb_build_object('name', p_name, 'email_verified', true),
      now(),
      now(),
      'authenticated',
      'authenticated',
      '', '', '', '', '', '', '', 0, '', false, false
    );

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
        'name', p_name,
        'email', LOWER(TRIM(p_email)),
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

  -- Insert or update tenant_users
  INSERT INTO public.tenant_users (
    id,
    tenant_id,
    user_id,
    name,
    email,
    role,
    status,
    created_at,
    updated_at
  ) VALUES (
    gen_random_uuid(),
    p_tenant_id,
    v_user_id,
    TRIM(p_name),
    LOWER(TRIM(p_email)),
    LOWER(TRIM(p_role)),
    'active',
    now(),
    now()
  )
  ON CONFLICT (id) DO UPDATE SET
    role = EXCLUDED.role,
    name = EXCLUDED.name,
    updated_at = now();

  RETURN jsonb_build_object(
    'success', true,
    'user_id', v_user_id
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_team_member TO authenticated, anon;

-- Function to delete team member securely
CREATE OR REPLACE FUNCTION public.delete_team_member(
  p_tenant_id UUID,
  p_user_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_caller_id UUID := auth.uid();
  v_is_owner BOOLEAN;
BEGIN
  -- Verify caller is owner of this tenant
  SELECT EXISTS(
    SELECT 1 FROM public.tenant_users
    WHERE tenant_id = p_tenant_id
      AND user_id = v_caller_id
      AND role IN ('owner', 'superadmin')
  ) INTO v_is_owner;

  IF NOT v_is_owner AND v_caller_id IS NOT NULL THEN
    IF NOT EXISTS(SELECT 1 FROM auth.users WHERE id = v_caller_id AND email IN ('admin@servitracks.com', 'admin@klynn.com', 'rubenpolanco487@gmail.com')) THEN
      RETURN jsonb_build_object('success', false, 'error', 'No tienes permisos para eliminar miembros');
    END IF;
  END IF;

  DELETE FROM public.tenant_users
  WHERE tenant_id = p_tenant_id AND (user_id = p_user_id OR id = p_user_id);

  RETURN jsonb_build_object('success', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.delete_team_member TO authenticated, anon;
