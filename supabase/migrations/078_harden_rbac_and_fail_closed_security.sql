-- ==============================================================================
-- PillarPro v2 — Migration 078: Harden RBAC & Fail-Closed Security
-- 
-- 1. FIX CRITICAL PRIVILEGE ESCALATION in public.get_user_role():
--    - Previously: if v_role IS NULL and user exists in user_profiles, it fell back to 'owner'.
--    - Fixed: if v_role IS NULL, it ONLY assigns 'owner' if the user is explicitly the creator
--      (created_by / earliest org creator) of the organization. Otherwise, it fails closed to 'viewer'.
--    - Scopes public.roles lookup to the active organization_id to prevent multi-tenant role leakage.
--
-- 2. STRENGTHEN guard_measurement_entries_integrity():
--    - When transitioning an e-MB entry to status = 'CERTIFIED', strictly enforces that
--      page_number (positive integer) and entry_number (non-empty text) are present.
--    - Hardens the billed_in_ra_bill_id lock to block updates to dimensions (number_of_units/nos,
--      length, breadth, depth_height/depth), calculated_quantity, boq_item_id, and status.
--    - Strictly blocks DELETE operations on any measurement entry that has been billed in an RA Bill.
-- ==============================================================================

-- 1. Ensure public.organizations has created_by column and backfill
ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Backfill created_by with the earliest user who had 'owner' role or oldest profile in the org
UPDATE public.organizations o
SET created_by = COALESCE(
  (
    SELECT r.user_id 
    FROM public.roles r
    JOIN public.user_profiles p ON p.id = r.user_id
    WHERE p.organization_id = o.id AND r.role::TEXT = 'owner'
    ORDER BY r.created_at ASC 
    LIMIT 1
  ),
  (
    SELECT p.id 
    FROM public.user_profiles p
    WHERE p.organization_id = o.id
    ORDER BY p.created_at ASC 
    LIMIT 1
  )
)
WHERE o.created_by IS NULL;

-- 2. Ensure public.roles has organization_id column and backfill from user_profiles
ALTER TABLE public.roles
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;

UPDATE public.roles r
SET organization_id = p.organization_id
FROM public.user_profiles p
WHERE r.user_id = p.id AND r.organization_id IS NULL AND p.organization_id IS NOT NULL;

-- Create index on roles(user_id, organization_id)
CREATE INDEX IF NOT EXISTS idx_roles_user_org ON public.roles(user_id, organization_id);

-- 3. Replace public.get_user_role() with Fail-Closed Security
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS TEXT 
LANGUAGE plpgsql 
STABLE 
SECURITY DEFINER 
SET search_path = public 
AS $$
DECLARE
  v_uid UUID;
  v_org_id UUID;
  v_role TEXT;
  v_is_org_creator BOOLEAN := FALSE;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RETURN 'viewer';
  END IF;

  -- 1. Resolve current active organization
  v_org_id := public.get_user_organization_id();

  -- 2. Scoped lookup in public.roles: match active organization first
  IF v_org_id IS NOT NULL THEN
    SELECT role::TEXT INTO v_role 
    FROM public.roles 
    WHERE user_id = v_uid 
      AND (organization_id = v_org_id OR organization_id IS NULL)
    ORDER BY (organization_id = v_org_id) DESC, created_at ASC
    LIMIT 1;
  ELSE
    SELECT role::TEXT INTO v_role 
    FROM public.roles 
    WHERE user_id = v_uid 
    ORDER BY created_at ASC
    LIMIT 1;
  END IF;

  -- 3. Fail-Closed Fallback (ELIMINATES PRIVILEGE ESCALATION TO 'owner')
  IF v_role IS NULL THEN
    IF v_org_id IS NOT NULL THEN
      -- Only grant 'owner' if the user is explicitly recorded as the creator of this organization
      SELECT (created_by = v_uid) INTO v_is_org_creator
      FROM public.organizations
      WHERE id = v_org_id;

      IF v_is_org_creator IS TRUE THEN
        v_role := 'owner';
      ELSE
        -- Newly invited, pending, or unassigned members FAIL CLOSED to read-only 'viewer'
        v_role := 'viewer';
      END IF;
    ELSE
      v_role := 'viewer';
    END IF;
  END IF;

  RETURN v_role;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_user_role() TO authenticated, service_role;

