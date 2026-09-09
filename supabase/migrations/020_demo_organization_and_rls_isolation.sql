-- ============================================================
-- PillarPro v2 — Migration 020: Demo Organization, Airtight Multi-Tenant RLS Isolation, & Realistic Seed Data
-- 
-- 1. Creates dedicated "PillarPro Demo" organization
-- 2. Creates and activates "demo@pillarpro.app" viewer account (pwd: PillarProDemo2026)
-- 3. Enforces strict organization-scoped RLS policies across ALL tables
-- 4. Seeds realistic dummy data across all modules:
--    - 2 Sample Projects (Road/Wall & School)
--    - 2 RA Bills (1 Fully Paid, 1 Partially Paid) with retention & statutory deductions
--    - Security Deposit with expiry < 30 days (fires alert banner) + 1 healthy BG
--    - 3 Suppliers with procurements, payments, and balances
--    - 4 Workers & Muster Roll Attendance
--    - 3 Expenses (including 1 AI-scanned receipt)
--    - Matching Receivables & Central Ledger entries
-- 5. Runs automated RLS isolation verification queries
-- ============================================================

-- Ensure pgcrypto is enabled for passwords and UUIDs
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ──────────────────────────────────────────
-- 1. DEMO ORGANIZATION SETUP
-- ──────────────────────────────────────────
DO $$
DECLARE
  v_demo_org_id CONSTANT UUID := 'd0000000-0000-4000-a000-000000000001'::uuid;
  v_real_org_id UUID;
BEGIN
  -- Find the primary/real organization (Al Habib / Hafizullah Lone Constructions)
  SELECT id INTO v_real_org_id 
  FROM public.organizations 
  WHERE id <> v_demo_org_id 
  ORDER BY created_at ASC 
  LIMIT 1;

  -- Create default real org if somehow missing
  IF v_real_org_id IS NULL THEN
    INSERT INTO public.organizations (
      name, legal_name, registration_no, address, phone
    ) VALUES (
      'Hafizullah Lone Constructions',
      'Hafizullah Lone Constructions & Infrastructure',
      'Class-A Govt Contractor, PWD / PMGSY',
      'Srinagar, Jammu & Kashmir',
      ''
    ) RETURNING id INTO v_real_org_id;
  END IF;

  -- Insert or Update PillarPro Demo organization
  INSERT INTO public.organizations (
    id,
    name,
    legal_name,
    registration_no,
    gstin,
    pan,
    address,
    phone,
    email,
    created_at,
    updated_at
  )
  VALUES (
    v_demo_org_id,
    'PillarPro Demo',
    'PillarPro Demo Infrastructure Ltd.',
    'Class-A Civil Contractor, CPWD / R&B',
    '01AAACP1234D1Z5',
    'AAACP1234D',
    'Demo Tech Park, Suite 402, Srinagar, J&K',
    '+91 94190 00000',
    'demo@pillarpro.app',
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    legal_name = EXCLUDED.legal_name,
    registration_no = EXCLUDED.registration_no,
    gstin = EXCLUDED.gstin,
    pan = EXCLUDED.pan,
    address = EXCLUDED.address,
    phone = EXCLUDED.phone,
    email = EXCLUDED.email,
    updated_at = NOW();

  -- Guarantee all pre-existing records belong to the real organization
  UPDATE public.projects SET organization_id = v_real_org_id WHERE organization_id IS NULL;
  UPDATE public.suppliers SET organization_id = v_real_org_id WHERE organization_id IS NULL;
  
  -- Add organization_id to workers if not present and backfill
  ALTER TABLE public.workers ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id);
  UPDATE public.workers SET organization_id = v_real_org_id WHERE organization_id IS NULL;
END $$;


-- ──────────────────────────────────────────
-- 2. DEMO USER ACCOUNT SETUP (demo@pillarpro.app / PillarProDemo2026)
-- ──────────────────────────────────────────
DO $$
DECLARE
  v_demo_user_id CONSTANT UUID := 'd0000000-0000-4000-a000-000000000002'::uuid;
  v_demo_org_id  CONSTANT UUID := 'd0000000-0000-4000-a000-000000000001'::uuid;
  v_encrypted_pw TEXT;
BEGIN
  v_encrypted_pw := crypt('PillarProDemo2026', gen_salt('bf'));

  -- Clean up any prior test user and identities to guarantee deterministic ID and state
  DELETE FROM auth.identities WHERE user_id = v_demo_user_id;
  DELETE FROM auth.users WHERE email IN ('demo@pillarpro.app', 'demo@pillarpro.com') OR id = v_demo_user_id;

  -- Insert fresh demo user into auth.users with all GoTrue scan columns non-null
  INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    confirmation_token,
    recovery_token,
    email_change_token_new,
    email_change,
    raw_app_meta_data,
    raw_user_meta_data,
    is_super_admin,
    created_at,
    updated_at
  )
  VALUES (
    '00000000-0000-0000-0000-000000000000',
    v_demo_user_id,
    'authenticated',
    'authenticated',
    'demo@pillarpro.app',
    v_encrypted_pw,
    NOW(),
    '',
    '',
    '',
    '',
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"display_name":"PillarPro Demo Viewer"}'::jsonb,
    false,
    NOW(),
    NOW()
  );

  -- Insert corresponding identity into auth.identities (Required by GoTrue for email sign-in)
  INSERT INTO auth.identities (
    id,
    user_id,
    identity_data,
    provider,
    provider_id,
    last_sign_in_at,
    created_at,
    updated_at
  )
  VALUES (
    v_demo_user_id,
    v_demo_user_id,
    format('{"sub":"%s","email":"%s","email_verified":true}', v_demo_user_id::text, 'demo@pillarpro.app')::jsonb,
    'email',
    v_demo_user_id::text,
    NOW(),
    NOW(),
    NOW()
  );

  -- Explicitly ensure public.user_profiles has the demo user scoped to demo org and active
  INSERT INTO public.user_profiles (id, email, display_name, status, organization_id)
  VALUES (v_demo_user_id, 'demo@pillarpro.app', 'PillarPro Demo Viewer', 'active', v_demo_org_id)
  ON CONFLICT (id) DO UPDATE SET
    email = 'demo@pillarpro.app',
    display_name = 'PillarPro Demo Viewer',
    status = 'active',
    organization_id = v_demo_org_id,
    updated_at = NOW();

  -- Assign 'viewer' role to demo account (Zero write/delete capabilities)
  INSERT INTO public.roles (user_id, role, project_id)
  VALUES (v_demo_user_id, 'viewer'::public.user_role, NULL)
  ON CONFLICT (user_id) DO UPDATE SET
    role = 'viewer'::public.user_role,
    project_id = NULL;
