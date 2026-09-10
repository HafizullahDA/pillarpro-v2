-- ============================================================
-- PillarPro v2 — Migration 023: Completely Remove Demo Organization & Demo User
-- 
-- 1. Reassigns partners (Hafizullah Lone & Habibullah Lone) to the real organization
-- 2. Deletes all demo data (projects, RA bills, payments, deductions, suppliers,
--    transactions, workers, attendance, wage payments, expenses, etc.)
-- 3. Deletes the demo user (demo@pillarpro.app) from auth and profiles
-- 4. Deletes the demo organization (d0000000-0000-4000-a000-000000000001)
-- ============================================================

DO $$
DECLARE
  v_demo_org_id CONSTANT UUID := 'd0000000-0000-4000-a000-000000000001'::uuid;
  v_demo_user_id UUID;
  v_real_org_id UUID;
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

  -- 4. Delete demo wage payments
  DELETE FROM public.wage_payments 
  WHERE organization_id = v_demo_org_id 
     OR project_id IN (SELECT id FROM public.projects WHERE organization_id = v_demo_org_id);

  -- 5. Delete demo attendance
  DELETE FROM public.attendance 
  WHERE project_id IN (SELECT id FROM public.projects WHERE organization_id = v_demo_org_id)
     OR worker_id IN (SELECT id FROM public.workers WHERE organization_id = v_demo_org_id);

  -- 6. Delete demo worker project assignments
  DELETE FROM public.worker_project_assignments 
  WHERE project_id IN (SELECT id FROM public.projects WHERE organization_id = v_demo_org_id)
     OR worker_id IN (SELECT id FROM public.workers WHERE organization_id = v_demo_org_id);

  -- 7. Delete demo workers
  DELETE FROM public.workers 
  WHERE organization_id = v_demo_org_id;

  -- 8. Delete demo partner project shares
  DELETE FROM public.project_partners 
  WHERE organization_id = v_demo_org_id 
     OR project_id IN (SELECT id FROM public.projects WHERE organization_id = v_demo_org_id);

  -- 9. Delete demo partner transactions
  DELETE FROM public.partner_transactions 
  WHERE organization_id = v_demo_org_id 
     OR project_id IN (SELECT id FROM public.projects WHERE organization_id = v_demo_org_id);

  -- 10. Delete any remaining partners still attached to the demo organization
  DELETE FROM public.partners 
  WHERE organization_id = v_demo_org_id;

  -- 11. Delete demo expenses
  DELETE FROM public.expenses 
  WHERE project_id IN (SELECT id FROM public.projects WHERE organization_id = v_demo_org_id);

  -- 12. Delete demo supplier transactions
  DELETE FROM public.supplier_transactions 
  WHERE organization_id = v_demo_org_id 
     OR project_id IN (SELECT id FROM public.projects WHERE organization_id = v_demo_org_id)
     OR supplier_id IN (SELECT id FROM public.suppliers WHERE organization_id = v_demo_org_id);

  -- 13. Delete demo suppliers
  DELETE FROM public.suppliers 
  WHERE organization_id = v_demo_org_id;

  -- 14. Delete demo security deposits
  DELETE FROM public.security_deposits 
  WHERE organization_id = v_demo_org_id 
     OR project_id IN (SELECT id FROM public.projects WHERE organization_id = v_demo_org_id);

  -- 15. Delete demo RA bill payments and deductions
  DELETE FROM public.ra_bill_payments 
  WHERE bill_id IN (
    SELECT id FROM public.ra_bills 
    WHERE project_id IN (SELECT id FROM public.projects WHERE organization_id = v_demo_org_id)
  );

  DELETE FROM public.bill_deductions 
  WHERE bill_id IN (
    SELECT id FROM public.ra_bills 
    WHERE project_id IN (SELECT id FROM public.projects WHERE organization_id = v_demo_org_id)
  );

  -- 16. Delete demo RA bills
  DELETE FROM public.ra_bills 
  WHERE project_id IN (SELECT id FROM public.projects WHERE organization_id = v_demo_org_id);

  -- 17. Delete demo receivable payments and bills
  DELETE FROM public.receivable_payments 
  WHERE project_id IN (SELECT id FROM public.projects WHERE organization_id = v_demo_org_id);

  DELETE FROM public.bills 
  WHERE project_id IN (SELECT id FROM public.projects WHERE organization_id = v_demo_org_id);

  -- 18. Delete demo vendor payments, purchases, and vendors
  DELETE FROM public.vendor_payments 
  WHERE project_id IN (SELECT id FROM public.projects WHERE organization_id = v_demo_org_id);

  DELETE FROM public.vendor_purchases 
  WHERE project_id IN (SELECT id FROM public.projects WHERE organization_id = v_demo_org_id);

  DELETE FROM public.vendors 
  WHERE project_id IN (SELECT id FROM public.projects WHERE organization_id = v_demo_org_id);

  -- 19. Delete demo ledger entries
  DELETE FROM public.ledger 
  WHERE project_id IN (SELECT id FROM public.projects WHERE organization_id = v_demo_org_id);

  -- 20. Delete demo project members
  DELETE FROM public.project_members 
  WHERE project_id IN (SELECT id FROM public.projects WHERE organization_id = v_demo_org_id);

  -- 21. Delete demo projects
  DELETE FROM public.projects 
  WHERE organization_id = v_demo_org_id;

  -- 22. Delete demo organization
  DELETE FROM public.organizations 
  WHERE id = v_demo_org_id OR name = 'PillarPro Demo';

  -- 23. Delete demo user records
  IF v_demo_user_id IS NOT NULL THEN
    DELETE FROM public.roles WHERE user_id = v_demo_user_id;
    DELETE FROM public.user_profiles WHERE id = v_demo_user_id;
    DELETE FROM auth.identities WHERE user_id = v_demo_user_id;
    DELETE FROM auth.users WHERE id = v_demo_user_id;
  END IF;

  DELETE FROM auth.identities WHERE identity_data->>'email' IN ('demo@pillarpro.app', 'demo@pillarpro.com');
  DELETE FROM auth.users WHERE email IN ('demo@pillarpro.app', 'demo@pillarpro.com');

END $$;
