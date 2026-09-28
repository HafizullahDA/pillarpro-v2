-- Migration 054: Integration of Electronic Measurement Book (e-MB) with Government RA Bills
-- Establishes end-to-end audit traceability: RA Bill -> BOQ Item -> Measurement Entry -> Measurement Book -> Certification

-- 1. Add billed_in_ra_bill_id to measurement_entries for fast filtering of unbilled certified work
ALTER TABLE public.measurement_entries
ADD COLUMN IF NOT EXISTS billed_in_ra_bill_id UUID REFERENCES public.ra_bills(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_me_billed_ra_bill ON public.measurement_entries(billed_in_ra_bill_id);

-- 2. Traceability Join Table: ra_bill_measurement_entries
CREATE TABLE IF NOT EXISTS public.ra_bill_measurement_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    ra_bill_id UUID NOT NULL REFERENCES public.ra_bills(id) ON DELETE CASCADE,
    ra_bill_item_id UUID REFERENCES public.ra_bill_items(id) ON DELETE CASCADE,
    boq_item_id UUID NOT NULL REFERENCES public.boq_items(id) ON DELETE RESTRICT,
    measurement_entry_id UUID NOT NULL REFERENCES public.measurement_entries(id) ON DELETE RESTRICT,
    billed_quantity NUMERIC(16, 3) NOT NULL CHECK (billed_quantity > 0),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_ra_bill_measurement_entry UNIQUE (ra_bill_id, measurement_entry_id)
);

CREATE INDEX IF NOT EXISTS idx_rbme_bill ON public.ra_bill_measurement_entries(ra_bill_id);
CREATE INDEX IF NOT EXISTS idx_rbme_item ON public.ra_bill_measurement_entries(ra_bill_item_id);
CREATE INDEX IF NOT EXISTS idx_rbme_entry ON public.ra_bill_measurement_entries(measurement_entry_id);
CREATE INDEX IF NOT EXISTS idx_rbme_boq ON public.ra_bill_measurement_entries(boq_item_id);

-- 3. Enable RLS
ALTER TABLE public.ra_bill_measurement_entries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "rbme_select_org" ON public.ra_bill_measurement_entries;
CREATE POLICY "rbme_select_org" ON public.ra_bill_measurement_entries
    FOR SELECT TO authenticated
    USING (organization_id = public.get_user_organization_id());

DROP POLICY IF EXISTS "rbme_insert_org" ON public.ra_bill_measurement_entries;
CREATE POLICY "rbme_insert_org" ON public.ra_bill_measurement_entries
    FOR INSERT TO authenticated
    WITH CHECK (
        COALESCE(organization_id, public.get_user_organization_id()) = public.get_user_organization_id()
    );

DROP POLICY IF EXISTS "rbme_delete_org" ON public.ra_bill_measurement_entries;
CREATE POLICY "rbme_delete_org" ON public.ra_bill_measurement_entries
    FOR DELETE TO authenticated
    USING (organization_id = public.get_user_organization_id());

-- 4. RPC to calculate unbilled certified work for a project
CREATE OR REPLACE FUNCTION public.get_project_unbilled_certified_work(p_project_id UUID)
RETURNS JSONB AS $$
DECLARE
    v_total_certified NUMERIC(16, 2) := 0;
    v_total_billed NUMERIC(16, 2) := 0;
    v_unbilled NUMERIC(16, 2) := 0;
    v_unbilled_entries_count INTEGER := 0;
BEGIN
    -- Sum of certified measurements
    SELECT
        COALESCE(SUM(me.calculated_quantity * COALESCE(b.revised_rate, b.awarded_rate, 0)), 0),
        COUNT(me.id)
    INTO v_total_certified, v_unbilled_entries_count
    FROM public.measurement_entries me
    JOIN public.boq_items b ON b.id = me.boq_item_id
    WHERE me.project_id = p_project_id
      AND me.status = 'CERTIFIED';

    -- Sum of work certified in RA Bills
    SELECT
        COALESCE(SUM(
            CASE
                WHEN rb.billing_mode = 'cumulative' AND rb.this_bill_work_certified IS NOT NULL
                THEN rb.this_bill_work_certified
                ELSE rb.work_certified_amount
            END
        ), 0)
    INTO v_total_billed
    FROM public.ra_bills rb
    WHERE rb.project_id = p_project_id;

    v_unbilled := GREATEST(0, v_total_certified - v_total_billed);

    RETURN jsonb_build_object(
        'project_id', p_project_id,
        'total_certified_work', v_total_certified,
        'total_billed_work', v_total_billed,
        'unbilled_certified_work', v_unbilled,
        'certified_entries_count', v_unbilled_entries_count
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