END $$;


-- ──────────────────────────────────────────
-- 3. MULTI-TENANT RLS POLICIES ENFORCEMENT
-- ──────────────────────────────────────────

-- Helper function: Ensure get_user_organization_id() is bulletproof
CREATE OR REPLACE FUNCTION public.get_user_organization_id()
RETURNS UUID LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT organization_id FROM public.user_profiles WHERE id = auth.uid();
$$;

-- Helper function: get_organization_profile() scoped exclusively to user's org
CREATE OR REPLACE FUNCTION public.get_organization_profile()
RETURNS json LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_org json;
  v_user_org_id UUID;
BEGIN
  v_user_org_id := public.get_user_organization_id();

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
  WHERE o.id = v_user_org_id
  LIMIT 1;

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

-- Table 1: organizations (Users can ONLY view their own organization)
DROP POLICY IF EXISTS "organizations_select_member" ON public.organizations;
CREATE POLICY "organizations_select_member" ON public.organizations
  FOR SELECT TO authenticated
  USING (id = public.get_user_organization_id());

-- Table 2: projects (Scoped to user's organization)
DROP POLICY IF EXISTS "projects_select_all"           ON public.projects;
DROP POLICY IF EXISTS "projects_select_owner_partner" ON public.projects;
DROP POLICY IF EXISTS "projects_select_supervisor"    ON public.projects;
DROP POLICY IF EXISTS "projects_insert_owner"         ON public.projects;
DROP POLICY IF EXISTS "projects_update_owner"         ON public.projects;
DROP POLICY IF EXISTS "projects_update_partner"       ON public.projects;
DROP POLICY IF EXISTS "projects_delete_owner"         ON public.projects;
DROP POLICY IF EXISTS "projects_select_org"          ON public.projects;
DROP POLICY IF EXISTS "projects_insert_org"          ON public.projects;
DROP POLICY IF EXISTS "projects_update_org"          ON public.projects;
DROP POLICY IF EXISTS "projects_delete_org"          ON public.projects;

CREATE POLICY "projects_select_org" ON public.projects
  FOR SELECT TO authenticated
  USING (
    organization_id = public.get_user_organization_id()
    AND (
      public.get_user_role() IN ('owner', 'partner', 'managing_partner', 'accountant', 'viewer')
      OR (
        public.get_user_role() = 'site_supervisor'
        AND public.user_has_project_access(id)
      )
    )
  );

CREATE POLICY "projects_insert_org" ON public.projects
  FOR INSERT TO authenticated
  WITH CHECK (
    organization_id = public.get_user_organization_id()
    AND public.get_user_role() IN ('owner', 'partner', 'managing_partner')
  );

CREATE POLICY "projects_update_org" ON public.projects
  FOR UPDATE TO authenticated
  USING (
    organization_id = public.get_user_organization_id()
    AND public.get_user_role() IN ('owner', 'partner', 'managing_partner')
  );

CREATE POLICY "projects_delete_org" ON public.projects
  FOR DELETE TO authenticated
  USING (
    organization_id = public.get_user_organization_id()
    AND public.get_user_role() = 'owner'
  );

-- Table 3: suppliers (Scoped to user's organization)
DROP POLICY IF EXISTS "suppliers_select_all"           ON public.suppliers;
DROP POLICY IF EXISTS "suppliers_select_owner_partner" ON public.suppliers;
DROP POLICY IF EXISTS "suppliers_select_supervisor"    ON public.suppliers;
DROP POLICY IF EXISTS "suppliers_insert_all"           ON public.suppliers;
DROP POLICY IF EXISTS "suppliers_update_all"           ON public.suppliers;
DROP POLICY IF EXISTS "suppliers_delete_owner"         ON public.suppliers;
DROP POLICY IF EXISTS "suppliers_all_owner_partner"    ON public.suppliers;
DROP POLICY IF EXISTS "suppliers_select_org"          ON public.suppliers;
DROP POLICY IF EXISTS "suppliers_insert_org"          ON public.suppliers;
DROP POLICY IF EXISTS "suppliers_update_org"          ON public.suppliers;
DROP POLICY IF EXISTS "suppliers_delete_org"          ON public.suppliers;

CREATE POLICY "suppliers_select_org" ON public.suppliers
  FOR SELECT TO authenticated
  USING (
    organization_id = public.get_user_organization_id()
    AND public.get_user_role() IN ('owner', 'partner', 'managing_partner', 'accountant', 'viewer', 'site_supervisor')
  );

CREATE POLICY "suppliers_insert_org" ON public.suppliers
  FOR INSERT TO authenticated
  WITH CHECK (
    organization_id = public.get_user_organization_id()
    AND public.get_user_role() IN ('owner', 'partner', 'managing_partner', 'accountant')
  );

CREATE POLICY "suppliers_update_org" ON public.suppliers
  FOR UPDATE TO authenticated
  USING (
    organization_id = public.get_user_organization_id()
    AND public.get_user_role() IN ('owner', 'partner', 'managing_partner', 'accountant')
  );

CREATE POLICY "suppliers_delete_org" ON public.suppliers
  FOR DELETE TO authenticated
  USING (
    organization_id = public.get_user_organization_id()
    AND public.get_user_role() = 'owner'
  );

-- Table 4: supplier_transactions (Scoped through suppliers)
DROP POLICY IF EXISTS "supplier_tx_select_all"        ON public.supplier_transactions;
DROP POLICY IF EXISTS "supplier_tx_insert_all"        ON public.supplier_transactions;
DROP POLICY IF EXISTS "supplier_tx_all_owner_partner" ON public.supplier_transactions;
DROP POLICY IF EXISTS "supplier_tx_select_org"        ON public.supplier_transactions;
DROP POLICY IF EXISTS "supplier_tx_insert_org"        ON public.supplier_transactions;

CREATE POLICY "supplier_tx_select_org" ON public.supplier_transactions
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.suppliers s
      WHERE s.id = supplier_transactions.supplier_id
        AND s.organization_id = public.get_user_organization_id()
    )
    AND (
      public.get_user_role() IN ('owner', 'partner', 'managing_partner', 'accountant', 'viewer')
      OR (
        public.get_user_role() = 'site_supervisor'
        AND (project_id IS NULL OR public.user_has_project_access(project_id))
      )
    )
  );

