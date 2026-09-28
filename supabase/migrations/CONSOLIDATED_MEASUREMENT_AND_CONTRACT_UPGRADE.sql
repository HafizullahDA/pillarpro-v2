-- ==============================================================================
-- PILLARPRO CONSOLIDATED UPGRADE MIGRATION (051 -> 054)
-- Modules: Contract Master + BOQ Master + Electronic Measurement Book (e-MB) + RA Bill Integration
-- Compatible with CPWD, State PWD, NHAI, MoRTH, MES, Railways, and PSU Projects
-- Safe, Idempotent, and Non-Destructive (Uses IF NOT EXISTS, Safe Enums & Triggers)
--
-- Instructions:
-- 1. Open your Supabase Project Dashboard (https://supabase.com/dashboard).
-- 2. Navigate to "SQL Editor" in the left sidebar.
-- 3. Click "New Query", paste this entire script, and click "Run".
-- ==============================================================================


-- ========================================================
-- PART 1: CONTRACT MASTER & DOCUMENT REPOSITORY (Migration 051)
-- ========================================================

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


-- ========================================================
-- PART 2: BOQ MASTER & REVISIONS TRACKING (Migration 052)
-- ========================================================

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


-- ========================================================
-- PART 3: ELECTRONIC MEASUREMENT BOOK (e-MB) (Migration 053)
-- ========================================================

-- Migration 053: PillarPro Measurement Module (e-MB: Electronic Measurement Book)
-- Designed for Indian Government Contractors (CPWD, State PWDs, NHAI, MoRTH, MES, Railways, PSUs)

-- 1. Measurement Books Register (e-MB Volume Master)
CREATE TABLE IF NOT EXISTS public.measurement_books (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    contract_id UUID REFERENCES public.contracts(id) ON DELETE SET NULL,
    book_number VARCHAR(100) NOT NULL,
    title VARCHAR(255) NOT NULL,
    financial_year VARCHAR(20),
    issued_to_name VARCHAR(150),
    issued_to_designation VARCHAR(100),
    division VARCHAR(150),
    subdivision VARCHAR(150),
    total_pages INTEGER DEFAULT 100,
    current_page INTEGER DEFAULT 1,
    status VARCHAR(50) DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'FULL', 'CLOSED', 'ARCHIVED')),
    remarks TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    CONSTRAINT uq_project_book_number UNIQUE (project_id, book_number)
);

CREATE INDEX IF NOT EXISTS idx_mb_org_project ON public.measurement_books(organization_id, project_id);
CREATE INDEX IF NOT EXISTS idx_mb_status ON public.measurement_books(status);

-- 2. Measurement Entries (e-MB Detail Rows)
CREATE TABLE IF NOT EXISTS public.measurement_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    contract_id UUID REFERENCES public.contracts(id) ON DELETE SET NULL,
    measurement_book_id UUID REFERENCES public.measurement_books(id) ON DELETE CASCADE,
    boq_item_id UUID NOT NULL REFERENCES public.boq_items(id) ON DELETE RESTRICT,
    entry_number VARCHAR(50) NOT NULL,
    page_number INTEGER DEFAULT 1,
    measurement_date DATE NOT NULL,
    location VARCHAR(255),
    chainage_km NUMERIC(10, 3),
    chainage_m NUMERIC(10, 2),
    chainage_end_km NUMERIC(10, 3),
    chainage_end_m NUMERIC(10, 2),
    description TEXT NOT NULL,
    calculation_mode VARCHAR(50) DEFAULT 'l_b_d' CHECK (
        calculation_mode IN ('l_b_d', 'l_b', 'l_h', 'num_l_b_h', 'running_length', 'weight', 'count', 'manual')
    ),
    number_of_units NUMERIC(12, 3) DEFAULT 1,
    length NUMERIC(14, 3) DEFAULT 0,
    breadth NUMERIC(14, 3) DEFAULT 0,
    depth_height NUMERIC(14, 3) DEFAULT 0,
    calculated_quantity NUMERIC(16, 3) NOT NULL DEFAULT 0,
    unit VARCHAR(50) NOT NULL,
    previous_quantity NUMERIC(16, 3) NOT NULL DEFAULT 0,
    current_quantity NUMERIC(16, 3) NOT NULL DEFAULT 0,
    cumulative_quantity NUMERIC(16, 3) NOT NULL DEFAULT 0,
    boq_balance_quantity NUMERIC(16, 3) NOT NULL DEFAULT 0,
    is_exceeded BOOLEAN DEFAULT FALSE,
    deviation_order_type VARCHAR(50) CHECK (
        deviation_order_type IS NULL OR deviation_order_type IN ('deviation', 'variation', 'extra_item', 'none')
    ),
    remarks TEXT,
    site_reference VARCHAR(255),
    drawing_reference VARCHAR(255),
    entered_by VARCHAR(150),
    checked_by VARCHAR(150),
    checked_at TIMESTAMPTZ,
    certified_by VARCHAR(150),
    certified_at TIMESTAMPTZ,
    status VARCHAR(50) NOT NULL DEFAULT 'DRAFT' CHECK (
        status IN ('DRAFT', 'SUBMITTED', 'CHECKED', 'CERTIFIED', 'REJECTED', 'CANCELLED')
    ),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_me_org_project ON public.measurement_entries(organization_id, project_id);
