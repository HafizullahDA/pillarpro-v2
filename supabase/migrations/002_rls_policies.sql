-- ============================================================
-- PillarPro v2 — Migration 002: Row Level Security Policies
-- Run AFTER 001_initial_schema.sql
-- Idempotent — safe to re-run at any time.
-- ============================================================

-- ══════════════════════════════════════════
-- HELPER FUNCTIONS  (CREATE OR REPLACE = already idempotent)
-- ══════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS TEXT LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT role::TEXT FROM public.roles WHERE user_id = auth.uid()
$$;

CREATE OR REPLACE FUNCTION public.get_user_status()
RETURNS TEXT LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT status::TEXT FROM public.user_profiles WHERE id = auth.uid()
$$;

CREATE OR REPLACE FUNCTION public.user_has_project_access(p_project_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT CASE
    WHEN (SELECT role FROM public.roles WHERE user_id = auth.uid())
         IN ('owner', 'managing_partner')
    THEN TRUE
    ELSE EXISTS (
      SELECT 1 FROM public.project_members
      WHERE project_id = p_project_id AND user_id = auth.uid()
    )
  END
$$;

CREATE OR REPLACE FUNCTION public.is_period_closed(p_project_id UUID, p_date DATE)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.ledger_periods
    WHERE project_id  = p_project_id
      AND period_year  = EXTRACT(YEAR  FROM p_date)::INT
      AND period_month = EXTRACT(MONTH FROM p_date)::INT
      AND closed_at IS NOT NULL
  )
$$;

-- ══════════════════════════════════════════
-- ENABLE RLS  (idempotent)
-- ══════════════════════════════════════════

ALTER TABLE public.user_profiles             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roles                     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_members           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workers                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.worker_project_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendors                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendor_purchases          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendor_payments           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bills                     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.receivable_payments       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partners                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_transactions      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ledger                    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ledger_periods            ENABLE ROW LEVEL SECURITY;

-- ══════════════════════════════════════════
-- user_profiles
-- ══════════════════════════════════════════

DROP POLICY IF EXISTS "profiles_select_own"   ON public.user_profiles;
DROP POLICY IF EXISTS "profiles_select_owner" ON public.user_profiles;
DROP POLICY IF EXISTS "profiles_insert_own"   ON public.user_profiles;
DROP POLICY IF EXISTS "profiles_update_own"   ON public.user_profiles;
DROP POLICY IF EXISTS "profiles_update_owner" ON public.user_profiles;

CREATE POLICY "profiles_select_own" ON public.user_profiles
  FOR SELECT TO authenticated USING (id = auth.uid());

CREATE POLICY "profiles_select_owner" ON public.user_profiles
  FOR SELECT TO authenticated USING (public.get_user_role() = 'owner');

CREATE POLICY "profiles_insert_own" ON public.user_profiles
  FOR INSERT TO authenticated WITH CHECK (id = auth.uid());

CREATE POLICY "profiles_update_own" ON public.user_profiles
  FOR UPDATE TO authenticated USING (id = auth.uid());

CREATE POLICY "profiles_update_owner" ON public.user_profiles
  FOR UPDATE TO authenticated USING (public.get_user_role() = 'owner');

-- ══════════════════════════════════════════
-- roles
-- ══════════════════════════════════════════

DROP POLICY IF EXISTS "roles_select_own"   ON public.roles;
DROP POLICY IF EXISTS "roles_select_owner" ON public.roles;
DROP POLICY IF EXISTS "roles_insert_owner" ON public.roles;
DROP POLICY IF EXISTS "roles_update_owner" ON public.roles;
DROP POLICY IF EXISTS "roles_delete_owner" ON public.roles;

CREATE POLICY "roles_select_own" ON public.roles
  FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE POLICY "roles_select_owner" ON public.roles
  FOR SELECT TO authenticated USING (public.get_user_role() = 'owner');

CREATE POLICY "roles_insert_owner" ON public.roles
  FOR INSERT TO authenticated WITH CHECK (public.get_user_role() = 'owner');

