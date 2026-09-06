-- ============================================================
-- PillarPro v2 — Migration 012: Owner Expense Delete & Ledger Sync
-- 1. Restrict DELETE on public.expenses to Owner role only
-- 2. Restrict Managing Partner to SELECT, INSERT, UPDATE on public.expenses
-- 3. Automatic cleanup trigger to delete associated central ledger entry
-- ============================================================

-- 1. Update RLS policies on public.expenses
DROP POLICY IF EXISTS "expenses_all_owner_partner" ON public.expenses;
DROP POLICY IF EXISTS "expenses_delete_owner" ON public.expenses;
DROP POLICY IF EXISTS "expenses_owner_partner_write" ON public.expenses;
DROP POLICY IF EXISTS "expenses_select_owner_partner" ON public.expenses;
DROP POLICY IF EXISTS "expenses_insert_owner_partner" ON public.expenses;
DROP POLICY IF EXISTS "expenses_update_owner_partner" ON public.expenses;

-- SELECT for Owner and Managing Partner
CREATE POLICY "expenses_select_owner_partner" ON public.expenses
  FOR SELECT TO authenticated
  USING (public.get_user_role() IN ('owner', 'managing_partner'));

-- INSERT for Owner and Managing Partner
CREATE POLICY "expenses_insert_owner_partner" ON public.expenses
  FOR INSERT TO authenticated
  WITH CHECK (public.get_user_role() IN ('owner', 'managing_partner'));

-- UPDATE for Owner and Managing Partner
CREATE POLICY "expenses_update_owner_partner" ON public.expenses
  FOR UPDATE TO authenticated
  USING (public.get_user_role() IN ('owner', 'managing_partner'));

-- DELETE strictly restricted to Owner only
CREATE POLICY "expenses_delete_owner" ON public.expenses
  FOR DELETE TO authenticated
  USING (public.get_user_role() = 'owner');

-- 2. Automatic trigger function to remove polymorphic ledger row when an expense is deleted
CREATE OR REPLACE FUNCTION public.ledger_delete_from_expense()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  DELETE FROM public.ledger
  WHERE source_table = 'expenses'
    AND source_id = OLD.id;
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_ledger_delete_expense ON public.expenses;

CREATE TRIGGER trg_ledger_delete_expense
  AFTER DELETE ON public.expenses
  FOR EACH ROW
  EXECUTE FUNCTION public.ledger_delete_from_expense();
