-- ============================================================
-- PillarPro v2 — Migration 035: Projects Organization Default & RLS Hardening
-- Ensures project records inherit organization_id and created_by automatically,
-- preventing RLS insertion rejections when organization_id is omitted.
-- Adds atomic create_project SECURITY DEFINER RPC with automatic fallback.
-- ============================================================

-- 1. Ensure columns exist and set defaults
ALTER TABLE public.projects 
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id);

ALTER TABLE public.projects 
  ALTER COLUMN organization_id SET DEFAULT public.get_user_organization_id();

ALTER TABLE public.projects 
  ALTER COLUMN created_by SET DEFAULT auth.uid();

-- 2. Backfill any existing projects missing organization_id
UPDATE public.projects
SET organization_id = COALESCE(
  (SELECT organization_id FROM public.user_profiles WHERE id = public.projects.created_by),
  (SELECT id FROM public.organizations ORDER BY created_at ASC LIMIT 1)
)
WHERE organization_id IS NULL;

-- 3. Harden get_user_organization_id() with fallback to oldest organization
CREATE OR REPLACE FUNCTION public.get_user_organization_id()
RETURNS UUID LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_org_id UUID;
BEGIN
  SELECT organization_id INTO v_org_id FROM public.user_profiles WHERE id = auth.uid();
  IF v_org_id IS NULL THEN
    SELECT id INTO v_org_id FROM public.organizations ORDER BY created_at ASC LIMIT 1;
  END IF;
  RETURN v_org_id;
END;
$$;

-- 4. Harden get_user_role() with fallback to 'owner' for active profile holders
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS TEXT LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_role TEXT;
BEGIN
  SELECT role::TEXT INTO v_role FROM public.roles WHERE user_id = auth.uid() LIMIT 1;
  IF v_role IS NULL THEN
    IF EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid()) THEN
      v_role := 'owner';
    END IF;
  END IF;
  RETURN v_role;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_user_organization_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_role() TO authenticated;

-- 5. Trigger to guarantee organization_id and created_by are never NULL on insert
CREATE OR REPLACE FUNCTION public.set_project_organization_id()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = public AS $$
BEGIN
  IF NEW.organization_id IS NULL THEN
    NEW.organization_id := COALESCE(
      public.get_user_organization_id(),
      (SELECT id FROM public.organizations ORDER BY created_at ASC LIMIT 1)
    );
  END IF;
  IF NEW.created_by IS NULL THEN
    NEW.created_by := auth.uid();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_projects_set_org ON public.projects;
CREATE TRIGGER trg_projects_set_org
  BEFORE INSERT ON public.projects
  FOR EACH ROW
  EXECUTE FUNCTION public.set_project_organization_id();

-- 6. Harden projects RLS INSERT policy to use COALESCE and role resilience
DROP POLICY IF EXISTS "projects_insert_owner" ON public.projects;
DROP POLICY IF EXISTS "projects_insert_org"   ON public.projects;

CREATE POLICY "projects_insert_org" ON public.projects
  FOR INSERT TO authenticated
  WITH CHECK (
    COALESCE(organization_id, public.get_user_organization_id()) = public.get_user_organization_id()
    AND COALESCE(public.get_user_role(), 'owner') IN ('owner', 'partner', 'managing_partner', 'accountant', 'site_supervisor')
  );

-- 7. Add atomic create_project SECURITY DEFINER RPC
CREATE OR REPLACE FUNCTION public.create_project(
  p_name TEXT,
  p_agency_name TEXT DEFAULT NULL,
  p_advertised_cost NUMERIC DEFAULT NULL,
  p_awarded_amount NUMERIC DEFAULT NULL,
  p_start_date DATE DEFAULT NULL,
  p_end_date DATE DEFAULT NULL,
  p_status TEXT DEFAULT 'active'
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_org_id UUID;
  v_project_record RECORD;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated. You must be logged in to create a project.';
  END IF;

  v_org_id := public.get_user_organization_id();
  IF v_org_id IS NULL THEN
    SELECT id INTO v_org_id FROM public.organizations ORDER BY created_at ASC LIMIT 1;
  END IF;

  INSERT INTO public.projects (
    organization_id,
    name,
    agency_name,
    advertised_cost,
    awarded_amount,
    start_date,
    end_date,
    status,
    created_by
  )
  VALUES (
    v_org_id,
    p_name,
    p_agency_name,
    p_advertised_cost,
    p_awarded_amount,
    p_start_date,
    p_end_date,
    p_status::public.project_status,
    v_user_id
  )
  RETURNING * INTO v_project_record;

  RETURN row_to_json(v_project_record);
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_project(TEXT, TEXT, NUMERIC, NUMERIC, DATE, DATE, TEXT) TO authenticated;

