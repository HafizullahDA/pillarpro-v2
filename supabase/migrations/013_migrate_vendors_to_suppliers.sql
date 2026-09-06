-- ============================================================
-- PillarPro v2 — Migration 013: Migrate Vendors to Suppliers
-- 1. Adds quantity, rate, unit columns to supplier_transactions
-- 2. Migrates vendors -> suppliers
-- 3. Migrates vendor_purchases & vendor_payments -> supplier_transactions
-- 4. Updates public.ledger source_table references
-- 5. Adds automated ledger sync triggers for supplier_transactions
-- 6. Updates get_dashboard_totals() RPC
-- Safe & idempotent to run in Supabase SQL Editor.
-- NOTE: Old tables (vendors, vendor_purchases, vendor_payments) are PRESERVED as backup.
-- ============================================================

-- ──────────────────────────────────────────
-- 1. EXTEND supplier_transactions SCHEMA
-- ──────────────────────────────────────────
ALTER TABLE public.supplier_transactions
  ADD COLUMN IF NOT EXISTS quantity NUMERIC(10,3),
  ADD COLUMN IF NOT EXISTS rate NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS unit TEXT DEFAULT 'nos';

-- Disable accounting period lock trigger during data migration to prevent false positives on historical dates
DO $$ BEGIN
  ALTER TABLE public.supplier_transactions DISABLE TRIGGER trg_period_supplier_tx;
EXCEPTION WHEN undefined_object THEN NULL;
END $$;

-- ──────────────────────────────────────────
-- 2. MIGRATE VENDORS -> SUPPLIERS (Idempotent)
-- Match on trimmed, case-insensitive name
-- ──────────────────────────────────────────
INSERT INTO public.suppliers (
  name,
  contact_number,
  notes,
  created_at,
  updated_at
)
SELECT DISTINCT ON (LOWER(TRIM(v.name)))
  TRIM(v.name),
  NULLIF(TRIM(v.phone), ''),
  CASE 
    WHEN v.contact_person IS NOT NULL AND TRIM(v.contact_person) <> '' 
    THEN 'Contact Person: ' || TRIM(v.contact_person) || ' (Migrated from Vendors)'
    ELSE 'Migrated from Vendors'
  END,
  v.created_at,
  v.updated_at
FROM public.vendors v
WHERE NOT EXISTS (
  SELECT 1 FROM public.suppliers s
  WHERE LOWER(TRIM(s.name)) = LOWER(TRIM(v.name))
)
ORDER BY LOWER(TRIM(v.name)), v.created_at ASC;

-- ──────────────────────────────────────────
-- 3. MIGRATE VENDOR PURCHASES -> SUPPLIER TRANSACTIONS (Idempotent)
-- Use same UUID (vp.id) for direct idempotency and ledger linking
-- ──────────────────────────────────────────
INSERT INTO public.supplier_transactions (
  id,
  supplier_id,
  project_id,
  transaction_type,
  description,
  amount,
  quantity,
  rate,
  unit,
  date,
  notes,
  created_by,
  created_at,
  updated_at
)
SELECT
  vp.id,
  s.id,
  vp.project_id,
  'procurement'::public.supplier_transaction_type,
  COALESCE(NULLIF(TRIM(vp.material), ''), 'Material Procurement'),
  vp.amount,
  vp.quantity,
  vp.rate,
  COALESCE(vp.unit, 'nos'),
  vp.date,
  vp.notes,
  vp.created_by,
  vp.created_at,
  vp.created_at
FROM public.vendor_purchases vp
JOIN public.vendors v ON v.id = vp.vendor_id
JOIN public.suppliers s ON LOWER(TRIM(s.name)) = LOWER(TRIM(v.name))
WHERE vp.amount > 0
ON CONFLICT (id) DO NOTHING;

-- ──────────────────────────────────────────
-- 4. MIGRATE VENDOR PAYMENTS -> SUPPLIER TRANSACTIONS (Idempotent)
-- Use same UUID (vpay.id) for direct idempotency and ledger linking
-- ──────────────────────────────────────────
INSERT INTO public.supplier_transactions (
  id,
  supplier_id,
  project_id,
  transaction_type,
  description,
  amount,
  mode,
  reference,
  date,
  notes,
  created_by,
  created_at,
  updated_at
)
SELECT
  vpay.id,
  s.id,
  vpay.project_id,
  'payment'::public.supplier_transaction_type,
  'Payment to ' || TRIM(v.name),
  vpay.amount,
  vpay.mode,
  vpay.reference,
  vpay.date,
  vpay.notes,
  vpay.created_by,
  vpay.created_at,
  vpay.created_at
FROM public.vendor_payments vpay
JOIN public.vendors v ON v.id = vpay.vendor_id
JOIN public.suppliers s ON LOWER(TRIM(s.name)) = LOWER(TRIM(v.name))
WHERE vpay.amount > 0
ON CONFLICT (id) DO NOTHING;