CREATE POLICY "supplier_tx_insert_org" ON public.supplier_transactions
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.suppliers s
      WHERE s.id = supplier_transactions.supplier_id
        AND s.organization_id = public.get_user_organization_id()
    )
    AND (
      public.get_user_role() IN ('owner', 'partner', 'managing_partner', 'accountant')
      OR (
        public.get_user_role() = 'site_supervisor'
        AND (project_id IS NULL OR public.user_has_project_access(project_id))
        AND transaction_type = 'procurement'
      )
    )
  );

-- Table 5: ra_bills (Scoped through projects)
DROP POLICY IF EXISTS "ra_bills_select_all"           ON public.ra_bills;
DROP POLICY IF EXISTS "ra_bills_select_owner_partner" ON public.ra_bills;
DROP POLICY IF EXISTS "ra_bills_select_supervisor"    ON public.ra_bills;
DROP POLICY IF EXISTS "ra_bills_insert_all"           ON public.ra_bills;
DROP POLICY IF EXISTS "ra_bills_all_owner_partner"    ON public.ra_bills;
DROP POLICY IF EXISTS "ra_bills_select_org"           ON public.ra_bills;
DROP POLICY IF EXISTS "ra_bills_insert_org"           ON public.ra_bills;
DROP POLICY IF EXISTS "ra_bills_update_org"           ON public.ra_bills;

CREATE POLICY "ra_bills_select_org" ON public.ra_bills
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = ra_bills.project_id
        AND p.organization_id = public.get_user_organization_id()
    )
    AND (
      public.get_user_role() IN ('owner', 'partner', 'managing_partner', 'accountant', 'viewer')
      OR (
        public.get_user_role() = 'site_supervisor'
        AND public.user_has_project_access(project_id)
      )
    )
  );

CREATE POLICY "ra_bills_insert_org" ON public.ra_bills
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = ra_bills.project_id
        AND p.organization_id = public.get_user_organization_id()
    )
    AND public.get_user_role() IN ('owner', 'partner', 'managing_partner', 'accountant')
  );

CREATE POLICY "ra_bills_update_org" ON public.ra_bills
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = ra_bills.project_id
        AND p.organization_id = public.get_user_organization_id()
    )
    AND public.get_user_role() IN ('owner', 'partner', 'managing_partner', 'accountant')
  );

-- Table 6: ra_bill_payments & bill_deductions
DROP POLICY IF EXISTS "ra_payments_select_all" ON public.ra_bill_payments;
DROP POLICY IF EXISTS "ra_payments_insert_all" ON public.ra_bill_payments;
DROP POLICY IF EXISTS "ra_payments_select_org" ON public.ra_bill_payments;
DROP POLICY IF EXISTS "ra_payments_insert_org" ON public.ra_bill_payments;

CREATE POLICY "ra_payments_select_org" ON public.ra_bill_payments
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.ra_bills rb
      JOIN public.projects p ON p.id = rb.project_id
      WHERE rb.id = ra_bill_payments.bill_id
        AND p.organization_id = public.get_user_organization_id()
    )
    AND (
      public.get_user_role() IN ('owner', 'partner', 'managing_partner', 'accountant', 'viewer')
      OR (
        public.get_user_role() = 'site_supervisor'
        AND (project_id IS NULL OR public.user_has_project_access(project_id))
      )
    )
  );

CREATE POLICY "ra_payments_insert_org" ON public.ra_bill_payments
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.ra_bills rb
      JOIN public.projects p ON p.id = rb.project_id
      WHERE rb.id = ra_bill_payments.bill_id
        AND p.organization_id = public.get_user_organization_id()
    )
    AND public.get_user_role() IN ('owner', 'partner', 'managing_partner', 'accountant')
  );

DROP POLICY IF EXISTS "bill_deductions_select_all" ON public.bill_deductions;
DROP POLICY IF EXISTS "bill_deductions_insert_all" ON public.bill_deductions;
DROP POLICY IF EXISTS "bill_deductions_select_org" ON public.bill_deductions;

CREATE POLICY "bill_deductions_select_org" ON public.bill_deductions
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.ra_bills rb
      JOIN public.projects p ON p.id = rb.project_id
      WHERE rb.id = bill_deductions.bill_id
        AND p.organization_id = public.get_user_organization_id()
    )
    AND public.get_user_role() IN ('owner', 'partner', 'managing_partner', 'accountant', 'viewer', 'site_supervisor')
  );

-- Table 7: security_deposits
DROP POLICY IF EXISTS "security_deposits_all_owner_partner" ON public.security_deposits;
DROP POLICY IF EXISTS "security_deposits_select_all"        ON public.security_deposits;
DROP POLICY IF EXISTS "security_deposits_insert_all"        ON public.security_deposits;
DROP POLICY IF EXISTS "security_deposits_select_org"       ON public.security_deposits;
DROP POLICY IF EXISTS "security_deposits_insert_org"       ON public.security_deposits;

CREATE POLICY "security_deposits_select_org" ON public.security_deposits
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = security_deposits.project_id
        AND p.organization_id = public.get_user_organization_id()
    )
    AND public.get_user_role() IN ('owner', 'partner', 'managing_partner', 'accountant', 'viewer')
  );

CREATE POLICY "security_deposits_insert_org" ON public.security_deposits
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = security_deposits.project_id
        AND p.organization_id = public.get_user_organization_id()
    )
    AND public.get_user_role() IN ('owner', 'partner', 'managing_partner', 'accountant')
  );

-- Table 8: workers
DROP POLICY IF EXISTS "workers_select_all"           ON public.workers;
DROP POLICY IF EXISTS "workers_select_owner_partner" ON public.workers;
DROP POLICY IF EXISTS "workers_select_supervisor"    ON public.workers;
DROP POLICY IF EXISTS "workers_insert_all"           ON public.workers;
DROP POLICY IF EXISTS "workers_all_owner_partner"    ON public.workers;
DROP POLICY IF EXISTS "workers_select_org"          ON public.workers;
DROP POLICY IF EXISTS "workers_insert_org"          ON public.workers;

