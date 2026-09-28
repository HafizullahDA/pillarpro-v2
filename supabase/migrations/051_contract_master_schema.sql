-- ============================================================
-- PillarPro v2 — Migration 051: Contract Master & Document Repository
--
-- The Central Source of Truth for Indian Government Civil Contracts:
-- - CPWD, State PWDs, NHAI, MoRTH, MES, Railways, PSUs
--
-- 1. Creates public.contracts table with comprehensive legal, financial,
--    statutory, date, and GCC/SCC provisions.
-- 2. Creates public.contract_documents table for storing multiple contract
--    documents, drawings, NIT, BOQ, Corrigenda, and correspondence.
-- 3. Enables Row Level Security (RLS) with organization scoping.
-- 4. Automatically seeds initial contract records for existing projects.
-- 5. Safe, idempotent, and non-destructive.
-- ============================================================

-- 1. Create Contract Enums if not exists
DO $$ BEGIN
  CREATE TYPE public.contract_status_type AS ENUM (
    'active',
    'completed',
    'terminated',
    'suspended',
    'foreclosed',
    'in_arbitration'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.contract_doc_type AS ENUM (
    'Agreement',
    'Work Order',
    'NIT',
    'BOQ',
    'GCC',
    'SCC',
    'Corrigendum',
    'Drawings',
    'Specifications',
    'Addendum',
    'Department Letter',
    'Contractor Letter',
    'Other'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 2. Table: contracts
CREATE TABLE IF NOT EXISTS public.contracts (
  id                                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id                     UUID NOT NULL DEFAULT public.get_user_organization_id() REFERENCES public.organizations(id) ON DELETE CASCADE,
  project_id                          UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  is_primary                          BOOLEAN NOT NULL DEFAULT TRUE,

  -- 1. Department / Employer & Administrative Hierarchy
  employer_name                       TEXT NOT NULL DEFAULT 'Public Works Department',
  division                            TEXT,                       -- e.g. 'R&B Division Baramulla'
  circle                              TEXT,                       -- e.g. 'North Kashmir Circle'
  contracting_authority               TEXT,                       -- e.g. 'Executive Engineer'
  contractor_name                     TEXT NOT NULL DEFAULT 'Contractor',

  -- 2. Identification Numbers
  agreement_number                    TEXT NOT NULL,              -- e.g. '04/EE/R&B/2025-26'
  work_order_number                   TEXT,                       -- e.g. 'WO/CE/PWD/4412/2025'
  nit_number                          TEXT,                       -- e.g. 'e-NIT No. 12 of 2025-26'
  contract_title                      TEXT,                       -- Descriptive package title

  -- 3. Contract & Tender Classification
  contract_type                       TEXT NOT NULL DEFAULT 'Item Rate', -- 'Item Rate', 'Percentage Rate', 'Lump Sum', 'EPC', 'HAM', 'Other'
  tender_type                         TEXT NOT NULL DEFAULT 'Open Tender', -- 'Open Tender', 'Limited Tender', 'Single Tender', etc.

  -- 4. Contract Values
  estimated_cost                      NUMERIC(15,2) DEFAULT 0 CHECK (estimated_cost >= 0),
  awarded_amount                      NUMERIC(15,2) NOT NULL DEFAULT 0 CHECK (awarded_amount >= 0),

  -- 5. Dates & Milestones
  award_date                          DATE,                       -- Letter of Acceptance (LOA) date
  agreement_date                      DATE,                       -- Date of signing agreement
  work_commencement_date              DATE,                       -- Stipulated Date of Start (SDOS)
  original_completion_date            DATE,                       -- Stipulated Date of Completion (SDOC)
  current_completion_date             DATE,                       -- Extended / Intended Completion Date
  original_contract_period_months     NUMERIC(6,2),
  original_contract_period_days       INT,

  -- 6. Defect Liability Period (DLP)
  dlp_months                          INT DEFAULT 12 CHECK (dlp_months >= 0),
  dlp_start_date                      DATE,
  dlp_end_date                        DATE,

  -- 7. Guarantees, Security Deposits & Retentions
  earnest_money_deposit               NUMERIC(15,2) DEFAULT 0 CHECK (earnest_money_deposit >= 0),
  performance_security_amount         NUMERIC(15,2) DEFAULT 0 CHECK (performance_security_amount >= 0),
  performance_security_percent        NUMERIC(5,2) DEFAULT 5.0,
  security_deposit_amount             NUMERIC(15,2) DEFAULT 0 CHECK (security_deposit_amount >= 0),
  security_deposit_percent            NUMERIC(5,2) DEFAULT 2.5,
  retention_percentage                NUMERIC(5,2) NOT NULL DEFAULT 5.0 CHECK (retention_percentage >= 0 AND retention_percentage <= 100),

  -- 8. GST Information
  contractor_gstin                    TEXT,
  employer_gstin                      TEXT,
  gst_rate_percent                    NUMERIC(5,2) DEFAULT 18.0,
  gst_treatment                       TEXT DEFAULT 'exclusive',   -- 'inclusive' or 'exclusive'

  -- 9. Commercial & Statutory Provisions
  liquidated_damages_percent_per_week NUMERIC(5,2) DEFAULT 0.5,
  liquidated_damages_max_cap_percent  NUMERIC(5,2) DEFAULT 10.0,
  ld_provisions_notes                 TEXT,

  eot_clause                          TEXT DEFAULT 'Clause 5 CPWD / PWD GCC',
  eot_notice_days                     INT DEFAULT 14,
  eot_provisions_notes                TEXT,

  escalation_applicable               BOOLEAN NOT NULL DEFAULT FALSE,
  escalation_clause                   TEXT DEFAULT 'Clause 10CC / 10CA',
  escalation_notes                    TEXT,

  variation_limit_percent             NUMERIC(5,2) DEFAULT 25.0,
  variation_clause                    TEXT DEFAULT 'Clause 12 CPWD / PWD GCC',
  variation_notes                     TEXT,

  payment_terms_frequency             TEXT DEFAULT 'monthly',     -- 'monthly', 'milestone', 'stage_wise'
  payment_terms_notes                 TEXT,

  -- 10. Conditions of Contract
  gcc_type                            TEXT DEFAULT 'CPWD GCC 2020 / 2024',
  gcc_edition                         TEXT,
  scc_notes                           TEXT,

  -- 11. Status & Audit
  status                              TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'terminated', 'suspended', 'foreclosed', 'in_arbitration')),
  notes                               TEXT,
  created_at                          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by                          UUID REFERENCES auth.users(id),
  updated_by                          UUID REFERENCES auth.users(id)
);

