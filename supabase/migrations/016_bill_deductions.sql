-- ============================================================
-- PillarPro v2 — Migration 016: Flexible Additional Deductions for RA Bills
-- Adds public.bill_deductions table for itemized withholdings
-- (Royalty, GST on Royalty, TCS, DMFT, Time-Extension withholds, etc.)
-- Safe & idempotent to run in Supabase SQL Editor.
-- Existing Bill 01 and historical payments remain 100% untouched.
-- ============================================================

-- ──────────────────────────────────────────
-- 1. TABLE: bill_deductions
-- ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.bill_deductions (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bill_id          UUID NOT NULL REFERENCES public.ra_bills(id) ON DELETE CASCADE,
  payment_id       UUID REFERENCES public.ra_bill_payments(id) ON DELETE CASCADE,
  deduction_label  TEXT NOT NULL,
  deduction_amount NUMERIC(15,2) NOT NULL CHECK (deduction_amount >= 0),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for speedy lookups by bill and payment
CREATE INDEX IF NOT EXISTS idx_bill_deductions_bill_id ON public.bill_deductions(bill_id);
CREATE INDEX IF NOT EXISTS idx_bill_deductions_payment_id ON public.bill_deductions(payment_id);

-- ──────────────────────────────────────────
-- 2. GRANTS & ROW LEVEL SECURITY (RLS)
-- ──────────────────────────────────────────
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bill_deductions TO authenticated;

ALTER TABLE public.bill_deductions ENABLE ROW LEVEL SECURITY;

-- Owners and Managing Partners have full access to view and manage deductions
DROP POLICY IF EXISTS "bill_deductions_all_owner_partner" ON public.bill_deductions;
CREATE POLICY "bill_deductions_all_owner_partner" ON public.bill_deductions
  FOR ALL TO authenticated
  USING (public.get_user_role() IN ('owner', 'managing_partner'));

-- Site Supervisors can view deductions for bills they can access
DROP POLICY IF EXISTS "bill_deductions_select_supervisor" ON public.bill_deductions;
CREATE POLICY "bill_deductions_select_supervisor" ON public.bill_deductions
  FOR SELECT TO authenticated
  USING (
    public.get_user_role() = 'site_supervisor'
    AND EXISTS (
      SELECT 1 FROM public.ra_bills b
      WHERE b.id = bill_deductions.bill_id
        AND public.user_has_project_access(b.project_id)
    )
  );

