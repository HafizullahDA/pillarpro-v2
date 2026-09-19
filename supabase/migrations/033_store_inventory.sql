-- ============================================================
-- PillarPro v2 — Migration 033: Store Inventory, GRN & Issue Management
-- Multi-tenant physical warehouse & site stock tracking
-- ============================================================

-- 1. Create inventory unit type enum
DO $$ BEGIN
  CREATE TYPE inventory_unit AS ENUM ('bags', 'mt', 'cft', 'sqft', 'liters', 'kg', 'nos', 'trips');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- 2. Create inventory transaction type enum
DO $$ BEGIN
  CREATE TYPE inventory_trx_type AS ENUM ('receipt_in', 'issue_out', 'return_in', 'wastage_adjustment');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- 3. Create inventory items master table
CREATE TABLE IF NOT EXISTS public.inventory_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL, -- NULL = firm central warehouse / yard
  item_name TEXT NOT NULL, -- e.g. "OPC 43 Cement", "12mm TMT Fe500", "Coarse Sand"
  item_code TEXT, -- e.g. "MAT-CEM-01"
  category TEXT DEFAULT 'material', -- material, hardware, safety, consumable
  unit inventory_unit NOT NULL DEFAULT 'bags',
  current_stock NUMERIC(12, 2) NOT NULL DEFAULT 0,
  minimum_stock_alert NUMERIC(12, 2) NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_inventory_items_org ON public.inventory_items(organization_id);
CREATE INDEX IF NOT EXISTS idx_inventory_items_project ON public.inventory_items(project_id);

-- 4. Create inventory transactions table (GRN & Site Issue Slips)
CREATE TABLE IF NOT EXISTS public.inventory_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES public.inventory_items(id) ON DELETE CASCADE,
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  supplier_id UUID REFERENCES public.suppliers(id) ON DELETE SET NULL,
  supplier_transaction_id UUID REFERENCES public.supplier_transactions(id) ON DELETE SET NULL,
  transaction_type inventory_trx_type NOT NULL DEFAULT 'receipt_in',
  quantity NUMERIC(12, 2) NOT NULL CHECK (quantity > 0),
  transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
  destination_location TEXT, -- e.g. "Pier P3 Foundation", "Culvert Chainage 14+200" (for issues)
  issued_to_person TEXT, -- e.g. "Ramesh Mason", "Subcontractor Sharma"
  challan_number TEXT, -- Delivery challan or gate pass number
  vehicle_number TEXT, -- Delivery truck / dumper registration number
  remarks TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_inventory_trx_item ON public.inventory_transactions(item_id);
CREATE INDEX IF NOT EXISTS idx_inventory_trx_org_date ON public.inventory_transactions(organization_id, transaction_date DESC);
CREATE INDEX IF NOT EXISTS idx_inventory_trx_proj ON public.inventory_transactions(project_id);

-- 5. Trigger to automatically maintain current_stock in inventory_items
CREATE OR REPLACE FUNCTION public.sync_inventory_stock_balance()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.transaction_type IN ('receipt_in', 'return_in') THEN
      UPDATE public.inventory_items
      SET current_stock = current_stock + NEW.quantity, updated_at = NOW()
      WHERE id = NEW.item_id;
    ELSIF NEW.transaction_type IN ('issue_out', 'wastage_adjustment') THEN
      UPDATE public.inventory_items
      SET current_stock = current_stock - NEW.quantity, updated_at = NOW()
      WHERE id = NEW.item_id;
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    IF OLD.transaction_type IN ('receipt_in', 'return_in') THEN
      UPDATE public.inventory_items
      SET current_stock = current_stock - OLD.quantity, updated_at = NOW()
      WHERE id = OLD.item_id;
    ELSIF OLD.transaction_type IN ('issue_out', 'wastage_adjustment') THEN
      UPDATE public.inventory_items
      SET current_stock = current_stock + OLD.quantity, updated_at = NOW()
      WHERE id = OLD.item_id;
    END IF;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_inventory_stock ON public.inventory_transactions;
CREATE TRIGGER trg_sync_inventory_stock
AFTER INSERT OR DELETE ON public.inventory_transactions
FOR EACH ROW EXECUTE FUNCTION public.sync_inventory_stock_balance();

-- 6. Enable RLS
ALTER TABLE public.inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_transactions ENABLE ROW LEVEL SECURITY;

-- 7. RLS Policies for inventory_items
CREATE POLICY "inv_items_org_select"
ON public.inventory_items FOR SELECT
TO authenticated
USING (
  organization_id = public.get_user_organization_id()
);

CREATE POLICY "inv_items_org_insert"
ON public.inventory_items FOR INSERT
TO authenticated
WITH CHECK (
  organization_id = public.get_user_organization_id()
  AND public.get_user_role() IN ('owner', 'partner', 'managing_partner', 'accountant', 'site_supervisor')
);

CREATE POLICY "inv_items_org_update"
ON public.inventory_items FOR UPDATE
TO authenticated
USING (
  organization_id = public.get_user_organization_id()
  AND public.get_user_role() IN ('owner', 'partner', 'managing_partner', 'accountant', 'site_supervisor')
)
WITH CHECK (
  organization_id = public.get_user_organization_id()
);

CREATE POLICY "inv_items_org_delete"
ON public.inventory_items FOR DELETE
TO authenticated
USING (
  organization_id = public.get_user_organization_id()
  AND public.get_user_role() IN ('owner', 'managing_partner')
);

-- 8. RLS Policies for inventory_transactions
CREATE POLICY "inv_trx_org_select"
ON public.inventory_transactions FOR SELECT
TO authenticated
USING (
  organization_id = public.get_user_organization_id()
);

CREATE POLICY "inv_trx_org_insert"
ON public.inventory_transactions FOR INSERT
TO authenticated
WITH CHECK (
  organization_id = public.get_user_organization_id()
  AND public.get_user_role() IN ('owner', 'partner', 'managing_partner', 'accountant', 'site_supervisor')
);

CREATE POLICY "inv_trx_org_update"
ON public.inventory_transactions FOR UPDATE
TO authenticated
USING (
  organization_id = public.get_user_organization_id()
  AND public.get_user_role() IN ('owner', 'partner', 'managing_partner', 'accountant', 'site_supervisor')
)
WITH CHECK (
  organization_id = public.get_user_organization_id()
);

CREATE POLICY "inv_trx_org_delete"
ON public.inventory_transactions FOR DELETE
TO authenticated
USING (
  organization_id = public.get_user_organization_id()
  AND public.get_user_role() IN ('owner', 'managing_partner')
);

-- 9. Grants
GRANT SELECT, INSERT, UPDATE, DELETE ON public.inventory_items TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.inventory_transactions TO authenticated;