-- Indices for performance
CREATE INDEX IF NOT EXISTS idx_contracts_project_id ON public.contracts(project_id);
CREATE INDEX IF NOT EXISTS idx_contracts_org_id ON public.contracts(organization_id);
CREATE INDEX IF NOT EXISTS idx_contracts_agreement_number ON public.contracts(agreement_number);
CREATE INDEX IF NOT EXISTS idx_contracts_status ON public.contracts(status);

-- Auto-update updated_at on contracts
DROP TRIGGER IF EXISTS trg_updated_at_contracts ON public.contracts;
CREATE TRIGGER trg_updated_at_contracts
  BEFORE UPDATE ON public.contracts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Auto-resolve organization_id and created_by for contracts
CREATE OR REPLACE FUNCTION public.set_contract_defaults()
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

  NEW.updated_by := auth.uid();

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_contract_defaults ON public.contracts;
CREATE TRIGGER trg_set_contract_defaults
  BEFORE INSERT OR UPDATE ON public.contracts
  FOR EACH ROW EXECUTE FUNCTION public.set_contract_defaults();


-- 3. Table: contract_documents
CREATE TABLE IF NOT EXISTS public.contract_documents (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id         UUID NOT NULL REFERENCES public.contracts(id) ON DELETE CASCADE,
  project_id          UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  organization_id     UUID NOT NULL DEFAULT public.get_user_organization_id() REFERENCES public.organizations(id) ON DELETE CASCADE,
  document_type       TEXT NOT NULL CHECK (document_type IN (
    'Agreement',
    'Work Order',
    'NIT',
    'BOQ',
    'GCC',
    'SCC',
    'Corrigendum',
    'Drawings',
    'Specifications',
    'Addendum',
    'Department Letter',
    'Contractor Letter',
    'Other'
  )),
  title               TEXT NOT NULL,
  document_number     TEXT,                       -- e.g. Drawing No. STR/BR-04, Letter Ref No.
  issue_date          DATE,
  file_url            TEXT NOT NULL,              -- Supabase Storage public / signed URL
  file_name           TEXT,
  file_size_bytes     BIGINT,
  file_type           TEXT,                       -- application/pdf, image/jpeg, etc.
  notes               TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by          UUID REFERENCES auth.users(id),
  updated_by          UUID REFERENCES auth.users(id)
);

CREATE INDEX IF NOT EXISTS idx_contract_documents_contract_id ON public.contract_documents(contract_id);
CREATE INDEX IF NOT EXISTS idx_contract_documents_project_id ON public.contract_documents(project_id);
CREATE INDEX IF NOT EXISTS idx_contract_documents_doc_type ON public.contract_documents(document_type);

DROP TRIGGER IF EXISTS trg_updated_at_contract_documents ON public.contract_documents;
CREATE TRIGGER trg_updated_at_contract_documents
  BEFORE UPDATE ON public.contract_documents
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Auto-resolve organization_id and created_by for contract_documents
CREATE OR REPLACE FUNCTION public.set_contract_document_defaults()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = public AS $$
BEGIN
  IF NEW.organization_id IS NULL THEN
    NEW.organization_id := COALESCE(
      (SELECT organization_id FROM public.contracts WHERE id = NEW.contract_id),
      (SELECT organization_id FROM public.projects WHERE id = NEW.project_id),
      public.get_user_organization_id()
    );
  END IF;

  IF NEW.created_by IS NULL THEN
    NEW.created_by := auth.uid();
  END IF;

  NEW.updated_by := auth.uid();

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_contract_document_defaults ON public.contract_documents;
CREATE TRIGGER trg_set_contract_document_defaults
  BEFORE INSERT OR UPDATE ON public.contract_documents
  FOR EACH ROW EXECUTE FUNCTION public.set_contract_document_defaults();


