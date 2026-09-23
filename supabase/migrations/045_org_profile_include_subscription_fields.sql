-- ============================================================
-- PillarPro v2 — Migration 045: Organization Profile Subscription & Signup Countdown Fields
--
-- Updates get_organization_profile() RPC to include subscription lifecycle
-- metadata (plan_tier, subscription_status, trial_ends_at, current_period_end,
-- max_active_sites, billing_cycle, created_at, user_created_at) so client
-- components can accurately calculate real-time trial countdown from the day of signing up.
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_organization_profile()
RETURNS json
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org json;
BEGIN
  -- 1. Look up org for current authenticated user
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
    'signature_url', o.signature_url,
    'plan_tier', COALESCE(o.plan_tier, 'growth'),
    'subscription_status', COALESCE(o.subscription_status, 'trialing'),
    'trial_ends_at', o.trial_ends_at,
    'current_period_end', o.current_period_end,
    'max_active_sites', COALESCE(o.max_active_sites, 6),
    'billing_cycle', COALESCE(o.billing_cycle, 'monthly'),
    'created_at', o.created_at,
    'user_created_at', up.created_at
  ) INTO v_org
  FROM public.organizations o
  JOIN public.user_profiles up ON up.organization_id = o.id
  WHERE up.id = auth.uid()
  LIMIT 1;

  -- 2. Fallback to the first organization if user profile is not linked yet
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
      'signature_url', o.signature_url,
      'plan_tier', COALESCE(o.plan_tier, 'growth'),
      'subscription_status', COALESCE(o.subscription_status, 'trialing'),
      'trial_ends_at', o.trial_ends_at,
      'current_period_end', o.current_period_end,
      'max_active_sites', COALESCE(o.max_active_sites, 6),
      'billing_cycle', COALESCE(o.billing_cycle, 'monthly'),
      'created_at', o.created_at,
      'user_created_at', (SELECT created_at FROM public.user_profiles WHERE id = auth.uid() LIMIT 1)
    ) INTO v_org
    FROM public.organizations o
    ORDER BY o.created_at ASC
    LIMIT 1;
  END IF;

  RETURN v_org;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_organization_profile() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_organization_profile() TO service_role;
