-- ============================================================
-- PillarPro v2 — Migration 024: Self-Serve Contractor Onboarding & Starter Seed RPC
-- 
-- 1. Adds public.onboard_contractor() SECURITY DEFINER RPC
-- 2. Creates new organization for signing-up contractor
-- 3. Activates user profile and assigns 'owner' role
-- 4. Optionally seeds an isolated, realistic starter civil project
--    (Highway Widening, RA Bill with deductions, Supplier, Workers, BG Alert)
-- ============================================================

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

  -- Starter entities (only populated if p_seed_starter is TRUE)
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

  -- 3. Create isolated Organization
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
    'owner',
    NULL
  )
  ON CONFLICT (user_id) DO UPDATE SET
    role = 'owner',
    project_id = NULL;

  -- 6. Seed Starter Civil Project (Optional, for instant live dashboard)
  IF p_seed_starter IS TRUE THEN
    v_project_id := gen_random_uuid();
    v_bill_id := gen_random_uuid();
    v_payment_id := gen_random_uuid();
    v_supplier_id := gen_random_uuid();
    v_w1_id := gen_random_uuid();
    v_w2_id := gen_random_uuid();
    v_bg_id := gen_random_uuid();
    v_expense_id := gen_random_uuid();

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
      5.00, -- retention = 2,10,000, net payable = 39,90,000
      2500000.00, -- gross paid installment, outstanding = 14,90,000
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

    -- 6.6 Receivables Sync
    INSERT INTO public.bills (
      id, project_id, bill_number, bill_type, bill_date, gross_amount, deductions, created_by
    ) VALUES (
      v_bill_id, v_project_id, 'RA Bill 01', 'RA Bill', CURRENT_DATE - INTERVAL '15 days', 4200000.00, 210000.00, v_user_id
    );

    INSERT INTO public.receivable_payments (
      id, bill_id, project_id, amount_received, date, mode, reference, created_by
    ) VALUES (
      gen_random_uuid(), v_bill_id, v_project_id, 2500000.00, CURRENT_DATE - INTERVAL '3 days', 'bank_transfer', 'TR/SGR/2026/0411', v_user_id
    );

    -- 6.7 Security Deposit / Bank Guarantee (Expiring in 24 days to demonstrate alert banner)
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
      CURRENT_DATE + INTERVAL '24 days', -- Expiry in 24 days activates dashboard banner
      CURRENT_DATE + INTERVAL '54 days',
      'active',
      'Contract performance guarantee. Executive Engineer notified for extension.',
      v_user_id
    );

    -- 6.8 Supplier & Procurement
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

    -- 6.9 Workers & Muster Roll Attendance
    INSERT INTO public.workers (
      id, organization_id, name, role, phone, daily_wage, created_by
    ) VALUES
    (v_w1_id, v_org_id, 'Bashir Ahmad Reshi', 'Mason / Mistri', '+91 94191 55221', 900.00, v_user_id),
    (v_w2_id, v_org_id, 'Raju Kumar', 'Beldar / Helper', '+91 97970 88312', 600.00, v_user_id);

    INSERT INTO public.worker_project_assignments (
      id, worker_id, project_id
    ) VALUES
    (gen_random_uuid(), v_w1_id, v_project_id),
    (gen_random_uuid(), v_w2_id, v_project_id)
    ON CONFLICT DO NOTHING;

    INSERT INTO public.attendance (
      id, worker_id, project_id, date, status, shift_type, wage_amount, created_by
    ) VALUES
    (gen_random_uuid(), v_w1_id, v_project_id, CURRENT_DATE, 'present', 'full', 900.00, v_user_id),
    (gen_random_uuid(), v_w2_id, v_project_id, CURRENT_DATE, 'present', 'full', 600.00, v_user_id)
    ON CONFLICT DO NOTHING;

    -- 6.10 Site Expense
    INSERT INTO public.expenses (
      id,
      project_id,
      category,
      amount,
      expense_date,
      description,
      vendor,
      created_by
    ) VALUES (
      v_expense_id,
      v_project_id,
      'Fuel & POL',
      12500.00,
      CURRENT_DATE - INTERVAL '2 days',
      '200L Diesel for JCB Excavator at chainage 4+200',
      'Indian Oil Retail Outlet',
      v_user_id
    );

    -- 6.11 Central Ledger Sync
    INSERT INTO public.ledger (
      id, project_id, entry_type, category, amount, date, source_table, source_id, created_by
    ) VALUES
    (
      gen_random_uuid(),
      v_project_id,
      'income',
      'ra_bill_payment',
      2375000.00,
      CURRENT_DATE - INTERVAL '3 days',
      'ra_bill_payments',
      v_payment_id,
      v_user_id
    ),
    (
      gen_random_uuid(),
      v_project_id,
      'expense',
      'supplier_payment',
      400000.00,
      CURRENT_DATE - INTERVAL '8 days',
      'supplier_transactions',
      v_supplier_id,
      v_user_id
    ),
    (
      gen_random_uuid(),
      v_project_id,
      'expense',
      'site_expense',
      12500.00,
      CURRENT_DATE - INTERVAL '2 days',
      'expenses',
      v_expense_id,
      v_user_id
    );

  END IF;

  RETURN json_build_object(
    'success', true,
    'organization_id', v_org_id,
    'organization_name', v_firm_clean
  );
END;
$$;

-- Grant authenticated users execute permission on onboarding RPC
GRANT EXECUTE ON FUNCTION public.onboard_contractor(TEXT, TEXT, BOOLEAN) TO authenticated;