CREATE INDEX IF NOT EXISTS idx_me_boq_item ON public.measurement_entries(boq_item_id);
CREATE INDEX IF NOT EXISTS idx_me_mb_book ON public.measurement_entries(measurement_book_id);
CREATE INDEX IF NOT EXISTS idx_me_status ON public.measurement_entries(status);
CREATE INDEX IF NOT EXISTS idx_me_date ON public.measurement_entries(measurement_date DESC);

-- 3. Measurement Adjustments / Corrections / Reversals (Strict Audit Trail)
CREATE TABLE IF NOT EXISTS public.measurement_adjustments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    measurement_entry_id UUID NOT NULL REFERENCES public.measurement_entries(id) ON DELETE CASCADE,
    boq_item_id UUID NOT NULL REFERENCES public.boq_items(id) ON DELETE RESTRICT,
    adjustment_type VARCHAR(50) NOT NULL CHECK (
        adjustment_type IN ('test_check_reduction', 'reversal', 'correction', 'addition', 'deduction')
    ),
    previous_quantity NUMERIC(16, 3) NOT NULL,
    adjusted_quantity NUMERIC(16, 3) NOT NULL,
    difference_quantity NUMERIC(16, 3) NOT NULL,
    reason TEXT NOT NULL,
    authorized_by VARCHAR(150) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_ma_entry ON public.measurement_adjustments(measurement_entry_id);

-- 4. Measurement Supporting Documents & Site Photos
CREATE TABLE IF NOT EXISTS public.measurement_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    measurement_entry_id UUID REFERENCES public.measurement_entries(id) ON DELETE CASCADE,
    measurement_book_id UUID REFERENCES public.measurement_books(id) ON DELETE SET NULL,
    file_name VARCHAR(255) NOT NULL,
    file_url TEXT NOT NULL,
    file_type VARCHAR(100),
    document_category VARCHAR(100) DEFAULT 'site_photo' CHECK (
        document_category IN ('site_photo', 'drawing_cross_section', 'level_sheet', 'rfi_inspection', 'quality_test', 'test_check_memo', 'other')
    ),
    caption TEXT,
    uploaded_by VARCHAR(150),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_md_entry ON public.measurement_documents(measurement_entry_id);

-- 5. Measurement Certificates (Issued by EE/AE or Contractor PM)
CREATE TABLE IF NOT EXISTS public.measurement_certificates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    contract_id UUID REFERENCES public.contracts(id) ON DELETE SET NULL,
    measurement_book_id UUID REFERENCES public.measurement_books(id) ON DELETE SET NULL,
    certificate_number VARCHAR(100) NOT NULL,
    certificate_date DATE NOT NULL,
    period_from DATE NOT NULL,
    period_to DATE NOT NULL,
    total_items_measured INTEGER DEFAULT 0,
    total_certified_value NUMERIC(16, 2) DEFAULT 0,
    certified_by_name VARCHAR(150) NOT NULL,
    certified_by_designation VARCHAR(150),
    statutory_declaration TEXT NOT NULL DEFAULT 'Certified that the measurements recorded in this Measurement Book have been taken by me personally on site in accordance with CPWD/State PWD/contract specifications and standard method of measurement. The quantities recorded are correct and have not been previously billed or certified.',
    status VARCHAR(50) DEFAULT 'ISSUED' CHECK (status IN ('DRAFT', 'ISSUED', 'REVOKED')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trigger: Immutability lock on CERTIFIED entries
CREATE OR REPLACE FUNCTION public.check_certified_measurement_lock()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.status = 'CERTIFIED' AND NEW.status = 'CERTIFIED' THEN
        IF OLD.calculated_quantity <> NEW.calculated_quantity
           OR OLD.boq_item_id <> NEW.boq_item_id
           OR OLD.length <> NEW.length
           OR OLD.breadth <> NEW.breadth
           OR OLD.depth_height <> NEW.depth_height
           OR OLD.number_of_units <> NEW.number_of_units THEN
            RAISE EXCEPTION 'Certified measurements cannot be edited directly. To alter certified quantities, file an official Measurement Adjustment/Reversal record.';
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_lock_certified_measurement ON public.measurement_entries;
CREATE TRIGGER trg_lock_certified_measurement
    BEFORE UPDATE ON public.measurement_entries
    FOR EACH ROW
    EXECUTE FUNCTION public.check_certified_measurement_lock();

-- Trigger: Auto set organization_id and contract_id if null
CREATE OR REPLACE FUNCTION public.set_measurement_entry_defaults()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.organization_id IS NULL THEN
        SELECT organization_id INTO NEW.organization_id FROM public.projects WHERE id = NEW.project_id;
    END IF;
    IF NEW.contract_id IS NULL THEN
        SELECT contract_id INTO NEW.contract_id FROM public.boq_items WHERE id = NEW.boq_item_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_measurement_entry_defaults ON public.measurement_entries;
CREATE TRIGGER trg_measurement_entry_defaults
    BEFORE INSERT ON public.measurement_entries
    FOR EACH ROW
    EXECUTE FUNCTION public.set_measurement_entry_defaults();


-- ========================================================
-- PART 4: RA BILL & MEASUREMENT INTEGRATION (Migration 054)
-- ========================================================

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
