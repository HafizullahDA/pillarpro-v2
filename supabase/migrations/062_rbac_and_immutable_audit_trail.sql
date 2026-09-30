-- ==============================================================================
-- 062_rbac_and_immutable_audit_trail.sql
-- PillarPro Enterprise: Role-Based Access Control (RBAC) & Immutable Audit Trail
-- Designed for Indian Government Contractors (CPWD, State PWD, NHAI, MES, Railways)
--
-- 1. Expands public.user_role enum to support the 10 standard contractor roles:
--    OWNER, PARTNER, PROJECT MANAGER, SITE ENGINEER, BILLING ENGINEER,
--    ACCOUNTANT, STORE MANAGER, SITE SUPERVISOR, DATA ENTRY, VIEWER.
-- 2. Creates public.audit_logs table with strict cryptographic/trigger immutability.
-- 3. Implements automated triggers for critical actions:
--    - Measurement certified
--    - Measurement corrected
--    - BOQ quantity changed
--    - Variation approved
--    - RA Bill submitted
--    - Payment recorded
--    - Claim submitted
--    - Contract date changed
-- 4. Enforces protections against unauthorized certification and altering billed records.
-- ==============================================================================

-- 1. Expand public.user_role Enum safely
DO $$ BEGIN
  ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'project_manager';
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'site_engineer';
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'billing_engineer';
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'store_manager';
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'data_entry';
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 2. Update join_organization to accept all new roles
CREATE OR REPLACE FUNCTION public.join_organization(
  p_join_code TEXT,
  p_display_name TEXT,
  p_role TEXT DEFAULT 'site_supervisor'
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_user_email TEXT;
  v_org_id UUID;
  v_org_name TEXT;
  v_code_clean TEXT;
  v_role_assigned TEXT;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated.';
  END IF;

  SELECT email INTO v_user_email FROM auth.users WHERE id = v_user_id;

  v_code_clean := UPPER(TRIM(COALESCE(p_join_code, '')));
  IF v_code_clean = '' THEN
    RAISE EXCEPTION 'Invite code cannot be empty.';
  END IF;

  -- Look up target organization
  SELECT id, name INTO v_org_id, v_org_name
  FROM public.organizations
  WHERE UPPER(join_code) = v_code_clean;

  IF v_org_id IS NULL THEN
    RAISE EXCEPTION 'Invalid invite code. Please check with your firm administrator.';
  END IF;

  -- Normalize role (disallow joining directly as owner)
  v_role_assigned := LOWER(TRIM(COALESCE(p_role, 'site_supervisor')));
  IF v_role_assigned NOT IN (
    'partner', 'managing_partner', 'project_manager', 'site_engineer',
    'billing_engineer', 'accountant', 'store_manager', 'site_supervisor',
    'data_entry', 'viewer'
  ) THEN
    v_role_assigned := 'site_supervisor';
  END IF;

  -- Update or insert user profile
  INSERT INTO public.user_profiles (
    id, email, display_name, status, organization_id, created_at, updated_at
  )
  VALUES (
    v_user_id,
    v_user_email,
    COALESCE(NULLIF(TRIM(p_display_name), ''), 'Staff Member'),
    'active',
    v_org_id,
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    organization_id = v_org_id,
    display_name = COALESCE(NULLIF(TRIM(p_display_name), ''), public.user_profiles.display_name),
    status = 'active',
    updated_at = NOW();

  -- Assign role in firm with explicit cast to public.user_role
  INSERT INTO public.roles (
    user_id, role, project_id, created_at
  )
  VALUES (
    v_user_id,
    v_role_assigned::public.user_role,
    NULL,
    NOW()
  )
  ON CONFLICT (user_id) DO UPDATE SET
    role = v_role_assigned::public.user_role;

  RETURN json_build_object(
    'success', true,
    'organization_id', v_org_id,
    'organization_name', v_org_name,
    'role', v_role_assigned
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.join_organization(TEXT, TEXT, TEXT) TO authenticated, service_role;

-- 3. Create Immutable Audit Logs Table
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id     UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  project_id          UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  user_id             UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  user_email          TEXT,
  user_name           TEXT,
  user_role           TEXT,
  action              TEXT NOT NULL,
  entity_type         TEXT NOT NULL,
  entity_id           TEXT NOT NULL,
  entity_identifier   TEXT,
  previous_values     JSONB DEFAULT '{}'::jsonb,
  new_values          JSONB DEFAULT '{}'::jsonb,
  diff_summary        JSONB DEFAULT '{}'::jsonb,
  notes               TEXT,
  ip_address          TEXT,
  user_agent          TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Performance Indices
CREATE INDEX IF NOT EXISTS idx_audit_logs_org_created ON public.audit_logs(organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_project     ON public.audit_logs(project_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity      ON public.audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action      ON public.audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user        ON public.audit_logs(user_id);

-- 4. Strict Immutability Enforcement (No Updates or Deletions Allowed)
CREATE OR REPLACE FUNCTION public.prevent_audit_log_tampering()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RAISE EXCEPTION 'Audit trail records are strictly immutable and cannot be modified or deleted.';
END;
$$;

DROP TRIGGER IF EXISTS trg_audit_logs_immutable ON public.audit_logs;
CREATE TRIGGER trg_audit_logs_immutable
  BEFORE UPDATE OR DELETE ON public.audit_logs
  FOR EACH ROW EXECUTE FUNCTION public.prevent_audit_log_tampering();

-- RLS on audit_logs
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "audit_logs_select" ON public.audit_logs;
CREATE POLICY "audit_logs_select" ON public.audit_logs
  FOR SELECT TO authenticated
  USING (organization_id = public.get_user_organization_id());

DROP POLICY IF EXISTS "audit_logs_insert" ON public.audit_logs;
CREATE POLICY "audit_logs_insert" ON public.audit_logs
  FOR INSERT TO authenticated
  WITH CHECK (
    COALESCE(organization_id, public.get_user_organization_id()) = public.get_user_organization_id()
  );

-- 5. Helper Function to Resolve Actor Details for Audit Trigger
CREATE OR REPLACE FUNCTION public.get_audit_actor()
RETURNS TABLE (
  actor_id UUID,
  actor_email TEXT,
  actor_name TEXT,
  actor_role TEXT,
  actor_org_id UUID
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RETURN QUERY SELECT
      NULL::UUID,
      'system'::TEXT,
      'System Automation'::TEXT,
      'system'::TEXT,
      public.get_user_organization_id();
  ELSE
    RETURN QUERY
    SELECT
      v_uid,
      COALESCE(p.email, u.email, 'unknown@contractor.in')::TEXT,
      COALESCE(p.display_name, 'Staff Member')::TEXT,
      COALESCE(r.role::TEXT, 'staff')::TEXT,
      COALESCE(p.organization_id, public.get_user_organization_id())
    FROM auth.users u
    LEFT JOIN public.user_profiles p ON p.id = u.id
    LEFT JOIN public.roles r ON r.user_id = u.id
    WHERE u.id = v_uid;
  END IF;
END;
$$;

-- 6. AUTOMATED AUDIT TRIGGER 1: Measurement Certified & Corrected
CREATE OR REPLACE FUNCTION public.trg_audit_measurement_entries()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor RECORD;
  v_item_code TEXT;
BEGIN
  SELECT * INTO v_actor FROM public.get_audit_actor();
  SELECT item_number INTO v_item_code FROM public.boq_items WHERE id = NEW.boq_item_id;

  -- 1. Measurement Certified
  IF NEW.status = 'CERTIFIED' AND (OLD.status IS NULL OR OLD.status != 'CERTIFIED') THEN
    INSERT INTO public.audit_logs (
      organization_id, project_id, user_id, user_email, user_name, user_role,
      action, entity_type, entity_id, entity_identifier,
      previous_values, new_values, diff_summary, notes
    ) VALUES (
      NEW.organization_id,
      NEW.project_id,
      v_actor.actor_id,
      v_actor.actor_email,
      v_actor.actor_name,
      v_actor.actor_role,
      'MEASUREMENT_CERTIFIED',
      'measurement_entries',
      NEW.id::TEXT,
      'e-MB Entry #' || NEW.entry_number || COALESCE(' (' || v_item_code || ')', ''),
      json_build_object('status', OLD.status, 'calculated_quantity', OLD.calculated_quantity),
      json_build_object('status', NEW.status, 'calculated_quantity', NEW.calculated_quantity, 'certified_by', NEW.certified_by),
      json_build_object('status_change', OLD.status || ' -> ' || NEW.status, 'certified_qty', NEW.calculated_quantity),
      'Measurement entry verified and certified for official billing.'
    );
  END IF;

  -- 2. Measurement Corrected (Quantity modified on existing record)
  IF OLD.calculated_quantity IS DISTINCT FROM NEW.calculated_quantity AND OLD.status != 'DRAFT' THEN
    INSERT INTO public.audit_logs (
      organization_id, project_id, user_id, user_email, user_name, user_role,
      action, entity_type, entity_id, entity_identifier,
      previous_values, new_values, diff_summary, notes
    ) VALUES (
      NEW.organization_id,
      NEW.project_id,
      v_actor.actor_id,
      v_actor.actor_email,
      v_actor.actor_name,
      v_actor.actor_role,
      'MEASUREMENT_CORRECTED',
      'measurement_entries',
      NEW.id::TEXT,
      'e-MB Entry #' || NEW.entry_number,
      json_build_object('calculated_quantity', OLD.calculated_quantity, 'length', OLD.length, 'breadth', OLD.breadth, 'depth_height', OLD.depth_height),
      json_build_object('calculated_quantity', NEW.calculated_quantity, 'length', NEW.length, 'breadth', NEW.breadth, 'depth_height', NEW.depth_height),
      json_build_object('quantity_delta', (NEW.calculated_quantity - OLD.calculated_quantity), 'from_qty', OLD.calculated_quantity, 'to_qty', NEW.calculated_quantity),
      'Calculated measurement dimensions corrected.'
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_audit_measurements ON public.measurement_entries;
CREATE TRIGGER trg_audit_measurements
  AFTER UPDATE ON public.measurement_entries
  FOR EACH ROW EXECUTE FUNCTION public.trg_audit_measurement_entries();

-- 7. AUTOMATED AUDIT TRIGGER 2: BOQ Quantity Changed
CREATE OR REPLACE FUNCTION public.trg_audit_boq_items()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor RECORD;
BEGIN
  SELECT * INTO v_actor FROM public.get_audit_actor();

  IF (OLD.quantity IS DISTINCT FROM NEW.quantity) OR 
     (OLD.rate IS DISTINCT FROM NEW.rate) OR 
     (OLD.revised_quantity IS DISTINCT FROM NEW.revised_quantity) THEN
    INSERT INTO public.audit_logs (
      organization_id, project_id, user_id, user_email, user_name, user_role,
      action, entity_type, entity_id, entity_identifier,
      previous_values, new_values, diff_summary, notes
    ) VALUES (
      NEW.organization_id,
      NEW.project_id,
      v_actor.actor_id,
      v_actor.actor_email,
      v_actor.actor_name,
      v_actor.actor_role,
      'BOQ_QUANTITY_CHANGED',
      'boq_items',
      NEW.id::TEXT,
      'BOQ Item #' || COALESCE(NEW.item_number, NEW.id::TEXT),
      json_build_object('quantity', OLD.quantity, 'rate', OLD.rate, 'revised_quantity', OLD.revised_quantity, 'amount', OLD.amount),
      json_build_object('quantity', NEW.quantity, 'rate', NEW.rate, 'revised_quantity', NEW.revised_quantity, 'amount', NEW.amount),
      json_build_object('old_qty', OLD.quantity, 'new_qty', NEW.quantity, 'revised_qty', NEW.revised_quantity),
      'Tender or revised BOQ schedule parameters altered.'
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_audit_boq ON public.boq_items;
CREATE TRIGGER trg_audit_boq
  AFTER UPDATE ON public.boq_items
  FOR EACH ROW EXECUTE FUNCTION public.trg_audit_boq_items();

-- 8. AUTOMATED AUDIT TRIGGER 3: Variation Approved
CREATE OR REPLACE FUNCTION public.trg_audit_contract_variations()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor RECORD;
BEGIN
  SELECT * INTO v_actor FROM public.get_audit_actor();

  IF NEW.status = 'APPROVED' AND (OLD.status IS NULL OR OLD.status != 'APPROVED') THEN
    INSERT INTO public.audit_logs (
      organization_id, project_id, user_id, user_email, user_name, user_role,
      action, entity_type, entity_id, entity_identifier,
      previous_values, new_values, diff_summary, notes
    ) VALUES (
      NEW.organization_id,
      NEW.project_id,
      v_actor.actor_id,
      v_actor.actor_email,
      v_actor.actor_name,
      v_actor.actor_role,
      'VARIATION_APPROVED',
      'contract_variations',
      NEW.id::TEXT,
      'Variation ' || NEW.reference_number || ' (' || NEW.type || ')',
      json_build_object('status', OLD.status, 'proposed_amount', OLD.proposed_amount),
      json_build_object('status', NEW.status, 'approved_amount', NEW.approved_amount, 'approved_order_number', NEW.approved_order_number),
      json_build_object('approved_amount', NEW.approved_amount, 'approval_date', NEW.approval_date),
      'Contract variation order sanctioned and officially approved.'
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_audit_variations ON public.contract_variations;
CREATE TRIGGER trg_audit_variations
  AFTER UPDATE ON public.contract_variations
  FOR EACH ROW EXECUTE FUNCTION public.trg_audit_contract_variations();

-- 9. AUTOMATED AUDIT TRIGGER 4: RA Bill Submitted
CREATE OR REPLACE FUNCTION public.trg_audit_ra_bills()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor RECORD;
BEGIN
  SELECT * INTO v_actor FROM public.get_audit_actor();

  IF (NEW.status::TEXT IN ('submitted', 'partially_paid', 'fully_paid')) AND (OLD.status IS NULL OR OLD.status::TEXT != NEW.status::TEXT) THEN
    INSERT INTO public.audit_logs (
      organization_id, project_id, user_id, user_email, user_name, user_role,
      action, entity_type, entity_id, entity_identifier,
      previous_values, new_values, diff_summary, notes
    ) VALUES (
      COALESCE(NEW.organization_id, v_actor.actor_org_id),
      NEW.project_id,
      v_actor.actor_id,
      v_actor.actor_email,
      v_actor.actor_name,
      v_actor.actor_role,
      'RA_BILL_STATUS_CHANGED',
      'ra_bills',
      NEW.id::TEXT,
      'RA Bill #' || COALESCE(NEW.bill_number, NEW.id::TEXT),
      json_build_object('status', OLD.status::TEXT),
      json_build_object('status', NEW.status::TEXT, 'work_certified', NEW.work_certified_amount, 'net_payable', NEW.net_payable_amount),
      json_build_object('status_change', COALESCE(OLD.status::TEXT, 'draft') || ' -> ' || NEW.status::TEXT, 'net_amount', NEW.net_payable_amount),
      'Government running account bill status updated.'
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_audit_ra_bills ON public.ra_bills;
CREATE TRIGGER trg_audit_ra_bills
  AFTER UPDATE ON public.ra_bills
  FOR EACH ROW EXECUTE FUNCTION public.trg_audit_ra_bills();

-- 10. AUTOMATED AUDIT TRIGGER 5: Payment Recorded
CREATE OR REPLACE FUNCTION public.trg_audit_ra_bill_payments()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor RECORD;
  v_bill_num TEXT;
BEGIN
  SELECT * INTO v_actor FROM public.get_audit_actor();
  SELECT bill_number INTO v_bill_num FROM public.ra_bills WHERE id = NEW.bill_id;

  INSERT INTO public.audit_logs (
    organization_id, project_id, user_id, user_email, user_name, user_role,
    action, entity_type, entity_id, entity_identifier,
    previous_values, new_values, diff_summary, notes
  ) VALUES (
    COALESCE(NEW.organization_id, v_actor.actor_org_id),
    NEW.project_id,
    v_actor.actor_id,
    v_actor.actor_email,
    v_actor.actor_name,
    v_actor.actor_role,
    'PAYMENT_RECORDED',
    'ra_bill_payments',
    NEW.id::TEXT,
    'Payment for RA Bill #' || COALESCE(v_bill_num, 'Direct Voucher'),
    '{}'::jsonb,
    json_build_object('gross_amount', NEW.gross_amount, 'net_bank_amount', NEW.net_bank_amount, 'voucher_reference', NEW.voucher_reference, 'payment_date', NEW.payment_date),
    json_build_object('net_bank_credited', NEW.net_bank_amount, 'gross_released', NEW.gross_amount),
    'Treasury bank payment credited against certified running bill.'
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_audit_payments ON public.ra_bill_payments;
CREATE TRIGGER trg_audit_payments
  AFTER INSERT ON public.ra_bill_payments
  FOR EACH ROW EXECUTE FUNCTION public.trg_audit_ra_bill_payments();

-- 11. AUTOMATED AUDIT TRIGGER 6: Claim Submitted
CREATE OR REPLACE FUNCTION public.trg_audit_contract_claims()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor RECORD;
BEGIN
  SELECT * INTO v_actor FROM public.get_audit_actor();

  IF NEW.status = 'SUBMITTED' AND (TG_OP = 'INSERT' OR OLD.status != 'SUBMITTED') THEN
    INSERT INTO public.audit_logs (
      organization_id, project_id, user_id, user_email, user_name, user_role,
      action, entity_type, entity_id, entity_identifier,
      previous_values, new_values, diff_summary, notes
    ) VALUES (
      NEW.organization_id,
      NEW.project_id,
      v_actor.actor_id,
      v_actor.actor_email,
      v_actor.actor_name,
      v_actor.actor_role,
      'CLAIM_SUBMITTED',
      'contract_claims',
      NEW.id::TEXT,
      'Claim #' || NEW.claim_number || ' (' || NEW.claim_type || ')',
      CASE WHEN TG_OP = 'UPDATE' THEN json_build_object('status', OLD.status, 'claimed_amount', OLD.claimed_amount) ELSE '{}'::jsonb END,
      json_build_object('status', NEW.status, 'claimed_amount', NEW.claimed_amount, 'submission_date', NEW.submission_date),
      json_build_object('claimed_amount', NEW.claimed_amount, 'type', NEW.claim_type),
      'Contractual claim officially filed with department authority / DRB.'
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_audit_claims ON public.contract_claims;
CREATE TRIGGER trg_audit_claims
  AFTER INSERT OR UPDATE ON public.contract_claims
  FOR EACH ROW EXECUTE FUNCTION public.trg_audit_contract_claims();

-- 12. AUTOMATED AUDIT TRIGGER 7: Contract Date / Value Changed
CREATE OR REPLACE FUNCTION public.trg_audit_contracts()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor RECORD;
BEGIN
  SELECT * INTO v_actor FROM public.get_audit_actor();

  IF (OLD.current_completion_date IS DISTINCT FROM NEW.current_completion_date) OR
     (OLD.original_completion_date IS DISTINCT FROM NEW.original_completion_date) OR
     (OLD.awarded_amount IS DISTINCT FROM NEW.awarded_amount) THEN
    INSERT INTO public.audit_logs (
      organization_id, project_id, user_id, user_email, user_name, user_role,
      action, entity_type, entity_id, entity_identifier,
      previous_values, new_values, diff_summary, notes
    ) VALUES (
      NEW.organization_id,
      NEW.project_id,
      v_actor.actor_id,
      v_actor.actor_email,
      v_actor.actor_name,
      v_actor.actor_role,
      'CONTRACT_DATE_CHANGED',
      'contracts',
      NEW.id::TEXT,
      'Contract ' || NEW.agreement_number,
      json_build_object('current_completion_date', OLD.current_completion_date, 'original_completion_date', OLD.original_completion_date, 'awarded_amount', OLD.awarded_amount),
      json_build_object('current_completion_date', NEW.current_completion_date, 'original_completion_date', NEW.original_completion_date, 'awarded_amount', NEW.awarded_amount),
      json_build_object('old_completion', OLD.current_completion_date, 'new_completion', NEW.current_completion_date, 'awarded_value', NEW.awarded_amount),
      'Stipulated contract completion timeline or awarded financial value amended.'
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_audit_contracts ON public.contracts;
CREATE TRIGGER trg_audit_contracts
  AFTER UPDATE ON public.contracts
  FOR EACH ROW EXECUTE FUNCTION public.trg_audit_contracts();

-- 13. GUARDS: Protect Certified Measurements & Billed Records
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

  -- 2. Protect against modifying entries that have already been billed in an official RA Bill
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
