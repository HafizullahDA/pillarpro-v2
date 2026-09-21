-- ============================================================
-- PillarPro v2 — Migration 039: Fix Project Members & Contractor Auto-Onboarding
--
-- 1. Adds 'role' column to public.project_members to prevent missing column errors
-- 2. Hardens public.onboard_contractor() RPC:
--    - Activates contractor account & creates organization
--    - Assigns 'owner' role
--    - Safely seeds starter project with matched schemas
--    - Wraps seed data in fault-tolerant block so onboarding NEVER fails
-- 3. Updates handle_new_user() trigger function so future signups
--    with 'firm_name' are automatically provisioned as active owners
-- ============================================================

-- 1. Ensure project_members table has role column
ALTER TABLE public.project_members 
  ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'member';

-- 2. Update handle_new_user() trigger for instant auto-activation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_firm_name TEXT;
  v_display_name TEXT;
  v_org_id UUID;
BEGIN
  v_firm_name := TRIM(COALESCE(NEW.raw_user_meta_data->>'firm_name', ''));
  v_display_name := TRIM(COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)));

  -- If firm_name is provided in user_metadata, auto-create organization and activate as owner
  IF v_firm_name <> '' THEN
    INSERT INTO public.organizations (name, legal_name, registration_no, email)
    VALUES (v_firm_name, v_firm_name, 'Class-A Govt Contractor, PWD / PMGSY', NEW.email)
    RETURNING id INTO v_org_id;

    INSERT INTO public.user_profiles (id, email, display_name, status, organization_id)
    VALUES (NEW.id, NEW.email, v_display_name, 'active', v_org_id)
    ON CONFLICT (id) DO UPDATE SET
      status = 'active',
      organization_id = v_org_id,
      display_name = v_display_name;

    INSERT INTO public.roles (user_id, role)
    VALUES (NEW.id, 'owner'::public.user_role)
    ON CONFLICT (user_id) DO UPDATE SET role = 'owner'::public.user_role;
  ELSE
    INSERT INTO public.user_profiles (id, email, display_name, status)
    VALUES (NEW.id, NEW.email, v_display_name, 'pending')
    ON CONFLICT (id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

-- 3. Hardened onboard_contractor() RPC
CREATE OR REPLACE FUNCTION public.onboard_contractor(
  p_firm_name TEXT,
  p_display_name TEXT DEFAULT NULL,
  p_seed_starter BOOLEAN DEFAULT TRUE
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_user_email TEXT;
  v_org_id UUID;
  v_firm_clean TEXT;
  v_name_clean TEXT;

  -- Starter entities
  v_project_id UUID;
  v_bill_id UUID;
  v_payment_id UUID;
  v_supplier_id UUID;
  v_w1_id UUID;
  v_w2_id UUID;
  v_bg_id UUID;
  v_expense_id UUID;
BEGIN
  -- 1. Verify caller authentication
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated. You must be logged in to complete onboarding.';
  END IF;

  SELECT email INTO v_user_email FROM auth.users WHERE id = v_user_id;

  -- 2. Clean and default firm & display names
  v_firm_clean := TRIM(COALESCE(p_firm_name, ''));
  IF v_firm_clean = '' THEN
    v_firm_clean := 'My Contracting Firm';
  END IF;

  v_name_clean := TRIM(COALESCE(p_display_name, ''));
  IF v_name_clean = '' THEN
    v_name_clean := split_part(COALESCE(v_user_email, 'Contractor'), '@', 1);
  END IF;

  -- 3. Check if user already has an organization
  SELECT organization_id INTO v_org_id
  FROM public.user_profiles
  WHERE id = v_user_id AND organization_id IS NOT NULL;

  -- If not, create isolated Organization
  IF v_org_id IS NULL THEN
    INSERT INTO public.organizations (
      name,
      legal_name,
      registration_no,
      address,
      email,
      created_at,
      updated_at
    )
    VALUES (
      v_firm_clean,
      v_firm_clean,
      'Class-A Govt Contractor, PWD / PMGSY',
      'Head Office',
      v_user_email,
      NOW(),
      NOW()
    )
    RETURNING id INTO v_org_id;
  ELSE
    UPDATE public.organizations
    SET name = v_firm_clean, legal_name = v_firm_clean, updated_at = NOW()
    WHERE id = v_org_id;
  END IF;

  -- 4. Activate User Profile & link to organization
  INSERT INTO public.user_profiles (
    id,
    email,
    display_name,
    status,
    organization_id,
    created_at,
    updated_at
  )
  VALUES (
    v_user_id,
    v_user_email,
    v_name_clean,
    'active',
    v_org_id,
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    display_name = EXCLUDED.display_name,
    status = 'active',
    organization_id = v_org_id,
    updated_at = NOW();

  -- 5. Assign Owner role
  INSERT INTO public.roles (
    user_id,
    role,
    project_id
  )
  VALUES (
    v_user_id,
    'owner'::public.user_role,
    NULL
  )
  ON CONFLICT (user_id) DO UPDATE SET
    role = 'owner'::public.user_role,
    project_id = NULL;

  -- 6. Seed Starter Civil Project (Wrapped in exception block for 100% resilience)
  IF p_seed_starter IS TRUE THEN
    BEGIN
      v_project_id  := gen_random_uuid();
      v_bill_id     := gen_random_uuid();
      v_payment_id  := gen_random_uuid();
      v_supplier_id := gen_random_uuid();
      v_w1_id       := gen_random_uuid();
      v_w2_id       := gen_random_uuid();
      v_bg_id       := gen_random_uuid();
      v_expense_id  := gen_random_uuid();

      -- 6.1 Starter Project
      INSERT INTO public.projects (
        id,
        organization_id,
        name,
        agency_name,
        advertised_cost,
        awarded_amount,
        start_date,
        end_date,
        status,
        created_by
      ) VALUES (
        v_project_id,
        v_org_id,
        'PMGSY Highway Widening & Culverts (Pkg-02)',
        'PWD (R&B) National Highway Division',
        18500000.00,
        17800000.00,
        CURRENT_DATE - INTERVAL '60 days',
        CURRENT_DATE + INTERVAL '300 days',
        'active',
        v_user_id
      );

      -- 6.2 Project Membership
      INSERT INTO public.project_members (
        project_id,
        user_id,
        role
      ) VALUES (
        v_project_id,
        v_user_id,
        'owner'
      ) ON CONFLICT DO NOTHING;

      -- 6.3 Sample RA Bill (Partially Paid with Deductions)
      INSERT INTO public.ra_bills (
        id,
        organization_id,
        project_id,
        bill_number,
        submission_date,
        work_certified_amount,
        retention_percentage,
        amount_received,
        tds_deducted,
        gst_tds_deducted,
        labour_cess_deducted,
        other_deductions,
        total_deductions,
        net_bank_received,
        date_received,
        status,
        remarks,
        billing_mode,
        created_by
      ) VALUES (
        v_bill_id,
        v_org_id,
        v_project_id,
        'RA Bill 01',
        CURRENT_DATE - INTERVAL '15 days',
        4200000.00,
        5.00,
        2500000.00,
        50000.00,
        50000.00,
        25000.00,
        0.00,
        125000.00,
        2375000.00,
        CURRENT_DATE - INTERVAL '3 days',
        'partially_paid',
        'Earthwork embankment, sub-base GSB and 3 box culverts certified.',
        'standalone',
        v_user_id
      );

      -- 6.4 Payment Record with Statutory Breakdown
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
      ) VALUES (
        v_payment_id,
        v_bill_id,
        v_project_id,
        CURRENT_DATE - INTERVAL '3 days',
        2500000.00,
        50000.00,
        50000.00,
        25000.00,
        0.00,
        'TR/SGR/2026/0411',
        '1st installment released by division treasury'
      );

      -- 6.5 Statutory Bill Deductions Breakdown
      INSERT INTO public.bill_deductions (
        id, bill_id, payment_id, deduction_label, deduction_amount
      ) VALUES
      (gen_random_uuid(), v_bill_id, v_payment_id, 'Income Tax TDS (2%)', 50000.00),
      (gen_random_uuid(), v_bill_id, v_payment_id, 'GST TDS (2%)', 50000.00),
      (gen_random_uuid(), v_bill_id, v_payment_id, 'BOCW Labour Welfare Cess (1%)', 25000.00);

      -- 6.6 Security Deposit / Bank Guarantee
      INSERT INTO public.security_deposits (
        id,
        organization_id,
        project_id,
        deposit_type,
        reference_number,
        issuing_bank,
        amount,
        issue_date,
        expiry_date,
        claim_expiry_date,
        status,
        notes,
        created_by
      ) VALUES (
        v_bg_id,
        v_org_id,
        v_project_id,
        'performance_bank_guarantee',
        'PBG/HDFC/2026/8912',
        'HDFC Bank (Commercial Branch)',
        890000.00,
        CURRENT_DATE - INTERVAL '60 days',
        CURRENT_DATE + INTERVAL '24 days',
        CURRENT_DATE + INTERVAL '54 days',
        'active',
        'Contract performance guarantee. Executive Engineer notified for extension.',
        v_user_id
      );

      -- 6.7 Supplier & Procurement
      INSERT INTO public.suppliers (
        id,
        organization_id,
        name,
        contact_person,
        phone,
        created_by
      ) VALUES (
        v_supplier_id,
        v_org_id,
        'JK Cements & Aggregate Traders',
        'Altaf Ahmad',
        '+91 94190 12345',
        v_user_id
      );

      INSERT INTO public.supplier_transactions (
        id,
        supplier_id,
        project_id,
        transaction_type,
        amount,
        transaction_date,
        description,
        created_by
      ) VALUES
      (
        gen_random_uuid(),
        v_supplier_id,
        v_project_id,
        'procurement',
        650000.00,
        CURRENT_DATE - INTERVAL '20 days',
        '500 Bags OPC Cement & 10mm crushed aggregate',
        v_user_id
      ),
      (
        gen_random_uuid(),
        v_supplier_id,
        v_project_id,
        'payment',
        400000.00,
        CURRENT_DATE - INTERVAL '8 days',
        'Chq #440912 drawn on J&K Bank',
        v_user_id
      );

      -- 6.8 Workers & Project Assignments
      INSERT INTO public.workers (
        id, organization_id, name, trade, daily_wage_rate, phone
      ) VALUES
      (v_w1_id, v_org_id, 'Bashir Ahmad Reshi', 'Mason / Mistri', 900.00, '+91 94191 55221'),
      (v_w2_id, v_org_id, 'Raju Kumar', 'Beldar / Helper', 600.00, '+91 97970 88312')
      ON CONFLICT DO NOTHING;

      INSERT INTO public.worker_project_assignments (
        worker_id, project_id
      ) VALUES
      (v_w1_id, v_project_id),
      (v_w2_id, v_project_id)
      ON CONFLICT DO NOTHING;

      -- 6.9 Site Expense
      INSERT INTO public.expenses (
        id,
        project_id,
        category,
        amount,
        date,
        description,
        created_by
      ) VALUES (
        v_expense_id,
        v_project_id,
        'equipment'::public.expense_category,
        12500.00,
        CURRENT_DATE - INTERVAL '2 days',
        '200L Diesel for JCB Excavator at chainage 4+200',
        v_user_id
      );

    EXCEPTION WHEN OTHERS THEN
      -- Starter seeding error caught and ignored so onboarding ALWAYS succeeds
      RAISE NOTICE 'Notice: Starter project seeding skipped: %', SQLERRM;
    END;
  END IF;

  RETURN json_build_object(
    'success', true,
    'organization_id', v_org_id,
    'organization_name', v_firm_clean
  );
END;
$$;

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION public.onboard_contractor(TEXT, TEXT, BOOLEAN) TO authenticated;

