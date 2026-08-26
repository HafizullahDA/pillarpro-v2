-- ============================================================
-- PillarPro v2 — Migration 004: Fix RLS SELECT Policies for Owner Visibility
-- Ensures owners can view all user profiles & roles, while regular users see their own.
-- ============================================================

-- 1. Ensure get_user_role() is strictly PL/pgSQL SECURITY DEFINER to prevent query-inlining
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS TEXT LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_role TEXT;
BEGIN
  SELECT role::TEXT INTO v_role FROM public.roles WHERE user_id = auth.uid() LIMIT 1;
  RETURN v_role;
END;
$$;

-- 2. Update SELECT policies on user_profiles
DROP POLICY IF EXISTS "profiles_select_own"   ON public.user_profiles;
DROP POLICY IF EXISTS "profiles_select_owner" ON public.user_profiles;
DROP POLICY IF EXISTS "profiles_select"       ON public.user_profiles;

CREATE POLICY "profiles_select" ON public.user_profiles
  FOR SELECT TO authenticated
  USING (
    id = auth.uid()
    OR public.get_user_role() = 'owner'
  );

-- 3. Update SELECT policies on roles
DROP POLICY IF EXISTS "roles_select_own"   ON public.roles;
DROP POLICY IF EXISTS "roles_select_owner" ON public.roles;
DROP POLICY IF EXISTS "roles_select"       ON public.roles;

CREATE POLICY "roles_select" ON public.roles
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR public.get_user_role() = 'owner'
  );
