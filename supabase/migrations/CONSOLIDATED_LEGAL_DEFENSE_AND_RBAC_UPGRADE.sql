-- ==============================================================================
-- PILLARPRO CONSOLIDATED UPGRADE MIGRATION (055 -> 063)
-- Legal Defense Suite + Contract Clauses + EOT + Variations + Claims + RBAC & Audit + e-MB RLS Locks
-- Compatible with CPWD, State PWD, NHAI, MoRTH, MES, Railways, and PSU Infrastructure Projects
-- Safe, Idempotent, and Non-Destructive (Uses IF NOT EXISTS, Safe Enums, Functions & Triggers)
--
-- Instructions:
-- 1. Open your Supabase Project Dashboard (https://supabase.com/dashboard).
-- 2. Navigate to 'SQL Editor' in the left sidebar.
-- 3. Click 'New Query', paste this entire script, and click 'Run'.
-- ==============================================================================


-- ==============================================================================
-- PART: 055_contract_events_and_hindrance_register.sql
-- ==============================================================================

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


-- ==============================================================================
-- PART: 056_evidence_vault_and_completeness.sql
-- ==============================================================================

-- Migration 056: PillarPro Evidence Vault and Evidence Completeness Engine
-- Enterprise evidence preservation system for Indian Government Contractors
-- Links evidence to Measurements, Delays, Hindrances, Variations, EOT, Claims, RA Bills, and Site Instructions

-- 1. Create Evidence Type Enum
DO $$ BEGIN
  CREATE TYPE public.evidence_type AS ENUM (
    'DOCUMENT',
    'PHOTO',
    'VIDEO',
    'PDF',
    'SCAN',
    'LETTER',
    'EMAIL',
    'DRAWING',
    'SITE_ORDER',
    'MEASUREMENT',
    'RECEIPT',
    'OTHER'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 2. Table: public.evidence_vault
CREATE TABLE IF NOT EXISTS public.evidence_vault (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    contract_id UUID REFERENCES public.contracts(id) ON DELETE SET NULL,
    evidence_number VARCHAR(100) NOT NULL,
    type VARCHAR(50) NOT NULL DEFAULT 'DOCUMENT' CHECK (
        type IN (
            'DOCUMENT', 'PHOTO', 'VIDEO', 'PDF', 'SCAN',
            'LETTER', 'EMAIL', 'DRAWING', 'SITE_ORDER',
            'MEASUREMENT', 'RECEIPT', 'OTHER'
        )
    ),
    title TEXT NOT NULL,
    description TEXT,
    document_date DATE NOT NULL DEFAULT CURRENT_DATE,
    source VARCHAR(150) DEFAULT 'Contractor',
    
    -- Relational Linking to business records (NOT isolated file manager)
    related_contract_event_id UUID REFERENCES public.contract_events(id) ON DELETE SET NULL,
    related_hindrance_id UUID REFERENCES public.hindrances(id) ON DELETE SET NULL,
    related_measurement_id UUID REFERENCES public.measurement_entries(id) ON DELETE SET NULL,
    related_boq_item_id UUID REFERENCES public.boq_items(id) ON DELETE SET NULL,
    related_ra_bill_id UUID REFERENCES public.ra_bills(id) ON DELETE SET NULL,
    related_eot_id UUID REFERENCES public.eot_applications(id) ON DELETE SET NULL,
    related_claim_id VARCHAR(150),
    related_dispute TEXT,
    
    -- File attributes & metadata preservation
    file_url TEXT NOT NULL,
    original_filename VARCHAR(255),
    file_type VARCHAR(100),
    file_size_bytes BIGINT DEFAULT 0,
    version_number INTEGER NOT NULL DEFAULT 1,
    metadata JSONB DEFAULT '{}'::jsonb,
    notes TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE' CHECK (
        status IN ('ACTIVE', 'ARCHIVED', 'SUPERSEDED', 'DISPUTED')
    ),
    
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Performance & Query Indexes
CREATE INDEX IF NOT EXISTS idx_ev_org_project ON public.evidence_vault(organization_id, project_id);
CREATE INDEX IF NOT EXISTS idx_ev_contract ON public.evidence_vault(contract_id);
CREATE INDEX IF NOT EXISTS idx_ev_type ON public.evidence_vault(type);
CREATE INDEX IF NOT EXISTS idx_ev_date ON public.evidence_vault(document_date DESC);
CREATE INDEX IF NOT EXISTS idx_ev_event ON public.evidence_vault(related_contract_event_id);
CREATE INDEX IF NOT EXISTS idx_ev_hindrance ON public.evidence_vault(related_hindrance_id);
CREATE INDEX IF NOT EXISTS idx_ev_measurement ON public.evidence_vault(related_measurement_id);
CREATE INDEX IF NOT EXISTS idx_ev_boq ON public.evidence_vault(related_boq_item_id);
CREATE INDEX IF NOT EXISTS idx_ev_ra_bill ON public.evidence_vault(related_ra_bill_id);
CREATE INDEX IF NOT EXISTS idx_ev_eot ON public.evidence_vault(related_eot_id);

-- 3. Table: public.evidence_versions (Strict Non-Silent Replacement / Version History)
CREATE TABLE IF NOT EXISTS public.evidence_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    evidence_id UUID NOT NULL REFERENCES public.evidence_vault(id) ON DELETE CASCADE,
    version_number INTEGER NOT NULL,
    file_url TEXT NOT NULL,
    original_filename VARCHAR(255),
    file_type VARCHAR(100),
    file_size_bytes BIGINT DEFAULT 0,
    change_summary TEXT NOT NULL DEFAULT 'Document revision / updated copy',
    metadata JSONB DEFAULT '{}'::jsonb,
    uploaded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ev_versions_evidence ON public.evidence_versions(evidence_id, version_number DESC);

-- 4. Auto-defaults Trigger for Evidence Vault
CREATE OR REPLACE FUNCTION public.set_evidence_defaults()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = public AS $$
BEGIN
  IF NEW.organization_id IS NULL THEN
    NEW.organization_id := COALESCE(
      (SELECT organization_id FROM public.projects WHERE id = NEW.project_id),
      public.get_user_organization_id(),
      (SELECT organization_id FROM public.user_profiles WHERE id = auth.uid()),
      (SELECT id FROM public.organizations ORDER BY created_at ASC LIMIT 1)
    );
  END IF;

  IF NEW.contract_id IS NULL AND NEW.related_contract_event_id IS NOT NULL THEN
    SELECT contract_id INTO NEW.contract_id 
    FROM public.contract_events 
    WHERE id = NEW.related_contract_event_id;
  END IF;

  IF NEW.created_by IS NULL THEN
    NEW.created_by := auth.uid();
  END IF;

  IF NEW.evidence_number IS NULL OR NEW.evidence_number = '' THEN
    NEW.evidence_number := 'EV-' || TO_CHAR(COALESCE(NEW.document_date, CURRENT_DATE), 'YYYY') || '-' || SUBSTRING(gen_random_uuid()::text, 1, 6);
  END IF;

  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_evidence_defaults ON public.evidence_vault;
CREATE TRIGGER trg_set_evidence_defaults
  BEFORE INSERT OR UPDATE ON public.evidence_vault
  FOR EACH ROW EXECUTE FUNCTION public.set_evidence_defaults();

-- 5. Enable RLS
ALTER TABLE public.evidence_vault ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evidence_versions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "evidence_vault_org_select" ON public.evidence_vault;
CREATE POLICY "evidence_vault_org_select" ON public.evidence_vault
  FOR SELECT USING (
    organization_id = public.get_user_organization_id()
    OR auth.role() = 'authenticated'
  );

DROP POLICY IF EXISTS "evidence_vault_org_insert" ON public.evidence_vault;
CREATE POLICY "evidence_vault_org_insert" ON public.evidence_vault
  FOR INSERT WITH CHECK (
    organization_id = public.get_user_organization_id()
    OR auth.role() = 'authenticated'
  );

DROP POLICY IF EXISTS "evidence_vault_org_update" ON public.evidence_vault;
CREATE POLICY "evidence_vault_org_update" ON public.evidence_vault
  FOR UPDATE USING (
    organization_id = public.get_user_organization_id()
    OR auth.role() = 'authenticated'
  );

DROP POLICY IF EXISTS "evidence_vault_org_delete" ON public.evidence_vault;
CREATE POLICY "evidence_vault_org_delete" ON public.evidence_vault
  FOR DELETE USING (
    organization_id = public.get_user_organization_id()
    OR auth.role() = 'authenticated'
  );

DROP POLICY IF EXISTS "evidence_versions_org_select" ON public.evidence_versions;
CREATE POLICY "evidence_versions_org_select" ON public.evidence_versions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.evidence_vault ev
      WHERE ev.id = evidence_versions.evidence_id
      AND (ev.organization_id = public.get_user_organization_id() OR auth.role() = 'authenticated')
    )
  );

DROP POLICY IF EXISTS "evidence_versions_org_insert" ON public.evidence_versions;
CREATE POLICY "evidence_versions_org_insert" ON public.evidence_versions
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.evidence_vault ev
      WHERE ev.id = evidence_versions.evidence_id
      AND (ev.organization_id = public.get_user_organization_id() OR auth.role() = 'authenticated')
    )
  );


-- ==============================================================================
-- PART: 057_correspondence_and_notice_tracking.sql
-- ==============================================================================

-- Migration 057: Contract Correspondence & Contractual Notice Tracking Engine
-- Supports Incoming/Outgoing Letters, Site Instructions, Notices, and transparent Clause-based Response Deadlines
-- Designed for Indian Government Contracts (CPWD, State PWD, NHAI, MoRTH, MES, Railways, PSUs)

