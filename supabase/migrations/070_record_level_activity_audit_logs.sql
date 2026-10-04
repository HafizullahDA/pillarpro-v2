-- ==============================================================================
-- 070_record_level_activity_audit_logs.sql
-- PillarPro Enterprise: Automated Audit Trail & Activity History per Record
--
-- Enables tamper-proof "who changed what, when" timeline for enterprise buyers and auditors on:
-- 1. RA Bills (public.ra_bills): creation, status changes, amount/retention amendments
-- 2. Security Deposits & BGs (public.security_deposits): creation, status transitions (active, released, invoked, expired), term renewals
-- 3. Supplier Transactions (public.supplier_transactions): procurement/payment creation, edits, and deletions
-- 4. Activity Logs Compatibility View (public.activity_logs)
-- ==============================================================================

-- 1. Enhanced Index for Fast Chronological Entity Timeline Lookups
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity_created 
  ON public.audit_logs(entity_type, entity_id, created_at DESC);

-- 2. RA Bills Activity Audit Trigger (Insert & Update)
CREATE OR REPLACE FUNCTION public.trg_audit_ra_bills()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor RECORD;
  v_org_id UUID;
  v_diff JSONB := '{}'::jsonb;
  v_action TEXT;
  v_notes TEXT;
BEGIN
  SELECT * INTO v_actor FROM public.get_audit_actor();

  v_org_id := COALESCE(NEW.organization_id, v_actor.actor_org_id);
  IF v_org_id IS NULL AND NEW.project_id IS NOT NULL THEN
    SELECT organization_id INTO v_org_id FROM public.projects WHERE id = NEW.project_id;
  END IF;

  IF TG_OP = 'INSERT' THEN
    v_action := 'RA_BILL_CREATED';
    v_notes := 'Government Running Account bill created and registered.';
    v_diff := jsonb_build_object(
      'bill_number', NEW.bill_number,
      'work_certified_amount', NEW.work_certified_amount,
      'retention_percentage', NEW.retention_percentage,
      'net_payable_amount', NEW.net_payable_amount,
      'status', NEW.status::TEXT,
      'submission_date', NEW.submission_date
    );

    INSERT INTO public.audit_logs (
      organization_id, project_id, user_id, user_email, user_name, user_role,
      action, entity_type, entity_id, entity_identifier,
      previous_values, new_values, diff_summary, notes
    ) VALUES (
      v_org_id,
      NEW.project_id,
      v_actor.actor_id,
      v_actor.actor_email,
      v_actor.actor_name,
      v_actor.actor_role,
      v_action,
      'ra_bills',
      NEW.id::TEXT,
      'RA Bill #' || COALESCE(NEW.bill_number, NEW.id::TEXT),
      '{}'::jsonb,
      to_jsonb(NEW),
      v_diff,
      v_notes
    );

    RETURN NEW;

  ELSIF TG_OP = 'UPDATE' THEN
    -- Calculate precise field-level diff
    IF OLD.status::TEXT IS DISTINCT FROM NEW.status::TEXT THEN
      v_diff := v_diff || jsonb_build_object('status', jsonb_build_object('from', OLD.status::TEXT, 'to', NEW.status::TEXT));
    END IF;
    IF OLD.work_certified_amount IS DISTINCT FROM NEW.work_certified_amount THEN
      v_diff := v_diff || jsonb_build_object('work_certified_amount', jsonb_build_object('from', OLD.work_certified_amount, 'to', NEW.work_certified_amount));
    END IF;
    IF OLD.retention_percentage IS DISTINCT FROM NEW.retention_percentage THEN
      v_diff := v_diff || jsonb_build_object('retention_percentage', jsonb_build_object('from', OLD.retention_percentage, 'to', NEW.retention_percentage));
    END IF;
    IF OLD.amount_received IS DISTINCT FROM NEW.amount_received THEN
      v_diff := v_diff || jsonb_build_object('amount_received', jsonb_build_object('from', OLD.amount_received, 'to', NEW.amount_received));
    END IF;
    IF OLD.submission_date IS DISTINCT FROM NEW.submission_date THEN
      v_diff := v_diff || jsonb_build_object('submission_date', jsonb_build_object('from', OLD.submission_date, 'to', NEW.submission_date));
    END IF;
    IF OLD.date_received IS DISTINCT FROM NEW.date_received THEN
      v_diff := v_diff || jsonb_build_object('date_received', jsonb_build_object('from', OLD.date_received, 'to', NEW.date_received));
    END IF;
    IF OLD.remarks IS DISTINCT FROM NEW.remarks THEN
      v_diff := v_diff || jsonb_build_object('remarks', jsonb_build_object('from', OLD.remarks, 'to', NEW.remarks));
    END IF;

    -- Only record if there was a meaningful modification
    IF v_diff != '{}'::jsonb THEN
      IF OLD.status::TEXT IS DISTINCT FROM NEW.status::TEXT THEN
        v_action := CASE 
          WHEN NEW.status::TEXT = 'cancelled' THEN 'RA_BILL_CANCELLED'
          ELSE 'RA_BILL_STATUS_CHANGED'
        END;
        v_notes := 'RA bill status changed from ' || OLD.status::TEXT || ' to ' || NEW.status::TEXT || '.';
      ELSE
        v_action := 'RA_BILL_UPDATED';
        v_notes := 'RA bill certified parameters or payment figures amended.';
      END IF;

      INSERT INTO public.audit_logs (
        organization_id, project_id, user_id, user_email, user_name, user_role,
        action, entity_type, entity_id, entity_identifier,
        previous_values, new_values, diff_summary, notes
      ) VALUES (
        v_org_id,
        NEW.project_id,
        v_actor.actor_id,
        v_actor.actor_email,
        v_actor.actor_name,
        v_actor.actor_role,
        v_action,
        'ra_bills',
        NEW.id::TEXT,
        'RA Bill #' || COALESCE(NEW.bill_number, NEW.id::TEXT),
        to_jsonb(OLD),
        to_jsonb(NEW),
        v_diff,
        v_notes
      );
    END IF;

    RETURN NEW;
  END IF;

  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_audit_ra_bills ON public.ra_bills;
