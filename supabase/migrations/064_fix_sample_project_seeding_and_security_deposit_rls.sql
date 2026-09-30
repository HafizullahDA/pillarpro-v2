-- ============================================================
-- PillarPro v2 — Migration 064: Fix Sample Project Seeding & Security Deposit RLS Isolation
--
-- 0. FIX RA BILL AUDIT TRIGGER ENUM COERCION (Prevents 22P02 error)
--    Redefines trg_audit_ra_bills() with safe text-casting BEFORE any table updates run.
-- 1. Drops legacy un-scoped security_deposits policies ("sec_dep_all_owner_partner", "sec_dep_select_supervisor")
--    that leaked Bank Guarantees across tenant organizations.
-- 2. Ensures organization_id exists on public.security_deposits and public.ra_bill_payments.
-- 3. Enforces strict organization-scoped RLS policies on security_deposits.
-- 4. Fixes trg_audit_ra_bill_payments() to safely resolve organization_id from projects.
-- 5. Upgrades public.onboard_contractor() with comprehensive coverage of all 21 ERP modules:
--    - Contracts Master (Migration 051)
--    - Approved Contract Clauses (Migration 058)
--    - Electronic Measurement Book (e-MB: Vol 441 & L×B×D calculations) (Migration 053/054)
--    - Form 23 Interim Measurement Certificate
--    - RA Bill 01 & Form 26 Measurement items
--    - Treasury Payment & Deductions (TDS, GST TDS, Cess)
--    - Clause 5 Hindrance Register (Site Handover & GAD Drawing delay)
--    - Form 27 EOT Delay Case (50 days claimed) (Migration 059)
--    - Sanctioned Variation Order VO-01 (Migration 060)
--    - Contemporaneous Plant Idle Claim CLM-01 (Migration 061)
--    - Daily Progress Report DPR #42 (Migration 031)
--    - Contract Correspondence & Formal Delay Notice (Migration 057)
--    - Evidence Vault EV-001 & EV-002 (Migration 056)
--    - Partner Equity & Capital Accounts (Migration 021)
--    - Machinery Fleet & Diesel POL logs (Migration 030)
--    - Store Inventory & Materials Ledger (Migration 033)
--    - Workers Muster Roll & Overtime Attendance (Migration 018/042)
--    - Performance Bank Guarantee PBG (Strictly Scoped) (Migration 008/020)
--    - Suppliers Khata & Procurement Ledgers (Migration 007/013)
--    - Site Cash & Emergency Fuel Voucher (Migration 003/012)
-- ============================================================

-- 0. FIX RA BILL AUDIT TRIGGER ENUM COERCION (Prevents 22P02 error)
-- If migration 062 or an earlier script installed trg_audit_ra_bills with invalid enum comparison ('passed'),
-- any subsequent table updates on ra_bill_payments or ra_bills trigger sync_ra_bill_from_payments() which fires
-- trg_audit_ra_bills() and aborts with: ERROR: 22P02 invalid input value for enum ra_bill_status: "passed".
-- We redefine get_audit_actor() and trg_audit_ra_bills() here with safe text casting first.

CREATE OR REPLACE FUNCTION public.get_audit_actor()
RETURNS TABLE (
  actor_id UUID,
  actor_email TEXT,
  actor_name TEXT,
  actor_role TEXT,
  actor_org_id UUID
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RETURN QUERY SELECT
      NULL::UUID,
      'system'::TEXT,
      'System Automation'::TEXT,
      'system'::TEXT,
      public.get_user_organization_id();
  ELSE
    RETURN QUERY
    SELECT
      v_uid,
      COALESCE(p.email, u.email, 'unknown@contractor.in')::TEXT,
      COALESCE(p.display_name, 'Staff Member')::TEXT,
      COALESCE(r.role::TEXT, 'staff')::TEXT,
      COALESCE(p.organization_id, public.get_user_organization_id())
    FROM auth.users u
    LEFT JOIN public.user_profiles p ON p.id = u.id
    LEFT JOIN public.roles r ON r.user_id = u.id
    WHERE u.id = v_uid;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.trg_audit_ra_bills()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor RECORD;
BEGIN
  -- Safe check for audit_logs table presence
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'audit_logs') THEN
    SELECT * INTO v_actor FROM public.get_audit_actor();

    -- Use TEXT casting to avoid invalid input value for enum ra_bill_status
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
  -- Safe check for audit_logs table presence
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'audit_logs') THEN
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
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_audit_payments ON public.ra_bill_payments;
CREATE TRIGGER trg_audit_payments
  AFTER INSERT ON public.ra_bill_payments
  FOR EACH ROW EXECUTE FUNCTION public.trg_audit_ra_bill_payments();


