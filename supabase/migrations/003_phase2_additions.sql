-- ============================================================
-- PillarPro v2 — Migration 003: Phase 2 Additions
-- Run in Supabase SQL Editor. Safe to re-run (idempotent).
-- ============================================================

-- 1. Make agency_name nullable
ALTER TABLE public.projects
  ALTER COLUMN agency_name DROP NOT NULL;

-- 2. Add attendance status column (present / absent / half_day)
ALTER TABLE public.attendance
  ADD COLUMN IF NOT EXISTS status TEXT
    NOT NULL DEFAULT 'present'
    CHECK (status IN ('present', 'absent', 'half_day'));

-- 3. get_dashboard_totals() RPC
CREATE OR REPLACE FUNCTION public.get_dashboard_totals()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total_expense   NUMERIC := 0;
  v_total_received  NUMERIC := 0;
  v_vendor_dues     NUMERIC := 0;
  v_outstanding     NUMERIC := 0;
BEGIN
  SELECT COALESCE(SUM(amount), 0) INTO v_total_expense FROM expenses;
  v_total_expense := v_total_expense + COALESCE((SELECT SUM(amount) FROM vendor_purchases), 0);

  SELECT COALESCE(SUM(amount_received), 0) INTO v_total_received FROM receivable_payments;

  v_outstanding := COALESCE((SELECT SUM(net_amount) FROM bills), 0) - v_total_received;

  SELECT COALESCE(SUM(GREATEST(purchased - paid, 0)), 0)
  INTO v_vendor_dues
  FROM (
    SELECT
      v.id,
      COALESCE(SUM(vp.amount), 0)   AS purchased,
      COALESCE(SUM(vpay.amount), 0) AS paid
    FROM vendors v
    LEFT JOIN vendor_purchases vp   ON vp.vendor_id   = v.id
    LEFT JOIN vendor_payments  vpay ON vpay.vendor_id  = v.id
    GROUP BY v.id
  ) vendor_summary;

  RETURN json_build_object(
    'total_expense',  v_total_expense,
    'total_received', v_total_received,
    'vendor_dues',    v_vendor_dues,
    'outstanding',    v_outstanding
  );
END;
$$;
