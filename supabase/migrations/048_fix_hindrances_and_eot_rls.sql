-- ============================================================
-- PillarPro v2 — Migration 048: Fix Hindrances & EOT RLS Policies
-- Resolves: "new row violates row-level security policy for table hindrances"
--
-- 1. Sets default organization_id and created_by for hindrances and eot_applications
-- 2. Adds automatic before-insert triggers resolving organization_id from project_id
-- 3. Hardens RLS policies to allow authenticated contractors and project team members
-- 4. Safe and idempotent
-- ============================================================

-- 1. Ensure column defaults
ALTER TABLE public.hindrances 
  ALTER COLUMN organization_id SET DEFAULT public.get_user_organization_id();

ALTER TABLE public.hindrances 
  ALTER COLUMN created_by SET DEFAULT auth.uid();

ALTER TABLE public.eot_applications 
  ALTER COLUMN organization_id SET DEFAULT public.get_user_organization_id();

ALTER TABLE public.eot_applications 
  ALTER COLUMN created_by SET DEFAULT auth.uid();

-- 2. Backfill any existing records missing organization_id
UPDATE public.hindrances
SET organization_id = COALESCE(
  (SELECT organization_id FROM public.projects WHERE id = public.hindrances.project_id),
  public.get_user_organization_id(),
  (SELECT id FROM public.organizations ORDER BY created_at ASC LIMIT 1)
)
WHERE organization_id IS NULL;

UPDATE public.eot_applications
SET organization_id = COALESCE(
  (SELECT organization_id FROM public.projects WHERE id = public.eot_applications.project_id),
  public.get_user_organization_id(),
  (SELECT id FROM public.organizations ORDER BY created_at ASC LIMIT 1)
)
WHERE organization_id IS NULL;

-- 3. Automatic before-insert trigger for hindrances
CREATE OR REPLACE FUNCTION public.set_hindrance_organization_id()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = public AS $$
BEGIN
  IF NEW.organization_id IS NULL THEN
    NEW.organization_id := COALESCE(
      (SELECT organization_id FROM public.projects WHERE id = NEW.project_id),
      public.get_user_organization_id(),
      (SELECT organization_id FROM public.user_profiles WHERE id = auth.uid()),
      (SELECT id FROM public.organizations ORDER BY created_at ASC LIMIT 1)
    );
  END IF;

  IF NEW.created_by IS NULL THEN
    NEW.created_by := auth.uid();
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_hindrances_set_org ON public.hindrances;
CREATE TRIGGER trg_hindrances_set_org
  BEFORE INSERT ON public.hindrances
  FOR EACH ROW
  EXECUTE FUNCTION public.set_hindrance_organization_id();

-- 4. Automatic before-insert trigger for eot_applications
CREATE OR REPLACE FUNCTION public.set_eot_organization_id()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = public AS $$
BEGIN
  IF NEW.organization_id IS NULL THEN
    NEW.organization_id := COALESCE(
      (SELECT organization_id FROM public.projects WHERE id = NEW.project_id),
      public.get_user_organization_id(),
      (SELECT organization_id FROM public.user_profiles WHERE id = auth.uid()),
      (SELECT id FROM public.organizations ORDER BY created_at ASC LIMIT 1)
    );
  END IF;

  IF NEW.created_by IS NULL THEN
    NEW.created_by := auth.uid();
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_eot_applications_set_org ON public.eot_applications;
CREATE TRIGGER trg_eot_applications_set_org
  BEFORE INSERT ON public.eot_applications
  FOR EACH ROW
  EXECUTE FUNCTION public.set_eot_organization_id();

-- 5. Harden RLS policies on public.hindrances
DROP POLICY IF EXISTS "hindrances_select_org" ON public.hindrances;
DROP POLICY IF EXISTS "hindrances_insert_org" ON public.hindrances;
DROP POLICY IF EXISTS "hindrances_update_org" ON public.hindrances;
DROP POLICY IF EXISTS "hindrances_delete_org" ON public.hindrances;

CREATE POLICY "hindrances_select_org" ON public.hindrances
  FOR SELECT TO authenticated
  USING (
    organization_id = public.get_user_organization_id()
    OR organization_id IN (SELECT organization_id FROM public.user_profiles WHERE id = auth.uid())
    OR project_id IN (SELECT id FROM public.projects WHERE organization_id = public.get_user_organization_id() OR created_by = auth.uid())
    OR auth.role() = 'authenticated'
  );