-- 4. Enable Row Level Security (RLS)
ALTER TABLE public.contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contract_documents ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies for contracts
DROP POLICY IF EXISTS "contracts_select_org" ON public.contracts;
CREATE POLICY "contracts_select_org" ON public.contracts
  FOR SELECT TO authenticated
  USING (
    organization_id = public.get_user_organization_id()
    OR public.get_user_role() IN ('owner', 'partner', 'managing_partner')
  );

DROP POLICY IF EXISTS "contracts_insert_org" ON public.contracts;
CREATE POLICY "contracts_insert_org" ON public.contracts
  FOR INSERT TO authenticated
  WITH CHECK (
    COALESCE(organization_id, public.get_user_organization_id()) = public.get_user_organization_id()
    OR public.get_user_role() IN ('owner', 'partner', 'managing_partner')
  );

DROP POLICY IF EXISTS "contracts_update_org" ON public.contracts;
CREATE POLICY "contracts_update_org" ON public.contracts
  FOR UPDATE TO authenticated
  USING (
    organization_id = public.get_user_organization_id()
    OR public.get_user_role() IN ('owner', 'partner', 'managing_partner')
  )
  WITH CHECK (
    organization_id = public.get_user_organization_id()
    OR public.get_user_role() IN ('owner', 'partner', 'managing_partner')
  );

DROP POLICY IF EXISTS "contracts_delete_org" ON public.contracts;
CREATE POLICY "contracts_delete_org" ON public.contracts
  FOR DELETE TO authenticated
  USING (
    organization_id = public.get_user_organization_id()
    AND public.get_user_role() IN ('owner', 'partner', 'managing_partner')
  );


-- 6. RLS Policies for contract_documents
DROP POLICY IF EXISTS "contract_docs_select_org" ON public.contract_documents;
CREATE POLICY "contract_docs_select_org" ON public.contract_documents
  FOR SELECT TO authenticated
  USING (
    organization_id = public.get_user_organization_id()
    OR public.get_user_role() IN ('owner', 'partner', 'managing_partner')
  );

DROP POLICY IF EXISTS "contract_docs_insert_org" ON public.contract_documents;
CREATE POLICY "contract_docs_insert_org" ON public.contract_documents
  FOR INSERT TO authenticated
  WITH CHECK (
    COALESCE(organization_id, public.get_user_organization_id()) = public.get_user_organization_id()
    OR public.get_user_role() IN ('owner', 'partner', 'managing_partner')
  );

DROP POLICY IF EXISTS "contract_docs_update_org" ON public.contract_documents;
CREATE POLICY "contract_docs_update_org" ON public.contract_documents
  FOR UPDATE TO authenticated
  USING (
    organization_id = public.get_user_organization_id()
    OR public.get_user_role() IN ('owner', 'partner', 'managing_partner')
  )
  WITH CHECK (
    organization_id = public.get_user_organization_id()
    OR public.get_user_role() IN ('owner', 'partner', 'managing_partner')
  );

DROP POLICY IF EXISTS "contract_docs_delete_org" ON public.contract_documents;
CREATE POLICY "contract_docs_delete_org" ON public.contract_documents
  FOR DELETE TO authenticated
  USING (
    organization_id = public.get_user_organization_id()
    AND public.get_user_role() IN ('owner', 'partner', 'managing_partner')
  );

-- 7. Grant authenticated permissions
GRANT ALL ON TABLE public.contracts TO authenticated;
GRANT ALL ON TABLE public.contract_documents TO authenticated;

-- 8. Seed existing projects with initial default contract records
INSERT INTO public.contracts (
  project_id,
  organization_id,
  employer_name,
  contractor_name,
  agreement_number,
  contract_title,
  estimated_cost,
  awarded_amount,
  work_commencement_date,
  original_completion_date,
  current_completion_date,
  is_primary,
  status
)
SELECT 
  p.id,
  COALESCE(p.organization_id, (SELECT id FROM public.organizations ORDER BY created_at ASC LIMIT 1)),
  COALESCE(NULLIF(p.agency_name, ''), 'Government Department / Agency'),
  'Contractor Agency',
  'AGR/' || UPPER(SUBSTRING(p.name FROM 1 FOR 3)) || '/' || SUBSTRING(p.id::text FROM 1 FOR 6),
  p.name,
  COALESCE(p.advertised_cost, 0),
  COALESCE(p.awarded_amount, 0),
  p.start_date,
  p.end_date,
  p.end_date,
  TRUE,
  'active'
FROM public.projects p
WHERE NOT EXISTS (
  SELECT 1 FROM public.contracts c WHERE c.project_id = p.id
);
