-- ============================================================
-- PillarPro v2 — Migration 028: Suppliers Organization Default & RLS Hardening
-- Ensures supplier records inherit organization_id automatically on insert,
-- preventing RLS insertion rejections when organization_id is omitted.
-- ============================================================

-- 1. Set default on column
ALTER TABLE public.suppliers
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id);

ALTER TABLE public.suppliers
  ALTER COLUMN organization_id SET DEFAULT public.get_user_organization_id();

-- 2. Backfill any existing suppliers missing organization_id
UPDATE public.suppliers
SET organization_id = (
  SELECT id FROM public.organizations ORDER BY created_at ASC LIMIT 1
)
WHERE organization_id IS NULL;

-- 3. BEFORE INSERT trigger to auto-populate organization_id
CREATE OR REPLACE FUNCTION public.set_supplier_organization_id()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public AS $$
BEGIN
  IF NEW.organization_id IS NULL THEN
    NEW.organization_id := public.get_user_organization_id();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_suppliers_set_org ON public.suppliers;
CREATE TRIGGER trg_suppliers_set_org
  BEFORE INSERT ON public.suppliers
  FOR EACH ROW
  EXECUTE FUNCTION public.set_supplier_organization_id();

-- 4. Harden suppliers INSERT policy to use COALESCE (match workers pattern)
DROP POLICY IF EXISTS "suppliers_insert_org" ON public.suppliers;

CREATE POLICY "suppliers_insert_org" ON public.suppliers
  FOR INSERT TO authenticated
  WITH CHECK (
    COALESCE(organization_id, public.get_user_organization_id()) = public.get_user_organization_id()
    AND public.get_user_role() IN ('owner', 'partner', 'managing_partner', 'accountant')
  );

-- Keep the owner-only deletion RPC scoped to the caller's organization.
-- The function is SECURITY DEFINER, so this explicit check is required in
-- addition to the table's RLS policy.
CREATE OR REPLACE FUNCTION public.delete_supplier(p_supplier_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF public.get_user_role() <> 'owner' THEN
    RAISE EXCEPTION 'Unauthorized: Only the Owner can delete a supplier account.';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.suppliers
    WHERE id = p_supplier_id
      AND organization_id = public.get_user_organization_id()
  ) THEN
    RAISE EXCEPTION 'Supplier not found in your organization.';
  END IF;

  DELETE FROM public.supplier_transactions WHERE supplier_id = p_supplier_id;
  DELETE FROM public.suppliers WHERE id = p_supplier_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.delete_supplier(UUID) TO authenticated;
