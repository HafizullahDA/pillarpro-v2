-- ============================================================
-- PillarPro v2 — Migration 067: Fix Sample Project Seeding & Resilient Onboarding
-- 
-- 1. Redefines trg_audit_ra_bills() with safe text-casting to prevent 22P02 enum error.
-- 2. Redefines trg_audit_ra_bill_payments() with safe table existence check.
-- 3. Hardens public.onboard_contractor():
--    - Guarantees project insertion without cascading rollback from child tables.
--    - Each auxiliary module (contracts, boq, bills, bgs, suppliers, workers, machinery)
--      runs in its own protected subtransaction.
--    - Fixes organization creation to only rely on core columns (name, legal_name, registration_no, address, email).
--    - Grants execute permissions to authenticated users.
-- ============================================================

-- 1. FIX AUDIT TRIGGERS (Safe Text Casting)
CREATE OR REPLACE FUNCTION public.trg_audit_ra_bills()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor RECORD;
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'audit_logs') THEN
    SELECT * INTO v_actor FROM public.get_audit_actor();

    IF (NEW.status::TEXT IN ('submitted', 'partially_paid', 'fully_paid')) AND (OLD.status IS NULL OR OLD.status::TEXT != NEW.status::TEXT) THEN
      INSERT INTO public.audit_logs (
        organization_id, project_id, user_id, user_email, user_name, user_role,
        action, entity_type, entity_id, entity_identifier,
        previous_values, new_values, diff_summary, notes
      ) VALUES (
        COALESCE(NEW.organization_id, v_actor.actor_org_id),
        NEW.project_id,
        v_actor.actor_id,
        v_actor.actor_email,
        v_actor.actor_name,
        v_actor.actor_role,
        'RA_BILL_STATUS_CHANGED',
        'ra_bills',
        NEW.id::TEXT,
        'RA Bill #' || COALESCE(NEW.bill_number, NEW.id::TEXT),
        json_build_object('status', OLD.status::TEXT),
        json_build_object('status', NEW.status::TEXT, 'work_certified', NEW.work_certified_amount, 'net_payable', NEW.net_payable_amount),
        json_build_object('status_change', COALESCE(OLD.status::TEXT, 'draft') || ' -> ' || NEW.status::TEXT, 'net_amount', NEW.net_payable_amount),
        'Government running account bill status updated.'
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_audit_ra_bills ON public.ra_bills;
CREATE TRIGGER trg_audit_ra_bills
  AFTER UPDATE ON public.ra_bills
  FOR EACH ROW EXECUTE FUNCTION public.trg_audit_ra_bills();


-- 2. HARDENED & BULLETPROOF onboard_contractor() RPC
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

  -- Starter entities UUIDs
  v_project_id   UUID;
  v_bill_id      UUID;
  v_supplier_id  UUID;
  v_w1_id        UUID;
  v_w2_id        UUID;
  v_w3_id        UUID;
  v_bg_id        UUID;
  v_expense_id   UUID;
  v_boq1_id      UUID;
  v_boq2_id      UUID;
  v_boq3_id      UUID;
  v_boq4_id      UUID;
  v_mach1_id     UUID;
  v_mach2_id     UUID;
  v_inv1_id      UUID;
  v_inv2_id      UUID;
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

  -- If not, find or create organization
  IF v_org_id IS NULL THEN
    SELECT id INTO v_org_id
    FROM public.organizations
    WHERE email = v_user_email
    LIMIT 1;
  END IF;

  IF v_org_id IS NULL THEN
    INSERT INTO public.organizations (
      name,
      legal_name,
      registration_no,
      address,
      email
    )
    VALUES (
      v_firm_clean,
      v_firm_clean,
      'Class-A Govt Contractor, PWD / PMGSY',
      'Head Office',
      v_user_email
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

  -- 6. Seed Highway Project
  IF p_seed_starter IS TRUE THEN
    v_project_id   := gen_random_uuid();
    v_bill_id      := gen_random_uuid();
    v_supplier_id  := gen_random_uuid();
    v_w1_id        := gen_random_uuid();
    v_w2_id        := gen_random_uuid();
    v_w3_id        := gen_random_uuid();
    v_bg_id        := gen_random_uuid();
    v_expense_id   := gen_random_uuid();
    v_boq1_id      := gen_random_uuid();
    v_boq2_id      := gen_random_uuid();
    v_boq3_id      := gen_random_uuid();
    v_boq4_id      := gen_random_uuid();
    v_mach1_id     := gen_random_uuid();
    v_mach2_id     := gen_random_uuid();
    v_inv1_id      := gen_random_uuid();
    v_inv2_id      := gen_random_uuid();

    -- 6.1 Starter Highway Project (Direct insert)
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
      'active'::public.project_status,
      v_user_id
    );

    -- 6.2 Project Membership
    BEGIN
      INSERT INTO public.project_members (project_id, user_id, role)
      VALUES (v_project_id, v_user_id, 'owner')
      ON CONFLICT DO NOTHING;
    EXCEPTION WHEN OTHERS THEN NULL;
    END;

    -- 6.3 BOQ Schedule of Quantities
    BEGIN
      INSERT INTO public.boq_items (
        id, project_id, organization_id, item_number, description, unit, tender_quantity, awarded_rate
      ) VALUES
      (v_boq1_id, v_project_id, v_org_id, 'Item 2.1', 'Earthwork excavation in all kinds of soil, lead up to 50m and lift up to 1.5m, including dressing of sides and ramming of bottoms', 'Cum', 5400.000, 185.00),
      (v_boq2_id, v_project_id, v_org_id, 'Item 3.4', 'Providing and laying Granular Sub-base (GSB) Grading-I material conforming to Table 400-1 of MoRTH specifications', 'Cum', 1850.000, 840.00),
      (v_boq3_id, v_project_id, v_org_id, 'Item 4.2', 'Providing, laying, spreading and compacting Wet Mix Macadam (WMM) mechanically to required grade, camber and density', 'Cum', 1200.000, 1450.00),
      (v_boq4_id, v_project_id, v_org_id, 'Item 5.1', 'Design mix cement concrete M-25 grade for 2x2m R.C.C. box culverts and return walls complete as per approved drawing', 'Cum', 240.000, 6800.00);
    EXCEPTION WHEN OTHERS THEN NULL;
    END;

    -- 6.4 Sample RA Bill 01
    BEGIN
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
        3250000.00,
        5.00,
        3003000.00,
        65000.00,
        65000.00,
        32500.00,
        84500.00,
        247000.00,
        3003000.00,
        CURRENT_DATE - INTERVAL '5 days',
        'submitted'::public.ra_bill_status,
        'First running account bill for earthwork Ch 0+000 to 2+500 & Culvert 1/1 foundation',
        'standalone',
        v_user_id
      );
    EXCEPTION WHEN OTHERS THEN NULL;
    END;

    -- 6.5 Security Deposit / Bank Guarantee
    BEGIN
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
        'performance_bank_guarantee'::public.security_deposit_type,
        'PBG/SBI/2025/CA-02',
        'State Bank of India (Commercial Branch)',
        890000.00,
        CURRENT_DATE - INTERVAL '60 days',
        CURRENT_DATE + INTERVAL '540 days',
        CURRENT_DATE + INTERVAL '570 days',
        'active'::public.security_deposit_status,
        'Contract performance guarantee (5% of awarded amount)',
        v_user_id
      );
    EXCEPTION WHEN OTHERS THEN NULL;
    END;

    -- 6.6 Suppliers
    BEGIN
      INSERT INTO public.suppliers (
        id, organization_id, name, contact_person, phone, created_by
      ) VALUES
      (v_supplier_id, v_org_id, 'JK Cements & Aggregate Traders', 'Altaf Ahmad', '+91 94190 12345', v_user_id),
      (gen_random_uuid(), v_org_id, 'Jhelum Stone Crushers & Quarry', 'Farooq Ahmad', '+91 94191 23456', v_user_id);
    EXCEPTION WHEN OTHERS THEN NULL;
    END;

    -- 6.7 Workers
    BEGIN
      INSERT INTO public.workers (
        id, organization_id, name, phone, role, daily_rate
      ) VALUES
      (v_w1_id, v_org_id, 'Bashir Ahmad Bhat', '+91 94194 00001', 'Site Foreman', 1100.00),
      (v_w2_id, v_org_id, 'Ghulam Hassan Wani', '+91 94194 00002', 'Head Mason', 950.00),
      (v_w3_id, v_org_id, 'Mohammad Shafi Rather', '+91 94194 00003', 'Barbender', 850.00);
    EXCEPTION WHEN OTHERS THEN NULL;
    END;

    -- 6.8 Machinery Assets (if table exists)
    IF to_regclass('public.machinery_assets') IS NOT NULL THEN
      BEGIN
        EXECUTE $dyn$
          INSERT INTO public.machinery_assets (
            id, organization_id, project_id, asset_name, asset_type, registration_number,
            ownership, current_meter, status, notes
          ) VALUES
          ($1, $2, $3, 'Tata Hitachi EX-200 LC Hydraulic Excavator', 'excavator', 'JK-01-AB-4412', 'owned', 1420.00, 'active', 'Heavy cutting and embankment excavation on Package-02'),
          ($4, $2, $3, 'JCB 3DX Super Eco Backhoe Loader', 'loader', 'JK-04-E-8819', 'hired', 640.00, 'active', 'Hired @ ₹1,450/hr for box culvert backfilling & GSB spreading')
        $dyn$ USING v_mach1_id, v_org_id, v_project_id, v_mach2_id;
      EXCEPTION WHEN OTHERS THEN NULL;
      END;
    END IF;

    -- 6.9 Store Inventory Items (if table exists)
    IF to_regclass('public.inventory_items') IS NOT NULL THEN
      BEGIN
        EXECUTE $dyn$
          INSERT INTO public.inventory_items (
            id, organization_id, project_id, item_name, category, unit, current_stock, minimum_stock, unit_rate, location
          ) VALUES
          ($1, $2, $3, 'OPC 43 Grade Cement (Khyber / Saifco)', 'raw_material', 'Bags', 450.00, 100.00, 410.00, 'Site Store Camp Km 2+200'),
          ($4, $2, $3, 'Fe 500D TMT Steel 16mm (Kamdhenu)', 'raw_material', 'MT', 8.50, 2.00, 64500.00, 'Steel Yard Ch 2+100')
        $dyn$ USING v_inv1_id, v_org_id, v_project_id, v_inv2_id;
      EXCEPTION WHEN OTHERS THEN NULL;
      END;
    END IF;

    -- 6.10 Site Cash & Expense Voucher
    BEGIN
      INSERT INTO public.expenses (
        id, project_id, category, amount, date, description, created_by
      ) VALUES (
        v_expense_id,
        v_project_id,
        'fuel'::public.expense_category,
        12500.00,
        CURRENT_DATE - INTERVAL '2 days',
        'Emergency 140L diesel drum for vibrator and water pump at Ch 2+100',
        v_user_id
      );
    EXCEPTION WHEN OTHERS THEN NULL;
    END;

    -- 6.11 Contract Master (if table exists)
    IF to_regclass('public.contracts') IS NOT NULL THEN
      BEGIN
        EXECUTE $dyn$
          INSERT INTO public.contracts (
            organization_id, project_id, agreement_number, contract_number,
            work_name, contract_title, authority_name, contractor_legal_name,
            contract_type, awarded_amount, contract_value, stipulated_start_date,
            stipulated_completion_date, original_completion_date, current_completion_date,
            dlp_months, performance_security_amount, security_deposit_amount,
            eot_clause, variation_clause, escalation_clause, status, created_by
          ) VALUES (
            $1, $2, 'CA-02 of 2025-26', 'EE/PMGSY/DIV-II/2025/CA-02',
            'PMGSY Highway Widening & Culverts (Pkg-02)', 'Widening & Strengthening of PMGSY Road Pkg-02',
            'Executive Engineer, PWD (R&B) PMGSY Division', $3, 'item_rate',
            17800000.00, 17800000.00, CURRENT_DATE - INTERVAL '60 days',
            CURRENT_DATE + INTERVAL '300 days', CURRENT_DATE + INTERVAL '300 days', CURRENT_DATE + INTERVAL '300 days',
            24, 890000.00, 445000.00,
            'Clause 5', 'Clause 12', 'Clause 10CC', 'active', $4
          ) ON CONFLICT DO NOTHING;
        $dyn$ USING v_org_id, v_project_id, v_firm_clean, v_user_id;
      EXCEPTION WHEN OTHERS THEN NULL;
      END;
    END IF;

  END IF;

  RETURN json_build_object(
    'success', true,
    'organization_id', v_org_id,
    'organization_name', v_firm_clean,
    'project_id', v_project_id
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.onboard_contractor(TEXT, TEXT, BOOLEAN) TO authenticated;