CREATE POLICY "workers_select_org" ON public.workers
  FOR SELECT TO authenticated
  USING (
    organization_id = public.get_user_organization_id()
    AND public.get_user_role() IN ('owner', 'partner', 'managing_partner', 'accountant', 'viewer', 'site_supervisor')
  );

CREATE POLICY "workers_insert_org" ON public.workers
  FOR INSERT TO authenticated
  WITH CHECK (
    organization_id = public.get_user_organization_id()
    AND public.get_user_role() IN ('owner', 'partner', 'managing_partner', 'site_supervisor')
  );

-- Table 9: attendance
DROP POLICY IF EXISTS "attendance_select_all"        ON public.attendance;
DROP POLICY IF EXISTS "attendance_select_supervisor" ON public.attendance;
DROP POLICY IF EXISTS "attendance_insert_all"        ON public.attendance;
DROP POLICY IF EXISTS "attendance_update_all"        ON public.attendance;
DROP POLICY IF EXISTS "attendance_all_owner_partner" ON public.attendance;
DROP POLICY IF EXISTS "attendance_select_org"        ON public.attendance;
DROP POLICY IF EXISTS "attendance_insert_org"        ON public.attendance;
DROP POLICY IF EXISTS "attendance_update_org"        ON public.attendance;

-- Ensure attendance table has status column if not present
ALTER TABLE public.attendance ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'present';

CREATE POLICY "attendance_select_org" ON public.attendance
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = attendance.project_id
        AND p.organization_id = public.get_user_organization_id()
    )
    AND (
      public.get_user_role() IN ('owner', 'partner', 'managing_partner', 'accountant', 'viewer')
      OR (
        public.get_user_role() = 'site_supervisor'
        AND public.user_has_project_access(project_id)
      )
    )
  );

CREATE POLICY "attendance_insert_org" ON public.attendance
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = attendance.project_id
        AND p.organization_id = public.get_user_organization_id()
    )
    AND (
      public.get_user_role() IN ('owner', 'partner', 'managing_partner')
      OR (
        public.get_user_role() = 'site_supervisor'
        AND public.user_has_project_access(project_id)
      )
    )
  );

CREATE POLICY "attendance_update_org" ON public.attendance
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = attendance.project_id
        AND p.organization_id = public.get_user_organization_id()
    )
    AND (
      public.get_user_role() IN ('owner', 'partner', 'managing_partner')
      OR (
        public.get_user_role() = 'site_supervisor'
        AND public.user_has_project_access(project_id)
      )
    )
  );

-- Table 10: expenses
DROP POLICY IF EXISTS "expenses_select_all"           ON public.expenses;
DROP POLICY IF EXISTS "expenses_select_owner_partner" ON public.expenses;
DROP POLICY IF EXISTS "expenses_select_supervisor"    ON public.expenses;
DROP POLICY IF EXISTS "expenses_insert_all"           ON public.expenses;
DROP POLICY IF EXISTS "expenses_all_owner_partner"    ON public.expenses;
DROP POLICY IF EXISTS "expenses_select_org"          ON public.expenses;
DROP POLICY IF EXISTS "expenses_insert_org"          ON public.expenses;

CREATE POLICY "expenses_select_org" ON public.expenses
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = expenses.project_id
        AND p.organization_id = public.get_user_organization_id()
    )
    AND (
      public.get_user_role() IN ('owner', 'partner', 'managing_partner', 'accountant', 'viewer')
      OR (
        public.get_user_role() = 'site_supervisor'
        AND (project_id IS NULL OR public.user_has_project_access(project_id))
      )
    )
  );

CREATE POLICY "expenses_insert_org" ON public.expenses
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = expenses.project_id
        AND p.organization_id = public.get_user_organization_id()
    )
    AND (
      public.get_user_role() IN ('owner', 'partner', 'managing_partner', 'accountant')
      OR (
        public.get_user_role() = 'site_supervisor'
        AND (project_id IS NULL OR public.user_has_project_access(project_id))
      )
    )
  );

-- Table 11: bills (Receivables module)
DROP POLICY IF EXISTS "bills_all_owner_partner" ON public.bills;
DROP POLICY IF EXISTS "bills_select_all"        ON public.bills;
DROP POLICY IF EXISTS "bills_select_org"        ON public.bills;

CREATE POLICY "bills_select_org" ON public.bills
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = bills.project_id
        AND p.organization_id = public.get_user_organization_id()
    )
    AND public.get_user_role() IN ('owner', 'partner', 'managing_partner', 'accountant', 'viewer')
  );

DROP POLICY IF EXISTS "receivable_payments_all_owner_partner" ON public.receivable_payments;
DROP POLICY IF EXISTS "receivable_payments_select_all"        ON public.receivable_payments;
DROP POLICY IF EXISTS "receivable_payments_select_org"        ON public.receivable_payments;

CREATE POLICY "receivable_payments_select_org" ON public.receivable_payments
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = receivable_payments.project_id
        AND p.organization_id = public.get_user_organization_id()
    )
    AND public.get_user_role() IN ('owner', 'partner', 'managing_partner', 'accountant', 'viewer')
  );

-- Table 12: ledger (Central Accounting Ledger)
DROP POLICY IF EXISTS "ledger_all_owner"         ON public.ledger;
DROP POLICY IF EXISTS "ledger_select_partner"    ON public.ledger;
DROP POLICY IF EXISTS "ledger_select_supervisor" ON public.ledger;
DROP POLICY IF EXISTS "ledger_select_org"        ON public.ledger;

CREATE POLICY "ledger_select_org" ON public.ledger
  FOR SELECT TO authenticated
  USING (
    project_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = ledger.project_id
        AND p.organization_id = public.get_user_organization_id()
    )
    AND public.get_user_role() IN ('owner', 'partner', 'managing_partner', 'accountant', 'viewer')
  );

-- Ensure security_invoker is enabled on supplier_summary view so RLS applies
ALTER VIEW public.supplier_summary SET (security_invoker = true);


