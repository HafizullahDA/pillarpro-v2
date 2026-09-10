-- ============================================================
-- PillarPro v2 — Migration 023: Completely Remove Demo Organization & Demo User
-- 
-- 1. Reassigns real firm partners (Hafizullah Lone & Habibullah Lone) to the real organization
-- 2. Identifies all demo project, worker, supplier IDs
-- 3. Deletes in strict foreign key order so no constraint is violated
-- 4. Deletes the demo organization and demo user completely from auth and profiles
-- ============================================================

DO $$
DECLARE
  v_demo_org_id CONSTANT UUID := 'd0000000-0000-4000-a000-000000000001'::uuid;
  v_demo_user_id UUID;
  v_real_org_id UUID;
  v_demo_project_ids UUID[];
  v_demo_worker_ids UUID[];
  v_demo_supplier_ids UUID[];
BEGIN
  -- 1. Find the real organization (Al Habib / Hafizullah Lone Constructions)
  SELECT id INTO v_real_org_id 
  FROM public.organizations 
  WHERE id <> v_demo_org_id 
  ORDER BY created_at ASC 
  LIMIT 1;

  -- 2. Find demo user ID (demo@pillarpro.app)
  SELECT id INTO v_demo_user_id 
  FROM auth.users 
  WHERE email IN ('demo@pillarpro.app', 'demo@pillarpro.com') 
     OR id = 'd0000000-0000-4000-a000-000000000002'::uuid
  LIMIT 1;

  -- 3. Reassign real firm partners (Hafizullah Lone & Habibullah Lone) to the real organization
  IF v_real_org_id IS NOT NULL THEN
    UPDATE public.partners 
    SET organization_id = v_real_org_id 
    WHERE (organization_id = v_demo_org_id OR organization_id IS NULL)
      AND name IN ('Hafizullah Lone', 'Habibullah Lone');
  END IF;

  -- 4. Gather all demo project IDs
  SELECT COALESCE(array_agg(id), '{}') INTO v_demo_project_ids
  FROM public.projects
  WHERE organization_id = v_demo_org_id 
     OR id IN (
       'd1111111-1111-4111-a111-111111111111'::uuid, 
       'd2222222-2222-4222-a222-222222222222'::uuid
     );

  -- 5. Gather all demo worker IDs
  SELECT COALESCE(array_agg(id), '{}') INTO v_demo_worker_ids
  FROM public.workers
  WHERE organization_id = v_demo_org_id
     OR id IN (
       'df111111-1111-4111-a111-111111111111'::uuid,
       'df222222-2222-4222-a222-222222222222'::uuid,
       'df333333-3333-4333-a333-333333333333'::uuid,
       'df444444-4444-4444-a444-444444444444'::uuid,
       'd3111111-1111-4111-a111-111111111111'::uuid,
       'd3222222-2222-4222-a222-222222222222'::uuid,
       'd3333333-3333-4333-a333-333333333333'::uuid,
       'd3444444-4444-4444-a444-444444444444'::uuid,
       'd3555555-5555-4555-a555-555555555555'::uuid
     );

  -- 6. Gather all demo supplier IDs
  SELECT COALESCE(array_agg(id), '{}') INTO v_demo_supplier_ids
  FROM public.suppliers
  WHERE organization_id = v_demo_org_id
     OR id IN (
       'dcc11111-1111-4111-a111-111111111111'::uuid,
       'dcc22222-2222-4222-a222-222222222222'::uuid,
       'dcc33333-3333-4333-a333-333333333333'::uuid
     );

  -- ──────────────────────────────────────────
  -- 7. DELETE CHILD RECORDS IN REVERSE FK ORDER
  -- ──────────────────────────────────────────

  -- A. Wage payments (references workers & projects)
  DELETE FROM public.wage_payments 
  WHERE organization_id = v_demo_org_id 
     OR project_id = ANY(v_demo_project_ids)
     OR worker_id = ANY(v_demo_worker_ids);

  -- B. Attendance (references workers & projects)
  -- Deleting explicitly by worker IDs and project IDs to satisfy attendance_worker_id_fkey
  DELETE FROM public.attendance 
  WHERE project_id = ANY(v_demo_project_ids)
     OR worker_id = ANY(v_demo_worker_ids);

  -- C. Worker Project Assignments (references workers & projects)
  DELETE FROM public.worker_project_assignments 
  WHERE project_id = ANY(v_demo_project_ids)
     OR worker_id = ANY(v_demo_worker_ids);

  -- D. Workers (now safe to delete)
  DELETE FROM public.workers 
  WHERE organization_id = v_demo_org_id
     OR id = ANY(v_demo_worker_ids);

  -- E. Partner Transactions & Project Partners
  DELETE FROM public.partner_transactions 
  WHERE organization_id = v_demo_org_id 
     OR project_id = ANY(v_demo_project_ids);

  DELETE FROM public.project_partners 
  WHERE organization_id = v_demo_org_id 
     OR project_id = ANY(v_demo_project_ids);

  -- Delete remaining demo partners (real partners were already reassigned above)
  DELETE FROM public.partners 
  WHERE organization_id = v_demo_org_id;

  -- F. Supplier Transactions & Suppliers
  DELETE FROM public.supplier_transactions 
  WHERE organization_id = v_demo_org_id 
     OR project_id = ANY(v_demo_project_ids)
     OR supplier_id = ANY(v_demo_supplier_ids);

  DELETE FROM public.suppliers 
  WHERE organization_id = v_demo_org_id
     OR id = ANY(v_demo_supplier_ids);

  -- G. Security Deposits
  DELETE FROM public.security_deposits 
  WHERE organization_id = v_demo_org_id 
     OR project_id = ANY(v_demo_project_ids);

  -- H. RA Bill Payments, Deductions, and Bills
  DELETE FROM public.ra_bill_payments 
  WHERE bill_id IN (
    SELECT id FROM public.ra_bills WHERE project_id = ANY(v_demo_project_ids)
  );

  DELETE FROM public.bill_deductions 
  WHERE bill_id IN (
    SELECT id FROM public.ra_bills WHERE project_id = ANY(v_demo_project_ids)
  );

  DELETE FROM public.ra_bills 
  WHERE project_id = ANY(v_demo_project_ids);

  -- I. Receivable Payments & Bills
  DELETE FROM public.receivable_payments 
  WHERE project_id = ANY(v_demo_project_ids);

  DELETE FROM public.bills 
  WHERE project_id = ANY(v_demo_project_ids);

  -- J. Expenses
  DELETE FROM public.expenses 
  WHERE project_id = ANY(v_demo_project_ids);

  -- K. Vendors, Purchases, and Vendor Payments
  DELETE FROM public.vendor_payments 
  WHERE project_id = ANY(v_demo_project_ids);

  DELETE FROM public.vendor_purchases 
  WHERE project_id = ANY(v_demo_project_ids);

  DELETE FROM public.vendors 
  WHERE project_id = ANY(v_demo_project_ids);

  -- L. General Ledger entries
  DELETE FROM public.ledger 
  WHERE project_id = ANY(v_demo_project_ids);

  -- M. Project Members
  DELETE FROM public.project_members 
  WHERE project_id = ANY(v_demo_project_ids);

  -- N. Projects
  DELETE FROM public.projects 
  WHERE id = ANY(v_demo_project_ids) 
     OR organization_id = v_demo_org_id;

  -- O. Demo Organization
  DELETE FROM public.organizations 
  WHERE id = v_demo_org_id OR name = 'PillarPro Demo';

  -- P. Demo User (from roles, user_profiles, auth.identities, auth.users)
  IF v_demo_user_id IS NOT NULL THEN
    DELETE FROM public.roles WHERE user_id = v_demo_user_id;
    DELETE FROM public.user_profiles WHERE id = v_demo_user_id;
    DELETE FROM auth.identities WHERE user_id = v_demo_user_id;
    DELETE FROM auth.users WHERE id = v_demo_user_id;
  END IF;

  DELETE FROM auth.identities WHERE identity_data->>'email' IN ('demo@pillarpro.app', 'demo@pillarpro.com');
  DELETE FROM auth.users WHERE email IN ('demo@pillarpro.app', 'demo@pillarpro.com');

END $$;
