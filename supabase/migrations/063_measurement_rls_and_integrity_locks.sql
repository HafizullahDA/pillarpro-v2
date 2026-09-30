-- ============================================================
-- PillarPro v2 — Migration 063: Measurement RLS & Integrity Locks
--
-- Closes critical security and data-integrity gaps across the
-- Electronic Measurement Book (e-MB) module:
-- 1. Enables Row Level Security (RLS) on all e-MB measurement tables.
-- 2. Scopes SELECT, INSERT, UPDATE, DELETE to the authenticated user's organization.
-- 3. Enforces database-level immutability triggers:
--    a) Prevents deleting measurement entries that have been certified or billed in an RA Bill.
--    b) Prevents downgrading CERTIFIED measurements back to DRAFT or SUBMITTED.
--    c) Prevents unauthorized roles from certifying measurements.
-- ============================================================

-- 1. Enable Row Level Security (RLS) on e-MB tables
ALTER TABLE IF EXISTS public.measurement_books ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.measurement_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.measurement_adjustments ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.measurement_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.measurement_certificates ENABLE ROW LEVEL SECURITY;

-- 2. Measurement Books Policies
DROP POLICY IF EXISTS "mb_select_org" ON public.measurement_books;
CREATE POLICY "mb_select_org" ON public.measurement_books
    FOR SELECT TO authenticated
    USING (organization_id = public.get_user_organization_id());

DROP POLICY IF EXISTS "mb_insert_org" ON public.measurement_books;
CREATE POLICY "mb_insert_org" ON public.measurement_books
    FOR INSERT TO authenticated
    WITH CHECK (COALESCE(organization_id, public.get_user_organization_id()) = public.get_user_organization_id());

DROP POLICY IF EXISTS "mb_update_org" ON public.measurement_books;
CREATE POLICY "mb_update_org" ON public.measurement_books
    FOR UPDATE TO authenticated
    USING (organization_id = public.get_user_organization_id())
    WITH CHECK (organization_id = public.get_user_organization_id());

DROP POLICY IF EXISTS "mb_delete_org" ON public.measurement_books;
CREATE POLICY "mb_delete_org" ON public.measurement_books
    FOR DELETE TO authenticated
    USING (organization_id = public.get_user_organization_id());

-- 3. Measurement Entries Policies
DROP POLICY IF EXISTS "me_select_org" ON public.measurement_entries;
CREATE POLICY "me_select_org" ON public.measurement_entries
    FOR SELECT TO authenticated
    USING (organization_id = public.get_user_organization_id());

DROP POLICY IF EXISTS "me_insert_org" ON public.measurement_entries;
CREATE POLICY "me_insert_org" ON public.measurement_entries
    FOR INSERT TO authenticated
    WITH CHECK (COALESCE(organization_id, public.get_user_organization_id()) = public.get_user_organization_id());

DROP POLICY IF EXISTS "me_update_org" ON public.measurement_entries;
CREATE POLICY "me_update_org" ON public.measurement_entries
    FOR UPDATE TO authenticated
    USING (organization_id = public.get_user_organization_id())
    WITH CHECK (organization_id = public.get_user_organization_id());

DROP POLICY IF EXISTS "me_delete_org" ON public.measurement_entries;
CREATE POLICY "me_delete_org" ON public.measurement_entries
    FOR DELETE TO authenticated
    USING (organization_id = public.get_user_organization_id());

-- 4. Measurement Adjustments Policies
DROP POLICY IF EXISTS "ma_select_org" ON public.measurement_adjustments;
CREATE POLICY "ma_select_org" ON public.measurement_adjustments
    FOR SELECT TO authenticated
    USING (organization_id = public.get_user_organization_id());

DROP POLICY IF EXISTS "ma_insert_org" ON public.measurement_adjustments;
CREATE POLICY "ma_insert_org" ON public.measurement_adjustments
    FOR INSERT TO authenticated
    WITH CHECK (COALESCE(organization_id, public.get_user_organization_id()) = public.get_user_organization_id());

DROP POLICY IF EXISTS "ma_update_org" ON public.measurement_adjustments;
CREATE POLICY "ma_update_org" ON public.measurement_adjustments
    FOR UPDATE TO authenticated
    USING (organization_id = public.get_user_organization_id())
    WITH CHECK (organization_id = public.get_user_organization_id());

DROP POLICY IF EXISTS "ma_delete_org" ON public.measurement_adjustments;
CREATE POLICY "ma_delete_org" ON public.measurement_adjustments
    FOR DELETE TO authenticated
    USING (organization_id = public.get_user_organization_id());

-- 5. Measurement Documents Policies
DROP POLICY IF EXISTS "md_select_org" ON public.measurement_documents;
CREATE POLICY "md_select_org" ON public.measurement_documents
    FOR SELECT TO authenticated
    USING (organization_id = public.get_user_organization_id());

