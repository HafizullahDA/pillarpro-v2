-- ============================================================
-- PillarPro v2 — Migration 008: RA Bill Tracker & Security Deposits
-- Supports government civil contract Running Account (RA) billing,
-- retention money tracking, and Security Deposit / Bank Guarantee monitoring.
-- Safe to run in Supabase SQL Editor (idempotent).
-- ============================================================

-- ──────────────────────────────────────────
-- 1. ENUMS
-- ──────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE public.ra_bill_status AS ENUM ('submitted', 'partially_paid', 'fully_paid');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.security_deposit_type AS ENUM (
    'security_deposit',
    'performance_bank_guarantee',
    'earnest_money_deposit',
    'additional_performance_security'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.security_deposit_status AS ENUM (
    'active',
    'released',
    'expired',
    'invoked'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ──────────────────────────────────────────
-- 2. TABLE: ra_bills
-- ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.ra_bills (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id       UUID,                                                 -- Multi-tenant scoping (nullable)
  project_id            UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  bill_number           TEXT NOT NULL,                                        -- e.g. 'RA Bill 01', 'RA Bill 02'
  submission_date       DATE NOT NULL DEFAULT CURRENT_DATE,
  work_certified_amount NUMERIC(15,2) NOT NULL CHECK (work_certified_amount > 0),
  retention_percentage  NUMERIC(5,2) NOT NULL DEFAULT 5.00 CHECK (retention_percentage >= 0 AND retention_percentage <= 100),
  
  -- Automatically calculated same-row stored columns:
  retention_amount      NUMERIC(15,2) GENERATED ALWAYS AS (ROUND((work_certified_amount * retention_percentage / 100.0), 2)) STORED,
  net_payable_amount    NUMERIC(15,2) GENERATED ALWAYS AS (work_certified_amount - ROUND((work_certified_amount * retention_percentage / 100.0), 2)) STORED,
  
  amount_received       NUMERIC(15,2) NOT NULL DEFAULT 0.00 CHECK (amount_received >= 0),
  date_received         DATE,                                                 -- Nullable: set when department releases payment
  outstanding_balance   NUMERIC(15,2) GENERATED ALWAYS AS (
    (work_certified_amount - ROUND((work_certified_amount * retention_percentage / 100.0), 2)) - amount_received
  ) STORED,
  
  status                public.ra_bill_status NOT NULL DEFAULT 'submitted',
  document_url          TEXT,                                                 -- Scanned measurement sheet / certified bill copy
  remarks               TEXT,
  created_by            UUID REFERENCES auth.users(id),
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  UNIQUE (project_id, bill_number)
);

-- Auto-update updated_at timestamp
DROP TRIGGER IF EXISTS trg_updated_at_ra_bills ON public.ra_bills;
CREATE TRIGGER trg_updated_at_ra_bills
  BEFORE UPDATE ON public.ra_bills
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Auto-sync status on insert or update of amount_received
CREATE OR REPLACE FUNCTION public.sync_ra_bill_status()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  v_net_payable NUMERIC;
BEGIN
  v_net_payable := NEW.work_certified_amount - ROUND((NEW.work_certified_amount * NEW.retention_percentage / 100.0), 2);
  IF NEW.amount_received >= v_net_payable THEN
    NEW.status := 'fully_paid';
  ELSIF NEW.amount_received > 0 THEN
    NEW.status := 'partially_paid';
  ELSE
    NEW.status := 'submitted';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_ra_bill_status ON public.ra_bills;
CREATE TRIGGER trg_sync_ra_bill_status
  BEFORE INSERT OR UPDATE OF amount_received, work_certified_amount ON public.ra_bills
  FOR EACH ROW EXECUTE FUNCTION public.sync_ra_bill_status();

-- ──────────────────────────────────────────
-- 3. TABLE: security_deposits
-- ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.security_deposits (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id    UUID,                                                 -- Multi-tenant scoping (nullable)
  project_id         UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  deposit_type       public.security_deposit_type NOT NULL DEFAULT 'performance_bank_guarantee',
  reference_number   TEXT NOT NULL,                                        -- BG Number / FDR Receipt Number
  issuing_bank       TEXT,                                                 -- SBI / PNB / HDFC etc.
  amount             NUMERIC(15,2) NOT NULL CHECK (amount > 0),
  issue_date         DATE,
  expiry_date        DATE NOT NULL,                                        -- Crucial: renewal / release tracking
  claim_expiry_date  DATE,                                                 -- Department claim period validity
  status             public.security_deposit_status NOT NULL DEFAULT 'active',
  release_date       DATE,                                                 -- Date released by the department
  document_url       TEXT,                                                 -- Scan of BG / FDR document
  notes              TEXT,
  created_by         UUID REFERENCES auth.users(id),
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Auto-update updated_at timestamp
DROP TRIGGER IF EXISTS trg_updated_at_security_deposits ON public.security_deposits;
CREATE TRIGGER trg_updated_at_security_deposits
  BEFORE UPDATE ON public.security_deposits
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ──────────────────────────────────────────
-- 4. PERFORMANCE INDEXES
-- ──────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_ra_bills_project_id      ON public.ra_bills(project_id);
CREATE INDEX IF NOT EXISTS idx_ra_bills_status          ON public.ra_bills(status);
CREATE INDEX IF NOT EXISTS idx_ra_bills_submission_date ON public.ra_bills(submission_date);

CREATE INDEX IF NOT EXISTS idx_security_deposits_project_id  ON public.security_deposits(project_id);
CREATE INDEX IF NOT EXISTS idx_security_deposits_expiry_date ON public.security_deposits(expiry_date);
CREATE INDEX IF NOT EXISTS idx_security_deposits_status      ON public.security_deposits(status);

-- ──────────────────────────────────────────
-- 5. PROJECT RA BILL SUMMARY VIEW
-- Provides instant metrics per project:
-- total certified, total retention withheld, total received, total outstanding,
-- and total active security deposits / bank guarantees.
-- ──────────────────────────────────────────
CREATE OR REPLACE VIEW public.project_ra_summary AS
SELECT
  p.id AS project_id,
  p.name AS project_name,
  p.agency_name,
  p.awarded_amount,
  
  -- RA Bill Aggregations
  COUNT(b.id) AS total_bills_submitted,
  COALESCE(SUM(b.work_certified_amount), 0)::NUMERIC(15,2) AS total_certified_amount,
  COALESCE(SUM(b.retention_amount), 0)::NUMERIC(15,2)      AS total_retention_withheld,
  COALESCE(SUM(b.net_payable_amount), 0)::NUMERIC(15,2)    AS total_net_payable,
  COALESCE(SUM(b.amount_received), 0)::NUMERIC(15,2)       AS total_amount_received,
  COALESCE(SUM(b.outstanding_balance), 0)::NUMERIC(15,2)   AS total_outstanding_balance,
  
  -- Security Deposits / Guarantees Active
  COALESCE((
    SELECT SUM(sd.amount)
    FROM public.security_deposits sd
    WHERE sd.project_id = p.id AND sd.status = 'active'
  ), 0)::NUMERIC(15,2) AS total_active_security_deposits,

  -- Count of BGs expiring within 30 days
  COALESCE((
    SELECT COUNT(*)
    FROM public.security_deposits sd
    WHERE sd.project_id = p.id
      AND sd.status = 'active'
      AND sd.expiry_date <= (CURRENT_DATE + INTERVAL '30 days')
  ), 0)::INT AS bgs_expiring_soon

FROM public.projects p
LEFT JOIN public.ra_bills b ON b.project_id = p.id
GROUP BY p.id, p.name, p.agency_name, p.awarded_amount;

-- ──────────────────────────────────────────
-- 6. GRANTS FOR AUTHENTICATED ROLE
-- ──────────────────────────────────────────
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ra_bills TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.security_deposits TO authenticated;
GRANT SELECT ON public.project_ra_summary TO authenticated;

-- ──────────────────────────────────────────
-- 7. ROW LEVEL SECURITY (RLS)
-- ──────────────────────────────────────────
ALTER TABLE public.ra_bills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.security_deposits ENABLE ROW LEVEL SECURITY;

-- --- ra_bills policies ---

-- Owners and Managing Partners have full access to all RA bills
DROP POLICY IF EXISTS "ra_bills_all_owner_partner" ON public.ra_bills;
CREATE POLICY "ra_bills_all_owner_partner" ON public.ra_bills
  FOR ALL TO authenticated
  USING (public.get_user_role() IN ('owner', 'managing_partner'));

-- Site Supervisors can view RA bills only for projects they are assigned to
DROP POLICY IF EXISTS "ra_bills_select_supervisor" ON public.ra_bills;
CREATE POLICY "ra_bills_select_supervisor" ON public.ra_bills
  FOR SELECT TO authenticated
  USING (
    public.get_user_role() = 'site_supervisor'
    AND public.user_has_project_access(project_id)
  );

-- Site Supervisors can submit RA bills for their assigned projects
DROP POLICY IF EXISTS "ra_bills_insert_supervisor" ON public.ra_bills;
CREATE POLICY "ra_bills_insert_supervisor" ON public.ra_bills
  FOR INSERT TO authenticated
  WITH CHECK (
    public.get_user_role() = 'site_supervisor'
    AND public.user_has_project_access(project_id)
  );

-- --- security_deposits policies ---

-- Owners and Managing Partners have full access to Security Deposits & BGs
DROP POLICY IF EXISTS "sec_dep_all_owner_partner" ON public.security_deposits;
CREATE POLICY "sec_dep_all_owner_partner" ON public.security_deposits
  FOR ALL TO authenticated
  USING (public.get_user_role() IN ('owner', 'managing_partner'));

-- Site Supervisors can view Security Deposits for projects they are assigned to
DROP POLICY IF EXISTS "sec_dep_select_supervisor" ON public.security_deposits;
CREATE POLICY "sec_dep_select_supervisor" ON public.security_deposits
  FOR SELECT TO authenticated
  USING (
    public.get_user_role() = 'site_supervisor'
    AND public.user_has_project_access(project_id)
  );