CREATE POLICY "roles_update_owner" ON public.roles
  FOR UPDATE TO authenticated USING (public.get_user_role() = 'owner');

CREATE POLICY "roles_delete_owner" ON public.roles
  FOR DELETE TO authenticated USING (public.get_user_role() = 'owner');

-- ══════════════════════════════════════════
-- projects
-- ══════════════════════════════════════════

DROP POLICY IF EXISTS "projects_select_owner_partner" ON public.projects;
DROP POLICY IF EXISTS "projects_select_supervisor"    ON public.projects;
DROP POLICY IF EXISTS "projects_insert_owner"         ON public.projects;
DROP POLICY IF EXISTS "projects_update_owner"         ON public.projects;
DROP POLICY IF EXISTS "projects_update_partner"       ON public.projects;
DROP POLICY IF EXISTS "projects_delete_owner"         ON public.projects;

CREATE POLICY "projects_select_owner_partner" ON public.projects
  FOR SELECT TO authenticated
  USING (public.get_user_role() IN ('owner', 'managing_partner'));

CREATE POLICY "projects_select_supervisor" ON public.projects
  FOR SELECT TO authenticated
  USING (
    public.get_user_role() = 'site_supervisor'
    AND public.user_has_project_access(id)
  );

CREATE POLICY "projects_insert_owner" ON public.projects
  FOR INSERT TO authenticated WITH CHECK (public.get_user_role() = 'owner');

CREATE POLICY "projects_update_owner" ON public.projects
  FOR UPDATE TO authenticated USING (public.get_user_role() = 'owner');

CREATE POLICY "projects_update_partner" ON public.projects
  FOR UPDATE TO authenticated USING (public.get_user_role() = 'managing_partner');

CREATE POLICY "projects_delete_owner" ON public.projects
  FOR DELETE TO authenticated USING (public.get_user_role() = 'owner');

CREATE OR REPLACE FUNCTION public.guard_project_core_fields()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF public.get_user_role() = 'managing_partner' THEN
    IF (OLD.agency_name     IS DISTINCT FROM NEW.agency_name)     OR
       (OLD.advertised_cost IS DISTINCT FROM NEW.advertised_cost) OR
       (OLD.awarded_amount  IS DISTINCT FROM NEW.awarded_amount)  THEN
      RAISE EXCEPTION
        'Managing Partners cannot edit core project fields (agency, advertised cost, awarded amount).';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_project_core_fields ON public.projects;
CREATE TRIGGER trg_guard_project_core_fields
  BEFORE UPDATE ON public.projects
  FOR EACH ROW EXECUTE FUNCTION public.guard_project_core_fields();

-- ══════════════════════════════════════════
-- project_members
-- ══════════════════════════════════════════

DROP POLICY IF EXISTS "project_members_all_owner"      ON public.project_members;
DROP POLICY IF EXISTS "project_members_select_partner" ON public.project_members;
DROP POLICY IF EXISTS "project_members_select_own"     ON public.project_members;

CREATE POLICY "project_members_all_owner" ON public.project_members
  FOR ALL TO authenticated USING (public.get_user_role() = 'owner');

CREATE POLICY "project_members_select_partner" ON public.project_members
  FOR SELECT TO authenticated USING (public.get_user_role() = 'managing_partner');

CREATE POLICY "project_members_select_own" ON public.project_members
  FOR SELECT TO authenticated USING (user_id = auth.uid());

-- ══════════════════════════════════════════
-- workers
-- ══════════════════════════════════════════

DROP POLICY IF EXISTS "workers_select_owner_partner" ON public.workers;
DROP POLICY IF EXISTS "workers_select_supervisor"    ON public.workers;
DROP POLICY IF EXISTS "workers_insert_owner_partner" ON public.workers;
DROP POLICY IF EXISTS "workers_update_owner_partner" ON public.workers;
DROP POLICY IF EXISTS "workers_delete_owner"         ON public.workers;