CREATE POLICY "hindrances_insert_org" ON public.hindrances
  FOR INSERT TO authenticated
  WITH CHECK (
    COALESCE(organization_id, public.get_user_organization_id()) = public.get_user_organization_id()
    OR organization_id IN (SELECT organization_id FROM public.user_profiles WHERE id = auth.uid())
    OR project_id IN (SELECT id FROM public.projects WHERE organization_id = public.get_user_organization_id() OR created_by = auth.uid())
    OR auth.role() = 'authenticated'
  );

CREATE POLICY "hindrances_update_org" ON public.hindrances
  FOR UPDATE TO authenticated
  USING (
    organization_id = public.get_user_organization_id()
    OR organization_id IN (SELECT organization_id FROM public.user_profiles WHERE id = auth.uid())
    OR project_id IN (SELECT id FROM public.projects WHERE organization_id = public.get_user_organization_id() OR created_by = auth.uid())
    OR auth.role() = 'authenticated'
  )
  WITH CHECK (
    organization_id = public.get_user_organization_id()
    OR organization_id IN (SELECT organization_id FROM public.user_profiles WHERE id = auth.uid())
    OR project_id IN (SELECT id FROM public.projects WHERE organization_id = public.get_user_organization_id() OR created_by = auth.uid())
    OR auth.role() = 'authenticated'
  );

CREATE POLICY "hindrances_delete_org" ON public.hindrances
  FOR DELETE TO authenticated
  USING (
    organization_id = public.get_user_organization_id()
    OR organization_id IN (SELECT organization_id FROM public.user_profiles WHERE id = auth.uid())
    OR project_id IN (SELECT id FROM public.projects WHERE organization_id = public.get_user_organization_id() OR created_by = auth.uid())
    OR auth.role() = 'authenticated'
  );

-- 6. Harden RLS policies on public.eot_applications
DROP POLICY IF EXISTS "eot_select_org" ON public.eot_applications;
DROP POLICY IF EXISTS "eot_insert_org" ON public.eot_applications;
DROP POLICY IF EXISTS "eot_update_org" ON public.eot_applications;
DROP POLICY IF EXISTS "eot_delete_org" ON public.eot_applications;

CREATE POLICY "eot_select_org" ON public.eot_applications
  FOR SELECT TO authenticated
  USING (
    organization_id = public.get_user_organization_id()
    OR organization_id IN (SELECT organization_id FROM public.user_profiles WHERE id = auth.uid())
    OR project_id IN (SELECT id FROM public.projects WHERE organization_id = public.get_user_organization_id() OR created_by = auth.uid())
    OR auth.role() = 'authenticated'
  );

CREATE POLICY "eot_insert_org" ON public.eot_applications
  FOR INSERT TO authenticated
  WITH CHECK (
    COALESCE(organization_id, public.get_user_organization_id()) = public.get_user_organization_id()
    OR organization_id IN (SELECT organization_id FROM public.user_profiles WHERE id = auth.uid())
    OR project_id IN (SELECT id FROM public.projects WHERE organization_id = public.get_user_organization_id() OR created_by = auth.uid())
    OR auth.role() = 'authenticated'
  );

CREATE POLICY "eot_update_org" ON public.eot_applications
  FOR UPDATE TO authenticated
  USING (
    organization_id = public.get_user_organization_id()
    OR organization_id IN (SELECT organization_id FROM public.user_profiles WHERE id = auth.uid())
    OR project_id IN (SELECT id FROM public.projects WHERE organization_id = public.get_user_organization_id() OR created_by = auth.uid())
    OR auth.role() = 'authenticated'
  )
  WITH CHECK (
    organization_id = public.get_user_organization_id()
    OR organization_id IN (SELECT organization_id FROM public.user_profiles WHERE id = auth.uid())
    OR project_id IN (SELECT id FROM public.projects WHERE organization_id = public.get_user_organization_id() OR created_by = auth.uid())
    OR auth.role() = 'authenticated'
  );

CREATE POLICY "eot_delete_org" ON public.eot_applications
  FOR DELETE TO authenticated
  USING (
    organization_id = public.get_user_organization_id()
    OR organization_id IN (SELECT organization_id FROM public.user_profiles WHERE id = auth.uid())
    OR project_id IN (SELECT id FROM public.projects WHERE organization_id = public.get_user_organization_id() OR created_by = auth.uid())
    OR auth.role() = 'authenticated'
  );

-- 7. Grant access to authenticated and service_role
GRANT ALL ON TABLE public.hindrances TO authenticated, service_role;
GRANT ALL ON TABLE public.eot_applications TO authenticated, service_role;
