-- Migration 055: Contract Defense — Contract Events and Hindrance Register
-- Integrates with existing Delay Defense (hindrances table) without duplication
-- Designed for Indian Government Contractors (CPWD, State PWD, NHAI, MoRTH, MES, Railways, PSUs)

-- 1. Create Event Category & Status Enums if not exist
DO $$ BEGIN
  CREATE TYPE public.contract_event_category AS ENUM (
    'site_not_handed_over',
    'drawing_delay',
    'design_change',
    'approval_delay',
    'material_approval_delay',
    'utility_shifting',
    'encroachment',
    'force_majeure',
    'rain_weather',
    'law_order_issue',
    'department_instruction',
    'variation_instruction',
    'suspension',
    'payment_delay',
    'access_restriction',
    'other'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.contract_event_status AS ENUM (
    'OPEN',
    'UNDER_REVIEW',
    'RESOLVED',
    'CLOSED',
    'DISPUTED'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 2. Extend existing public.hindrances table with Contract Master & Detailed Impact fields
ALTER TABLE public.hindrances
  ADD COLUMN IF NOT EXISTS contract_id UUID REFERENCES public.contracts(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS hindrance_code VARCHAR(100),
  ADD COLUMN IF NOT EXISTS affected_work TEXT,
  ADD COLUMN IF NOT EXISTS affected_boq_items TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS labour_impact TEXT,
  ADD COLUMN IF NOT EXISTS machinery_impact TEXT,
  ADD COLUMN IF NOT EXISTS department_communication TEXT,
  ADD COLUMN IF NOT EXISTS contractor_communication TEXT,
  ADD COLUMN IF NOT EXISTS removal_date DATE,
  ADD COLUMN IF NOT EXISTS duration_days NUMERIC(6, 1) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS standard_status VARCHAR(50) DEFAULT 'OPEN';

CREATE INDEX IF NOT EXISTS idx_hindrances_contract_id ON public.hindrances(contract_id);
CREATE INDEX IF NOT EXISTS idx_hindrances_std_status ON public.hindrances(standard_status);

-- 3. Create public.contract_events table
CREATE TABLE IF NOT EXISTS public.contract_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    contract_id UUID REFERENCES public.contracts(id) ON DELETE SET NULL,
    hindrance_id UUID REFERENCES public.hindrances(id) ON DELETE SET NULL,
    event_number VARCHAR(100) NOT NULL,
    event_type VARCHAR(100) NOT NULL DEFAULT 'other',
    event_date DATE NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE,
    location VARCHAR(255),
    affected_boq_items TEXT[] DEFAULT '{}',
    affected_activities TEXT,
    description TEXT NOT NULL,
    cause TEXT,
    responsible_party VARCHAR(150) DEFAULT 'Department / Employer',
    impact TEXT,
    estimated_delay_days NUMERIC(8, 1) DEFAULT 0,
    actual_delay_days NUMERIC(8, 1) DEFAULT 0,
    labour_affected TEXT,
    machinery_affected TEXT,
    material_affected TEXT,
    financial_impact NUMERIC(16, 2) DEFAULT 0,
    eot_relevance BOOLEAN DEFAULT TRUE,
    eot_clause VARCHAR(100),
    claim_relevance BOOLEAN DEFAULT FALSE,
    claim_heads TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'OPEN' CHECK (
        status IN ('OPEN', 'UNDER_REVIEW', 'RESOLVED', 'CLOSED', 'DISPUTED')
    ),
    remarks TEXT,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ce_org_project ON public.contract_events(organization_id, project_id);
CREATE INDEX IF NOT EXISTS idx_ce_contract ON public.contract_events(contract_id);
CREATE INDEX IF NOT EXISTS idx_ce_hindrance ON public.contract_events(hindrance_id);
CREATE INDEX IF NOT EXISTS idx_ce_dates ON public.contract_events(event_date, start_date);
CREATE INDEX IF NOT EXISTS idx_ce_status ON public.contract_events(status);

-- 4. Enable RLS on contract_events
ALTER TABLE public.contract_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ce_select_org" ON public.contract_events;
CREATE POLICY "ce_select_org" ON public.contract_events
    FOR SELECT TO authenticated
    USING (organization_id = public.get_user_organization_id());

DROP POLICY IF EXISTS "ce_insert_org" ON public.contract_events;
CREATE POLICY "ce_insert_org" ON public.contract_events
    FOR INSERT TO authenticated
    WITH CHECK (
        COALESCE(organization_id, public.get_user_organization_id()) = public.get_user_organization_id()
    );

DROP POLICY IF EXISTS "ce_update_org" ON public.contract_events;
CREATE POLICY "ce_update_org" ON public.contract_events
    FOR UPDATE TO authenticated
    USING (organization_id = public.get_user_organization_id())
    WITH CHECK (organization_id = public.get_user_organization_id());

DROP POLICY IF EXISTS "ce_delete_org" ON public.contract_events;
CREATE POLICY "ce_delete_org" ON public.contract_events
    FOR DELETE TO authenticated
    USING (organization_id = public.get_user_organization_id());

-- 5. Auto-sync contract_id from project if omitted
CREATE OR REPLACE FUNCTION public.set_contract_event_defaults()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.organization_id IS NULL THEN
        SELECT organization_id INTO NEW.organization_id FROM public.projects WHERE id = NEW.project_id;
    END IF;
    IF NEW.contract_id IS NULL THEN
        SELECT id INTO NEW.contract_id FROM public.contracts
        WHERE project_id = NEW.project_id
        ORDER BY is_primary DESC, created_at ASC
        LIMIT 1;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_contract_event_defaults ON public.contract_events;
CREATE TRIGGER trg_contract_event_defaults
    BEFORE INSERT ON public.contract_events
    FOR EACH ROW
    EXECUTE FUNCTION public.set_contract_event_defaults();

-- 6. Seed / Map existing hindrances into contract_events where not already mapped
INSERT INTO public.contract_events (
    organization_id,
    project_id,
    contract_id,
    hindrance_id,
    event_number,
    event_type,
    event_date,
    start_date,
    end_date,
    location,
    description,
    cause,
    responsible_party,
    impact,
    estimated_delay_days,
    actual_delay_days,
    eot_relevance,
    eot_clause,
    claim_relevance,
    status,
    remarks,
    created_at,
    updated_at
)
SELECT
    h.organization_id,
    h.project_id,
    h.contract_id,
    h.id,
    'CE-HINDRANCE-' || LPAD(h.hindrance_number::TEXT, 3, '0'),
    CASE h.category
        WHEN 'site_handover' THEN 'site_not_handed_over'
        WHEN 'drawing_delay' THEN 'drawing_delay'
        WHEN 'utility_shifting' THEN 'utility_shifting'
        WHEN 'weather' THEN 'rain_weather'
        WHEN 'force_majeure' THEN 'force_majeure'
        WHEN 'extra_work' THEN 'variation_instruction'
        WHEN 'fund_delay' THEN 'payment_delay'
        ELSE 'other'
    END,
    h.start_date,
    h.start_date,
    h.end_date,
    h.location_chainage,
    h.description,
    'Site obstruction recorded under CPWD Works Manual Appendix 21',
    CASE WHEN h.delay_type = 'compensable' THEN 'Department / Employer' ELSE 'Force Majeure / Neutral' END,
    'Work impediment affecting execution timeline',
    h.net_delay_days,
    h.net_delay_days,
    TRUE,
    'Clause 5 (CPWD / PWD GCC)',
    CASE WHEN h.delay_type = 'compensable' THEN TRUE ELSE FALSE END,
    CASE h.status
        WHEN 'active' THEN 'OPEN'
        WHEN 'acknowledged_by_dept' THEN 'UNDER_REVIEW'
        WHEN 'resolved' THEN 'RESOLVED'
        WHEN 'disputed' THEN 'DISPUTED'
        ELSE 'OPEN'
    END,
    h.remarks,
    h.created_at,
    h.updated_at
FROM public.hindrances h
WHERE NOT EXISTS (
    SELECT 1 FROM public.contract_events ce WHERE ce.hindrance_id = h.id
);
