-- ============================================================
-- PillarPro v2 — Migration 034: Custom Contractor Branding & Inventory Wastage Threshold
-- 1. Adds signature_url to public.organizations
-- 2. Adds wastage_threshold_pct to public.inventory_items
-- 3. Updates get_organization_profile() RPC to include signature_url
-- ============================================================

-- 1. Add signature_url to public.organizations
ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS signature_url TEXT;

-- 2. Add wastage_threshold_pct to public.inventory_items (default 3.00% allowable scrap/wastage)
ALTER TABLE public.inventory_items
  ADD COLUMN IF NOT EXISTS wastage_threshold_pct NUMERIC(5, 2) NOT NULL DEFAULT 3.00;

-- 3. Update get_organization_profile() RPC to return signature_url and logo_url
CREATE OR REPLACE FUNCTION public.get_organization_profile()
RETURNS json LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_org json;
BEGIN
  -- Look up org for current authenticated user
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

  -- Fallback to the first organization if user profile is not linked yet
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

