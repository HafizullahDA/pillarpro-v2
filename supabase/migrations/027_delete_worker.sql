-- ============================================================
-- PillarPro v2 — Migration 027: Worker Deletion & Cascade Clean
-- Enables Owners and Partners to delete workers safely.
-- 1. Updates foreign key on attendance to ON DELETE CASCADE
-- 2. Grants DELETE RLS policy to owner and partner
-- 3. Atomic delete_worker RPC with role & org validation
-- ============================================================

-- 1. Update foreign key on attendance to ON DELETE CASCADE
ALTER TABLE public.attendance
  DROP CONSTRAINT IF EXISTS attendance_worker_id_fkey,
  ADD CONSTRAINT attendance_worker_id_fkey
    FOREIGN KEY (worker_id) REFERENCES public.workers(id) ON DELETE CASCADE;

-- 2. Update DELETE policy on workers
DROP POLICY IF EXISTS "workers_delete_owner" ON public.workers;
DROP POLICY IF EXISTS "workers_delete_org"   ON public.workers;

CREATE POLICY "workers_delete_org" ON public.workers
  FOR DELETE TO authenticated
  USING (
    organization_id = public.get_user_organization_id()
    AND public.get_user_role() IN ('owner', 'partner', 'managing_partner')
  );

-- 3. Atomic deletion RPC with role & org scoping
CREATE OR REPLACE FUNCTION public.delete_worker(p_worker_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_role TEXT;
  v_user_org_id UUID;
  v_worker_org_id UUID;
BEGIN
  -- Strict server-side role check
  v_role := public.get_user_role();
  IF v_role NOT IN ('owner', 'partner', 'managing_partner') THEN
    RAISE EXCEPTION 'Unauthorized: Only Owner or Partner can delete workers.';
  END IF;

  v_user_org_id := public.get_user_organization_id();

  -- Verify worker belongs to caller's organization
  SELECT organization_id INTO v_worker_org_id
  FROM public.workers
  WHERE id = p_worker_id;

  IF v_worker_org_id IS NOT NULL AND v_user_org_id IS NOT NULL AND v_worker_org_id <> v_user_org_id THEN
    RAISE EXCEPTION 'Unauthorized: Cannot delete worker from another organization.';
  END IF;

  -- Delete attendance records
  DELETE FROM public.attendance WHERE worker_id = p_worker_id;

  -- Delete wage ledger payments if any
  DELETE FROM public.wage_payments WHERE worker_id = p_worker_id;

  -- Delete worker project assignments if any
  DELETE FROM public.worker_project_assignments WHERE worker_id = p_worker_id;

  -- Delete worker
  DELETE FROM public.workers WHERE id = p_worker_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.delete_worker(UUID) TO authenticated;

