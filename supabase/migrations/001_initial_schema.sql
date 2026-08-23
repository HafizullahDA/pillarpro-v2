-- ============================================================
-- PillarPro v2 — Migration 001: Initial Schema
-- Run in Supabase SQL Editor (Dashboard → SQL Editor → New query)
-- ============================================================

-- ──────────────────────────────────────────
-- EXTENSIONS
-- ──────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ──────────────────────────────────────────
-- ENUM TYPES
-- ──────────────────────────────────────────

CREATE TYPE public.user_role AS ENUM (
  'owner',
  'managing_partner',
  'site_supervisor'
);

CREATE TYPE public.user_status AS ENUM (
  'pending',
  'active',
  'suspended'
);

CREATE TYPE public.project_status AS ENUM (
  'active',
  'completed',
  'on_hold'
);

CREATE TYPE public.bill_type AS ENUM (
  'RA Bill',
  'Final Bill',
  'Advance',
  'Mobilization Bill'
);

CREATE TYPE public.payment_mode AS ENUM (
  'cash',
  'bank_transfer',
  'cheque',
  'upi',
  'other'
);

CREATE TYPE public.partner_transaction_type AS ENUM (
  'paid_by_partner',      -- partner put money in (increases balance)
  'received_by_partner'   -- partner took money out (decreases balance)
);

CREATE TYPE public.partner_purpose AS ENUM (
  'capital_contribution',
  'profit_draw',
  'reimbursement',
  'other'
);

CREATE TYPE public.ledger_entry_type AS ENUM (
  'income',
  'expense',
  'payment_to_vendor',
  'partner_movement'
);

CREATE TYPE public.expense_category AS ENUM (
  'labor',
  'material',
  'equipment',
  'transport',
  'fuel',
  'admin',
  'tendering',
  'other'
);