-- 1. Create Enums
DO $$ BEGIN
  CREATE TYPE public.correspondence_direction AS ENUM (
    'INCOMING',
    'OUTGOING'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.correspondence_category AS ENUM (
    'CORRESPONDENCE',
    'SITE_INSTRUCTION',
    'NOTICE',
    'MINUTES_OF_MEETING',
    'ORDER'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.correspondence_status AS ENUM (
    'DRAFT',
    'SENT',
    'RECEIVED',
    'ACKNOWLEDGED',
    'RESPONSE_REQUIRED',
    'RESPONDED',
    'CLOSED'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 2. Table: public.contract_notice_rules (Configurable Clause-level rules per contract)
CREATE TABLE IF NOT EXISTS public.contract_notice_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    contract_id UUID REFERENCES public.contracts(id) ON DELETE CASCADE,
    clause_reference VARCHAR(100) NOT NULL,              -- e.g. 'Clause 5', 'Clause 2', 'Clause 10CA', 'Clause 12'
    clause_name VARCHAR(255) NOT NULL,                   -- e.g. 'Intimation of Delay / Site Impediment'
    notice_type VARCHAR(100) NOT NULL DEFAULT 'delay_notice', -- 'delay_notice', 'eot_application', 'variation_claim', etc.
    notice_period_days INTEGER NOT NULL DEFAULT 14,     -- e.g. 14, 21, 28, 30
    trigger_event TEXT NOT NULL DEFAULT 'Date of occurrence of impediment or cause of delay',
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notice_rules_contract ON public.contract_notice_rules(contract_id);

-- 3. Table: public.contract_correspondence
CREATE TABLE IF NOT EXISTS public.contract_correspondence (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    contract_id UUID REFERENCES public.contracts(id) ON DELETE SET NULL,
    reference_number VARCHAR(100) NOT NULL,               -- e.g. 'COR-2026-0042', 'NOT-2026-0012'
    letter_number VARCHAR(150) NOT NULL,                  -- Official letter dispatch number e.g. 'EE/PWD/R&B/2026/891'
    date DATE NOT NULL DEFAULT CURRENT_DATE,              -- Date written on letter
    direction VARCHAR(20) NOT NULL DEFAULT 'INCOMING' CHECK (direction IN ('INCOMING', 'OUTGOING')),
    category VARCHAR(50) NOT NULL DEFAULT 'CORRESPONDENCE' CHECK (
        category IN ('CORRESPONDENCE', 'SITE_INSTRUCTION', 'NOTICE', 'MINUTES_OF_MEETING', 'ORDER')
    ),
    sender VARCHAR(255) NOT NULL,
    recipient VARCHAR(255) NOT NULL,
    subject TEXT NOT NULL,
    description TEXT,
    
    -- Relational Linking to business records
    related_contract_event_id UUID REFERENCES public.contract_events(id) ON DELETE SET NULL,
    related_hindrance_id UUID REFERENCES public.hindrances(id) ON DELETE SET NULL,
    related_boq_item_id UUID REFERENCES public.boq_items(id) ON DELETE SET NULL,
    related_ra_bill_id UUID REFERENCES public.ra_bills(id) ON DELETE SET NULL,
    related_eot_id UUID REFERENCES public.eot_applications(id) ON DELETE SET NULL,
    related_claim_id VARCHAR(150),
    
    -- Attachment
    attachment_url TEXT,
    attachment_name VARCHAR(255),
    attachment_size_bytes BIGINT DEFAULT 0,
    
    -- Response & Deadline Tracking
    response_required BOOLEAN NOT NULL DEFAULT FALSE,
    response_deadline DATE,
    responded_date DATE,
    responded_reference_id UUID REFERENCES public.contract_correspondence(id) ON DELETE SET NULL,
    
    -- Clause-level Notice Period Arithmetic
    clause_reference VARCHAR(100),                        -- e.g. 'Clause 5 (CPWD GCC)'
    notice_period_days INTEGER,                          -- e.g. 14
    event_date DATE,                                     -- Base date for calculation
    
    -- Status & Dispatch Tracking
    status VARCHAR(50) NOT NULL DEFAULT 'RECEIVED' CHECK (
        status IN ('DRAFT', 'SENT', 'RECEIVED', 'ACKNOWLEDGED', 'RESPONSE_REQUIRED', 'RESPONDED', 'CLOSED')
    ),
    mode_of_dispatch VARCHAR(100),                        -- 'Speed Post with A/D', 'Hand Delivery / SOB', 'Email'
    tracking_consignment_number VARCHAR(100),             -- e.g. 'EK849204918IN'
    notes TEXT,
    
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Performance Indexes
CREATE INDEX IF NOT EXISTS idx_corr_org_project ON public.contract_correspondence(organization_id, project_id);
CREATE INDEX IF NOT EXISTS idx_corr_contract ON public.contract_correspondence(contract_id);
CREATE INDEX IF NOT EXISTS idx_corr_direction ON public.contract_correspondence(direction);
CREATE INDEX IF NOT EXISTS idx_corr_category ON public.contract_correspondence(category);
CREATE INDEX IF NOT EXISTS idx_corr_status ON public.contract_correspondence(status);
CREATE INDEX IF NOT EXISTS idx_corr_date ON public.contract_correspondence(date DESC);
CREATE INDEX IF NOT EXISTS idx_corr_deadline ON public.contract_correspondence(response_deadline);
CREATE INDEX IF NOT EXISTS idx_corr_event ON public.contract_correspondence(related_contract_event_id);
CREATE INDEX IF NOT EXISTS idx_corr_hindrance ON public.contract_correspondence(related_hindrance_id);

-- 4. Auto-defaults Trigger
CREATE OR REPLACE FUNCTION public.set_correspondence_defaults()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = public AS $$
BEGIN
  IF NEW.organization_id IS NULL THEN
    NEW.organization_id := COALESCE(
      (SELECT organization_id FROM public.projects WHERE id = NEW.project_id),
      public.get_user_organization_id(),
      (SELECT organization_id FROM public.user_profiles WHERE id = auth.uid()),
      (SELECT id FROM public.organizations ORDER BY created_at ASC LIMIT 1)
    );
  END IF;

  IF NEW.created_by IS NULL THEN
    NEW.created_by := auth.uid();
  END IF;

  IF NEW.reference_number IS NULL OR NEW.reference_number = '' THEN
    NEW.reference_number := CASE 
      WHEN NEW.category = 'NOTICE' THEN 'NOT-'
      WHEN NEW.category = 'SITE_INSTRUCTION' THEN 'SI-'
      ELSE 'COR-'
    END || TO_CHAR(COALESCE(NEW.date, CURRENT_DATE), 'YYYY') || '-' || SUBSTRING(gen_random_uuid()::text, 1, 5);
  END IF;

  -- Auto-compute response deadline if event_date and notice_period_days are present but deadline not set
  IF NEW.response_deadline IS NULL AND NEW.event_date IS NOT NULL AND NEW.notice_period_days IS NOT NULL THEN
    NEW.response_deadline := NEW.event_date + (NEW.notice_period_days || ' days')::interval;
  END IF;

  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_correspondence_defaults ON public.contract_correspondence;
CREATE TRIGGER trg_set_correspondence_defaults
  BEFORE INSERT OR UPDATE ON public.contract_correspondence
  FOR EACH ROW EXECUTE FUNCTION public.set_correspondence_defaults();

-- 5. Enable RLS
ALTER TABLE public.contract_correspondence ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contract_notice_rules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "correspondence_org_select" ON public.contract_correspondence;
CREATE POLICY "correspondence_org_select" ON public.contract_correspondence
  FOR SELECT USING (
    organization_id = public.get_user_organization_id()
    OR auth.role() = 'authenticated'
  );

DROP POLICY IF EXISTS "correspondence_org_insert" ON public.contract_correspondence;
CREATE POLICY "correspondence_org_insert" ON public.contract_correspondence
  FOR INSERT WITH CHECK (
    organization_id = public.get_user_organization_id()
    OR auth.role() = 'authenticated'
  );

DROP POLICY IF EXISTS "correspondence_org_update" ON public.contract_correspondence;
CREATE POLICY "correspondence_org_update" ON public.contract_correspondence
  FOR UPDATE USING (
    organization_id = public.get_user_organization_id()
    OR auth.role() = 'authenticated'
  );

DROP POLICY IF EXISTS "correspondence_org_delete" ON public.contract_correspondence;
CREATE POLICY "correspondence_org_delete" ON public.contract_correspondence
  FOR DELETE USING (
    organization_id = public.get_user_organization_id()
    OR auth.role() = 'authenticated'
  );

DROP POLICY IF EXISTS "notice_rules_select" ON public.contract_notice_rules;
CREATE POLICY "notice_rules_select" ON public.contract_notice_rules
  FOR SELECT USING (
    organization_id = public.get_user_organization_id()
    OR auth.role() = 'authenticated'
  );

DROP POLICY IF EXISTS "notice_rules_insert" ON public.contract_notice_rules;
CREATE POLICY "notice_rules_insert" ON public.contract_notice_rules
  FOR INSERT WITH CHECK (
    organization_id = public.get_user_organization_id()
    OR auth.role() = 'authenticated'
  );


-- ==============================================================================
-- PART: 058_contract_clause_management.sql
-- ==============================================================================

-- ==============================================================================
-- 058_contract_clause_management.sql
-- PillarPro Enterprise: Contract Clause Management, Obligations & Deadlines
-- 
-- Workflow:
--   Contract -> Contract Documents -> Clauses -> Obligations -> Deadlines
--
-- Features:
--   - Stores contract-specific clauses without hardcoding department rules
--   - Tracks clause categories (EOT, PAYMENT, MEASUREMENT, VARIATION, etc.)
--   - Tracks relevance flags (EOT, Variation, Claim, BG, Retention, LD, Escalation)
--   - AI candidate extractions stored as DRAFT/UNVERIFIED with source document/page refs
--   - Only APPROVED clauses drive automated notice rules & deadline calculations
--   - Tracks contractual obligations, responsible party, trigger events & due dates
-- ==============================================================================

-- 1. Create Clause Category & Status Enums / Constraints
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'clause_category') THEN
    CREATE TYPE clause_category AS ENUM (
      'EOT',
      'PAYMENT',
      'MEASUREMENT',
      'VARIATION',
      'DEVIATION',
      'ESCALATION',
      'LD',
      'SECURITY',
      'BG',
      'RETENTION',
      'INSURANCE',
      'QUALITY',
      'SAFETY',
      'CORRESPONDENCE',
      'DISPUTE',
      'ARBITRATION',
      'OTHER'
    );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'clause_status') THEN
    CREATE TYPE clause_status AS ENUM (
      'DRAFT',
      'UNDER_REVIEW',
      'APPROVED',
      'REJECTED'
    );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'obligation_status') THEN
    CREATE TYPE obligation_status AS ENUM (
      'ACTIVE',
      'COMPLIED',
      'OVERDUE',
      'WAIVED'
    );
  END IF;
END $$;

-- 2. Create Table: public.contract_clauses
CREATE TABLE IF NOT EXISTS public.contract_clauses (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id         UUID NOT NULL DEFAULT public.get_user_organization_id() REFERENCES public.organizations(id) ON DELETE CASCADE,
  contract_id             UUID NOT NULL REFERENCES public.contracts(id) ON DELETE CASCADE,
  document_id             UUID REFERENCES public.contract_documents(id) ON DELETE SET NULL,
  
  -- Clause Identifiers & Text
  clause_number           TEXT NOT NULL,
  clause_title            TEXT NOT NULL,
  clause_text             TEXT NOT NULL,
  category                clause_category NOT NULL DEFAULT 'OTHER',
  
  -- Commercial, Operational & Legal Terms
  notice_period_days      INTEGER CHECK (notice_period_days >= 0),
  payment_requirement     TEXT,
  
  -- Relevance Tags
  eot_relevance           BOOLEAN NOT NULL DEFAULT FALSE,
  variation_relevance     BOOLEAN NOT NULL DEFAULT FALSE,
  claim_relevance         BOOLEAN NOT NULL DEFAULT FALSE,
  bg_relevance            BOOLEAN NOT NULL DEFAULT FALSE,
  retention_relevance     BOOLEAN NOT NULL DEFAULT FALSE,
  ld_relevance            BOOLEAN NOT NULL DEFAULT FALSE,
  escalation_relevance    BOOLEAN NOT NULL DEFAULT FALSE,
  
  -- Verification & Audit Status
  status                  clause_status NOT NULL DEFAULT 'DRAFT',
  
  -- AI Extraction Metadata (Source Provenance)
  is_ai_extracted         BOOLEAN NOT NULL DEFAULT FALSE,
  source_page_ref         TEXT,
  source_document_title   TEXT,
  ai_confidence_score     NUMERIC(3, 2),
  ai_extraction_notes     TEXT,
  
  -- Verification Tracking
  verified_by             UUID REFERENCES auth.users(id),
  verified_at             TIMESTAMPTZ,
  review_notes            TEXT,
  
  -- System Audit
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by              UUID REFERENCES auth.users(id)
);

-- 3. Create Table: public.contract_obligations
CREATE TABLE IF NOT EXISTS public.contract_obligations (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id         UUID NOT NULL DEFAULT public.get_user_organization_id() REFERENCES public.organizations(id) ON DELETE CASCADE,
  contract_id             UUID NOT NULL REFERENCES public.contracts(id) ON DELETE CASCADE,
  clause_id               UUID REFERENCES public.contract_clauses(id) ON DELETE CASCADE,
  
  -- Obligation Description
  title                   TEXT NOT NULL,
  description             TEXT,
  responsible_party       TEXT NOT NULL DEFAULT 'CONTRACTOR' CHECK (responsible_party IN ('CONTRACTOR', 'DEPARTMENT', 'CONSULTANT', 'JOINT')),
  
  -- Temporal Triggers & Deadlines
  obligation_type         TEXT NOT NULL DEFAULT 'EVENT_TRIGGERED' CHECK (obligation_type IN ('ONE_TIME', 'RECURRING', 'MILESTONE_TRIGGERED', 'EVENT_TRIGGERED')),
  trigger_event           TEXT,
  deadline_rule           TEXT,
  due_date                DATE,
  
  -- Status
  status                  obligation_status NOT NULL DEFAULT 'ACTIVE',
  completion_date         DATE,
  remarks                 TEXT,
  
  -- System Audit
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by              UUID REFERENCES auth.users(id)
);

-- 4. Indexes for Rapid Queries
CREATE INDEX IF NOT EXISTS idx_contract_clauses_contract_id ON public.contract_clauses(contract_id);
CREATE INDEX IF NOT EXISTS idx_contract_clauses_document_id ON public.contract_clauses(document_id);
CREATE INDEX IF NOT EXISTS idx_contract_clauses_category ON public.contract_clauses(category);
CREATE INDEX IF NOT EXISTS idx_contract_clauses_status ON public.contract_clauses(status);
CREATE INDEX IF NOT EXISTS idx_contract_clauses_org_id ON public.contract_clauses(organization_id);

CREATE INDEX IF NOT EXISTS idx_contract_obligations_contract_id ON public.contract_obligations(contract_id);
CREATE INDEX IF NOT EXISTS idx_contract_obligations_clause_id ON public.contract_obligations(clause_id);
CREATE INDEX IF NOT EXISTS idx_contract_obligations_status ON public.contract_obligations(status);
CREATE INDEX IF NOT EXISTS idx_contract_obligations_due_date ON public.contract_obligations(due_date);

-- 5. Timestamp update triggers
DROP TRIGGER IF EXISTS trg_contract_clauses_updated_at ON public.contract_clauses;
CREATE TRIGGER trg_contract_clauses_updated_at
  BEFORE UPDATE ON public.contract_clauses
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_contract_obligations_updated_at ON public.contract_obligations;
CREATE TRIGGER trg_contract_obligations_updated_at
  BEFORE UPDATE ON public.contract_obligations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 6. Trigger: Synchronize Approved Clauses with Notice Rules
CREATE OR REPLACE FUNCTION public.sync_approved_clause_to_notice_rules()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'APPROVED' AND NEW.notice_period_days IS NOT NULL AND NEW.notice_period_days > 0 THEN
    -- Prevent duplicate notice rules for the same contract and clause
    IF NOT EXISTS (
      SELECT 1 FROM public.contract_notice_rules
      WHERE contract_id = NEW.contract_id
        AND clause_reference = NEW.clause_number
    ) THEN
      INSERT INTO public.contract_notice_rules (
        organization_id,
        contract_id,
        clause_reference,
        clause_name,
        notice_period_days,
        description,
        trigger_event
      )
      VALUES (
        NEW.organization_id,
        NEW.contract_id,
        NEW.clause_number,
        NEW.clause_title,
        NEW.notice_period_days,
        COALESCE(NEW.clause_text, NEW.clause_title),
        'Contractual clause notice requirement'
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_sync_approved_clause_notice_rules ON public.contract_clauses;
CREATE TRIGGER trg_sync_approved_clause_notice_rules
  AFTER INSERT OR UPDATE OF status, notice_period_days ON public.contract_clauses
  FOR EACH ROW EXECUTE FUNCTION public.sync_approved_clause_to_notice_rules();

-- 7. Enable RLS & Add Organization Scoped Policies
ALTER TABLE public.contract_clauses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contract_obligations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "contract_clauses_org_all" ON public.contract_clauses;
CREATE POLICY "contract_clauses_org_all" ON public.contract_clauses
  FOR ALL
  USING (organization_id = public.get_user_organization_id())
  WITH CHECK (organization_id = public.get_user_organization_id());

DROP POLICY IF EXISTS "contract_obligations_org_all" ON public.contract_obligations;
CREATE POLICY "contract_obligations_org_all" ON public.contract_obligations
  FOR ALL
  USING (organization_id = public.get_user_organization_id())
  WITH CHECK (organization_id = public.get_user_organization_id());


-- ==============================================================================
-- PART: 059_extension_of_time_module.sql
-- ==============================================================================

-- ==============================================================================
-- 059_extension_of_time_module.sql
-- PillarPro Enterprise: Extension of Time (EOT) Module
--
-- Integration:
--   Contract -> Contract Events -> Hindrances -> Evidence -> Correspondence -> Notices
--
-- Rules:
--   - Does NOT create duplicate delay records. References existing events & hindrances.
--   - Factual language: "Potential EOT event", "Days claimed", "Days approved", "Pending decision"
--   - Calculation: Original completion date + approved EOT = revised completion date
-- ==============================================================================

-- 1. Create EOT Status Enum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'eot_case_status') THEN
    CREATE TYPE eot_case_status AS ENUM (
      'DRAFT',
      'PREPARING',
      'SUBMITTED',
      'UNDER_REVIEW',
      'PARTIALLY_APPROVED',
      'APPROVED',
      'REJECTED',
      'CLOSED'
    );
  END IF;
END $$;

-- 2. Create Table: public.contract_eot_cases
CREATE TABLE IF NOT EXISTS public.contract_eot_cases (
  id                            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id               UUID NOT NULL DEFAULT public.get_user_organization_id() REFERENCES public.organizations(id) ON DELETE CASCADE,
  project_id                    UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  contract_id                   UUID REFERENCES public.contracts(id) ON DELETE SET NULL,
  
  -- Case Identification
  eot_reference                 TEXT NOT NULL,                           -- e.g. "EOT/PKG-01/01", "EOT-2026-001"
  cause                         TEXT NOT NULL,                           -- Factual cause summary (neutral)
  
  -- Delay Period Claimed
  start_date                    DATE NOT NULL,
  end_date                      DATE,
  claimed_days                  INT NOT NULL CHECK (claimed_days >= 0),  -- "Days claimed"
  approved_days                 INT NOT NULL DEFAULT 0 CHECK (approved_days >= 0), -- "Days approved"
  pending_days                  INT NOT NULL DEFAULT 0,                  -- "Pending decision" (claimed - approved)
  
  -- Key Dates
  submission_date               DATE NOT NULL DEFAULT CURRENT_DATE,
  department_response_date      DATE,
  current_completion_date       DATE NOT NULL,                           -- Original / Stipulated Date
  revised_completion_date       DATE NOT NULL,                           -- current_completion_date + approved_days
  
  -- Department Sanction Details
  sanction_authority            TEXT,                                    -- e.g. "Superintending Engineer, PWD Circle-I"
  sanction_order_number         TEXT,                                    -- e.g. "SE/PWD/EOT/2026/412"
  
  -- Status & Remarks
  status                        eot_case_status NOT NULL DEFAULT 'DRAFT',
  remarks                       TEXT,
  
  -- Relational Array Links (References existing records without duplication)
  event_ids                     UUID[] DEFAULT '{}',
  hindrance_ids                 UUID[] DEFAULT '{}',
  evidence_ids                  UUID[] DEFAULT '{}',
  correspondence_ids            UUID[] DEFAULT '{}',
  
  -- System Audit
  created_at                    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by                    UUID REFERENCES auth.users(id)
);

-- 3. Junction Tables for Relational Integrity
CREATE TABLE IF NOT EXISTS public.contract_eot_events (
  eot_case_id                   UUID NOT NULL REFERENCES public.contract_eot_cases(id) ON DELETE CASCADE,
  contract_event_id             UUID NOT NULL REFERENCES public.contract_events(id) ON DELETE CASCADE,
  PRIMARY KEY (eot_case_id, contract_event_id)
);

CREATE TABLE IF NOT EXISTS public.contract_eot_hindrances (
  eot_case_id                   UUID NOT NULL REFERENCES public.contract_eot_cases(id) ON DELETE CASCADE,
  hindrance_id                  UUID NOT NULL REFERENCES public.hindrances(id) ON DELETE CASCADE,
  PRIMARY KEY (eot_case_id, hindrance_id)
);

CREATE TABLE IF NOT EXISTS public.contract_eot_evidence (
  eot_case_id                   UUID NOT NULL REFERENCES public.contract_eot_cases(id) ON DELETE CASCADE,
  evidence_id                   UUID NOT NULL REFERENCES public.evidence_vault(id) ON DELETE CASCADE,
  PRIMARY KEY (eot_case_id, evidence_id)
);

CREATE TABLE IF NOT EXISTS public.contract_eot_correspondence (
  eot_case_id                   UUID NOT NULL REFERENCES public.contract_eot_cases(id) ON DELETE CASCADE,
  correspondence_id             UUID NOT NULL REFERENCES public.contract_correspondence(id) ON DELETE CASCADE,
  PRIMARY KEY (eot_case_id, correspondence_id)
);

-- 4. Indexes
CREATE INDEX IF NOT EXISTS idx_contract_eot_cases_project_id ON public.contract_eot_cases(project_id);
CREATE INDEX IF NOT EXISTS idx_contract_eot_cases_contract_id ON public.contract_eot_cases(contract_id);
CREATE INDEX IF NOT EXISTS idx_contract_eot_cases_status ON public.contract_eot_cases(status);
CREATE INDEX IF NOT EXISTS idx_contract_eot_cases_org_id ON public.contract_eot_cases(organization_id);

-- 5. Trigger: Automated Calculation of Revised Completion Date and Pending Days
-- Formula: revised_completion_date = current_completion_date + approved_days
-- Formula: pending_days = GREATEST(0, claimed_days - approved_days)
CREATE OR REPLACE FUNCTION public.calculate_eot_dates_and_days()
RETURNS TRIGGER AS $$
BEGIN
  -- Calculate pending days
  IF NEW.status = 'REJECTED' OR NEW.status = 'CLOSED' THEN
    NEW.pending_days := 0;
  ELSE
    NEW.pending_days := GREATEST(0, NEW.claimed_days - COALESCE(NEW.approved_days, 0));
  END IF;

  -- Calculate revised completion date: current_completion_date + approved_days
  IF NEW.approved_days > 0 THEN
    NEW.revised_completion_date := NEW.current_completion_date + (NEW.approved_days || ' days')::INTERVAL;
  ELSE
    NEW.revised_completion_date := NEW.current_completion_date;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_calculate_eot_dates ON public.contract_eot_cases;
CREATE TRIGGER trg_calculate_eot_dates
  BEFORE INSERT OR UPDATE OF current_completion_date, claimed_days, approved_days, status
  ON public.contract_eot_cases
  FOR EACH ROW EXECUTE FUNCTION public.calculate_eot_dates_and_days();

DROP TRIGGER IF EXISTS trg_contract_eot_cases_updated_at ON public.contract_eot_cases;
CREATE TRIGGER trg_contract_eot_cases_updated_at
  BEFORE UPDATE ON public.contract_eot_cases
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 6. Row Level Security
ALTER TABLE public.contract_eot_cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contract_eot_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contract_eot_hindrances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contract_eot_evidence ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contract_eot_correspondence ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "contract_eot_cases_org_all" ON public.contract_eot_cases;
CREATE POLICY "contract_eot_cases_org_all" ON public.contract_eot_cases
  FOR ALL
  USING (organization_id = public.get_user_organization_id())
  WITH CHECK (organization_id = public.get_user_organization_id());

DROP POLICY IF EXISTS "contract_eot_events_all" ON public.contract_eot_events;
CREATE POLICY "contract_eot_events_all" ON public.contract_eot_events
  FOR ALL
  USING (EXISTS (SELECT 1 FROM public.contract_eot_cases c WHERE c.id = contract_eot_events.eot_case_id AND c.organization_id = public.get_user_organization_id()));

DROP POLICY IF EXISTS "contract_eot_hindrances_all" ON public.contract_eot_hindrances;
CREATE POLICY "contract_eot_hindrances_all" ON public.contract_eot_hindrances
  FOR ALL
  USING (EXISTS (SELECT 1 FROM public.contract_eot_cases c WHERE c.id = contract_eot_hindrances.eot_case_id AND c.organization_id = public.get_user_organization_id()));

DROP POLICY IF EXISTS "contract_eot_evidence_all" ON public.contract_eot_evidence;
CREATE POLICY "contract_eot_evidence_all" ON public.contract_eot_evidence
  FOR ALL
  USING (EXISTS (SELECT 1 FROM public.contract_eot_cases c WHERE c.id = contract_eot_evidence.eot_case_id AND c.organization_id = public.get_user_organization_id()));

DROP POLICY IF EXISTS "contract_eot_correspondence_all" ON public.contract_eot_correspondence;
CREATE POLICY "contract_eot_correspondence_all" ON public.contract_eot_correspondence
  FOR ALL
  USING (EXISTS (SELECT 1 FROM public.contract_eot_cases c WHERE c.id = contract_eot_correspondence.eot_case_id AND c.organization_id = public.get_user_organization_id()));


-- ==============================================================================
-- PART: 060_contract_variations_module.sql
-- ==============================================================================

-- ==============================================================================
-- 060_contract_variations_module.sql
-- PillarPro Enterprise: Variations, Deviations, Extra Items & Substituted Items
-- Designed for CPWD, State PWD, NHAI, MoRTH, MES, Railways, and PSU Contracts
--
-- Rules:
-- 1. Does NOT modify the original BOQ tender quantities directly.
-- 2. Strictly separates: Original, Proposed, Approved, Executed, Billed, Paid.
-- 3. Contract Value Formula:
--    Original Contract Value + Approved Variations + Approved Extra Items - Deleted Work = Current Contract Value
-- 4. Proposed/unapproved variations are NEVER added to the official Current Contract Value.
-- ==============================================================================

-- 1. Create Variation Types and Statuses Enum / Checks
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'contract_variation_type') THEN
    CREATE TYPE contract_variation_type AS ENUM (
      'DEVIATION',
      'VARIATION',
      'EXTRA_ITEM',
      'SUBSTITUTED_ITEM'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'contract_variation_status') THEN
    CREATE TYPE contract_variation_status AS ENUM (
      'PROPOSED',
      'UNDER_APPROVAL',
      'APPROVED',
      'REJECTED',
      'EXECUTED',
      'BILLED',
      'CLOSED'
    );
  END IF;
