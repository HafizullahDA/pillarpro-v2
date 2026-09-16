-- ============================================================
-- PillarPro v2 — Migration 026: Workers Organization Default & RLS Hardening
-- Ensures worker records inherit organization_id automatically on insert,
-- preventing RLS insertion rejections when organization_id is omitted.
-- ============================================================

-- 1. Ensure column exists and set default to get_user_organization_id()
ALTER TABLE public.workers 
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id);

ALTER TABLE public.workers 
  ALTER COLUMN organization_id SET DEFAULT public.get_user_organization_id();

-- 2. Backfill any existing workers missing organization_id to fallback organization
UPDATE public.workers
SET organization_id = (
  SELECT id FROM public.organizations ORDER BY created_at ASC LIMIT 1
)
WHERE organization_id IS NULL;

-- 3. Trigger to guarantee organization_id is never NULL on insert
CREATE OR REPLACE FUNCTION public.set_worker_organization_id()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = public AS $$
BEGIN
  IF NEW.organization_id IS NULL THEN
    NEW.organization_id := public.get_user_organization_id();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_workers_set_org ON public.workers;
CREATE TRIGGER trg_workers_set_org
  BEFORE INSERT ON public.workers
  FOR EACH ROW
  EXECUTE FUNCTION public.set_worker_organization_id();

-- 4. Harden workers RLS policies
DROP POLICY IF EXISTS "workers_select_all"           ON public.workers;
DROP POLICY IF EXISTS "workers_select_owner_partner" ON public.workers;
DROP POLICY IF EXISTS "workers_select_supervisor"    ON public.workers;
DROP POLICY IF EXISTS "workers_insert_all"           ON public.workers;
DROP POLICY IF EXISTS "workers_all_owner_partner"    ON public.workers;
DROP POLICY IF EXISTS "workers_select_org"          ON public.workers;
DROP POLICY IF EXISTS "workers_insert_org"          ON public.workers;
DROP POLICY IF EXISTS "workers_update_owner_partner" ON public.workers;
DROP POLICY IF EXISTS "workers_update_org"           ON public.workers;
DROP POLICY IF EXISTS "workers_delete_owner"         ON public.workers;
DROP POLICY IF EXISTS "workers_delete_org"           ON public.workers;

-- SELECT: authenticated org members
CREATE POLICY "workers_select_org" ON public.workers
  FOR SELECT TO authenticated
  USING (
    organization_id = public.get_user_organization_id()
    AND public.get_user_role() IN ('owner', 'partner', 'managing_partner', 'accountant', 'viewer', 'site_supervisor')
  );

-- INSERT: owner, partner, managing_partner, site_supervisor
CREATE POLICY "workers_insert_org" ON public.workers
  FOR INSERT TO authenticated
  WITH CHECK (
    COALESCE(organization_id, public.get_user_organization_id()) = public.get_user_organization_id()
    AND public.get_user_role() IN ('owner', 'partner', 'managing_partner', 'site_supervisor')
  );

-- UPDATE: owner, partner, managing_partner, site_supervisor
CREATE POLICY "workers_update_org" ON public.workers
  FOR UPDATE TO authenticated
  USING (
    organization_id = public.get_user_organization_id()
    AND public.get_user_role() IN ('owner', 'partner', 'managing_partner', 'site_supervisor')
  )
  WITH CHECK (
    organization_id = public.get_user_organization_id()
    AND public.get_user_role() IN ('owner', 'partner', 'managing_partner', 'site_supervisor')
  );

-- DELETE: owner, partner, managing_partner
CREATE POLICY "workers_delete_org" ON public.workers
  FOR DELETE TO authenticated
  USING (
    organization_id = public.get_user_organization_id()
    AND public.get_user_role() IN ('owner', 'partner', 'managing_partner')
  );

