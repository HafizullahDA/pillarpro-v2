-- Migration 052: BOQ Master, Revisions, Deviations, and Quantity Balance Tracking
-- Designed for CPWD, State PWD, NHAI, MoRTH, MES, Railways, and PSUs

-- 1. Extend public.boq_items with authoritative contract master & execution fields
ALTER TABLE public.boq_items
  ADD COLUMN IF NOT EXISTS contract_id UUID REFERENCES public.contracts(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS chapter VARCHAR(255),
  ADD COLUMN IF NOT EXISTS detailed_specification TEXT,
  ADD COLUMN IF NOT EXISTS department_item_code VARCHAR(100),
  ADD COLUMN IF NOT EXISTS schedule_reference VARCHAR(150),
  ADD COLUMN IF NOT EXISTS item_type VARCHAR(50) DEFAULT 'original',
  ADD COLUMN IF NOT EXISTS revised_quantity NUMERIC(16, 3),
  ADD COLUMN IF NOT EXISTS revised_rate NUMERIC(14, 2),
  ADD COLUMN IF NOT EXISTS revised_amount NUMERIC(16, 2),
  ADD COLUMN IF NOT EXISTS measured_quantity NUMERIC(16, 3) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS certified_quantity NUMERIC(16, 3) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS billed_quantity NUMERIC(16, 3) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS paid_quantity NUMERIC(16, 3) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS variation_quantity NUMERIC(16, 3) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS extra_quantity NUMERIC(16, 3) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS substituted_quantity NUMERIC(16, 3) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS notes TEXT;

CREATE INDEX IF NOT EXISTS idx_boq_items_contract ON public.boq_items(contract_id);
CREATE INDEX IF NOT EXISTS idx_boq_items_item_type ON public.boq_items(item_type);

-- 2. Audit & Revisions History: boq_item_revisions
CREATE TABLE IF NOT EXISTS public.boq_item_revisions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    contract_id UUID REFERENCES public.contracts(id) ON DELETE SET NULL,
    boq_item_id UUID NOT NULL REFERENCES public.boq_items(id) ON DELETE CASCADE,
    revision_type VARCHAR(50) NOT NULL CHECK (
        revision_type IN (
            'original',
            'deviation',
            'variation',
            'extra_item',
            'substitution',
            'rate_revision',
            'quantity_adjustment'
        )
    ),
    revision_reference VARCHAR(150),
    previous_quantity NUMERIC(16, 3) NOT NULL DEFAULT 0,
    new_quantity NUMERIC(16, 3) NOT NULL,
    previous_rate NUMERIC(14, 2) NOT NULL DEFAULT 0,
    new_rate NUMERIC(14, 2) NOT NULL,
    previous_amount NUMERIC(16, 2) NOT NULL DEFAULT 0,
    new_amount NUMERIC(16, 2) NOT NULL,
    justification TEXT,
    sanctioned_by VARCHAR(150),
    sanction_date DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_bir_item ON public.boq_item_revisions(boq_item_id);
CREATE INDEX IF NOT EXISTS idx_bir_project ON public.boq_item_revisions(project_id);

-- 3. RLS Policies
ALTER TABLE public.boq_item_revisions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "bir_select_org" ON public.boq_item_revisions;
CREATE POLICY "bir_select_org" ON public.boq_item_revisions
    FOR SELECT TO authenticated
    USING (organization_id = public.get_user_organization_id());

DROP POLICY IF EXISTS "bir_insert_org" ON public.boq_item_revisions;
CREATE POLICY "bir_insert_org" ON public.boq_item_revisions
    FOR INSERT TO authenticated
    WITH CHECK (
        COALESCE(organization_id, public.get_user_organization_id()) = public.get_user_organization_id()
    );

-- 4. Trigger to sync contract_id from project if missing
CREATE OR REPLACE FUNCTION public.set_boq_item_contract_id()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.contract_id IS NULL THEN
        SELECT id INTO NEW.contract_id
        FROM public.contracts
        WHERE project_id = NEW.project_id
        ORDER BY is_primary DESC, created_at ASC
        LIMIT 1;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_set_boq_item_contract_id ON public.boq_items;
CREATE TRIGGER trg_set_boq_item_contract_id
    BEFORE INSERT OR UPDATE ON public.boq_items
    FOR EACH ROW
    EXECUTE FUNCTION public.set_boq_item_contract_id();
