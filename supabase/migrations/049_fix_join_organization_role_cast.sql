-- ============================================================
-- PillarPro v2 — Migration 049: Fix join_organization Role Cast
-- Resolves: "column "role" is of type user_role but expression is of type text"
--
-- 1. Updates public.join_organization() to explicitly cast text to public.user_role
-- 2. Safely validates role values against the user_role enum
-- 3. Grants execute permissions to authenticated and service_role
-- ============================================================

CREATE OR REPLACE FUNCTION public.join_organization(
  p_join_code TEXT,
  p_display_name TEXT,
  p_role TEXT DEFAULT 'site_supervisor'
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_user_email TEXT;
  v_org_id UUID;
  v_org_name TEXT;
  v_code_clean TEXT;
  v_role_assigned TEXT;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated.';
  END IF;

  SELECT email INTO v_user_email FROM auth.users WHERE id = v_user_id;

  v_code_clean := UPPER(TRIM(COALESCE(p_join_code, '')));
  IF v_code_clean = '' THEN
    RAISE EXCEPTION 'Invite code cannot be empty.';
  END IF;

  -- Look up target organization
  SELECT id, name INTO v_org_id, v_org_name
  FROM public.organizations
  WHERE UPPER(join_code) = v_code_clean;

  IF v_org_id IS NULL THEN
    RAISE EXCEPTION 'Invalid invite code. Please check with your firm owner.';
  END IF;

  -- Normalize role (default: site_supervisor, disallow joining directly as owner)
  v_role_assigned := LOWER(TRIM(COALESCE(p_role, 'site_supervisor')));
  IF v_role_assigned NOT IN ('partner', 'managing_partner', 'accountant', 'site_supervisor', 'viewer') THEN
    v_role_assigned := 'site_supervisor';
  END IF;

  -- Update or insert user profile
  INSERT INTO public.user_profiles (
    id, email, display_name, status, organization_id, created_at, updated_at
  )
  VALUES (
    v_user_id,
    v_user_email,
    COALESCE(NULLIF(TRIM(p_display_name), ''), split_part(v_user_email, '@', 1)),
    'active',
    v_org_id,
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    organization_id = v_org_id,
    display_name = COALESCE(NULLIF(TRIM(p_display_name), ''), user_profiles.display_name),
    status = 'active',
    updated_at = NOW();

  -- Assign role in firm with explicit cast to public.user_role
  INSERT INTO public.roles (
    user_id, role, project_id
  )
  VALUES (
    v_user_id,
    v_role_assigned::public.user_role,
    NULL
  )
  ON CONFLICT (user_id) DO UPDATE SET
    role = v_role_assigned::public.user_role,
    project_id = NULL;

  RETURN json_build_object(
    'success', true,
    'organization_id', v_org_id,
    'organization_name', v_org_name,
    'role', v_role_assigned
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.join_organization(TEXT, TEXT, TEXT) TO authenticated, service_role;