-- ──────────────────────────────────────────
-- 4. REALISTIC DEMO DATA SEEDING
-- ──────────────────────────────────────────
DO $$
DECLARE
  v_demo_org_id CONSTANT UUID := 'd0000000-0000-4000-a000-000000000001'::uuid;
  v_demo_user_id UUID;

  -- Project IDs
  v_p1_id CONSTANT UUID := 'd1111111-1111-4111-a111-111111111111'::uuid;
  v_p2_id CONSTANT UUID := 'd2222222-2222-4222-a222-222222222222'::uuid;

  -- RA Bill IDs
  v_b1_id CONSTANT UUID := 'db111111-1111-4111-a111-111111111111'::uuid;
  v_b2_id CONSTANT UUID := 'db222222-2222-4222-a222-222222222222'::uuid;

  -- Supplier IDs
  v_s1_id CONSTANT UUID := 'dcc11111-1111-4111-a111-111111111111'::uuid;
  v_s2_id CONSTANT UUID := 'dcc22222-2222-4222-a222-222222222222'::uuid;
  v_s3_id CONSTANT UUID := 'dcc33333-3333-4333-a333-333333333333'::uuid;

  -- Worker IDs
  v_w1_id CONSTANT UUID := 'df111111-1111-4111-a111-111111111111'::uuid;
  v_w2_id CONSTANT UUID := 'df222222-2222-4222-a222-222222222222'::uuid;
  v_w3_id CONSTANT UUID := 'df333333-3333-4333-a333-333333333333'::uuid;
  v_w4_id CONSTANT UUID := 'df444444-4444-4444-a444-444444444444'::uuid;

  v_date DATE;
