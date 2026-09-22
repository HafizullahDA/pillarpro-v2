-- ============================================================
-- PillarPro v2 — CONSOLIDATED SETUP SCRIPT FOR PENDING MODULES
--
-- This script safely initializes all missing tables, enums, triggers,
-- and RLS policies for:
--   1. Physical Store Inventory & GRN (inventory_items, inventory_transactions)
--   2. Machinery, Vehicles & Diesel Fuel (machinery_assets, machinery_logs)
--   3. Daily Progress Reports (daily_progress_reports)
--   4. Supplier Carriage & Freight (supplier_transactions.carriage_amount)
--   5. CPWA RA Bill Statutory Enhancements (ra_bills)
--   6. Subscription Lifecycle & Entitlements Engine (organizations plan_tier, trial_ends_at)
--
-- Safe & idempotent to run in Supabase SQL Editor.
-- ============================================================

-- ============================================================
-- MODULE 1: STORE INVENTORY & ISSUE REGISTER
-- ============================================================

DO $$ BEGIN
  CREATE TYPE inventory_unit AS ENUM ('bags', 'mt', 'cft', 'sqft', 'liters', 'kg', 'nos', 'trips');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE inventory_trx_type AS ENUM ('receipt_in', 'issue_out', 'return_in', 'wastage_adjustment');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS public.inventory_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  item_name TEXT NOT NULL,
  item_code TEXT,
  category TEXT DEFAULT 'material',
  unit inventory_unit NOT NULL DEFAULT 'bags',
  current_stock NUMERIC(12, 2) NOT NULL DEFAULT 0,
  minimum_stock_alert NUMERIC(12, 2) NOT NULL DEFAULT 0,
  wastage_threshold_pct NUMERIC(5, 2) NOT NULL DEFAULT 3.00,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_inventory_items_org ON public.inventory_items(organization_id);
CREATE INDEX IF NOT EXISTS idx_inventory_items_project ON public.inventory_items(project_id);

CREATE TABLE IF NOT EXISTS public.inventory_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES public.inventory_items(id) ON DELETE CASCADE,
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  supplier_id UUID REFERENCES public.suppliers(id) ON DELETE SET NULL,
  supplier_transaction_id UUID REFERENCES public.supplier_transactions(id) ON DELETE SET NULL,
  transaction_type inventory_trx_type NOT NULL DEFAULT 'receipt_in',
  quantity NUMERIC(12, 2) NOT NULL CHECK (quantity > 0),
  transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
  destination_location TEXT,
  issued_to_person TEXT,
  challan_number TEXT,
  vehicle_number TEXT,
  remarks TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_inventory_trx_item ON public.inventory_transactions(item_id);
CREATE INDEX IF NOT EXISTS idx_inventory_trx_org_date ON public.inventory_transactions(organization_id, transaction_date DESC);
CREATE INDEX IF NOT EXISTS idx_inventory_trx_proj ON public.inventory_transactions(project_id);

CREATE OR REPLACE FUNCTION public.sync_inventory_stock_balance()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.transaction_type IN ('receipt_in', 'return_in') THEN
      UPDATE public.inventory_items
      SET current_stock = current_stock + NEW.quantity, updated_at = NOW()
      WHERE id = NEW.item_id;
    ELSIF NEW.transaction_type IN ('issue_out', 'wastage_adjustment') THEN
      UPDATE public.inventory_items
      SET current_stock = current_stock - NEW.quantity, updated_at = NOW()
      WHERE id = NEW.item_id;
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    IF OLD.transaction_type IN ('receipt_in', 'return_in') THEN
      UPDATE public.inventory_items
      SET current_stock = current_stock - OLD.quantity, updated_at = NOW()
      WHERE id = OLD.item_id;
    ELSIF OLD.transaction_type IN ('issue_out', 'wastage_adjustment') THEN
      UPDATE public.inventory_items
      SET current_stock = current_stock + OLD.quantity, updated_at = NOW()
      WHERE id = OLD.item_id;
    END IF;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_inventory_stock ON public.inventory_transactions;
CREATE TRIGGER trg_sync_inventory_stock
AFTER INSERT OR DELETE ON public.inventory_transactions
FOR EACH ROW EXECUTE FUNCTION public.sync_inventory_stock_balance();

