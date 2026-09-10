-- ============================================================
-- PillarPro v2 — Migration 022: Daily-Wage Tracking & Payment Ledger
-- 
-- 1. Creates public.wage_payments table for worker period disbursements
-- 2. Sets up multi-tenant organization RLS and role-based permissions
--    (Site Supervisor can view calculations, Owner / Partner / Accountant can record/edit payments)
-- 3. Seeds realistic wage payments and worker data
-- ============================================================

DO $$
DECLARE
  v_demo_org_id  CONSTANT UUID := 'd0000000-0000-4000-a000-000000000001'::uuid;
  v_demo_user_id CONSTANT UUID := 'd0000000-0000-4000-a000-000000000002'::uuid;
  v_p1_id        CONSTANT UUID := 'd1111111-1111-4111-a111-111111111111'::uuid;
  v_p2_id        CONSTANT UUID := 'd2222222-2222-4222-a222-222222222222'::uuid;
  v_w1_id        CONSTANT UUID := 'd3111111-1111-4111-a111-111111111111'::uuid;
  v_w2_id        CONSTANT UUID := 'd3222222-2222-4222-a222-222222222222'::uuid;
  v_w3_id        CONSTANT UUID := 'd3333333-3333-4333-a333-333333333333'::uuid;
  v_w4_id        CONSTANT UUID := 'd3444444-4444-4444-a444-444444444444'::uuid;
  v_w5_id        CONSTANT UUID := 'd3555555-5555-4555-a555-555555555555'::uuid;
  v_real_org_id  UUID;
  v_monday       DATE;
  v_sunday       DATE;