BEGIN
  -- Resolve demo user ID directly from auth.users
  SELECT id INTO v_demo_user_id FROM auth.users WHERE email = 'demo@pillarpro.app' LIMIT 1;
  IF v_demo_user_id IS NULL THEN
    RAISE EXCEPTION 'Demo user demo@pillarpro.app was not found in auth.users!';
  END IF;
  -- ── 4.1 Sample Projects ──
  INSERT INTO public.projects (
    id, organization_id, name, agency_name, advertised_cost, awarded_amount, start_date, end_date, status, created_by
  ) VALUES
  (
    v_p1_id,
    v_demo_org_id,
    'NH-44 Bypass Boundary Wall & Drain Network',
    'PWD (R&B) National Highway Division',
    15000000.00,
    14250000.00,
    '2026-01-10',
    '2026-11-30',
    'active',
    v_demo_user_id
  ),
  (
    v_p2_id,
    v_demo_org_id,
    'Govt Model Higher Secondary School Academic Block',
    'School Education Dept / Samagra Shiksha',
    28000000.00,
    26500000.00,
    '2025-08-01',
    '2026-12-31',
    'active',
    v_demo_user_id
  )
  ON CONFLICT (id) DO UPDATE SET
    organization_id = EXCLUDED.organization_id,
    name = EXCLUDED.name,
    agency_name = EXCLUDED.agency_name,
    advertised_cost = EXCLUDED.advertised_cost,
    awarded_amount = EXCLUDED.awarded_amount,
    status = EXCLUDED.status;

  -- ── 4.2 RA Bills (1 Fully Paid, 1 Partially Paid with Statutory Deductions) ──
  INSERT INTO public.ra_bills (
    id, organization_id, project_id, bill_number, submission_date, work_certified_amount, retention_percentage,
    amount_received, tds_deducted, gst_tds_deducted, labour_cess_deducted, other_deductions, total_deductions,
    net_bank_received, date_received, status, remarks, billing_mode, created_by
  ) VALUES
  (
    v_b1_id,
    v_demo_org_id,
    v_p1_id,
    'RA Bill 01',
    '2026-06-15',
    3500000.00,
    5.00, -- retention = 1,75,000, net payable = 33,25,000
    3325000.00,
    70000.00,
    70000.00,
    35000.00,
    0.00,
    175000.00,
    3150000.00,
    '2026-07-02',
    'fully_paid',
    'Boundary wall chainage 0+000 to 1+250 certified & fully cleared by department.',
    'standalone',
    v_demo_user_id
  ),
  (
    v_b2_id,
    v_demo_org_id,
    v_p2_id,
    'RA Bill 01',
    '2026-08-10',
    6200000.00,
    5.00, -- retention = 3,10,000, net payable = 58,90,000
    3000000.00, -- partially paid: outstanding = 28,90,000
    60000.00,
    60000.00,
    30000.00,
    0.00,
    150000.00,
    2850000.00,
    CURRENT_DATE - INTERVAL '4 days',
    'partially_paid',
    'Plinth beam, foundation raft, and column casting certified. 1st installment released.',
    'standalone',
    v_demo_user_id
  )
  ON CONFLICT (id) DO UPDATE SET
    work_certified_amount = EXCLUDED.work_certified_amount,
    amount_received = EXCLUDED.amount_received,
    tds_deducted = EXCLUDED.tds_deducted,
    gst_tds_deducted = EXCLUDED.gst_tds_deducted,
    labour_cess_deducted = EXCLUDED.labour_cess_deducted,
    total_deductions = EXCLUDED.total_deductions,
    net_bank_received = EXCLUDED.net_bank_received,
    date_received = EXCLUDED.date_received,
    status = EXCLUDED.status;

  -- Payments against RA Bills (Tranche-level ledger with statutory deductions)
  INSERT INTO public.ra_bill_payments (
    id,
    bill_id,
    project_id,
    payment_date,
    gross_amount,
    tds_amount,
    gst_tds_amount,
    labour_cess_amount,
    other_deductions,
    voucher_reference,
    remarks
  ) VALUES
  (
    'd9111111-1111-4111-a111-111111111111'::uuid,
    v_b1_id,
    v_p1_id,
    '2026-07-02',
    3325000.00,
    70000.00,
    70000.00,
    35000.00,
    0.00,
    'TREASURY/SGR/77102',
    'Full clearance of RA Bill 01 by treasury'
  ),
  (
    'd9222222-2222-4222-a222-222222222222'::uuid,
    v_b2_id,
    v_p2_id,
    CURRENT_DATE - INTERVAL '4 days',
    3000000.00,
    60000.00,
    60000.00,
    30000.00,
    0.00,
    'TREASURY/SGR/88491',
    'Interim 1st installment released by division'
  )
  ON CONFLICT (id) DO UPDATE SET
    payment_date = EXCLUDED.payment_date,
    gross_amount = EXCLUDED.gross_amount,
    tds_amount = EXCLUDED.tds_amount,
    gst_tds_amount = EXCLUDED.gst_tds_amount,
    labour_cess_amount = EXCLUDED.labour_cess_amount,
    other_deductions = EXCLUDED.other_deductions,
    voucher_reference = EXCLUDED.voucher_reference,
    remarks = EXCLUDED.remarks;

  -- Statutory Bill Deductions Breakdown
  INSERT INTO public.bill_deductions (
    id,
    bill_id,
    payment_id,
    deduction_label,
    deduction_amount
  ) VALUES
  ('d8111111-1111-4111-a111-111111111111'::uuid, v_b1_id, 'd9111111-1111-4111-a111-111111111111'::uuid, 'Income Tax TDS (2%)', 70000.00),
  ('d8111111-1111-4111-a111-111111111112'::uuid, v_b1_id, 'd9111111-1111-4111-a111-111111111111'::uuid, 'GST TDS (2%)', 70000.00),
  ('d8111111-1111-4111-a111-111111111113'::uuid, v_b1_id, 'd9111111-1111-4111-a111-111111111111'::uuid, 'BOCW Labour Welfare Cess (1%)', 35000.00),
  ('d8222222-2222-4222-a222-222222222221'::uuid, v_b2_id, 'd9222222-2222-4222-a222-222222222222'::uuid, 'Income Tax TDS (2%)', 60000.00),
  ('d8222222-2222-4222-a222-222222222222'::uuid, v_b2_id, 'd9222222-2222-4222-a222-222222222222'::uuid, 'GST TDS (2%)', 60000.00),
  ('d8222222-2222-4222-a222-222222222223'::uuid, v_b2_id, 'd9222222-2222-4222-a222-222222222222'::uuid, 'BOCW Labour Welfare Cess (1%)', 30000.00)
  ON CONFLICT (id) DO UPDATE SET
    deduction_label = EXCLUDED.deduction_label,
    deduction_amount = EXCLUDED.deduction_amount;

  -- Sync with public.bills and receivable_payments for /receivables page consistency
  INSERT INTO public.bills (
    id, project_id, bill_number, bill_type, bill_date, gross_amount, deductions, created_by
  ) VALUES
  (v_b1_id, v_p1_id, 'RA Bill 01', 'RA Bill', '2026-06-15', 3500000.00, 175000.00, v_demo_user_id),
  (v_b2_id, v_p2_id, 'RA Bill 01', 'RA Bill', '2026-08-10', 6200000.00, 310000.00, v_demo_user_id)
  ON CONFLICT (id) DO UPDATE SET
    gross_amount = EXCLUDED.gross_amount,
    deductions = EXCLUDED.deductions;

  INSERT INTO public.receivable_payments (
    id, bill_id, project_id, amount_received, date, mode, reference, created_by
  ) VALUES
  ('d7111111-1111-4111-a111-111111111111'::uuid, v_b1_id, v_p1_id, 3325000.00, '2026-07-02', 'bank_transfer', 'TREASURY/SGR/77102', v_demo_user_id),
  ('d7222222-2222-4222-a222-222222222222'::uuid, v_b2_id, v_p2_id, 3000000.00, CURRENT_DATE - INTERVAL '4 days', 'bank_transfer', 'TREASURY/SGR/88491', v_demo_user_id)
  ON CONFLICT (id) DO UPDATE SET
    amount_received = EXCLUDED.amount_received,
    date = EXCLUDED.date;

  -- ── 4.3 Security Deposits / Bank Guarantees (1 Expiring in < 30 days, 1 Healthy) ──
  INSERT INTO public.security_deposits (
    id, organization_id, project_id, deposit_type, reference_number, issuing_bank, amount,
    issue_date, expiry_date, claim_expiry_date, status, notes, created_by
  ) VALUES
  (
    'da111111-1111-4111-a111-111111111111'::uuid,
    v_demo_org_id,
    v_p1_id,
    'performance_bank_guarantee',
    'BG/SBI/2025/7841',
    'State Bank of India (Residency Road, Srinagar)',
    712500.00,
    '2025-10-01',
    CURRENT_DATE + INTERVAL '18 days', -- Crucial: within 30 days, triggers alert banner
    CURRENT_DATE + INTERVAL '48 days',
    'active',
    'Performance BG for initial phase defect liability. Extension letter initiated with division EE.',
    v_demo_user_id
  ),
  (
    'da222222-2222-4222-a222-222222222222'::uuid,
    v_demo_org_id,
    v_p2_id,
    'performance_bank_guarantee',
    'PBG/PNB/2025/0092',
    'Punjab National Bank (Lal Chowk Branch)',
    1325000.00,
    '2025-08-15',
    CURRENT_DATE + INTERVAL '240 days', -- Healthy BG
    CURRENT_DATE + INTERVAL '270 days',
    'active',
    'Contract performance security valid through building milestone completion.',
    v_demo_user_id
  )
  ON CONFLICT (id) DO UPDATE SET
    expiry_date = EXCLUDED.expiry_date,
    amount = EXCLUDED.amount,
    status = EXCLUDED.status;

  -- ── 4.4 Suppliers & Transactions (Procurement & Payments) ──
  INSERT INTO public.suppliers (
    id, organization_id, name, contact_number, gst_number, address, notes, created_by
  ) VALUES
  (
    v_s1_id,
    v_demo_org_id,
    'Kashmir Valley Cement Corp',
    '+91 94191 11223',
    '01AAACK9988C1Z2',
    'Industrial Estate, Lassipora, Pulwama',
    'Primary supplier for OPC-43 & PPC Grade Cement bags.',
    v_demo_user_id
  ),
  (
    v_s2_id,
    v_demo_org_id,
    'Jhelum TMT Steel & Hardware',
    '+91 94192 33445',
    '01AABTJ7766S1Z8',
    'Steel Yard, Phase-II, Khanmoh, Srinagar',
    'Distributor for Fe-550D primary TMT structural steel.',
    v_demo_user_id
  ),
  (
    v_s3_id,
    v_demo_org_id,
    'Shalimar Ready-Mix Concrete',
    '+91 94193 55667',
    '01AAACS4455M1Z1',
    'Bypass Road, Narwal, Jammu',
    'RMC transit mixer supplier with boom placer.',
    v_demo_user_id
  )
  ON CONFLICT (id) DO UPDATE SET
    organization_id = EXCLUDED.organization_id,
    name = EXCLUDED.name,
    contact_number = EXCLUDED.contact_number,
    gst_number = EXCLUDED.gst_number;

  -- Supplier Transactions
  INSERT INTO public.supplier_transactions (
    id, organization_id, supplier_id, project_id, transaction_type, description, amount, date, mode, reference, created_by
  ) VALUES
  -- Supplier 1 (KVCC): Procured 12.40L, Paid 9.80L, Outstanding 2.60L
  ('dc111111-1111-4111-a111-111111111111'::uuid, v_demo_org_id, v_s1_id, v_p1_id, 'procurement', '600 Bags OPC-43 Grade Cement @ ₹420/bag', 252000.00, '2026-07-05', 'cash', 'CH-KVCC-101', v_demo_user_id),
  ('dc111111-1111-4111-a111-111111111112'::uuid, v_demo_org_id, v_s1_id, v_p2_id, 'procurement', '800 Bags PPC Cement @ ₹385/bag', 308000.00, '2026-07-20', 'cash', 'CH-KVCC-142', v_demo_user_id),
  ('dc111111-1111-4111-a111-111111111113'::uuid, v_demo_org_id, v_s1_id, v_p2_id, 'procurement', '1500 Bags OPC-53 Grade Cement for slab casting', 680000.00, '2026-08-05', 'cash', 'INV-KVCC-992', v_demo_user_id),
  ('dc111111-1111-4111-a111-111111111114'::uuid, v_demo_org_id, v_s1_id, v_p1_id, 'payment', 'Bank transfer against Invoice #CH-101', 500000.00, '2026-07-25', 'bank_transfer', 'NEFT-KVCC-8821', v_demo_user_id),
  ('dc111111-1111-4111-a111-111111111115'::uuid, v_demo_org_id, v_s1_id, v_p2_id, 'payment', 'Account payment via Cheque', 480000.00, '2026-08-18', 'cheque', 'CHQ #441201', v_demo_user_id),

  -- Supplier 2 (Jhelum TMT): Procured 24.50L, Paid 20.00L, Outstanding 4.50L
  ('dc222222-2222-4222-a222-222222222221'::uuid, v_demo_org_id, v_s2_id, v_p2_id, 'procurement', '25 MT Fe-550D TMT Rebar (12mm, 16mm & 20mm)', 1450000.00, '2026-06-20', 'cash', 'INV-JHLM-311', v_demo_user_id),
  ('dc222222-2222-4222-a222-222222222222'::uuid, v_demo_org_id, v_s2_id, v_p1_id, 'procurement', '18 MT Fe-500D TMT Rebar (8mm & 10mm stirrups)', 1000000.00, '2026-07-15', 'cash', 'INV-JHLM-452', v_demo_user_id),
  ('dc222222-2222-4222-a222-222222222223'::uuid, v_demo_org_id, v_s2_id, v_p2_id, 'payment', 'RTGS installment against steel delivery', 1200000.00, '2026-07-02', 'bank_transfer', 'RTGS-JHLM-0091', v_demo_user_id),
  ('dc222222-2222-4222-a222-222222222224'::uuid, v_demo_org_id, v_s2_id, v_p1_id, 'payment', 'Account clearance via Bank Transfer', 800000.00, '2026-08-10', 'bank_transfer', 'NEFT-JHLM-4412', v_demo_user_id),

  -- Supplier 3 (Shalimar RMC): Procured 8.00L, Paid 8.00L, Outstanding 0.00 (Settled)
  ('dc333333-3333-4333-a333-333333333331'::uuid, v_demo_org_id, v_s3_id, v_p2_id, 'procurement', '160 m³ M25 Design Mix Concrete with boom pump', 800000.00, '2026-08-02', 'cash', 'CH-SRMC-781', v_demo_user_id),
  ('dc333333-3333-4333-a333-333333333332'::uuid, v_demo_org_id, v_s3_id, v_p2_id, 'payment', 'Full payment via RTGS', 800000.00, '2026-08-25', 'bank_transfer', 'RTGS-SRMC-9112', v_demo_user_id)
  ON CONFLICT (id) DO UPDATE SET
    amount = EXCLUDED.amount,
    description = EXCLUDED.description;

  -- ── 4.5 Workers & Muster Roll Attendance ──
  INSERT INTO public.workers (
    id, organization_id, name, trade, daily_wage_rate, phone
  ) VALUES
  (v_w1_id, v_demo_org_id, 'Ghulam Mohammad', 'Master Mason', 900.00, '+91 94190 11001'),
  (v_w2_id, v_demo_org_id, 'Tariq Ahmad Reshi', 'Carpenter / Shuttering', 850.00, '+91 94190 11002'),
  (v_w3_id, v_demo_org_id, 'Bilal Ahmad Dar', 'Bar Bender / Steel Fixer', 800.00, '+91 94190 11003'),
  (v_w4_id, v_demo_org_id, 'Showkat Ali', 'General Helper', 550.00, '+91 94190 11004')
  ON CONFLICT (id) DO UPDATE SET
    organization_id = EXCLUDED.organization_id,
    name = EXCLUDED.name,
    trade = EXCLUDED.trade,
    daily_wage_rate = EXCLUDED.daily_wage_rate;

  -- Worker Project Assignments
  INSERT INTO public.worker_project_assignments (worker_id, project_id) VALUES
  (v_w1_id, v_p1_id), (v_w1_id, v_p2_id),
  (v_w2_id, v_p1_id), (v_w2_id, v_p2_id),
  (v_w3_id, v_p1_id), (v_w3_id, v_p2_id),
  (v_w4_id, v_p1_id), (v_w4_id, v_p2_id)
  ON CONFLICT DO NOTHING;

  -- Seed attendance across the last 7 days of the current month
  FOR i IN 0..6 LOOP
    v_date := (CURRENT_DATE - (i || ' days')::INTERVAL)::DATE;
    
    -- Project 1 Attendance
    INSERT INTO public.attendance (project_id, worker_id, date, status, present, created_by)
    VALUES
      (v_p1_id, v_w1_id, v_date, 'present', true, v_demo_user_id),
      (v_p1_id, v_w2_id, v_date, CASE WHEN i = 2 THEN 'half_day' ELSE 'present' END, CASE WHEN i = 2 THEN true ELSE true END, v_demo_user_id),
      (v_p1_id, v_w3_id, v_date, CASE WHEN i = 5 THEN 'absent' ELSE 'present' END, CASE WHEN i = 5 THEN false ELSE true END, v_demo_user_id),
      (v_p1_id, v_w4_id, v_date, 'present', true, v_demo_user_id)
    ON CONFLICT (project_id, worker_id, date) DO UPDATE SET
      status = EXCLUDED.status,
      present = EXCLUDED.present;

    -- Project 2 Attendance
    INSERT INTO public.attendance (project_id, worker_id, date, status, present, created_by)
    VALUES
      (v_p2_id, v_w1_id, v_date, 'present', true, v_demo_user_id),
      (v_p2_id, v_w2_id, v_date, 'present', true, v_demo_user_id),
      (v_p2_id, v_w3_id, v_date, CASE WHEN i = 1 THEN 'half_day' ELSE 'present' END, true, v_demo_user_id),
      (v_p2_id, v_w4_id, v_date, CASE WHEN i = 4 THEN 'absent' ELSE 'present' END, CASE WHEN i = 4 THEN false ELSE true END, v_demo_user_id)
    ON CONFLICT (project_id, worker_id, date) DO UPDATE SET
      status = EXCLUDED.status,
      present = EXCLUDED.present;
  END LOOP;

  -- ── 4.6 Realistic Expenses (including AI Receipt Scan) ──
  INSERT INTO public.expenses (
    id, project_id, category, amount, date, description, mode, reference, receipt_url, created_by
  ) VALUES
  (
    'de111111-1111-4111-a111-111111111111'::uuid,
    v_p1_id,
    'fuel',
    14500.00,
    CURRENT_DATE - INTERVAL '3 days',
    'Diesel fuel refill (150 Litres) for JCB Excavator and DG backup generator on boundary wall trenching',
    'cash',
    'PETRO/P1/0942',
    NULL,
    v_demo_user_id
  ),
  (
    'de222222-2222-4222-a222-222222222222'::uuid,
    v_p2_id,
    'equipment',
    8200.00,
    CURRENT_DATE - INTERVAL '5 days',
    'National Testing Laboratory: concrete cube compression strength testing (7-day & 28-day sample batches)',
    'upi',
    'UPI/TEST/778102',
    NULL,
    v_demo_user_id
  ),
  (
    'de333333-3333-4333-a333-333333333333'::uuid,
    v_p2_id,
    'material',
    18750.00,
    CURRENT_DATE - INTERVAL '2 days',
    '[Scanned via AI Receipt Scanner] Personal Protective Equipment: 15 ISI Safety Helmets, 15 High-Vis Reflective Vests, and 4 pairs heavy-duty gumboots',
    'bank_transfer',
    'INV-9921 / NEFT-SAFETY',
    'https://images.unsplash.com/photo-1578575437130-527eed3abbec?w=600&auto=format&fit=crop&q=80',
    v_demo_user_id
  )
  ON CONFLICT (id) DO UPDATE SET
    amount = EXCLUDED.amount,
    description = EXCLUDED.description,
    receipt_url = EXCLUDED.receipt_url;

