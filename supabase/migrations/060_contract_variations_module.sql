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
