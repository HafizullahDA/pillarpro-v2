-- ============================================================
-- PillarPro v2 — Migration 023: Completely Remove Demo Organization & Demo User
-- 
-- 1. Disables RLS bypass & replication role to ensure complete cascade deletion
-- 2. Preserves real firm partners (Hafizullah Lone & Habibullah Lone)
-- 3. Deletes all demo data across all tables
-- 4. Deletes the demo organization and demo user completely
-- 5. Restores replication role and re-enables RLS
-- ============================================================

-- Disable FK constraint checks during the cleanup
SET session_replication_role = 'replica';

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

  -- 4. Delete all attendance linked to demo projects or demo workers
  DELETE FROM public.attendance 
  WHERE project_id IN (SELECT id FROM public.projects WHERE organization_id = v_demo_org_id)
     OR worker_id IN (SELECT id FROM public.workers WHERE organization_id = v_demo_org_id)
     OR project_id IN ('d1111111-1111-4111-a111-111111111111'::uuid, 'd2222222-2222-4222-a222-222222222222'::uuid)
     OR worker_id IN (
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

  -- 5. Delete wage payments
  DELETE FROM public.wage_payments 
  WHERE organization_id = v_demo_org_id 
     OR project_id IN (SELECT id FROM public.projects WHERE organization_id = v_demo_org_id);

  -- 6. Delete worker project assignments
  DELETE FROM public.worker_project_assignments 
  WHERE project_id IN (SELECT id FROM public.projects WHERE organization_id = v_demo_org_id)
     OR worker_id IN (SELECT id FROM public.workers WHERE organization_id = v_demo_org_id)
     OR project_id IN ('d1111111-1111-4111-a111-111111111111'::uuid, 'd2222222-2222-4222-a222-222222222222'::uuid);

  -- 7. Delete workers
  DELETE FROM public.workers 
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

  -- 8. Delete partner transactions and project partner shares
  DELETE FROM public.partner_transactions 
  WHERE organization_id = v_demo_org_id 
     OR project_id IN (SELECT id FROM public.projects WHERE organization_id = v_demo_org_id)
     OR project_id IN ('d1111111-1111-4111-a111-111111111111'::uuid, 'd2222222-2222-4222-a222-222222222222'::uuid);

  DELETE FROM public.project_partners 
  WHERE organization_id = v_demo_org_id 
     OR project_id IN (SELECT id FROM public.projects WHERE organization_id = v_demo_org_id)
     OR project_id IN ('d1111111-1111-4111-a111-111111111111'::uuid, 'd2222222-2222-4222-a222-222222222222'::uuid);

  -- 9. Delete remaining partners belonging to demo org
  DELETE FROM public.partners 
  WHERE organization_id = v_demo_org_id;

  -- 10. Delete supplier transactions and suppliers
  DELETE FROM public.supplier_transactions 
  WHERE organization_id = v_demo_org_id 
     OR project_id IN (SELECT id FROM public.projects WHERE organization_id = v_demo_org_id)
     OR supplier_id IN (SELECT id FROM public.suppliers WHERE organization_id = v_demo_org_id);

  DELETE FROM public.suppliers 
  WHERE organization_id = v_demo_org_id;

  -- 11. Delete security deposits
  DELETE FROM public.security_deposits 
  WHERE organization_id = v_demo_org_id 
     OR project_id IN (SELECT id FROM public.projects WHERE organization_id = v_demo_org_id);

  -- 12. Delete RA bill payments, deductions, and bills
  DELETE FROM public.ra_bill_payments 
  WHERE bill_id IN (
    SELECT id FROM public.ra_bills 
    WHERE project_id IN (SELECT id FROM public.projects WHERE organization_id = v_demo_org_id)
       OR project_id IN ('d1111111-1111-4111-a111-111111111111'::uuid, 'd2222222-2222-4222-a222-222222222222'::uuid)
  );

  DELETE FROM public.bill_deductions 
  WHERE bill_id IN (
    SELECT id FROM public.ra_bills 
    WHERE project_id IN (SELECT id FROM public.projects WHERE organization_id = v_demo_org_id)
       OR project_id IN ('d1111111-1111-4111-a111-111111111111'::uuid, 'd2222222-2222-4222-a222-222222222222'::uuid)
  );

  DELETE FROM public.ra_bills 
  WHERE project_id IN (SELECT id FROM public.projects WHERE organization_id = v_demo_org_id)
     OR project_id IN ('d1111111-1111-4111-a111-111111111111'::uuid, 'd2222222-2222-4222-a222-222222222222'::uuid);

  -- 13. Delete receivable payments and bills
  DELETE FROM public.receivable_payments 
  WHERE project_id IN (SELECT id FROM public.projects WHERE organization_id = v_demo_org_id)
     OR project_id IN ('d1111111-1111-4111-a111-111111111111'::uuid, 'd2222222-2222-4222-a222-222222222222'::uuid);

  DELETE FROM public.bills 
  WHERE project_id IN (SELECT id FROM public.projects WHERE organization_id = v_demo_org_id)
     OR project_id IN ('d1111111-1111-4111-a111-111111111111'::uuid, 'd2222222-2222-4222-a222-222222222222'::uuid);

  -- 14. Delete expenses
  DELETE FROM public.expenses 
  WHERE project_id IN (SELECT id FROM public.projects WHERE organization_id = v_demo_org_id)
     OR project_id IN ('d1111111-1111-4111-a111-111111111111'::uuid, 'd2222222-2222-4222-a222-222222222222'::uuid);

  -- 15. Delete vendor payments, purchases, and vendors
  DELETE FROM public.vendor_payments 
  WHERE project_id IN (SELECT id FROM public.projects WHERE organization_id = v_demo_org_id)
     OR project_id IN ('d1111111-1111-4111-a111-111111111111'::uuid, 'd2222222-2222-4222-a222-222222222222'::uuid);

  DELETE FROM public.vendor_purchases 
  WHERE project_id IN (SELECT id FROM public.projects WHERE organization_id = v_demo_org_id)
     OR project_id IN ('d1111111-1111-4111-a111-111111111111'::uuid, 'd2222222-2222-4222-a222-222222222222'::uuid);

  DELETE FROM public.vendors 
  WHERE project_id IN (SELECT id FROM public.projects WHERE organization_id = v_demo_org_id)
     OR project_id IN ('d1111111-1111-4111-a111-111111111111'::uuid, 'd2222222-2222-4222-a222-222222222222'::uuid);

  -- 16. Delete ledger entries and project members
  DELETE FROM public.ledger 
  WHERE project_id IN (SELECT id FROM public.projects WHERE organization_id = v_demo_org_id)
     OR project_id IN ('d1111111-1111-4111-a111-111111111111'::uuid, 'd2222222-2222-4222-a222-222222222222'::uuid);

  DELETE FROM public.project_members 
  WHERE project_id IN (SELECT id FROM public.projects WHERE organization_id = v_demo_org_id)
     OR project_id IN ('d1111111-1111-4111-a111-111111111111'::uuid, 'd2222222-2222-4222-a222-222222222222'::uuid);

  -- 17. Delete demo projects
  DELETE FROM public.projects 
  WHERE organization_id = v_demo_org_id
     OR id IN ('d1111111-1111-4111-a111-111111111111'::uuid, 'd2222222-2222-4222-a222-222222222222'::uuid);

  -- 18. Delete demo organization
  DELETE FROM public.organizations 
  WHERE id = v_demo_org_id OR name = 'PillarPro Demo';

  -- 19. Delete demo user
  IF v_demo_user_id IS NOT NULL THEN
    DELETE FROM public.roles WHERE user_id = v_demo_user_id;
    DELETE FROM public.user_profiles WHERE id = v_demo_user_id;
    DELETE FROM auth.identities WHERE user_id = v_demo_user_id;
    DELETE FROM auth.users WHERE id = v_demo_user_id;
  END IF;

  DELETE FROM auth.identities WHERE identity_data->>'email' IN ('demo@pillarpro.app', 'demo@pillarpro.com');
  DELETE FROM auth.users WHERE email IN ('demo@pillarpro.app', 'demo@pillarpro.com');

END $$;

-- Restore FK constraint enforcement
SET session_replication_role = 'origin';
