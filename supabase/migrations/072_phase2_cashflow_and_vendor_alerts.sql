-- ==============================================================================
-- 072_phase2_cashflow_and_vendor_alerts.sql
-- PillarPro Enterprise: Phase 2 Cash Flow Velocity & Vendor Safeguards Schema
--
-- Adds:
-- 1. credit_limit column on public.suppliers
-- 2. Enhanced public.supplier_summary view with credit limit utilization
-- 3. Dedicated SECURITY DEFINER RPC get_autonomous_cashflow_candidates()
-- ==============================================================================

-- 1. Add credit_limit to suppliers master
ALTER TABLE public.suppliers 
  ADD COLUMN IF NOT EXISTS credit_limit NUMERIC(15,2) DEFAULT NULL;

-- 2. Recreate supplier_summary view with credit utilization
-- DROP VIEW CASCADE guarantees no column reorder conflict (42P16) with previous view definition
DROP VIEW IF EXISTS public.supplier_summary CASCADE;

CREATE VIEW public.supplier_summary AS
SELECT
  s.id,
  s.organization_id,
  s.name,
  s.contact_number,
  s.gst_number,
  s.address,
  s.created_at,
  s.updated_at,
  COALESCE(SUM(CASE WHEN st.transaction_type = 'procurement' THEN st.amount ELSE 0 END), 0)::NUMERIC(15,2) AS total_procured,
  COALESCE(SUM(CASE WHEN st.transaction_type = 'payment'     THEN st.amount ELSE 0 END), 0)::NUMERIC(15,2) AS total_paid,
  (
    COALESCE(SUM(CASE WHEN st.transaction_type = 'procurement' THEN st.amount ELSE 0 END), 0) -
    COALESCE(SUM(CASE WHEN st.transaction_type = 'payment'     THEN st.amount ELSE 0 END), 0)
  )::NUMERIC(15,2) AS outstanding_balance,
  s.notes,
  s.credit_limit,
  CASE 
    WHEN s.credit_limit IS NOT NULL AND s.credit_limit > 0 THEN
      ROUND(
        (
          (
            COALESCE(SUM(CASE WHEN st.transaction_type = 'procurement' THEN st.amount ELSE 0 END), 0) -
            COALESCE(SUM(CASE WHEN st.transaction_type = 'payment'     THEN st.amount ELSE 0 END), 0)
          ) / s.credit_limit * 100.0
        ), 2
      )
    ELSE 0.00
  END AS credit_utilization_percent
FROM public.suppliers s
LEFT JOIN public.supplier_transactions st ON st.supplier_id = s.id
GROUP BY s.id;

-- Maintain RLS security invoker and permissions on the recreated view
ALTER VIEW public.supplier_summary SET (security_invoker = true);
GRANT SELECT ON public.supplier_summary TO authenticated;

-- 3. SECURITY DEFINER RPC: Returns active cash flow & vendor alert candidates
CREATE OR REPLACE FUNCTION public.get_autonomous_cashflow_candidates(p_as_of_date DATE DEFAULT CURRENT_DATE)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ra_bills JSONB;
  v_suppliers JSONB;
BEGIN
  -- 1. Unpaid / Partially paid RA Bills with submission aging
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'id', rb.id,
      'project_id', rb.project_id,
      'bill_number', rb.bill_number,
      'submission_date', rb.submission_date,
      'work_certified_amount', rb.work_certified_amount,
      'retention_amount', rb.retention_amount,
      'net_payable_amount', rb.net_payable_amount,
      'amount_received', rb.amount_received,
      'outstanding_balance', rb.outstanding_balance,
      'status', rb.status::TEXT,
      'project_name', p.name,
      'organization_id', p.organization_id,
      'days_elapsed', (p_as_of_date - rb.submission_date)
    )
  ), '[]'::jsonb)
  INTO v_ra_bills
  FROM public.ra_bills rb
  JOIN public.projects p ON p.id = rb.project_id
  WHERE rb.status IN ('submitted', 'partially_paid')
    AND p.archived = false;

  -- 2. Suppliers approaching or exceeding credit limit (>85% utilization)
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'id', ss.id,
      'name', ss.name,
      'contact_number', ss.contact_number,
      'credit_limit', ss.credit_limit,
      'total_procured', ss.total_procured,
      'total_paid', ss.total_paid,
      'outstanding_balance', ss.outstanding_balance,
      'credit_utilization_percent', ss.credit_utilization_percent,
      'organization_id', ss.organization_id
    )
  ), '[]'::jsonb)
  INTO v_suppliers
  FROM public.supplier_summary ss
  WHERE ss.credit_limit IS NOT NULL 
    AND ss.credit_limit > 0
    AND ss.outstanding_balance >= (0.85 * ss.credit_limit);

  RETURN jsonb_build_object(
    'as_of_date', p_as_of_date,
    'ra_bills', v_ra_bills,
    'suppliers', v_suppliers
  );
END;
$$;
