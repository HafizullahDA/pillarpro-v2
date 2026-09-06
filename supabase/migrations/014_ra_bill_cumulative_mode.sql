-- ============================================================
-- PillarPro v2 — Migration 014: Optional Cumulative Billing Mode
-- Adds support for CPWD Form 26 / Standard Contract-to-Date
-- Cumulative Billing Mode to public.ra_bills.
-- Existing bills (like Bill 01) remain strictly 'standalone'.
-- Safe to run in Supabase SQL Editor (idempotent).
-- ============================================================

-- ──────────────────────────────────────────
-- 1. ADD CUMULATIVE BILLING COLUMNS TO ra_bills
-- ──────────────────────────────────────────
ALTER TABLE public.ra_bills
  ADD COLUMN IF NOT EXISTS billing_mode TEXT NOT NULL DEFAULT 'standalone'
    CHECK (billing_mode IN ('standalone', 'cumulative')),
  ADD COLUMN IF NOT EXISTS previous_bill_id UUID REFERENCES public.ra_bills(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS cumulative_certified_amount NUMERIC(15,2),
  ADD COLUMN IF NOT EXISTS previous_certified_amount NUMERIC(15,2) NOT NULL DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS previous_received_amount NUMERIC(15,2) NOT NULL DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS net_payable_this_bill NUMERIC(15,2),
  ADD COLUMN IF NOT EXISTS this_bill_work_certified NUMERIC(15,2);

-- Index for sequence lookups
CREATE INDEX IF NOT EXISTS idx_ra_bills_previous_bill_id ON public.ra_bills(previous_bill_id);

-- ──────────────────────────────────────────
-- 2. BACKFILL EXISTING STANDALONE BILLS (Additive Safety)
-- Guarantees Bill 01 and historical bills are initialized identically
-- ──────────────────────────────────────────
UPDATE public.ra_bills
SET
  billing_mode = 'standalone',
  this_bill_work_certified = COALESCE(this_bill_work_certified, work_certified_amount),
  net_payable_this_bill = COALESCE(net_payable_this_bill, net_payable_amount)
WHERE billing_mode IS NULL OR this_bill_work_certified IS NULL OR net_payable_this_bill IS NULL;

-- ──────────────────────────────────────────
-- 3. UPDATE STATUS SYNC TRIGGER FOR CUMULATIVE BILLS
-- Evaluates fully_paid against net_payable_this_bill
-- ──────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.sync_ra_bill_status()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  v_net_payable NUMERIC;
BEGIN
  -- Use net_payable_this_bill if present, otherwise fallback to generated net_payable_amount
  v_net_payable := COALESCE(
    NEW.net_payable_this_bill,
    NEW.work_certified_amount - ROUND((NEW.work_certified_amount * NEW.retention_percentage / 100.0), 2)
  );

  IF NEW.amount_received >= v_net_payable AND v_net_payable > 0 THEN
    NEW.status := 'fully_paid';
  ELSIF NEW.amount_received > 0 THEN
    NEW.status := 'partially_paid';
  ELSE
    NEW.status := 'submitted';
  END IF;

  RETURN NEW;
END;
$$;

-- Trigger is already attached; update existing rows to ensure status matches new logic
UPDATE public.ra_bills
SET updated_at = NOW();

-- ──────────────────────────────────────────
-- 4. VERIFICATION QUERY
-- ──────────────────────────────────────────
SELECT
  id,
  bill_number,
  billing_mode,
  work_certified_amount,
  this_bill_work_certified,
  net_payable_amount,
  net_payable_this_bill,
  amount_received,
  status
FROM public.ra_bills
ORDER BY submission_date ASC;

