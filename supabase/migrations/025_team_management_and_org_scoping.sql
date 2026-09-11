-- ============================================================
-- PillarPro v2 — Migration 025: Team Management, Firm Invite Codes & Multi-Tenant User Scoping
-- 
-- 1. Adds unique join_code to public.organizations
-- 2. Backfills join codes for existing organizations
-- 3. Implements public.join_organization() RPC for team members
-- 4. Implements public.get_organization_join_code() RPC for owners
-- 5. Tightens RLS on user_profiles & roles so owners ONLY see/manage their own firm's staff
-- ============================================================

-- 1. Add join_code to organizations
ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS join_code TEXT UNIQUE;

-- 2. Backfill existing organizations with deterministic uppercase 6-char codes
UPDATE public.organizations
SET join_code = UPPER(SUBSTRING(MD5(id::TEXT) FROM 1 FOR 6))
WHERE join_code IS NULL;

-- Ensure join_code is never null going forward
ALTER TABLE public.organizations
  ALTER COLUMN join_code SET DEFAULT UPPER(SUBSTRING(MD5(gen_random_uuid()::TEXT) FROM 1 FOR 6));

-- 3. RPC: Get current organization join code for owners/partners
CREATE OR REPLACE FUNCTION public.get_organization_join_code()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org_id UUID;
  v_code TEXT;
  v_name TEXT;
BEGIN
  v_org_id := public.get_user_organization_id();
  IF v_org_id IS NULL THEN
    RETURN json_build_object('error', 'No organization linked');
  END IF;

  SELECT join_code, name INTO v_code, v_name
  FROM public.organizations
  WHERE id = v_org_id;

  RETURN json_build_object(
    'organization_id', v_org_id,
    'organization_name', v_name,
    'join_code', v_code
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_organization_join_code() TO authenticated;

-- 4. RPC: Join an existing organization via invite code
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

  -- Update user profile
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

  -- Assign role in firm
  INSERT INTO public.roles (
    user_id, role, project_id
  )
  VALUES (
    v_user_id, v_role_assigned, NULL
  )
  ON CONFLICT (user_id) DO UPDATE SET
    role = v_role_assigned,
    project_id = NULL;

  RETURN json_build_object(
    'success', true,
    'organization_id', v_org_id,
    'organization_name', v_org_name,
    'role', v_role_assigned
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.join_organization(TEXT, TEXT, TEXT) TO authenticated;

-- 5. Tighten RLS on user_profiles & roles to organization boundary
DROP POLICY IF EXISTS "profiles_select_own"   ON public.user_profiles;
DROP POLICY IF EXISTS "profiles_select_owner" ON public.user_profiles;
DROP POLICY IF EXISTS "profiles_select"       ON public.user_profiles;
DROP POLICY IF EXISTS "profiles_select_org"   ON public.user_profiles;

CREATE POLICY "profiles_select_org" ON public.user_profiles
  FOR SELECT TO authenticated
  USING (
    id = auth.uid()
    OR (
      public.get_user_role() IN ('owner', 'managing_partner', 'partner')
      AND organization_id = public.get_user_organization_id()
    )
  );

DROP POLICY IF EXISTS "profiles_update_own"   ON public.user_profiles;
DROP POLICY IF EXISTS "profiles_update_owner" ON public.user_profiles;
DROP POLICY IF EXISTS "profiles_update_org"   ON public.user_profiles;

CREATE POLICY "profiles_update_org" ON public.user_profiles
  FOR UPDATE TO authenticated
  USING (
    id = auth.uid()
    OR (
      public.get_user_role() IN ('owner', 'managing_partner')
      AND organization_id = public.get_user_organization_id()
    )
  );

DROP POLICY IF EXISTS "roles_select_own"   ON public.roles;
DROP POLICY IF EXISTS "roles_select_owner" ON public.roles;
DROP POLICY IF EXISTS "roles_select"       ON public.roles;
DROP POLICY IF EXISTS "roles_select_org"   ON public.roles;

CREATE POLICY "roles_select_org" ON public.roles
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR (
      public.get_user_role() IN ('owner', 'managing_partner', 'partner')
      AND EXISTS (
        SELECT 1 FROM public.user_profiles up
        WHERE up.id = roles.user_id
          AND up.organization_id = public.get_user_organization_id()
      )
    )
  );

DROP POLICY IF EXISTS "roles_insert_owner" ON public.roles;
DROP POLICY IF EXISTS "roles_update_owner" ON public.roles;
DROP POLICY IF EXISTS "roles_delete_owner" ON public.roles;
DROP POLICY IF EXISTS "roles_insert_org"   ON public.roles;
DROP POLICY IF EXISTS "roles_update_org"   ON public.roles;
DROP POLICY IF EXISTS "roles_delete_org"   ON public.roles;

CREATE POLICY "roles_insert_org" ON public.roles
  FOR INSERT TO authenticated
  WITH CHECK (
    public.get_user_role() IN ('owner', 'managing_partner')
    AND EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.id = roles.user_id
        AND up.organization_id = public.get_user_organization_id()
    )
  );

CREATE POLICY "roles_update_org" ON public.roles
  FOR UPDATE TO authenticated
  USING (
    public.get_user_role() IN ('owner', 'managing_partner')
    AND EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.id = roles.user_id
        AND up.organization_id = public.get_user_organization_id()
    )
  );

CREATE POLICY "roles_delete_org" ON public.roles
  FOR DELETE TO authenticated
  USING (
    public.get_user_role() IN ('owner', 'managing_partner')
    AND EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.id = roles.user_id
        AND up.organization_id = public.get_user_organization_id()
    )
  );

