-- ============================================================
-- PillarPro v2 — Migration 015: Owner Supplier Deletion & RLS
-- 1. Restrict DELETE on public.suppliers strictly to Owner role
-- 2. Restrict Managing Partner to SELECT, INSERT, UPDATE on public.suppliers
-- 3. Update FK constraint on supplier_transactions to ON DELETE CASCADE
-- 4. Atomic delete_supplier RPC with owner role validation
-- Safe & idempotent to run in Supabase SQL Editor.
-- ============================================================

-- ──────────────────────────────────────────
-- 1. UPDATE RLS POLICIES ON public.suppliers
-- ──────────────────────────────────────────
DROP POLICY IF EXISTS "suppliers_all_owner_partner" ON public.suppliers;
DROP POLICY IF EXISTS "suppliers_select_owner_partner" ON public.suppliers;
DROP POLICY IF EXISTS "suppliers_insert_owner_partner" ON public.suppliers;
DROP POLICY IF EXISTS "suppliers_update_owner_partner" ON public.suppliers;
DROP POLICY IF EXISTS "suppliers_delete_owner" ON public.suppliers;

-- SELECT for Owner and Managing Partner
CREATE POLICY "suppliers_select_owner_partner" ON public.suppliers
  FOR SELECT TO authenticated
  USING (public.get_user_role() IN ('owner', 'managing_partner'));

-- INSERT for Owner and Managing Partner
CREATE POLICY "suppliers_insert_owner_partner" ON public.suppliers
  FOR INSERT TO authenticated
  WITH CHECK (public.get_user_role() IN ('owner', 'managing_partner'));

-- UPDATE for Owner and Managing Partner
CREATE POLICY "suppliers_update_owner_partner" ON public.suppliers
  FOR UPDATE TO authenticated
  USING (public.get_user_role() IN ('owner', 'managing_partner'));

-- DELETE strictly restricted to Owner only
CREATE POLICY "suppliers_delete_owner" ON public.suppliers
  FOR DELETE TO authenticated
  USING (public.get_user_role() = 'owner');

-- ──────────────────────────────────────────
-- 2. UPDATE FOREIGN KEY TO CASCADE ON DELETE
-- (When supplier is deleted, transactions are deleted, firing
--  trg_ledger_delete_supplier_transaction to clean up public.ledger)
-- ──────────────────────────────────────────
ALTER TABLE public.supplier_transactions
  DROP CONSTRAINT IF EXISTS supplier_transactions_supplier_id_fkey,
  ADD CONSTRAINT supplier_transactions_supplier_id_fkey
    FOREIGN KEY (supplier_id) REFERENCES public.suppliers(id) ON DELETE CASCADE;

-- ──────────────────────────────────────────
-- 3. ATOMIC DELETION RPC WITH OWNER CHECK
-- ──────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.delete_supplier(p_supplier_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  -- Strict server-side Owner check
  IF public.get_user_role() <> 'owner' THEN
    RAISE EXCEPTION 'Unauthorized: Only the Owner can delete a supplier account.';
  END IF;

  -- Delete associated transactions (fires trg_ledger_delete_supplier_transaction)
  DELETE FROM public.supplier_transactions WHERE supplier_id = p_supplier_id;

  -- Delete the supplier record
  DELETE FROM public.suppliers WHERE id = p_supplier_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.delete_supplier(UUID) TO authenticated;

