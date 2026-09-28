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