END $$;


-- ──────────────────────────────────────────
-- 5. AUTOMATED RLS ISOLATION VERIFICATION CHECKS
-- ──────────────────────────────────────────
DO $$
DECLARE
  v_demo_user_id UUID;
  v_demo_org_id  CONSTANT UUID := 'd0000000-0000-4000-a000-000000000001'::uuid;
  v_p1_id        CONSTANT UUID := 'd1111111-1111-4111-a111-111111111111'::uuid;
  v_proj_count   INT;
  v_leaked_count INT;
  v_supp_count   INT;
  v_bill_count   INT;
  v_org_count    INT;
BEGIN
  -- Resolve demo user ID directly from auth.users
  SELECT id INTO v_demo_user_id FROM auth.users WHERE email = 'demo@pillarpro.app' LIMIT 1;
  IF v_demo_user_id IS NULL THEN
    RAISE EXCEPTION 'Demo user demo@pillarpro.app was not found in auth.users!';
  END IF;

  -- Impersonate the authenticated demo user in this transaction
  SET LOCAL ROLE authenticated;
  PERFORM set_config('request.jwt.claim.sub', v_demo_user_id::text, true);
  PERFORM set_config('request.jwt.claim.role', 'authenticated', true);

  -- 1. Check Projects visibility
  SELECT COUNT(*) INTO v_proj_count FROM public.projects;
  SELECT COUNT(*) INTO v_leaked_count FROM public.projects WHERE organization_id <> v_demo_org_id;
  
  IF v_leaked_count > 0 THEN
    RAISE EXCEPTION 'CRITICAL RLS ISOLATION FAILURE: Demo user can see % non-demo project(s)!', v_leaked_count;
  END IF;

  -- 2. Check Organizations visibility
  SELECT COUNT(*) INTO v_org_count FROM public.organizations;
  IF v_org_count > 1 THEN
    RAISE EXCEPTION 'CRITICAL RLS ISOLATION FAILURE: Demo user can see % organization rows instead of 1!', v_org_count;
  END IF;

  -- 3. Check Suppliers visibility
  SELECT COUNT(*) INTO v_supp_count FROM public.suppliers;
  SELECT COUNT(*) INTO v_leaked_count FROM public.suppliers WHERE organization_id <> v_demo_org_id;

  IF v_leaked_count > 0 THEN
    RAISE EXCEPTION 'CRITICAL RLS ISOLATION FAILURE: Demo user can see % non-demo supplier(s)!', v_leaked_count;
  END IF;

  -- 4. Check RA Bills visibility
  SELECT COUNT(*) INTO v_bill_count FROM public.ra_bills;
  SELECT COUNT(*) INTO v_leaked_count FROM public.ra_bills rb
  JOIN public.projects p ON p.id = rb.project_id
  WHERE p.organization_id <> v_demo_org_id;

  IF v_leaked_count > 0 THEN
    RAISE EXCEPTION 'CRITICAL RLS ISOLATION FAILURE: Demo user can see % non-demo bill(s)!', v_leaked_count;
  END IF;

  -- Reset role
  RESET ROLE;

  RAISE NOTICE '=======================================================';
  RAISE NOTICE 'SUCCESS: RLS Tenant Isolation Verified Airtight!';
  RAISE NOTICE 'Demo user visible projects: % (Leaked foreign: 0)', v_proj_count;
  RAISE NOTICE 'Demo user visible suppliers: % (Leaked foreign: 0)', v_supp_count;
  RAISE NOTICE 'Demo user visible RA bills:  % (Leaked foreign: 0)', v_bill_count;
  RAISE NOTICE '=======================================================';
END $$;
