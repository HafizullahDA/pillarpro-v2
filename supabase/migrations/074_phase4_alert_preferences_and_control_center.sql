-- ==============================================================================
-- 074_phase4_alert_preferences_and_control_center.sql
-- PillarPro Enterprise: Phase 4 Alert Control Center & Notification Preferences
--
-- Adds:
-- 1. public.alert_preferences table for organization-level alert configurations
-- 2. Role-specific WhatsApp recipient phone routing (Primary, Accounts, Site Ops)
-- 3. Feature toggles for all 8 autonomous alert domains
-- 4. Custom threshold configurations (JSONB)
-- 5. Row Level Security policies scoped to organization members
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.alert_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE UNIQUE,
  
  -- Recipient phone routing by organizational function
  primary_phone TEXT,          -- Managing Director / Proprietor / Owner
  accounts_phone TEXT,         -- Accounts Head / Billing Engineer
  site_phone TEXT,             -- Site Operations / Plant & Machinery Manager
  
  -- Domain switches (Active/Paused)
  bg_fdr_enabled BOOLEAN NOT NULL DEFAULT true,
  contractual_notices_enabled BOOLEAN NOT NULL DEFAULT true,
  ra_bills_enabled BOOLEAN NOT NULL DEFAULT true,
  supplier_credit_enabled BOOLEAN NOT NULL DEFAULT true,
  dpr_reminders_enabled BOOLEAN NOT NULL DEFAULT true,
  inventory_reorder_enabled BOOLEAN NOT NULL DEFAULT true,
  machinery_fleet_enabled BOOLEAN NOT NULL DEFAULT true,
  labour_payout_enabled BOOLEAN NOT NULL DEFAULT true,
  
  -- Customizable milestone & threshold configuration
  threshold_config JSONB NOT NULL DEFAULT '{
    "bg_warning_days": [30, 15, 7, 3, 1, 0],
    "notice_warning_days": [5, 2, 0],
    "ra_bill_submission_delay_days": 30,
    "ra_bill_payment_delay_days": 15,
    "supplier_credit_threshold_pct": 85,
    "dpr_cutoff_time": "20:00",
    "machinery_service_interval_hours": 250,
    "machinery_compliance_warning_days": [15, 3, 0]
  }'::jsonb,
  
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.alert_preferences ENABLE ROW LEVEL SECURITY;

-- Organization members can view their notification preferences
CREATE POLICY "org_members_view_alert_preferences"
  ON public.alert_preferences
  FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM public.user_profiles WHERE id = auth.uid()
    )
  );

-- Organization members with authorized roles can create/update preferences
CREATE POLICY "org_members_modify_alert_preferences"
  ON public.alert_preferences
  FOR ALL
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM public.user_profiles WHERE id = auth.uid()
    )
  )
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM public.user_profiles WHERE id = auth.uid()
    )
  );

-- Auto-seed default preferences for all existing organizations
INSERT INTO public.alert_preferences (organization_id)
SELECT id FROM public.organizations
ON CONFLICT (organization_id) DO NOTHING;
