-- ============================================================
-- PillarPro v2 — Migration 017: Expand User Roles & Centralized RBAC
-- Adds 'partner', 'accountant', and 'viewer' to user_role enum
-- and updates RLS policies to reflect the permissions matrix.
-- ============================================================

-- 1. Expand public.user_role enum
ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'partner';
ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'accountant';
ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'viewer';

-- 2. Projects RLS
DROP POLICY IF EXISTS "projects_select_owner_partner" ON public.projects;
DROP POLICY IF EXISTS "projects_select_supervisor"    ON public.projects;
DROP POLICY IF EXISTS "projects_select_all"           ON public.projects;

CREATE POLICY "projects_select_all" ON public.projects
  FOR SELECT TO authenticated
  USING (
    public.get_user_role() IN ('owner', 'partner', 'managing_partner', 'accountant', 'viewer')
    OR (
      public.get_user_role() = 'site_supervisor'
      AND public.user_has_project_access(id)
    )
  );

-- 3. Expenses RLS
DROP POLICY IF EXISTS "expenses_select_owner_partner" ON public.expenses;
DROP POLICY IF EXISTS "expenses_select_supervisor"    ON public.expenses;
DROP POLICY IF EXISTS "expenses_select_all"           ON public.expenses;
DROP POLICY IF EXISTS "expenses_insert_owner_partner" ON public.expenses;
DROP POLICY IF EXISTS "expenses_insert_supervisor"    ON public.expenses;
DROP POLICY IF EXISTS "expenses_insert_all"           ON public.expenses;

CREATE POLICY "expenses_select_all" ON public.expenses
  FOR SELECT TO authenticated
  USING (
    public.get_user_role() IN ('owner', 'partner', 'managing_partner', 'accountant', 'viewer')
    OR (
      public.get_user_role() = 'site_supervisor'
      AND (project_id IS NULL OR public.user_has_project_access(project_id))
    )
  );

CREATE POLICY "expenses_insert_all" ON public.expenses
  FOR INSERT TO authenticated
  WITH CHECK (
    public.get_user_role() IN ('owner', 'partner', 'managing_partner', 'accountant')
    OR (
      public.get_user_role() = 'site_supervisor'
      AND (project_id IS NULL OR public.user_has_project_access(project_id))
    )
  );

-- 4. Suppliers RLS
DROP POLICY IF EXISTS "suppliers_all_owner_partner"    ON public.suppliers;
DROP POLICY IF EXISTS "suppliers_select_owner_partner" ON public.suppliers;
DROP POLICY IF EXISTS "suppliers_select_supervisor"    ON public.suppliers;
DROP POLICY IF EXISTS "suppliers_select_all"           ON public.suppliers;
DROP POLICY IF EXISTS "suppliers_insert_owner_partner" ON public.suppliers;
DROP POLICY IF EXISTS "suppliers_insert_all"           ON public.suppliers;
DROP POLICY IF EXISTS "suppliers_update_owner_partner" ON public.suppliers;
DROP POLICY IF EXISTS "suppliers_update_all"           ON public.suppliers;

CREATE POLICY "suppliers_select_all" ON public.suppliers
  FOR SELECT TO authenticated
  USING (
    public.get_user_role() IN ('owner', 'partner', 'managing_partner', 'accountant', 'viewer', 'site_supervisor')
  );

CREATE POLICY "suppliers_insert_all" ON public.suppliers
  FOR INSERT TO authenticated
  WITH CHECK (
    public.get_user_role() IN ('owner', 'partner', 'managing_partner', 'accountant')
  );

CREATE POLICY "suppliers_update_all" ON public.suppliers
  FOR UPDATE TO authenticated
  USING (
    public.get_user_role() IN ('owner', 'partner', 'managing_partner', 'accountant')
  );

-- 5. Supplier Transactions Ledger RLS (Procurements & Payments)
DROP POLICY IF EXISTS "supplier_tx_all_owner_partner" ON public.supplier_transactions;
DROP POLICY IF EXISTS "supplier_tx_select_supervisor" ON public.supplier_transactions;
DROP POLICY IF EXISTS "supplier_tx_insert_supervisor" ON public.supplier_transactions;
DROP POLICY IF EXISTS "supplier_tx_select_all"        ON public.supplier_transactions;
DROP POLICY IF EXISTS "supplier_tx_insert_all"        ON public.supplier_transactions;

CREATE POLICY "supplier_tx_select_all" ON public.supplier_transactions
  FOR SELECT TO authenticated
  USING (
    public.get_user_role() IN ('owner', 'partner', 'managing_partner', 'accountant', 'viewer')
    OR (
      public.get_user_role() = 'site_supervisor'
      AND (project_id IS NULL OR public.user_has_project_access(project_id))
    )
  );

