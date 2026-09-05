-- ============================================================
-- PillarPro v2 — Migration 010: Statutory Deductions & Payments Ledger
-- Adds ra_bill_payments table for tranche-level payment tracking
-- Adds deduction columns & net bank cash tracking to ra_bills
-- Automatically migrates existing payments without breaking Bill 01
-- Safe to run in Supabase SQL Editor (idempotent).
-- ============================================================

-- 1. Add statutory deduction roll-up columns to public.ra_bills
ALTER TABLE public.ra_bills
  ADD COLUMN IF NOT EXISTS tds_deducted NUMERIC(15,2) NOT NULL DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS gst_tds_deducted NUMERIC(15,2) NOT NULL DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS labour_cess_deducted NUMERIC(15,2) NOT NULL DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS other_deductions NUMERIC(15,2) NOT NULL DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS total_deductions NUMERIC(15,2) NOT NULL DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS net_bank_received NUMERIC(15,2) NOT NULL DEFAULT 0.00;

-- 2. Create the payments ledger table: ra_bill_payments
CREATE TABLE IF NOT EXISTS public.ra_bill_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bill_id UUID NOT NULL REFERENCES public.ra_bills(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  
  -- Gross passed & released by government treasury
  gross_amount NUMERIC(15,2) NOT NULL CHECK (gross_amount > 0),
  
  -- Statutory deductions withheld at source
  tds_amount NUMERIC(15,2) NOT NULL DEFAULT 0.00 CHECK (tds_amount >= 0),
  gst_tds_amount NUMERIC(15,2) NOT NULL DEFAULT 0.00 CHECK (gst_tds_amount >= 0),
  labour_cess_amount NUMERIC(15,2) NOT NULL DEFAULT 0.00 CHECK (labour_cess_amount >= 0),
  other_deductions NUMERIC(15,2) NOT NULL DEFAULT 0.00 CHECK (other_deductions >= 0),
  
  -- Stored calculations
  total_deductions NUMERIC(15,2) GENERATED ALWAYS AS (
    tds_amount + gst_tds_amount + labour_cess_amount + other_deductions
  ) STORED,
  
  net_bank_amount NUMERIC(15,2) GENERATED ALWAYS AS (
    gross_amount - (tds_amount + gst_tds_amount + labour_cess_amount + other_deductions)
  ) STORED,
  
  -- Audit & bank references
  voucher_reference TEXT,
  remarks TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for speedy lookups
CREATE INDEX IF NOT EXISTS idx_ra_bill_payments_bill_id ON public.ra_bill_payments(bill_id);
CREATE INDEX IF NOT EXISTS idx_ra_bill_payments_project_id ON public.ra_bill_payments(project_id);

-- 3. Backfill existing payment data (e.g. Bill 01) into ra_bill_payments ledger
INSERT INTO public.ra_bill_payments (
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
)
SELECT
  b.id,
  b.project_id,
  COALESCE(b.date_received, CURRENT_DATE),
  b.amount_received,
  0.00,
  0.00,
  0.00,
  0.00,
  'Initial Settlement',
  b.remarks
FROM public.ra_bills b
WHERE b.amount_received > 0
  AND NOT EXISTS (
    SELECT 1 FROM public.ra_bill_payments p WHERE p.bill_id = b.id
  );

-- Initialize net_bank_received on existing rows that already have amount_received
UPDATE public.ra_bills
SET net_bank_received = amount_received
WHERE amount_received > 0 AND (net_bank_received = 0 OR net_bank_received IS NULL);

-- 4. Roll-up trigger: Automatically syncs ra_bills from ra_bill_payments
CREATE OR REPLACE FUNCTION public.sync_ra_bill_from_payments()
RETURNS TRIGGER LANGUAGE plpgsql AS 
DECLARE
  v_bill_id UUID;
  v_gross NUMERIC(15,2);
  v_tds NUMERIC(15,2);
  v_gst_tds NUMERIC(15,2);
  v_cess NUMERIC(15,2);
  v_other NUMERIC(15,2);
  v_total_ded NUMERIC(15,2);
  v_net_bank NUMERIC(15,2);
  v_last_date DATE;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_bill_id := OLD.bill_id;
  ELSE
    v_bill_id := NEW.bill_id;
  END IF;

  SELECT
    COALESCE(SUM(gross_amount), 0.00),
    COALESCE(SUM(tds_amount), 0.00),
    COALESCE(SUM(gst_tds_amount), 0.00),
    COALESCE(SUM(labour_cess_amount), 0.00),
    COALESCE(SUM(other_deductions), 0.00),
    COALESCE(SUM(total_deductions), 0.00),
    COALESCE(SUM(net_bank_amount), 0.00),
    MAX(payment_date)
  INTO
    v_gross, v_tds, v_gst_tds, v_cess, v_other, v_total_ded, v_net_bank, v_last_date
  FROM public.ra_bill_payments
  WHERE bill_id = v_bill_id;

  UPDATE public.ra_bills
  SET
    amount_received = v_gross,
    tds_deducted = v_tds,
    gst_tds_deducted = v_gst_tds,
    labour_cess_deducted = v_cess,
    other_deductions = v_other,
    total_deductions = v_total_ded,
    net_bank_received = v_net_bank,
    date_received = v_last_date,
    updated_at = NOW()
  WHERE id = v_bill_id;

  RETURN NULL;
END;
;

DROP TRIGGER IF EXISTS trg_sync_ra_bill_from_payments ON public.ra_bill_payments;

CREATE TRIGGER trg_sync_ra_bill_from_payments
  AFTER INSERT OR UPDATE OR DELETE ON public.ra_bill_payments
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_ra_bill_from_payments();

-- 5. Updated project_ra_summary view
-- Drop existing view first so column names & additions can change without 42P16 error
DROP VIEW IF EXISTS public.project_ra_summary;

CREATE VIEW public.project_ra_summary AS
SELECT
  p.id AS project_id,
  p.name AS project_name,
  p.agency_name,
  p.awarded_amount,
  
  -- Bill Counts & Financial Aggregations
  COUNT(b.id) AS total_bills_submitted,
  COALESCE(SUM(b.work_certified_amount), 0)::NUMERIC(15,2) AS total_certified_amount,
  COALESCE(SUM(b.retention_amount), 0)::NUMERIC(15,2)      AS total_retention_withheld,
  COALESCE(SUM(b.net_payable_amount), 0)::NUMERIC(15,2)    AS total_net_payable,
  
  -- Treasury Gross vs Statutory Deductions vs Net Bank Cash
  COALESCE(SUM(b.amount_received), 0)::NUMERIC(15,2)       AS total_amount_received,
  COALESCE(SUM(b.amount_received), 0)::NUMERIC(15,2)       AS total_gross_released,
  COALESCE(SUM(b.tds_deducted), 0)::NUMERIC(15,2)          AS total_tds_deducted,
  COALESCE(SUM(b.gst_tds_deducted), 0)::NUMERIC(15,2)      AS total_gst_tds_deducted,
  COALESCE(SUM(b.labour_cess_deducted), 0)::NUMERIC(15,2)  AS total_labour_cess_deducted,
  COALESCE(SUM(b.total_deductions), 0)::NUMERIC(15,2)      AS total_statutory_deductions,
  COALESCE(SUM(b.net_bank_received), 0)::NUMERIC(15,2)     AS total_net_bank_received,
  
  -- Outstanding = Net Payable - Gross Amount Released
  COALESCE(SUM(b.net_payable_amount - b.amount_received), 0)::NUMERIC(15,2) AS total_outstanding_balance,
  
  -- Active Bank Guarantees & Deposits
  COALESCE((
    SELECT SUM(sd.amount)
    FROM public.security_deposits sd
    WHERE sd.project_id = p.id AND sd.status = 'active'
  ), 0)::NUMERIC(15,2) AS total_active_security_deposits,

  -- BGs expiring within 30 days
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

-- 6. RLS Policies on ra_bill_payments
ALTER TABLE public.ra_bill_payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS ra_payments_all_owner_partner ON public.ra_bill_payments;
CREATE POLICY ra_payments_all_owner_partner ON public.ra_bill_payments
  FOR ALL TO authenticated
  USING (public.get_user_role() IN ('owner', 'partner'))
  WITH CHECK (public.get_user_role() IN ('owner', 'partner'));

DROP POLICY IF EXISTS ra_payments_select_supervisor ON public.ra_bill_payments;
CREATE POLICY ra_payments_select_supervisor ON public.ra_bill_payments
  FOR SELECT TO authenticated
  USING (
    public.get_user_role() = 'site_supervisor'
    AND public.user_has_project_access(project_id)
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON public.ra_bill_payments TO authenticated;
GRANT SELECT ON public.project_ra_summary TO authenticated;