END $$;

-- 2. Create Table: public.contract_variations
CREATE TABLE IF NOT EXISTS public.contract_variations (
  id                            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id               UUID NOT NULL DEFAULT public.get_user_organization_id() REFERENCES public.organizations(id) ON DELETE CASCADE,
  project_id                    UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  contract_id                   UUID REFERENCES public.contracts(id) ON DELETE SET NULL,

  -- Identification
  reference_number              TEXT NOT NULL,                           -- e.g. "VO/PKG-01/001", "DEV-2026-01"
  type                          contract_variation_type NOT NULL,        -- DEVIATION, VARIATION, EXTRA_ITEM, SUBSTITUTED_ITEM

  -- Instruction & Authorization
  instruction_date              DATE NOT NULL,
  instruction_authority         TEXT NOT NULL,                           -- e.g. "Executive Engineer, CPWD", "Superintending Engineer"

  -- BOQ Item Linking (Original item being varied/substituted or NULL for new extra items)
  original_boq_item_id          UUID REFERENCES public.boq_items(id) ON DELETE SET NULL,
  proposed_item_code            TEXT,                                    -- DSR Item No. / Code / Sub-item
  proposed_item_description     TEXT NOT NULL,                           -- Detailed description
  proposed_unit                 TEXT NOT NULL,                           -- Unit of measurement

  -- Quantities & Differences
  original_quantity             NUMERIC(16, 3) NOT NULL DEFAULT 0,       -- Tender baseline quantity
  proposed_quantity             NUMERIC(16, 3) NOT NULL DEFAULT 0,       -- Proposed total quantity
  difference_quantity           NUMERIC(16, 3) NOT NULL DEFAULT 0,       -- proposed_quantity - original_quantity (+/-)

  -- Rates & Financial Amounts
  original_rate                 NUMERIC(14, 2) NOT NULL DEFAULT 0,       -- Original BOQ rate
  proposed_rate                 NUMERIC(14, 2) NOT NULL DEFAULT 0,       -- Analyzed / Tender rate
  proposed_amount               NUMERIC(16, 2) NOT NULL DEFAULT 0,       -- Projected financial value

  -- Deletion / Reduction Flag
  is_deletion                   BOOLEAN NOT NULL DEFAULT FALSE,
  deleted_work_amount           NUMERIC(16, 2) NOT NULL DEFAULT 0,

  -- Justification & Documentation
  reason                        TEXT NOT NULL,
  supporting_document_url       TEXT,
  evidence_vault_id             UUID REFERENCES public.evidence_vault(id) ON DELETE SET NULL,
  site_instruction_reference   TEXT,
  correspondence_id             UUID REFERENCES public.contract_correspondence(id) ON DELETE SET NULL,

  -- Formal Sanction / Approval
  status                        contract_variation_status NOT NULL DEFAULT 'PROPOSED',
  approval_date                 DATE,
  approved_authority            TEXT,
  approved_order_number         TEXT,                                    -- Variation Order No.
  approved_quantity             NUMERIC(16, 3) DEFAULT 0,
  approved_rate                 NUMERIC(14, 2) DEFAULT 0,
  approved_amount               NUMERIC(16, 2) DEFAULT 0,                -- Official Sanctioned Amount

  -- Execution & Billing Realization (e-MB and RA Bills)
  executed_quantity             NUMERIC(16, 3) DEFAULT 0,
  billed_quantity               NUMERIC(16, 3) DEFAULT 0,
  paid_amount                   NUMERIC(16, 2) DEFAULT 0,

  -- Relational Array Links
  related_measurement_ids       UUID[] DEFAULT '{}',
  related_ra_bill_ids           UUID[] DEFAULT '{}',
  remarks                       TEXT,

  -- Audit Fields
  created_at                    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by                    UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- 3. Junction Tables for Measurement and RA Bill Traceability
CREATE TABLE IF NOT EXISTS public.contract_variation_measurements (
  variation_id                  UUID NOT NULL REFERENCES public.contract_variations(id) ON DELETE CASCADE,
  measurement_entry_id          UUID NOT NULL REFERENCES public.measurement_entries(id) ON DELETE CASCADE,
  PRIMARY KEY (variation_id, measurement_entry_id)
);

CREATE TABLE IF NOT EXISTS public.contract_variation_ra_bills (
  variation_id                  UUID NOT NULL REFERENCES public.contract_variations(id) ON DELETE CASCADE,
  ra_bill_id                    UUID NOT NULL REFERENCES public.ra_bills(id) ON DELETE CASCADE,
  PRIMARY KEY (variation_id, ra_bill_id)
);

-- 4. Extend measurement_entries and ra_bill_items with variation_id for direct lookup
ALTER TABLE public.measurement_entries
  ADD COLUMN IF NOT EXISTS variation_id UUID REFERENCES public.contract_variations(id) ON DELETE SET NULL;

ALTER TABLE public.ra_bill_items
  ADD COLUMN IF NOT EXISTS variation_id UUID REFERENCES public.contract_variations(id) ON DELETE SET NULL;

-- 5. Indexes
CREATE INDEX IF NOT EXISTS idx_contract_variations_project_id ON public.contract_variations(project_id);
CREATE INDEX IF NOT EXISTS idx_contract_variations_contract_id ON public.contract_variations(contract_id);
CREATE INDEX IF NOT EXISTS idx_contract_variations_boq_item ON public.contract_variations(original_boq_item_id);
CREATE INDEX IF NOT EXISTS idx_contract_variations_status ON public.contract_variations(status);
CREATE INDEX IF NOT EXISTS idx_contract_variations_type ON public.contract_variations(type);
CREATE INDEX IF NOT EXISTS idx_contract_variations_org ON public.contract_variations(organization_id);

CREATE INDEX IF NOT EXISTS idx_me_variation_id ON public.measurement_entries(variation_id);
CREATE INDEX IF NOT EXISTS idx_rbi_variation_id ON public.ra_bill_items(variation_id);

-- 6. Trigger: Automated Calculations for Difference Quantity and Approved Amounts
CREATE OR REPLACE FUNCTION public.calculate_variation_values()
RETURNS TRIGGER AS $$
BEGIN
  -- Difference quantity = proposed - original
  NEW.difference_quantity := NEW.proposed_quantity - COALESCE(NEW.original_quantity, 0);

  -- Identify deletion
  IF NEW.difference_quantity < 0 THEN
    NEW.is_deletion := TRUE;
    NEW.deleted_work_amount := ABS(NEW.difference_quantity) * COALESCE(NEW.proposed_rate, NEW.original_rate, 0);
  ELSE
    NEW.is_deletion := FALSE;
    NEW.deleted_work_amount := 0;
  END IF;

  -- Default proposed_amount
  IF NEW.proposed_amount = 0 OR NEW.proposed_amount IS NULL THEN
    IF NEW.type = 'EXTRA_ITEM' THEN
      NEW.proposed_amount := NEW.proposed_quantity * NEW.proposed_rate;
    ELSE
      NEW.proposed_amount := NEW.difference_quantity * NEW.proposed_rate;
    END IF;
  END IF;

  -- If status is APPROVED / EXECUTED / BILLED and approved_amount not set, default it
  IF NEW.status IN ('APPROVED', 'EXECUTED', 'BILLED', 'CLOSED') THEN
    IF NEW.approved_quantity IS NULL OR NEW.approved_quantity = 0 THEN
      NEW.approved_quantity := NEW.proposed_quantity;
    END IF;
    IF NEW.approved_rate IS NULL OR NEW.approved_rate = 0 THEN
      NEW.approved_rate := NEW.proposed_rate;
    END IF;
    IF NEW.approved_amount IS NULL OR NEW.approved_amount = 0 THEN
      IF NEW.type = 'EXTRA_ITEM' THEN
        NEW.approved_amount := NEW.approved_quantity * NEW.approved_rate;
      ELSE
        NEW.approved_amount := (NEW.approved_quantity - NEW.original_quantity) * NEW.approved_rate;
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_calculate_variation_values ON public.contract_variations;
CREATE TRIGGER trg_calculate_variation_values
  BEFORE INSERT OR UPDATE OF proposed_quantity, original_quantity, proposed_rate, original_rate, status, approved_quantity, approved_rate
  ON public.contract_variations
  FOR EACH ROW EXECUTE FUNCTION public.calculate_variation_values();

DROP TRIGGER IF EXISTS trg_contract_variations_updated_at ON public.contract_variations;
CREATE TRIGGER trg_contract_variations_updated_at
  BEFORE UPDATE ON public.contract_variations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 7. Row Level Security
ALTER TABLE public.contract_variations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contract_variation_measurements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contract_variation_ra_bills ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "contract_variations_org_all" ON public.contract_variations;
CREATE POLICY "contract_variations_org_all" ON public.contract_variations
  FOR ALL
  USING (organization_id = public.get_user_organization_id())
  WITH CHECK (organization_id = public.get_user_organization_id());

DROP POLICY IF EXISTS "contract_var_measurements_org_all" ON public.contract_variation_measurements;
CREATE POLICY "contract_var_measurements_org_all" ON public.contract_variation_measurements
  FOR ALL
  USING (EXISTS (SELECT 1 FROM public.contract_variations cv WHERE cv.id = contract_variation_measurements.variation_id AND cv.organization_id = public.get_user_organization_id()));

DROP POLICY IF EXISTS "contract_var_ra_bills_org_all" ON public.contract_variation_ra_bills;
CREATE POLICY "contract_var_ra_bills_org_all" ON public.contract_variation_ra_bills
  FOR ALL
  USING (EXISTS (SELECT 1 FROM public.contract_variations cv WHERE cv.id = contract_variation_ra_bills.variation_id AND cv.organization_id = public.get_user_organization_id()));


-- ==============================================================================
-- PART: 061_contract_claims_module.sql
-- ==============================================================================

-- ==============================================================================
-- 061_contract_claims_module.sql
-- PillarPro Enterprise: Contractual Claims, Disputes & Prolongation Damages
-- Designed for CPWD, State PWD, NHAI, MoRTH, MES, Railways, and Arbitration Tribunals
--
-- Rules:
-- 1. Claims MUST be based on existing contemporaneous site records (Events, Hindrances,
--    EOT, Correspondence, Notices, Evidence, Measurement, BOQ, Labour, Machinery, Expenses).
-- 2. Never label a claim as "recoverable" merely because it has been entered.
-- 3. Always maintain strict separation: Claimed, Approved, Paid, Outstanding.
-- ==============================================================================

-- 1. Create Claims Type and Status Enums
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'contract_claim_type') THEN
    CREATE TYPE contract_claim_type AS ENUM (
      'DELAY_RELATED',
      'PROLONGATION',
      'IDLE_LABOUR',
      'IDLE_MACHINERY',
      'ADDITIONAL_MATERIAL',
      'ADDITIONAL_TRANSPORTATION',
      'VARIATION',
      'ESCALATION',
      'PAYMENT_RELATED',
      'OTHER'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'contract_claim_status') THEN
    CREATE TYPE contract_claim_status AS ENUM (
      'DRAFT',
      'PREPARING',
      'SUBMITTED',
      'UNDER_REVIEW',
      'PARTIALLY_APPROVED',
      'APPROVED',
      'REJECTED',
      'PAID',
      'CLOSED'
    );
  END IF;