-- ──────────────────────────────────────────
-- user_profiles
-- Extends auth.users — stores status and display name.
-- ──────────────────────────────────────────
CREATE TABLE public.user_profiles (
  id           UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  status       public.user_status NOT NULL DEFAULT 'pending',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Auto-create a profile row on sign-up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.user_profiles (id, display_name, status)
  VALUES (
    NEW.id,
    COALESCE(
      NEW.raw_user_meta_data->>'display_name',
      split_part(NEW.email, '@', 1)
    ),
    'pending'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ──────────────────────────────────────────
-- roles
-- One row per user; project_id=NULL means "all projects" (Owner/Partner).
-- ──────────────────────────────────────────
CREATE TABLE public.roles (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role       public.user_role NOT NULL,
  project_id UUID,  -- NULL = all projects
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id)
);

-- ──────────────────────────────────────────
-- projects
-- ──────────────────────────────────────────
CREATE TABLE public.projects (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name             TEXT NOT NULL,
  agency_name      TEXT NOT NULL,
  advertised_cost  NUMERIC(15,2),
  awarded_amount   NUMERIC(15,2),
  start_date       DATE,
  end_date         DATE,
  status           public.project_status NOT NULL DEFAULT 'active',
  award_letter_url TEXT,   -- Supabase Storage URL
  created_by       UUID REFERENCES auth.users(id),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ──────────────────────────────────────────
-- project_members
-- Links site_supervisors to their specific projects.
-- ──────────────────────────────────────────
CREATE TABLE public.project_members (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (project_id, user_id)
);

-- ──────────────────────────────────────────
-- workers  (Employee / Worker master)
-- ──────────────────────────────────────────
CREATE TABLE public.workers (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            TEXT NOT NULL,
  trade           TEXT,           -- Mason / Carpenter / Helper / Supervisor
  daily_wage_rate NUMERIC(10,2)  NOT NULL DEFAULT 0,
  phone           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ──────────────────────────────────────────
-- worker_project_assignments  (Many-to-many)
-- ──────────────────────────────────────────
CREATE TABLE public.worker_project_assignments (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  worker_id  UUID NOT NULL REFERENCES public.workers(id)  ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (worker_id, project_id)
);

-- ──────────────────────────────────────────
-- vendors
-- ──────────────────────────────────────────
CREATE TABLE public.vendors (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id     UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  name           TEXT NOT NULL,
  contact_person TEXT,
  phone          TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ──────────────────────────────────────────
-- vendor_purchases
-- INSERT → triggers a ledger entry automatically.
-- ──────────────────────────────────────────
CREATE TABLE public.vendor_purchases (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id  UUID NOT NULL REFERENCES public.vendors(id)  ON DELETE RESTRICT,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  material   TEXT NOT NULL,
  quantity   NUMERIC(10,3) NOT NULL,
  unit       TEXT NOT NULL DEFAULT 'nos',  -- bags/kg/tonnes/nos/m3/etc.
  rate       NUMERIC(10,2) NOT NULL,
  amount     NUMERIC(15,2) GENERATED ALWAYS AS (quantity * rate) STORED,
  date       DATE NOT NULL DEFAULT CURRENT_DATE,
  notes      TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ──────────────────────────────────────────
-- vendor_payments
-- INSERT → triggers a ledger entry automatically.
-- ──────────────────────────────────────────
CREATE TABLE public.vendor_payments (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id  UUID NOT NULL REFERENCES public.vendors(id)  ON DELETE RESTRICT,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  amount     NUMERIC(15,2) NOT NULL,
  mode       public.payment_mode NOT NULL DEFAULT 'cash',
  reference  TEXT,
  date       DATE NOT NULL DEFAULT CURRENT_DATE,
  notes      TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ──────────────────────────────────────────
-- attendance
-- Day-by-day per worker per project.
-- ──────────────────────────────────────────
CREATE TABLE public.attendance (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  worker_id  UUID NOT NULL REFERENCES public.workers(id)  ON DELETE RESTRICT,
  date       DATE NOT NULL,
  present    BOOLEAN NOT NULL DEFAULT TRUE,
  notes      TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (project_id, worker_id, date)
);

-- ──────────────────────────────────────────
-- bills  (Receivable bills)
-- ──────────────────────────────────────────
CREATE TABLE public.bills (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id   UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  bill_number  TEXT NOT NULL,
  bill_type    public.bill_type NOT NULL,
  bill_date    DATE NOT NULL,
  gross_amount NUMERIC(15,2) NOT NULL,
  deductions   NUMERIC(15,2) NOT NULL DEFAULT 0,
  net_amount   NUMERIC(15,2) GENERATED ALWAYS AS (gross_amount - deductions) STORED,
  document_url TEXT,   -- Supabase Storage URL
  notes        TEXT,
  created_by   UUID REFERENCES auth.users(id),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ──────────────────────────────────────────
-- receivable_payments
-- Payments received against bills → ledger entry.
-- ──────────────────────────────────────────
CREATE TABLE public.receivable_payments (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bill_id         UUID NOT NULL REFERENCES public.bills(id)    ON DELETE RESTRICT,
  project_id      UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  amount_received NUMERIC(15,2) NOT NULL,
  date            DATE NOT NULL DEFAULT CURRENT_DATE,
  mode            public.payment_mode NOT NULL DEFAULT 'bank_transfer',
  reference       TEXT,
  notes           TEXT,
  created_by      UUID REFERENCES auth.users(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ──────────────────────────────────────────
-- partners
-- ──────────────────────────────────────────
CREATE TABLE public.partners (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            TEXT NOT NULL,
  opening_balance NUMERIC(15,2) NOT NULL DEFAULT 0,
  -- Positive = partner paid in more; Negative = partner took out more
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ──────────────────────────────────────────
-- partner_transactions
-- project_id is nullable (NULL = firm-level, not tied to one site).
-- ──────────────────────────────────────────
CREATE TABLE public.partner_transactions (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id       UUID NOT NULL REFERENCES public.partners(id) ON DELETE RESTRICT,
  project_id       UUID REFERENCES public.projects(id) ON DELETE CASCADE,  -- nullable
  transaction_type public.partner_transaction_type NOT NULL,
  purpose          public.partner_purpose NOT NULL DEFAULT 'other',
  amount           NUMERIC(15,2) NOT NULL,
  date             DATE NOT NULL DEFAULT CURRENT_DATE,
  mode             public.payment_mode NOT NULL DEFAULT 'cash',
  reference        TEXT,
  notes            TEXT,
  created_by       UUID REFERENCES auth.users(id),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ──────────────────────────────────────────
-- expenses  (Misc)
-- ──────────────────────────────────────────
CREATE TABLE public.expenses (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id  UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  category    public.expense_category NOT NULL DEFAULT 'other',
  amount      NUMERIC(15,2) NOT NULL,
  date        DATE NOT NULL DEFAULT CURRENT_DATE,
  description TEXT,
  mode        public.payment_mode NOT NULL DEFAULT 'cash',
  reference   TEXT,
  receipt_url TEXT,  -- Supabase Storage URL
  created_by  UUID REFERENCES auth.users(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ──────────────────────────────────────────
-- ledger  (Central source of truth)
-- Written to exclusively via triggers from financial tables.
-- ──────────────────────────────────────────
CREATE TABLE public.ledger (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id  UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  entry_type  public.ledger_entry_type NOT NULL,
  category    public.expense_category,
  amount      NUMERIC(15,2) NOT NULL,
  date        DATE NOT NULL,
  source_table TEXT NOT NULL,   -- originating table name
  source_id    UUID NOT NULL,   -- originating row id
  description  TEXT,
  created_by   UUID REFERENCES auth.users(id),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ──────────────────────────────────────────
-- ledger_periods
-- Month-close tracking. Once closed_at IS NOT NULL, non-Owner writes blocked.
-- ──────────────────────────────────────────
CREATE TABLE public.ledger_periods (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id   UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  period_year  INT NOT NULL,
  period_month INT NOT NULL CHECK (period_month BETWEEN 1 AND 12),
  closed_at    TIMESTAMPTZ,   -- NULL = open
  closed_by    UUID REFERENCES auth.users(id),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (project_id, period_year, period_month)
);

-- ══════════════════════════════════════════
-- LEDGER TRIGGER FUNCTIONS
-- Each financial table INSERT writes to ledger automatically.
-- ══════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.ledger_from_vendor_purchase()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.ledger
    (project_id, entry_type, category, amount, date, source_table, source_id, description, created_by)
  VALUES
    (NEW.project_id, 'expense', 'material', NEW.amount, NEW.date,
     'vendor_purchases', NEW.id, 'Purchase: ' || NEW.material, NEW.created_by);
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_ledger_vendor_purchase
  AFTER INSERT ON public.vendor_purchases
  FOR EACH ROW EXECUTE FUNCTION public.ledger_from_vendor_purchase();

-- ─────

CREATE OR REPLACE FUNCTION public.ledger_from_vendor_payment()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.ledger
    (project_id, entry_type, amount, date, source_table, source_id, description, created_by)
  VALUES
    (NEW.project_id, 'payment_to_vendor', NEW.amount, NEW.date,
     'vendor_payments', NEW.id, 'Vendor payment (' || NEW.mode::TEXT || ')', NEW.created_by);
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_ledger_vendor_payment
  AFTER INSERT ON public.vendor_payments
  FOR EACH ROW EXECUTE FUNCTION public.ledger_from_vendor_payment();

-- ─────

CREATE OR REPLACE FUNCTION public.ledger_from_receivable_payment()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.ledger
    (project_id, entry_type, amount, date, source_table, source_id, description, created_by)
  VALUES
    (NEW.project_id, 'income', NEW.amount_received, NEW.date,
     'receivable_payments', NEW.id, 'Payment received (' || NEW.mode::TEXT || ')', NEW.created_by);
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_ledger_receivable_payment
  AFTER INSERT ON public.receivable_payments
  FOR EACH ROW EXECUTE FUNCTION public.ledger_from_receivable_payment();

-- ─────

CREATE OR REPLACE FUNCTION public.ledger_from_partner_transaction()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.ledger
    (project_id, entry_type, amount, date, source_table, source_id, description, created_by)
  VALUES
    (NEW.project_id, 'partner_movement', NEW.amount, NEW.date,
     'partner_transactions', NEW.id,
     NEW.transaction_type::TEXT || ' — ' || NEW.purpose::TEXT,
     NEW.created_by);
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_ledger_partner_transaction
  AFTER INSERT ON public.partner_transactions
  FOR EACH ROW EXECUTE FUNCTION public.ledger_from_partner_transaction();

-- ─────

CREATE OR REPLACE FUNCTION public.ledger_from_expense()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.ledger
    (project_id, entry_type, category, amount, date, source_table, source_id, description, created_by)
  VALUES
    (NEW.project_id, 'expense', NEW.category, NEW.amount, NEW.date,
     'expenses', NEW.id, COALESCE(NEW.description, NEW.category::TEXT), NEW.created_by);
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_ledger_expense
  AFTER INSERT ON public.expenses
  FOR EACH ROW EXECUTE FUNCTION public.ledger_from_expense();

-- ══════════════════════════════════════════
-- UPDATED_AT HELPER
-- ══════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_updated_at_user_profiles BEFORE UPDATE ON public.user_profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_updated_at_projects      BEFORE UPDATE ON public.projects      FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_updated_at_workers       BEFORE UPDATE ON public.workers       FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_updated_at_vendors       BEFORE UPDATE ON public.vendors       FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_updated_at_bills         BEFORE UPDATE ON public.bills         FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_updated_at_partners      BEFORE UPDATE ON public.partners      FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