CREATE TRIGGER trg_audit_ra_bills
  AFTER INSERT OR UPDATE ON public.ra_bills
  FOR EACH ROW EXECUTE FUNCTION public.trg_audit_ra_bills();


-- 3. Security Deposits & Bank Guarantees Activity Audit Trigger (Insert, Update, Delete)
CREATE OR REPLACE FUNCTION public.trg_audit_security_deposits()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor RECORD;
  v_org_id UUID;
  v_diff JSONB := '{}'::jsonb;
  v_action TEXT;
  v_notes TEXT;
BEGIN
  SELECT * INTO v_actor FROM public.get_audit_actor();

  IF TG_OP = 'INSERT' THEN
    v_org_id := COALESCE(NEW.organization_id, v_actor.actor_org_id);
    IF v_org_id IS NULL AND NEW.project_id IS NOT NULL THEN
      SELECT organization_id INTO v_org_id FROM public.projects WHERE id = NEW.project_id;
    END IF;

    v_action := 'SECURITY_DEPOSIT_CREATED';
    v_notes := 'Security Deposit / Bank Guarantee pledged and logged.';
    v_diff := jsonb_build_object(
      'reference_number', NEW.reference_number,
      'deposit_type', NEW.deposit_type::TEXT,
      'amount', NEW.amount,
      'issuing_bank', NEW.issuing_bank,
      'expiry_date', NEW.expiry_date,
      'status', NEW.status::TEXT
    );

    INSERT INTO public.audit_logs (
      organization_id, project_id, user_id, user_email, user_name, user_role,
      action, entity_type, entity_id, entity_identifier,
      previous_values, new_values, diff_summary, notes
    ) VALUES (
      v_org_id,
      NEW.project_id,
      v_actor.actor_id,
      v_actor.actor_email,
      v_actor.actor_name,
      v_actor.actor_role,
      v_action,
      'security_deposits',
      NEW.id::TEXT,
      COALESCE(NEW.reference_number, 'Deposit') || ' (' || NEW.deposit_type::TEXT || ')',
      '{}'::jsonb,
      to_jsonb(NEW),
      v_diff,
      v_notes
    );

    RETURN NEW;

  ELSIF TG_OP = 'UPDATE' THEN
    v_org_id := COALESCE(NEW.organization_id, v_actor.actor_org_id);
    IF v_org_id IS NULL AND NEW.project_id IS NOT NULL THEN
      SELECT organization_id INTO v_org_id FROM public.projects WHERE id = NEW.project_id;
    END IF;

    IF OLD.status::TEXT IS DISTINCT FROM NEW.status::TEXT THEN
      v_diff := v_diff || jsonb_build_object('status', jsonb_build_object('from', OLD.status::TEXT, 'to', NEW.status::TEXT));
    END IF;
    IF OLD.amount IS DISTINCT FROM NEW.amount THEN
      v_diff := v_diff || jsonb_build_object('amount', jsonb_build_object('from', OLD.amount, 'to', NEW.amount));
    END IF;
    IF OLD.expiry_date IS DISTINCT FROM NEW.expiry_date THEN
      v_diff := v_diff || jsonb_build_object('expiry_date', jsonb_build_object('from', OLD.expiry_date, 'to', NEW.expiry_date));
    END IF;
    IF OLD.claim_expiry_date IS DISTINCT FROM NEW.claim_expiry_date THEN
      v_diff := v_diff || jsonb_build_object('claim_expiry_date', jsonb_build_object('from', OLD.claim_expiry_date, 'to', NEW.claim_expiry_date));
    END IF;
    IF OLD.release_date IS DISTINCT FROM NEW.release_date THEN
      v_diff := v_diff || jsonb_build_object('release_date', jsonb_build_object('from', OLD.release_date, 'to', NEW.release_date));
    END IF;
    IF OLD.issuing_bank IS DISTINCT FROM NEW.issuing_bank THEN
      v_diff := v_diff || jsonb_build_object('issuing_bank', jsonb_build_object('from', OLD.issuing_bank, 'to', NEW.issuing_bank));
    END IF;
    IF OLD.notes IS DISTINCT FROM NEW.notes THEN
      v_diff := v_diff || jsonb_build_object('notes', jsonb_build_object('from', OLD.notes, 'to', NEW.notes));
    END IF;

    IF v_diff != '{}'::jsonb THEN
      IF OLD.status::TEXT IS DISTINCT FROM NEW.status::TEXT THEN
        v_action := CASE 
          WHEN NEW.status::TEXT = 'released' THEN 'SECURITY_DEPOSIT_RELEASED'
          WHEN NEW.status::TEXT = 'invoked' THEN 'SECURITY_DEPOSIT_INVOKED'
          WHEN NEW.status::TEXT = 'expired' THEN 'SECURITY_DEPOSIT_EXPIRED'
          ELSE 'SECURITY_DEPOSIT_STATUS_CHANGED'
        END;
        v_notes := 'Security deposit status transitioned to ' || NEW.status::TEXT || '.';
      ELSE
        v_action := 'SECURITY_DEPOSIT_UPDATED';
        v_notes := 'Security deposit / guarantee terms, validity, or amount amended.';
      END IF;

      INSERT INTO public.audit_logs (
        organization_id, project_id, user_id, user_email, user_name, user_role,
        action, entity_type, entity_id, entity_identifier,
        previous_values, new_values, diff_summary, notes
      ) VALUES (
        v_org_id,
        NEW.project_id,
        v_actor.actor_id,
        v_actor.actor_email,
        v_actor.actor_name,
        v_actor.actor_role,
        v_action,
        'security_deposits',
        NEW.id::TEXT,
        COALESCE(NEW.reference_number, 'Deposit') || ' (' || NEW.deposit_type::TEXT || ')',
        to_jsonb(OLD),
        to_jsonb(NEW),
        v_diff,
        v_notes
      );
    END IF;

    RETURN NEW;

  ELSIF TG_OP = 'DELETE' THEN
    v_org_id := COALESCE(OLD.organization_id, v_actor.actor_org_id);
    IF v_org_id IS NULL AND OLD.project_id IS NOT NULL THEN
      SELECT organization_id INTO v_org_id FROM public.projects WHERE id = OLD.project_id;
    END IF;

    INSERT INTO public.audit_logs (
      organization_id, project_id, user_id, user_email, user_name, user_role,
      action, entity_type, entity_id, entity_identifier,
      previous_values, new_values, diff_summary, notes
    ) VALUES (
      v_org_id,
      OLD.project_id,
      v_actor.actor_id,
      v_actor.actor_email,
      v_actor.actor_name,
      v_actor.actor_role,
      'SECURITY_DEPOSIT_DELETED',
      'security_deposits',
      OLD.id::TEXT,
      COALESCE(OLD.reference_number, 'Deposit') || ' (' || OLD.deposit_type::TEXT || ')',
      to_jsonb(OLD),
      '{}'::jsonb,
      jsonb_build_object('deleted_reference', OLD.reference_number, 'amount', OLD.amount),
      'Security Deposit record deleted from system.'
    );

    RETURN OLD;
  END IF;

  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_audit_security_deposits ON public.security_deposits;
