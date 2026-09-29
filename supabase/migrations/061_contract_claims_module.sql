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
