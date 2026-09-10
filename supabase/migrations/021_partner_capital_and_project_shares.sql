-- ============================================================
-- PillarPro v2 — Migration 021: Partner Capital Ledger, Project Equity & Out-of-Pocket Expenses
-- 
-- 1. Adds organization_id to public.partners and public.partner_transactions
-- 2. Adds paid_by_partner_id to public.expenses for out-of-pocket site expense tracking
-- 3. Adds expense_id to public.partner_transactions for direct linking
-- 4. Creates public.project_partners table for project-by-project profit/equity share %
-- 5. Updates RLS policies with strict organization-level multi-tenant isolation
-- 6. Seeds realistic demo partners (Hafizullah & Habibullah) with project splits (50/50 & 60/40),
--    initial capital infusions, out-of-pocket diesel payment, and RA Bill 01 profit draws
-- ============================================================

DO $$
DECLARE
  v_demo_org_id CONSTANT UUID := 'd0000000-0000-4000-a000-000000000001'::uuid;
  v_demo_user_id CONSTANT UUID := 'd0000000-0000-4000-a000-000000000002'::uuid;
  v_p1_id CONSTANT UUID := 'd1111111-1111-4111-a111-111111111111'::uuid;
  v_p2_id CONSTANT UUID := 'd2222222-2222-4222-a222-222222222222'::uuid;
  v_exp1_id CONSTANT UUID := 'de111111-1111-4111-a111-111111111111'::uuid;
  v_real_org_id UUID;
