-- ============================================================
-- PillarPro v2 — Migration 037: BOQ & Work-Done % Tracking Linked to RA Bills
-- Item-rate schedule of quantities (DSR/Custom), e-MB line items,
-- automated certified amounts, and work-done % calculations.
-- ============================================================

-- 1. Create public.boq_items table
CREATE TABLE IF NOT EXISTS public.boq_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL DEFAULT public.get_user_organization_id() REFERENCES public.organizations(id) ON DELETE CASCADE,
  item_number TEXT NOT NULL,
  description TEXT NOT NULL,
  unit TEXT NOT NULL,
  tender_quantity NUMERIC(14,3) NOT NULL CHECK (tender_quantity >= 0),
  awarded_rate NUMERIC(14,2) NOT NULL CHECK (awarded_rate >= 0),
  total_amount NUMERIC(16,2) GENERATED ALWAYS AS (ROUND(tender_quantity * awarded_rate, 2)) STORED,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexing for performance
CREATE INDEX IF NOT EXISTS idx_boq_items_project_id ON public.boq_items(project_id);
CREATE INDEX IF NOT EXISTS idx_boq_items_organization_id ON public.boq_items(organization_id);
CREATE INDEX IF NOT EXISTS idx_boq_items_project_item ON public.boq_items(project_id, item_number);

-- 2. Add billing_entry_mode to public.ra_bills if not already present
ALTER TABLE public.ra_bills 
  ADD COLUMN IF NOT EXISTS billing_entry_mode TEXT DEFAULT 'lump_sum' 
  CHECK (billing_entry_mode IN ('lump_sum', 'item_wise'));

-- 3. Create public.ra_bill_items table (e-MB line items)
CREATE TABLE IF NOT EXISTS public.ra_bill_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ra_bill_id UUID NOT NULL REFERENCES public.ra_bills(id) ON DELETE CASCADE,
  boq_item_id UUID NOT NULL REFERENCES public.boq_items(id) ON DELETE RESTRICT,
  organization_id UUID NOT NULL DEFAULT public.get_user_organization_id() REFERENCES public.organizations(id) ON DELETE CASCADE,
  previous_quantity NUMERIC(14,3) NOT NULL DEFAULT 0 CHECK (previous_quantity >= 0),
  current_quantity NUMERIC(14,3) NOT NULL DEFAULT 0 CHECK (current_quantity >= 0),
  cumulative_quantity NUMERIC(14,3) GENERATED ALWAYS AS (previous_quantity + current_quantity) STORED,
  rate NUMERIC(14,2) NOT NULL CHECK (rate >= 0),
  current_amount NUMERIC(16,2) GENERATED ALWAYS AS (ROUND(current_quantity * rate, 2)) STORED,
  cumulative_amount NUMERIC(16,2) GENERATED ALWAYS AS (ROUND((previous_quantity + current_quantity) * rate, 2)) STORED,
  remarks TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexing for performance
CREATE INDEX IF NOT EXISTS idx_ra_bill_items_ra_bill_id ON public.ra_bill_items(ra_bill_id);
CREATE INDEX IF NOT EXISTS idx_ra_bill_items_boq_item_id ON public.ra_bill_items(boq_item_id);
CREATE INDEX IF NOT EXISTS idx_ra_bill_items_organization_id ON public.ra_bill_items(organization_id);

-- 4. Enable RLS on both tables
ALTER TABLE public.boq_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ra_bill_items ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies for boq_items
DROP POLICY IF EXISTS "boq_items_select_org" ON public.boq_items;
CREATE POLICY "boq_items_select_org" ON public.boq_items
  FOR SELECT TO authenticated
  USING (organization_id = public.get_user_organization_id());

DROP POLICY IF EXISTS "boq_items_insert_org" ON public.boq_items;
CREATE POLICY "boq_items_insert_org" ON public.boq_items
  FOR INSERT TO authenticated
  WITH CHECK (
    COALESCE(organization_id, public.get_user_organization_id()) = public.get_user_organization_id()
  );

DROP POLICY IF EXISTS "boq_items_update_org" ON public.boq_items;
CREATE POLICY "boq_items_update_org" ON public.boq_items
  FOR UPDATE TO authenticated
  USING (organization_id = public.get_user_organization_id())
  WITH CHECK (organization_id = public.get_user_organization_id());

DROP POLICY IF EXISTS "boq_items_delete_org" ON public.boq_items;
CREATE POLICY "boq_items_delete_org" ON public.boq_items
  FOR DELETE TO authenticated
  USING (organization_id = public.get_user_organization_id());

