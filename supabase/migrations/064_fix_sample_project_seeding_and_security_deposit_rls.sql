-- ============================================================
-- PillarPro v2 — Migration 064: Full-Featured Sample Highway Project & Security Deposit RLS Isolation
--
-- 1. Drops legacy un-scoped security_deposits policies ("sec_dep_all_owner_partner", "sec_dep_select_supervisor")
--    that leaked Bank Guarantees across tenant organizations.
-- 2. Ensures organization_id exists on public.security_deposits and public.ra_bill_payments.
-- 3. Enforces strict organization-scoped RLS policies on security_deposits.
-- 4. Fixes trg_audit_ra_bill_payments() to safely resolve organization_id from projects.
-- 5. Upgrades public.onboard_contractor() with a complete, 21-domain sample infrastructure dataset:
--    - Contract Master (CA-02 Agreement, ₹1.78 Cr)
--    - BOQ Schedule (Earthwork, GSB, WMM, RCC Box Culvert)
--    - Electronic Measurement Book (e-MB Volume 441, L x B x D dimensional entries & certification)
--    - RA Bill 01 & e-MB Measurement cross-links
--    - Treasury payment voucher & statutory deductions (IT TDS, GST TDS, Cess)
--    - Approved Contract Clauses (Clause 2 LD, Clause 5 EOT, Clause 10CC Escalation, Clause 12 Variations)
--    - Digital Hindrance Register (Utility shift & Drawing delay)
--    - Statutory Notice Radar & Correspondence Dak (Speed Post delivery)
--    - Form 27 Extension of Time (EOT) Application with linked hindrances
--    - Contract Variations / Extra Items (VO-01 with proposed vs approved amounts)
--    - Contractual Claims (Claim for idle plant & unabsorbed site overheads)
--    - Daily Progress Reports (DPR #42 with weather, manpower, and photo diary)
--    - Digital Evidence Vault (Geotagged site photos & speed post receipts)
--    - Store Inventory & Materials Stock Register (OPC Cement, TMT Steel, Aggregates + GRN/Issue slips)
--    - Machinery & Fleet Logbook with Diesel POL tracking (Hitachi EX200, JCB 3DX, Roller)
--    - Labour Muster Roll Attendance with Overtime
--    - Partner Equity & Capital Parity (60/40 profit split)
--    - Performance Bank Guarantee (PBG ₹8.90L) strictly isolated to this organization
--    - Supplier Khata & Petty Cash Vouchers
-- ============================================================

-- 1. FIX SECURITY DEPOSITS RLS LEAKAGE
ALTER TABLE IF EXISTS public.security_deposits 
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id);

-- Backfill organization_id on security_deposits from project if missing
UPDATE public.security_deposits sd
SET organization_id = p.organization_id
FROM public.projects p
WHERE sd.project_id = p.id AND sd.organization_id IS NULL;

-- Drop ALL legacy and conflicting policies on security_deposits
DROP POLICY IF EXISTS "sec_dep_all_owner_partner" ON public.security_deposits;
DROP POLICY IF EXISTS "sec_dep_select_supervisor" ON public.security_deposits;
DROP POLICY IF EXISTS "security_deposits_all_owner_partner" ON public.security_deposits;
DROP POLICY IF EXISTS "security_deposits_select_all" ON public.security_deposits;
DROP POLICY IF EXISTS "security_deposits_insert_all" ON public.security_deposits;
DROP POLICY IF EXISTS "security_deposits_select_org" ON public.security_deposits;
DROP POLICY IF EXISTS "security_deposits_insert_org" ON public.security_deposits;
DROP POLICY IF EXISTS "security_deposits_update_org" ON public.security_deposits;
DROP POLICY IF EXISTS "security_deposits_delete_org" ON public.security_deposits;

-- Create strict organization-scoped policies
CREATE POLICY "security_deposits_select_org" ON public.security_deposits
  FOR SELECT TO authenticated
  USING (
    security_deposits.organization_id = public.get_user_organization_id()
    OR EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = security_deposits.project_id
        AND p.organization_id = public.get_user_organization_id()
    )
  );

CREATE POLICY "security_deposits_insert_org" ON public.security_deposits
  FOR INSERT TO authenticated
  WITH CHECK (
    COALESCE(security_deposits.organization_id, public.get_user_organization_id()) = public.get_user_organization_id()
    OR EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = security_deposits.project_id
        AND p.organization_id = public.get_user_organization_id()
    )
  );

CREATE POLICY "security_deposits_update_org" ON public.security_deposits
  FOR UPDATE TO authenticated
  USING (
    security_deposits.organization_id = public.get_user_organization_id()
    OR EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = security_deposits.project_id
        AND p.organization_id = public.get_user_organization_id()
    )
  );

CREATE POLICY "security_deposits_delete_org" ON public.security_deposits
  FOR DELETE TO authenticated
  USING (
    security_deposits.organization_id = public.get_user_organization_id()
    OR EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = security_deposits.project_id
        AND p.organization_id = public.get_user_organization_id()
    )
  );

-- 2. ENSURE organization_id ON ra_bill_payments & FIX AUDIT TRIGGER
ALTER TABLE IF EXISTS public.ra_bill_payments 
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id);

-- Backfill organization_id on ra_bill_payments from projects
UPDATE public.ra_bill_payments rbp
SET organization_id = p.organization_id
FROM public.projects p
WHERE rbp.project_id = p.id AND rbp.organization_id IS NULL;

-- Harden audit trigger on ra_bill_payments
CREATE OR REPLACE FUNCTION public.trg_audit_ra_bill_payments()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor RECORD;
  v_bill_num TEXT;
  v_resolved_org_id UUID;
