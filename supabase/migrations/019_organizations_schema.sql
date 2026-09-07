-- ============================================================
-- PillarPro v2 — Migration 019: Organizations & Multi-Tenancy Foundation
-- 1. Creates public.organizations table
-- 2. Links user_profiles and projects to organization_id
-- 3. Seeds default organization and backfills existing rows
-- 4. Creates helper RPCs: get_user_organization_id(), get_organization_profile()
-- 5. Configures RLS policies on organizations
-- ============================================================

-- 1. Create public.organizations table
CREATE TABLE IF NOT EXISTS public.organizations (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name             TEXT NOT NULL,
  legal_name       TEXT,
  registration_no  TEXT, -- e.g. "Class-A Registered Contractor"
  gstin            TEXT,
  pan              TEXT,
  address          TEXT,
  phone            TEXT,
  email            TEXT,
  logo_url         TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Link user_profiles to organization_id
ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL;

-- 3. Link projects to organization_id
ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL;

-- 4. Seed default organization and backfill existing data
DO $$
DECLARE
  v_org_id UUID;
BEGIN
  SELECT id INTO v_org_id FROM public.organizations ORDER BY created_at ASC LIMIT 1;

  IF v_org_id IS NULL THEN
    INSERT INTO public.organizations (
      name,
      legal_name,
      registration_no,
      address,
      phone
    )
    VALUES (
      'Hafizullah Lone Constructions',
      'Hafizullah Lone Constructions & Infrastructure',
      'Class-A Govt Contractor, PWD / PMGSY',
      'Srinagar, Jammu & Kashmir',
      ''
    )
    RETURNING id INTO v_org_id;
  END IF;

  -- Backfill existing user_profiles
  UPDATE public.user_profiles
  SET organization_id = v_org_id
  WHERE organization_id IS NULL;

  -- Backfill existing projects
  UPDATE public.projects
  SET organization_id = v_org_id
  WHERE organization_id IS NULL;
END $$;

-- 5. Helper function: get_user_organization_id()
CREATE OR REPLACE FUNCTION public.get_user_organization_id()
RETURNS UUID LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT organization_id FROM public.user_profiles WHERE id = auth.uid();
$$;

-- 6. Helper function: get_organization_profile()
CREATE OR REPLACE FUNCTION public.get_organization_profile()
RETURNS json LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_org json;
BEGIN
  -- Look up org for current authenticated user
  SELECT json_build_object(
    'id', o.id,
    'name', o.name,
    'legal_name', o.legal_name,
    'registration_no', o.registration_no,
    'gstin', o.gstin,
    'pan', o.pan,
    'address', o.address,
    'phone', o.phone,
    'email', o.email,
    'logo_url', o.logo_url
  ) INTO v_org
  FROM public.organizations o
  JOIN public.user_profiles up ON up.organization_id = o.id
  WHERE up.id = auth.uid()
  LIMIT 1;

  -- Fallback to the first organization if user profile is not linked yet
  IF v_org IS NULL THEN
    SELECT json_build_object(
      'id', o.id,
      'name', o.name,
      'legal_name', o.legal_name,
      'registration_no', o.registration_no,
      'gstin', o.gstin,
      'pan', o.pan,
      'address', o.address,
      'phone', o.phone,
      'email', o.email,
      'logo_url', o.logo_url
    ) INTO v_org
    FROM public.organizations o
    ORDER BY o.created_at ASC
    LIMIT 1;
  END IF;

  RETURN v_org;
END;
$$;

-- 7. Configure RLS on organizations
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "organizations_select_member" ON public.organizations;
CREATE POLICY "organizations_select_member" ON public.organizations
  FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "organizations_update_owner"  ON public.organizations;
CREATE POLICY "organizations_update_owner" ON public.organizations
  FOR UPDATE TO authenticated
  USING (public.get_user_role() IN ('owner', 'managing_partner', 'partner'))
  WITH CHECK (public.get_user_role() IN ('owner', 'managing_partner', 'partner'));

DROP POLICY IF EXISTS "organizations_insert_owner"  ON public.organizations;
CREATE POLICY "organizations_insert_owner" ON public.organizations
  FOR INSERT TO authenticated
  WITH CHECK (true);

-- Grant authenticated table permissions
GRANT SELECT, INSERT, UPDATE ON public.organizations TO authenticated;

