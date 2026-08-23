-- ============================================================
-- PillarPro v2 — Migration 002: Row Level Security Policies
-- Run AFTER 001_initial_schema.sql
-- ============================================================

-- ══════════════════════════════════════════
-- HELPER FUNCTIONS
-- ══════════════════════════════════════════

-- Returns the current user's role as text (NULL if no role assigned yet)
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS TEXT LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT role::TEXT FROM public.roles WHERE user_id = auth.uid()
$$;

-- Returns the current user's profile status
CREATE OR REPLACE FUNCTION public.get_user_status()
RETURNS TEXT LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT status::TEXT FROM public.user_profiles WHERE id = auth.uid()
$$;

-- Returns TRUE if the current user has access to the given project
-- (Owners/Partners: always; Supervisors: only via project_members)
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

-- Returns TRUE if the given project+date falls in a closed ledger period
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
-- ENABLE RLS
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

CREATE POLICY "profiles_select_own" ON public.user_profiles
  FOR SELECT TO authenticated USING (id = auth.uid());

CREATE POLICY "profiles_select_owner" ON public.user_profiles
  FOR SELECT TO authenticated USING (public.get_user_role() = 'owner');

CREATE POLICY "profiles_insert_own" ON public.user_profiles
  FOR INSERT TO authenticated WITH CHECK (id = auth.uid());

-- Users update their own display name; owner updates any
CREATE POLICY "profiles_update_own" ON public.user_profiles
  FOR UPDATE TO authenticated USING (id = auth.uid());

CREATE POLICY "profiles_update_owner" ON public.user_profiles
  FOR UPDATE TO authenticated USING (public.get_user_role() = 'owner');

-- ══════════════════════════════════════════
-- roles
-- ══════════════════════════════════════════

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

-- Managing partner may update non-core fields (core-field guard is a trigger below)
CREATE POLICY "projects_update_partner" ON public.projects
  FOR UPDATE TO authenticated USING (public.get_user_role() = 'managing_partner');

CREATE POLICY "projects_delete_owner" ON public.projects
  FOR DELETE TO authenticated USING (public.get_user_role() = 'owner');

-- ── Trigger: prevent Managing Partner from editing core project fields ──────

CREATE OR REPLACE FUNCTION public.guard_project_core_fields()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF public.get_user_role() = 'managing_partner' THEN
    IF (OLD.agency_name      IS DISTINCT FROM NEW.agency_name)      OR
       (OLD.advertised_cost  IS DISTINCT FROM NEW.advertised_cost)  OR
       (OLD.awarded_amount   IS DISTINCT FROM NEW.awarded_amount)   THEN
      RAISE EXCEPTION
        'Managing Partners cannot edit core project fields (agency, advertised cost, awarded amount).';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_guard_project_core_fields
  BEFORE UPDATE ON public.projects
  FOR EACH ROW EXECUTE FUNCTION public.guard_project_core_fields();

-- ══════════════════════════════════════════
-- project_members
-- ══════════════════════════════════════════

CREATE POLICY "project_members_all_owner" ON public.project_members
  FOR ALL TO authenticated USING (public.get_user_role() = 'owner');

CREATE POLICY "project_members_select_partner" ON public.project_members
  FOR SELECT TO authenticated USING (public.get_user_role() = 'managing_partner');

CREATE POLICY "project_members_select_own" ON public.project_members
  FOR SELECT TO authenticated USING (user_id = auth.uid());

-- ══════════════════════════════════════════
-- workers
-- ══════════════════════════════════════════

CREATE POLICY "workers_select_owner_partner" ON public.workers
  FOR SELECT TO authenticated
  USING (public.get_user_role() IN ('owner', 'managing_partner'));

-- Supervisors see workers assigned to their projects
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
-- vendors
-- Supervisors have NO access to vendors (spec-compliant).
-- ══════════════════════════════════════════

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

CREATE TRIGGER trg_period_vendor_purchase
  BEFORE INSERT ON public.vendor_purchases
  FOR EACH ROW EXECUTE FUNCTION public.guard_period_vendor_purchase();

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

CREATE TRIGGER trg_period_vendor_payment
  BEFORE INSERT ON public.vendor_payments
  FOR EACH ROW EXECUTE FUNCTION public.guard_period_vendor_payment();

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

CREATE TRIGGER trg_period_attendance
  BEFORE INSERT ON public.attendance
  FOR EACH ROW EXECUTE FUNCTION public.guard_period_attendance();

-- Supervisors cannot edit/delete attendance records after the same calendar day
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

CREATE TRIGGER trg_attendance_edit_window
  BEFORE UPDATE OR DELETE ON public.attendance
  FOR EACH ROW EXECUTE FUNCTION public.guard_attendance_edit_window();

-- Spec: Supervisors INSERT + SELECT only for their assigned projects
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

CREATE TRIGGER trg_period_receivable
  BEFORE INSERT ON public.receivable_payments
  FOR EACH ROW EXECUTE FUNCTION public.guard_period_receivable();

CREATE POLICY "receivable_payments_all_owner_partner" ON public.receivable_payments
  FOR ALL TO authenticated
  USING (public.get_user_role() IN ('owner', 'managing_partner'));

-- ══════════════════════════════════════════
-- partners
-- ══════════════════════════════════════════

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

CREATE TRIGGER trg_period_partner_tx
  BEFORE INSERT ON public.partner_transactions
  FOR EACH ROW EXECUTE FUNCTION public.guard_period_partner_tx();

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

CREATE TRIGGER trg_period_expense
  BEFORE INSERT ON public.expenses
  FOR EACH ROW EXECUTE FUNCTION public.guard_period_expense();

-- Supervisors cannot edit/delete expenses after the same calendar day
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

CREATE TRIGGER trg_expense_edit_window
  BEFORE UPDATE OR DELETE ON public.expenses
  FOR EACH ROW EXECUTE FUNCTION public.guard_expense_edit_window();

-- Spec: Supervisors INSERT + SELECT only for their assigned projects
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
-- ledger  (read-only for non-owners; written only by triggers)
-- ══════════════════════════════════════════

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
-- ledger_periods  (only owners can open/close periods)
-- ══════════════════════════════════════════

CREATE POLICY "ledger_periods_all_owner" ON public.ledger_periods
  FOR ALL TO authenticated USING (public.get_user_role() = 'owner');

CREATE POLICY "ledger_periods_select_others" ON public.ledger_periods
  FOR SELECT TO authenticated
  USING (public.get_user_role() IN ('managing_partner', 'site_supervisor'));