BEGIN
  SELECT * INTO v_actor FROM public.get_audit_actor();
  SELECT bill_number INTO v_bill_num FROM public.ra_bills WHERE id = NEW.bill_id;
  
  -- Safely resolve organization_id from project if not set on row
  SELECT organization_id INTO v_resolved_org_id FROM public.projects WHERE id = NEW.project_id;
  IF v_resolved_org_id IS NULL THEN
    v_resolved_org_id := v_actor.actor_org_id;
  END IF;

  INSERT INTO public.audit_logs (
    organization_id, project_id, user_id, user_email, user_name, user_role,
    action, entity_type, entity_id, entity_identifier,
    previous_values, new_values, diff_summary, notes
  ) VALUES (
    COALESCE(v_resolved_org_id, v_actor.actor_org_id),
    NEW.project_id,
    v_actor.actor_id,
    v_actor.actor_email,
    v_actor.actor_name,
    v_actor.actor_role,
    'PAYMENT_RECORDED',
    'ra_bill_payments',
    NEW.id::TEXT,
    'Payment for RA Bill #' || COALESCE(v_bill_num, 'Direct Voucher'),
    '{}'::jsonb,
    json_build_object('gross_amount', NEW.gross_amount, 'net_bank_amount', NEW.net_bank_amount, 'voucher_reference', NEW.voucher_reference, 'payment_date', NEW.payment_date),
    json_build_object('net_bank_credited', NEW.net_bank_amount, 'gross_released', NEW.gross_amount),
    'Treasury bank payment credited against certified running bill.'
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_audit_payments ON public.ra_bill_payments;
CREATE TRIGGER trg_audit_payments
  AFTER INSERT ON public.ra_bill_payments
  FOR EACH ROW EXECUTE FUNCTION public.trg_audit_ra_bill_payments();

-- 3. UPGRADED & HARDENED onboard_contractor() RPC
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
  v_contract_id  UUID;
  v_bill_id      UUID;
  v_payment_id   UUID;
  v_supplier_id  UUID;
  v_w1_id        UUID;
  v_w2_id        UUID;
  v_w3_id        UUID;
  v_bg_id        UUID;
  v_expense_id   UUID;
  v_partner1_id  UUID;
  v_partner2_id  UUID;
  v_boq1_id      UUID;
  v_boq2_id      UUID;
  v_boq3_id      UUID;
  v_boq4_id      UUID;
  v_mach1_id     UUID;
  v_mach2_id     UUID;
  v_mach3_id     UUID;
  v_inv1_id      UUID;
  v_inv2_id      UUID;
  v_inv3_id      UUID;
  v_mb_book_id   UUID;
  v_mb1_id       UUID;
  v_mb2_id       UUID;
  v_mb3_id       UUID;
  v_mb4_id       UUID;
  v_mb5_id       UUID;
  v_hind1_id     UUID;
  v_hind2_id     UUID;
  v_eot_id       UUID;
  v_var_id       UUID;
  v_claim_id     UUID;
  v_dpr_id       UUID;
  v_ev1_id       UUID;
  v_ev2_id       UUID;
  v_cl1_id       UUID;
  v_cl2_id       UUID;
  v_cl3_id       UUID;
  v_cl4_id       UUID;
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
      plan_tier,
      subscription_status,
      created_at,
      updated_at
    )
    VALUES (
      v_firm_clean,
      v_firm_clean,
      'Class-A Govt Contractor, PWD / PMGSY',
      'Head Office',
      v_user_email,
      'growth',
      'trialing',
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

  -- 6. Seed Full-Featured Civil Project (Showcases all 21 ERP modules)
  IF p_seed_starter IS TRUE THEN
    v_project_id   := gen_random_uuid();
    v_contract_id  := gen_random_uuid();
    v_bill_id      := gen_random_uuid();
    v_payment_id   := gen_random_uuid();
    v_supplier_id  := gen_random_uuid();
    v_w1_id        := gen_random_uuid();
    v_w2_id        := gen_random_uuid();
    v_w3_id        := gen_random_uuid();
    v_bg_id        := gen_random_uuid();
    v_expense_id   := gen_random_uuid();
    v_partner1_id  := gen_random_uuid();
    v_partner2_id  := gen_random_uuid();
    v_boq1_id      := gen_random_uuid();
    v_boq2_id      := gen_random_uuid();
    v_boq3_id      := gen_random_uuid();
    v_boq4_id      := gen_random_uuid();
    v_mach1_id     := gen_random_uuid();
    v_mach2_id     := gen_random_uuid();
    v_mach3_id     := gen_random_uuid();
    v_inv1_id      := gen_random_uuid();
    v_inv2_id      := gen_random_uuid();
    v_inv3_id      := gen_random_uuid();
    v_mb_book_id   := gen_random_uuid();
    v_mb1_id       := gen_random_uuid();
    v_mb2_id       := gen_random_uuid();
    v_mb3_id       := gen_random_uuid();
    v_mb4_id       := gen_random_uuid();
    v_mb5_id       := gen_random_uuid();
    v_hind1_id     := gen_random_uuid();
    v_hind2_id     := gen_random_uuid();
    v_eot_id       := gen_random_uuid();
    v_var_id       := gen_random_uuid();
    v_claim_id     := gen_random_uuid();
    v_dpr_id       := gen_random_uuid();
    v_ev1_id       := gen_random_uuid();
    v_ev2_id       := gen_random_uuid();
    v_cl1_id       := gen_random_uuid();
    v_cl2_id       := gen_random_uuid();
    v_cl3_id       := gen_random_uuid();
    v_cl4_id       := gen_random_uuid();

    -- 6.1 Starter Highway Project
    BEGIN
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
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Project insert notice: %', SQLERRM;
    END;

    -- 6.1b Contract Master Record (Migration 051 bridge for ContractIQ & Legal Defense)
    BEGIN
      INSERT INTO public.contracts (
        id,
        organization_id,
        project_id,
        agreement_number,
        contract_number,
        work_name,
        contract_title,
        authority_name,
        contractor_legal_name,
        contract_type,
        awarded_amount,
        contract_value,
        stipulated_start_date,
        stipulated_completion_date,
        original_completion_date,
        current_completion_date,
        dlp_months,
        performance_security_amount,
        security_deposit_amount,
        eot_clause,
        variation_clause,
        escalation_clause,
        status,
        created_by
      ) VALUES (
        v_contract_id,
        v_org_id,
        v_project_id,
        'CA-02 of 2025-26',
        'EE/PMGSY/DIV-II/2025/CA-02',
        'PMGSY Highway Widening & Culverts (Pkg-02)',
        'Widening & Strengthening of PMGSY Road Pkg-02',
        'Executive Engineer, PWD (R&B) PMGSY Division',
        v_firm_clean,
        'item_rate',
        17800000.00,
        17800000.00,
        CURRENT_DATE - INTERVAL '60 days',
        CURRENT_DATE + INTERVAL '300 days',
        CURRENT_DATE + INTERVAL '300 days',
        CURRENT_DATE + INTERVAL '300 days',
        24,
        890000.00,
        445000.00,
        'Clause 5',
        'Clause 12',
        'Clause 10CC',
        'active',
        v_user_id
      ) ON CONFLICT DO NOTHING;
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Contract master insert notice: %', SQLERRM;
    END;

    -- 6.2 Project Membership
    BEGIN
      INSERT INTO public.project_members (
        project_id,
        user_id,
        role
      ) VALUES (
        v_project_id,
        v_user_id,
        'owner'
      ) ON CONFLICT DO NOTHING;
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END;

    -- 6.3 BOQ Schedule of Quantities (DSR Item Rate Schedule)
    BEGIN
      INSERT INTO public.boq_items (
        id, project_id, organization_id, contract_id, item_number, description, unit, tender_quantity, awarded_rate
      ) VALUES
      (v_boq1_id, v_project_id, v_org_id, v_contract_id, 'Item 2.1', 'Earthwork excavation in all kinds of soil, lead up to 50m and lift up to 1.5m, including dressing of sides and ramming of bottoms', 'Cum', 5400.000, 185.00),
      (v_boq2_id, v_project_id, v_org_id, v_contract_id, 'Item 3.4', 'Providing and laying Granular Sub-base (GSB) Grading-I material conforming to Table 400-1 of MoRTH specifications', 'Cum', 1850.000, 840.00),
      (v_boq3_id, v_project_id, v_org_id, v_contract_id, 'Item 4.2', 'Providing, laying, spreading and compacting Wet Mix Macadam (WMM) mechanically to required grade, camber and density', 'Cum', 1200.000, 1450.00),
      (v_boq4_id, v_project_id, v_org_id, v_contract_id, 'Item 5.1', 'Design mix cement concrete M-25 grade for 2x2m R.C.C. box culverts and return walls complete as per approved drawing', 'Cum', 240.000, 6800.00)
      ON CONFLICT DO NOTHING;
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'BOQ insert notice: %', SQLERRM;
    END;

    -- 6.3b Electronic Measurement Book (e-MB: Volumes, L x B x D Calculations & Certification)
    BEGIN
      INSERT INTO public.measurement_books (
        id, organization_id, project_id, contract_id, book_number, title, financial_year,
        issued_to_name, issued_to_designation, division, subdivision, total_pages, current_page, status, remarks, created_by
      ) VALUES (
        v_mb_book_id, v_org_id, v_project_id, v_contract_id, 'e-MB #441', 'PMGSY Package 02 Main Highway Alignment',
        '2025-2026', 'Er. Sajad Hussain', 'Assistant Engineer (AE)', 'PWD (R&B) National Highway Division', 'Sub-Division I',
        100, 26, 'ACTIVE', 'Official Electronic Measurement Book issued under CPWD Works Manual Form 21 rules.', v_user_id
      ) ON CONFLICT DO NOTHING;

      -- Certified & Billed entries (L x B x D dimensions)
      INSERT INTO public.measurement_entries (
        id, organization_id, project_id, contract_id, measurement_book_id, boq_item_id, entry_number,
        page_number, measurement_date, location, chainage_km, chainage_m, chainage_end_km, chainage_end_m,
        description, calculation_mode, number_of_units, length, breadth, depth_height, calculated_quantity,
        unit, previous_quantity, current_quantity, cumulative_quantity, boq_balance_quantity, status,
        entered_by, checked_by, certified_by, billed_in_ra_bill_id, created_by
      ) VALUES
      (
        v_mb1_id, v_org_id, v_project_id, v_contract_id, v_mb_book_id, v_boq1_id, 'ME-01', 12,
        CURRENT_DATE - INTERVAL '25 days', 'Km 0+000 to Km 2+500', 0, 0, 2, 500,
        'Earthwork excavation in cutting for roadway widening and hillside slope benching', 'l_b_d',
        1, 2500.000, 7.000, 0.240, 4200.000, 'Cum', 0, 4200.000, 4200.000, 1200.000, 'CERTIFIED',
        'Er. Sajad Hussain (AE)', 'Er. Bilal Ahmad (AEE)', 'Er. M. Shafi (EE)', v_bill_id, v_user_id
      ),
      (
        v_mb2_id, v_org_id, v_project_id, v_contract_id, v_mb_book_id, v_boq2_id, 'ME-02', 19,
        CURRENT_DATE - INTERVAL '20 days', 'Km 0+000 to Km 1+400', 0, 0, 1, 400,
        'Granular Sub-base (GSB) compacted layer laid mechanically with vibratory roller', 'l_b_d',
        1, 1400.000, 7.000, 0.143, 1400.000, 'Cum', 0, 1400.000, 1400.000, 450.000, 'CERTIFIED',
        'Er. Sajad Hussain (AE)', 'Er. Bilal Ahmad (AEE)', 'Er. M. Shafi (EE)', v_bill_id, v_user_id
      ),
      (
        v_mb3_id, v_org_id, v_project_id, v_contract_id, v_mb_book_id, v_boq3_id, 'ME-03', 22,
        CURRENT_DATE - INTERVAL '18 days', 'Km 0+000 to Km 0+650', 0, 0, 0, 650,
        'Wet Mix Macadam (WMM) compacted course with paver finisher', 'l_b_d',
        1, 650.000, 7.000, 0.143, 650.000, 'Cum', 0, 650.000, 650.000, 550.000, 'CERTIFIED',
        'Er. Sajad Hussain (AE)', 'Er. Bilal Ahmad (AEE)', 'Er. M. Shafi (EE)', v_bill_id, v_user_id
      ),
      (
        v_mb4_id, v_org_id, v_project_id, v_contract_id, v_mb_book_id, v_boq4_id, 'ME-04', 24,
        CURRENT_DATE - INTERVAL '16 days', 'Ch 2+100 (Culvert 01)', 2, 100, 2, 100,
        'M-25 RCC concrete for box culvert raft slab, barrel walls and top deck slab complete', 'l_b_d',
        2, 20.000, 4.000, 1.187, 190.000, 'Cum', 0, 190.000, 190.000, 50.000, 'CERTIFIED',
        'Er. Sajad Hussain (AE)', 'Er. Bilal Ahmad (AEE)', 'Er. M. Shafi (EE)', v_bill_id, v_user_id
      ),
      -- Fresh Unbilled Entry (SUBMITTED, ready for RA Bill 02)
      (
        v_mb5_id, v_org_id, v_project_id, v_contract_id, v_mb_book_id, v_boq1_id, 'ME-05', 26,
        CURRENT_DATE - INTERVAL '2 days', 'Km 2+500 to Km 2+850', 2, 500, 2, 850,
        'Earthwork excavation in road widening (Unbilled work ready for next RA bill)', 'l_b_d',
        1, 350.000, 7.000, 0.143, 350.000, 'Cum', 4200.000, 350.000, 4550.000, 850.000, 'SUBMITTED',
        'Er. Sajad Hussain (AE)', NULL, NULL, NULL, v_user_id
      )
      ON CONFLICT DO NOTHING;

      -- Form 23 Certificate of Measurements issued by Executive Engineer
      INSERT INTO public.measurement_certificates (
        id, organization_id, project_id, contract_id, measurement_book_id, certificate_number,
        certificate_date, period_from, period_to, total_items_measured, total_certified_value,
        certified_by_name, certified_by_designation, status
      ) VALUES (
        gen_random_uuid(), v_org_id, v_project_id, v_contract_id, v_mb_book_id, 'MC/PMGSY/2025/01',
        CURRENT_DATE - INTERVAL '15 days', CURRENT_DATE - INTERVAL '60 days', CURRENT_DATE - INTERVAL '15 days',
        4, 4200000.00, 'Er. M. Shafi', 'Executive Engineer, PWD (R&B)', 'ISSUED'
      ) ON CONFLICT DO NOTHING;
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Measurement entries notice: %', SQLERRM;
    END;

    -- 6.4 Sample RA Bill 01 (Form 26 Running Account Bill)
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
        'Earthwork excavation, GSB sub-base and Box Culvert barrel certified by Assistant Executive Engineer.',
        'standalone',
        v_user_id
      ) ON CONFLICT DO NOTHING;
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'RA Bill insert notice: %', SQLERRM;
    END;

    -- 6.5 Form 26 Measurement Book Entries & e-MB Traceability Links
    BEGIN
      INSERT INTO public.ra_bill_items (
        id, ra_bill_id, boq_item_id, organization_id, previous_quantity, current_quantity, rate, remarks
      ) VALUES
      (gen_random_uuid(), v_bill_id, v_boq1_id, v_org_id, 0.000, 4200.000, 185.00, 'Recorded in MB #441, Page 12-18 (Km 0+000 to 2+500)'),
      (gen_random_uuid(), v_bill_id, v_boq2_id, v_org_id, 0.000, 1400.000, 840.00, 'Recorded in MB #441, Page 19-25 (GSB Compaction Pass)'),
      (gen_random_uuid(), v_bill_id, v_boq3_id, v_org_id, 0.000, 650.000, 1450.00, 'Recorded in MB #442, Page 02-08 (WMM Sub-grade)'),
      (gen_random_uuid(), v_bill_id, v_boq4_id, v_org_id, 0.000, 190.000, 6800.00, 'Recorded in MB #442, Page 09-14 (Box Culvert #1 Ch 2+100)')
      ON CONFLICT DO NOTHING;

      -- Relational join table: ra_bill_measurement_entries
      INSERT INTO public.ra_bill_measurement_entries (
        organization_id, ra_bill_id, boq_item_id, measurement_entry_id, billed_quantity
      ) VALUES
      (v_org_id, v_bill_id, v_boq1_id, v_mb1_id, 4200.000),
      (v_org_id, v_bill_id, v_boq2_id, v_mb2_id, 1400.000),
      (v_org_id, v_bill_id, v_boq3_id, v_mb3_id, 650.000),
      (v_org_id, v_bill_id, v_boq4_id, v_mb4_id, 190.000)
      ON CONFLICT DO NOTHING;
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END;

    -- 6.6 Treasury Payment Record & Bill Deductions
    BEGIN
      INSERT INTO public.ra_bill_payments (
        id,
        organization_id,
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
        v_org_id,
        v_bill_id,
        v_project_id,
        CURRENT_DATE - INTERVAL '3 days',
        2500000.00,
        50000.00,
        50000.00,
        25000.00,
        0.00,
        'TR/SGR/2026/0411',
        '1st installment released by division treasury through e-Kuber'
      ) ON CONFLICT DO NOTHING;

      INSERT INTO public.bill_deductions (
        id, bill_id, payment_id, deduction_label, deduction_amount
      ) VALUES
      (gen_random_uuid(), v_bill_id, v_payment_id, 'Income Tax TDS (2%)', 50000.00),
      (gen_random_uuid(), v_bill_id, v_payment_id, 'GST TDS (2%)', 50000.00),
      (gen_random_uuid(), v_bill_id, v_payment_id, 'BOCW Labour Welfare Cess (1%)', 25000.00)
      ON CONFLICT DO NOTHING;
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Payment record insert notice: %', SQLERRM;
    END;

    -- 6.7 CPWD Clause 5 Delay Defense & Digital Hindrance Register
    BEGIN
      INSERT INTO public.hindrances (
        id, organization_id, project_id, contract_id, hindrance_number, category, description,
        location_chainage, start_date, end_date, status, delay_type,
        overlapping_days, net_delay_days, notice_served, notice_date,
        notice_reference_no, officer_acknowledged_by, officer_designation
      ) VALUES
      (
        v_hind1_id,
        v_org_id,
        v_project_id,
        v_contract_id,
        1,
        'site_handover'::public.hindrance_category,
        'Department delay in handing over encumbrance-free ROW between Km 3+200 and 4+100 due to un-shifted 33kV electric HT utility transmission poles and pending state revenue land demarcation.',
        'Km 3+200 to Km 4+100',
        CURRENT_DATE - INTERVAL '45 days',
        CURRENT_DATE - INTERVAL '13 days',
        'acknowledged_by_dept'::public.hindrance_status,
        'compensable'::public.hindrance_delay_type,
        0.0,
        32.0,
        TRUE,
        CURRENT_DATE - INTERVAL '40 days',
        'INF/PMGSY/EOT/2026/04',
        'Er. Bilal Ahmad',
        'Assistant Executive Engineer (AEE) PWD R&B'
      ),
      (
        v_hind2_id,
        v_org_id,
        v_project_id,
        v_contract_id,
        2,
        'drawing_delay'::public.hindrance_category,
        'Non-issue of approved GAD structural drawings for 2x2m R.C.C. Box Culvert at Ch 4+350 from Chief Engineer Design Cell.',
        'Km 4+350 (Culvert 02)',
        CURRENT_DATE - INTERVAL '18 days',
        NULL,
        'active'::public.hindrance_status,
        'compensable'::public.hindrance_delay_type,
        0.0,
        18.0,
        TRUE,
        CURRENT_DATE - INTERVAL '14 days',
        'INF/PMGSY/EOT/2026/09',
        'Er. M. Shafi',
        'Executive Engineer (Design Cell)'
      ) ON CONFLICT DO NOTHING;
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Hindrance insert notice: %', SQLERRM;
    END;

    -- 6.7b Approved Contract Clauses (Migration 058 - Powers ContractIQ Grounding)
    BEGIN
      INSERT INTO public.contract_clauses (
        id, organization_id, contract_id, clause_number, clause_title, clause_text, category,
        notice_period_days, source_document_title, source_page_ref, eot_relevance, variation_relevance, claim_relevance, status
      ) VALUES
      (
        v_cl1_id, v_org_id, v_contract_id, 'Clause 5', 'Extension of Time for Delay',
        'The contractor shall give notice to the Engineer-in-Charge in writing within 14 days of the date of occurrence of any hindrance on site. An application for extension of time shall be made in Form 27 before the stipulated date of completion.',
        'EOT', 14, 'CPWD General Conditions of Contract (GCC)', 'Page 28, Section IV', TRUE, FALSE, TRUE, 'APPROVED'
      ),
      (
        v_cl2_id, v_org_id, v_contract_id, 'Clause 2', 'Compensation for Delay (Liquidated Damages)',
        'If the contractor fails to maintain the required progress, compensation shall be leviable at 1.5% per month of delay computed on per day basis, subject to a maximum of 10% of the tendered contract value.',
        'LD', NULL, 'CPWD General Conditions of Contract (GCC)', 'Page 19, Section IV', FALSE, FALSE, FALSE, 'APPROVED'
      ),
      (
        v_cl3_id, v_org_id, v_contract_id, 'Clause 10CC', 'Price Escalation on Labour, Material & POL',
        'Price escalation shall be payable for work done during extended period provided delay is not attributable to the contractor based on RBI Wholesale Price Indices and Labour Bureau indices.',
        'ESCALATION', 30, 'CPWD General Conditions of Contract (GCC)', 'Page 52, Section IV', TRUE, FALSE, TRUE, 'APPROVED'
      ),
      (
        v_cl4_id, v_org_id, v_contract_id, 'Clause 12', 'Deviations, Variations & Extra Items',
        'The Engineer-in-Charge shall have power to make any alterations in, omissions from, additions to, or substitutions for the original specifications. Deviation limit is 30% beyond which market rate analysis applies.',
        'VARIATION', 7, 'CPWD General Conditions of Contract (GCC)', 'Page 61, Section IV', FALSE, TRUE, TRUE, 'APPROVED'
      ) ON CONFLICT DO NOTHING;
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Contract clauses notice: %', SQLERRM;
    END;

    -- 6.7c Statutory Notice Radar (Migration 057)
    BEGIN
      INSERT INTO public.contract_notices (
        id, organization_id, project_id, contract_id, clause_reference, clause_name,
        trigger_date, deadline_date, status, description
      ) VALUES (
        gen_random_uuid(), v_org_id, v_project_id, v_contract_id, 'Clause 5', '14-Day Statutory Delay Notice',
        CURRENT_DATE - INTERVAL '45 days', CURRENT_DATE - INTERVAL '31 days', 'SERVED',
        'Formal notice served for 33kV electric HT utility obstruction at Km 3+200'
      ) ON CONFLICT DO NOTHING;
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END;

    -- 6.7d Official Correspondence / Dak Register (Migration 057)
    BEGIN
      INSERT INTO public.contract_correspondence (
        id, organization_id, project_id, contract_id, reference_number, letter_number,
        date, direction, category, sender, recipient, subject, response_required, response_deadline, status
      ) VALUES
      (
        gen_random_uuid(), v_org_id, v_project_id, v_contract_id, 'CORR-OUT-01', 'INF/PMGSY/2025/112',
        CURRENT_DATE - INTERVAL '40 days', 'outward', 'notice', v_firm_clean, 'Executive Engineer, PWD PMGSY Div',
        'Statutory Notice of Delay under GCC Clause 5 due to unshifted 33kV HT Electric Transmission Poles (Km 3+200 to 4+100)',
        TRUE, CURRENT_DATE - INTERVAL '25 days', 'closed'
      ),
      (
        gen_random_uuid(), v_org_id, v_project_id, v_contract_id, 'CORR-IN-01', 'EE/PMGSY/DIV/2025/409',
        CURRENT_DATE - INTERVAL '32 days', 'inward', 'instruction', 'Executive Engineer, PWD PMGSY Div', v_firm_clean,
        'Joint site inspection with PDD Electric Dept regarding pole relocation and revised work sequencing',
        FALSE, NULL, 'acknowledged'
      ) ON CONFLICT DO NOTHING;
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END;

    -- 6.7e Form 27 Extension of Time (EOT) Application (Migration 059)
    BEGIN
      INSERT INTO public.eot_applications (
        id, organization_id, project_id, contract_id, application_number, application_date,
        original_completion_date, applied_extended_date, net_delay_days, status, reason
      ) VALUES (
        v_eot_id, v_org_id, v_project_id, v_contract_id, 'PMGSY/EOT/01', CURRENT_DATE - INTERVAL '10 days',
        CURRENT_DATE + INTERVAL '300 days', CURRENT_DATE + INTERVAL '332 days', 32.00, 'submitted',
        'Extension of time claimed under CPWD Clause 5 on account of non-shifting of 33kV transmission utility line by PDD.'
      ) ON CONFLICT DO NOTHING;

      INSERT INTO public.eot_hindrance_links (
        id, organization_id, eot_application_id, hindrance_id, delay_days_claimed
      ) VALUES (
        gen_random_uuid(), v_org_id, v_eot_id, v_hind1_id, 32.00
      ) ON CONFLICT DO NOTHING;
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END;

    -- 6.7f Contract Variations / Deviations / Extra Items (Migration 060)
    BEGIN
      INSERT INTO public.contract_variations (
        id, organization_id, project_id, contract_id, reference_number, type, title,
        description, proposed_amount, approved_amount, status, approval_date
      ) VALUES (
        v_var_id, v_org_id, v_project_id, v_contract_id, 'VO-01', 'extra_item',
        'Additional 2x2m R.C.C. Box Culvert at Ch 4+350 with wing walls',
        'Construction of additional box culvert necessitated by unforeseen agricultural runoff and natural nallah discharge during monsoon.',
        1450000.00, 1380000.00, 'APPROVED', CURRENT_DATE - INTERVAL '12 days'
      ) ON CONFLICT DO NOTHING;
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END;

    -- 6.7g Contractual Financial Claims (Migration 061)
    BEGIN
      INSERT INTO public.contract_claims (
        id, organization_id, project_id, contract_id, claim_number, claim_type, title,
        claim_date, claimed_amount, approved_amount, status, description
      ) VALUES (
        v_claim_id, v_org_id, v_project_id, v_contract_id, 'CLM-01', 'idle_machinery',
        'Compensation for Idle Hydraulic Excavator and Extended Site Overheads during 33kV line delay',
        CURRENT_DATE - INTERVAL '8 days', 485000.00, 0.00, 'SUBMITTED',
        'Claim filed under Clause 10CC for 120 hours unutilized excavator plant and site supervision staff maintained on standby.'
      ) ON CONFLICT DO NOTHING;
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END;

    -- 6.7h Daily Progress Reports (DPR & Site Photo Diary - Migration 031)
    BEGIN
      INSERT INTO public.daily_progress_reports (
        id, organization_id, project_id, report_date, weather, work_completed_notes,
        impediments_delays, total_manpower_count, masons_count, labourers_count, machinery_active_count,
        photos, status, submitted_by
      ) VALUES (
        v_dpr_id, v_org_id, v_project_id, CURRENT_DATE - INTERVAL '1 day', 'sunny_clear',
        '1. GSB spreading and rolling completed from Ch 1+800 to 2+500 (700m length). 2. Box culvert shuttering struck off at Ch 2+100 and curing started.',
        '33kV transmission utility line shifting completed by PDD yesterday. Site fully clear between Km 3+200 and 4+100.',
        18, 3, 13, 2,
        '[{"url": "https://images.unsplash.com/photo-1541888946425-d0fbb186c5f8", "caption": "Vibratory compaction of GSB layer at Ch 2+200"}]'::jsonb,
        'submitted', v_user_id
      ) ON CONFLICT (project_id, report_date) DO NOTHING;
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END;

    -- 6.7i Digital Evidence Vault (Migration 056)
    BEGIN
      INSERT INTO public.evidence_vault (
        id, organization_id, project_id, contract_id, evidence_number, type, title,
        description, document_date, source, related_hindrance_id, related_measurement_id,
        related_ra_bill_id, file_url, original_filename, file_type
      ) VALUES
      (
        v_ev1_id, v_org_id, v_project_id, v_contract_id, 'EV-2025-001', 'PHOTO',
        'Geotagged site photograph showing 33kV HT utility pole obstructing highway carriage width at Km 3+250',
        'GPS Coordinates: 34.0836 N, 74.7973 E. Photo captured during joint inspection with Assistant Executive Engineer.',
        CURRENT_DATE - INTERVAL '45 days', 'Site Engineer Mobile App', v_hind1_id, v_mb1_id,
        v_bill_id, 'https://images.unsplash.com/photo-1504307651254-35680f356dfd', 'pole_obstruction_km3_250.jpg', 'image/jpeg'
      ),
      (
        v_ev2_id, v_org_id, v_project_id, v_contract_id, 'EV-2025-002', 'RECEIPT',
        'India Post Registered AD Speed Post Tracking & Delivery Acknowledgment Receipt for Clause 5 Notice',
        'Speed Post Consignment #EJ94182910IN delivered to Executive Engineer PWD PMGSY Division office on June 18, 2025.',
        CURRENT_DATE - INTERVAL '40 days', 'Postal Department', v_hind1_id, NULL,
        NULL, 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d', 'speed_post_ad_receipt.pdf', 'application/pdf'
      ) ON CONFLICT DO NOTHING;
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END;

    -- 6.8 Partner Equity & Capital Parity (60% / 40% Splits)
    BEGIN
      INSERT INTO public.partners (
        id, organization_id, name, opening_balance, notes
      ) VALUES
      (v_partner1_id, v_org_id, 'Er. Tariq Ahmad Khan', 2500000.00, 'Managing Partner (60% share) • Leads project site execution & plant operations.'),
      (v_partner2_id, v_org_id, 'M/s Lone & Brothers', 1500000.00, 'Investing Partner (40% share) • Working capital & procurement guarantee.')
      ON CONFLICT DO NOTHING;

      INSERT INTO public.project_partners (
        organization_id, project_id, partner_id, share_percentage, notes
      ) VALUES
      (v_org_id, v_project_id, v_partner1_id, 60.00, 'Managing partner 60% profit & risk distribution'),
      (v_org_id, v_project_id, v_partner2_id, 40.00, 'Investing partner 40% equity split')
      ON CONFLICT DO NOTHING;

      INSERT INTO public.partner_transactions (
        organization_id, partner_id, project_id, transaction_type, purpose, amount, date, mode, reference, notes
      ) VALUES
      (v_org_id, v_partner1_id, v_project_id, 'received_by_partner', 'capital_contribution', 1000000.00, CURRENT_DATE - INTERVAL '50 days', 'bank_transfer', 'NEFT/HDFC/88123', 'Mobilization capital seed deposit'),
      (v_org_id, v_partner2_id, v_project_id, 'received_by_partner', 'capital_contribution', 600000.00, CURRENT_DATE - INTERVAL '50 days', 'bank_transfer', 'RTGS/JKB/00912', 'Joint working capital tranche')
      ON CONFLICT DO NOTHING;
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END;

    -- 6.9 Machinery & Fleet Management with Diesel POL Tracking
    BEGIN
      INSERT INTO public.machinery_assets (
        id, organization_id, project_id, asset_name, asset_type, registration_number, model_year, ownership, meter_tracking, hourly_rate, current_meter, status, notes
      ) VALUES
      (v_mach1_id, v_org_id, v_project_id, 'Tata Hitachi EX-200 LC Hydraulic Excavator', 'excavator', 'JK-01-AB-4412', '2022', 'owned', 'hours', 0.00, 1420.00, 'active', 'Heavy cutting and embankment excavation on Package-02'),
      (v_mach2_id, v_org_id, v_project_id, 'JCB 3DX Super Eco Backhoe Loader', 'loader', 'JK-04-E-8819', '2023', 'hired', 'hours', 1450.00, 640.00, 'active', 'Hired @ ₹1,450/hr for box culvert backfilling & GSB spreading'),
      (v_mach3_id, v_org_id, v_project_id, 'Hamm 311 Compactor Soil Roller 11T', 'roller', 'JK-02-C-1903', '2021', 'owned', 'hours', 0.00, 890.00, 'active', 'Sub-grade and GSB layer compaction')
      ON CONFLICT DO NOTHING;

      INSERT INTO public.machinery_logs (
        organization_id, asset_id, project_id, log_date, operator_name, start_meter, end_meter, work_description, diesel_liters, diesel_rate_per_liter, fuel_vendor, created_by
      ) VALUES
      (v_org_id, v_mach1_id, v_project_id, CURRENT_DATE - INTERVAL '1 day', 'Gulzar Ahmad Bhat', 1412.50, 1420.00, '7.5 hours cutting and side drainage benching at Ch 3+400', 120.00, 89.50, 'Bharat Petroleum Highway Pump', v_user_id),
      (v_org_id, v_mach2_id, v_project_id, CURRENT_DATE - INTERVAL '1 day', 'Mohd Rafiq', 634.00, 640.00, '6.0 hours GSB spreading and gravel leveling at Ch 1+800', 65.00, 89.50, 'Indian Oil Highway Depot', v_user_id)
      ON CONFLICT DO NOTHING;
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END;

    -- 6.10 Store Inventory & Materials Stock Register
    BEGIN
      INSERT INTO public.inventory_items (
        id, organization_id, project_id, item_name, item_code, category, unit, current_stock, minimum_stock_alert, notes
      ) VALUES
      (v_inv1_id, v_org_id, v_project_id, '53-Grade OPC Cement (UltraTech / JK Super)', 'MAT-CEM-53', 'material', 'bags', 450.00, 100.00, 'Structural concrete and Box Culvert barrel work'),
      (v_inv2_id, v_org_id, v_project_id, 'TMT Fe-500D Reinforcement Steel (12mm/16mm)', 'MAT-STEEL-500', 'material', 'mt', 18.50, 5.00, 'Culvert raft, wall reinforcement and dowel bars'),
      (v_inv3_id, v_org_id, v_project_id, 'Crushed Stone Aggregate 20mm & 10mm', 'MAT-AGG-20', 'material', 'cft', 2400.00, 500.00, 'M-25 concrete mix and filter media behind abutments')
      ON CONFLICT DO NOTHING;

      INSERT INTO public.inventory_transactions (
        organization_id, item_id, project_id, transaction_type, quantity, transaction_date, destination_location, issued_to_person, challan_number, vehicle_number, remarks, created_by
      ) VALUES
      (v_org_id, v_inv1_id, v_project_id, 'receipt_in', 500.00, CURRENT_DATE - INTERVAL '10 days', 'Central Site Shed (Km 2+000)', 'Munshi Shabbir Ahmad', 'CH-99410', 'JK-01-C-8812', 'Direct supply from JK Cements distributor', v_user_id),
      (v_org_id, v_inv1_id, v_project_id, 'issue_out', 120.00, CURRENT_DATE - INTERVAL '2 days', 'Box Culvert Foundation (Ch 2+100)', 'Bashir Ahmad (Mistri)', 'ISS-041', 'Site Dumper #03', 'M-25 raft casting', v_user_id)
      ON CONFLICT DO NOTHING;
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END;

    -- 6.11 Workers, Project Assignments & Muster Roll Attendance
    BEGIN
      INSERT INTO public.workers (
        id, organization_id, name, trade, daily_wage_rate, phone
      ) VALUES
      (v_w1_id, v_org_id, 'Bashir Ahmad Reshi', 'Mason / Mistri', 900.00, '+91 94191 55221'),
      (v_w2_id, v_org_id, 'Raju Kumar', 'Beldar / Helper', 600.00, '+91 97970 88312'),
      (v_w3_id, v_org_id, 'Gulzar Ahmad Bhat', 'Heavy Machine Operator', 1100.00, '+91 96220 44109')
      ON CONFLICT DO NOTHING;

      INSERT INTO public.worker_project_assignments (
        worker_id, project_id
      ) VALUES
      (v_w1_id, v_project_id),
      (v_w2_id, v_project_id),
      (v_w3_id, v_project_id)
      ON CONFLICT DO NOTHING;

      INSERT INTO public.attendance (
        project_id, worker_id, date, present, status, overtime_hours, notes, created_by
      ) VALUES
      (v_project_id, v_w1_id, CURRENT_DATE - INTERVAL '1 day', TRUE, 'present', 2.00, 'Box culvert shuttering & reinforcement check', v_user_id),
      (v_project_id, v_w2_id, CURRENT_DATE - INTERVAL '1 day', TRUE, 'present', 2.00, 'Assisted mason on culvert site', v_user_id),
      (v_project_id, v_w3_id, CURRENT_DATE - INTERVAL '1 day', TRUE, 'present', 0.00, 'Excavator hill cutting shift', v_user_id),
      (v_project_id, v_w1_id, CURRENT_DATE, TRUE, 'present', 0.00, 'Muster roll regular shift', v_user_id),
      (v_project_id, v_w2_id, CURRENT_DATE, TRUE, 'present', 0.00, 'Muster roll regular shift', v_user_id)
      ON CONFLICT (project_id, worker_id, date) DO NOTHING;
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END;

    -- 6.12 Performance Bank Guarantee (PBG) - STRICTLY SCOPED TO THIS ORGANIZATION
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
        'performance_bank_guarantee',
        'PBG/HDFC/2026/8912',
        'HDFC Bank (Commercial Branch)',
        890000.00,
        CURRENT_DATE - INTERVAL '60 days',
        CURRENT_DATE + INTERVAL '24 days',
        CURRENT_DATE + INTERVAL '54 days',
        'active',
        'Contract performance guarantee (5% of awarded amount). Surrender radar active.',
        v_user_id
      ) ON CONFLICT DO NOTHING;
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Security deposit insert notice: %', SQLERRM;
    END;

    -- 6.13 Supplier Khata & Procurement Ledgers
    BEGIN
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
      ) ON CONFLICT DO NOTHING;

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
        'Chq #440912 drawn on J&K Bank (Cheque cleared)',
        v_user_id
      ) ON CONFLICT DO NOTHING;
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END;

    -- 6.14 Site Cash & Expense Voucher
    BEGIN
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
        'fuel'::public.expense_category,
        12500.00,
        CURRENT_DATE - INTERVAL '2 days',
        'Emergency 140L diesel drum for vibrator and water pump at Ch 2+100',
        v_user_id
      ) ON CONFLICT DO NOTHING;
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END;

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
