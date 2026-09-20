-- ============================================================
-- PillarPro v2 — Migration 036: Add Carriage Charges to Supplier Transactions
-- Adds carriage_amount column to public.supplier_transactions
-- allowing contractors to record freight, transport, and loading costs
-- directly alongside material procurements.
-- ============================================================

ALTER TABLE public.supplier_transactions
  ADD COLUMN IF NOT EXISTS carriage_amount NUMERIC(15,2) DEFAULT 0;

COMMENT ON COLUMN public.supplier_transactions.carriage_amount IS 
  'Carriage, freight, transport, or loading/unloading charges included in the procurement';