-- 6. RLS Policies for ra_bill_items
DROP POLICY IF EXISTS "ra_bill_items_select_org" ON public.ra_bill_items;
CREATE POLICY "ra_bill_items_select_org" ON public.ra_bill_items
  FOR SELECT TO authenticated
  USING (organization_id = public.get_user_organization_id());

DROP POLICY IF EXISTS "ra_bill_items_insert_org" ON public.ra_bill_items;
CREATE POLICY "ra_bill_items_insert_org" ON public.ra_bill_items
  FOR INSERT TO authenticated
  WITH CHECK (
    COALESCE(organization_id, public.get_user_organization_id()) = public.get_user_organization_id()
  );

DROP POLICY IF EXISTS "ra_bill_items_update_org" ON public.ra_bill_items;
CREATE POLICY "ra_bill_items_update_org" ON public.ra_bill_items
  FOR UPDATE TO authenticated
  USING (organization_id = public.get_user_organization_id())
  WITH CHECK (organization_id = public.get_user_organization_id());

DROP POLICY IF EXISTS "ra_bill_items_delete_org" ON public.ra_bill_items;
CREATE POLICY "ra_bill_items_delete_org" ON public.ra_bill_items
  FOR DELETE TO authenticated
  USING (organization_id = public.get_user_organization_id());

-- 7. Trigger to automatically set organization_id on insert if omitted
CREATE OR REPLACE FUNCTION public.set_boq_organization_id()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = public AS $$
BEGIN
  IF NEW.organization_id IS NULL THEN
    NEW.organization_id := COALESCE(
      public.get_user_organization_id(),
      (SELECT id FROM public.organizations ORDER BY created_at ASC LIMIT 1)
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_boq_items_organization_id ON public.boq_items;
CREATE TRIGGER trg_boq_items_organization_id
  BEFORE INSERT ON public.boq_items
  FOR EACH ROW
  EXECUTE FUNCTION public.set_boq_organization_id();

DROP TRIGGER IF EXISTS trg_ra_bill_items_organization_id ON public.ra_bill_items;
CREATE TRIGGER trg_ra_bill_items_organization_id
  BEFORE INSERT ON public.ra_bill_items
  FOR EACH ROW
  EXECUTE FUNCTION public.set_boq_organization_id();

-- 8. Project BOQ Execution & Work-Done % Aggregation RPC
CREATE OR REPLACE FUNCTION public.get_project_boq_summary(p_project_id UUID)
RETURNS TABLE (
  boq_item_id UUID,
  item_number TEXT,
  description TEXT,
  unit TEXT,
  tender_quantity NUMERIC,
  awarded_rate NUMERIC,
  tender_amount NUMERIC,
  cumulative_executed_qty NUMERIC,
  remaining_qty NUMERIC,
  cumulative_executed_amount NUMERIC,
  work_done_percentage NUMERIC
) 
LANGUAGE plpgsql 
STABLE 
SECURITY DEFINER 
SET search_path = public AS $$
BEGIN
  RETURN QUERY
  SELECT
    b.id AS boq_item_id,
    b.item_number,
    b.description,
    b.unit,
    b.tender_quantity,
    b.awarded_rate,
    b.total_amount AS tender_amount,
    COALESCE(SUM(rbi.current_quantity), 0) AS cumulative_executed_qty,
    ROUND(b.tender_quantity - COALESCE(SUM(rbi.current_quantity), 0), 3) AS remaining_qty,
    ROUND(COALESCE(SUM(rbi.current_quantity), 0) * b.awarded_rate, 2) AS cumulative_executed_amount,
    CASE 
      WHEN b.tender_quantity > 0 THEN 
        ROUND(LEAST(100.0, (COALESCE(SUM(rbi.current_quantity), 0) / b.tender_quantity) * 100.0), 2)
      ELSE 0.00
    END AS work_done_percentage
  FROM public.boq_items b
  LEFT JOIN public.ra_bill_items rbi ON rbi.boq_item_id = b.id
  WHERE b.project_id = p_project_id
    AND b.organization_id = public.get_user_organization_id()
  GROUP BY b.id, b.item_number, b.description, b.unit, b.tender_quantity, b.awarded_rate, b.total_amount, b.created_at
  ORDER BY b.item_number ASC, b.created_at ASC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_project_boq_summary(UUID) TO authenticated;