ALTER TABLE public.inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "inv_items_org_select" ON public.inventory_items;
CREATE POLICY "inv_items_org_select" ON public.inventory_items FOR SELECT TO authenticated
USING (organization_id = public.get_user_organization_id());

DROP POLICY IF EXISTS "inv_items_org_insert" ON public.inventory_items;
CREATE POLICY "inv_items_org_insert" ON public.inventory_items FOR INSERT TO authenticated
WITH CHECK (
  organization_id = public.get_user_organization_id()
  AND public.get_user_role() IN ('owner', 'partner', 'managing_partner', 'accountant', 'site_supervisor')
);

DROP POLICY IF EXISTS "inv_items_org_update" ON public.inventory_items;
CREATE POLICY "inv_items_org_update" ON public.inventory_items FOR UPDATE TO authenticated
USING (
  organization_id = public.get_user_organization_id()
  AND public.get_user_role() IN ('owner', 'partner', 'managing_partner', 'accountant', 'site_supervisor')
)
WITH CHECK (organization_id = public.get_user_organization_id());

DROP POLICY IF EXISTS "inv_items_org_delete" ON public.inventory_items;
CREATE POLICY "inv_items_org_delete" ON public.inventory_items FOR DELETE TO authenticated
USING (
  organization_id = public.get_user_organization_id()
  AND public.get_user_role() IN ('owner', 'managing_partner')
);

DROP POLICY IF EXISTS "inv_trx_org_select" ON public.inventory_transactions;
CREATE POLICY "inv_trx_org_select" ON public.inventory_transactions FOR SELECT TO authenticated
USING (organization_id = public.get_user_organization_id());

DROP POLICY IF EXISTS "inv_trx_org_insert" ON public.inventory_transactions;
CREATE POLICY "inv_trx_org_insert" ON public.inventory_transactions FOR INSERT TO authenticated
WITH CHECK (
  organization_id = public.get_user_organization_id()
  AND public.get_user_role() IN ('owner', 'partner', 'managing_partner', 'accountant', 'site_supervisor')
);

DROP POLICY IF EXISTS "inv_trx_org_update" ON public.inventory_transactions;
CREATE POLICY "inv_trx_org_update" ON public.inventory_transactions FOR UPDATE TO authenticated
USING (
  organization_id = public.get_user_organization_id()
  AND public.get_user_role() IN ('owner', 'partner', 'managing_partner', 'accountant', 'site_supervisor')
)
WITH CHECK (organization_id = public.get_user_organization_id());

DROP POLICY IF EXISTS "inv_trx_org_delete" ON public.inventory_transactions;
CREATE POLICY "inv_trx_org_delete" ON public.inventory_transactions FOR DELETE TO authenticated
USING (
  organization_id = public.get_user_organization_id()
  AND public.get_user_role() IN ('owner', 'managing_partner')
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.inventory_items TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.inventory_transactions TO authenticated;

-- ============================================================
-- MODULE 2: MACHINERY, FLEET & DIESEL TRACKER
-- ============================================================

DO $$ BEGIN
  CREATE TYPE machinery_type AS ENUM ('excavator', 'dumper', 'roller', 'transit_mixer', 'generator', 'loader', 'crane', 'tractor', 'other');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE asset_ownership AS ENUM ('owned', 'hired');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE meter_type AS ENUM ('hours', 'km');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

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
  hourly_rate NUMERIC(12, 2) DEFAULT 0,
  current_meter NUMERIC(12, 2) DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'breakdown', 'idle', 'demobilized')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_machinery_assets_org ON public.machinery_assets(organization_id);
CREATE INDEX IF NOT EXISTS idx_machinery_assets_proj ON public.machinery_assets(project_id);

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

ALTER TABLE public.machinery_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.machinery_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "machinery_assets_org_select" ON public.machinery_assets;
CREATE POLICY "machinery_assets_org_select" ON public.machinery_assets FOR SELECT TO authenticated
USING (organization_id = public.get_user_organization_id());

