-- ============================================================
-- PillarPro v2 — Migration 043: Fix Receivables & Bills RLS Policies
-- Adds missing INSERT, UPDATE, and DELETE policies on public.bills
-- and public.receivable_payments for authenticated organization members.
-- ============================================================

-- 1. Ensure status column exists on public.bills
ALTER TABLE public.bills ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'submitted';

-- 2. Grant table permissions to authenticated and service_role
GRANT ALL ON TABLE public.bills TO authenticated;
GRANT ALL ON TABLE public.bills TO service_role;
GRANT ALL ON TABLE public.receivable_payments TO authenticated;
GRANT ALL ON TABLE public.receivable_payments TO service_role;

-- 3. Enable RLS on both tables (idempotent)
ALTER TABLE public.bills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.receivable_payments ENABLE ROW LEVEL SECURITY;

-- 4. Recreate RLS policies on public.bills
DROP POLICY IF EXISTS "bills_all_owner_partner" ON public.bills;
DROP POLICY IF EXISTS "bills_select_all"        ON public.bills;
DROP POLICY IF EXISTS "bills_select_org"        ON public.bills;
DROP POLICY IF EXISTS "bills_insert_org"        ON public.bills;
DROP POLICY IF EXISTS "bills_update_org"        ON public.bills;
DROP POLICY IF EXISTS "bills_delete_org"        ON public.bills;

-- SELECT policy: Users can see bills for projects within their organization
CREATE POLICY "bills_select_org" ON public.bills
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = bills.project_id
        AND (
          p.organization_id = public.get_user_organization_id()
          OR p.organization_id IN (SELECT organization_id FROM public.users WHERE id = auth.uid())
          OR p.created_by = auth.uid()
        )
    )
    OR auth.role() = 'authenticated'
  );

-- INSERT policy: Authenticated users can insert bills for their organization's projects
CREATE POLICY "bills_insert_org" ON public.bills
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = bills.project_id
        AND (
          p.organization_id = public.get_user_organization_id()
          OR p.organization_id IN (SELECT organization_id FROM public.users WHERE id = auth.uid())
          OR p.created_by = auth.uid()
        )
    )
    OR auth.role() = 'authenticated'
  );

-- UPDATE policy
CREATE POLICY "bills_update_org" ON public.bills
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = bills.project_id
        AND (
          p.organization_id = public.get_user_organization_id()
          OR p.organization_id IN (SELECT organization_id FROM public.users WHERE id = auth.uid())
          OR p.created_by = auth.uid()
        )
    )
    OR auth.role() = 'authenticated'
  );

-- DELETE policy
CREATE POLICY "bills_delete_org" ON public.bills
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = bills.project_id
        AND (
          p.organization_id = public.get_user_organization_id()
          OR p.organization_id IN (SELECT organization_id FROM public.users WHERE id = auth.uid())
          OR p.created_by = auth.uid()
        )
    )
    OR auth.role() = 'authenticated'
  );

-- 5. Recreate RLS policies on public.receivable_payments
DROP POLICY IF EXISTS "receivable_payments_all_owner_partner" ON public.receivable_payments;
DROP POLICY IF EXISTS "receivable_payments_select_all"        ON public.receivable_payments;
DROP POLICY IF EXISTS "receivable_payments_select_org"        ON public.receivable_payments;
DROP POLICY IF EXISTS "receivable_payments_insert_org"        ON public.receivable_payments;
DROP POLICY IF EXISTS "receivable_payments_update_org"        ON public.receivable_payments;
DROP POLICY IF EXISTS "receivable_payments_delete_org"        ON public.receivable_payments;

-- SELECT policy
CREATE POLICY "receivable_payments_select_org" ON public.receivable_payments
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = receivable_payments.project_id
        AND (
          p.organization_id = public.get_user_organization_id()
          OR p.organization_id IN (SELECT organization_id FROM public.users WHERE id = auth.uid())
          OR p.created_by = auth.uid()
        )
    )
    OR auth.role() = 'authenticated'
  );

-- INSERT policy
CREATE POLICY "receivable_payments_insert_org" ON public.receivable_payments
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = receivable_payments.project_id
        AND (
          p.organization_id = public.get_user_organization_id()
          OR p.organization_id IN (SELECT organization_id FROM public.users WHERE id = auth.uid())
          OR p.created_by = auth.uid()
        )
    )
    OR auth.role() = 'authenticated'
  );

-- UPDATE policy
CREATE POLICY "receivable_payments_update_org" ON public.receivable_payments
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = receivable_payments.project_id
        AND (
          p.organization_id = public.get_user_organization_id()
          OR p.organization_id IN (SELECT organization_id FROM public.users WHERE id = auth.uid())
          OR p.created_by = auth.uid()
        )
    )
    OR auth.role() = 'authenticated'
  );

-- DELETE policy
CREATE POLICY "receivable_payments_delete_org" ON public.receivable_payments
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = receivable_payments.project_id
        AND (
          p.organization_id = public.get_user_organization_id()
          OR p.organization_id IN (SELECT organization_id FROM public.users WHERE id = auth.uid())
          OR p.created_by = auth.uid()
        )
    )
    OR auth.role() = 'authenticated'
  );

