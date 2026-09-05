-- ============================================================
-- PillarPro v2 — Migration 007: Supplier Account Schema
-- Adds suppliers master, supplier_transactions ledger,
-- balance view, period lock triggers, and RLS policies.
-- Safe to run in Supabase SQL Editor (idempotent).
-- ============================================================

-- ──────────────────────────────────────────
-- 1. ENUMS
-- ──────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE public.supplier_transaction_type AS ENUM ('procurement', 'payment');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ──────────────────────────────────────────
-- 2. TABLE: suppliers
-- ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.suppliers (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID,                     -- Reserved for multi-tenant scoping (nullable)
  name            TEXT NOT NULL,            -- Supplier business or individual name
  contact_number  TEXT,                     -- Phone / mobile
  gst_number      TEXT,                     -- GSTIN / Tax identifier for compliance
  address         TEXT,                     -- Physical address / location
  notes           TEXT,
  created_by      UUID REFERENCES auth.users(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Auto-update updated_at timestamp
DROP TRIGGER IF EXISTS trg_updated_at_suppliers ON public.suppliers;
CREATE TRIGGER trg_updated_at_suppliers
  BEFORE UPDATE ON public.suppliers
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ──────────────────────────────────────────
-- 3. TABLE: supplier_transactions (Ledger)
-- ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.supplier_transactions (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id  UUID,                                          -- Reserved for multi-tenant scoping (nullable)
  supplier_id      UUID NOT NULL REFERENCES public.suppliers(id) ON DELETE RESTRICT,
  project_id       UUID REFERENCES public.projects(id) ON DELETE SET NULL, -- Nullable: NULL = central / general procurement
  transaction_type public.supplier_transaction_type NOT NULL,    -- 'procurement' (+owed) or 'payment' (-owed)
  description      TEXT NOT NULL,                                 -- Material/item description or payment details
  amount           NUMERIC(15,2) NOT NULL CHECK (amount > 0),
  date             DATE NOT NULL DEFAULT CURRENT_DATE,
  mode             public.payment_mode DEFAULT 'cash',            -- Payment mode (cash, bank_transfer, cheque, upi, etc.)
  reference        TEXT,                                          -- Invoice / Challan / Voucher / Cheque number
  expense_id       UUID REFERENCES public.expenses(id) ON DELETE SET NULL, -- Optional link to scanned receipt / expense row
  notes            TEXT,
  created_by       UUID REFERENCES auth.users(id),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Auto-update updated_at timestamp
DROP TRIGGER IF EXISTS trg_updated_at_supplier_transactions ON public.supplier_transactions;
CREATE TRIGGER trg_updated_at_supplier_transactions
  BEFORE UPDATE ON public.supplier_transactions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ──────────────────────────────────────────
-- 4. PERFORMANCE INDEXES
-- ──────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_supplier_transactions_supplier_id ON public.supplier_transactions(supplier_id);
CREATE INDEX IF NOT EXISTS idx_supplier_transactions_project_id  ON public.supplier_transactions(project_id);
CREATE INDEX IF NOT EXISTS idx_supplier_transactions_date        ON public.supplier_transactions(date);
CREATE INDEX IF NOT EXISTS idx_supplier_transactions_expense_id   ON public.supplier_transactions(expense_id);

-- ──────────────────────────────────────────
-- 5. BALANCE CALCULATION VIEW
-- Computes real-time balances dynamically:
-- outstanding_balance = sum(procurement) - sum(payment)
-- ──────────────────────────────────────────
CREATE OR REPLACE VIEW public.supplier_summary AS
SELECT
  s.id,
  s.organization_id,
  s.name,
  s.contact_number,
  s.gst_number,
  s.address,
  s.created_at,
  s.updated_at,
  COALESCE(SUM(CASE WHEN t.transaction_type = 'procurement' THEN t.amount ELSE 0 END), 0)::NUMERIC(15,2) AS total_procured,
  COALESCE(SUM(CASE WHEN t.transaction_type = 'payment'     THEN t.amount ELSE 0 END), 0)::NUMERIC(15,2) AS total_paid,
  COALESCE(SUM(CASE WHEN t.transaction_type = 'procurement' THEN t.amount ELSE -t.amount END), 0)::NUMERIC(15,2) AS outstanding_balance
FROM public.suppliers s
LEFT JOIN public.supplier_transactions t ON t.supplier_id = s.id
GROUP BY s.id;

-- ──────────────────────────────────────────
-- 6. ACCOUNTING PERIOD CLOSURE GUARD
-- Prevents modifications to closed periods unless performed by Owner
-- ──────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.guard_period_supplier_tx()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.project_id IS NOT NULL
     AND public.get_user_role() <> 'owner'
     AND public.is_period_closed(NEW.project_id, NEW.date) THEN
    RAISE EXCEPTION 'This accounting period is closed. Only the Owner can add entries.';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_period_supplier_tx ON public.supplier_transactions;
CREATE TRIGGER trg_period_supplier_tx
  BEFORE INSERT ON public.supplier_transactions
  FOR EACH ROW EXECUTE FUNCTION public.guard_period_supplier_tx();

-- ──────────────────────────────────────────
-- 7. GRANTS FOR AUTHENTICATED ROLE
-- (Required in Supabase so RLS policies are evaluated)
-- ──────────────────────────────────────────
GRANT SELECT, INSERT, UPDATE, DELETE ON public.suppliers TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.supplier_transactions TO authenticated;
GRANT SELECT ON public.supplier_summary TO authenticated;

-- ──────────────────────────────────────────
-- 8. ROW LEVEL SECURITY (RLS)
-- ──────────────────────────────────────────
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supplier_transactions ENABLE ROW LEVEL SECURITY;

-- --- suppliers policies ---

-- Owners and Managing Partners have full CRUD on suppliers
DROP POLICY IF EXISTS "suppliers_all_owner_partner" ON public.suppliers;
CREATE POLICY "suppliers_all_owner_partner" ON public.suppliers
  FOR ALL TO authenticated
  USING (public.get_user_role() IN ('owner', 'managing_partner'));

-- Site Supervisors can view suppliers (e.g. to tag when recording site procurement)
DROP POLICY IF EXISTS "suppliers_select_supervisor" ON public.suppliers;
CREATE POLICY "suppliers_select_supervisor" ON public.suppliers
  FOR SELECT TO authenticated
  USING (public.get_user_role() = 'site_supervisor');

-- --- supplier_transactions policies ---

-- Owners and Managing Partners have full access to all transactions
DROP POLICY IF EXISTS "supplier_tx_all_owner_partner" ON public.supplier_transactions;
CREATE POLICY "supplier_tx_all_owner_partner" ON public.supplier_transactions
  FOR ALL TO authenticated
  USING (public.get_user_role() IN ('owner', 'managing_partner'));

-- Site Supervisors can view transactions only for projects assigned to them
DROP POLICY IF EXISTS "supplier_tx_select_supervisor" ON public.supplier_transactions;
CREATE POLICY "supplier_tx_select_supervisor" ON public.supplier_transactions
  FOR SELECT TO authenticated
  USING (
    public.get_user_role() = 'site_supervisor'
    AND project_id IS NOT NULL
    AND public.user_has_project_access(project_id)
  );

-- Site Supervisors can record site procurement for projects assigned to them
DROP POLICY IF EXISTS "supplier_tx_insert_supervisor" ON public.supplier_transactions;
CREATE POLICY "supplier_tx_insert_supervisor" ON public.supplier_transactions
  FOR INSERT TO authenticated
  WITH CHECK (
    public.get_user_role() = 'site_supervisor'
    AND project_id IS NOT NULL
    AND public.user_has_project_access(project_id)
    AND transaction_type = 'procurement'
  );

