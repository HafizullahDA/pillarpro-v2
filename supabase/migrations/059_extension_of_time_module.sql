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
