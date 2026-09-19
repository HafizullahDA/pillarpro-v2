-- ============================================================
-- PillarPro v2 — Migration 030: Machinery, Vehicles & Diesel Fuel Tracker
-- Multi-tenant fleet management, hourly logs, and diesel fuel tracking
-- ============================================================

-- 1. Create machinery asset types enum
DO $$ BEGIN
  CREATE TYPE machinery_type AS ENUM ('excavator', 'dumper', 'roller', 'transit_mixer', 'generator', 'loader', 'crane', 'tractor', 'other');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- 2. Create ownership type enum
DO $$ BEGIN
  CREATE TYPE asset_ownership AS ENUM ('owned', 'hired');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- 3. Create meter type enum (hours vs kilometers)
DO $$ BEGIN
  CREATE TYPE meter_type AS ENUM ('hours', 'km');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- 4. Create machinery assets table
CREATE TABLE IF NOT EXISTS public.machinery_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  asset_name TEXT NOT NULL,
  asset_type machinery_type NOT NULL DEFAULT 'excavator',
  registration_number TEXT,
  model_year TEXT,
  ownership asset_ownership NOT NULL DEFAULT 'owned',
  meter_tracking meter_type NOT NULL DEFAULT 'hours',
  hourly_rate NUMERIC(12, 2) DEFAULT 0, -- For hired machinery billing
  current_meter NUMERIC(12, 2) DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'breakdown', 'idle', 'demobilized')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for fast lookup by organization & project
CREATE INDEX IF NOT EXISTS idx_machinery_assets_org ON public.machinery_assets(organization_id);
CREATE INDEX IF NOT EXISTS idx_machinery_assets_proj ON public.machinery_assets(project_id);

-- 5. Create machinery daily operations & diesel logs table
CREATE TABLE IF NOT EXISTS public.machinery_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  asset_id UUID NOT NULL REFERENCES public.machinery_assets(id) ON DELETE CASCADE,
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  log_date DATE NOT NULL DEFAULT CURRENT_DATE,
  operator_name TEXT,
  start_meter NUMERIC(12, 2) NOT NULL DEFAULT 0,
  end_meter NUMERIC(12, 2) NOT NULL DEFAULT 0,
  total_run NUMERIC(12, 2) GENERATED ALWAYS AS (GREATEST(0, end_meter - start_meter)) STORED,
  work_description TEXT,
  diesel_liters NUMERIC(10, 2) NOT NULL DEFAULT 0,
  diesel_rate_per_liter NUMERIC(10, 2) NOT NULL DEFAULT 0,
  diesel_cost NUMERIC(12, 2) GENERATED ALWAYS AS (diesel_liters * diesel_rate_per_liter) STORED,
  fuel_slip_url TEXT,
  fuel_vendor TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_machinery_logs_asset ON public.machinery_logs(asset_id);
CREATE INDEX IF NOT EXISTS idx_machinery_logs_org_date ON public.machinery_logs(organization_id, log_date DESC);
CREATE INDEX IF NOT EXISTS idx_machinery_logs_proj ON public.machinery_logs(project_id);

-- 6. Trigger to update current_meter on machinery_assets when log is added/updated
CREATE OR REPLACE FUNCTION public.sync_machinery_current_meter()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.end_meter IS NOT NULL THEN
    UPDATE public.machinery_assets
    SET current_meter = GREATEST(COALESCE(current_meter, 0), NEW.end_meter),
        updated_at = NOW()
    WHERE id = NEW.asset_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_machinery_current_meter ON public.machinery_logs;
CREATE TRIGGER trg_sync_machinery_current_meter
AFTER INSERT OR UPDATE ON public.machinery_logs
FOR EACH ROW EXECUTE FUNCTION public.sync_machinery_current_meter();

-- 7. Enable RLS
ALTER TABLE public.machinery_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.machinery_logs ENABLE ROW LEVEL SECURITY;

-- 8. RLS Policies for machinery_assets
CREATE POLICY "machinery_assets_org_select"
ON public.machinery_assets FOR SELECT
TO authenticated
USING (
  organization_id = public.get_user_organization_id()
);

CREATE POLICY "machinery_assets_org_insert"
ON public.machinery_assets FOR INSERT
TO authenticated
WITH CHECK (
  organization_id = public.get_user_organization_id()
  AND public.get_user_role() IN ('owner', 'partner', 'managing_partner', 'accountant', 'site_supervisor')
);

CREATE POLICY "machinery_assets_org_update"
ON public.machinery_assets FOR UPDATE
TO authenticated
USING (
  organization_id = public.get_user_organization_id()
  AND public.get_user_role() IN ('owner', 'partner', 'managing_partner', 'accountant', 'site_supervisor')
)
WITH CHECK (
  organization_id = public.get_user_organization_id()
);

CREATE POLICY "machinery_assets_org_delete"
ON public.machinery_assets FOR DELETE
TO authenticated
USING (
  organization_id = public.get_user_organization_id()
  AND public.get_user_role() IN ('owner', 'managing_partner')
);

-- 9. RLS Policies for machinery_logs
CREATE POLICY "machinery_logs_org_select"
ON public.machinery_logs FOR SELECT
TO authenticated
USING (
  organization_id = public.get_user_organization_id()
);

CREATE POLICY "machinery_logs_org_insert"
ON public.machinery_logs FOR INSERT
TO authenticated
WITH CHECK (
  organization_id = public.get_user_organization_id()
  AND public.get_user_role() IN ('owner', 'partner', 'managing_partner', 'accountant', 'site_supervisor')
);

CREATE POLICY "machinery_logs_org_update"
ON public.machinery_logs FOR UPDATE
TO authenticated
USING (
  organization_id = public.get_user_organization_id()
  AND public.get_user_role() IN ('owner', 'partner', 'managing_partner', 'accountant', 'site_supervisor')
)
WITH CHECK (
  organization_id = public.get_user_organization_id()
);

CREATE POLICY "machinery_logs_org_delete"
ON public.machinery_logs FOR DELETE
TO authenticated
USING (
  organization_id = public.get_user_organization_id()
  AND public.get_user_role() IN ('owner', 'managing_partner')
);

-- 10. Permissions Grant
GRANT SELECT, INSERT, UPDATE, DELETE ON public.machinery_assets TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.machinery_logs TO authenticated;