CREATE POLICY "workers_select_owner_partner" ON public.workers
  FOR SELECT TO authenticated
  USING (public.get_user_role() IN ('owner', 'managing_partner'));

CREATE POLICY "workers_select_supervisor" ON public.workers
  FOR SELECT TO authenticated
  USING (
    public.get_user_role() = 'site_supervisor'
    AND EXISTS (
      SELECT 1
      FROM   public.worker_project_assignments wpa
      JOIN   public.project_members pm ON pm.project_id = wpa.project_id
      WHERE  wpa.worker_id = workers.id
        AND  pm.user_id = auth.uid()
    )
  );

CREATE POLICY "workers_insert_owner_partner" ON public.workers
  FOR INSERT TO authenticated
  WITH CHECK (public.get_user_role() IN ('owner', 'managing_partner'));

CREATE POLICY "workers_update_owner_partner" ON public.workers
  FOR UPDATE TO authenticated
  USING (public.get_user_role() IN ('owner', 'managing_partner'));

CREATE POLICY "workers_delete_owner" ON public.workers
  FOR DELETE TO authenticated USING (public.get_user_role() = 'owner');

-- ══════════════════════════════════════════
-- worker_project_assignments
-- ══════════════════════════════════════════

DROP POLICY IF EXISTS "wpa_all_owner_partner" ON public.worker_project_assignments;
DROP POLICY IF EXISTS "wpa_select_supervisor" ON public.worker_project_assignments;

CREATE POLICY "wpa_all_owner_partner" ON public.worker_project_assignments
  FOR ALL TO authenticated
  USING (public.get_user_role() IN ('owner', 'managing_partner'));

CREATE POLICY "wpa_select_supervisor" ON public.worker_project_assignments
  FOR SELECT TO authenticated
  USING (
    public.get_user_role() = 'site_supervisor'
    AND public.user_has_project_access(project_id)
  );

-- ══════════════════════════════════════════
-- vendors  (supervisors have NO access)
-- ══════════════════════════════════════════

DROP POLICY IF EXISTS "vendors_all_owner_partner" ON public.vendors;
CREATE POLICY "vendors_all_owner_partner" ON public.vendors
  FOR ALL TO authenticated
  USING (public.get_user_role() IN ('owner', 'managing_partner'));

-- ══════════════════════════════════════════
-- vendor_purchases  +  period closure guard
-- ══════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.guard_period_vendor_purchase()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF public.get_user_role() <> 'owner'
     AND public.is_period_closed(NEW.project_id, NEW.date) THEN
    RAISE EXCEPTION 'This accounting period is closed. Only the Owner can add entries.';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_period_vendor_purchase ON public.vendor_purchases;
CREATE TRIGGER trg_period_vendor_purchase
  BEFORE INSERT ON public.vendor_purchases
  FOR EACH ROW EXECUTE FUNCTION public.guard_period_vendor_purchase();

DROP POLICY IF EXISTS "vendor_purchases_all_owner_partner" ON public.vendor_purchases;
CREATE POLICY "vendor_purchases_all_owner_partner" ON public.vendor_purchases
  FOR ALL TO authenticated
  USING (public.get_user_role() IN ('owner', 'managing_partner'));

-- ══════════════════════════════════════════
-- vendor_payments  +  period closure guard
-- ══════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.guard_period_vendor_payment()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF public.get_user_role() <> 'owner'
     AND public.is_period_closed(NEW.project_id, NEW.date) THEN
    RAISE EXCEPTION 'This accounting period is closed. Only the Owner can add entries.';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_period_vendor_payment ON public.vendor_payments;
CREATE TRIGGER trg_period_vendor_payment
  BEFORE INSERT ON public.vendor_payments
  FOR EACH ROW EXECUTE FUNCTION public.guard_period_vendor_payment();

DROP POLICY IF EXISTS "vendor_payments_all_owner_partner" ON public.vendor_payments;
CREATE POLICY "vendor_payments_all_owner_partner" ON public.vendor_payments
  FOR ALL TO authenticated
  USING (public.get_user_role() IN ('owner', 'managing_partner'));