CREATE POLICY "supplier_tx_insert_all" ON public.supplier_transactions
  FOR INSERT TO authenticated
  WITH CHECK (
    public.get_user_role() IN ('owner', 'partner', 'managing_partner', 'accountant')
    OR (
      public.get_user_role() = 'site_supervisor'
      AND (project_id IS NULL OR public.user_has_project_access(project_id))
      AND transaction_type = 'procurement'
    )
  );

-- 6. RA Bills, Bill Payments & Bill Deductions RLS
DROP POLICY IF EXISTS "ra_bills_select_owner_partner" ON public.ra_bills;
DROP POLICY IF EXISTS "ra_bills_select_supervisor"    ON public.ra_bills;
DROP POLICY IF EXISTS "ra_bills_select_all"           ON public.ra_bills;
DROP POLICY IF EXISTS "ra_bills_insert_all"           ON public.ra_bills;

CREATE POLICY "ra_bills_select_all" ON public.ra_bills
  FOR SELECT TO authenticated
  USING (
    public.get_user_role() IN ('owner', 'partner', 'managing_partner', 'accountant', 'viewer')
    OR (
      public.get_user_role() = 'site_supervisor'
      AND public.user_has_project_access(project_id)
    )
  );

CREATE POLICY "ra_bills_insert_all" ON public.ra_bills
  FOR INSERT TO authenticated
  WITH CHECK (
    public.get_user_role() IN ('owner', 'partner', 'managing_partner', 'accountant')
  );

DROP POLICY IF EXISTS "ra_payments_all_owner_partner" ON public.ra_bill_payments;
DROP POLICY IF EXISTS "ra_payments_select_supervisor" ON public.ra_bill_payments;
DROP POLICY IF EXISTS "ra_payments_select_all"        ON public.ra_bill_payments;
DROP POLICY IF EXISTS "ra_payments_insert_all"        ON public.ra_bill_payments;

CREATE POLICY "ra_payments_select_all" ON public.ra_bill_payments
  FOR SELECT TO authenticated
  USING (
    public.get_user_role() IN ('owner', 'partner', 'managing_partner', 'accountant', 'viewer')
    OR (
      public.get_user_role() = 'site_supervisor'
      AND (project_id IS NULL OR public.user_has_project_access(project_id))
    )
  );

CREATE POLICY "ra_payments_insert_all" ON public.ra_bill_payments
  FOR INSERT TO authenticated
  WITH CHECK (
    public.get_user_role() IN ('owner', 'partner', 'managing_partner', 'accountant')
  );

DROP POLICY IF EXISTS "bill_deductions_all_owner_partner" ON public.bill_deductions;
DROP POLICY IF EXISTS "bill_deductions_select_supervisor" ON public.bill_deductions;
DROP POLICY IF EXISTS "bill_deductions_select_all"        ON public.bill_deductions;
DROP POLICY IF EXISTS "bill_deductions_insert_all"        ON public.bill_deductions;

CREATE POLICY "bill_deductions_select_all" ON public.bill_deductions
  FOR SELECT TO authenticated
  USING (
    public.get_user_role() IN ('owner', 'partner', 'managing_partner', 'accountant', 'viewer', 'site_supervisor')
  );

CREATE POLICY "bill_deductions_insert_all" ON public.bill_deductions
  FOR INSERT TO authenticated
  WITH CHECK (
    public.get_user_role() IN ('owner', 'partner', 'managing_partner', 'accountant')
  );

-- 7. Workers & Attendance RLS
DROP POLICY IF EXISTS "workers_select_owner_partner" ON public.workers;
DROP POLICY IF EXISTS "workers_select_supervisor"    ON public.workers;
DROP POLICY IF EXISTS "workers_select_all"           ON public.workers;

CREATE POLICY "workers_select_all" ON public.workers
  FOR SELECT TO authenticated
  USING (
    public.get_user_role() IN ('owner', 'partner', 'managing_partner', 'accountant', 'viewer', 'site_supervisor')
  );

DROP POLICY IF EXISTS "attendance_select_all" ON public.attendance;
DROP POLICY IF EXISTS "attendance_insert_all" ON public.attendance;

CREATE POLICY "attendance_select_all" ON public.attendance
  FOR SELECT TO authenticated
  USING (
    public.get_user_role() IN ('owner', 'partner', 'managing_partner', 'accountant', 'viewer')
    OR (
      public.get_user_role() = 'site_supervisor'
      AND public.user_has_project_access(project_id)
    )
  );

CREATE POLICY "attendance_insert_all" ON public.attendance
  FOR INSERT TO authenticated
  WITH CHECK (
    public.get_user_role() IN ('owner', 'partner', 'managing_partner')
    OR (
      public.get_user_role() = 'site_supervisor'
      AND public.user_has_project_access(project_id)
    )
  );