-- Re-enable accounting period lock trigger
DO $$ BEGIN
  ALTER TABLE public.supplier_transactions ENABLE TRIGGER trg_period_supplier_tx;
EXCEPTION WHEN undefined_object THEN NULL;
END $$;

-- ──────────────────────────────────────────
-- 5. RE-POINT EXISTING CENTRAL LEDGER ENTRIES
-- Since we retained the exact same UUIDs, updating source_table links them seamlessly
-- ──────────────────────────────────────────
UPDATE public.ledger
SET source_table = 'supplier_transactions'
WHERE source_table IN ('vendor_purchases', 'vendor_payments');

-- ──────────────────────────────────────────
-- 6. AUTOMATED CENTRAL LEDGER SYNC TRIGGERS
-- Syncs future supplier_transactions to public.ledger automatically
-- (Checks expense_id IS NULL to prevent double-counting OCR receipts)
-- ──────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.ledger_from_supplier_transaction()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  -- If this transaction originated from an expense (OCR receipt scanner),
  -- the expense table trigger trg_ledger_expense already logged it.
  -- Do not double-count!
  IF NEW.expense_id IS NOT NULL THEN
    RETURN NEW;
  END IF;

  IF NEW.transaction_type = 'procurement' THEN
    INSERT INTO public.ledger
      (project_id, entry_type, category, amount, date, source_table, source_id, description, created_by)
    VALUES
      (NEW.project_id, 'expense', 'material', NEW.amount, NEW.date,
       'supplier_transactions', NEW.id, COALESCE(NEW.description, 'Material procurement'), NEW.created_by);
  ELSIF NEW.transaction_type = 'payment' THEN
    INSERT INTO public.ledger
      (project_id, entry_type, amount, date, source_table, source_id, description, created_by)
    VALUES
      (NEW.project_id, 'payment_to_vendor', NEW.amount, NEW.date,
       'supplier_transactions', NEW.id, COALESCE(NEW.description, 'Supplier payment (' || COALESCE(NEW.mode::TEXT, 'cash') || ')'), NEW.created_by);
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_ledger_supplier_transaction ON public.supplier_transactions;
CREATE TRIGGER trg_ledger_supplier_transaction
  AFTER INSERT ON public.supplier_transactions
  FOR EACH ROW EXECUTE FUNCTION public.ledger_from_supplier_transaction();

-- Clean up ledger entry if a supplier transaction is deleted
CREATE OR REPLACE FUNCTION public.ledger_delete_from_supplier_transaction()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  DELETE FROM public.ledger
  WHERE source_table = 'supplier_transactions'
    AND source_id = OLD.id;
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_ledger_delete_supplier_transaction ON public.supplier_transactions;
CREATE TRIGGER trg_ledger_delete_supplier_transaction
  AFTER DELETE ON public.supplier_transactions
  FOR EACH ROW EXECUTE FUNCTION public.ledger_delete_from_supplier_transaction();

-- ──────────────────────────────────────────
-- 7. UPDATE get_dashboard_totals() RPC
-- Reflects supplier_summary & central ledger
-- ──────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_dashboard_totals()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total_expense   NUMERIC := 0;
  v_total_received  NUMERIC := 0;
  v_supplier_dues   NUMERIC := 0;
  v_outstanding     NUMERIC := 0;
BEGIN
  SELECT COALESCE(SUM(amount), 0) INTO v_total_expense
  FROM public.ledger
  WHERE entry_type = 'expense';

  SELECT COALESCE(SUM(amount_received), 0) INTO v_total_received
  FROM public.receivable_payments;

  v_outstanding := COALESCE((SELECT SUM(net_amount) FROM public.bills), 0) - v_total_received;

  SELECT COALESCE(SUM(GREATEST(outstanding_balance, 0)), 0)
  INTO v_supplier_dues
  FROM public.supplier_summary;

  RETURN json_build_object(
    'total_expense',  v_total_expense,
    'total_received', v_total_received,
    'vendor_dues',    v_supplier_dues,
    'supplier_dues',  v_supplier_dues,
    'outstanding',    v_outstanding
  );
END;
$$;

-- ──────────────────────────────────────────
-- 8. VERIFICATION QUERY
-- Run this block in Supabase to inspect row counts before & after
-- ──────────────────────────────────────────
SELECT
  (SELECT COUNT(*) FROM public.vendors) AS vendors_count,
  (SELECT COUNT(*) FROM public.suppliers) AS suppliers_count,
  (SELECT COUNT(*) FROM public.vendor_purchases) AS vendor_purchases_count,
  (SELECT COUNT(*) FROM public.vendor_payments) AS vendor_payments_count,
  (SELECT COUNT(*) FROM public.supplier_transactions WHERE transaction_type = 'procurement') AS supplier_procurements_count,
  (SELECT COUNT(*) FROM public.supplier_transactions WHERE transaction_type = 'payment') AS supplier_payments_count,
  (SELECT COUNT(*) FROM public.ledger WHERE source_table = 'supplier_transactions') AS ledger_supplier_tx_count;

