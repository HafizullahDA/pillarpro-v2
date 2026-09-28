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