BEGIN
  -- Determine real org id (default to first created organization not equal to demo org)
  SELECT id INTO v_real_org_id 
  FROM public.organizations 
  WHERE id <> v_demo_org_id 
  ORDER BY created_at ASC 
  LIMIT 1;

  IF v_real_org_id IS NULL THEN
    v_real_org_id := v_demo_org_id;
  END IF;

  -- ──────────────────────────────────────────
  -- 1. ADD COLUMNS & FOREIGN KEYS
  -- ──────────────────────────────────────────

  -- partners
  ALTER TABLE public.partners 
    ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;
  UPDATE public.partners SET organization_id = v_real_org_id WHERE organization_id IS NULL;

  -- partner_transactions
  ALTER TABLE public.partner_transactions 
    ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;
  UPDATE public.partner_transactions SET organization_id = v_real_org_id WHERE organization_id IS NULL;

  ALTER TABLE public.partner_transactions
    ADD COLUMN IF NOT EXISTS expense_id UUID REFERENCES public.expenses(id) ON DELETE SET NULL;

  -- expenses
  ALTER TABLE public.expenses 
    ADD COLUMN IF NOT EXISTS paid_by_partner_id UUID REFERENCES public.partners(id) ON DELETE SET NULL;

  -- ──────────────────────────────────────────
  -- 2. CREATE project_partners (Project-specific Equity Shares)
  -- ──────────────────────────────────────────
  CREATE TABLE IF NOT EXISTS public.project_partners (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id  UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
    project_id       UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    partner_id       UUID NOT NULL REFERENCES public.partners(id) ON DELETE CASCADE,
    share_percentage NUMERIC(5,2) NOT NULL DEFAULT 50.00 CHECK (share_percentage >= 0 AND share_percentage <= 100),
    notes            TEXT,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(project_id, partner_id)
  );

  -- ──────────────────────────────────────────
  -- 3. RLS POLICIES & PERMISSIONS
  -- ──────────────────────────────────────────

  -- A. partners
  ALTER TABLE public.partners ENABLE ROW LEVEL SECURITY;
  DROP POLICY IF EXISTS "partners_all_owner_partner" ON public.partners;
  DROP POLICY IF EXISTS "partners_select_org" ON public.partners;
  DROP POLICY IF EXISTS "partners_manage_org" ON public.partners;

  CREATE POLICY "partners_select_org" ON public.partners
    FOR SELECT TO authenticated
    USING (
      organization_id = public.get_user_organization_id()
      AND EXISTS (
        SELECT 1 FROM public.roles
        WHERE user_id = auth.uid() AND role IN ('owner', 'partner', 'managing_partner', 'accountant', 'viewer')
      )
    );

  CREATE POLICY "partners_manage_org" ON public.partners
    FOR ALL TO authenticated
    USING (
      organization_id = public.get_user_organization_id()
      AND EXISTS (
        SELECT 1 FROM public.roles
        WHERE user_id = auth.uid() AND role IN ('owner', 'partner', 'managing_partner')
      )
    )
    WITH CHECK (
      organization_id = public.get_user_organization_id()
      AND EXISTS (
        SELECT 1 FROM public.roles
        WHERE user_id = auth.uid() AND role IN ('owner', 'partner', 'managing_partner')
      )
    );

  -- B. partner_transactions
  ALTER TABLE public.partner_transactions ENABLE ROW LEVEL SECURITY;
  DROP POLICY IF EXISTS "partner_tx_all_owner_partner" ON public.partner_transactions;
  DROP POLICY IF EXISTS "partner_tx_select_org" ON public.partner_transactions;
  DROP POLICY IF EXISTS "partner_tx_manage_org" ON public.partner_transactions;

  CREATE POLICY "partner_tx_select_org" ON public.partner_transactions
    FOR SELECT TO authenticated
    USING (
      organization_id = public.get_user_organization_id()
      AND EXISTS (
        SELECT 1 FROM public.roles
        WHERE user_id = auth.uid() AND role IN ('owner', 'partner', 'managing_partner', 'accountant', 'viewer')
      )
    );

  CREATE POLICY "partner_tx_manage_org" ON public.partner_transactions
    FOR ALL TO authenticated
    USING (
      organization_id = public.get_user_organization_id()
      AND EXISTS (
        SELECT 1 FROM public.roles
        WHERE user_id = auth.uid() AND role IN ('owner', 'partner', 'managing_partner')
      )
    )
    WITH CHECK (
      organization_id = public.get_user_organization_id()
      AND EXISTS (
        SELECT 1 FROM public.roles
        WHERE user_id = auth.uid() AND role IN ('owner', 'partner', 'managing_partner')
      )
    );

  -- C. project_partners
  ALTER TABLE public.project_partners ENABLE ROW LEVEL SECURITY;
  DROP POLICY IF EXISTS "project_partners_select_org" ON public.project_partners;
  DROP POLICY IF EXISTS "project_partners_manage_org" ON public.project_partners;

  CREATE POLICY "project_partners_select_org" ON public.project_partners
    FOR SELECT TO authenticated
    USING (
      organization_id = public.get_user_organization_id()
      AND EXISTS (
        SELECT 1 FROM public.roles
        WHERE user_id = auth.uid() AND role IN ('owner', 'partner', 'managing_partner', 'accountant', 'viewer')
      )
    );

  CREATE POLICY "project_partners_manage_org" ON public.project_partners
    FOR ALL TO authenticated
    USING (
      organization_id = public.get_user_organization_id()
      AND EXISTS (
        SELECT 1 FROM public.roles
        WHERE user_id = auth.uid() AND role IN ('owner', 'partner', 'managing_partner')
      )
    )
    WITH CHECK (
      organization_id = public.get_user_organization_id()
      AND EXISTS (
        SELECT 1 FROM public.roles
        WHERE user_id = auth.uid() AND role IN ('owner', 'partner', 'managing_partner')
      )
    );

  GRANT SELECT, INSERT, UPDATE, DELETE ON public.partners TO authenticated;
  GRANT SELECT, INSERT, UPDATE, DELETE ON public.partner_transactions TO authenticated;
  GRANT SELECT, INSERT, UPDATE, DELETE ON public.project_partners TO authenticated;

  -- ──────────────────────────────────────────
  -- 4. SEED REALISTIC DEMO PARTNERS & TRANSACTIONS
  -- ──────────────────────────────────────────

  -- Insert 2 Demo Partners
  INSERT INTO public.partners (
    id, organization_id, name, opening_balance, notes
  ) VALUES
  (
    'd4111111-1111-4111-a111-111111111111'::uuid,
    v_demo_org_id,
    'Hafizullah Lone',
    0.00,
    'Managing Partner — Site operations, procurement & government treasury liaison.'
  ),
  (
    'd4222222-2222-4222-a222-222222222222'::uuid,
    v_demo_org_id,
    'Habibullah Lone',
    0.00,
    'Partner — Plant machinery, concrete operations & tendering.'
  )
  ON CONFLICT (id) DO UPDATE SET
    organization_id = EXCLUDED.organization_id,
    name = EXCLUDED.name,
    notes = EXCLUDED.notes;

  -- Seed Project Equity / Profit Shares
  -- Project 1 (Maha Kali Temple Phase 1): 50% / 50%
  INSERT INTO public.project_partners (
    organization_id, project_id, partner_id, share_percentage, notes
  ) VALUES
  (
    v_demo_org_id,
    v_p1_id,
    'd4111111-1111-4111-a111-111111111111'::uuid,
    50.00,
    'Equal partnership on Phase 1 civil boundary wall & earthwork.'
  ),
  (
    v_demo_org_id,
    v_p1_id,
    'd4222222-2222-4222-a222-222222222222'::uuid,
    50.00,
    'Equal partnership on Phase 1 civil boundary wall & earthwork.'
  ),
  -- Project 2 (Degree College Science Block): 60% Hafizullah / 40% Habibullah
  (
    v_demo_org_id,
    v_p2_id,
    'd4111111-1111-4111-a111-111111111111'::uuid,
    60.00,
    'Lead execution and site management share.'
  ),
  (
    v_demo_org_id,
    v_p2_id,
    'd4222222-2222-4222-a222-222222222222'::uuid,
    40.00,
    'Machinery & shuttering management share.'
  )
  ON CONFLICT (project_id, partner_id) DO UPDATE SET
    share_percentage = EXCLUDED.share_percentage,
    notes = EXCLUDED.notes;

  -- Seed Partner Capital & Transaction History
  INSERT INTO public.partner_transactions (
    id, organization_id, partner_id, project_id, transaction_type, purpose, amount,
    date, mode, reference, notes, created_by
  ) VALUES
  (
    'dp111111-1111-4111-a111-111111111111'::uuid,
    v_demo_org_id,
    'd4111111-1111-4111-a111-111111111111'::uuid,
    NULL,
    'paid_by_partner',
    'capital_contribution',
    1500000.00,
    '2026-05-10',
    'bank_transfer',
    'RTGS/CAP/8910',
    'Initial working capital contribution for project mobilization & machinery setup.',
    v_demo_user_id
  ),
  (
    'dp111111-1111-4111-a111-111111111112'::uuid,
    v_demo_org_id,
    'd4222222-2222-4222-a222-222222222222'::uuid,
    NULL,
    'paid_by_partner',
    'capital_contribution',
    1500000.00,
    '2026-05-10',
    'bank_transfer',
    'RTGS/CAP/8911',
    'Initial working capital contribution for project mobilization & machinery setup.',
    v_demo_user_id
  ),
  (
    'dp111111-1111-4111-a111-111111111113'::uuid,
    v_demo_org_id,
    'd4111111-1111-4111-a111-111111111111'::uuid,
    v_p1_id,
    'paid_by_partner',
    'reimbursement',
    14500.00,
    (CURRENT_DATE - INTERVAL '3 days')::DATE,
    'cash',
    'PETRO/P1/0942',
    'Out-of-pocket: Diesel fuel refill (150L) for JCB excavator paid from personal cash on site',
    v_demo_user_id
  ),
  (
    'dp111111-1111-4111-a111-111111111114'::uuid,
    v_demo_org_id,
    'd4111111-1111-4111-a111-111111111111'::uuid,
    v_p1_id,
    'received_by_partner',
    'profit_draw',
    250000.00,
    '2026-07-05',
    'bank_transfer',
    'NEFT/DRAW/104',
    'Interim personal profit draw post-clearance of RA Bill 01 by treasury.',
    v_demo_user_id
  ),
  (
    'dp111111-1111-4111-a111-111111111115'::uuid,
    v_demo_org_id,
    'd4222222-2222-4222-a222-222222222222'::uuid,
    v_p1_id,
    'received_by_partner',
    'profit_draw',
    200000.00,
    '2026-07-05',
    'bank_transfer',
    'NEFT/DRAW/105',
    'Interim personal profit draw post-clearance of RA Bill 01 by treasury.',
    v_demo_user_id
  )
  ON CONFLICT (id) DO UPDATE SET
    organization_id = EXCLUDED.organization_id,
    amount = EXCLUDED.amount,
    date = EXCLUDED.date,
    notes = EXCLUDED.notes;

  -- Link demo expense to Hafizullah
  UPDATE public.expenses 
  SET paid_by_partner_id = 'd4111111-1111-4111-a111-111111111111'::uuid
  WHERE id = v_exp1_id;

  -- Link partner transaction to demo expense
  UPDATE public.partner_transactions
  SET expense_id = v_exp1_id
  WHERE id = 'dp111111-1111-4111-a111-111111111113'::uuid;

END $$;
