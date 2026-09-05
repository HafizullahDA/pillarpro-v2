-- ============================================================
-- PillarPro v2 — Migration 009: Fix RA Bill Outstanding Formula
-- Corrects outstanding_balance calculation:
-- Outstanding = Net Passed - Amount Received
-- where Net Passed = Work Certified - Retention Amount.
-- Safe to run in Supabase SQL Editor (idempotent).
-- ============================================================

-- 1. Recreate outstanding_balance generated column on ra_bills
ALTER TABLE public.ra_bills DROP COLUMN IF EXISTS outstanding_balance;

ALTER TABLE public.ra_bills
  ADD COLUMN outstanding_balance NUMERIC(15,2)
  GENERATED ALWAYS AS (
    (work_certified_amount - ROUND((work_certified_amount * retention_percentage / 100.0), 2)) - amount_received
  ) STORED;

-- 2. Update status sync trigger to mark 'fully_paid' against Net Passed
CREATE OR REPLACE FUNCTION public.sync_ra_bill_status()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  v_net_payable NUMERIC;
BEGIN
  -- Net passed for payment by the department
  v_net_payable := NEW.work_certified_amount - ROUND((NEW.work_certified_amount * NEW.retention_percentage / 100.0), 2);

  IF NEW.amount_received >= v_net_payable THEN
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

-- 3. Update project_ra_summary view with corrected formula
CREATE OR REPLACE VIEW public.project_ra_summary AS
SELECT
  p.id AS project_id,
  p.name AS project_name,
  p.agency_name,
  p.awarded_amount,
  
  -- RA Bill Aggregations
  COUNT(b.id) AS total_bills_submitted,
  COALESCE(SUM(b.work_certified_amount), 0)::NUMERIC(15,2) AS total_certified_amount,
  COALESCE(SUM(b.retention_amount), 0)::NUMERIC(15,2)      AS total_retention_withheld,
  COALESCE(SUM(b.net_payable_amount), 0)::NUMERIC(15,2)    AS total_net_payable,
  COALESCE(SUM(b.amount_received), 0)::NUMERIC(15,2)       AS total_amount_received,
  
  -- Corrected: Outstanding = Net Payable - Amount Received
  COALESCE(SUM(b.net_payable_amount - b.amount_received), 0)::NUMERIC(15,2) AS total_outstanding_balance,
  
  -- Security Deposits / Guarantees Active
  COALESCE((
    SELECT SUM(sd.amount)
    FROM public.security_deposits sd
    WHERE sd.project_id = p.id AND sd.status = 'active'
  ), 0)::NUMERIC(15,2) AS total_active_security_deposits,

  -- Count of BGs expiring within 30 days
  COALESCE((
    SELECT COUNT(*)
    FROM public.security_deposits sd
    WHERE sd.project_id = p.id
      AND sd.status = 'active'
      AND sd.expiry_date <= (CURRENT_DATE + INTERVAL '30 days')
  ), 0)::INT AS bgs_expiring_soon

FROM public.projects p
LEFT JOIN public.ra_bills b ON b.project_id = p.id
GROUP BY p.id, p.name, p.agency_name, p.awarded_amount;

-- Refresh permissions
GRANT SELECT ON public.project_ra_summary TO authenticated;