END $$;

-- 2. Create Table: public.contract_claims
CREATE TABLE IF NOT EXISTS public.contract_claims (
  id                            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id               UUID NOT NULL DEFAULT public.get_user_organization_id() REFERENCES public.organizations(id) ON DELETE CASCADE,
  project_id                    UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  contract_id                   UUID REFERENCES public.contracts(id) ON DELETE SET NULL,

  -- Identification
  claim_number                  TEXT NOT NULL,                           -- e.g. "CLM/PKG-01/001", "CLM-2026-01"
  claim_type                    contract_claim_type NOT NULL,
  title                         TEXT NOT NULL,                           -- Head of Claim summary
  claim_date                    DATE NOT NULL DEFAULT CURRENT_DATE,

  -- Factual Description & Legal Basis
  description                   TEXT NOT NULL,                           -- Factual contemporaneous narrative
  basis_of_claim                TEXT,                                    -- Clause references (e.g. "GCC Clause 10CC / Clause 2")

  -- Financial Breakdown (Strictly Claimed until Approved)
  claimed_amount                NUMERIC(16, 2) NOT NULL CHECK (claimed_amount >= 0),
  approved_amount               NUMERIC(16, 2) NOT NULL DEFAULT 0 CHECK (approved_amount >= 0),
  paid_amount                   NUMERIC(16, 2) NOT NULL DEFAULT 0 CHECK (paid_amount >= 0),
  outstanding_amount            NUMERIC(16, 2) NOT NULL DEFAULT 0,

  -- Status & Adjudication Tracking
  status                        contract_claim_status NOT NULL DEFAULT 'DRAFT',
  submission_date               DATE,
  adjudication_date             DATE,
  adjudication_authority        TEXT,                                    -- e.g. "Dispute Resolution Board / Arbitrator / SE"
  order_reference_number        TEXT,                                    -- Award / Sanction Order No.
  remarks                       TEXT,

  -- Relational Links to Existing Records (Without Duplication)
  event_ids                     UUID[] DEFAULT '{}',                     -- Linked contract_events
  hindrance_ids                 UUID[] DEFAULT '{}',                     -- Linked hindrances
  eot_case_ids                  UUID[] DEFAULT '{}',                     -- Linked contract_eot_cases
  evidence_ids                  UUID[] DEFAULT '{}',                     -- Linked evidence_vault
  correspondence_ids            UUID[] DEFAULT '{}',                     -- Linked contract_correspondence
  boq_item_ids                  UUID[] DEFAULT '{}',                     -- Linked boq_items
  measurement_ids               UUID[] DEFAULT '{}',                     -- Linked measurement_entries
  ra_bill_ids                   UUID[] DEFAULT '{}',                     -- Linked ra_bills
  labour_record_ids             UUID[] DEFAULT '{}',                     -- Linked worker attendance/labour logs
  machinery_log_ids             UUID[] DEFAULT '{}',                     -- Linked machinery usage/idle logs
  expense_ids                   UUID[] DEFAULT '{}',                     -- Linked financial expenses

  -- System Audit
  created_at                    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by                    UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- 3. Junction Tables for Relational Integrity
CREATE TABLE IF NOT EXISTS public.contract_claim_events (
  claim_id                      UUID NOT NULL REFERENCES public.contract_claims(id) ON DELETE CASCADE,
  contract_event_id             UUID NOT NULL REFERENCES public.contract_events(id) ON DELETE CASCADE,
  PRIMARY KEY (claim_id, contract_event_id)
);

CREATE TABLE IF NOT EXISTS public.contract_claim_hindrances (
  claim_id                      UUID NOT NULL REFERENCES public.contract_claims(id) ON DELETE CASCADE,
  hindrance_id                  UUID NOT NULL REFERENCES public.hindrances(id) ON DELETE CASCADE,
  PRIMARY KEY (claim_id, hindrance_id)
);

CREATE TABLE IF NOT EXISTS public.contract_claim_evidence (
  claim_id                      UUID NOT NULL REFERENCES public.contract_claims(id) ON DELETE CASCADE,
  evidence_id                   UUID NOT NULL REFERENCES public.evidence_vault(id) ON DELETE CASCADE,
  PRIMARY KEY (claim_id, evidence_id)
);

CREATE TABLE IF NOT EXISTS public.contract_claim_correspondence (
  claim_id                      UUID NOT NULL REFERENCES public.contract_claims(id) ON DELETE CASCADE,
  correspondence_id             UUID NOT NULL REFERENCES public.contract_correspondence(id) ON DELETE CASCADE,
  PRIMARY KEY (claim_id, correspondence_id)
);

-- 4. Indexes
CREATE INDEX IF NOT EXISTS idx_contract_claims_project ON public.contract_claims(project_id);
CREATE INDEX IF NOT EXISTS idx_contract_claims_contract ON public.contract_claims(contract_id);
CREATE INDEX IF NOT EXISTS idx_contract_claims_status ON public.contract_claims(status);
CREATE INDEX IF NOT EXISTS idx_contract_claims_type ON public.contract_claims(claim_type);
CREATE INDEX IF NOT EXISTS idx_contract_claims_org ON public.contract_claims(organization_id);

-- 5. Trigger: Automated Calculation of Outstanding Amount
CREATE OR REPLACE FUNCTION public.calculate_claim_financials()
RETURNS TRIGGER AS $$
BEGIN
  -- If Approved or Partially Approved, outstanding is Approved - Paid
  IF NEW.status IN ('APPROVED', 'PARTIALLY_APPROVED') THEN
    NEW.outstanding_amount := GREATEST(0, COALESCE(NEW.approved_amount, 0) - COALESCE(NEW.paid_amount, 0));
  -- If Rejected or Closed, outstanding is 0
  ELSIF NEW.status IN ('REJECTED', 'CLOSED') THEN
    NEW.outstanding_amount := 0;
  -- For Draft / Preparing / Submitted / Under Review, outstanding is Claimed - Paid
  ELSE
    NEW.outstanding_amount := GREATEST(0, COALESCE(NEW.claimed_amount, 0) - COALESCE(NEW.paid_amount, 0));
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_calculate_claim_financials ON public.contract_claims;
CREATE TRIGGER trg_calculate_claim_financials
  BEFORE INSERT OR UPDATE OF claimed_amount, approved_amount, paid_amount, status
  ON public.contract_claims
  FOR EACH ROW EXECUTE FUNCTION public.calculate_claim_financials();

DROP TRIGGER IF EXISTS trg_contract_claims_updated_at ON public.contract_claims;
CREATE TRIGGER trg_contract_claims_updated_at
  BEFORE UPDATE ON public.contract_claims
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 6. Row Level Security
ALTER TABLE public.contract_claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contract_claim_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contract_claim_hindrances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contract_claim_evidence ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contract_claim_correspondence ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "contract_claims_org_all" ON public.contract_claims;
CREATE POLICY "contract_claims_org_all" ON public.contract_claims
  FOR ALL
  USING (organization_id = public.get_user_organization_id())
  WITH CHECK (organization_id = public.get_user_organization_id());

DROP POLICY IF EXISTS "contract_claim_events_org_all" ON public.contract_claim_events;
CREATE POLICY "contract_claim_events_org_all" ON public.contract_claim_events
  FOR ALL
  USING (EXISTS (SELECT 1 FROM public.contract_claims cc WHERE cc.id = contract_claim_events.claim_id AND cc.organization_id = public.get_user_organization_id()));

DROP POLICY IF EXISTS "contract_claim_hindrances_org_all" ON public.contract_claim_hindrances;
CREATE POLICY "contract_claim_hindrances_org_all" ON public.contract_claim_hindrances
  FOR ALL
  USING (EXISTS (SELECT 1 FROM public.contract_claims cc WHERE cc.id = contract_claim_hindrances.claim_id AND cc.organization_id = public.get_user_organization_id()));

DROP POLICY IF EXISTS "contract_claim_evidence_org_all" ON public.contract_claim_evidence;
CREATE POLICY "contract_claim_evidence_org_all" ON public.contract_claim_evidence
  FOR ALL
  USING (EXISTS (SELECT 1 FROM public.contract_claims cc WHERE cc.id = contract_claim_evidence.claim_id AND cc.organization_id = public.get_user_organization_id()));

DROP POLICY IF EXISTS "contract_claim_corr_org_all" ON public.contract_claim_correspondence;
CREATE POLICY "contract_claim_corr_org_all" ON public.contract_claim_correspondence
  FOR ALL
  USING (EXISTS (SELECT 1 FROM public.contract_claims cc WHERE cc.id = contract_claim_correspondence.claim_id AND cc.organization_id = public.get_user_organization_id()));


-- ==============================================================================
-- PART: 062_rbac_and_immutable_audit_trail.sql
-- ==============================================================================

-- ==============================================================================
-- 062_rbac_and_immutable_audit_trail.sql
-- PillarPro Enterprise: Role-Based Access Control (RBAC) & Immutable Audit Trail
-- Designed for Indian Government Contractors (CPWD, State PWD, NHAI, MES, Railways)
--
-- 1. Expands public.user_role enum to support the 10 standard contractor roles:
--    OWNER, PARTNER, PROJECT MANAGER, SITE ENGINEER, BILLING ENGINEER,
--    ACCOUNTANT, STORE MANAGER, SITE SUPERVISOR, DATA ENTRY, VIEWER.
-- 2. Creates public.audit_logs table with strict cryptographic/trigger immutability.
-- 3. Implements automated triggers for critical actions:
--    - Measurement certified
--    - Measurement corrected
--    - BOQ quantity changed
--    - Variation approved
--    - RA Bill submitted
--    - Payment recorded
--    - Claim submitted
--    - Contract date changed
-- 4. Enforces protections against unauthorized certification and altering billed records.
-- ==============================================================================

-- 1. Expand public.user_role Enum safely
DO $$ BEGIN
  ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'project_manager';
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'site_engineer';
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'billing_engineer';
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'store_manager';
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'data_entry';
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 2. Update join_organization to accept all new roles
CREATE OR REPLACE FUNCTION public.join_organization(
  p_join_code TEXT,
  p_display_name TEXT,
  p_role TEXT DEFAULT 'site_supervisor'
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_user_email TEXT;
  v_org_id UUID;
  v_org_name TEXT;
  v_code_clean TEXT;
  v_role_assigned TEXT;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated.';
  END IF;

  SELECT email INTO v_user_email FROM auth.users WHERE id = v_user_id;

  v_code_clean := UPPER(TRIM(COALESCE(p_join_code, '')));
  IF v_code_clean = '' THEN
    RAISE EXCEPTION 'Invite code cannot be empty.';
  END IF;

  -- Look up target organization
  SELECT id, name INTO v_org_id, v_org_name
  FROM public.organizations
  WHERE UPPER(join_code) = v_code_clean;

  IF v_org_id IS NULL THEN
    RAISE EXCEPTION 'Invalid invite code. Please check with your firm administrator.';
  END IF;

  -- Normalize role (disallow joining directly as owner)
  v_role_assigned := LOWER(TRIM(COALESCE(p_role, 'site_supervisor')));
  IF v_role_assigned NOT IN (
    'partner', 'managing_partner', 'project_manager', 'site_engineer',
    'billing_engineer', 'accountant', 'store_manager', 'site_supervisor',
    'data_entry', 'viewer'
  ) THEN
    v_role_assigned := 'site_supervisor';
  END IF;

  -- Update or insert user profile
  INSERT INTO public.user_profiles (
    id, email, display_name, status, organization_id, created_at, updated_at
  )
  VALUES (
    v_user_id,
    v_user_email,
    COALESCE(NULLIF(TRIM(p_display_name), ''), 'Staff Member'),
    'active',
    v_org_id,
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    organization_id = v_org_id,
    display_name = COALESCE(NULLIF(TRIM(p_display_name), ''), public.user_profiles.display_name),
    status = 'active',
    updated_at = NOW();

  -- Assign role in firm with explicit cast to public.user_role
  INSERT INTO public.roles (
    user_id, role, project_id, created_at
  )
  VALUES (
    v_user_id,
    v_role_assigned::public.user_role,
    NULL,
    NOW()
  )
  ON CONFLICT (user_id) DO UPDATE SET
    role = v_role_assigned::public.user_role;

  RETURN json_build_object(
    'success', true,
    'organization_id', v_org_id,
    'organization_name', v_org_name,
    'role', v_role_assigned
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.join_organization(TEXT, TEXT, TEXT) TO authenticated, service_role;

-- 3. Create Immutable Audit Logs Table
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id     UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  project_id          UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  user_id             UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  user_email          TEXT,
  user_name           TEXT,
  user_role           TEXT,
  action              TEXT NOT NULL,
  entity_type         TEXT NOT NULL,
  entity_id           TEXT NOT NULL,
  entity_identifier   TEXT,
  previous_values     JSONB DEFAULT '{}'::jsonb,
  new_values          JSONB DEFAULT '{}'::jsonb,
  diff_summary        JSONB DEFAULT '{}'::jsonb,
  notes               TEXT,
  ip_address          TEXT,
  user_agent          TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Performance Indices
CREATE INDEX IF NOT EXISTS idx_audit_logs_org_created ON public.audit_logs(organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_project     ON public.audit_logs(project_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity      ON public.audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action      ON public.audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user        ON public.audit_logs(user_id);

-- 4. Strict Immutability Enforcement (No Updates or Deletions Allowed)
CREATE OR REPLACE FUNCTION public.prevent_audit_log_tampering()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RAISE EXCEPTION 'Audit trail records are strictly immutable and cannot be modified or deleted.';
END;
$$;

DROP TRIGGER IF EXISTS trg_audit_logs_immutable ON public.audit_logs;
CREATE TRIGGER trg_audit_logs_immutable
  BEFORE UPDATE OR DELETE ON public.audit_logs
  FOR EACH ROW EXECUTE FUNCTION public.prevent_audit_log_tampering();

-- RLS on audit_logs
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "audit_logs_select" ON public.audit_logs;
CREATE POLICY "audit_logs_select" ON public.audit_logs
  FOR SELECT TO authenticated
  USING (organization_id = public.get_user_organization_id());

DROP POLICY IF EXISTS "audit_logs_insert" ON public.audit_logs;
CREATE POLICY "audit_logs_insert" ON public.audit_logs
  FOR INSERT TO authenticated
  WITH CHECK (
    COALESCE(organization_id, public.get_user_organization_id()) = public.get_user_organization_id()
  );

-- 5. Helper Function to Resolve Actor Details for Audit Trigger
CREATE OR REPLACE FUNCTION public.get_audit_actor()
RETURNS TABLE (
  actor_id UUID,
  actor_email TEXT,
  actor_name TEXT,
  actor_role TEXT,
  actor_org_id UUID
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RETURN QUERY SELECT
      NULL::UUID,
      'system'::TEXT,
      'System Automation'::TEXT,
      'system'::TEXT,
      public.get_user_organization_id();
  ELSE
    RETURN QUERY
    SELECT
      v_uid,
      COALESCE(p.email, u.email, 'unknown@contractor.in')::TEXT,
      COALESCE(p.display_name, 'Staff Member')::TEXT,
      COALESCE(r.role::TEXT, 'staff')::TEXT,
      COALESCE(p.organization_id, public.get_user_organization_id())
    FROM auth.users u
    LEFT JOIN public.user_profiles p ON p.id = u.id
    LEFT JOIN public.roles r ON r.user_id = u.id
    WHERE u.id = v_uid;
  END IF;
END;
$$;

-- 6. AUTOMATED AUDIT TRIGGER 1: Measurement Certified & Corrected
CREATE OR REPLACE FUNCTION public.trg_audit_measurement_entries()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor RECORD;
  v_item_code TEXT;
BEGIN
  SELECT * INTO v_actor FROM public.get_audit_actor();
  SELECT item_number INTO v_item_code FROM public.boq_items WHERE id = NEW.boq_item_id;

  -- 1. Measurement Certified
  IF NEW.status = 'CERTIFIED' AND (OLD.status IS NULL OR OLD.status != 'CERTIFIED') THEN
    INSERT INTO public.audit_logs (
      organization_id, project_id, user_id, user_email, user_name, user_role,
      action, entity_type, entity_id, entity_identifier,
      previous_values, new_values, diff_summary, notes
    ) VALUES (
      NEW.organization_id,
      NEW.project_id,
      v_actor.actor_id,
      v_actor.actor_email,
      v_actor.actor_name,
      v_actor.actor_role,
      'MEASUREMENT_CERTIFIED',
      'measurement_entries',
      NEW.id::TEXT,
      'e-MB Entry #' || NEW.entry_number || COALESCE(' (' || v_item_code || ')', ''),
      json_build_object('status', OLD.status, 'calculated_quantity', OLD.calculated_quantity),
      json_build_object('status', NEW.status, 'calculated_quantity', NEW.calculated_quantity, 'certified_by', NEW.certified_by),
      json_build_object('status_change', OLD.status || ' -> ' || NEW.status, 'certified_qty', NEW.calculated_quantity),
      'Measurement entry verified and certified for official billing.'
    );
  END IF;

  -- 2. Measurement Corrected (Quantity modified on existing record)
  IF OLD.calculated_quantity IS DISTINCT FROM NEW.calculated_quantity AND OLD.status != 'DRAFT' THEN
    INSERT INTO public.audit_logs (
      organization_id, project_id, user_id, user_email, user_name, user_role,
      action, entity_type, entity_id, entity_identifier,
      previous_values, new_values, diff_summary, notes
    ) VALUES (
      NEW.organization_id,
      NEW.project_id,
      v_actor.actor_id,
      v_actor.actor_email,
      v_actor.actor_name,
      v_actor.actor_role,
      'MEASUREMENT_CORRECTED',
      'measurement_entries',
      NEW.id::TEXT,
      'e-MB Entry #' || NEW.entry_number,
      json_build_object('calculated_quantity', OLD.calculated_quantity, 'length', OLD.length, 'breadth', OLD.breadth, 'depth_height', OLD.depth_height),
      json_build_object('calculated_quantity', NEW.calculated_quantity, 'length', NEW.length, 'breadth', NEW.breadth, 'depth_height', NEW.depth_height),
      json_build_object('quantity_delta', (NEW.calculated_quantity - OLD.calculated_quantity), 'from_qty', OLD.calculated_quantity, 'to_qty', NEW.calculated_quantity),
      'Calculated measurement dimensions corrected.'
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_audit_measurements ON public.measurement_entries;
CREATE TRIGGER trg_audit_measurements
  AFTER UPDATE ON public.measurement_entries
  FOR EACH ROW EXECUTE FUNCTION public.trg_audit_measurement_entries();

-- 7. AUTOMATED AUDIT TRIGGER 2: BOQ Quantity Changed
CREATE OR REPLACE FUNCTION public.trg_audit_boq_items()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor RECORD;
BEGIN
  SELECT * INTO v_actor FROM public.get_audit_actor();

  IF (OLD.quantity IS DISTINCT FROM NEW.quantity) OR 
     (OLD.rate IS DISTINCT FROM NEW.rate) OR 
     (OLD.revised_quantity IS DISTINCT FROM NEW.revised_quantity) THEN
    INSERT INTO public.audit_logs (
      organization_id, project_id, user_id, user_email, user_name, user_role,
      action, entity_type, entity_id, entity_identifier,
      previous_values, new_values, diff_summary, notes
    ) VALUES (
      NEW.organization_id,
      NEW.project_id,
      v_actor.actor_id,
      v_actor.actor_email,
      v_actor.actor_name,
      v_actor.actor_role,
      'BOQ_QUANTITY_CHANGED',
      'boq_items',
      NEW.id::TEXT,
      'BOQ Item #' || COALESCE(NEW.item_number, NEW.id::TEXT),
      json_build_object('quantity', OLD.quantity, 'rate', OLD.rate, 'revised_quantity', OLD.revised_quantity, 'amount', OLD.amount),
      json_build_object('quantity', NEW.quantity, 'rate', NEW.rate, 'revised_quantity', NEW.revised_quantity, 'amount', NEW.amount),
      json_build_object('old_qty', OLD.quantity, 'new_qty', NEW.quantity, 'revised_qty', NEW.revised_quantity),
      'Tender or revised BOQ schedule parameters altered.'
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_audit_boq ON public.boq_items;
CREATE TRIGGER trg_audit_boq
  AFTER UPDATE ON public.boq_items
  FOR EACH ROW EXECUTE FUNCTION public.trg_audit_boq_items();

-- 8. AUTOMATED AUDIT TRIGGER 3: Variation Approved
CREATE OR REPLACE FUNCTION public.trg_audit_contract_variations()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor RECORD;
BEGIN
  SELECT * INTO v_actor FROM public.get_audit_actor();

  IF NEW.status = 'APPROVED' AND (OLD.status IS NULL OR OLD.status != 'APPROVED') THEN
    INSERT INTO public.audit_logs (
      organization_id, project_id, user_id, user_email, user_name, user_role,
      action, entity_type, entity_id, entity_identifier,
      previous_values, new_values, diff_summary, notes
    ) VALUES (
      NEW.organization_id,
      NEW.project_id,
      v_actor.actor_id,
      v_actor.actor_email,
      v_actor.actor_name,
      v_actor.actor_role,
      'VARIATION_APPROVED',
      'contract_variations',
      NEW.id::TEXT,
      'Variation ' || NEW.reference_number || ' (' || NEW.type || ')',
      json_build_object('status', OLD.status, 'proposed_amount', OLD.proposed_amount),
      json_build_object('status', NEW.status, 'approved_amount', NEW.approved_amount, 'approved_order_number', NEW.approved_order_number),
      json_build_object('approved_amount', NEW.approved_amount, 'approval_date', NEW.approval_date),
      'Contract variation order sanctioned and officially approved.'
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_audit_variations ON public.contract_variations;
CREATE TRIGGER trg_audit_variations
  AFTER UPDATE ON public.contract_variations
  FOR EACH ROW EXECUTE FUNCTION public.trg_audit_contract_variations();

-- 9. AUTOMATED AUDIT TRIGGER 4: RA Bill Submitted
CREATE OR REPLACE FUNCTION public.trg_audit_ra_bills()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor RECORD;
BEGIN
  SELECT * INTO v_actor FROM public.get_audit_actor();

  IF (NEW.status IN ('submitted', 'passed')) AND (OLD.status IS NULL OR OLD.status != NEW.status) THEN
    INSERT INTO public.audit_logs (
      organization_id, project_id, user_id, user_email, user_name, user_role,
      action, entity_type, entity_id, entity_identifier,
      previous_values, new_values, diff_summary, notes
    ) VALUES (
      COALESCE(NEW.organization_id, v_actor.actor_org_id),
      NEW.project_id,
      v_actor.actor_id,
      v_actor.actor_email,
      v_actor.actor_name,
      v_actor.actor_role,
      'RA_BILL_SUBMITTED',
      'ra_bills',
      NEW.id::TEXT,
      'RA Bill #' || COALESCE(NEW.bill_number, NEW.id::TEXT),
      json_build_object('status', OLD.status),
      json_build_object('status', NEW.status, 'work_certified', NEW.work_certified_amount, 'net_payable', NEW.net_payable_amount),
      json_build_object('status_change', COALESCE(OLD.status, 'draft') || ' -> ' || NEW.status, 'net_amount', NEW.net_payable_amount),
      'Government running account bill officially submitted to department.'
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_audit_ra_bills ON public.ra_bills;
CREATE TRIGGER trg_audit_ra_bills
  AFTER UPDATE ON public.ra_bills
  FOR EACH ROW EXECUTE FUNCTION public.trg_audit_ra_bills();

-- 10. AUTOMATED AUDIT TRIGGER 5: Payment Recorded
CREATE OR REPLACE FUNCTION public.trg_audit_ra_bill_payments()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor RECORD;
  v_bill_num TEXT;
BEGIN
  SELECT * INTO v_actor FROM public.get_audit_actor();
  SELECT bill_number INTO v_bill_num FROM public.ra_bills WHERE id = NEW.bill_id;

  INSERT INTO public.audit_logs (
    organization_id, project_id, user_id, user_email, user_name, user_role,
    action, entity_type, entity_id, entity_identifier,
    previous_values, new_values, diff_summary, notes
  ) VALUES (
    COALESCE(NEW.organization_id, v_actor.actor_org_id),
    NEW.project_id,
    v_actor.actor_id,
    v_actor.actor_email,
    v_actor.actor_name,
    v_actor.actor_role,
    'PAYMENT_RECORDED',
    'ra_bill_payments',
    NEW.id::TEXT,
    'Payment for RA Bill #' || COALESCE(v_bill_num, 'Direct Voucher'),
    '{}'::jsonb,
    json_build_object('gross_amount', NEW.gross_amount, 'net_bank_amount', NEW.net_bank_amount, 'voucher_reference', NEW.voucher_reference, 'payment_date', NEW.payment_date),
    json_build_object('net_bank_credited', NEW.net_bank_amount, 'gross_released', NEW.gross_amount),
    'Treasury bank payment credited against certified running bill.'
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_audit_payments ON public.ra_bill_payments;
CREATE TRIGGER trg_audit_payments
  AFTER INSERT ON public.ra_bill_payments
  FOR EACH ROW EXECUTE FUNCTION public.trg_audit_ra_bill_payments();

-- 11. AUTOMATED AUDIT TRIGGER 6: Claim Submitted
CREATE OR REPLACE FUNCTION public.trg_audit_contract_claims()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor RECORD;
BEGIN
  SELECT * INTO v_actor FROM public.get_audit_actor();

  IF NEW.status = 'SUBMITTED' AND (TG_OP = 'INSERT' OR OLD.status != 'SUBMITTED') THEN
    INSERT INTO public.audit_logs (
      organization_id, project_id, user_id, user_email, user_name, user_role,
      action, entity_type, entity_id, entity_identifier,
      previous_values, new_values, diff_summary, notes
    ) VALUES (
      NEW.organization_id,
      NEW.project_id,
      v_actor.actor_id,
      v_actor.actor_email,
      v_actor.actor_name,
      v_actor.actor_role,
      'CLAIM_SUBMITTED',
      'contract_claims',
      NEW.id::TEXT,
      'Claim #' || NEW.claim_number || ' (' || NEW.claim_type || ')',
      CASE WHEN TG_OP = 'UPDATE' THEN json_build_object('status', OLD.status, 'claimed_amount', OLD.claimed_amount) ELSE '{}'::jsonb END,
      json_build_object('status', NEW.status, 'claimed_amount', NEW.claimed_amount, 'submission_date', NEW.submission_date),
      json_build_object('claimed_amount', NEW.claimed_amount, 'type', NEW.claim_type),
      'Contractual claim officially filed with department authority / DRB.'
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_audit_claims ON public.contract_claims;
CREATE TRIGGER trg_audit_claims
  AFTER INSERT OR UPDATE ON public.contract_claims
  FOR EACH ROW EXECUTE FUNCTION public.trg_audit_contract_claims();

-- 12. AUTOMATED AUDIT TRIGGER 7: Contract Date / Value Changed
CREATE OR REPLACE FUNCTION public.trg_audit_contracts()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor RECORD;
BEGIN
  SELECT * INTO v_actor FROM public.get_audit_actor();

  IF (OLD.current_completion_date IS DISTINCT FROM NEW.current_completion_date) OR
     (OLD.original_completion_date IS DISTINCT FROM NEW.original_completion_date) OR
     (OLD.awarded_amount IS DISTINCT FROM NEW.awarded_amount) THEN
    INSERT INTO public.audit_logs (
      organization_id, project_id, user_id, user_email, user_name, user_role,
      action, entity_type, entity_id, entity_identifier,
      previous_values, new_values, diff_summary, notes
    ) VALUES (
      NEW.organization_id,
      NEW.project_id,
      v_actor.actor_id,
      v_actor.actor_email,
      v_actor.actor_name,
      v_actor.actor_role,
      'CONTRACT_DATE_CHANGED',
      'contracts',
      NEW.id::TEXT,
      'Contract ' || NEW.agreement_number,
      json_build_object('current_completion_date', OLD.current_completion_date, 'original_completion_date', OLD.original_completion_date, 'awarded_amount', OLD.awarded_amount),
      json_build_object('current_completion_date', NEW.current_completion_date, 'original_completion_date', NEW.original_completion_date, 'awarded_amount', NEW.awarded_amount),
      json_build_object('old_completion', OLD.current_completion_date, 'new_completion', NEW.current_completion_date, 'awarded_value', NEW.awarded_amount),
      'Stipulated contract completion timeline or awarded financial value amended.'
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_audit_contracts ON public.contracts;
CREATE TRIGGER trg_audit_contracts
  AFTER UPDATE ON public.contracts
  FOR EACH ROW EXECUTE FUNCTION public.trg_audit_contracts();

-- 13. GUARDS: Protect Certified Measurements & Billed Records
CREATE OR REPLACE FUNCTION public.guard_measurement_entries_integrity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_role TEXT;
BEGIN
  v_role := public.get_user_role();

  -- 1. Protect against certification by unauthorized roles
  IF NEW.status = 'CERTIFIED' AND (OLD.status IS NULL OR OLD.status != 'CERTIFIED') THEN
    IF v_role NOT IN ('owner', 'partner', 'managing_partner', 'project_manager', 'billing_engineer') THEN
      RAISE EXCEPTION 'Access Denied: Only Billing Engineers, Project Managers, Partners, or Owners can certify e-MB measurements.';
    END IF;
  END IF;

  -- 2. Protect against modifying entries that have already been billed in an official RA Bill
  IF OLD.billed_in_ra_bill_id IS NOT NULL THEN
    IF (OLD.calculated_quantity IS DISTINCT FROM NEW.calculated_quantity) OR
       (OLD.boq_item_id IS DISTINCT FROM NEW.boq_item_id) OR
       (OLD.status IS DISTINCT FROM NEW.status AND NEW.status != 'CERTIFIED') THEN
      RAISE EXCEPTION 'Integrity Violation: This measurement has already been billed in RA Bill (%). Billed measurements are legally locked.', OLD.billed_in_ra_bill_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_measurement_entries ON public.measurement_entries;
CREATE TRIGGER trg_guard_measurement_entries
  BEFORE UPDATE ON public.measurement_entries
  FOR EACH ROW EXECUTE FUNCTION public.guard_measurement_entries_integrity();


-- ==============================================================================
-- PART: 063_measurement_rls_and_integrity_locks.sql
-- ==============================================================================

-- ============================================================
-- PillarPro v2 — Migration 063: Measurement RLS & Integrity Locks
--
-- Closes critical security and data-integrity gaps across the
-- Electronic Measurement Book (e-MB) module:
-- 1. Enables Row Level Security (RLS) on all e-MB measurement tables.
-- 2. Scopes SELECT, INSERT, UPDATE, DELETE to the authenticated user's organization.
-- 3. Enforces database-level immutability triggers:
--    a) Prevents deleting measurement entries that have been certified or billed in an RA Bill.
--    b) Prevents downgrading CERTIFIED measurements back to DRAFT or SUBMITTED.
--    c) Prevents unauthorized roles from certifying measurements.
-- ============================================================

-- 1. Enable Row Level Security (RLS) on e-MB tables
ALTER TABLE IF EXISTS public.measurement_books ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.measurement_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.measurement_adjustments ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.measurement_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.measurement_certificates ENABLE ROW LEVEL SECURITY;

-- 2. Measurement Books Policies
DROP POLICY IF EXISTS "mb_select_org" ON public.measurement_books;
CREATE POLICY "mb_select_org" ON public.measurement_books
    FOR SELECT TO authenticated
    USING (organization_id = public.get_user_organization_id());

DROP POLICY IF EXISTS "mb_insert_org" ON public.measurement_books;
CREATE POLICY "mb_insert_org" ON public.measurement_books
    FOR INSERT TO authenticated
    WITH CHECK (COALESCE(organization_id, public.get_user_organization_id()) = public.get_user_organization_id());

DROP POLICY IF EXISTS "mb_update_org" ON public.measurement_books;
CREATE POLICY "mb_update_org" ON public.measurement_books
    FOR UPDATE TO authenticated
    USING (organization_id = public.get_user_organization_id())
    WITH CHECK (organization_id = public.get_user_organization_id());

DROP POLICY IF EXISTS "mb_delete_org" ON public.measurement_books;
CREATE POLICY "mb_delete_org" ON public.measurement_books
    FOR DELETE TO authenticated
    USING (organization_id = public.get_user_organization_id());

-- 3. Measurement Entries Policies
DROP POLICY IF EXISTS "me_select_org" ON public.measurement_entries;
CREATE POLICY "me_select_org" ON public.measurement_entries
    FOR SELECT TO authenticated
    USING (organization_id = public.get_user_organization_id());

DROP POLICY IF EXISTS "me_insert_org" ON public.measurement_entries;
CREATE POLICY "me_insert_org" ON public.measurement_entries
    FOR INSERT TO authenticated
    WITH CHECK (COALESCE(organization_id, public.get_user_organization_id()) = public.get_user_organization_id());

DROP POLICY IF EXISTS "me_update_org" ON public.measurement_entries;
CREATE POLICY "me_update_org" ON public.measurement_entries
    FOR UPDATE TO authenticated
    USING (organization_id = public.get_user_organization_id())
    WITH CHECK (organization_id = public.get_user_organization_id());

DROP POLICY IF EXISTS "me_delete_org" ON public.measurement_entries;
CREATE POLICY "me_delete_org" ON public.measurement_entries
    FOR DELETE TO authenticated
    USING (organization_id = public.get_user_organization_id());

-- 4. Measurement Adjustments Policies
DROP POLICY IF EXISTS "ma_select_org" ON public.measurement_adjustments;
CREATE POLICY "ma_select_org" ON public.measurement_adjustments
    FOR SELECT TO authenticated
    USING (organization_id = public.get_user_organization_id());

DROP POLICY IF EXISTS "ma_insert_org" ON public.measurement_adjustments;
CREATE POLICY "ma_insert_org" ON public.measurement_adjustments
    FOR INSERT TO authenticated
    WITH CHECK (COALESCE(organization_id, public.get_user_organization_id()) = public.get_user_organization_id());

DROP POLICY IF EXISTS "ma_update_org" ON public.measurement_adjustments;
CREATE POLICY "ma_update_org" ON public.measurement_adjustments
    FOR UPDATE TO authenticated
    USING (organization_id = public.get_user_organization_id())
    WITH CHECK (organization_id = public.get_user_organization_id());

DROP POLICY IF EXISTS "ma_delete_org" ON public.measurement_adjustments;
CREATE POLICY "ma_delete_org" ON public.measurement_adjustments
    FOR DELETE TO authenticated
    USING (organization_id = public.get_user_organization_id());

-- 5. Measurement Documents Policies
DROP POLICY IF EXISTS "md_select_org" ON public.measurement_documents;
CREATE POLICY "md_select_org" ON public.measurement_documents
    FOR SELECT TO authenticated
    USING (organization_id = public.get_user_organization_id());

DROP POLICY IF EXISTS "md_insert_org" ON public.measurement_documents;
CREATE POLICY "md_insert_org" ON public.measurement_documents
    FOR INSERT TO authenticated
    WITH CHECK (COALESCE(organization_id, public.get_user_organization_id()) = public.get_user_organization_id());

DROP POLICY IF EXISTS "md_update_org" ON public.measurement_documents;
CREATE POLICY "md_update_org" ON public.measurement_documents
    FOR UPDATE TO authenticated
    USING (organization_id = public.get_user_organization_id())
    WITH CHECK (organization_id = public.get_user_organization_id());

DROP POLICY IF EXISTS "md_delete_org" ON public.measurement_documents;
CREATE POLICY "md_delete_org" ON public.measurement_documents
    FOR DELETE TO authenticated
    USING (organization_id = public.get_user_organization_id());

-- 6. Measurement Certificates Policies
DROP POLICY IF EXISTS "mc_select_org" ON public.measurement_certificates;
CREATE POLICY "mc_select_org" ON public.measurement_certificates
    FOR SELECT TO authenticated
    USING (organization_id = public.get_user_organization_id());

DROP POLICY IF EXISTS "mc_insert_org" ON public.measurement_certificates;
CREATE POLICY "mc_insert_org" ON public.measurement_certificates
    FOR INSERT TO authenticated
    WITH CHECK (COALESCE(organization_id, public.get_user_organization_id()) = public.get_user_organization_id());

DROP POLICY IF EXISTS "mc_update_org" ON public.measurement_certificates;
CREATE POLICY "mc_update_org" ON public.measurement_certificates
    FOR UPDATE TO authenticated
    USING (organization_id = public.get_user_organization_id())
    WITH CHECK (organization_id = public.get_user_organization_id());

DROP POLICY IF EXISTS "mc_delete_org" ON public.measurement_certificates;
CREATE POLICY "mc_delete_org" ON public.measurement_certificates
    FOR DELETE TO authenticated
    USING (organization_id = public.get_user_organization_id());

-- 7. Database Guard: Prevent Deletion of Billed or Certified Measurements
CREATE OR REPLACE FUNCTION public.guard_measurement_entries_delete()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Prevent deleting if already billed in a Running Account Bill
  IF OLD.billed_in_ra_bill_id IS NOT NULL THEN
    RAISE EXCEPTION 'Integrity Violation: Measurement entry has already been billed in RA Bill (%). Billed entries cannot be deleted.', OLD.billed_in_ra_bill_id;
  END IF;

  -- Prevent deleting certified entries
  IF OLD.status = 'CERTIFIED' THEN
    RAISE EXCEPTION 'Integrity Violation: Certified measurement entries cannot be deleted. If a test check or quantity adjustment is required, record an official Measurement Adjustment.';
  END IF;

  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_measurement_delete ON public.measurement_entries;
CREATE TRIGGER trg_guard_measurement_delete
  BEFORE DELETE ON public.measurement_entries
  FOR EACH ROW EXECUTE FUNCTION public.guard_measurement_entries_delete();

-- 8. Enhanced Database Guard: Prevent Status Downgrades & Enforce Role Certification
CREATE OR REPLACE FUNCTION public.guard_measurement_entries_integrity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_role TEXT;
BEGIN
  v_role := public.get_user_role();

  -- 1. Protect against certification by unauthorized roles
  IF NEW.status = 'CERTIFIED' AND (OLD.status IS NULL OR OLD.status != 'CERTIFIED') THEN
    IF v_role NOT IN ('owner', 'partner', 'managing_partner', 'project_manager', 'billing_engineer') THEN
      RAISE EXCEPTION 'Access Denied: Only Billing Engineers, Project Managers, Partners, or Owners can certify e-MB measurements.';
    END IF;
  END IF;

  -- 2. Protect against downgrading certified entries to Draft or Submitted
  IF OLD.status = 'CERTIFIED' AND NEW.status IN ('DRAFT', 'SUBMITTED') THEN
    RAISE EXCEPTION 'Security Violation: Certified measurements cannot be downgraded to Draft or Submitted status.';
  END IF;

  -- 3. Protect against modifying entries that have already been billed in an official RA Bill
  IF OLD.billed_in_ra_bill_id IS NOT NULL THEN
    IF (OLD.calculated_quantity IS DISTINCT FROM NEW.calculated_quantity) OR
       (OLD.boq_item_id IS DISTINCT FROM NEW.boq_item_id) OR
       (OLD.status IS DISTINCT FROM NEW.status AND NEW.status != 'CERTIFIED') THEN
      RAISE EXCEPTION 'Integrity Violation: This measurement has already been billed in RA Bill (%). Billed measurements are legally locked.', OLD.billed_in_ra_bill_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_measurement_entries ON public.measurement_entries;
CREATE TRIGGER trg_guard_measurement_entries
  BEFORE UPDATE ON public.measurement_entries
  FOR EACH ROW EXECUTE FUNCTION public.guard_measurement_entries_integrity();