DROP POLICY IF EXISTS "md_insert_org" ON public.measurement_documents;
CREATE POLICY "md_insert_org" ON public.measurement_documents
    FOR INSERT TO authenticated
    WITH CHECK (COALESCE(organization_id, public.get_user_organization_id()) = public.get_user_organization_id());

DROP POLICY IF EXISTS "md_update_org" ON public.measurement_documents;
CREATE POLICY "md_update_org" ON public.measurement_documents
    FOR UPDATE TO authenticated
    USING (organization_id = public.get_user_organization_id())
    WITH CHECK (organization_id = public.get_user_organization_id());

DROP POLICY IF EXISTS "md_delete_org" ON public.measurement_documents;
CREATE POLICY "md_delete_org" ON public.measurement_documents
    FOR DELETE TO authenticated
    USING (organization_id = public.get_user_organization_id());

-- 6. Measurement Certificates Policies
DROP POLICY IF EXISTS "mc_select_org" ON public.measurement_certificates;
CREATE POLICY "mc_select_org" ON public.measurement_certificates
    FOR SELECT TO authenticated
    USING (organization_id = public.get_user_organization_id());

DROP POLICY IF EXISTS "mc_insert_org" ON public.measurement_certificates;
CREATE POLICY "mc_insert_org" ON public.measurement_certificates
    FOR INSERT TO authenticated
    WITH CHECK (COALESCE(organization_id, public.get_user_organization_id()) = public.get_user_organization_id());

DROP POLICY IF EXISTS "mc_update_org" ON public.measurement_certificates;
CREATE POLICY "mc_update_org" ON public.measurement_certificates
    FOR UPDATE TO authenticated
    USING (organization_id = public.get_user_organization_id())
    WITH CHECK (organization_id = public.get_user_organization_id());

DROP POLICY IF EXISTS "mc_delete_org" ON public.measurement_certificates;
CREATE POLICY "mc_delete_org" ON public.measurement_certificates
    FOR DELETE TO authenticated
    USING (organization_id = public.get_user_organization_id());

-- 7. Database Guard: Prevent Deletion of Billed or Certified Measurements
CREATE OR REPLACE FUNCTION public.guard_measurement_entries_delete()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Prevent deleting if already billed in a Running Account Bill
  IF OLD.billed_in_ra_bill_id IS NOT NULL THEN
    RAISE EXCEPTION 'Integrity Violation: Measurement entry has already been billed in RA Bill (%). Billed entries cannot be deleted.', OLD.billed_in_ra_bill_id;
  END IF;

  -- Prevent deleting certified entries
  IF OLD.status = 'CERTIFIED' THEN
    RAISE EXCEPTION 'Integrity Violation: Certified measurement entries cannot be deleted. If a test check or quantity adjustment is required, record an official Measurement Adjustment.';
  END IF;

  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_measurement_delete ON public.measurement_entries;
CREATE TRIGGER trg_guard_measurement_delete
  BEFORE DELETE ON public.measurement_entries
  FOR EACH ROW EXECUTE FUNCTION public.guard_measurement_entries_delete();

-- 8. Enhanced Database Guard: Prevent Status Downgrades & Enforce Role Certification
CREATE OR REPLACE FUNCTION public.guard_measurement_entries_integrity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_role TEXT;
BEGIN
  v_role := public.get_user_role();

  -- 1. Protect against certification by unauthorized roles
  IF NEW.status = 'CERTIFIED' AND (OLD.status IS NULL OR OLD.status != 'CERTIFIED') THEN
    IF v_role NOT IN ('owner', 'partner', 'managing_partner', 'project_manager', 'billing_engineer') THEN
      RAISE EXCEPTION 'Access Denied: Only Billing Engineers, Project Managers, Partners, or Owners can certify e-MB measurements.';
    END IF;
  END IF;

  -- 2. Protect against downgrading certified entries to Draft or Submitted
  IF OLD.status = 'CERTIFIED' AND NEW.status IN ('DRAFT', 'SUBMITTED') THEN
    RAISE EXCEPTION 'Security Violation: Certified measurements cannot be downgraded to Draft or Submitted status.';
  END IF;

  -- 3. Protect against modifying entries that have already been billed in an official RA Bill
  IF OLD.billed_in_ra_bill_id IS NOT NULL THEN
    IF (OLD.calculated_quantity IS DISTINCT FROM NEW.calculated_quantity) OR
       (OLD.boq_item_id IS DISTINCT FROM NEW.boq_item_id) OR
       (OLD.status IS DISTINCT FROM NEW.status AND NEW.status != 'CERTIFIED') THEN
      RAISE EXCEPTION 'Integrity Violation: This measurement has already been billed in RA Bill (%). Billed measurements are legally locked.', OLD.billed_in_ra_bill_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_measurement_entries ON public.measurement_entries;
CREATE TRIGGER trg_guard_measurement_entries
  BEFORE UPDATE ON public.measurement_entries
  FOR EACH ROW EXECUTE FUNCTION public.guard_measurement_entries_integrity();