DROP POLICY IF EXISTS "machinery_assets_org_insert" ON public.machinery_assets;
CREATE POLICY "machinery_assets_org_insert" ON public.machinery_assets FOR INSERT TO authenticated
WITH CHECK (
  organization_id = public.get_user_organization_id()
  AND public.get_user_role() IN ('owner', 'partner', 'managing_partner', 'accountant', 'site_supervisor')
);

DROP POLICY IF EXISTS "machinery_assets_org_update" ON public.machinery_assets;
CREATE POLICY "machinery_assets_org_update" ON public.machinery_assets FOR UPDATE TO authenticated
USING (
  organization_id = public.get_user_organization_id()
  AND public.get_user_role() IN ('owner', 'partner', 'managing_partner', 'accountant', 'site_supervisor')
)
WITH CHECK (organization_id = public.get_user_organization_id());

DROP POLICY IF EXISTS "machinery_assets_org_delete" ON public.machinery_assets;
CREATE POLICY "machinery_assets_org_delete" ON public.machinery_assets FOR DELETE TO authenticated
USING (
  organization_id = public.get_user_organization_id()
  AND public.get_user_role() IN ('owner', 'managing_partner')
);

DROP POLICY IF EXISTS "machinery_logs_org_select" ON public.machinery_logs;
CREATE POLICY "machinery_logs_org_select" ON public.machinery_logs FOR SELECT TO authenticated
USING (organization_id = public.get_user_organization_id());

DROP POLICY IF EXISTS "machinery_logs_org_insert" ON public.machinery_logs;
CREATE POLICY "machinery_logs_org_insert" ON public.machinery_logs FOR INSERT TO authenticated
WITH CHECK (
  organization_id = public.get_user_organization_id()
  AND public.get_user_role() IN ('owner', 'partner', 'managing_partner', 'accountant', 'site_supervisor')
);

DROP POLICY IF EXISTS "machinery_logs_org_update" ON public.machinery_logs;
CREATE POLICY "machinery_logs_org_update" ON public.machinery_logs FOR UPDATE TO authenticated
USING (
  organization_id = public.get_user_organization_id()
  AND public.get_user_role() IN ('owner', 'partner', 'managing_partner', 'accountant', 'site_supervisor')
)
WITH CHECK (organization_id = public.get_user_organization_id());

DROP POLICY IF EXISTS "machinery_logs_org_delete" ON public.machinery_logs;
CREATE POLICY "machinery_logs_org_delete" ON public.machinery_logs FOR DELETE TO authenticated
USING (
  organization_id = public.get_user_organization_id()
  AND public.get_user_role() IN ('owner', 'managing_partner')
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.machinery_assets TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.machinery_logs TO authenticated;

-- ============================================================
-- MODULE 3: DAILY PROGRESS REPORTS (DPR)
-- ============================================================

DO $$ BEGIN
  CREATE TYPE weather_condition AS ENUM ('sunny_clear', 'overcast_cloudy', 'rain_drizzle', 'heavy_rain_halt', 'extreme_heat', 'fog_cold');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE dpr_status AS ENUM ('draft', 'submitted', 'verified');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS public.daily_progress_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  report_date DATE NOT NULL DEFAULT CURRENT_DATE,
  weather weather_condition NOT NULL DEFAULT 'sunny_clear',
  work_completed_notes TEXT NOT NULL,
  impediments_delays TEXT,
  total_manpower_count INTEGER DEFAULT 0,
  masons_count INTEGER DEFAULT 0,
  labourers_count INTEGER DEFAULT 0,
  machinery_active_count INTEGER DEFAULT 0,
  photos JSONB NOT NULL DEFAULT '[]'::jsonb,
  status dpr_status NOT NULL DEFAULT 'submitted',
  submitted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  verified_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_project_dpr_date UNIQUE (project_id, report_date)
);

CREATE INDEX IF NOT EXISTS idx_dpr_org ON public.daily_progress_reports(organization_id);
CREATE INDEX IF NOT EXISTS idx_dpr_project_date ON public.daily_progress_reports(project_id, report_date DESC);

ALTER TABLE public.daily_progress_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "dpr_org_select" ON public.daily_progress_reports;
CREATE POLICY "dpr_org_select" ON public.daily_progress_reports FOR SELECT TO authenticated
USING (organization_id = public.get_user_organization_id());

