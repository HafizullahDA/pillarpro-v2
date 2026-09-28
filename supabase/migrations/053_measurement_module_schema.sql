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
