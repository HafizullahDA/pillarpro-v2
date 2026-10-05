-- ==============================================================================
-- 073_phase3_operations_and_fleet_alerts.sql
-- PillarPro Enterprise: Phase 3 Site Operations, Fleet & Daily Accountability Schema
--
-- Adds:
-- 1. Fleet compliance and maintenance columns to public.machinery_assets
--    (insurance_expiry, fitness_expiry, puc_expiry, last_service_meter, service_interval_meter)
-- 2. Dedicated SECURITY DEFINER RPC get_autonomous_operations_candidates()
--    Aggregating:
--    - Active projects missing Daily Progress Reports (DPR) for the day
--    - Inventory items breaching minimum stock safety thresholds
--    - Machinery due for preventive service (250h/500h) or with expiring compliance docs (T-15d)
--    - Weekly labour wage liability and 1% BOCW Cess summaries
-- ==============================================================================

-- 1. Add fleet compliance & preventive service columns to machinery_assets
ALTER TABLE public.machinery_assets
  ADD COLUMN IF NOT EXISTS insurance_expiry DATE DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS fitness_expiry DATE DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS puc_expiry DATE DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS last_service_meter NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS service_interval_meter NUMERIC(12,2) DEFAULT 250;

-- Indices for rapid compliance document expiration lookups
CREATE INDEX IF NOT EXISTS idx_machinery_insurance_exp ON public.machinery_assets(insurance_expiry);
CREATE INDEX IF NOT EXISTS idx_machinery_fitness_exp ON public.machinery_assets(fitness_expiry);
CREATE INDEX IF NOT EXISTS idx_machinery_puc_exp ON public.machinery_assets(puc_expiry);

-- 2. SECURITY DEFINER RPC: Returns active site operations candidates
CREATE OR REPLACE FUNCTION public.get_autonomous_operations_candidates(p_as_of_date DATE DEFAULT CURRENT_DATE)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_missing_dprs JSONB;
  v_low_inventory JSONB;
  v_machinery JSONB;
  v_labour_summary JSONB;
  v_week_start DATE;