CREATE TRIGGER trg_audit_security_deposits
  AFTER INSERT OR UPDATE OR DELETE ON public.security_deposits
  FOR EACH ROW EXECUTE FUNCTION public.trg_audit_security_deposits();


-- 4. Supplier Ledger Transactions Activity Audit Trigger (Insert, Update, Delete)
CREATE OR REPLACE FUNCTION public.trg_audit_supplier_transactions()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor RECORD;
  v_org_id UUID;
  v_supplier_name TEXT := 'Supplier';
  v_diff JSONB := '{}'::jsonb;
  v_action TEXT;
  v_notes TEXT;
BEGIN
  SELECT * INTO v_actor FROM public.get_audit_actor();

  IF TG_OP = 'INSERT' THEN
    v_org_id := COALESCE(NEW.organization_id, v_actor.actor_org_id);
    IF v_org_id IS NULL AND NEW.supplier_id IS NOT NULL THEN
      SELECT organization_id, name INTO v_org_id, v_supplier_name FROM public.suppliers WHERE id = NEW.supplier_id;
    ELSE
      SELECT name INTO v_supplier_name FROM public.suppliers WHERE id = NEW.supplier_id;
    END IF;
    IF v_org_id IS NULL AND NEW.project_id IS NOT NULL THEN
      SELECT organization_id INTO v_org_id FROM public.projects WHERE id = NEW.project_id;
    END IF;

    v_action := 'SUPPLIER_TRANSACTION_CREATED';
    v_notes := 'Supplier ' || NEW.transaction_type::TEXT || ' voucher recorded in ledger.';
    v_diff := jsonb_build_object(
      'supplier_name', COALESCE(v_supplier_name, 'Supplier'),
      'transaction_type', NEW.transaction_type::TEXT,
      'amount', NEW.amount,
      'date', NEW.date,
      'description', NEW.description,
      'mode', NEW.mode::TEXT,
      'reference', NEW.reference
    );

    INSERT INTO public.audit_logs (
      organization_id, project_id, user_id, user_email, user_name, user_role,
      action, entity_type, entity_id, entity_identifier,
      previous_values, new_values, diff_summary, notes
    ) VALUES (
      v_org_id,
      NEW.project_id,
      v_actor.actor_id,
      v_actor.actor_email,
      v_actor.actor_name,
      v_actor.actor_role,
      v_action,
      'supplier_transactions',
      NEW.id::TEXT,
      COALESCE(v_supplier_name, 'Supplier') || ' - ' || INITCAP(NEW.transaction_type::TEXT) || ' (' || NEW.description || ')',
      '{}'::jsonb,
      to_jsonb(NEW),
      v_diff,
      v_notes
    );

    RETURN NEW;

  ELSIF TG_OP = 'UPDATE' THEN
    v_org_id := COALESCE(NEW.organization_id, v_actor.actor_org_id);
    IF v_org_id IS NULL AND NEW.supplier_id IS NOT NULL THEN
      SELECT organization_id, name INTO v_org_id, v_supplier_name FROM public.suppliers WHERE id = NEW.supplier_id;
    ELSE
      SELECT name INTO v_supplier_name FROM public.suppliers WHERE id = NEW.supplier_id;
    END IF;
    IF v_org_id IS NULL AND NEW.project_id IS NOT NULL THEN
      SELECT organization_id INTO v_org_id FROM public.projects WHERE id = NEW.project_id;
    END IF;

    IF OLD.amount IS DISTINCT FROM NEW.amount THEN
      v_diff := v_diff || jsonb_build_object('amount', jsonb_build_object('from', OLD.amount, 'to', NEW.amount));
    END IF;
    IF OLD.date IS DISTINCT FROM NEW.date THEN
      v_diff := v_diff || jsonb_build_object('date', jsonb_build_object('from', OLD.date, 'to', NEW.date));
    END IF;
    IF OLD.mode::TEXT IS DISTINCT FROM NEW.mode::TEXT THEN
      v_diff := v_diff || jsonb_build_object('mode', jsonb_build_object('from', OLD.mode::TEXT, 'to', NEW.mode::TEXT));
    END IF;
    IF OLD.description IS DISTINCT FROM NEW.description THEN
      v_diff := v_diff || jsonb_build_object('description', jsonb_build_object('from', OLD.description, 'to', NEW.description));
    END IF;
    IF OLD.reference IS DISTINCT FROM NEW.reference THEN
      v_diff := v_diff || jsonb_build_object('reference', jsonb_build_object('from', OLD.reference, 'to', NEW.reference));
    END IF;
    IF OLD.notes IS DISTINCT FROM NEW.notes THEN
      v_diff := v_diff || jsonb_build_object('notes', jsonb_build_object('from', OLD.notes, 'to', NEW.notes));
    END IF;

    IF v_diff != '{}'::jsonb THEN
      v_action := 'SUPPLIER_TRANSACTION_UPDATED';
      v_notes := 'Supplier transaction details or ledger amount amended.';

      INSERT INTO public.audit_logs (
        organization_id, project_id, user_id, user_email, user_name, user_role,
        action, entity_type, entity_id, entity_identifier,
        previous_values, new_values, diff_summary, notes
      ) VALUES (
        v_org_id,
        NEW.project_id,
        v_actor.actor_id,
        v_actor.actor_email,
        v_actor.actor_name,
        v_actor.actor_role,
        v_action,
        'supplier_transactions',
        NEW.id::TEXT,
        COALESCE(v_supplier_name, 'Supplier') || ' - ' || INITCAP(NEW.transaction_type::TEXT) || ' (' || NEW.description || ')',
        to_jsonb(OLD),
        to_jsonb(NEW),
        v_diff,
        v_notes
      );
    END IF;

    RETURN NEW;

  ELSIF TG_OP = 'DELETE' THEN
    v_org_id := COALESCE(OLD.organization_id, v_actor.actor_org_id);
    IF v_org_id IS NULL AND OLD.supplier_id IS NOT NULL THEN
      SELECT organization_id, name INTO v_org_id, v_supplier_name FROM public.suppliers WHERE id = OLD.supplier_id;
    ELSE
      SELECT name INTO v_supplier_name FROM public.suppliers WHERE id = OLD.supplier_id;
    END IF;
    IF v_org_id IS NULL AND OLD.project_id IS NOT NULL THEN
      SELECT organization_id INTO v_org_id FROM public.projects WHERE id = OLD.project_id;
    END IF;

    INSERT INTO public.audit_logs (
      organization_id, project_id, user_id, user_email, user_name, user_role,
      action, entity_type, entity_id, entity_identifier,
      previous_values, new_values, diff_summary, notes
    ) VALUES (
      v_org_id,
      OLD.project_id,
      v_actor.actor_id,
      v_actor.actor_email,
      v_actor.actor_name,
      v_actor.actor_role,
      'SUPPLIER_TRANSACTION_DELETED',
      'supplier_transactions',
      OLD.id::TEXT,
      COALESCE(v_supplier_name, 'Supplier') || ' - ' || INITCAP(OLD.transaction_type::TEXT) || ' (' || OLD.description || ')',
      to_jsonb(OLD),
      '{}'::jsonb,
      jsonb_build_object('deleted_record', OLD.description, 'amount', OLD.amount, 'type', OLD.transaction_type::TEXT),
      'Supplier transaction removed from ledger.'
    );

    RETURN OLD;
  END IF;

  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_audit_supplier_transactions ON public.supplier_transactions;
CREATE TRIGGER trg_audit_supplier_transactions
  AFTER INSERT OR UPDATE OR DELETE ON public.supplier_transactions
  FOR EACH ROW EXECUTE FUNCTION public.trg_audit_supplier_transactions();


-- 5. Enterprise Activity Logs Compatibility View
CREATE OR REPLACE VIEW public.activity_logs AS
SELECT 
  id,
  organization_id,
  project_id,
  user_id,
  user_email,
  user_name,
  user_role,
  action,
  entity_type,
  entity_id,
  entity_identifier,
  previous_values,
  new_values,
  diff_summary,
  notes,
  ip_address,
  user_agent,
  created_at
FROM public.audit_logs;

COMMENT ON VIEW public.activity_logs IS 'Real-time view alias exposing the immutable audit trail for activity history per record.';