BEGIN
  -- Determine real org id
  SELECT id INTO v_real_org_id 
  FROM public.organizations 
  WHERE id <> v_demo_org_id 
  ORDER BY created_at ASC 
  LIMIT 1;

  IF v_real_org_id IS NULL THEN
    v_real_org_id := v_demo_org_id;
  END IF;

  -- ──────────────────────────────────────────
  -- 1. CREATE wage_payments TABLE
  -- ──────────────────────────────────────────
  CREATE TABLE IF NOT EXISTS public.wage_payments (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    project_id      UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    worker_id       UUID NOT NULL REFERENCES public.workers(id) ON DELETE CASCADE,
    period_start    DATE NOT NULL,
    period_end      DATE NOT NULL,
    days_worked     NUMERIC(4,1) NOT NULL DEFAULT 0.0 CHECK (days_worked >= 0),
    daily_rate      NUMERIC(10,2) NOT NULL DEFAULT 0.0 CHECK (daily_rate >= 0),
    amount_owed     NUMERIC(10,2) NOT NULL DEFAULT 0.0 CHECK (amount_owed >= 0),
    amount_paid     NUMERIC(10,2) NOT NULL DEFAULT 0.0 CHECK (amount_paid >= 0),
    payment_date    DATE NOT NULL DEFAULT CURRENT_DATE,
    payment_mode    TEXT NOT NULL DEFAULT 'cash' CHECK (payment_mode IN ('cash', 'upi', 'bank_transfer', 'cheque', 'other')),
    status          TEXT NOT NULL DEFAULT 'paid' CHECK (status IN ('paid', 'partial', 'unpaid')),
    reference       TEXT,
    notes           TEXT,
    paid_by         UUID REFERENCES auth.users(id),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_period_order CHECK (period_end >= period_start)
  );

  CREATE INDEX IF NOT EXISTS idx_wage_payments_org_worker ON public.wage_payments(organization_id, worker_id);
  CREATE INDEX IF NOT EXISTS idx_wage_payments_project_period ON public.wage_payments(project_id, period_start, period_end);

  -- ──────────────────────────────────────────
  -- 2. RLS POLICIES & PERMISSIONS
  -- ──────────────────────────────────────────
  ALTER TABLE public.wage_payments ENABLE ROW LEVEL SECURITY;
  DROP POLICY IF EXISTS "wage_payments_select_org" ON public.wage_payments;
  DROP POLICY IF EXISTS "wage_payments_manage_org" ON public.wage_payments;

  -- Read policy: accessible to all authenticated organization members (including site supervisors and viewers)
  CREATE POLICY "wage_payments_select_org" ON public.wage_payments
    FOR SELECT TO authenticated
    USING (
      organization_id = public.get_user_organization_id()
      AND EXISTS (
        SELECT 1 FROM public.roles
        WHERE user_id = auth.uid()
          AND role IN ('owner', 'partner', 'managing_partner', 'accountant', 'site_supervisor', 'viewer')
      )
    );

  -- Write policy: strictly restricted to Owner, Partner, and Accountant
  CREATE POLICY "wage_payments_manage_org" ON public.wage_payments
    FOR ALL TO authenticated
    USING (
      organization_id = public.get_user_organization_id()
      AND EXISTS (
        SELECT 1 FROM public.roles
        WHERE user_id = auth.uid()
          AND role IN ('owner', 'partner', 'managing_partner', 'accountant')
      )
    )
    WITH CHECK (
      organization_id = public.get_user_organization_id()
      AND EXISTS (
        SELECT 1 FROM public.roles
        WHERE user_id = auth.uid()
          AND role IN ('owner', 'partner', 'managing_partner', 'accountant')
      )
    );

  GRANT SELECT, INSERT, UPDATE, DELETE ON public.wage_payments TO authenticated;

  -- ──────────────────────────────────────────
  -- 3. SEED REALISTIC DEMO WORKERS & WAGE PAYMENTS
  -- ──────────────────────────────────────────

  -- Seed Mudasir Lone (from worked example) for demo organization
  INSERT INTO public.workers (
    id, organization_id, name, trade, daily_wage_rate, phone
  ) VALUES (
    v_w5_id,
    v_demo_org_id,
    'Mudasir Lone',
    'Head Mason',
    700.00,
    '+91 94190 11005'
  )
  ON CONFLICT (id) DO UPDATE SET
    organization_id = EXCLUDED.organization_id,
    name = EXCLUDED.name,
    trade = EXCLUDED.trade,
    daily_wage_rate = EXCLUDED.daily_wage_rate;

  -- Assign Mudasir to Project 1
  INSERT INTO public.worker_project_assignments (worker_id, project_id)
  VALUES (v_w5_id, v_p1_id)
  ON CONFLICT DO NOTHING;

  -- Compute current week's Monday and Sunday for seed dates
  v_monday := date_trunc('week', CURRENT_DATE)::DATE;
  v_sunday := (v_monday + INTERVAL '6 days')::DATE;

  -- Seed attendance for Mudasir Lone matching the worked example (4 days worked)
  INSERT INTO public.attendance (project_id, worker_id, date, status, present, created_by)
  VALUES
    (v_p1_id, v_w5_id, v_monday, 'present', true, v_demo_user_id),
    (v_p1_id, v_w5_id, (v_monday + 1), 'present', true, v_demo_user_id),
    (v_p1_id, v_w5_id, (v_monday + 2), 'half_day', true, v_demo_user_id),
    (v_p1_id, v_w5_id, (v_monday + 3), 'present', true, v_demo_user_id),
    (v_p1_id, v_w5_id, (v_monday + 4), 'absent', false, v_demo_user_id),
    (v_p1_id, v_w5_id, (v_monday + 5), 'half_day', true, v_demo_user_id)
  ON CONFLICT (project_id, worker_id, date) DO UPDATE SET
    status = EXCLUDED.status,
    present = EXCLUDED.present;

  -- Seed previous week's full settlement and current week's partial advance for demo
  INSERT INTO public.wage_payments (
    id, organization_id, project_id, worker_id, period_start, period_end,
    days_worked, daily_rate, amount_owed, amount_paid, payment_date,
    payment_mode, status, reference, notes, paid_by
  ) VALUES
  (
    'da111111-1111-4111-a111-111111111111'::uuid,
    v_demo_org_id,
    v_p1_id,
    v_w1_id,
    (v_monday - INTERVAL '7 days')::DATE,
    (v_monday - INTERVAL '1 day')::DATE,
    6.0,
    900.00,
    5400.00,
    5400.00,
    (v_monday - INTERVAL '1 day')::DATE,
    'cash',
    'paid',
    'VOUCHER/W-108',
    'Weekly full wage settlement — Master Mason',
    v_demo_user_id
  ),
  (
    'da111111-1111-4111-a111-111111111112'::uuid,
    v_demo_org_id,
    v_p1_id,
    v_w5_id,
    v_monday,
    v_sunday,
    4.0,
    700.00,
    2800.00,
    1500.00,
    (v_monday + 3),
    'cash',
    'partial',
    'VOUCHER/W-112',
    'Mid-week wage advance requested by Mudasir Lone (Balance ₹1,300 due)',
    v_demo_user_id
  )
  ON CONFLICT (id) DO UPDATE SET
    organization_id = EXCLUDED.organization_id,
    amount_paid = EXCLUDED.amount_paid,
    status = EXCLUDED.status,
    notes = EXCLUDED.notes;

END $$;
