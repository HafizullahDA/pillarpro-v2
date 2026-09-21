-- ============================================================
-- PillarPro v2 — Migration 041: Subscription Lifecycle & Entitlements Engine
--
-- 1. Adds subscription fields to public.organizations:
--    - plan_tier ('bootstrap', 'growth', 'enterprise')
--    - subscription_status ('trialing', 'active', 'past_due', 'expired')
--    - trial_ends_at (14-day free trial clock)
--    - current_period_end (end of paid subscription cycle)
--    - max_active_sites (site limit based on tier)
--    - billing_cycle ('monthly', 'annual')
-- 2. Creates function get_organization_subscription(p_org_id UUID)
-- 3. Backfills existing organizations with 14-day active trial
-- ============================================================

-- 1. Add subscription columns to public.organizations
ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS plan_tier TEXT NOT NULL DEFAULT 'growth',
  ADD COLUMN IF NOT EXISTS subscription_status TEXT NOT NULL DEFAULT 'trialing',
  ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '14 days'),
  ADD COLUMN IF NOT EXISTS current_period_end TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS max_active_sites INT NOT NULL DEFAULT 6,
  ADD COLUMN IF NOT EXISTS billing_cycle TEXT NOT NULL DEFAULT 'monthly';

-- Add check constraint for valid plan tiers
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

-- Add check constraint for valid subscription statuses
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

-- 2. Backfill existing organizations with healthy active trial
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

-- 3. Helper function to compute effective subscription status
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

  -- Evaluate real-time status based on timestamps
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

  -- Count unarchived active sites for this org
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

-- Grant execution to authenticated users
GRANT EXECUTE ON FUNCTION public.get_effective_subscription_status(UUID) TO authenticated;

