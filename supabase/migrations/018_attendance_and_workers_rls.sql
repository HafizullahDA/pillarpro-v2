-- ============================================================
-- PillarPro v2 — Migration 018: Attendance & Workers RLS Fix
-- 1. Updates user_has_project_access to include 'partner'
-- 2. Grants Site Supervisors permission to insert new workers
-- 3. Grants Site Supervisors permission to update attendance records
--    (required for .upsert() DO UPDATE on existing records)
-- ============================================================

-- 1. Ensure user_has_project_access includes 'partner'
CREATE OR REPLACE FUNCTION public.user_has_project_access(p_project_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT CASE
    WHEN (SELECT role FROM public.roles WHERE user_id = auth.uid())
         IN ('owner', 'managing_partner', 'partner')
    THEN TRUE
    ELSE EXISTS (
      SELECT 1 FROM public.project_members
      WHERE project_id = p_project_id AND user_id = auth.uid()
    )
  END
$$;

-- 2. Workers Table RLS
DROP POLICY IF EXISTS "workers_insert_owner_partner" ON public.workers;
DROP POLICY IF EXISTS "workers_insert_all"           ON public.workers;
DROP POLICY IF EXISTS "workers_all_owner_partner"    ON public.workers;

-- Allow Owner, Partner, Managing Partner, and Site Supervisor to insert workers
CREATE POLICY "workers_insert_all" ON public.workers
  FOR INSERT TO authenticated
  WITH CHECK (
    public.get_user_role() IN ('owner', 'partner', 'managing_partner', 'site_supervisor')
  );

-- Allow Owner, Partner, Managing Partner full management (update / delete)
CREATE POLICY "workers_all_owner_partner" ON public.workers
  FOR ALL TO authenticated
  USING (
    public.get_user_role() IN ('owner', 'partner', 'managing_partner')
  );

-- 3. Attendance Table RLS
DROP POLICY IF EXISTS "attendance_update_all"        ON public.attendance;
DROP POLICY IF EXISTS "attendance_all_owner_partner" ON public.attendance;

-- Allow Site Supervisors (with project access), Owner, and Partners to update attendance
CREATE POLICY "attendance_update_all" ON public.attendance
  FOR UPDATE TO authenticated
  USING (
    public.get_user_role() IN ('owner', 'partner', 'managing_partner')
    OR (
      public.get_user_role() = 'site_supervisor'
      AND public.user_has_project_access(project_id)
    )
  )
  WITH CHECK (
    public.get_user_role() IN ('owner', 'partner', 'managing_partner')
    OR (
      public.get_user_role() = 'site_supervisor'
      AND public.user_has_project_access(project_id)
    )
  );

-- Allow Owner and Partners full management on attendance
CREATE POLICY "attendance_all_owner_partner" ON public.attendance
  FOR ALL TO authenticated
  USING (
    public.get_user_role() IN ('owner', 'partner', 'managing_partner')
  );

