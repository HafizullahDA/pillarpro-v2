-- ============================================================
-- PillarPro v2 — Migration 032: Fix Security Definer View on project_ra_summary
-- Resolves Supabase Security Advisor CRITICAL alert.
-- Ensures view obeys Postgres Row Level Security (RLS) with security_invoker = true
-- and restricts access strictly by organization_id.
-- ============================================================

DROP VIEW IF EXISTS public.project_ra_summary CASCADE;

CREATE VIEW public.project_ra_summary
WITH (security_invoker = true)
AS
SELECT
  p.id AS project_id,
  p.organization_id,
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
GROUP BY p.id, p.organization_id, p.name, p.agency_name, p.awarded_amount;

-- Grant access to authenticated users
GRANT SELECT ON public.project_ra_summary TO authenticated;