-- 4. Strengthen guard_measurement_entries_integrity()
CREATE OR REPLACE FUNCTION public.guard_measurement_entries_integrity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role TEXT;
BEGIN
  -- A. BLOCK DELETION OF BILLED ENTRIES
  IF TG_OP = 'DELETE' THEN
    IF OLD.billed_in_ra_bill_id IS NOT NULL THEN
      RAISE EXCEPTION 'Integrity Violation: Cannot delete measurement entry (%) because it has already been billed in RA Bill (%). Billed measurements are legally locked for department audit.', 
        COALESCE(OLD.entry_number, OLD.id::TEXT), OLD.billed_in_ra_bill_id;
    END IF;
    RETURN OLD;
  END IF;

  -- B. RESOLVE CALLER ROLE FOR UPDATE OPERATIONS
  v_role := public.get_user_role();

  -- 1. Protect against certification by unauthorized roles & require page/entry numbers
  IF NEW.status = 'CERTIFIED' AND (OLD.status IS NULL OR OLD.status != 'CERTIFIED') THEN
    IF v_role NOT IN ('owner', 'partner', 'managing_partner', 'project_manager', 'billing_engineer') THEN
      RAISE EXCEPTION 'Access Denied: Only Billing Engineers, Project Managers, Partners, or Owners can certify e-MB measurements. Current role: %', v_role;
    END IF;

    -- Enforce that page_number is present and positive
    IF NEW.page_number IS NULL OR NEW.page_number <= 0 THEN
      RAISE EXCEPTION 'Certification Error: A valid Measurement Book Page Number (MB Page No) is required before certifying measurement entry (%).', 
        COALESCE(NEW.entry_number, NEW.id::TEXT);
    END IF;

    -- Enforce that entry_number is present and non-empty
    IF NEW.entry_number IS NULL OR TRIM(NEW.entry_number::TEXT) = '' THEN
      RAISE EXCEPTION 'Certification Error: Measurement Entry Number is required before certifying an e-MB record.';
    END IF;
  END IF;

  -- 2. Protect against modifying entries that have already been billed in an official RA Bill
  IF OLD.billed_in_ra_bill_id IS NOT NULL THEN
    IF (OLD.calculated_quantity IS DISTINCT FROM NEW.calculated_quantity) OR
       (OLD.boq_item_id IS DISTINCT FROM NEW.boq_item_id) OR
       (OLD.number_of_units IS DISTINCT FROM NEW.number_of_units) OR
       (OLD.length IS DISTINCT FROM NEW.length) OR
       (OLD.breadth IS DISTINCT FROM NEW.breadth) OR
       (OLD.depth_height IS DISTINCT FROM NEW.depth_height) OR
       (OLD.status IS DISTINCT FROM NEW.status AND NEW.status != 'CERTIFIED') THEN
      RAISE EXCEPTION 'Integrity Violation: Measurement (%) has already been certified and billed in RA Bill (%). Billed dimensions and quantities are legally locked and cannot be altered.',
        COALESCE(OLD.entry_number, OLD.id::TEXT), OLD.billed_in_ra_bill_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Ensure trigger runs on both BEFORE UPDATE AND BEFORE DELETE
DROP TRIGGER IF EXISTS trg_guard_measurement_entries ON public.measurement_entries;
CREATE TRIGGER trg_guard_measurement_entries
  BEFORE UPDATE OR DELETE ON public.measurement_entries
  FOR EACH ROW EXECUTE FUNCTION public.guard_measurement_entries_integrity();

