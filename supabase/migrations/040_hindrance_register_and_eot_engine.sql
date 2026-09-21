-- ============================================================
-- PillarPro v2 — Migration 040: Digital Hindrance Register & EOT Engine
--
-- 1. Creates public.hindrances table for recording site impediments
--    (CPWD Works Manual Appendix 21 standard fields)
-- 2. Creates public.eot_applications table for Extension of Time claims (Form 27)
-- 3. Sets up multi-tenant organization RLS and role permissions
-- 4. Safe and idempotent (can be re-run cleanly)
-- ============================================================

-- 1. Create Enums if not exists
DO $$ BEGIN
  CREATE TYPE public.hindrance_category AS ENUM (
    'site_handover',
    'drawing_delay',
    'utility_shifting',
    'forest_clearance',
    'department_material',
    'fund_delay',
    'extra_work',
    'weather',
    'force_majeure',
    'other'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.hindrance_delay_type AS ENUM (
    'compensable',      -- Department-caused delay (entitles contractor to overheads & price escalation)
    'non_compensable'   -- Weather / Force Majeure (entitles contractor to time extension only)
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.hindrance_status AS ENUM (
    'active',
    'resolved',
    'acknowledged_by_dept',
    'disputed'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.eot_status AS ENUM (
    'draft',
    'submitted',
    'sanctioned_without_ld',
    'sanctioned_with_ld',
    'rejected'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 2. Table: hindrances
CREATE TABLE IF NOT EXISTS public.hindrances (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id           UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  project_id                UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  hindrance_number          INT NOT NULL,
  category                  public.hindrance_category NOT NULL DEFAULT 'other',
  description               TEXT NOT NULL,
  location_chainage         TEXT,                       -- e.g. 'Km 4+200 to Km 4+800'
  start_date                DATE NOT NULL,
  end_date                  DATE,                       -- Nullable if hindrance is currently ongoing
  status                    public.hindrance_status NOT NULL DEFAULT 'active',
  delay_type                public.hindrance_delay_type NOT NULL DEFAULT 'compensable',
  overlapping_days          NUMERIC(5,1) NOT NULL DEFAULT 0.0,
  net_delay_days            NUMERIC(5,1) NOT NULL DEFAULT 0.0,
  
  -- Statutory 14-Day Notice Tracking (Clause 5 CPWD / PWD GCC)
  notice_served             BOOLEAN NOT NULL DEFAULT FALSE,
  notice_date               DATE,
  notice_reference_no       TEXT,                       -- e.g. 'INF/PMGSY/EOT/2026/04'
  
  -- Joint Department Acknowledgement
  officer_acknowledged_by   TEXT,                       -- e.g. 'Er. Bilal Ahmad, Assistant Executive Engineer'
  officer_designation       TEXT,                       -- e.g. 'AEE / JE R&B Division'
  acknowledgement_date      DATE,
  
  photo_urls                TEXT[] DEFAULT '{}',
  document_urls             TEXT[] DEFAULT '{}',
  remarks                   TEXT,
  created_by                UUID REFERENCES auth.users(id),
  created_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexing for high-speed queries
CREATE INDEX IF NOT EXISTS idx_hindrances_project_id ON public.hindrances(project_id);
CREATE INDEX IF NOT EXISTS idx_hindrances_org_id ON public.hindrances(organization_id);
CREATE INDEX IF NOT EXISTS idx_hindrances_start_date ON public.hindrances(start_date);
CREATE INDEX IF NOT EXISTS idx_hindrances_notice_served ON public.hindrances(notice_served);

-- 3. Table: eot_applications (Extension of Time Form 27)
CREATE TABLE IF NOT EXISTS public.eot_applications (
  id                            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id               UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  project_id                    UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  application_number            TEXT NOT NULL,          -- e.g. 'EOT/PMGSY-02/01'
  stipulated_date_of_completion DATE NOT NULL,
  proposed_extended_date        DATE NOT NULL,
  total_days_sought             INT NOT NULL,
  clause_applied                TEXT NOT NULL DEFAULT 'Clause 5 (CPWD / PWD GCC)',
  compensable_days              INT NOT NULL DEFAULT 0,
  non_compensable_days          INT NOT NULL DEFAULT 0,
  justification                 TEXT NOT NULL,
  hindrance_ids                 UUID[] DEFAULT '{}',
  submission_date               DATE NOT NULL DEFAULT CURRENT_DATE,
  status                        public.eot_status NOT NULL DEFAULT 'draft',
  
  -- Sanction Details
  sanctioned_extended_date      DATE,
  sanctioned_authority          TEXT,                   -- e.g. 'Superintending Engineer, PWD Circle-I'
  sanction_order_number         TEXT,                   -- e.g. 'SE/R&B/TS/2026/891'
  ld_amount_deducted            NUMERIC(15,2) NOT NULL DEFAULT 0.00,
  
  remarks                       TEXT,
  created_by                    UUID REFERENCES auth.users(id),
  created_at                    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_eot_applications_project_id ON public.eot_applications(project_id);
CREATE INDEX IF NOT EXISTS idx_eot_applications_org_id ON public.eot_applications(organization_id);

-- 4. Enable Row Level Security (RLS)
ALTER TABLE public.hindrances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.eot_applications ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "hindrances_select_org" ON public.hindrances;
DROP POLICY IF EXISTS "hindrances_insert_org" ON public.hindrances;
DROP POLICY IF EXISTS "hindrances_update_org" ON public.hindrances;
DROP POLICY IF EXISTS "hindrances_delete_org" ON public.hindrances;

DROP POLICY IF EXISTS "eot_select_org" ON public.eot_applications;
DROP POLICY IF EXISTS "eot_insert_org" ON public.eot_applications;
DROP POLICY IF EXISTS "eot_update_org" ON public.eot_applications;
DROP POLICY IF EXISTS "eot_delete_org" ON public.eot_applications;

-- Hindrances RLS: Scoped by organization
CREATE POLICY "hindrances_select_org" ON public.hindrances
  FOR SELECT TO authenticated
  USING (
    organization_id = public.get_user_organization_id()
    OR public.get_user_role() IN ('owner', 'partner', 'managing_partner')
  );

CREATE POLICY "hindrances_insert_org" ON public.hindrances
  FOR INSERT TO authenticated
  WITH CHECK (
    organization_id = public.get_user_organization_id()
    AND public.get_user_role() IN ('owner', 'partner', 'managing_partner', 'site_supervisor')
  );

CREATE POLICY "hindrances_update_org" ON public.hindrances
  FOR UPDATE TO authenticated
  USING (
    organization_id = public.get_user_organization_id()
    AND public.get_user_role() IN ('owner', 'partner', 'managing_partner', 'site_supervisor')
  )
  WITH CHECK (
    organization_id = public.get_user_organization_id()
    AND public.get_user_role() IN ('owner', 'partner', 'managing_partner', 'site_supervisor')
  );

CREATE POLICY "hindrances_delete_org" ON public.hindrances
  FOR DELETE TO authenticated
  USING (
    organization_id = public.get_user_organization_id()
    AND public.get_user_role() IN ('owner', 'partner', 'managing_partner')
  );

-- EOT Applications RLS: Scoped by organization
CREATE POLICY "eot_select_org" ON public.eot_applications
  FOR SELECT TO authenticated
  USING (
    organization_id = public.get_user_organization_id()
    OR public.get_user_role() IN ('owner', 'partner', 'managing_partner', 'viewer')
  );

CREATE POLICY "eot_insert_org" ON public.eot_applications
  FOR INSERT TO authenticated
  WITH CHECK (
    organization_id = public.get_user_organization_id()
    AND public.get_user_role() IN ('owner', 'partner', 'managing_partner')
  );

CREATE POLICY "eot_update_org" ON public.eot_applications
  FOR UPDATE TO authenticated
  USING (
    organization_id = public.get_user_organization_id()
    AND public.get_user_role() IN ('owner', 'partner', 'managing_partner')
  )
  WITH CHECK (
    organization_id = public.get_user_organization_id()
    AND public.get_user_role() IN ('owner', 'partner', 'managing_partner')
  );

CREATE POLICY "eot_delete_org" ON public.eot_applications
  FOR DELETE TO authenticated
  USING (
    organization_id = public.get_user_organization_id()
    AND public.get_user_role() IN ('owner', 'partner', 'managing_partner')
  );

-- 5. Grant permissions to authenticated
GRANT SELECT, INSERT, UPDATE, DELETE ON public.hindrances TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.eot_applications TO authenticated;

