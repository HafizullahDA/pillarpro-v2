-- ============================================================
-- PillarPro v2 — Migration 069: Financial Accuracy & Audit Gap Closures
-- Resolves the three critical financial correctness gaps:
--   1. Dual-entry desync in RA Bills (Central Ledger synchronization)
--   2. Triplicate diesel logging (Fuel source attribution & deduplication)
--   3. Cash retention offsetting against submitted Bank Guarantees (CPWD GCC Cl 1A)
-- Safe to run in Supabase SQL Editor (strictly idempotent).
-- ============================================================

-- ==============================================================================
-- PART 1: GAP 1 — RA BILL PAYMENTS TO CENTRAL LEDGER SYNCHRONIZATION
-- ==============================================================================

-- 1.0 Ensure created_by column exists on public.ra_bill_payments
ALTER TABLE public.ra_bill_payments ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id);

-- 1.1 Trigger function to sync public.ra_bill_payments -> public.ledger
CREATE OR REPLACE FUNCTION public.ledger_from_ra_bill_payment()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_ref TEXT;
  v_desc TEXT;
BEGIN
  IF TG_OP = 'DELETE' THEN
    DELETE FROM public.ledger
    WHERE source_table = 'ra_bill_payments' AND source_id = OLD.id;
    RETURN OLD;
  ELSIF TG_OP = 'UPDATE' THEN
    v_ref := COALESCE(NEW.voucher_reference, 'Treasury Transfer');
    v_desc := 'RA Bill Payment (' || v_ref || ')';
    
    UPDATE public.ledger
    SET
      project_id = NEW.project_id,
      amount = NEW.net_bank_amount,
      date = NEW.payment_date,
      description = v_desc
    WHERE source_table = 'ra_bill_payments' AND source_id = NEW.id;
    RETURN NEW;
  ELSIF TG_OP = 'INSERT' THEN
    v_ref := COALESCE(NEW.voucher_reference, 'Treasury Transfer');
    v_desc := 'RA Bill Payment (' || v_ref || ')';

    -- Only insert if not already present
    IF NOT EXISTS (
      SELECT 1 FROM public.ledger
      WHERE source_table = 'ra_bill_payments' AND source_id = NEW.id
    ) THEN
      INSERT INTO public.ledger
        (project_id, entry_type, amount, date, source_table, source_id, description, created_by)
      VALUES
        (NEW.project_id, 'income', NEW.net_bank_amount, NEW.payment_date,
         'ra_bill_payments', NEW.id, v_desc, auth.uid());
    END IF;
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$;

-- 1.2 Attach trigger to ra_bill_payments
DROP TRIGGER IF EXISTS trg_ledger_ra_bill_payment ON public.ra_bill_payments;
CREATE TRIGGER trg_ledger_ra_bill_payment
  AFTER INSERT OR UPDATE OR DELETE ON public.ra_bill_payments
  FOR EACH ROW EXECUTE FUNCTION public.ledger_from_ra_bill_payment();

-- 1.3 Backfill existing historical ra_bill_payments into public.ledger
INSERT INTO public.ledger
  (project_id, entry_type, amount, date, source_table, source_id, description, created_by)
SELECT
  p.project_id,
  'income',
  p.net_bank_amount,
  p.payment_date,
  'ra_bill_payments',
  p.id,
  'RA Bill Payment (' || COALESCE(p.voucher_reference, 'Treasury Transfer') || ')',
  NULL::uuid
FROM public.ra_bill_payments p
WHERE p.project_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.ledger l
    WHERE l.source_table = 'ra_bill_payments' AND l.source_id = p.id
  );


-- ==============================================================================
-- PART 2: GAP 2 — TRIPLICATE DIESEL LOGGING (FUEL SOURCE ATTRIBUTION)
-- ==============================================================================

-- 2.1 Add fuel_source and linkage columns to machinery_logs
ALTER TABLE public.machinery_logs
  ADD COLUMN IF NOT EXISTS fuel_source TEXT NOT NULL DEFAULT 'site_tank',
  ADD COLUMN IF NOT EXISTS linked_expense_id UUID REFERENCES public.expenses(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS linked_supplier_tx_id UUID REFERENCES public.supplier_transactions(id) ON DELETE SET NULL;

DO $$ BEGIN
  ALTER TABLE public.machinery_logs DROP CONSTRAINT IF EXISTS chk_fuel_source;
  ALTER TABLE public.machinery_logs ADD CONSTRAINT chk_fuel_source
    CHECK (fuel_source IN ('site_tank', 'cash_direct', 'credit_supplier'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_machinery_logs_linked_expense ON public.machinery_logs(linked_expense_id);
CREATE INDEX IF NOT EXISTS idx_machinery_logs_linked_supplier_tx ON public.machinery_logs(linked_supplier_tx_id);


-- ==============================================================================
-- PART 3: GAP 3 — CASH RETENTION OFFSET AGAINST BANK GUARANTEES
-- ==============================================================================

-- 3.1 Add BG offset tracking columns to public.ra_bills
ALTER TABLE public.ra_bills
  ADD COLUMN IF NOT EXISTS bg_offset_amount NUMERIC(15,2) NOT NULL DEFAULT 0.00 CHECK (bg_offset_amount >= 0),
  ADD COLUMN IF NOT EXISTS bg_applied_id UUID REFERENCES public.security_deposits(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS gross_retention_required NUMERIC(15,2),
  ADD COLUMN IF NOT EXISTS net_retention_withheld NUMERIC(15,2);

CREATE INDEX IF NOT EXISTS idx_ra_bills_bg_applied_id ON public.ra_bills(bg_applied_id);

-- 3.2 Backfill historical bills (where bg_offset_amount was 0)
UPDATE public.ra_bills
SET
  gross_retention_required = COALESCE(gross_retention_required, retention_amount),
  net_retention_withheld = COALESCE(net_retention_withheld, retention_amount)
WHERE gross_retention_required IS NULL OR net_retention_withheld IS NULL;

-- 3.3 Update status sync trigger to respect BG offset in payment threshold
CREATE OR REPLACE FUNCTION public.sync_ra_bill_status()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  v_net_payable NUMERIC;
  v_effective_retention NUMERIC;
BEGIN
  -- Compute effective cash retention withheld after deducting any active BG offset
  v_effective_retention := GREATEST(
    0.00,
    ROUND((NEW.work_certified_amount * NEW.retention_percentage / 100.0), 2) - COALESCE(NEW.bg_offset_amount, 0.00)
  );

  -- Use net_payable_this_bill if explicitly present (e.g. cumulative mode), otherwise calculate dynamically
  v_net_payable := COALESCE(
    NEW.net_payable_this_bill,
    NEW.work_certified_amount - v_effective_retention
  );

  IF NEW.amount_received >= v_net_payable AND v_net_payable > 0 THEN
    NEW.status := 'fully_paid';
  ELSIF NEW.amount_received > 0 THEN
    NEW.status := 'partially_paid';
  ELSE
    NEW.status := 'submitted';
  END IF;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.sync_ra_bill_status() IS 
  'Automatically synchronizes RA bill status to fully_paid or partially_paid accounting for statutory deductions and Bank Guarantee offsets.';