DROP POLICY IF EXISTS "dpr_org_insert" ON public.daily_progress_reports;
CREATE POLICY "dpr_org_insert" ON public.daily_progress_reports FOR INSERT TO authenticated
WITH CHECK (
  organization_id = public.get_user_organization_id()
  AND public.get_user_role() IN ('owner', 'partner', 'managing_partner', 'accountant', 'site_supervisor')
);

DROP POLICY IF EXISTS "dpr_org_update" ON public.daily_progress_reports;
CREATE POLICY "dpr_org_update" ON public.daily_progress_reports FOR UPDATE TO authenticated
USING (
  organization_id = public.get_user_organization_id()
  AND public.get_user_role() IN ('owner', 'partner', 'managing_partner', 'accountant', 'site_supervisor')
)
WITH CHECK (organization_id = public.get_user_organization_id());

DROP POLICY IF EXISTS "dpr_org_delete" ON public.daily_progress_reports;
CREATE POLICY "dpr_org_delete" ON public.daily_progress_reports FOR DELETE TO authenticated
USING (
  organization_id = public.get_user_organization_id()
  AND public.get_user_role() IN ('owner', 'managing_partner')
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.daily_progress_reports TO authenticated;

-- ============================================================
-- MODULE 4: CARRIAGE CHARGES & BRANDING
-- ============================================================

ALTER TABLE public.supplier_transactions
  ADD COLUMN IF NOT EXISTS carriage_amount NUMERIC(15,2) DEFAULT 0;

ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS signature_url TEXT;

-- Update get_organization_profile RPC with signature_url
CREATE OR REPLACE FUNCTION public.get_organization_profile()
RETURNS json LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_org json;
BEGIN
  SELECT json_build_object(
    'id', o.id,
    'name', o.name,
    'legal_name', o.legal_name,
    'registration_no', o.registration_no,
    'gstin', o.gstin,
    'pan', o.pan,
    'address', o.address,
    'phone', o.phone,
    'email', o.email,
    'logo_url', o.logo_url,
    'signature_url', o.signature_url
  ) INTO v_org
  FROM public.organizations o
  JOIN public.user_profiles up ON up.organization_id = o.id
  WHERE up.id = auth.uid()
  LIMIT 1;

  IF v_org IS NULL THEN
    SELECT json_build_object(
      'id', o.id,
      'name', o.name,
      'legal_name', o.legal_name,
      'registration_no', o.registration_no,
      'gstin', o.gstin,
      'pan', o.pan,
      'address', o.address,
      'phone', o.phone,
      'email', o.email,
      'logo_url', o.logo_url,
      'signature_url', o.signature_url
    ) INTO v_org
    FROM public.organizations o
    ORDER BY o.created_at ASC
    LIMIT 1;
  END IF;

  RETURN v_org;
END;
$$;

-- ============================================================
-- MODULE 5: CPWA RA BILL ENHANCEMENTS
-- ============================================================

ALTER TABLE public.ra_bills
  ADD COLUMN IF NOT EXISTS bill_type TEXT DEFAULT 'running' CHECK (bill_type IN ('running', 'first_and_final', 'final')),
  ADD COLUMN IF NOT EXISTS mb_number TEXT,
  ADD COLUMN IF NOT EXISTS mb_page_start INTEGER,
  ADD COLUMN IF NOT EXISTS mb_page_end INTEGER,
  ADD COLUMN IF NOT EXISTS measurement_date DATE,
  ADD COLUMN IF NOT EXISTS measuring_officer_name TEXT,
  ADD COLUMN IF NOT EXISTS measuring_officer_designation TEXT DEFAULT 'Junior Engineer',
  ADD COLUMN IF NOT EXISTS advance_payments_unmeasured NUMERIC(15,2) DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS cement_recovery NUMERIC(15,2) DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS steel_recovery NUMERIC(15,2) DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS other_material_recovery NUMERIC(15,2) DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS actual_completion_date DATE,
  ADD COLUMN IF NOT EXISTS dlp_months INTEGER DEFAULT 12;

-- ============================================================
-- MODULE 6: SUBSCRIPTION LIFECYCLE & ENTITLEMENTS ENGINE
-- ============================================================

ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS plan_tier TEXT NOT NULL DEFAULT 'growth',
  ADD COLUMN IF NOT EXISTS subscription_status TEXT NOT NULL DEFAULT 'trialing',
  ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '14 days'),
  ADD COLUMN IF NOT EXISTS current_period_end TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS max_active_sites INT NOT NULL DEFAULT 6,
  ADD COLUMN IF NOT EXISTS billing_cycle TEXT NOT NULL DEFAULT 'monthly';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_organizations_plan_tier'
  ) THEN
    ALTER TABLE public.organizations
      ADD CONSTRAINT chk_organizations_plan_tier
      CHECK (plan_tier IN ('bootstrap', 'growth', 'enterprise'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_organizations_subscription_status'
  ) THEN
    ALTER TABLE public.organizations
      ADD CONSTRAINT chk_organizations_subscription_status
      CHECK (subscription_status IN ('trialing', 'active', 'past_due', 'expired', 'canceled'));
  END IF;
END $$;

-- Backfill existing organizations with healthy active 14-day trial
UPDATE public.organizations
SET
  plan_tier = COALESCE(plan_tier, 'growth'),
  subscription_status = 'trialing',
  trial_ends_at = GREATEST(COALESCE(trial_ends_at, now() + interval '14 days'), now() + interval '14 days'),
  max_active_sites = CASE 
    WHEN plan_tier = 'bootstrap' THEN 2
    WHEN plan_tier = 'enterprise' THEN 15
    ELSE 6
  END
WHERE subscription_status IS NULL OR subscription_status = 'trialing';

CREATE OR REPLACE FUNCTION public.get_effective_subscription_status(p_org_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org RECORD;
  v_effective_status TEXT;
  v_is_active BOOLEAN;
  v_active_site_count INT;
BEGIN
  SELECT 
    id, plan_tier, subscription_status, trial_ends_at, current_period_end, max_active_sites
  INTO v_org
  FROM public.organizations
  WHERE id = p_org_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'is_active', false,
      'status', 'expired',
      'plan_tier', 'growth',
      'active_sites', 0,
      'max_sites', 6
    );
  END IF;

  IF v_org.subscription_status = 'trialing' THEN
    IF v_org.trial_ends_at > now() THEN
      v_effective_status := 'trialing';
      v_is_active := true;
    ELSE
      v_effective_status := 'expired';
      v_is_active := false;
    END IF;
  ELSIF v_org.subscription_status = 'active' THEN
    IF v_org.current_period_end IS NULL OR v_org.current_period_end > now() THEN
      v_effective_status := 'active';
      v_is_active := true;
    ELSE
      v_effective_status := 'expired';
      v_is_active := false;
    END IF;
  ELSE
    v_effective_status := v_org.subscription_status;
    v_is_active := false;
  END IF;

  SELECT count(*)::INT INTO v_active_site_count
  FROM public.projects
  WHERE organization_id = p_org_id
    AND (archived IS FALSE OR archived IS NULL);

  RETURN jsonb_build_object(
    'org_id', v_org.id,
    'plan_tier', v_org.plan_tier,
    'subscription_status', v_effective_status,
    'is_active', v_is_active,
    'trial_ends_at', v_org.trial_ends_at,
    'current_period_end', v_org.current_period_end,
    'active_site_count', v_active_site_count,
    'max_active_sites', v_org.max_active_sites,
    'can_create_site', (v_is_active AND (v_active_site_count < v_org.max_active_sites))
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_effective_subscription_status(UUID) TO authenticated;

-- ============================================================
-- 10. ATTENDANCE OVERTIME (OT) SCHEMA (Migration 042)
-- ============================================================
ALTER TABLE public.attendance
  ADD COLUMN IF NOT EXISTS overtime_hours NUMERIC(5,2) NOT NULL DEFAULT 0;

ALTER TABLE public.attendance
  DROP CONSTRAINT IF EXISTS attendance_status_check;

ALTER TABLE public.attendance
  ADD CONSTRAINT attendance_status_check
  CHECK (status IN ('present', 'absent', 'half_day', 'overtime'));

COMMENT ON COLUMN public.attendance.overtime_hours IS 'Overtime logged in hours. 7 net working hours = 1.0 day shift equivalent (1 hour break). Hourly rate = daily_wage_rate / 7.';