-- 3. UPGRADED & HARDENED onboard_contractor() RPC
-- Covers all 21 civil contracting modules with resilient per-entity isolation
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

  -- New Module Entity UUIDs
  v_mb_id        UUID;
  v_entry1_id    UUID;
  v_entry2_id    UUID;
  v_entry3_id    UUID;
  v_entry4_id    UUID;
  v_cert_id      UUID;
  v_eot_id       UUID;
  v_vo_id        UUID;
  v_claim_id     UUID;
  v_dpr_id       UUID;
  v_corr_id      UUID;
  v_ev1_id       UUID;
  v_ev2_id       UUID;
  v_hind1_id     UUID;
  v_hind2_id     UUID;
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

  -- 6. Seed Full-Featured Civil Project (Showcasing all 21 Modules)
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

    v_mb_id        := gen_random_uuid();
    v_entry1_id    := gen_random_uuid();
    v_entry2_id    := gen_random_uuid();
    v_entry3_id    := gen_random_uuid();
    v_entry4_id    := gen_random_uuid();
    v_cert_id      := gen_random_uuid();
    v_eot_id       := gen_random_uuid();
    v_vo_id        := gen_random_uuid();
    v_claim_id     := gen_random_uuid();
    v_dpr_id       := gen_random_uuid();
    v_corr_id      := gen_random_uuid();
    v_ev1_id       := gen_random_uuid();
    v_ev2_id       := gen_random_uuid();
    v_hind1_id     := gen_random_uuid();
    v_hind2_id     := gen_random_uuid();

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

    -- 6.2 Contract Master Record (Migration 051 bridge for ContractIQ & Legal Defense)
    IF to_regclass('public.contracts') IS NOT NULL THEN
      BEGIN
        EXECUTE $dyn$
          INSERT INTO public.contracts (
            id, organization_id, project_id, agreement_number, contract_number,
            work_name, contract_title, authority_name, contractor_legal_name,
            contract_type, awarded_amount, contract_value, stipulated_start_date,
            stipulated_completion_date, original_completion_date, current_completion_date,
            dlp_months, performance_security_amount, security_deposit_amount,
            eot_clause, variation_clause, escalation_clause, status, created_by
          ) VALUES (
            $1, $2, $3, 'CA-02 of 2025-26', 'EE/PMGSY/DIV-II/2025/CA-02',
            'PMGSY Highway Widening & Culverts (Pkg-02)', 'Widening & Strengthening of PMGSY Road Pkg-02',
            'Executive Engineer, PWD (R&B) PMGSY Division', $4, 'item_rate',
            17800000.00, 17800000.00, CURRENT_DATE - INTERVAL '60 days',
            CURRENT_DATE + INTERVAL '300 days', CURRENT_DATE + INTERVAL '300 days', CURRENT_DATE + INTERVAL '300 days',
            24, 890000.00, 445000.00,
            'Clause 5', 'Clause 12', 'Clause 10CC', 'active', $5
          ) ON CONFLICT DO NOTHING;
        $dyn$ USING v_contract_id, v_org_id, v_project_id, v_firm_clean, v_user_id;
      EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Contract master insert notice: %', SQLERRM;
      END;
    END IF;

    -- 6.3 Approved Contract Clauses (Migration 058 for Clause Automation)
    IF to_regclass('public.contract_clauses') IS NOT NULL THEN
      BEGIN
        EXECUTE $dyn$
          INSERT INTO public.contract_clauses (
            id, organization_id, contract_id, clause_number, clause_title, clause_text,
            category, notice_period_days, eot_relevance, variation_relevance,
            escalation_relevance, ld_relevance, status, created_by
          ) VALUES
          (
            gen_random_uuid(), $1, $2, 'Clause 5', 'Time and Extension for Delay',
            'The time allowed for execution of the works shall be the essence of the Contract. If the contractor shall desire an extension of time for completion of the work on the grounds of his having been unavoidably hindered in its execution, he shall apply in writing to the Engineer within 14 days of the date of the hindrance on account of which he desires such extension.',
            'EOT'::clause_category, 14, TRUE, FALSE, FALSE, FALSE, 'APPROVED'::clause_status, $3
          ),
          (
            gen_random_uuid(), $1, $2, 'Clause 12', 'Deviations, Variations, Extent and Pricing',
            'The Engineer shall have power to make alteration in, omissions from, additions to, or substitutions for, the original specifications, drawings, designs and instructions that may appear to him to be necessary or advisable during the progress of the work.',
            'VARIATION'::clause_category, 14, FALSE, TRUE, FALSE, FALSE, 'APPROVED'::clause_status, $3
          ),
          (
            gen_random_uuid(), $1, $2, 'Clause 10CC', 'Payment due to Increase/Decrease in Prices of Materials/Labour',
            'If the prices of materials and/or wages of labour required for execution of the work increase/decrease, the contractor shall be compensated for such increase or as the case may be, the department shall be entitled to deduct such decrease.',
            'ESCALATION'::clause_category, NULL, FALSE, FALSE, TRUE, FALSE, 'APPROVED'::clause_status, $3
          ),
          (
            gen_random_uuid(), $1, $2, 'Clause 2', 'Compensation for Delay / Liquidated Damages',
            'If the contractor fails to maintain the required progress in terms of the agreed programme or to complete the work and clear the site on or before the contract or extended date of completion, he shall pay compensation at 1.5% per month of delay.',
            'LD'::clause_category, NULL, TRUE, FALSE, FALSE, TRUE, 'APPROVED'::clause_status, $3
          )
          ON CONFLICT DO NOTHING;
        $dyn$ USING v_org_id, v_contract_id, v_user_id;
      EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Contract clauses insert notice: %', SQLERRM;
      END;
    END IF;

    -- 6.4 Project Membership
    BEGIN
      INSERT INTO public.project_members (
        project_id, user_id, role
      ) VALUES (
        v_project_id, v_user_id, 'owner'
      ) ON CONFLICT DO NOTHING;
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END;

    -- 6.5 BOQ Schedule of Quantities
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

    -- 6.6 Electronic Measurement Book (e-MB: Vol 441 & L×B×D calculations)
    IF to_regclass('public.measurement_books') IS NOT NULL AND to_regclass('public.measurement_entries') IS NOT NULL THEN
      BEGIN
        EXECUTE $dyn$
          INSERT INTO public.measurement_books (
            id, organization_id, project_id, contract_id, book_number, title,
            financial_year, issued_to_name, issued_to_designation, division,
            subdivision, total_pages, current_page, status, remarks, created_by
          ) VALUES (
            $1, $2, $3, $4, 'MB-441', 'Electronic Measurement Book Vol 01 - Earthwork & Sub-base',
            '2025-2026', 'Er. Bilal Ahmad', 'Assistant Executive Engineer',
            'PWD (R&B) PMGSY Division', 'Sub-Division I', 100, 26, 'ACTIVE',
            'Official e-MB for Package-02 highway widening and culverts.', $5
          ) ON CONFLICT DO NOTHING;
        $dyn$ USING v_mb_id, v_org_id, v_project_id, v_contract_id, v_user_id;

        EXECUTE $dyn$
          INSERT INTO public.measurement_entries (
            id, organization_id, project_id, contract_id, measurement_book_id,
            boq_item_id, entry_number, page_number, measurement_date, location,
            chainage_km, chainage_m, description, calculation_mode, number_of_units,
            length, breadth, depth_height, calculated_quantity, unit, previous_quantity,
            current_quantity, cumulative_quantity, boq_balance_quantity, remarks,
            entered_by, checked_by, certified_by, certified_at, status, created_by
          ) VALUES
          (
            $1, $2, $3, $4, $5, $6, 'ENT-001', 12, CURRENT_DATE - INTERVAL '16 days',
            'Km 0+000 to Km 2+500', 0.000, 2500.00,
            'Earthwork excavation in road embankment cutting as per cross-sections', 'l_b_d',
            1.000, 2500.000, 7.000, 0.240, 4200.000, 'Cum', 0.000, 4200.000, 4200.000, 1200.000,
            'Test checked 100% by Junior Engineer and 50% by Assistant Executive Engineer',
            'Er. Tariq Ahmad (JE)', 'Er. Bilal Ahmad (AEE)', 'Er. Bilal Ahmad (AEE)', NOW() - INTERVAL '14 days',
            'CERTIFIED', $7
          ),
          (
            $8, $2, $3, $4, $5, $9, 'ENT-002', 19, CURRENT_DATE - INTERVAL '15 days',
            'Km 0+000 to Km 2+000', 0.000, 2000.00,
            'Providing and laying Granular Sub-base (GSB) Grading-I (100mm compacted layer)', 'l_b_d',
            1.000, 2000.000, 7.000, 0.100, 1400.000, 'Cum', 0.000, 1400.000, 1400.000, 450.000,
            'Field density test pass (MDD 98.4%) recorded in Quality Register Vol-II',
            'Er. Tariq Ahmad (JE)', 'Er. Bilal Ahmad (AEE)', 'Er. Bilal Ahmad (AEE)', NOW() - INTERVAL '14 days',
            'CERTIFIED', $7
          ),
          (
            $10, $2, $3, $4, $5, $11, 'ENT-003', 22, CURRENT_DATE - INTERVAL '14 days',
            'Km 0+000 to Km 0+900', 0.000, 900.00,
            'Providing, laying, spreading and compacting Wet Mix Macadam (WMM)', 'l_b_d',
            1.000, 900.000, 7.000, 0.103, 650.000, 'Cum', 0.000, 650.000, 650.000, 550.000,
            'Camber 2.5% verified with template',
            'Er. Tariq Ahmad (JE)', 'Er. Bilal Ahmad (AEE)', 'Er. Bilal Ahmad (AEE)', NOW() - INTERVAL '14 days',
            'CERTIFIED', $7
          ),
          (
            $12, $2, $3, $4, $5, $13, 'ENT-004', 25, CURRENT_DATE - INTERVAL '14 days',
            'Km 2+100 (Culvert #1)', 2.000, 100.00,
            'Design mix cement concrete M-25 grade for 2x2m R.C.C. box culvert barrel & raft', 'l_b_d',
            1.000, 10.000, 4.750, 4.000, 190.000, 'Cum', 0.000, 190.000, 190.000, 50.000,
            '28-day cube strength 31.5 MPa against 25 MPa specified',
            'Er. Tariq Ahmad (JE)', 'Er. Bilal Ahmad (AEE)', 'Er. Bilal Ahmad (AEE)', NOW() - INTERVAL '14 days',
            'CERTIFIED', $7
          )
          ON CONFLICT DO NOTHING;
        $dyn$ USING
          v_entry1_id, v_org_id, v_project_id, v_contract_id, v_mb_id, v_boq1_id, v_user_id,
          v_entry2_id, v_boq2_id,
          v_entry3_id, v_boq3_id,
          v_entry4_id, v_boq4_id;
      EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Measurement entries insert notice: %', SQLERRM;
      END;
    END IF;

    -- 6.7 Form 23 Interim Measurement Certificate (Migration 053)
    IF to_regclass('public.measurement_certificates') IS NOT NULL THEN
      BEGIN
        EXECUTE $dyn$
          INSERT INTO public.measurement_certificates (
            id, organization_id, project_id, contract_id, measurement_book_id,
            certificate_number, certificate_date, period_from, period_to,
            total_items_measured, total_certified_value, certified_by_name,
            certified_by_designation, status
          ) VALUES (
            $1, $2, $3, $4, $5,
            'MC-2026/01', CURRENT_DATE - INTERVAL '15 days',
            CURRENT_DATE - INTERVAL '60 days', CURRENT_DATE - INTERVAL '16 days',
            4, 4200000.00, 'Er. Bilal Ahmad',
            'Assistant Executive Engineer (AEE), PWD (R&B)', 'ISSUED'
          ) ON CONFLICT DO NOTHING;
        $dyn$ USING v_cert_id, v_org_id, v_project_id, v_contract_id, v_mb_id;
      EXCEPTION WHEN OTHERS THEN
        NULL;
      END;
    END IF;

    -- 6.8 Sample RA Bill 01
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

    -- 6.9 Form 26 Measurement Book Entries (ra_bill_items)
    BEGIN
      INSERT INTO public.ra_bill_items (
        id, ra_bill_id, boq_item_id, organization_id, previous_quantity, current_quantity, rate, remarks
      ) VALUES
      (gen_random_uuid(), v_bill_id, v_boq1_id, v_org_id, 0.000, 4200.000, 185.00, 'Recorded in MB #441, Page 12 (Km 0+000 to 2+500)'),
      (gen_random_uuid(), v_bill_id, v_boq2_id, v_org_id, 0.000, 1400.000, 840.00, 'Recorded in MB #441, Page 19 (GSB Compaction Pass)'),
      (gen_random_uuid(), v_bill_id, v_boq3_id, v_org_id, 0.000, 650.000, 1450.00, 'Recorded in MB #441, Page 22 (WMM Sub-grade)'),
      (gen_random_uuid(), v_bill_id, v_boq4_id, v_org_id, 0.000, 190.000, 6800.00, 'Recorded in MB #441, Page 25 (Box Culvert #1 Ch 2+100)')
      ON CONFLICT DO NOTHING;
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END;

    -- 6.10 e-MB RA Bill Traceability Links (Migration 054)
    IF to_regclass('public.ra_bill_measurement_entries') IS NOT NULL THEN
      BEGIN
        EXECUTE $dyn$
          INSERT INTO public.ra_bill_measurement_entries (
            organization_id, ra_bill_id, boq_item_id, measurement_entry_id, billed_quantity
          ) VALUES
          ($1, $2, $3, $4, 4200.000),
          ($1, $2, $5, $6, 1400.000),
          ($1, $2, $7, $8, 650.000),
          ($1, $2, $9, $10, 190.000)
          ON CONFLICT DO NOTHING;
        $dyn$ USING
          v_org_id, v_bill_id,
          v_boq1_id, v_entry1_id,
          v_boq2_id, v_entry2_id,
          v_boq3_id, v_entry3_id,
          v_boq4_id, v_entry4_id;
      EXCEPTION WHEN OTHERS THEN
        NULL;
      END;
    END IF;

    -- 6.11 Treasury Payment Record & Bill Deductions
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

    -- 6.12 CPWD Clause 5 Delay Defense & Digital Hindrance Register
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

    -- 6.13 Form 27 Extension of Time (EOT) Application (Migration 059)
    IF to_regclass('public.contract_eot_cases') IS NOT NULL THEN
      BEGIN
        EXECUTE $dyn$
          INSERT INTO public.contract_eot_cases (
            id, organization_id, project_id, contract_id, eot_reference, cause,
            start_date, end_date, claimed_days, approved_days, pending_days,
            submission_date, current_completion_date, revised_completion_date,
            status, remarks, created_by
          ) VALUES (
            $1, $2, $3, $4, 'EOT/PKG-02/01',
            'Delay in handing over encumbrance-free ROW between Km 3+200 to 4+100 due to un-shifted 33kV electric HT transmission poles & CE design delay for Box Culvert at Ch 4+350.',
            CURRENT_DATE - INTERVAL '45 days', NULL, 50, 0, 50,
            CURRENT_DATE - INTERVAL '10 days', CURRENT_DATE + INTERVAL '300 days', CURRENT_DATE + INTERVAL '350 days',
            'SUBMITTED'::eot_case_status,
            'Submitted under Clause 5 with contemporaneous hindrance register extracts and photographs.', $5
          ) ON CONFLICT DO NOTHING;
        $dyn$ USING v_eot_id, v_org_id, v_project_id, v_contract_id, v_user_id;
      EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'EOT case insert notice: %', SQLERRM;
      END;
    END IF;

    -- 6.14 Contract Variations & Deviations (Migration 060)
    IF to_regclass('public.contract_variations') IS NOT NULL THEN
      BEGIN
        EXECUTE $dyn$
          INSERT INTO public.contract_variations (
            id, organization_id, project_id, contract_id, reference_number, type,
            instruction_date, instruction_authority, original_boq_item_id,
            proposed_item_code, proposed_item_description, proposed_unit,
            original_quantity, proposed_quantity, difference_quantity,
            original_rate, proposed_rate, proposed_amount, is_deletion, reason,
            status, approved_amount, approved_quantity, approved_rate,
            approved_order_number, approval_date, created_by
          ) VALUES (
            $1, $2, $3, $4, 'VO/PKG-02/001', 'VARIATION'::contract_variation_type,
            CURRENT_DATE - INTERVAL '25 days', 'Superintending Engineer, PWD Circle-I', $5,
            'Item 3.4', 'Providing and laying Granular Sub-base (GSB) Grading-I material (Additional crust depth)', 'Cum',
            1850.000, 2350.000, 500.000, 840.00, 840.00, 420000.00, FALSE,
            'Subgrade CBR found less than 3% during field testing between Ch 1+200 and 1+700 requiring additional 100mm GSB crust thickness.',
            'APPROVED'::contract_variation_status, 420000.00, 500.000, 840.00,
            'SE/PWD/R&B/VAR/2026/18', CURRENT_DATE - INTERVAL '10 days', $6
          ) ON CONFLICT DO NOTHING;
        $dyn$ USING v_vo_id, v_org_id, v_project_id, v_contract_id, v_boq2_id, v_user_id;
      EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Variation insert notice: %', SQLERRM;
      END;
    END IF;

    -- 6.15 Contractual Claim for Idle Plant & Machinery (Migration 061)
    IF to_regclass('public.contract_claims') IS NOT NULL THEN
      BEGIN
        EXECUTE $dyn$
          INSERT INTO public.contract_claims (
            id, organization_id, project_id, contract_id, claim_number, claim_type,
            title, claim_date, description, basis_of_claim, claimed_amount,
            approved_amount, paid_amount, outstanding_amount, status, submission_date, created_by
          ) VALUES (
            $1, $2, $3, $4, 'CLM/PKG-02/01', 'IDLE_MACHINERY'::contract_claim_type,
            'Contemporaneous Claim for Idle Plant & Heavy Machinery at Km 3+200',
            CURRENT_DATE - INTERVAL '12 days',
            'Claim for idle hydraulic excavator and roller standing unproductive for 14 working days between Km 3+200 to 4+100 awaiting utility pole shifting.',
            'GCC Clause 10CC / Clause 2 & IRC:SP:72 Guidelines', 185000.00,
            0.00, 0.00, 185000.00, 'SUBMITTED'::contract_claim_status, CURRENT_DATE - INTERVAL '12 days', $5
          ) ON CONFLICT DO NOTHING;
        $dyn$ USING v_claim_id, v_org_id, v_project_id, v_contract_id, v_user_id;
      EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Contract claim insert notice: %', SQLERRM;
      END;
    END IF;

    -- 6.16 Daily Progress Report (DPR #42) (Migration 031)
    IF to_regclass('public.daily_progress_reports') IS NOT NULL THEN
      BEGIN
        EXECUTE $dyn$
          INSERT INTO public.daily_progress_reports (
            id, organization_id, project_id, report_date, weather, work_completed_notes,
            impediments_delays, total_manpower_count, masons_count, labourers_count,
            machinery_active_count, status, submitted_by, verified_by
          ) VALUES (
            $1, $2, $3, CURRENT_DATE - INTERVAL '1 day', 'sunny_clear'::weather_condition,
            'Embankment compaction from Km 1+200 to 1+600 completed. Shuttering and steel binding for Culvert #1 barrel casting in progress.',
            '33kV HT line clearance pending at Km 3+400.', 18, 2, 14, 3,
            'verified'::dpr_status, $4, $4
          ) ON CONFLICT (project_id, report_date) DO NOTHING;
        $dyn$ USING v_dpr_id, v_org_id, v_project_id, v_user_id;
      EXCEPTION WHEN OTHERS THEN
        NULL;
      END;
    END IF;

    -- 6.17 Contract Correspondence & Delay Notice (Migration 057)
    IF to_regclass('public.contract_correspondence') IS NOT NULL THEN
      BEGIN
        EXECUTE $dyn$
          INSERT INTO public.contract_correspondence (
            id, organization_id, project_id, contract_id, reference_number,
            letter_number, date, direction, category, sender, recipient,
            subject, description, related_hindrance_id, created_by
          ) VALUES (
            $1, $2, $3, $4, 'NOT-2026-0042', 'INF/PMGSY/DIV-II/NOT/2026/04',
            CURRENT_DATE - INTERVAL '40 days', 'OUTGOING', 'NOTICE',
            $5, 'Executive Engineer, PWD (R&B) PMGSY Division',
            'Notice of Hindrance under Clause 5.2 - Overhead 33kV HT Electrical Cable Obstruction',
            'Formal statutory notice served within 14 days of impediment under Clause 5 intimating delay to critical path and reserving right to seek EOT and prolongation cost compensation.',
            $6, $7
          ) ON CONFLICT DO NOTHING;
        $dyn$ USING v_corr_id, v_org_id, v_project_id, v_contract_id, v_firm_clean, v_hind1_id, v_user_id;
      EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Correspondence insert notice: %', SQLERRM;
      END;
    END IF;

    -- 6.18 Evidence Vault (Migration 056)
    IF to_regclass('public.evidence_vault') IS NOT NULL THEN
      BEGIN
        EXECUTE $dyn$
          INSERT INTO public.evidence_vault (
            id, organization_id, project_id, contract_id, evidence_number, type,
            title, description, document_date, source, file_url, original_filename,
            file_type, related_hindrance_id, status, created_by
          ) VALUES
          (
            $1, $2, $3, $4, 'EV-2026-001', 'PHOTO',
            'High Voltage 33kV Utility Poles Obstructing Alignment at Km 3+400',
            'Contemporaneous geo-tagged site photographic evidence showing un-shifted electrical poles within road formation width.',
            CURRENT_DATE - INTERVAL '45 days', 'Field Engineer Mobile Upload',
            'https://images.unsplash.com/photo-1541888946425-d0fbb1861593?auto=format&fit=crop&w=1200&q=80',
            'HT_Poles_Ch3400.jpg', 'image/jpeg', $5, 'ACTIVE', $6
          ),
          (
            $7, $2, $3, $4, 'EV-2026-002', 'SITE_ORDER',
            'Site Order Book Page 28 - AEE Instruction for Culvert Bed Concrete',
            'Assistant Executive Engineer site instruction directing 100mm PCC M-10 bed leveling course before culvert raft casting.',
            CURRENT_DATE - INTERVAL '20 days', 'Executive Engineer Inspection',
            'https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=1200&q=80',
            'Site_Order_Pg28.pdf', 'application/pdf', NULL, 'ACTIVE', $6
          ) ON CONFLICT DO NOTHING;
        $dyn$ USING v_ev1_id, v_org_id, v_project_id, v_contract_id, v_hind1_id, v_user_id, v_ev2_id;
      EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Evidence vault insert notice: %', SQLERRM;
      END;
    END IF;

    -- 6.19 Partner Equity & Capital Parity
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

    -- 6.20 Machinery & Fleet Management with Diesel POL Tracking
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

    -- 6.21 Store Inventory & Materials Stock Register
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

    -- 6.22 Workers, Project Assignments & Muster Roll Attendance
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

    -- 6.23 Performance Bank Guarantee (PBG) - STRICTLY SCOPED TO THIS ORGANIZATION
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

    -- 6.24 Supplier Khata & Procurement Ledgers
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

    -- 6.25 Site Cash & Expense Voucher

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