-- ══════════════════════════════════════════
-- attendance  +  period closure guard  +  edit-window guard
-- ══════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.guard_period_attendance()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF public.get_user_role() <> 'owner'
     AND public.is_period_closed(NEW.project_id, NEW.date) THEN
    RAISE EXCEPTION 'This accounting period is closed. Only the Owner can add entries.';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_period_attendance ON public.attendance;
CREATE TRIGGER trg_period_attendance
  BEFORE INSERT ON public.attendance
  FOR EACH ROW EXECUTE FUNCTION public.guard_period_attendance();

CREATE OR REPLACE FUNCTION public.guard_attendance_edit_window()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF public.get_user_role() = 'site_supervisor'
     AND OLD.date < CURRENT_DATE THEN
    RAISE EXCEPTION 'Supervisors cannot edit attendance after the same day.';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_attendance_edit_window ON public.attendance;
CREATE TRIGGER trg_attendance_edit_window
  BEFORE UPDATE OR DELETE ON public.attendance
  FOR EACH ROW EXECUTE FUNCTION public.guard_attendance_edit_window();

DROP POLICY IF EXISTS "attendance_insert_supervisor" ON public.attendance;
DROP POLICY IF EXISTS "attendance_select_supervisor" ON public.attendance;
DROP POLICY IF EXISTS "attendance_all_owner_partner" ON public.attendance;

CREATE POLICY "attendance_insert_supervisor" ON public.attendance
  FOR INSERT TO authenticated
  WITH CHECK (
    public.get_user_role() = 'site_supervisor'
    AND public.user_has_project_access(project_id)
  );

CREATE POLICY "attendance_select_supervisor" ON public.attendance
  FOR SELECT TO authenticated
  USING (
    public.get_user_role() = 'site_supervisor'
    AND public.user_has_project_access(project_id)
  );

CREATE POLICY "attendance_all_owner_partner" ON public.attendance
  FOR ALL TO authenticated
  USING (public.get_user_role() IN ('owner', 'managing_partner'));

-- ══════════════════════════════════════════
-- bills
-- ══════════════════════════════════════════

DROP POLICY IF EXISTS "bills_all_owner_partner" ON public.bills;
CREATE POLICY "bills_all_owner_partner" ON public.bills
  FOR ALL TO authenticated
  USING (public.get_user_role() IN ('owner', 'managing_partner'));

-- ══════════════════════════════════════════
-- receivable_payments  +  period closure guard
-- ══════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.guard_period_receivable()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF public.get_user_role() <> 'owner'
     AND public.is_period_closed(NEW.project_id, NEW.date) THEN
    RAISE EXCEPTION 'This accounting period is closed. Only the Owner can add entries.';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_period_receivable ON public.receivable_payments;
CREATE TRIGGER trg_period_receivable
  BEFORE INSERT ON public.receivable_payments
  FOR EACH ROW EXECUTE FUNCTION public.guard_period_receivable();

DROP POLICY IF EXISTS "receivable_payments_all_owner_partner" ON public.receivable_payments;
CREATE POLICY "receivable_payments_all_owner_partner" ON public.receivable_payments
  FOR ALL TO authenticated
  USING (public.get_user_role() IN ('owner', 'managing_partner'));

-- ══════════════════════════════════════════
-- partners
-- ══════════════════════════════════════════

DROP POLICY IF EXISTS "partners_all_owner_partner" ON public.partners;
CREATE POLICY "partners_all_owner_partner" ON public.partners
  FOR ALL TO authenticated
  USING (public.get_user_role() IN ('owner', 'managing_partner'));

-- ══════════════════════════════════════════
-- partner_transactions  +  period closure guard
-- ══════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.guard_period_partner_tx()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.project_id IS NOT NULL
     AND public.get_user_role() <> 'owner'
     AND public.is_period_closed(NEW.project_id, NEW.date) THEN
    RAISE EXCEPTION 'This accounting period is closed. Only the Owner can add entries.';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_period_partner_tx ON public.partner_transactions;