BEGIN
  -- Week start calculation (Monday of the current week)
  v_week_start := DATE_TRUNC('week', p_as_of_date)::DATE;

  -- 1. Active projects missing Daily Progress Report (DPR) for p_as_of_date
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'project_id', p.id,
      'project_name', p.name,
      'project_code', p.code,
      'organization_id', p.organization_id,
      'as_of_date', p_as_of_date
    )
  ), '[]'::jsonb)
  INTO v_missing_dprs
  FROM public.projects p
  WHERE p.status = 'active'
    AND p.archived = false
    AND NOT EXISTS (
      SELECT 1 
      FROM public.daily_progress_reports dpr
      WHERE dpr.project_id = p.id
        AND dpr.report_date = p_as_of_date
    );

  -- 2. Low Inventory Items (current_stock <= minimum_stock_alert)
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'id', inv.id,
      'item_name', inv.item_name,
      'item_code', inv.item_code,
      'category', inv.category,
      'unit', inv.unit::TEXT,
      'current_stock', inv.current_stock,
      'minimum_stock_alert', inv.minimum_stock_alert,
      'project_id', inv.project_id,
      'project_name', p.name,
      'organization_id', inv.organization_id
    )
  ), '[]'::jsonb)
  INTO v_low_inventory
  FROM public.inventory_items inv
  LEFT JOIN public.projects p ON p.id = inv.project_id
  WHERE inv.minimum_stock_alert IS NOT NULL
    AND inv.minimum_stock_alert > 0
    AND inv.current_stock <= inv.minimum_stock_alert;

  -- 3. Plant & Machinery Maintenance (Service Due) & Compliance Expiry
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'id', ma.id,
      'asset_name', ma.asset_name,
      'asset_type', ma.asset_type::TEXT,
      'registration_number', ma.registration_number,
      'ownership', ma.ownership::TEXT,
      'meter_tracking', ma.meter_tracking::TEXT,
      'current_meter', ma.current_meter,
      'last_service_meter', ma.last_service_meter,
      'service_interval_meter', ma.service_interval_meter,
      'hours_since_last_service', (COALESCE(ma.current_meter, 0) - COALESCE(ma.last_service_meter, 0)),
      'service_due', (
        ma.service_interval_meter > 0 AND 
        (COALESCE(ma.current_meter, 0) - COALESCE(ma.last_service_meter, 0)) >= ma.service_interval_meter
      ),
      'insurance_expiry', ma.insurance_expiry,
      'fitness_expiry', ma.fitness_expiry,
      'puc_expiry', ma.puc_expiry,
      'project_id', ma.project_id,
      'project_name', p.name,
      'organization_id', ma.organization_id
    )
  ), '[]'::jsonb)
  INTO v_machinery
  FROM public.machinery_assets ma
  LEFT JOIN public.projects p ON p.id = ma.project_id
  WHERE ma.status = 'active'
    AND (
      -- Service interval reached or breached
      (
        ma.service_interval_meter > 0 AND 
        (COALESCE(ma.current_meter, 0) - COALESCE(ma.last_service_meter, 0)) >= ma.service_interval_meter
      )
      -- Insurance expiring within 15 days or expired
      OR (ma.insurance_expiry IS NOT NULL AND ma.insurance_expiry <= (p_as_of_date + INTERVAL '15 days')::DATE)
      -- Fitness expiring within 15 days or expired
      OR (ma.fitness_expiry IS NOT NULL AND ma.fitness_expiry <= (p_as_of_date + INTERVAL '15 days')::DATE)
      -- PUC expiring within 15 days or expired
      OR (ma.puc_expiry IS NOT NULL AND ma.puc_expiry <= (p_as_of_date + INTERVAL '15 days')::DATE)
    );

  -- 4. Weekly Labour Payout & BOCW Cess Summary (for active projects with attendance)
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'project_id', weekly_data.project_id,
      'project_name', weekly_data.project_name,
      'organization_id', weekly_data.organization_id,
      'week_start', v_week_start,
      'week_end', p_as_of_date,
      'total_workers', weekly_data.worker_count,
      'total_mandays', weekly_data.total_mandays,
      'total_ot_hours', weekly_data.total_ot_hours,
      'regular_wages', weekly_data.regular_wages,
      'ot_wages', weekly_data.ot_wages,
      'gross_wage_liability', weekly_data.gross_wages,
      'bocw_cess_estimate', ROUND(weekly_data.gross_wages * 0.01, 2)
    )
  ), '[]'::jsonb)
  INTO v_labour_summary
  FROM (
    SELECT
      p.id AS project_id,
      p.name AS project_name,
      p.organization_id,
      COUNT(DISTINCT a.worker_id) AS worker_count,
      ROUND(SUM(CASE WHEN a.status = 'half_day' THEN 0.5 WHEN a.present = true THEN 1.0 ELSE 0.0 END), 1) AS total_mandays,
      ROUND(COALESCE(SUM(a.overtime_hours), 0), 1) AS total_ot_hours,
      ROUND(SUM(
        (CASE WHEN a.status = 'half_day' THEN 0.5 WHEN a.present = true THEN 1.0 ELSE 0.0 END) * COALESCE(w.daily_wage_rate, 0)
      ), 2) AS regular_wages,
      ROUND(SUM(
        (COALESCE(a.overtime_hours, 0) / 7.0) * COALESCE(w.daily_wage_rate, 0)
      ), 2) AS ot_wages,
      ROUND(SUM(
        ((CASE WHEN a.status = 'half_day' THEN 0.5 WHEN a.present = true THEN 1.0 ELSE 0.0 END) * COALESCE(w.daily_wage_rate, 0)) +
        ((COALESCE(a.overtime_hours, 0) / 7.0) * COALESCE(w.daily_wage_rate, 0))
      ), 2) AS gross_wages
    FROM public.attendance a
    JOIN public.projects p ON p.id = a.project_id
    JOIN public.workers w ON w.id = a.worker_id
    WHERE a.date >= v_week_start
      AND a.date <= p_as_of_date
      AND p.archived = false
    GROUP BY p.id, p.name, p.organization_id
  ) weekly_data;

  RETURN jsonb_build_object(
    'as_of_date', p_as_of_date,
    'missing_dprs', v_missing_dprs,
    'low_inventory', v_low_inventory,
    'machinery', v_machinery,
    'weekly_labour_summary', v_labour_summary
  );
END;
$$;
