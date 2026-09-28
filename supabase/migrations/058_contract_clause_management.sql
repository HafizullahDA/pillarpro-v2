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
    INSERT INTO public.contract_notice_rules (
      organization_id,
      contract_id,
      clause_number,
      clause_name,
      notice_period_days,
      description,
      applicable_to,
      is_active
    )
    VALUES (
      NEW.organization_id,
      NEW.contract_id,
      NEW.clause_number,
      NEW.clause_title,
      NEW.notice_period_days,
      COALESCE(NEW.clause_text, NEW.clause_title),
      'ALL',
      TRUE
    )
    ON CONFLICT DO NOTHING;
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