CREATE TRIGGER trg_period_partner_tx
  BEFORE INSERT ON public.partner_transactions
  FOR EACH ROW EXECUTE FUNCTION public.guard_period_partner_tx();

DROP POLICY IF EXISTS "partner_tx_all_owner_partner" ON public.partner_transactions;
CREATE POLICY "partner_tx_all_owner_partner" ON public.partner_transactions
  FOR ALL TO authenticated
  USING (public.get_user_role() IN ('owner', 'managing_partner'));

-- ══════════════════════════════════════════
-- expenses  +  period closure guard  +  edit-window guard
-- ══════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.guard_period_expense()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF public.get_user_role() <> 'owner'
     AND public.is_period_closed(NEW.project_id, NEW.date) THEN
    RAISE EXCEPTION 'This accounting period is closed. Only the Owner can add entries.';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_period_expense ON public.expenses;
CREATE TRIGGER trg_period_expense
  BEFORE INSERT ON public.expenses
  FOR EACH ROW EXECUTE FUNCTION public.guard_period_expense();

CREATE OR REPLACE FUNCTION public.guard_expense_edit_window()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF public.get_user_role() = 'site_supervisor'
     AND OLD.created_at::DATE < CURRENT_DATE THEN
    RAISE EXCEPTION 'Supervisors cannot edit expenses after the same day.';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_expense_edit_window ON public.expenses;
CREATE TRIGGER trg_expense_edit_window
  BEFORE UPDATE OR DELETE ON public.expenses
  FOR EACH ROW EXECUTE FUNCTION public.guard_expense_edit_window();

DROP POLICY IF EXISTS "expenses_insert_supervisor" ON public.expenses;
DROP POLICY IF EXISTS "expenses_select_supervisor" ON public.expenses;
DROP POLICY IF EXISTS "expenses_all_owner_partner" ON public.expenses;

CREATE POLICY "expenses_insert_supervisor" ON public.expenses
  FOR INSERT TO authenticated
  WITH CHECK (
    public.get_user_role() = 'site_supervisor'
    AND public.user_has_project_access(project_id)
  );

CREATE POLICY "expenses_select_supervisor" ON public.expenses
  FOR SELECT TO authenticated
  USING (
    public.get_user_role() = 'site_supervisor'
    AND public.user_has_project_access(project_id)
  );

CREATE POLICY "expenses_all_owner_partner" ON public.expenses
  FOR ALL TO authenticated
  USING (public.get_user_role() IN ('owner', 'managing_partner'));

-- ══════════════════════════════════════════
-- ledger  (written only by triggers)
-- ══════════════════════════════════════════

DROP POLICY IF EXISTS "ledger_all_owner"         ON public.ledger;
DROP POLICY IF EXISTS "ledger_select_partner"    ON public.ledger;
DROP POLICY IF EXISTS "ledger_select_supervisor" ON public.ledger;

CREATE POLICY "ledger_all_owner" ON public.ledger
  FOR ALL TO authenticated USING (public.get_user_role() = 'owner');

CREATE POLICY "ledger_select_partner" ON public.ledger
  FOR SELECT TO authenticated USING (public.get_user_role() = 'managing_partner');

CREATE POLICY "ledger_select_supervisor" ON public.ledger
  FOR SELECT TO authenticated
  USING (
    public.get_user_role() = 'site_supervisor'
    AND public.user_has_project_access(project_id)
  );

-- ══════════════════════════════════════════
-- ledger_periods
-- ══════════════════════════════════════════

DROP POLICY IF EXISTS "ledger_periods_all_owner"     ON public.ledger_periods;
DROP POLICY IF EXISTS "ledger_periods_select_others" ON public.ledger_periods;

CREATE POLICY "ledger_periods_all_owner" ON public.ledger_periods
  FOR ALL TO authenticated USING (public.get_user_role() = 'owner');

CREATE POLICY "ledger_periods_select_others" ON public.ledger_periods
  FOR SELECT TO authenticated
  USING (public.get_user_role() IN ('managing_partner', 'site_supervisor'));
